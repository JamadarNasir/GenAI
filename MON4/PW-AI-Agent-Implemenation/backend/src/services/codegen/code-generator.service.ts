/**
 * Code Generator Service (Orchestrator)
 *
 * Main entry point for Phase 5: Code Generation.
 *
 * Takes FeatureFile[] (from BDD generation) and produces a full
 * Playwright + Cucumber automation project on disk:
 *
 *   automation/tests/
 *     features/          ← .feature files
 *     step-definitions/  ← .steps.ts files
 *     pages/             ← PageObject .ts files + BasePage.ts
 *     support/           ← hooks.ts + world.ts
 */

import path from 'path';
import fs from 'fs';
import { FeatureFile } from '../../types/bdd.types';
import { GeneratedFile } from '../../types/action.types';
import { parseAllFeatures, ParsedFeature } from './step-parser.service';
import { writeFeatureFiles } from './feature-writer.service';
import { writeStepDefinitions } from './step-def-writer.service';
import { writePageObjects } from './page-object-writer.service';
import { writeSupportFiles } from './hooks-writer.service';
import envConfig from '../../config/env.config';

/**
 * Response from the code generation pipeline.
 */
export interface CodeGenerationResponse {
  success: boolean;
  files: GeneratedFile[];
  summary: {
    features: number;
    stepDefinitions: number;
    pageObjects: number;
    supportFiles: number;
    totalFiles: number;
  };
  errors?: string[];
}

/**
 * Clean up previously generated test files so only the current
 * CSV upload's tests are present when Cucumber runs.
 */
function cleanGeneratedTests(): void {
  const testsDir = path.join(envConfig.automationDir, 'tests');
  const dirsToClean = ['features', 'step-definitions', 'pages'];

  for (const dir of dirsToClean) {
    const fullPath = path.join(testsDir, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      for (const file of files) {
        const filePath = path.join(fullPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
      console.log(`[CodeGen] Cleaned ${files.length} old file(s) from ${dir}/`);
    }
  }
}

/**
 * Generate all Playwright + Cucumber automation code from BDD features.
 *
 * Steps:
 *  0. Clean up old generated files from previous runs
 *  1. Parse features → ActionModels (step parser + locator resolver)
 *  2. Write .feature files
 *  3. Write step-definition .ts files
 *  4. Write Page Object .ts files (+ BasePage)
 *  5. Write support files (hooks.ts, world.ts)
 */
export async function generateCode(features: FeatureFile[]): Promise<CodeGenerationResponse> {
  const allFiles: GeneratedFile[] = [];
  const errors: string[] = [];

  console.log(`[CodeGen] Starting code generation for ${features.length} feature(s)...`);

  try {
    // ── Step 0: Clean up old generated tests ──
    console.log(`[CodeGen] Step 0: Cleaning old generated test files...`);
    cleanGeneratedTests();
    // ── Step 1: Parse features into ActionModels ──
    console.log(`[CodeGen] Step 1/5: Parsing Gherkin steps → ActionModels...`);
    const parsedFeatures: ParsedFeature[] = parseAllFeatures(features);

    let totalScenarios = 0;
    let totalActions = 0;
    for (const pf of parsedFeatures) {
      for (const ps of pf.scenarios) {
        totalScenarios++;
        totalActions += ps.actions.length;
      }
    }
    console.log(
      `[CodeGen] Parsed ${parsedFeatures.length} feature(s), ${totalScenarios} scenario(s), ${totalActions} action(s)`
    );

    // ── Step 2: Write .feature files ──
    console.log(`[CodeGen] Step 2/5: Writing .feature files...`);
    const featureFiles = writeFeatureFiles(features);
    allFiles.push(...featureFiles);

    // ── Step 3: Write step definitions ──
    console.log(`[CodeGen] Step 3/5: Writing step definition files...`);
    const stepDefFiles = writeStepDefinitions(parsedFeatures, features);
    allFiles.push(...stepDefFiles);

    // ── Step 4: Write page objects ──
    console.log(`[CodeGen] Step 4/5: Writing Page Object files...`);
    const pageObjectFiles = writePageObjects(parsedFeatures);
    allFiles.push(...pageObjectFiles);

    // ── Step 5: Write support files ──
    console.log(`[CodeGen] Step 5/5: Writing support files (hooks, world)...`);
    const supportFiles = writeSupportFiles();
    allFiles.push(...supportFiles);

    const summary = {
      features: featureFiles.length,
      stepDefinitions: stepDefFiles.length,
      pageObjects: pageObjectFiles.length,
      supportFiles: supportFiles.length,
      totalFiles: allFiles.length,
    };

    console.log(
      `[CodeGen] ✅ Code generation complete — ${summary.totalFiles} file(s) written ` +
      `(${summary.features} features, ${summary.stepDefinitions} step-defs, ` +
      `${summary.pageObjects} page-objects, ${summary.supportFiles} support)`
    );

    return {
      success: true,
      files: allFiles,
      summary,
    };
  } catch (err: any) {
    console.error(`[CodeGen] ❌ Code generation failed: ${err.message}`);
    errors.push(err.message);

    return {
      success: false,
      files: allFiles,
      summary: {
        features: 0,
        stepDefinitions: 0,
        pageObjects: 0,
        supportFiles: 0,
        totalFiles: allFiles.length,
      },
      errors,
    };
  }
}

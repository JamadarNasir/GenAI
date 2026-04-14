/**
 * Step Definition Writer Service — writes step-definition .ts files
 * to the automation/tests/step-definitions/ directory.
 *
 * Shared step patterns (e.g. 'user is on the {string} page') are written
 * ONCE to common.steps.ts. Module-specific steps go into per-module files.
 */

import path from 'path';
import fs from 'fs';
import { ParsedFeature } from './step-parser.service';
import { GeneratedFile } from '../../types/action.types';
import { GherkinStep, FeatureFile } from '../../types/bdd.types';
import { generateStepDefinitionFile } from '../../templates/step-definition.template';
import envConfig from '../../config/env.config';

/** Global set tracking step patterns already written across ALL modules */
const globalPatternTracker = new Set<string>();

/**
 * Write step definition files for all parsed features.
 */
export function writeStepDefinitions(
  parsedFeatures: ParsedFeature[],
  originalFeatures: FeatureFile[]
): GeneratedFile[] {
  const outputDir = path.join(envConfig.automationDir, 'tests', 'step-definitions');
  ensureDir(outputDir);

  const files: GeneratedFile[] = [];

  // Reset global tracker for each full code-gen run
  globalPatternTracker.clear();

  for (let i = 0; i < parsedFeatures.length; i++) {
    const parsed = parsedFeatures[i];
    const original = originalFeatures[i];

    // Build a map from scenario name → original GherkinSteps
    const stepMap = new Map<string, GherkinStep[]>();
    if (original?.scenarios) {
      for (const sc of original.scenarios) {
        stepMap.set(sc.name, sc.steps);
      }
    }

    const slug = toSlug(parsed.featureName);
    const fileName = `${slug}.steps.ts`;
    const filePath = path.join(outputDir, fileName);
    const content = generateStepDefinitionFile(parsed.featureName, parsed.scenarios, stepMap, globalPatternTracker);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[CodeGen] Wrote step definitions: ${fileName}`);

    files.push({
      filePath: path.relative(envConfig.automationDir, filePath),
      fileName,
      content,
      type: 'step-definition',
    });
  }

  return files;
}

// ── Utility ──

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

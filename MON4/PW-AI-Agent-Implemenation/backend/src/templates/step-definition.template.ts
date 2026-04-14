/**
 * Step Definition Template — generates Cucumber step definition TypeScript files.
 */

import { ParsedScenario } from '../services/codegen/step-parser.service';
import { generateActionCode } from '../services/codegen/locator-resolver.service';
import { ActionModel } from '../types/action.types';
import { GherkinStep } from '../types/bdd.types';

/**
 * Generate a complete step definition .ts file for a module.
 * Accepts globalPatterns to skip step patterns already written in other modules.
 */
export function generateStepDefinitionFile(
  moduleName: string,
  scenarios: ParsedScenario[],
  originalSteps: Map<string, GherkinStep[]>,
  globalPatterns?: Set<string>
): string {
  const lines: string[] = [];
  const slug = toSlug(moduleName);

  // Header
  lines.push(`// ${slug}.steps.ts — Auto-generated step definitions for ${moduleName}`);
  lines.push(`// Smart Locator: 4-tier resolution (Snapshot → Pattern → LLM → Heal)`);
  lines.push(`import { Given, When, Then } from '@cucumber/cucumber';`);
  lines.push(`import { expect } from '@playwright/test';`);
  lines.push(`import { PlaywrightWorld } from '../support/world';`);
  lines.push(`import { ${toPascalCase(moduleName)}Page } from '../pages/${toPascalCase(moduleName)}Page';`);
  lines.push(`import { smartLocate, smartClick, smartFill, smartAssertVisible, smartAssertText } from '../support/smart-locator';`);
  lines.push('');

  // Track generated step patterns to avoid duplicates
  const generatedPatterns = new Set<string>();

  for (const scenario of scenarios) {
    lines.push(`// --- ${scenario.name} ---`);
    lines.push('');

    const scenarioSteps = originalSteps.get(scenario.name) || [];

    scenario.actions.forEach((action, idx) => {
      const step = scenarioSteps[idx];
      const keyword = step?.keyword || inferKeyword(action, idx);
      const stepText = step?.text || action.description.replace(/^(Given|When|Then|And|But)\s+/i, '');
      const cucumberKeyword = normalizeCucumberKeyword(keyword);

      // Build the step pattern (regex-safe)
      const pattern = buildStepPattern(stepText);

      // Skip duplicate patterns (local + global across modules)
      if (generatedPatterns.has(pattern)) return;
      if (globalPatterns?.has(pattern)) return;
      generatedPatterns.add(pattern);
      globalPatterns?.add(pattern);

      // Extract parameters for the step function
      const { patternStr, params, paramTypes } = extractParams(stepText);

      // Build function signature
      const paramList = params.length > 0
        ? params.map((p, i) => `${p}: ${paramTypes[i]}`).join(', ')
        : '';

      lines.push(
        `${cucumberKeyword}('${escapeQuotes(patternStr)}', async function (this: PlaywrightWorld${paramList ? ', ' + paramList : ''}) {`
      );

      // Generate the Playwright code for this step
      const code = generateActionCode(action);
      lines.push(`  ${code}`);

      lines.push(`});`);
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Build a Cucumber step pattern string, replacing quoted values with {string} params.
 */
function buildStepPattern(stepText: string): string {
  return stepText.replace(/["']([^"']+)["']/g, '{string}');
}

/**
 * Extract {string} parameters from the step pattern.
 */
function extractParams(
  stepText: string
): { patternStr: string; params: string[]; paramTypes: string[] } {
  const patternStr = buildStepPattern(stepText);
  const paramCount = (patternStr.match(/\{string\}/g) || []).length;
  const params: string[] = [];
  const paramTypes: string[] = [];

  for (let i = 0; i < paramCount; i++) {
    params.push(paramCount === 1 ? 'value' : `value${i + 1}`);
    paramTypes.push('string');
  }

  return { patternStr, params, paramTypes };
}

/**
 * Normalize keyword for Cucumber: And/But → Given/When/Then (last used)
 */
function normalizeCucumberKeyword(keyword: string): string {
  const kw = keyword.trim();
  switch (kw) {
    case 'Given':
      return 'Given';
    case 'When':
    case 'And':
    case 'But':
      return 'When';
    case 'Then':
      return 'Then';
    default:
      return 'When';
  }
}

function inferKeyword(action: ActionModel, index: number): string {
  if (index === 0) return 'Given';
  if (action.action.startsWith('assert')) return 'Then';
  return 'When';
}

// ── Utilities ──

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toPascalCase(name: string): string {
  return name
    .split(/[\s\-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function escapeQuotes(str: string): string {
  return str.replace(/'/g, "\\'");
}

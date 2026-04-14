/**
 * Feature file template — Gherkin structure for fallback (non-LLM) generation.
 */

import { TestCase } from '../types/test-case.types';
import { buildTagsForTestCase, buildFeatureTags } from '../services/bdd/tag-mapper.service';

/**
 * Generate a basic Gherkin feature string from a group of test cases
 * sharing the same module. This is the FALLBACK used when LLM is unavailable.
 *
 * The LLM path produces much richer Gherkin; this template produces
 * a minimal but valid structure.
 */
export function generateFallbackFeature(module: string, testCases: TestCase[]): string {
  const featureTags = buildFeatureTags(testCases);
  const lines: string[] = [];

  // Feature-level tags
  if (featureTags.length > 0) {
    lines.push(featureTags.join(' '));
  }

  // Feature header
  const featureName = module.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  lines.push(`Feature: ${featureName}`);
  lines.push(`  As a user, I want to test the ${module} functionality.`);

  for (const tc of testCases) {
    lines.push('');

    // Scenario tags
    const scenarioTags = buildTagsForTestCase(tc);
    if (scenarioTags.length > 0) {
      lines.push(`  ${scenarioTags.join(' ')}`);
    }

    // Scenario name
    lines.push(`  Scenario: ${tc.title}`);

    // Steps — first step is Given, last action step is When, rest are And
    if (tc.steps.length > 0) {
      lines.push(`    Given user is on the "${module}" page`);

      tc.steps.forEach((step, idx) => {
        const keyword = idx === 0 ? 'When' : 'And';
        lines.push(`    ${keyword} user ${normalizeStepText(step)}`);
      });
    }

    // Expected result → Then (may be multi-line / numbered list)
    if (tc.expectedResult) {
      const resultLines = splitExpectedResult(tc.expectedResult);
      resultLines.forEach((line, idx) => {
        const keyword = idx === 0 ? 'Then' : 'And';
        lines.push(`    ${keyword} ${normalizeExpectedResult(line)}`);
      });
    }
  }

  return lines.join('\n');
}

/**
 * Split an expected result string that may contain multiple lines or numbered items
 * into individual assertion strings.
 * e.g. "1. App launched\n2. Login page shown\n3. User logged in"
 *   → ["App launched", "Login page shown", "User logged in"]
 */
function splitExpectedResult(expected: string): string[] {
  // Split on newlines first
  let parts = expected
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // If only one part, try splitting on ". " preceded by a number (e.g. "1. ... 2. ...")
  if (parts.length === 1) {
    const numbered = expected.split(/\d+\.\s+/).map((s) => s.trim()).filter(Boolean);
    if (numbered.length > 1) {
      parts = numbered;
    }
  }

  return parts;
}

/**
 * Normalize a raw step text for Gherkin readability.
 */
function normalizeStepText(step: string): string {
  let text = step.trim();

  // Remove leading "user" if already present (avoid "user user ...")
  if (text.toLowerCase().startsWith('user ')) {
    text = text.substring(5);
  }

  // Lowercase the first character
  text = text.charAt(0).toLowerCase() + text.slice(1);

  return text;
}

/**
 * Normalize expected result text for a Then step.
 */
function normalizeExpectedResult(expected: string): string {
  let text = expected.trim();

  // Strip leading numbered prefix e.g. "1.", "2)", "1 -"
  text = text.replace(/^\d+[\.\)]\s*/, '').trim();

  // If it doesn't start with a common assertion word, prefix with "the"
  const startsWithAssertion = /^(the|a|an|error|page|user|dashboard|cart|order|product|message)/i;
  if (!startsWithAssertion.test(text)) {
    text = 'the ' + text.charAt(0).toLowerCase() + text.slice(1);
  }

  // Lowercase the first character
  text = text.charAt(0).toLowerCase() + text.slice(1);

  return text;
}

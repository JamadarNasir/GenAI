import { FeatureFile, ScenarioOutline, GherkinStep } from '../../types/bdd.types';

/**
 * Parse raw Gherkin text (from LLM or manual) into a FeatureFile object.
 */
export function parseFeatureText(rawText: string): FeatureFile {
  const lines = rawText.split('\n');
  const tags: string[] = [];
  let featureName = '';
  let featureDescription = '';
  const scenarios: ScenarioOutline[] = [];
  let currentScenario: ScenarioOutline | null = null;
  let inDescription = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // ─── Tags ────────────────────────────────────
    if (trimmed.startsWith('@') && !currentScenario) {
      // Feature-level tags (before Feature: keyword)
      if (!featureName) {
        const tagTokens = trimmed.split(/\s+/).filter((t) => t.startsWith('@'));
        tags.push(...tagTokens);
        continue;
      }
    }

    if (trimmed.startsWith('@') && featureName) {
      // Scenario-level tags
      if (currentScenario) {
        // Save previous scenario
        scenarios.push(currentScenario);
      }
      const scenarioTags = trimmed.split(/\s+/).filter((t) => t.startsWith('@'));
      currentScenario = { name: '', tags: scenarioTags, steps: [] };
      inDescription = false;
      continue;
    }

    // ─── Feature line ────────────────────────────
    if (trimmed.startsWith('Feature:')) {
      featureName = trimmed.replace('Feature:', '').trim();
      inDescription = true;
      continue;
    }

    // ─── Scenario line ───────────────────────────
    if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:')) {
      inDescription = false;
      const scenarioName = trimmed
        .replace('Scenario Outline:', '')
        .replace('Scenario:', '')
        .trim();

      if (!currentScenario) {
        currentScenario = { name: scenarioName, tags: [], steps: [] };
      } else if (!currentScenario.name) {
        currentScenario.name = scenarioName;
      } else {
        // New scenario without tags — save previous
        scenarios.push(currentScenario);
        currentScenario = { name: scenarioName, tags: [], steps: [] };
      }
      continue;
    }

    // ─── Steps ───────────────────────────────────
    const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.*)/);
    if (stepMatch && currentScenario) {
      const keyword = stepMatch[1] as GherkinStep['keyword'];
      const text = stepMatch[2];
      currentScenario.steps.push({ keyword, text });
      inDescription = false;
      continue;
    }

    // ─── Feature description (lines between Feature: and first Scenario) ──
    if (inDescription && trimmed && !trimmed.startsWith('@')) {
      featureDescription += (featureDescription ? '\n' : '') + trimmed;
    }
  }

  // Push last scenario
  if (currentScenario && currentScenario.name) {
    scenarios.push(currentScenario);
  }

  // Build filename from feature name
  const fileName = featureName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '.feature';

  return {
    fileName,
    featureName,
    content: rawText.trim(),
    scenarios,
    tags,
  };
}

/**
 * Build a Gherkin feature file string from structured data.
 * Used when assembling features without LLM (fallback).
 */
export function buildFeatureString(params: {
  featureName: string;
  description: string;
  featureTags: string[];
  scenarios: {
    name: string;
    tags: string[];
    steps: { keyword: string; text: string }[];
  }[];
}): string {
  const lines: string[] = [];

  // Feature tags
  if (params.featureTags.length > 0) {
    lines.push(params.featureTags.join(' '));
  }

  // Feature header
  lines.push(`Feature: ${params.featureName}`);
  if (params.description) {
    lines.push(`  ${params.description}`);
  }

  // Scenarios
  for (const scenario of params.scenarios) {
    lines.push('');

    // Scenario tags
    if (scenario.tags.length > 0) {
      lines.push(`  ${scenario.tags.join(' ')}`);
    }

    lines.push(`  Scenario: ${scenario.name}`);

    for (const step of scenario.steps) {
      lines.push(`    ${step.keyword} ${step.text}`);
    }
  }

  return lines.join('\n');
}

/**
 * Split LLM response containing multiple features into individual feature strings.
 */
export function splitFeatures(rawLlmOutput: string): string[] {
  // Remove markdown code fences if LLM wraps output
  let cleaned = rawLlmOutput
    .replace(/```gherkin\s*/gi, '')
    .replace(/```feature\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Split on the separator
  const features = cleaned
    .split(/---FEATURE_SEPARATOR---/i)
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && f.includes('Feature:'));

  return features;
}

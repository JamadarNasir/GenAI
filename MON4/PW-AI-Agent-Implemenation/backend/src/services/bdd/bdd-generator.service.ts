import path from 'path';
import fs from 'fs';
import { TestCase } from '../../types/test-case.types';
import { FeatureFile, BddGenerationResponse } from '../../types/bdd.types';
import { getAIClient } from '../ai-init.service';
import { groupByModule, buildTagsForTestCase } from './tag-mapper.service';
import { splitFeatures, parseFeatureText } from './gherkin-builder.service';
import { generateFallbackFeature } from '../../templates/feature.template';

// Prompt template paths (relative to project root ai/prompts/)
const PROMPTS_DIR = path.resolve(__dirname, '../../../../ai/prompts');

/**
 * Load a prompt template file.
 */
function loadPrompt(filename: string): string {
  const filePath = path.join(PROMPTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8').trim();
}

/**
 * Build the user prompt from test cases (grouped by module).
 */
function buildUserPrompt(module: string, testCases: TestCase[]): string {
  const testCasesJson = testCases.map((tc) => ({
    testCaseId: tc.testCaseId,
    title: tc.title,
    module: tc.module,
    steps: tc.steps,
    expectedResult: tc.expectedResult,
    priority: tc.priority,
    tags: buildTagsForTestCase(tc),
  }));

  return [
    `Convert the following test cases for the "${module}" module into Gherkin feature files.`,
    '',
    '```json',
    JSON.stringify(testCasesJson, null, 2),
    '```',
    '',
    'Generate a single Feature file containing all scenarios for this module.',
    'Use the tags specified for each test case.',
    'Follow all rules from the system prompt.',
  ].join('\n');
}

/**
 * Generate BDD features using the LLM.
 *
 * @param testCases - All test cases to convert.
 * @returns BddGenerationResponse with features and any errors.
 */
export async function generateBddFeatures(
  testCases: TestCase[]
): Promise<BddGenerationResponse> {
  const features: FeatureFile[] = [];
  const errors: string[] = [];

  // Group test cases by module
  const moduleGroups = groupByModule(testCases);

  console.log(
    `[BDD] Generating features for ${moduleGroups.size} module(s): ${[...moduleGroups.keys()].join(', ')}`
  );

  // Load prompt templates
  let systemPrompt: string;
  let fewShotPrompt: string;

  try {
    systemPrompt = loadPrompt('bdd-system-prompt.txt');
    fewShotPrompt = loadPrompt('bdd-few-shot.txt');
  } catch (err: any) {
    console.error(`[BDD] Failed to load prompt templates: ${err.message}`);
    return { success: false, features: [], errors: [err.message] };
  }

  // Get AI client
  let aiClient;
  try {
    aiClient = getAIClient();
  } catch (err: any) {
    console.warn(`[BDD] AI client not available, using fallback: ${err.message}`);
    return generateFallbackBdd(testCases, moduleGroups);
  }

  // Generate features for each module
  for (const [module, cases] of moduleGroups) {
    try {
      console.log(`[BDD] Generating feature for module: "${module}" (${cases.length} test cases)`);

      const userPrompt = buildUserPrompt(module, cases);

      const result = await aiClient.generateChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fewShotPrompt },
          { role: 'assistant', content: 'I understand the format. Please provide the test cases to convert.' },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.2,       // Low temperature for consistent output
          maxTokens: 4096,
        }
      );

      console.log(
        `[BDD] LLM response for "${module}": ${result.content.length} chars, ` +
        `${result.usage.totalTokens} tokens (${result.finishReason})`
      );

      // Parse LLM response into feature files
      const rawFeatures = splitFeatures(result.content);

      if (rawFeatures.length === 0) {
        // If separator didn't work, try parsing the whole response as one feature
        const parsed = parseFeatureText(result.content);
        if (parsed.featureName) {
          features.push(parsed);
        } else {
          errors.push(`Module "${module}": LLM returned no valid Gherkin features`);
        }
      } else {
        for (const rawFeature of rawFeatures) {
          const parsed = parseFeatureText(rawFeature);
          if (parsed.featureName) {
            features.push(parsed);
          }
        }
      }
    } catch (err: any) {
      console.error(`[BDD] Error generating feature for "${module}": ${err.message}`);
      errors.push(`Module "${module}": ${err.message}`);

      // Fallback: generate basic feature without LLM
      console.log(`[BDD] Using fallback template for "${module}"`);
      const fallbackContent = generateFallbackFeature(module, cases);
      const fallbackParsed = parseFeatureText(fallbackContent);
      features.push(fallbackParsed);
    }
  }

  return {
    success: errors.length === 0,
    features,
    ...(errors.length > 0 && { errors }),
  };
}

/**
 * Fallback BDD generation without LLM — uses basic templates.
 */
function generateFallbackBdd(
  _testCases: TestCase[],
  moduleGroups: Map<string, TestCase[]>
): BddGenerationResponse {
  const features: FeatureFile[] = [];

  console.log('[BDD] Using fallback (non-LLM) generation for all modules');

  for (const [module, cases] of moduleGroups) {
    const content = generateFallbackFeature(module, cases);
    const parsed = parseFeatureText(content);
    features.push(parsed);
  }

  return {
    success: true,
    features,
  };
}

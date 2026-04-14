/**
 * Locator Healer Service — calls the LLM to suggest a healed locator
 * given the DOM snapshot, failed locator, and error context.
 */

import path from 'path';
import fs from 'fs';
import { getAIClient } from '../ai-init.service';
import { DOMSnapshot } from './dom-snapshot.service';
import { FailureAnalysis } from './failure-analyzer.service';

export interface HealSuggestion {
  /** The healed Playwright locator code */
  locatorCode: string;
  /** The locator strategy used */
  strategy: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Explanation of why this locator was chosen */
  reasoning: string;
  /** Alternative suggestions */
  alternatives: string[];
}

// Prompt template path
const HEAL_PROMPT_PATH = path.resolve(__dirname, '../../../../ai/prompts/heal-system-prompt.txt');

/**
 * Ask the LLM to suggest a healed locator.
 */
export async function healLocator(
  failedLocator: string,
  stepText: string,
  errorMessage: string,
  snapshot: DOMSnapshot,
  analysis: FailureAnalysis
): Promise<HealSuggestion> {
  // Load system prompt
  let systemPrompt: string;
  try {
    systemPrompt = fs.readFileSync(HEAL_PROMPT_PATH, 'utf-8').trim();
  } catch {
    systemPrompt = DEFAULT_HEAL_PROMPT;
  }

  // Build user prompt with context
  const userPrompt = buildHealUserPrompt(
    failedLocator,
    stepText,
    errorMessage,
    snapshot,
    analysis
  );

  try {
    const aiClient = getAIClient();

    const result = await aiClient.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.2,
        maxTokens: 1000,
      }
    );

    return parseHealResponse(result.content);
  } catch (err: any) {
    console.error(`[Healer] LLM call failed: ${err.message}`);
    // Return a fallback suggestion based on heuristics
    return buildFallbackSuggestion(failedLocator, stepText, snapshot);
  }
}

/**
 * Build the user prompt for the healer LLM call.
 */
function buildHealUserPrompt(
  failedLocator: string,
  stepText: string,
  errorMessage: string,
  snapshot: DOMSnapshot,
  analysis: FailureAnalysis
): string {
  return [
    `## Failed Step`,
    `Step: ${stepText}`,
    `Failed Locator: ${failedLocator}`,
    `Error: ${errorMessage}`,
    `Failure Type: ${analysis.type} (confidence: ${analysis.confidence})`,
    '',
    `## Page Context`,
    `URL: ${snapshot.url}`,
    `Title: ${snapshot.title}`,
    '',
    `## Relevant DOM (simplified)`,
    '```html',
    snapshot.relevantHtml,
    '```',
    '',
    `## Instructions`,
    `Suggest a healed Playwright locator using this priority:`,
    `1. data-testid → page.getByTestId()`,
    `2. ARIA role → page.getByRole()`,
    `3. aria-label → page.getByLabel()`,
    `4. placeholder → page.getByPlaceholder()`,
    `5. visible text → page.getByText()`,
    `6. CSS selector → page.locator()`,
    `7. XPath → page.locator()`,
    '',
    `Respond in JSON format:`,
    '```json',
    `{`,
    `  "locatorCode": "page.getByRole('button', { name: 'Submit' })",`,
    `  "strategy": "role",`,
    `  "confidence": 0.85,`,
    `  "reasoning": "...",`,
    `  "alternatives": ["page.getByText('Submit')", "page.locator('.submit-btn')"]`,
    `}`,
    '```',
  ].join('\n');
}

/**
 * Parse the LLM response into a HealSuggestion.
 */
function parseHealResponse(content: string): HealSuggestion {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        locatorCode: parsed.locatorCode || '',
        strategy: parsed.strategy || 'unknown',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
        alternatives: parsed.alternatives || [],
      };
    } catch {
      // Fall through to default
    }
  }

  // If JSON parsing failed, try to extract a locator from the text
  const locatorMatch = content.match(/page\.\w+\([^)]+\)/);
  return {
    locatorCode: locatorMatch ? locatorMatch[0] : '',
    strategy: 'unknown',
    confidence: 0.3,
    reasoning: content.slice(0, 200),
    alternatives: [],
  };
}

/**
 * Build a fallback suggestion without LLM using heuristics.
 */
function buildFallbackSuggestion(
  failedLocator: string,
  stepText: string,
  snapshot: DOMSnapshot
): HealSuggestion {
  const lower = stepText.toLowerCase();
  const alternatives: string[] = [];

  // Try text-based locator from the step text
  const quotedMatch = stepText.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    alternatives.push(`page.getByText('${quotedMatch[1]}')`);
    alternatives.push(`page.getByRole('button', { name: '${quotedMatch[1]}' })`);
  }

  // Infer from action type
  if (lower.includes('button') || lower.includes('click')) {
    alternatives.push(`page.getByRole('button')`);
  }
  if (lower.includes('input') || lower.includes('field') || lower.includes('enter')) {
    alternatives.push(`page.getByRole('textbox')`);
  }

  return {
    locatorCode: alternatives[0] || failedLocator,
    strategy: 'heuristic',
    confidence: 0.3,
    reasoning: 'Fallback suggestion based on step text heuristics (LLM unavailable).',
    alternatives,
  };
}

const DEFAULT_HEAL_PROMPT = `You are an expert Playwright test automation engineer.
Your task is to suggest a healed locator for a failed Playwright step.

Follow this locator priority:
1. data-testid → page.getByTestId()
2. ARIA role → page.getByRole()
3. aria-label → page.getByLabel()
4. placeholder → page.getByPlaceholder()
5. visible text → page.getByText()
6. CSS selector → page.locator()
7. XPath → page.locator()

Respond with a JSON object containing: locatorCode, strategy, confidence (0-1), reasoning, alternatives.`;

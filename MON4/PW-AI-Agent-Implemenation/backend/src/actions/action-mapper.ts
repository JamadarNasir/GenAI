/**
 * Action Mapper — resolves natural-language step text to a Playwright action type.
 *
 * Uses keyword matching from the ACTION_REGISTRY plus heuristics for
 * common BDD phrasing patterns.
 */

import { ActionType, LocatorStrategy } from '../types/action.types';
import { ACTION_REGISTRY, ActionDefinition } from './action-registry';

export interface ActionMatch {
  action: ActionType;
  definition: ActionDefinition;
  /** Confidence 0-1 of this match */
  confidence: number;
  /** Extracted value from step text (e.g. URL, fill text) */
  extractedValue?: string;
  /** Extracted target element hint (e.g. "login button", "username field") */
  extractedTarget?: string;
  /** Suggested locator strategy */
  suggestedStrategy?: LocatorStrategy;
}

// ── Regular expressions for extracting quoted values and targets ──

/** Matches text in double or single quotes */
const QUOTED_RE = /["']([^"']+)["']/g;

/** Matches "the <target>" or "a <target>" patterns */
const TARGET_RE =
  /(?:the|a|an)\s+(?:["']([^"']+)["']|(\S+(?:\s+\S+)?))\s*(?:button|link|input|field|checkbox|dropdown|menu|tab|page|element|icon|text|label|image|section|header|footer|modal|dialog|popup|panel)?/i;

/** URL-like pattern */
const URL_RE = /(?:https?:\/\/[^\s"']+|\/[^\s"']*)/;

/**
 * Map a step text string to the best-matching Playwright action.
 *
 * @param stepText - The natural-language Gherkin step (without keyword).
 * @returns ActionMatch or null if no match found.
 */
export function mapStepToAction(stepText: string): ActionMatch | null {
  const normalised = stepText.toLowerCase().trim();
  const scores: { def: ActionDefinition; score: number }[] = [];

  // Score every registered action by keyword overlap
  for (const def of ACTION_REGISTRY.values()) {
    let bestScore = 0;
    for (const kw of def.keywords) {
      if (normalised.includes(kw)) {
        // Longer keyword matches score higher
        const kwScore = kw.length / normalised.length + 0.5;
        bestScore = Math.max(bestScore, Math.min(kwScore, 1));
      }
    }
    if (bestScore > 0) {
      scores.push({ def, score: bestScore });
    }
  }

  if (scores.length === 0) {
    return null;
  }

  // Pick highest scoring action
  scores.sort((a, b) => b.score - a.score);

  // Handle ambiguity between click and fill — if "enter/fill" is present, prefer fill
  if (scores.length > 1) {
    const top = scores[0].def.type;
    const second = scores[1].def.type;
    if (top === 'click' && second === 'fill') {
      // Check for fill-specific keywords
      const fillWords = ['enter', 'type', 'fill', 'input', 'write', 'set', 'provide'];
      if (fillWords.some((w) => normalised.includes(w))) {
        scores.unshift(scores.splice(1, 1)[0]); // promote fill
      }
    }
    // Handle ambiguity between click and select
    if (top === 'click' && second === 'select') {
      if (normalised.includes('dropdown') || normalised.includes('option') || normalised.includes('combo')) {
        scores.unshift(scores.splice(1, 1)[0]); // promote select
      }
    }
  }

  const best = scores[0];
  const match: ActionMatch = {
    action: best.def.type,
    definition: best.def,
    confidence: best.score,
  };

  // ── Extract value ──

  const quotedMatches = [...stepText.matchAll(QUOTED_RE)].map((m) => m[1]);

  // For goto: extract URL
  if (best.def.type === 'goto') {
    const urlMatch = stepText.match(URL_RE);
    match.extractedValue = urlMatch ? urlMatch[0] : quotedMatches[0] || '/';
  }
  // For fill: value is typically the last quoted string
  else if (best.def.type === 'fill' && quotedMatches.length > 0) {
    match.extractedValue = quotedMatches[quotedMatches.length - 1];
    // Target is a prior quoted string if available
    if (quotedMatches.length > 1) {
      match.extractedTarget = quotedMatches[0];
    }
  }
  // For assertText / assertUrl / assertTitle
  else if (['assertText', 'assertUrl', 'assertTitle'].includes(best.def.type) && quotedMatches.length > 0) {
    match.extractedValue = quotedMatches[quotedMatches.length - 1];
  }
  // For select
  else if (best.def.type === 'select' && quotedMatches.length > 0) {
    match.extractedValue = quotedMatches[quotedMatches.length - 1];
    if (quotedMatches.length > 1) {
      match.extractedTarget = quotedMatches[0];
    }
  }

  // ── Extract target element hint ──
  if (!match.extractedTarget) {
    const targetMatch = stepText.match(TARGET_RE);
    if (targetMatch) {
      match.extractedTarget = (targetMatch[1] || targetMatch[2] || '').trim();
    } else if (quotedMatches.length > 0 && !match.extractedValue) {
      match.extractedTarget = quotedMatches[0];
    }
  }

  // ── Suggest locator strategy ──
  match.suggestedStrategy = suggestLocatorStrategy(normalised, match.extractedTarget);

  return match;
}

/**
 * Suggest a locator strategy based on the step text + extracted target.
 */
function suggestLocatorStrategy(
  normalised: string,
  target?: string
): LocatorStrategy {
  // Direct hints in the text
  if (normalised.includes('data-testid') || normalised.includes('test id'))
    return 'testId';
  if (normalised.includes('role') || normalised.includes('button') || normalised.includes('link'))
    return 'role';
  if (normalised.includes('label') || normalised.includes('aria-label'))
    return 'label';
  if (normalised.includes('placeholder'))
    return 'placeholder';
  if (normalised.includes('xpath') || normalised.includes('//'))
    return 'xpath';
  if (normalised.includes('css') || normalised.includes('selector'))
    return 'css';

  // If we have a target with "button" or "link", use role
  if (target) {
    const t = target.toLowerCase();
    if (t.includes('button') || t.includes('link') || t.includes('tab') ||
        t.includes('heading') || t.includes('checkbox') || t.includes('radio'))
      return 'role';
  }

  // For assertion-like steps, default to text-based locator
  const assertWords = ['should', 'visible', 'displayed', 'shown', 'contain', 'see', 'appear', 'exist', 'present', 'error', 'message'];
  if (assertWords.some(w => normalised.includes(w))) {
    return 'text';
  }

  // Default: role (for interactions)
  return 'role';
}

/**
 * Attempt to infer an action from step text that looks like an assertion.
 * Then-steps typically map to assert* actions.
 */
export function isAssertionStep(stepText: string): boolean {
  const normalised = stepText.toLowerCase();
  const assertKeywords = [
    'should', 'must', 'expect', 'verify', 'assert', 'confirm',
    'visible', 'displayed', 'shown', 'contain', 'have', 'see',
    'appear', 'present', 'exist', 'redirect', 'navigated',
  ];
  return assertKeywords.some((kw) => normalised.includes(kw));
}

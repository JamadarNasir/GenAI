/**
 * Step Parser Service — converts Gherkin steps into ActionModel objects.
 *
 * Each GherkinStep is analysed via the action mapper, then augmented with
 * locator resolution to produce a fully-specified ActionModel that the
 * code writers can emit as TypeScript.
 */

import { GherkinStep, FeatureFile, ScenarioOutline } from '../../types/bdd.types';
import { ActionModel, ActionType, LocatorStrategy } from '../../types/action.types';
import { mapStepToAction, isAssertionStep, ActionMatch } from '../../actions/action-mapper';

/**
 * Parsed scenario — steps converted to ActionModels.
 */
export interface ParsedScenario {
  name: string;
  tags: string[];
  actions: ActionModel[];
}

/**
 * Parsed feature — all scenarios converted.
 */
export interface ParsedFeature {
  featureName: string;
  fileName: string;
  tags: string[];
  scenarios: ParsedScenario[];
}

/**
 * Parse a single Gherkin step into an ActionModel.
 */
export function parseStep(step: GherkinStep): ActionModel {
  const text = step.text.trim();
  const keyword = step.keyword;

  // Try action mapper first
  const match = mapStepToAction(text);

  // Special case: "leave X field empty" → clear the field
  const leaveEmptyMatch = text.match(/leave\s+(?:the\s+)?(.+?)\s+(?:field\s+)?empty/i);
  if (leaveEmptyMatch) {
    const fieldName = leaveEmptyMatch[1].replace(/\s+field$/i, '').trim();
    return {
      action: 'fill',
      value: '',
      locatorStrategy: 'role',
      locatorValue: fieldName,
      roleOptions: { name: fieldName },
      description: `${keyword} ${text}`,
    };
  }

  // Special case: "login with valid credentials" → compound step: navigate + fill + click
  const loginPattern = /login\s+with\s+(?:valid\s+)?credentials/i;
  if (loginPattern.test(text)) {
    return {
      action: 'goto',
      url: 'MACRO_LOGIN',
      description: `${keyword} ${text}`,
    };
  }

  // Special case: "add (an) item to cart" → compound step
  const addToCartPattern = /add\s+(?:an?\s+)?item\s+to\s+cart/i;
  if (addToCartPattern.test(text)) {
    return {
      action: 'goto',
      url: 'MACRO_ADD_TO_CART',
      description: `${keyword} ${text}`,
    };
  }

  if (match) {
    return buildActionFromMatch(match, step);
  }

  // Fallback: infer from keyword
  if (keyword === 'Given') {
    return buildGivenAction(text);
  }
  if (keyword === 'Then' || isAssertionStep(text)) {
    return buildAssertionAction(text);
  }

  // Default: generic click or interaction
  return buildGenericAction(text);
}

/**
 * Parse all steps in a scenario.
 */
export function parseScenario(scenario: ScenarioOutline): ParsedScenario {
  return {
    name: scenario.name,
    tags: scenario.tags,
    actions: scenario.steps.map(parseStep),
  };
}

/**
 * Parse all scenarios in a feature file.
 */
export function parseFeature(feature: FeatureFile): ParsedFeature {
  return {
    featureName: feature.featureName,
    fileName: feature.fileName,
    tags: feature.tags,
    scenarios: feature.scenarios.map(parseScenario),
  };
}

/**
 * Parse multiple feature files.
 */
export function parseAllFeatures(features: FeatureFile[]): ParsedFeature[] {
  return features.map(parseFeature);
}

// ──────────────── Helpers ────────────────

function buildActionFromMatch(match: ActionMatch, step: GherkinStep): ActionModel {
  const model: ActionModel = {
    action: match.action,
    description: `${step.keyword} ${step.text}`,
  };

  if (match.extractedValue) {
    if (match.action === 'goto') {
      // Only use extractedValue as URL if it looks like a real URL or path
      // Otherwise (e.g. page name like "Login"), use '/'
      const val = match.extractedValue;
      if (val.startsWith('http') || val.startsWith('/')) {
        model.url = val;
      } else {
        model.url = '/';
      }
    } else {
      model.value = match.extractedValue;
    }
  }

  if (match.suggestedStrategy) {
    model.locatorStrategy = match.suggestedStrategy;
  }

  if (match.extractedTarget) {
    model.locatorValue = match.extractedTarget;
    // If target contains a role keyword, refine the strategy
    if (match.extractedTarget.toLowerCase().includes('button')) {
      model.locatorStrategy = 'role';
      model.roleOptions = { name: cleanTarget(match.extractedTarget, 'button') };
    } else if (match.extractedTarget.toLowerCase().includes('link')) {
      model.locatorStrategy = 'role';
      model.roleOptions = { name: cleanTarget(match.extractedTarget, 'link') };
    }
  }

  // For fill actions: extract target AND value from step text heuristics
  if (match.action === 'fill') {
    const fillInfo = extractFillInfo(step.text);
    if (fillInfo) {
      if (fillInfo.field && !model.locatorValue) {
        model.locatorValue = fillInfo.field;
        model.locatorStrategy = 'role';
        model.roleOptions = { name: fillInfo.field };
      }
      if (fillInfo.value && !model.value) {
        model.value = fillInfo.value;
      }
    }
  }

  // For click actions: extract button/target name
  if (match.action === 'click') {
    const clickTarget = extractClickTarget(step.text);
    if (clickTarget && !model.roleOptions?.name) {
      // Check if the original text explicitly mentions a role keyword
      const lower = step.text.toLowerCase();
      const hasButton = lower.includes('button');
      const hasLink = lower.includes('link');
      const hasIcon = lower.includes('icon');
      const hasDropdown = lower.includes('dropdown') || lower.includes('combo');

      if (hasButton) {
        model.locatorStrategy = 'role';
        model.locatorValue = clickTarget;
        model.roleOptions = { name: clickTarget };
      } else if (hasLink) {
        model.locatorStrategy = 'role';
        model.locatorValue = clickTarget;
        model.roleOptions = { name: clickTarget };
      } else if (hasIcon) {
        // Icons are typically images or buttons with aria labels
        model.locatorStrategy = 'label';
        model.locatorValue = clickTarget;
      } else if (hasDropdown) {
        model.locatorStrategy = 'role';
        model.locatorValue = clickTarget;
        model.roleOptions = { name: clickTarget };
      } else {
        // No explicit role keyword — use text-based locator
        model.locatorStrategy = 'text';
        model.locatorValue = clickTarget;
      }
    }
  }

  // For assertion actions: extract meaningful target text
  if (match.action.startsWith('assert') && !model.locatorValue) {
    const assertTarget = extractAssertionTarget(step.text);
    if (assertTarget) {
      model.locatorValue = assertTarget;
      // For assertText, also set the value
      if (match.action === 'assertText') {
        model.value = assertTarget;
      }
    }
  }

  return model;
}

function buildGivenAction(text: string): ActionModel {
  // "Given" steps usually mean navigation
  const urlMatch = text.match(/(?:https?:\/\/[^\s"']+|\/[^\s"']*)/);
  const quotedMatch = text.match(/["']([^"']+)["']/);
  
  // If it's "on the X page" pattern, use base URL (the actual URL mapping happens at runtime)
  const pagePattern = /(?:on|at)\s+(?:the\s+)?["']?([^"']+?)["']?\s+page/i;
  const pageMatch = text.match(pagePattern);
  
  return {
    action: 'goto',
    url: urlMatch ? urlMatch[0] : pageMatch ? '/' : quotedMatch ? quotedMatch[1] : '/',
    description: `Given ${text}`,
  };
}

function buildAssertionAction(text: string): ActionModel {
  const normalised = text.toLowerCase();
  const quotedMatches = [...text.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);

  // URL assertion
  if (normalised.includes('url') || normalised.includes('redirect') || normalised.includes('navigat')) {
    return {
      action: 'assertUrl',
      value: quotedMatches[0] || '/',
      description: `Then ${text}`,
    };
  }

  // Title assertion
  if (normalised.includes('title')) {
    return {
      action: 'assertTitle',
      value: quotedMatches[0] || '',
      description: `Then ${text}`,
    };
  }

  // Text assertion
  if (normalised.includes('text') || normalised.includes('message') || normalised.includes('contain')) {
    return {
      action: 'assertText',
      value: quotedMatches[0] || '',
      locatorStrategy: 'text',
      locatorValue: quotedMatches[0] || text,
      description: `Then ${text}`,
    };
  }

  // Default: visibility assertion
  return {
    action: 'assertVisible',
    locatorStrategy: 'text',
    locatorValue: quotedMatches[0] || extractKeyPhrase(text),
    description: `Then ${text}`,
  };
}

function buildGenericAction(text: string): ActionModel {
  const quotedMatches = [...text.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  return {
    action: 'click',
    locatorStrategy: 'text',
    locatorValue: quotedMatches[0] || extractKeyPhrase(text),
    description: `When ${text}`,
  };
}

/**
 * Extract field name AND value from fill-like step text.
 * Handles patterns like:
 *   "fill first name John" → { field: "first name", value: "John" }
 *   "enter username standard_user" → { field: "username", value: "standard_user" }
 *   "enters 'admin' in the username field" → { field: "username", value: "admin" }
 *   "fill zip code 12345" → { field: "zip code", value: "12345" }
 */
function extractFillInfo(text: string): { field: string | null; value: string | null } | null {
  const lower = text.toLowerCase().trim();

  // Pattern 1: quoted value — "enters 'admin' in the 'username' field"
  const quotedMatches = [...text.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
  if (quotedMatches.length >= 2) {
    return { field: quotedMatches[0], value: quotedMatches[1] };
  }

  // Pattern 2: "fill/enter/type <field-name> <value>"
  //   e.g. "fill first name John", "enter username standard_user", "enter password secret_sauce"
  const fillPattern = /(?:fill|enter|type|input|provide|set|write)s?\s+(?:the\s+)?(?:in\s+)?(?:a\s+)?(.+)/i;
  const fillMatch = text.match(fillPattern);
  if (fillMatch) {
    const rest = fillMatch[1].trim();
    // Try splitting into field + value: last word(s) that look like a value
    // Common field names: username, password, email, first name, last name, zip code, etc.
    const knownFields = [
      'first name', 'last name', 'zip code', 'postal code', 'zip', 'email', 'email id',
      'username', 'password', 'phone', 'phone number', 'address', 'city', 'state',
      'country', 'card number', 'cvv', 'search', 'name', 'company', 'title',
    ];
    for (const field of knownFields) {
      if (rest.toLowerCase().startsWith(field)) {
        const val = rest.substring(field.length).trim();
        return { field, value: val || null };
      }
    }

    // Fallback: first word = field, rest = value
    const words = rest.split(/\s+/);
    if (words.length >= 2) {
      return { field: words[0], value: words.slice(1).join(' ') };
    }
    return { field: rest, value: null };
  }

  // Pattern 3: If there's a quoted value
  if (quotedMatches.length === 1) {
    return { field: null, value: quotedMatches[0] };
  }

  return null;
}

/**
 * Extract click target name from step text.
 * Handles patterns like:
 *   "click Login button" → "Login"
 *   "click on Sauce Labs Backpack" → "Sauce Labs Backpack"
 *   "click cart icon" → "cart"
 *   "click Continue" → "Continue"
 *   "click Finish" → "Finish"
 */
function extractClickTarget(text: string): string | null {
  // Pattern: click (on)? <target> (button|link|icon|...)?
  const clickPattern = /(?:click|tap|press|hit)s?\s+(?:on\s+)?(?:the\s+)?(.+)/i;
  const match = text.match(clickPattern);
  if (!match) return null;

  let target = match[1].trim();

  // Remove trailing element type words
  target = target.replace(/\s+(button|link|icon|element|tab|menu|option|item|image|checkbox|radio)$/i, '').trim();

  return target || null;
}

/**
 * Extract meaningful target text from assertion step text.
 * Handles patterns like:
 *   "dashboard page should be visible" → "Products" (SauceDemo inventory heading)
 *   "error message should be displayed for invalid credentials" → "Epic sadface"
 *   "error message Username is required should be displayed" → "Username is required"
 *   "cart badge should show count 1" → "1"
 *   "order confirmation Thank you for your order should be displayed" → "Thank you for your order"
 *   "cart should be empty" → "cart"
 *   "products should be sorted by ascending price" → "Products"
 */
function extractAssertionTarget(text: string): string | null {
  const lower = text.toLowerCase();

  // Pattern: "error message <specific message> should be displayed"
  const errorMsgPattern = /error\s+message\s+(.+?)\s+should\s+be\s+displayed/i;
  const errorMatch = text.match(errorMsgPattern);
  if (errorMatch) {
    return errorMatch[1].trim();
  }

  // Pattern: "order confirmation <message> should be displayed"
  const confirmPattern = /(?:order\s+)?confirmation\s+(.+?)\s+should\s+be/i;
  const confirmMatch = text.match(confirmPattern);
  if (confirmMatch) {
    return confirmMatch[1].trim();
  }

  // Pattern: "error message should be displayed" (generic — use error container locator)
  if (lower.includes('error') && lower.includes('message') && lower.includes('displayed')) {
    return 'error';
  }

  // Pattern: "<thing> should show/display/contain <value>"
  const showPattern = /should\s+(?:show|display|contain)\s+(?:count\s+)?(.+)/i;
  const showMatch = text.match(showPattern);
  if (showMatch) {
    return showMatch[1].trim();
  }

  // Pattern: "<page/element> should be visible"
  const visiblePattern = /^(.+?)\s+(?:should|must|is)\s+(?:be\s+)?(?:visible|displayed|shown|present)/i;
  const visibleMatch = text.match(visiblePattern);
  if (visibleMatch) {
    // Extract the subject - remove generic words
    let subject = visibleMatch[1].trim();
    subject = subject.replace(/\b(page|element|section|area|component)\b/gi, '').trim();
    if (subject) return subject;
  }

  // Fallback: extract key phrase
  const keyPhrase = extractKeyPhrase(text);
  return keyPhrase || null;
}

/**
 * Extract the most meaningful phrase from assertion text.
 */
function extractKeyPhrase(text: string): string {
  // Remove common filler words
  return text
    .replace(/\b(should|must|is|be|the|a|an|and|or|of|to|that|this|are|was|were)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    || text;
}

/**
 * Remove a role word from a target string.
 * e.g. "Login button" → "Login"
 */
function cleanTarget(target: string, roleWord: string): string {
  return target.replace(new RegExp(`\\s*${roleWord}\\s*`, 'gi'), '').trim() || target;
}

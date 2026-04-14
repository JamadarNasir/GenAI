/**
 * Page Object Template — generates Page Object Model TypeScript files.
 *
 * Each module gets a PageObject class that extends BasePage and
 * contains locator methods + action methods extracted from the parsed steps.
 */

import { ParsedScenario } from '../services/codegen/step-parser.service';
import { ActionModel, LocatorStrategy } from '../types/action.types';
import { resolveLocator } from '../services/codegen/locator-resolver.service';

/**
 * Generate a Page Object .ts file for a module.
 */
export function generatePageObjectFile(
  moduleName: string,
  scenarios: ParsedScenario[]
): string {
  const className = `${toPascalCase(moduleName)}Page`;
  const lines: string[] = [];

  // Collect unique locators and actions
  const locators = collectLocators(scenarios);
  const actions = collectPageActions(scenarios);

  // Header
  lines.push(`// ${className}.ts — Auto-generated Page Object for ${moduleName}`);
  lines.push(`// Smart Locator: 4-tier resolution (Snapshot → Pattern → LLM → Heal)`);
  lines.push(`import { Page, expect } from '@playwright/test';`);
  lines.push(`import { BasePage } from './BasePage';`);
  lines.push(`import { smartLocate, smartClick, smartFill, smartAssertVisible, smartAssertText } from '../support/smart-locator';`);
  lines.push('');

  // Class declaration
  lines.push(`export class ${className} extends BasePage {`);
  lines.push('');

  // Constructor
  lines.push(`  constructor(page: Page) {`);
  lines.push(`    super(page);`);
  lines.push(`  }`);
  lines.push('');

  // ── Locator getters ──
  if (locators.size > 0) {
    lines.push(`  // ── Locators ──`);
    lines.push('');
    for (const [name, code] of locators) {
      lines.push(`  get ${name}() {`);
      lines.push(`    return ${code};`);
      lines.push(`  }`);
      lines.push('');
    }
  }

  // ── Action methods ──
  if (actions.length > 0) {
    lines.push(`  // ── Actions ──`);
    lines.push('');
    for (const action of actions) {
      lines.push(action);
      lines.push('');
    }
  }

  // Close class
  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Collect unique locators from all scenarios, returning Map<getterName, locatorCode>.
 */
function collectLocators(scenarios: ParsedScenario[]): Map<string, string> {
  const locators = new Map<string, string>();

  for (const scenario of scenarios) {
    for (const action of scenario.actions) {
      if (!action.locatorStrategy || !action.locatorValue) continue;

      const resolved = resolveLocator(action);
      if (!resolved) continue;

      const getterName = buildGetterName(action);
      if (getterName && !locators.has(getterName)) {
        locators.set(getterName, resolved.code);
      }
    }
  }

  return locators;
}

/**
 * Collect unique page action methods.
 */
function collectPageActions(scenarios: ParsedScenario[]): string[] {
  const methods: string[] = [];
  const methodNames = new Set<string>();

  for (const scenario of scenarios) {
    for (const action of scenario.actions) {
      const methodName = buildMethodName(action);
      if (!methodName || methodNames.has(methodName)) continue;
      methodNames.add(methodName);

      const methodCode = buildMethodCode(action, methodName);
      if (methodCode) methods.push(methodCode);
    }
  }

  return methods;
}

/**
 * Build a getter name from an ActionModel.
 * e.g. "username" → "usernameInput", "login button" → "loginButton"
 */
function buildGetterName(action: ActionModel): string | null {
  const base = action.locatorValue || action.roleOptions?.name;
  if (!base) return null;

  const slug = toCamelCase(base);
  // Ensure valid JS identifier — must start with a letter
  if (!slug || /^\d/.test(slug)) return null;

  // Append element type suffix
  switch (action.action) {
    case 'fill':
      return `${slug}Input`;
    case 'click':
      return `${slug}Button`;
    case 'select':
      return `${slug}Dropdown`;
    case 'check':
    case 'uncheck':
      return `${slug}Checkbox`;
    case 'assertVisible':
    case 'assertText':
      return `${slug}Element`;
    default:
      return `${slug}Element`;
  }
}

/**
 * Build an action method name.
 */
function buildMethodName(action: ActionModel): string | null {
  const target = action.locatorValue || action.roleOptions?.name || '';
  if (!target && action.action !== 'goto') return null;

  switch (action.action) {
    case 'goto':
      return 'navigateTo';
    case 'click':
      return `click${toPascalCase(target)}`;
    case 'fill':
      return `fill${toPascalCase(target)}`;
    case 'select':
      return `select${toPascalCase(target)}`;
    case 'check':
      return `check${toPascalCase(target)}`;
    case 'uncheck':
      return `uncheck${toPascalCase(target)}`;
    case 'hover':
      return `hoverOver${toPascalCase(target)}`;
    case 'assertVisible':
      return `verify${toPascalCase(target)}Visible`;
    case 'assertText':
      return `verify${toPascalCase(target)}Text`;
    default:
      return null;
  }
}

/**
 * Build the method body code for an action.
 */
function buildMethodCode(action: ActionModel, methodName: string): string | null {
  const resolved = resolveLocator(action);
  const locatorCode = resolved?.code || `this.page.getByText('${action.locatorValue || ''}')`;

  switch (action.action) {
    case 'goto':
      return [
        `  async ${methodName}(url: string = '${action.url || '/'}') {`,
        `    await this.page.goto(url);`,
        `  }`,
      ].join('\n');

    case 'click': {
      const criteria = buildSmartCriteria(action);
      return [
        `  async ${methodName}() {`,
        `    // Smart Locator: Snapshot → Pattern → LLM → Heal`,
        `    await smartClick(this.page, ${JSON.stringify(criteria)}, { stepDescription: '${escapeQuotes(action.description)}' });`,
        `  }`,
      ].join('\n');
    }

    case 'fill': {
      const criteria = buildSmartCriteria(action);
      return [
        `  async ${methodName}(value: string) {`,
        `    // Smart Locator: Snapshot → Pattern → LLM → Heal`,
        `    await smartFill(this.page, ${JSON.stringify(criteria)}, value, { stepDescription: '${escapeQuotes(action.description)}' });`,
        `  }`,
      ].join('\n');
    }

    case 'select':
      return [
        `  async ${methodName}(option: string) {`,
        `    await ${locatorCode}.selectOption(option);`,
        `  }`,
      ].join('\n');

    case 'check':
      return [
        `  async ${methodName}() {`,
        `    await ${locatorCode}.check();`,
        `  }`,
      ].join('\n');

    case 'uncheck':
      return [
        `  async ${methodName}() {`,
        `    await ${locatorCode}.uncheck();`,
        `  }`,
      ].join('\n');

    case 'hover':
      return [
        `  async ${methodName}() {`,
        `    await ${locatorCode}.hover();`,
        `  }`,
      ].join('\n');

    case 'assertVisible': {
      const criteria = buildSmartCriteria(action);
      return [
        `  async ${methodName}() {`,
        `    // Smart Locator: Snapshot → Pattern → LLM → Heal`,
        `    await smartAssertVisible(this.page, ${JSON.stringify(criteria)}, { stepDescription: '${escapeQuotes(action.description)}' });`,
        `  }`,
      ].join('\n');
    }

    case 'assertText': {
      const criteria = buildSmartCriteria(action);
      return [
        `  async ${methodName}(expected: string) {`,
        `    // Smart Locator: Snapshot → Pattern → LLM → Heal`,
        `    await smartAssertText(this.page, ${JSON.stringify(criteria)}, expected, { stepDescription: '${escapeQuotes(action.description)}' });`,
        `  }`,
      ].join('\n');
    }

    default:
      return null;
  }
}

// ── Utilities ──

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // strip non-alphanumeric (except spaces/hyphens/underscores)
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Unknown';
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function escapeQuotes(str: string): string {
  return str.replace(/'/g, "\\'");
}

/**
 * Build SearchCriteria object from an ActionModel for smart locator.
 */
function buildSmartCriteria(action: ActionModel): Record<string, string> {
  const criteria: Record<string, string> = {};
  const strategy = action.locatorStrategy || 'text';
  const value = action.locatorValue || action.description;

  switch (strategy) {
    case 'testId':
      criteria.testId = value;
      break;
    case 'role': {
      const lower = (value || '').toLowerCase();
      const desc = action.description.toLowerCase();
      let role = 'button';
      if (lower.includes('button') || desc.includes('button')) role = 'button';
      else if (lower.includes('link') || desc.includes('link')) role = 'link';
      else if (lower.includes('checkbox') || desc.includes('checkbox')) role = 'checkbox';
      else if (lower.includes('heading') || desc.includes('heading')) role = 'heading';
      else if (action.action === 'fill') role = 'textbox';
      else if (action.action === 'select') role = 'combobox';
      else if (action.action === 'check' || action.action === 'uncheck') role = 'checkbox';
      criteria.role = role;
      criteria.name = action.roleOptions?.name || value;
      break;
    }
    case 'label':
      criteria.label = value;
      break;
    case 'placeholder':
      criteria.placeholder = value;
      break;
    case 'text':
    default:
      criteria.text = value;
      break;
  }

  return criteria;
}

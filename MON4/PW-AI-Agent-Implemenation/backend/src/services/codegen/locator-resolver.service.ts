/**
 * Locator Resolver Service — converts an ActionModel's locator info
 * into a concrete Playwright locator code string.
 *
 * Priority (per architecture):
 *   1. data-testid  → page.getByTestId()
 *   2. ARIA role    → page.getByRole()
 *   3. aria-label   → page.getByLabel()
 *   4. placeholder  → page.getByPlaceholder()
 *   5. visible text → page.getByText()
 *   6. CSS selector → page.locator()
 *   7. XPath        → page.locator()
 */

import { ActionModel, LocatorResolution, LocatorStrategy } from '../../types/action.types';

/**
 * Resolve an ActionModel into a Playwright locator code string.
 */
export function resolveLocator(model: ActionModel): LocatorResolution | null {
  if (!model.locatorStrategy && !model.locatorValue) {
    return null; // no locator needed (goto, press key, etc.)
  }

  const strategy = model.locatorStrategy || 'text';
  const value = model.locatorValue || '';

  return buildLocatorCode(strategy, value, model);
}

/**
 * Build the Playwright locator code for a given strategy + value.
 */
function buildLocatorCode(
  strategy: LocatorStrategy,
  value: string,
  model: ActionModel
): LocatorResolution {
  switch (strategy) {
    case 'testId':
      return {
        strategy: 'testId',
        code: `this.page.getByTestId('${escapeQuotes(value)}')`,
        confidence: 0.95,
      };

    case 'role':
      return buildRoleLocator(value, model);

    case 'label':
      return {
        strategy: 'label',
        code: `this.page.getByLabel('${escapeQuotes(value)}')`,
        confidence: 0.8,
      };

    case 'placeholder':
      return {
        strategy: 'placeholder',
        code: `this.page.getByPlaceholder('${escapeQuotes(value)}')`,
        confidence: 0.75,
      };

    case 'text':
      return {
        strategy: 'text',
        code: `this.page.getByText('${escapeQuotes(value)}')`,
        confidence: 0.65,
      };

    case 'css':
      return {
        strategy: 'css',
        code: `this.page.locator('${escapeQuotes(value)}')`,
        confidence: 0.5,
      };

    case 'xpath':
      return {
        strategy: 'xpath',
        code: `this.page.locator('${escapeQuotes(value)}')`,
        confidence: 0.4,
      };

    default:
      return {
        strategy: 'text',
        code: `this.page.getByText('${escapeQuotes(value)}')`,
        confidence: 0.5,
      };
  }
}

/**
 * Build a role-based locator, inferring the ARIA role from text.
 */
function buildRoleLocator(value: string, model: ActionModel): LocatorResolution {
  const role = inferAriaRole(value, model);
  const name = model.roleOptions?.name || value;

  if (name) {
    return {
      strategy: 'role',
      code: `this.page.getByRole('${role}', { name: '${escapeQuotes(name)}' })`,
      confidence: 0.85,
    };
  }

  return {
    strategy: 'role',
    code: `this.page.getByRole('${role}')`,
    confidence: 0.7,
  };
}

/**
 * Infer the ARIA role from text and action type.
 */
function inferAriaRole(value: string, model: ActionModel): string {
  const lower = (value || '').toLowerCase();
  const desc = model.description.toLowerCase();

  // Explicit role keywords in the text
  if (lower.includes('button') || desc.includes('button')) return 'button';
  if (lower.includes('link') || desc.includes('link')) return 'link';
  if (lower.includes('checkbox') || desc.includes('checkbox')) return 'checkbox';
  if (lower.includes('radio') || desc.includes('radio')) return 'radio';
  if (lower.includes('heading') || desc.includes('heading')) return 'heading';
  if (lower.includes('tab') || desc.includes('tab')) return 'tab';
  if (lower.includes('menu') || desc.includes('menu')) return 'menuitem';
  if (lower.includes('dialog') || desc.includes('dialog') || desc.includes('modal')) return 'dialog';
  if (lower.includes('combobox') || lower.includes('dropdown')) return 'combobox';
  if (lower.includes('list') || lower.includes('option')) return 'listbox';

  // Infer from action type
  switch (model.action) {
    case 'click':
      return 'button';
    case 'fill':
      return 'textbox';
    case 'select':
      return 'combobox';
    case 'check':
    case 'uncheck':
      return 'checkbox';
    default:
      return 'button';
  }
}

/**
 * Generate the full Playwright code for a single ActionModel.
 *
 * Now uses Smart Locator (4-tier resolution) for locator-based actions:
 *   1. Accessibility Snapshot → 2. Pattern Match → 3. LLM Fallback → 4. Healing
 *
 * For non-locator actions (goto, press, screenshot, assertUrl, assertTitle),
 * generates static code as before.
 */
export function generateActionCode(model: ActionModel): string {
  const { action, url, value } = model;

  // No-locator actions (unchanged — these don't need smart resolution)
  if (action === 'goto') {
    if (url === 'MACRO_LOGIN') {
      return [
        `// Compound step: "login with valid credentials"`,
        `  // TODO: Replace with actual login steps for your application`,
        `  await this.page.goto('/');`,
      ].join('\n');
    }
    if (url === 'MACRO_ADD_TO_CART') {
      return [
        `// Compound step: "add item to cart"`,
        `  // TODO: Replace with actual add-to-cart steps for your application`,
        `  await this.page.goto('/');`,
      ].join('\n');
    }
    return `await this.page.goto('${escapeQuotes(url || '/')}');`;
  }
  if (action === 'press') {
    return `await this.page.keyboard.press('${escapeQuotes(value || 'Enter')}');`;
  }
  if (action === 'screenshot') {
    return `await this.page.screenshot({ path: '${escapeQuotes(value || 'screenshot.png')}', fullPage: true });`;
  }
  if (action === 'assertUrl') {
    return `await expect(this.page).toHaveURL(/${escapeRegex(value || '')}/);\n`;
  }
  if (action === 'assertTitle') {
    return `await expect(this.page).toHaveTitle('${escapeQuotes(value || '')}');`;
  }

  // ── Smart Locator Actions (4-tier resolution) ──
  // Build SearchCriteria from the ActionModel
  const criteria = buildSearchCriteria(model);
  const criteriaStr = JSON.stringify(criteria).replace(/'/g, "\\'");
  const stepDesc = escapeQuotes(model.description);

  switch (action) {
    case 'click':
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  await smartClick(this.page, ${criteriaStr}, { stepDescription: '${stepDesc}' });`;
    case 'fill':
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  await smartFill(this.page, ${criteriaStr}, '${escapeQuotes(value || '')}', { stepDescription: '${stepDesc}' });`;
    case 'select': {
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  const _r = await smartLocate(this.page, ${criteriaStr}, 'select', { stepDescription: '${stepDesc}' });\n  if (_r.locator) await _r.locator.selectOption('${escapeQuotes(value || '')}');`;
    }
    case 'check': {
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  const _r = await smartLocate(this.page, ${criteriaStr}, 'check', { stepDescription: '${stepDesc}' });\n  if (_r.locator) await _r.locator.check();`;
    }
    case 'uncheck': {
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  const _r = await smartLocate(this.page, ${criteriaStr}, 'uncheck', { stepDescription: '${stepDesc}' });\n  if (_r.locator) await _r.locator.uncheck();`;
    }
    case 'hover': {
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  const _r = await smartLocate(this.page, ${criteriaStr}, 'hover', { stepDescription: '${stepDesc}' });\n  if (_r.locator) await _r.locator.hover();`;
    }
    case 'upload': {
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  const _r = await smartLocate(this.page, ${criteriaStr}, 'upload', { stepDescription: '${stepDesc}' });\n  if (_r.locator) await _r.locator.setInputFiles('${escapeQuotes(value || '')}');`;
    }
    case 'waitForSelector': {
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  const _r = await smartLocate(this.page, ${criteriaStr}, 'waitFor', { stepDescription: '${stepDesc}' });\n  if (_r.locator) await _r.locator.waitFor({ state: 'visible' });`;
    }
    case 'assertVisible':
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  await smartAssertVisible(this.page, ${criteriaStr}, { stepDescription: '${stepDesc}' });`;
    case 'assertText':
      return `// Smart Locator: Snapshot → Pattern → LLM → Heal\n  await smartAssertText(this.page, ${criteriaStr}, '${escapeQuotes(value || '')}', { stepDescription: '${stepDesc}' });`;
    default:
      return `// TODO: unhandled action "${action}" — ${model.description}`;
  }
}

/**
 * Build SearchCriteria from an ActionModel for the smart locator.
 * Extracts a clean element name — never passes full Gherkin step text as the search target.
 */
function buildSearchCriteria(model: ActionModel): Record<string, string> {
  const criteria: Record<string, string> = {};

  // Prefer explicit locatorValue / roleOptions, fall back to extracting from description
  const rawValue = model.locatorValue || model.roleOptions?.name || '';
  const cleanTarget = rawValue || extractTargetFromDescription(model.description, model.action);

  const strategy = model.locatorStrategy || 'text';

  switch (strategy) {
    case 'testId':
      criteria.testId = cleanTarget;
      break;
    case 'role':
      criteria.role = inferAriaRole(cleanTarget, model);
      criteria.name = model.roleOptions?.name || cleanTarget;
      break;
    case 'label':
      criteria.label = cleanTarget;
      break;
    case 'placeholder':
      criteria.placeholder = cleanTarget;
      break;
    case 'text':
    case 'css':
    case 'xpath':
    default:
      criteria.text = cleanTarget;
      break;
  }

  // For hover actions always use text+name (not role:button).
  // Hovered elements are often links/menu items, not buttons.
  if (model.action === 'hover') {
    delete criteria.role;
    criteria.name = cleanTarget;
    criteria.text = cleanTarget;
  }

  return criteria;
}

/**
 * Extract the actual target element name from a full Gherkin step description.
 * e.g. "And user hover to My account --> Login page." → "My account"
 * e.g. "When user clicks on the Login button"          → "Login"
 */
function extractTargetFromDescription(description: string, action: string): string {
  // Strip Gherkin keyword prefix
  let text = description.replace(/^(Given|When|Then|And|But)\s+/i, '').trim();

  // hover to/on/over <target> --> ...  (take part before arrow)
  const hoverArrowMatch = text.match(/(?:hover|mouse\s*over)\s+(?:to|on|over|the|a)?\s*["']?(.+?)["']?\s*(?:-->|->|—>|→)/i);
  if (hoverArrowMatch) return hoverArrowMatch[1].trim();

  // hover to/on/over <target> (end of string)
  const hoverMatch = text.match(/(?:hover|mouse\s*over)\s+(?:to|on|over|the|a)?\s*["']?([^"'\s][^"']{0,60}?)["']?(?:\s*\.)?$/i);
  if (hoverMatch && action === 'hover') return hoverMatch[1].trim();

  // Quoted text — most reliable
  const quotedMatch = text.match(/["']([^"']+)["']/);
  if (quotedMatch) return quotedMatch[1].trim();

  // click / tap on <target> (optional button/link suffix)
  const clickMatch = text.match(/(?:click|tap|press)s?\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+(?:button|link|icon|element))?$/i);
  if (clickMatch && (action === 'click' || action === 'hover')) return clickMatch[1].trim();

  // Short enough — use as-is
  if (text.length <= 40) return text;

  // Take text before --> arrow
  const arrowMatch = text.match(/^(.+?)\s*(?:-->|->|—>|→)/);
  if (arrowMatch) {
    return arrowMatch[1]
      .replace(/^(?:user\s+)?(?:hover|click|fill|check|select|navigate|go\s+to|visit)\s+(?:to|on|over|the|a)?\s*/i, '')
      .trim();
  }

  // Last resort: first 4 meaningful words
  return text.split(/\s+/).slice(0, 4).join(' ');
}

// ── Utilities ──

function escapeQuotes(str: string): string {
  return str.replace(/'/g, "\\'");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

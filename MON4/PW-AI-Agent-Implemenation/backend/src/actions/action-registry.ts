/**
 * Action Registry — defines every supported Playwright action with metadata.
 *
 * Each entry describes:
 *  - how to generate the Playwright code snippet
 *  - whether a locator is required
 *  - whether a value argument is required
 */

import { ActionType, LocatorStrategy } from '../types/action.types';

export interface ActionDefinition {
  /** Unique action type key */
  type: ActionType;
  /** Human-readable label */
  label: string;
  /** Does this action need a locator? */
  requiresLocator: boolean;
  /** Does this action need a value argument (fill text, select option, etc.)? */
  requiresValue: boolean;
  /** Default locator strategy when none is specified */
  defaultLocatorStrategy: LocatorStrategy | null;
  /**
   * Template for the Playwright code.
   * Placeholders: {{locator}}, {{value}}, {{url}}
   */
  codeTemplate: string;
  /** Keywords that trigger this action when found in step text */
  keywords: string[];
}

/**
 * Master registry of all supported Playwright actions.
 */
export const ACTION_REGISTRY: Map<ActionType, ActionDefinition> = new Map([
  [
    'goto',
    {
      type: 'goto',
      label: 'Navigate to URL',
      requiresLocator: false,
      requiresValue: false,
      defaultLocatorStrategy: null,
      codeTemplate: `await this.page.goto('{{url}}');`,
      keywords: [
        'navigate', 'go to', 'goes to', 'open', 'opens', 'visit', 'visits',
        'browse', 'browses', 'launch', 'launches', 'load', 'loads',
        'is on', 'am on', 'are on', 'land on', 'lands on',
      ],
    },
  ],
  [
    'click',
    {
      type: 'click',
      label: 'Click element',
      requiresLocator: true,
      requiresValue: false,
      defaultLocatorStrategy: 'role',
      codeTemplate: `await {{locator}}.click();`,
      keywords: [
        'click', 'clicks', 'tap', 'taps', 'press', 'presses',
        'hit', 'hits', 'select', 'selects', 'choose', 'chooses',
        'submit', 'submits', 'confirm', 'confirms',
      ],
    },
  ],
  [
    'fill',
    {
      type: 'fill',
      label: 'Fill input field',
      requiresLocator: true,
      requiresValue: true,
      defaultLocatorStrategy: 'role',
      codeTemplate: `await {{locator}}.fill('{{value}}');`,
      keywords: [
        'enter', 'enters', 'type', 'types', 'fill', 'fills',
        'input', 'inputs', 'write', 'writes', 'set', 'sets',
        'provide', 'provides',
      ],
    },
  ],
  [
    'select',
    {
      type: 'select',
      label: 'Select dropdown option',
      requiresLocator: true,
      requiresValue: true,
      defaultLocatorStrategy: 'role',
      codeTemplate: `await {{locator}}.selectOption('{{value}}');`,
      keywords: [
        'select', 'selects', 'choose', 'chooses', 'pick', 'picks',
        'dropdown', 'combo',
      ],
    },
  ],
  [
    'check',
    {
      type: 'check',
      label: 'Check checkbox',
      requiresLocator: true,
      requiresValue: false,
      defaultLocatorStrategy: 'role',
      codeTemplate: `await {{locator}}.check();`,
      keywords: ['check', 'checks', 'tick', 'ticks', 'enable', 'enables'],
    },
  ],
  [
    'uncheck',
    {
      type: 'uncheck',
      label: 'Uncheck checkbox',
      requiresLocator: true,
      requiresValue: false,
      defaultLocatorStrategy: 'role',
      codeTemplate: `await {{locator}}.uncheck();`,
      keywords: ['uncheck', 'unchecks', 'untick', 'unticks', 'disable', 'disables'],
    },
  ],
  [
    'hover',
    {
      type: 'hover',
      label: 'Hover over element',
      requiresLocator: true,
      requiresValue: false,
      defaultLocatorStrategy: 'role',
      codeTemplate: `await {{locator}}.hover();`,
      keywords: ['hover', 'hovers', 'mouse over', 'mouseover'],
    },
  ],
  [
    'press',
    {
      type: 'press',
      label: 'Press keyboard key',
      requiresLocator: false,
      requiresValue: true,
      defaultLocatorStrategy: null,
      codeTemplate: `await this.page.keyboard.press('{{value}}');`,
      keywords: ['press key', 'presses key', 'keyboard', 'key press', 'hit key'],
    },
  ],
  [
    'upload',
    {
      type: 'upload',
      label: 'Upload file',
      requiresLocator: true,
      requiresValue: true,
      defaultLocatorStrategy: 'css',
      codeTemplate: `await {{locator}}.setInputFiles('{{value}}');`,
      keywords: ['upload', 'uploads', 'attach', 'attaches', 'file input'],
    },
  ],
  [
    'waitForSelector',
    {
      type: 'waitForSelector',
      label: 'Wait for element',
      requiresLocator: true,
      requiresValue: false,
      defaultLocatorStrategy: 'css',
      codeTemplate: `await {{locator}}.waitFor({ state: 'visible' });`,
      keywords: ['wait', 'waits', 'wait for', 'waits for', 'loading', 'appear', 'appears'],
    },
  ],
  [
    'assertVisible',
    {
      type: 'assertVisible',
      label: 'Assert element is visible',
      requiresLocator: true,
      requiresValue: false,
      defaultLocatorStrategy: 'text',
      codeTemplate: `await expect({{locator}}).toBeVisible();`,
      keywords: [
        'visible', 'displayed', 'shown', 'see', 'sees', 'should see',
        'appears', 'appear', 'present', 'exists',
      ],
    },
  ],
  [
    'assertText',
    {
      type: 'assertText',
      label: 'Assert element contains text',
      requiresLocator: true,
      requiresValue: true,
      defaultLocatorStrategy: 'text',
      codeTemplate: `await expect({{locator}}).toContainText('{{value}}');`,
      keywords: [
        'contain', 'contains', 'text', 'message', 'label',
        'should have text', 'should display', 'should show',
      ],
    },
  ],
  [
    'assertUrl',
    {
      type: 'assertUrl',
      label: 'Assert current URL',
      requiresLocator: false,
      requiresValue: true,
      defaultLocatorStrategy: null,
      codeTemplate: `await expect(this.page).toHaveURL('{{value}}');`,
      keywords: ['url', 'redirect', 'redirected', 'navigation', 'navigated'],
    },
  ],
  [
    'assertTitle',
    {
      type: 'assertTitle',
      label: 'Assert page title',
      requiresLocator: false,
      requiresValue: true,
      defaultLocatorStrategy: null,
      codeTemplate: `await expect(this.page).toHaveTitle('{{value}}');`,
      keywords: ['title', 'page title'],
    },
  ],
  [
    'screenshot',
    {
      type: 'screenshot',
      label: 'Take screenshot',
      requiresLocator: false,
      requiresValue: false,
      defaultLocatorStrategy: null,
      codeTemplate: `await this.page.screenshot({ path: '{{value}}', fullPage: true });`,
      keywords: ['screenshot', 'capture', 'snap'],
    },
  ],
]);

/**
 * Get an action definition by type.
 */
export function getActionDef(type: ActionType): ActionDefinition | undefined {
  return ACTION_REGISTRY.get(type);
}

/**
 * List all registered action types.
 */
export function getAllActionTypes(): ActionType[] {
  return [...ACTION_REGISTRY.keys()];
}

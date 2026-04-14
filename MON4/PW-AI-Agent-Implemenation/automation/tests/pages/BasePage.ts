// BasePage.ts — Base class for all Page Objects with Smart Locator support
import { Page, expect, Locator } from '@playwright/test';
import { smartLocate, smartClick, smartFill, smartAssertVisible, smartAssertText, SmartResolution, ResolutionTier } from '../support/smart-locator';
import { SearchCriteria } from '../support/pattern-resolver';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Smart Locator Methods (4-tier resolution) ───

  /**
   * Smart element resolution using the 4-tier flow:
   *   1. Accessibility Snapshot → 2. Pattern Match → 3. LLM Fallback → 4. Healing
   */
  async smartLocate(criteria: SearchCriteria, action: string, stepDescription?: string): Promise<SmartResolution> {
    return smartLocate(this.page, criteria, action, { stepDescription });
  }

  /**
   * Smart click — resolves element via 4-tier flow, then clicks.
   */
  async smartClick(criteria: SearchCriteria, stepDescription?: string): Promise<void> {
    const result = await smartClick(this.page, criteria, { stepDescription });
    if (!result.locator) {
      throw new Error(`[SmartLocator] Failed to find element for click: ${JSON.stringify(criteria)} (all 4 tiers exhausted)`);
    }
  }

  /**
   * Smart fill — resolves element via 4-tier flow, then fills.
   */
  async smartFill(criteria: SearchCriteria, value: string, stepDescription?: string): Promise<void> {
    const result = await smartFill(this.page, criteria, value, { stepDescription });
    if (!result.locator) {
      throw new Error(`[SmartLocator] Failed to find element for fill: ${JSON.stringify(criteria)} (all 4 tiers exhausted)`);
    }
  }

  /**
   * Smart assert visible — resolves element via 4-tier flow, then asserts visible.
   */
  async smartAssertVisible(criteria: SearchCriteria, stepDescription?: string): Promise<void> {
    const result = await smartAssertVisible(this.page, criteria, { stepDescription });
    if (!result.locator) {
      throw new Error(`[SmartLocator] Failed to find element for visibility check: ${JSON.stringify(criteria)} (all 4 tiers exhausted)`);
    }
  }

  /**
   * Smart assert text — resolves element via 4-tier flow, then asserts text content.
   */
  async smartAssertText(criteria: SearchCriteria, text: string, stepDescription?: string): Promise<void> {
    const result = await smartAssertText(this.page, criteria, text, { stepDescription });
    if (!result.locator) {
      throw new Error(`[SmartLocator] Failed to find element for text assertion: ${JSON.stringify(criteria)} (all 4 tiers exhausted)`);
    }
  }

  // ─── Traditional Methods (still available as fallback) ───

  /** Navigate to a URL */
  async navigate(url: string) {
    await this.page.goto(url);
  }

  /** Wait for page to finish loading */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /** Get current URL */
  getUrl(): string {
    return this.page.url();
  }

  /** Get page title */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** Click an element (static locator) */
  async clickElement(locator: Locator) {
    await locator.click();
  }

  /** Fill an input (static locator) */
  async fillInput(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /** Assert element is visible (static locator) */
  async assertVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  /** Assert element contains text (static locator) */
  async assertText(locator: Locator, text: string) {
    await expect(locator).toContainText(text);
  }

  /** Take a screenshot */
  async screenshot(name: string = 'screenshot') {
    await this.page.screenshot({ path: `allure-results/${name}.png`, fullPage: true });
  }
}

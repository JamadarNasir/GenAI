/**
 * Hooks Template — generates the hooks.ts file for Cucumber + Playwright.
 *
 * Includes:
 *  - Before: launch browser, create context + page, init smart locator
 *  - After: screenshot on failure, capture accessibility snapshot, close browser
 *  - BeforeAll / AfterAll stubs
 *  - Playwright MCP accessibility snapshot integration
 */

export function generateHooksFile(): string {
  return `// hooks.ts — Auto-generated Cucumber hooks for Playwright + Smart Locator
import { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser, BrowserContext, Page } from '@playwright/test';
import { PlaywrightWorld } from './world';
import { captureAccessibilitySnapshot } from './accessibility-snapshot';
import { captureSnapshotAsText } from './accessibility-snapshot';
import path from 'path';
import fs from 'fs';

// Set default step timeout to 60 seconds (increased for smart resolution)
setDefaultTimeout(60_000);

const browserType = process.env.BROWSER || 'chromium';
const headless = process.env.HEADLESS !== 'false';
const baseURL = process.env.BASE_URL || 'https://ecommerce-playground.lambdatest.io/index.php?route=common/home';

// Directory where Playwright will write video recordings (same as allure-results)
const videosDir = path.resolve(__dirname, '../../allure-results');

function getBrowserLauncher() {
  switch (browserType) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      return chromium;
  }
}

BeforeAll(async function () {
  // Ensure allure-results dir exists before tests write videos there
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }
  console.log(\`[Hooks] Running tests with \${browserType} (headless: \${headless})\`);
  console.log(\`[Hooks] Smart Locator: 4-tier resolution enabled (Snapshot → Pattern → LLM → Heal)\`);
  console.log(\`[Hooks] AI Provider: \${process.env.AI_PROVIDER || 'openai'} | Model: \${process.env.OPENAI_MODEL || 'gpt-4o'}\`);
  console.log(\`[Hooks] Video recording → \${videosDir}\`);
});

Before(async function (this: PlaywrightWorld, scenario) {
  const launcher = getBrowserLauncher();
  this.browser = await launcher.launch({ headless });
  this.context = await this.browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    recordVideo: { dir: videosDir, size: { width: 1280, height: 720 } },
  });
  this.page = await this.context.newPage();

  // Reset resolution stats for this scenario
  this.resolutionStats = { pattern: 0, llm: 0, healed: 0, failed: 0 };

  // Capture initial state screenshot
  try {
    const initialScreenshot = await this.page.screenshot({ fullPage: false });
    await this.attach(initialScreenshot, 'image/png');
    console.log(\`[Hooks] Initial screenshot captured for: \${scenario.pickle.name}\`);
  } catch (e) {
    console.warn('[Hooks] Could not capture initial screenshot:', e);
  }
});

After({ timeout: 90_000 }, async function (this: PlaywrightWorld, scenario) {
  const failed = scenario.result?.status === Status.FAILED;

  if (this.page) {
    try {
      // Always capture final screenshot (pass or fail)
      const finalScreenshot = await this.page.screenshot({ fullPage: true });
      await this.attach(finalScreenshot, 'image/png');

      if (failed) {
        // Accessibility snapshot on failure — useful for healing
        const snapshotText = await captureSnapshotAsText(this.page);
        await this.attach(snapshotText, 'text/plain');
        console.log('[Hooks] Captured accessibility snapshot for failed scenario');

        // Full DOM HTML for healing context
        const html = await this.page.content();
        await this.attach(html, 'text/html');
      }
    } catch (e) {
      console.error('[Hooks] Failed to capture scenario artifacts:', e);
    }
  }

  // Log resolution stats
  if (this.resolutionStats) {
    const s = this.resolutionStats;
    console.log(\`[Hooks] Resolution stats — Pattern: \${s.pattern} | LLM: \${s.llm} | Healed: \${s.healed} | Failed: \${s.failed}\`);
  }

  // Save video reference BEFORE closing the page (close finalizes the .webm file)
  const video = this.page?.video() ?? null;

  // Close page (this finalizes the video recording)
  try {
    if (this.page) await this.page.close();
  } catch (e) {
    console.error('[Hooks] Error closing page:', e);
  }

  // Attach the recorded video after page is closed
  if (video) {
    try {
      const videoPath = await video.path();
      if (videoPath && fs.existsSync(videoPath)) {
        const videoBuffer = fs.readFileSync(videoPath);
        await this.attach(videoBuffer, 'video/webm');
        console.log(\`[Hooks] Video attached: \${path.basename(videoPath)}\`);
      }
    } catch (e) {
      console.warn('[Hooks] Could not attach video recording:', e);
    }
  }

  // Close context and browser
  try {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  } catch (e) {
    console.error('[Hooks] Error during teardown:', e);
  }
});

AfterAll(async function () {
  console.log('[Hooks] All tests completed.');
});
`;
}

/**
 * Generate the world.ts file for Cucumber World with Smart Locator support.
 */
export function generateWorldFile(): string {
  return `// world.ts — Cucumber World with Playwright + Smart Locator context
import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Resolution stats tracked per scenario.
 */
export interface ResolutionStats {
  pattern: number;
  llm: number;
  healed: number;
  failed: number;
}

export class PlaywrightWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  resolutionStats!: ResolutionStats;

  constructor(options: IWorldOptions) {
    super(options);
    this.resolutionStats = { pattern: 0, llm: 0, healed: 0, failed: 0 };
  }
}

setWorldConstructor(PlaywrightWorld);
`;
}

/**
 * Generate the BasePage.ts base class with Smart Locator integration.
 */
export function generateBasePageFile(): string {
  return `// BasePage.ts — Base class for all Page Objects with Smart Locator support
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
      throw new Error(\`[SmartLocator] Failed to find element for click: \${JSON.stringify(criteria)} (all 4 tiers exhausted)\`);
    }
  }

  /**
   * Smart fill — resolves element via 4-tier flow, then fills.
   */
  async smartFill(criteria: SearchCriteria, value: string, stepDescription?: string): Promise<void> {
    const result = await smartFill(this.page, criteria, value, { stepDescription });
    if (!result.locator) {
      throw new Error(\`[SmartLocator] Failed to find element for fill: \${JSON.stringify(criteria)} (all 4 tiers exhausted)\`);
    }
  }

  /**
   * Smart assert visible — resolves element via 4-tier flow, then asserts visible.
   */
  async smartAssertVisible(criteria: SearchCriteria, stepDescription?: string): Promise<void> {
    const result = await smartAssertVisible(this.page, criteria, { stepDescription });
    if (!result.locator) {
      throw new Error(\`[SmartLocator] Failed to find element for visibility check: \${JSON.stringify(criteria)} (all 4 tiers exhausted)\`);
    }
  }

  /**
   * Smart assert text — resolves element via 4-tier flow, then asserts text content.
   */
  async smartAssertText(criteria: SearchCriteria, text: string, stepDescription?: string): Promise<void> {
    const result = await smartAssertText(this.page, criteria, text, { stepDescription });
    if (!result.locator) {
      throw new Error(\`[SmartLocator] Failed to find element for text assertion: \${JSON.stringify(criteria)} (all 4 tiers exhausted)\`);
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
    await this.page.screenshot({ path: \`allure-results/\${name}.png\`, fullPage: true });
  }
}
`;
}

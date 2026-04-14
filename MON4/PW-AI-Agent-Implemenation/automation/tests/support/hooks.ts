// hooks.ts — Auto-generated Cucumber hooks for Playwright + Smart Locator
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
  console.log(`[Hooks] Running tests with ${browserType} (headless: ${headless})`);
  console.log(`[Hooks] Smart Locator: 4-tier resolution enabled (Snapshot → Pattern → LLM → Heal)`);
  console.log(`[Hooks] AI Provider: ${process.env.AI_PROVIDER || 'openai'} | Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
  console.log(`[Hooks] Video recording → ${videosDir}`);
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
    console.log(`[Hooks] Initial screenshot captured for: ${scenario.pickle.name}`);
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
    console.log(`[Hooks] Resolution stats — Pattern: ${s.pattern} | LLM: ${s.llm} | Healed: ${s.healed} | Failed: ${s.failed}`);
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
        console.log(`[Hooks] Video attached: ${path.basename(videoPath)}`);
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

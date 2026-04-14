// world.ts — Cucumber World with Playwright + Smart Locator context
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

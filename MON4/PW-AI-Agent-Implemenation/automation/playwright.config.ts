/**
 * Playwright Configuration
 *
 * This config is used by the runner service (backend) to know
 * what browser settings to use. Cucumber.js + Playwright are wired
 * together via hooks.ts, not via @playwright/test runner.
 */

import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  /* Timeouts */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  /* Browser defaults */
  use: {
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    baseURL: process.env.BASE_URL || 'https://ecommerce-playground.lambdatest.io/index.php?route=common/home',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],

  /* Retry & Parallelism */
  retries: 2,
  workers: parseInt(process.env.PARALLEL_WORKERS || '2', 10),

  /* Output */
  outputDir: './test-results',
  reporter: [['list'], ['allure-playwright']],
});

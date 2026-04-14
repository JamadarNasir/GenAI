/**
 * Browser Config Service — builds browser launch options from
 * environment variables and per-request overrides.
 */

import envConfig from '../../config/env.config';

export type BrowserName = 'chromium' | 'firefox' | 'webkit';

export interface BrowserConfig {
  browser: BrowserName;
  headless: boolean;
  workers: number;
  tags?: string;
  baseUrl: string;
  timeout: number;
}

/**
 * Build a browser config from request + environment defaults.
 */
export function buildBrowserConfig(overrides?: Partial<BrowserConfig>): BrowserConfig {
  return {
    browser: (overrides?.browser || envConfig.defaultBrowser) as BrowserName,
    headless: overrides?.headless ?? envConfig.headless,
    workers: overrides?.workers ?? envConfig.parallelWorkers,
    tags: overrides?.tags,
    baseUrl: overrides?.baseUrl || envConfig.baseUrl,
    timeout: overrides?.timeout ?? 60_000,
  };
}

/**
 * Build environment variables to pass to the Cucumber child process.
 * Includes browser config + AI provider config for smart locator resolution.
 */
export function buildEnvVars(config: BrowserConfig): Record<string, string> {
  return {
    ...process.env as Record<string, string>,
    // Browser config
    BROWSER: config.browser,
    HEADLESS: config.headless ? 'true' : 'false',
    PARALLEL_WORKERS: String(config.workers),
    BASE_URL: config.baseUrl,
    TIMEOUT: String(config.timeout),
    // AI provider config (for smart locator LLM fallback + healing)
    AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || '',
    AZURE_OPENAI_KEY: process.env.AZURE_OPENAI_KEY || '',
    AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
    LOCAL_LLM_URL: process.env.LOCAL_LLM_URL || 'http://localhost:11434',
    LOCAL_LLM_MODEL: process.env.LOCAL_LLM_MODEL || 'llama3',
  };
}

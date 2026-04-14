// llm-fallback-resolver.ts — LLM-based element resolution when pattern matching fails
// Tier 3: Sends accessibility snapshot to GPT-4o / Claude / Groq to find the right element.
import { Page, Locator } from '@playwright/test';
import { captureSnapshotAsText } from './accessibility-snapshot';
import https from 'https';
import http from 'http';

/**
 * LLM resolution result.
 */
export interface LLMResolution {
  found: boolean;
  locator: Locator | null;
  locatorCode: string;
  strategy: string;
  confidence: number;
  reasoning: string;
  searchLog: string[];
}

/**
 * Resolve an element by sending the accessibility snapshot to an LLM.
 */
export async function resolveByLLM(
  page: Page,
  stepDescription: string,
  targetElement: string,
  action: string
): Promise<LLMResolution> {
  const log: string[] = [];
  log.push(`[LLM] Starting LLM fallback resolution for: "${targetElement}" (action: ${action})`);

  try {
    // Capture accessibility snapshot as text
    const snapshotText = await captureSnapshotAsText(page);
    log.push(`[LLM] Captured accessibility snapshot (${snapshotText.length} chars)`);

    // Build prompt
    const prompt = buildResolutionPrompt(stepDescription, targetElement, action, snapshotText);

    // Call LLM
    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const provider = process.env.AI_PROVIDER || 'openai';

    if (!apiKey && provider !== 'local') {
      log.push('[LLM] No API key configured — skipping LLM resolution');
      return { found: false, locator: null, locatorCode: '', strategy: 'llm', confidence: 0, reasoning: 'No API key', searchLog: log };
    }

    log.push(`[LLM] Calling ${provider} (${model})...`);
    const llmResponse = await callLLM(prompt, apiKey, model, provider);
    log.push(`[LLM] Got response (${llmResponse.length} chars)`);

    // Parse response
    const parsed = parseLLMResponse(llmResponse);
    log.push(`[LLM] Parsed locator: ${parsed.locatorCode} (confidence: ${parsed.confidence})`);

    if (!parsed.locatorCode) {
      log.push('[LLM] ❌ LLM could not determine a locator');
      return { found: false, locator: null, locatorCode: '', strategy: 'llm', confidence: 0, reasoning: parsed.reasoning, searchLog: log };
    }

    // Try to create and validate the locator
    const locator = await evalLocatorCode(page, parsed.locatorCode);
    if (locator) {
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(`[LLM] ✅ LLM locator validated (${count} match(es))`);
        return {
          found: true, locator, locatorCode: parsed.locatorCode,
          strategy: 'llm-' + parsed.strategy, confidence: parsed.confidence,
          reasoning: parsed.reasoning, searchLog: log,
        };
      }
      log.push('[LLM] ⚠️ LLM locator did not match any elements');
    }

    // Try alternatives
    for (const alt of parsed.alternatives) {
      const altLocator = await evalLocatorCode(page, alt);
      if (altLocator) {
        const count = await safeCount(altLocator);
        if (count > 0) {
          log.push(`[LLM] ✅ Alternative locator matched: ${alt}`);
          return {
            found: true, locator: altLocator, locatorCode: alt,
            strategy: 'llm-alternative', confidence: parsed.confidence * 0.8,
            reasoning: parsed.reasoning, searchLog: log,
          };
        }
      }
    }

    log.push('[LLM] ❌ No LLM suggestions matched any elements');
    return { found: false, locator: null, locatorCode: parsed.locatorCode, strategy: 'llm', confidence: 0, reasoning: parsed.reasoning, searchLog: log };
  } catch (err: any) {
    log.push(`[LLM] ❌ Error: ${err.message}`);
    return { found: false, locator: null, locatorCode: '', strategy: 'llm', confidence: 0, reasoning: err.message, searchLog: log };
  }
}

/**
 * Build the prompt for LLM element resolution.
 */
function buildResolutionPrompt(step: string, target: string, action: string, snapshot: string): string {
  return `You are an expert Playwright test automation engineer.

## Task
Find the correct Playwright locator for an element on the page.

## Step Description
${step}

## Target Element
Name/text: "${target}"
Action to perform: ${action}

## Page Accessibility Snapshot
\`\`\`
${snapshot.slice(0, 6000)}
\`\`\`

## Instructions
Analyze the accessibility snapshot and find the element that best matches the target.
Return a JSON object with:
- locatorCode: The Playwright locator (use page.getByRole, page.getByText, page.getByLabel, etc.)
- strategy: The locator strategy used (role, text, label, testId, css)
- confidence: Confidence score 0-1
- reasoning: Why this locator was chosen
- alternatives: Array of 2-3 alternative locators

IMPORTANT: Use 'page.' prefix (not 'this.page.') in locator code.
Prefer getByRole > getByLabel > getByPlaceholder > getByText > locator

## Response (JSON only)
`;
}

/**
 * Call the LLM API.
 */
async function callLLM(prompt: string, apiKey: string, model: string, provider: string): Promise<string> {
  const isLocal = provider === 'local';
  const baseUrl = isLocal
    ? (process.env.LOCAL_LLM_URL || 'http://localhost:11434')
    : (provider === 'azure'
      ? process.env.AZURE_OPENAI_ENDPOINT || ''
      : 'https://api.openai.com');

  const endpoint = isLocal
    ? '/api/chat'
    : provider === 'azure'
      ? `/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT || model}/chat/completions?api-version=2024-02-01`
      : '/v1/chat/completions';

  const body = JSON.stringify({
    model: isLocal ? (process.env.LOCAL_LLM_MODEL || 'llama3') : model,
    messages: [
      { role: 'system', content: 'You are a Playwright test automation expert. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (provider === 'azure') {
      headers['api-key'] = process.env.AZURE_OPENAI_KEY || apiKey;
    } else if (!isLocal) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const req = transport.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Surface API-level errors (e.g. invalid key, quota exceeded)
          if (json.error) {
            console.error(`[LLM] API error (HTTP ${res.statusCode}): ${json.error.message || JSON.stringify(json.error)}`);
            resolve('');
            return;
          }
          if (isLocal) {
            resolve(json.message?.content || json.response || '');
          } else {
            resolve(json.choices?.[0]?.message?.content || '');
          }
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('LLM request timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * Parse LLM response JSON.
 */
function parseLLMResponse(content: string): {
  locatorCode: string;
  strategy: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
} {
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        locatorCode: (parsed.locatorCode || '').replace(/^this\./, ''),
        strategy: parsed.strategy || 'unknown',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
        alternatives: (parsed.alternatives || []).map((a: string) => a.replace(/^this\./, '')),
      };
    } catch { /* fall through */ }
  }

  const locatorMatch = content.match(/page\.\w+\([^)]+\)/);
  return {
    locatorCode: locatorMatch ? locatorMatch[0] : '',
    strategy: 'unknown',
    confidence: 0.3,
    reasoning: content.slice(0, 200),
    alternatives: [],
  };
}

/**
 * Evaluate a locator code string into a Playwright Locator.
 */
async function evalLocatorCode(page: Page, code: string): Promise<Locator | null> {
  try {
    // Replace 'page.' with the actual page object
    const cleanCode = code.replace(/^this\.page\./, 'page.').replace(/^page\./, '');

    // Handle different locator methods
    const match = cleanCode.match(/^(\w+)\((.*)\)$/s);
    if (!match) return null;

    const [, method, argsStr] = match;

    // Parse arguments safely
    switch (method) {
      case 'getByRole': {
        const roleMatch = argsStr.match(/['"]([^'"]+)['"](?:\s*,\s*\{\s*name:\s*['"]([^'"]+)['"])?/);
        if (roleMatch) {
          const role = roleMatch[1] as any;
          const name = roleMatch[2];
          return name ? page.getByRole(role, { name }) : page.getByRole(role);
        }
        break;
      }
      case 'getByText': {
        const textMatch = argsStr.match(/['"]([^'"]+)['"]/);
        if (textMatch) return page.getByText(textMatch[1]);
        break;
      }
      case 'getByLabel': {
        const labelMatch = argsStr.match(/['"]([^'"]+)['"]/);
        if (labelMatch) return page.getByLabel(labelMatch[1]);
        break;
      }
      case 'getByPlaceholder': {
        const phMatch = argsStr.match(/['"]([^'"]+)['"]/);
        if (phMatch) return page.getByPlaceholder(phMatch[1]);
        break;
      }
      case 'getByTestId': {
        const tidMatch = argsStr.match(/['"]([^'"]+)['"]/);
        if (tidMatch) return page.getByTestId(tidMatch[1]);
        break;
      }
      case 'locator': {
        const locMatch = argsStr.match(/['"]([^'"]+)['"]/);
        if (locMatch) return page.locator(locMatch[1]);
        break;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function safeCount(locator: Locator): Promise<number> {
  try { return await locator.count(); } catch { return 0; }
}

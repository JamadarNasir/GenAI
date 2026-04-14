// smart-locator.ts — 4-tier smart element resolution orchestrator
// Flow: Snapshot → Pattern → LLM Fallback → Healing
import { Page, Locator, expect } from '@playwright/test';
import { captureAccessibilitySnapshot, captureSnapshotAsText, AccessibilitySnapshot } from './accessibility-snapshot';
import { resolveByPattern, SearchCriteria, PatternResolution } from './pattern-resolver';
import { resolveByLLM, LLMResolution } from './llm-fallback-resolver';

/**
 * Resolution tier that succeeded.
 */
export type ResolutionTier = 'snapshot-pattern' | 'llm-fallback' | 'healed' | 'static-fallback' | 'failed';

/**
 * Full resolution result with diagnostics.
 */
export interface SmartResolution {
  tier: ResolutionTier;
  locator: Locator | null;
  locatorCode: string;
  confidence: number;
  attempts: {
    pattern?: PatternResolution;
    llm?: LLMResolution;
  };
  logs: string[];
  duration: number;
}

/**
 * Smart locator options.
 */
export interface SmartLocatorOptions {
  /** Skip LLM fallback (for speed) */
  skipLLM?: boolean;
  /** Timeout for resolution */
  timeout?: number;
  /** Existing snapshot to reuse */
  snapshot?: AccessibilitySnapshot;
  /** Step description for LLM context */
  stepDescription?: string;
}

/**
 * ┌──────────────────────────┐
 * │ 1. Playwright MCP        │ ← Takes accessibility snapshot of current page
 * │    Snapshot               │
 * └──────────┬───────────────┘
 *            ▼
 * ┌──────────────────────────┐
 * │ 2. Pattern-Based         │ ← Searches snapshot by role, name, label
 * │    Resolution            │   (Fast, no API calls)
 * └──────────┬───────────────┘
 *            │ Failed?
 *            ▼
 * ┌──────────────────────────┐
 * │ 3. LLM Fallback          │ ← Sends DOM snapshot to GPT-4o / Claude / Groq
 * │    Resolution            │   to find the right element
 * └──────────┬───────────────┘
 *            │ Failed on retry?
 *            ▼
 * ┌──────────────────────────┐
 * │ 4. Healing               │ ← LLM analyzes DOM changes and suggests
 * │    (Auto-repair)         │   a new locator strategy
 * └──────────────────────────┘
 */
export async function smartLocate(
  page: Page,
  criteria: SearchCriteria,
  action: string,
  options: SmartLocatorOptions = {}
): Promise<SmartResolution> {
  const startTime = Date.now();
  const logs: string[] = [];
  const attempts: SmartResolution['attempts'] = {};

  logs.push(`[SmartLocator] ═══════════════════════════════════════`);
  logs.push(`[SmartLocator] Resolving: ${JSON.stringify(criteria)} for action: ${action}`);

  // ────────────── TIER 1 & 2: Snapshot + Pattern-Based ──────────────
  logs.push(`[SmartLocator] ── Tier 1+2: Accessibility Snapshot + Pattern Match ──`);
  try {
    const snapshot = options.snapshot || await captureAccessibilitySnapshot(page);
    logs.push(`[SmartLocator] Snapshot captured: ${snapshot.flatNodes.length} nodes`);

    const patternResult = await resolveByPattern(page, criteria, snapshot);
    attempts.pattern = patternResult;
    logs.push(...patternResult.searchLog);

    if (patternResult.found && patternResult.locator) {
      logs.push(`[SmartLocator] ✅ TIER 2 SUCCESS — ${patternResult.strategy} (confidence: ${patternResult.confidence})`);
      printLogs(logs);
      return {
        tier: 'snapshot-pattern',
        locator: patternResult.locator,
        locatorCode: patternResult.locatorCode,
        confidence: patternResult.confidence,
        attempts,
        logs,
        duration: Date.now() - startTime,
      };
    }
  } catch (err: any) {
    logs.push(`[SmartLocator] ⚠️ Snapshot/Pattern error: ${err.message}`);
  }

  // ────────────── TIER 3: LLM Fallback ──────────────
  if (!options.skipLLM) {
    logs.push(`[SmartLocator] ── Tier 3: LLM Fallback Resolution ──`);
    try {
      const targetDesc = criteria.name || criteria.text || criteria.label || 'unknown';
      const stepDesc = options.stepDescription || `${action} on "${targetDesc}"`;
      const llmResult = await resolveByLLM(page, stepDesc, targetDesc, action);
      attempts.llm = llmResult;
      logs.push(...llmResult.searchLog);

      if (llmResult.found && llmResult.locator) {
        logs.push(`[SmartLocator] ✅ TIER 3 SUCCESS — ${llmResult.strategy} (confidence: ${llmResult.confidence})`);
        printLogs(logs);
        return {
          tier: 'llm-fallback',
          locator: llmResult.locator,
          locatorCode: llmResult.locatorCode,
          confidence: llmResult.confidence,
          attempts,
          logs,
          duration: Date.now() - startTime,
        };
      }
    } catch (err: any) {
      logs.push(`[SmartLocator] ⚠️ LLM Fallback error: ${err.message}`);
    }

    // ────────────── TIER 4: Healing (retry with DOM analysis) ──────────────
    logs.push(`[SmartLocator] ── Tier 4: Healing / Auto-repair ──`);
    try {
      // Get full page HTML for healing context
      const html = await page.content();
      const snapshotText = await captureSnapshotAsText(page);
      const targetDesc = criteria.name || criteria.text || criteria.label || 'unknown';
      const stepDesc = options.stepDescription || `${action} on "${targetDesc}"`;

      const healPrompt = buildHealPrompt(stepDesc, targetDesc, action, snapshotText, html.slice(0, 4000));
      const healResult = await resolveByLLM(page, healPrompt, targetDesc, action);
      logs.push(...healResult.searchLog.map(l => l.replace('[LLM]', '[Heal]')));

      if (healResult.found && healResult.locator) {
        logs.push(`[SmartLocator] ✅ TIER 4 SUCCESS (Healed) — ${healResult.strategy}`);
        printLogs(logs);
        return {
          tier: 'healed',
          locator: healResult.locator,
          locatorCode: healResult.locatorCode,
          confidence: healResult.confidence * 0.9,
          attempts: { ...attempts, llm: healResult },
          logs,
          duration: Date.now() - startTime,
        };
      }
    } catch (err: any) {
      logs.push(`[SmartLocator] ⚠️ Healing error: ${err.message}`);
    }
  }

  // ────────────── FALLBACK: Static locator (last resort) ──────────────
  logs.push(`[SmartLocator] ── Static Fallback ──`);
  const fallback = buildStaticFallback(page, criteria);
  if (fallback) {
    logs.push(`[SmartLocator] ⚠️ Using static fallback: ${fallback.code}`);
    printLogs(logs);
    return {
      tier: 'static-fallback',
      locator: fallback.locator,
      locatorCode: fallback.code,
      confidence: 0.3,
      attempts,
      logs,
      duration: Date.now() - startTime,
    };
  }

  logs.push(`[SmartLocator] ❌ ALL TIERS FAILED — no element found`);
  printLogs(logs);
  return {
    tier: 'failed',
    locator: null,
    locatorCode: '',
    confidence: 0,
    attempts,
    logs,
    duration: Date.now() - startTime,
  };
}

/**
 * Helper: Smart click — resolves element then clicks.
 */
export async function smartClick(page: Page, criteria: SearchCriteria, options?: SmartLocatorOptions): Promise<SmartResolution> {
  const result = await smartLocate(page, criteria, 'click', options);
  if (result.locator) {
    await result.locator.click();
  }
  return result;
}

/**
 * Helper: Smart fill — resolves element then fills.
 */
export async function smartFill(page: Page, criteria: SearchCriteria, value: string, options?: SmartLocatorOptions): Promise<SmartResolution> {
  const result = await smartLocate(page, criteria, 'fill', options);
  if (result.locator) {
    await result.locator.fill(value);
  }
  return result;
}

/**
 * Helper: Smart assert visible.
 */
export async function smartAssertVisible(page: Page, criteria: SearchCriteria, options?: SmartLocatorOptions): Promise<SmartResolution> {
  const result = await smartLocate(page, criteria, 'assertVisible', options);
  if (result.locator) {
    await expect(result.locator).toBeVisible();
  }
  return result;
}

/**
 * Helper: Smart assert text.
 */
export async function smartAssertText(page: Page, criteria: SearchCriteria, text: string, options?: SmartLocatorOptions): Promise<SmartResolution> {
  const result = await smartLocate(page, criteria, 'assertText', options);
  if (result.locator) {
    await expect(result.locator).toContainText(text);
  }
  return result;
}

// ── Internal helpers ──

function buildHealPrompt(step: string, target: string, action: string, snapshot: string, html: string): string {
  return `HEALING MODE: The element could not be found by any standard method.

Step: ${step}
Target: "${target}" 
Action: ${action}

Analyze BOTH the accessibility tree AND the raw HTML to find the element.
The element may have changed its role, name, or structure.

Accessibility Tree:
\`\`\`
${snapshot.slice(0, 3000)}
\`\`\`

Raw HTML (excerpt):
\`\`\`html
${html.slice(0, 3000)}
\`\`\`

Find the element and return a JSON locator. Try CSS selectors if semantic locators fail.`;
}

function buildStaticFallback(page: Page, criteria: SearchCriteria): { locator: Locator; code: string } | null {
  if (criteria.text || criteria.name) {
    const text = criteria.text || criteria.name!;
    return { locator: page.getByText(text), code: `page.getByText('${text}')` };
  }
  if (criteria.role) {
    return { locator: page.getByRole(criteria.role as any), code: `page.getByRole('${criteria.role}')` };
  }
  return null;
}

function printLogs(logs: string[]): void {
  for (const line of logs) {
    console.log(line);
  }
}

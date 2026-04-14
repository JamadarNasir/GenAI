/**
 * Heal Orchestrator Service — coordinates the full self-healing workflow
 * using the 4-tier Smart Locator resolution:
 *
 *   Tier 1: Playwright Accessibility Snapshot
 *   Tier 2: Pattern-Based Resolution (role, name, label — no API)
 *   Tier 3: LLM Fallback (sends snapshot to GPT-4o / Claude / Groq)
 *   Tier 4: Healing / Auto-repair (LLM analyses DOM changes)
 *
 * Legacy workflow (for API-based healing without live browser):
 *   1. Analyze the failure type
 *   2. Build DOM snapshot
 *   3. Ask LLM for healed locator
 *   4. Patch step definitions / page objects
 *   5. Return heal result
 */

import { HealRequest, HealResponse } from '../../types/execution.types';
import { analyzeFailure, FailureAnalysis } from './failure-analyzer.service';
import { buildSnapshot, DOMSnapshot } from './dom-snapshot.service';
import { healLocator, HealSuggestion } from './locator-healer.service';
import { patchStepDefinition, patchPageObject } from './retry-runner.service';

export interface HealResult {
  success: boolean;
  healResponse: HealResponse;
  analysis: FailureAnalysis;
  suggestion?: HealSuggestion;
  tier?: string;
}

/**
 * Run the full self-healing workflow.
 *
 * This is the API-based healing path (called when the runner detects failure
 * via the /api/heal endpoint). The in-browser smart locator handles
 * Tiers 1-4 at runtime; this handles post-execution healing.
 */
export async function healFailedStep(request: HealRequest): Promise<HealResult> {
  console.log(`[Heal] ═══════════════════════════════════════`);
  console.log(`[Heal] Starting heal for step: "${request.stepText}"`);
  console.log(`[Heal] Failed locator: ${request.oldLocator}`);
  console.log(`[Heal] Error: ${request.error}`);

  // Step 1: Analyze the failure
  const analysis = analyzeFailure(request.error);
  console.log(`[Heal] Failure type: ${analysis.type} (confidence: ${analysis.confidence})`);

  if (!analysis.isHealable) {
    console.log(`[Heal] Failure is not healable (${analysis.type}). Skipping LLM call.`);
    return {
      success: false,
      healResponse: {
        success: false,
        healedLocator: '',
        strategy: '',
        retryResult: 'fail',
        message: `Failure type "${analysis.type}" is not healable. ${analysis.suggestion}`,
      },
      analysis,
      tier: 'none',
    };
  }

  // Step 2: Build DOM snapshot
  const snapshot: DOMSnapshot = buildSnapshot(
    request.dom,
    '',
    '',
    request.oldLocator
  );

  // Step 3: Ask LLM for healed locator (Tier 3+4 equivalent)
  console.log(`[Heal] ── Tier 3+4: LLM Healing ──`);
  console.log(`[Heal] Asking LLM for healed locator...`);
  const suggestion = await healLocator(
    request.oldLocator,
    request.stepText,
    request.error,
    snapshot,
    analysis
  );

  console.log(`[Heal] LLM suggestion: ${suggestion.locatorCode} (${suggestion.strategy}, confidence: ${suggestion.confidence})`);

  if (!suggestion.locatorCode) {
    return {
      success: false,
      healResponse: {
        success: false,
        healedLocator: '',
        strategy: suggestion.strategy,
        retryResult: 'fail',
        message: 'LLM could not suggest a healed locator.',
      },
      analysis,
      suggestion,
      tier: 'llm-failed',
    };
  }

  // Step 4: Patch step definitions and page objects
  console.log(`[Heal] Patching step definitions with healed locator...`);
  const stepPatch = patchStepDefinition(
    request.stepText,
    request.oldLocator,
    suggestion.locatorCode
  );

  const pagePatch = patchPageObject(
    request.oldLocator,
    suggestion.locatorCode
  );

  const patched = stepPatch.success || pagePatch.success;
  const patchMessage = [
    stepPatch.success ? `Step def: ${stepPatch.message}` : null,
    pagePatch.success ? `Page object: ${pagePatch.message}` : null,
  ].filter(Boolean).join('; ') || 'No files were patched (locator not found in files).';

  console.log(`[Heal] Patch result: ${patchMessage}`);

  // Step 5: Return result
  return {
    success: true,
    healResponse: {
      success: true,
      healedLocator: suggestion.locatorCode,
      strategy: suggestion.strategy,
      retryResult: patched ? 'pass' : 'fail',
      message: `${suggestion.reasoning}. ${patchMessage}`,
    },
    analysis,
    suggestion,
    tier: 'healed',
  };
}

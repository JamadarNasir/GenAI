/**
 * Failure Analyzer Service — classifies the type of failure
 * to determine the best healing strategy.
 */

export type FailureType = 'locator' | 'timing' | 'assertion' | 'navigation' | 'unknown';

export interface FailureAnalysis {
  type: FailureType;
  confidence: number;      // 0-1
  suggestion: string;      // Human-readable fix suggestion
  isHealable: boolean;     // Can the AI healer attempt a fix?
}

/**
 * Analyse an error message and stack trace to classify the failure.
 */
export function analyzeFailure(errorMessage: string, stackTrace?: string): FailureAnalysis {
  const lower = errorMessage.toLowerCase();

  // ── Locator failures (healable) ──
  if (isLocatorFailure(lower)) {
    return {
      type: 'locator',
      confidence: 0.9,
      suggestion: 'Element locator is broken or stale. AI healer can suggest an updated locator.',
      isHealable: true,
    };
  }

  // ── Timing failures (partially healable) ──
  if (isTimingFailure(lower)) {
    return {
      type: 'timing',
      confidence: 0.8,
      suggestion: 'Element was not ready in time. Consider adding explicit waits or increasing timeout.',
      isHealable: true,
    };
  }

  // ── Assertion failures (not healable by locator fix) ──
  if (isAssertionFailure(lower)) {
    return {
      type: 'assertion',
      confidence: 0.85,
      suggestion: 'Assertion failed — the expected value does not match. This may indicate a real bug or changed requirements.',
      isHealable: false,
    };
  }

  // ── Navigation failures ──
  if (isNavigationFailure(lower)) {
    return {
      type: 'navigation',
      confidence: 0.8,
      suggestion: 'Page navigation failed. Check the URL and network connectivity.',
      isHealable: false,
    };
  }

  // ── Unknown ──
  return {
    type: 'unknown',
    confidence: 0.3,
    suggestion: 'Unable to classify this failure. Manual investigation required.',
    isHealable: false,
  };
}

// ──────────────── Classification helpers ────────────────

function isLocatorFailure(msg: string): boolean {
  const patterns = [
    'could not find',
    'no element',
    'element not found',
    'locator resolved to',
    'strict mode violation',
    'getbyrole',
    'getbytext',
    'getbytestid',
    'getbylabel',
    'getbyplaceholder',
    'locator(',
    'selector',
    'timed out waiting for locator',
    'target closed',
    'detached from dom',
    'stale element',
  ];
  return patterns.some((p) => msg.includes(p));
}

function isTimingFailure(msg: string): boolean {
  const patterns = [
    'timeout',
    'timed out',
    'waiting for',
    'waitfor',
    'navigation timeout',
    'exceeded',
    'deadline',
  ];
  return patterns.some((p) => msg.includes(p));
}

function isAssertionFailure(msg: string): boolean {
  const patterns = [
    'expect(',
    'assertion',
    'expected',
    'to be visible',
    'to have text',
    'to have url',
    'to have title',
    'to contain',
    'tobetruthy',
    'tobefalsy',
    'toequal',
    'not to be',
  ];
  return patterns.some((p) => msg.includes(p));
}

function isNavigationFailure(msg: string): boolean {
  const patterns = [
    'net::err',
    'econnrefused',
    'enotfound',
    'page.goto',
    'navigation failed',
    'dns resolution',
    'ssl',
    'certificate',
  ];
  return patterns.some((p) => msg.includes(p));
}

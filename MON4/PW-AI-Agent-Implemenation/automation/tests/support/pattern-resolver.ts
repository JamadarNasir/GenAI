// pattern-resolver.ts — Fast pattern-based element resolution using accessibility snapshot
// Tier 2: Searches snapshot by role, name, label — NO API calls, instant resolution.
import { Page, Locator } from '@playwright/test';
import { AXNode, captureAccessibilitySnapshot, AccessibilitySnapshot } from './accessibility-snapshot';

/**
 * Resolution result from pattern matching.
 */
export interface PatternResolution {
  found: boolean;
  locator: Locator | null;
  locatorCode: string;
  strategy: string;
  confidence: number;
  matchedNode?: AXNode;
  searchLog: string[];
}

/**
 * Search criteria for finding an element.
 */
export interface SearchCriteria {
  role?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  text?: string;
  testId?: string;
}

/**
 * Resolve an element from the accessibility snapshot using pattern matching.
 *
 * Search priority:
 *   1. Exact match by role + name
 *   2. Partial match by role + name (contains)
 *   3. Match by name only (across all roles)
 *   4. Match by label / placeholder / text
 */
export async function resolveByPattern(
  page: Page,
  criteria: SearchCriteria,
  snapshot?: AccessibilitySnapshot
): Promise<PatternResolution> {
  const log: string[] = [];
  log.push(`[Pattern] Searching for: ${JSON.stringify(criteria)}`);

  // Capture snapshot if not provided
  const snap = snapshot || await captureAccessibilitySnapshot(page);
  if (!snap.tree) {
    log.push('[Pattern] Empty accessibility tree — cannot resolve');
    return { found: false, locator: null, locatorCode: '', strategy: 'none', confidence: 0, searchLog: log };
  }

  const nodes = snap.flatNodes;
  log.push(`[Pattern] Snapshot has ${nodes.length} nodes`);

  // ── Strategy 1: testId (highest priority) ──
  if (criteria.testId) {
    log.push(`[Pattern] Trying testId: "${criteria.testId}"`);
    const locator = page.getByTestId(criteria.testId);
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(`[Pattern] ✅ Found by testId (${count} match(es))`);
      return {
        found: true, locator, locatorCode: `page.getByTestId('${criteria.testId}')`,
        strategy: 'testId', confidence: 0.95, searchLog: log,
      };
    }
  }

  // ── Strategy 2: role + name (exact) ──
  if (criteria.role && criteria.name) {
    log.push(`[Pattern] Trying role="${criteria.role}" + name="${criteria.name}" (exact)`);
    const matched = nodes.find(n =>
      n.role.toLowerCase() === criteria.role!.toLowerCase() &&
      n.name?.toLowerCase() === criteria.name!.toLowerCase()
    );
    if (matched) {
      const locator = page.getByRole(criteria.role as any, { name: criteria.name, exact: true });
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(`[Pattern] ✅ Exact match by role + name (${count} match(es))`);
        return {
          found: true, locator,
          locatorCode: `page.getByRole('${criteria.role}', { name: '${criteria.name}', exact: true })`,
          strategy: 'role+name', confidence: 0.90, matchedNode: matched, searchLog: log,
        };
      }
    }
  }

  // ── Strategy 3: role + name (partial / contains) ──
  if (criteria.role && criteria.name) {
    log.push(`[Pattern] Trying role="${criteria.role}" + name contains "${criteria.name}"`);
    const matched = nodes.find(n =>
      n.role.toLowerCase() === criteria.role!.toLowerCase() &&
      n.name?.toLowerCase().includes(criteria.name!.toLowerCase())
    );
    if (matched) {
      const locator = page.getByRole(criteria.role as any, { name: criteria.name });
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(`[Pattern] ✅ Partial match by role + name (${count} match(es))`);
        return {
          found: true, locator,
          locatorCode: `page.getByRole('${criteria.role}', { name: '${criteria.name}' })`,
          strategy: 'role+name-partial', confidence: 0.80, matchedNode: matched, searchLog: log,
        };
      }
    }
  }

  // ── Strategy 4: label ──
  if (criteria.label || criteria.name) {
    const labelText = criteria.label || criteria.name!;
    log.push(`[Pattern] Trying label: "${labelText}"`);
    const locator = page.getByLabel(labelText);
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(`[Pattern] ✅ Found by label (${count} match(es))`);
      return {
        found: true, locator,
        locatorCode: `page.getByLabel('${labelText}')`,
        strategy: 'label', confidence: 0.75, searchLog: log,
      };
    }
  }

  // ── Strategy 5: placeholder ──
  if (criteria.placeholder || criteria.name) {
    const phText = criteria.placeholder || criteria.name!;
    log.push(`[Pattern] Trying placeholder: "${phText}"`);
    const locator = page.getByPlaceholder(phText);
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(`[Pattern] ✅ Found by placeholder (${count} match(es))`);
      return {
        found: true, locator,
        locatorCode: `page.getByPlaceholder('${phText}')`,
        strategy: 'placeholder', confidence: 0.70, searchLog: log,
      };
    }
  }

  // ── Strategy 6: text ──
  if (criteria.text || criteria.name) {
    const textVal = criteria.text || criteria.name!;
    log.push(`[Pattern] Trying text: "${textVal}"`);
    const locator = page.getByText(textVal, { exact: false });
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(`[Pattern] ✅ Found by text (${count} match(es))`);
      return {
        found: true, locator,
        locatorCode: `page.getByText('${textVal}')`,
        strategy: 'text', confidence: 0.60, searchLog: log,
      };
    }
  }

  // ── Strategy 7: name across any role ──
  if (criteria.name) {
    log.push(`[Pattern] Trying name "${criteria.name}" across all roles`);
    const matched = nodes.find(n =>
      n.name?.toLowerCase().includes(criteria.name!.toLowerCase())
    );
    if (matched) {
      const locator = page.getByRole(matched.role as any, { name: criteria.name });
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(`[Pattern] ✅ Found by inferred role "${matched.role}" + name (${count} match(es))`);
        return {
          found: true, locator,
          locatorCode: `page.getByRole('${matched.role}', { name: '${criteria.name}' })`,
          strategy: 'inferred-role', confidence: 0.65, matchedNode: matched, searchLog: log,
        };
      }
    }
  }

  log.push('[Pattern] ❌ No match found in accessibility snapshot');
  return { found: false, locator: null, locatorCode: '', strategy: 'none', confidence: 0, searchLog: log };
}

/**
 * Find all nodes in the snapshot matching criteria (for debugging/logging).
 */
export function findNodesInSnapshot(nodes: AXNode[], criteria: SearchCriteria): AXNode[] {
  return nodes.filter(n => {
    if (criteria.role && n.role.toLowerCase() !== criteria.role.toLowerCase()) return false;
    if (criteria.name && !n.name?.toLowerCase().includes(criteria.name.toLowerCase())) return false;
    return true;
  });
}

/**
 * Safe count — returns 0 if the locator throws.
 */
async function safeCount(locator: Locator): Promise<number> {
  try {
    return await locator.count();
  } catch {
    return 0;
  }
}

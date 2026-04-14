/**
 * Smart Locator Template — generates the runtime smart-locator resolution
 * files that get written into automation/tests/support/.
 *
 * Implements the 4-tier resolution flow:
 *   1. Playwright Accessibility Snapshot
 *   2. Pattern-Based Resolution (role, name, label — no API calls)
 *   3. LLM Fallback Resolution (sends snapshot to GPT-4o / Claude / Groq)
 *   4. Healing / Auto-repair (LLM analyses DOM changes, suggests new locator)
 */

// ─────────────────────────────────────────────────────────────
// 1. accessibility-snapshot.ts
// ─────────────────────────────────────────────────────────────
export function generateAccessibilitySnapshotFile(): string {
  return `// accessibility-snapshot.ts — Captures accessibility tree snapshots via DOM evaluation
// Works with ALL Playwright versions and ALL browsers (Chromium, Firefox, WebKit).
import { Page } from '@playwright/test';

/**
 * A single node from the accessibility tree.
 */
export interface AXNode {
  role: string;
  name: string;
  value?: string;
  description?: string;
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  required?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  pressed?: boolean | 'mixed';
  level?: number;
  children?: AXNode[];
}

/**
 * Full snapshot result with metadata.
 */
export interface AccessibilitySnapshot {
  tree: AXNode | null;
  url: string;
  title: string;
  timestamp: string;
  flatNodes: AXNode[];
}

/**
 * Implicit ARIA role map for common HTML elements.
 */
const IMPLICIT_ROLES: Record<string, string> = {
  A: 'link',
  BUTTON: 'button',
  H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading',
  INPUT: 'textbox',
  SELECT: 'combobox',
  TEXTAREA: 'textbox',
  IMG: 'img',
  NAV: 'navigation',
  MAIN: 'main',
  HEADER: 'banner',
  FOOTER: 'contentinfo',
  ASIDE: 'complementary',
  FORM: 'form',
  TABLE: 'table',
  THEAD: 'rowgroup',
  TBODY: 'rowgroup',
  TR: 'row',
  TH: 'columnheader',
  TD: 'cell',
  UL: 'list',
  OL: 'list',
  LI: 'listitem',
  DIALOG: 'dialog',
  DETAILS: 'group',
  SUMMARY: 'button',
  SECTION: 'region',
  ARTICLE: 'article',
  PROGRESS: 'progressbar',
  METER: 'meter',
};

/**
 * Capture the full accessibility tree by walking the DOM.
 * This replaces the deprecated page.accessibility.snapshot() API.
 */
export async function captureAccessibilitySnapshot(page: Page): Promise<AccessibilitySnapshot> {
  const [tree, url, title] = await Promise.all([
    page.evaluate(() => {
      function getImplicitRole(el: Element): string {
        const tag = el.tagName;
        const roleMap: Record<string, string> = {
          A: 'link', BUTTON: 'button',
          H1: 'heading', H2: 'heading', H3: 'heading',
          H4: 'heading', H5: 'heading', H6: 'heading',
          INPUT: 'textbox', SELECT: 'combobox', TEXTAREA: 'textbox',
          IMG: 'img', NAV: 'navigation', MAIN: 'main',
          HEADER: 'banner', FOOTER: 'contentinfo', ASIDE: 'complementary',
          FORM: 'form', TABLE: 'table', TR: 'row', TH: 'columnheader',
          TD: 'cell', UL: 'list', OL: 'list', LI: 'listitem',
          DIALOG: 'dialog', SECTION: 'region', ARTICLE: 'article',
          PROGRESS: 'progressbar', SUMMARY: 'button',
        };
        // Special input types
        if (tag === 'INPUT') {
          const type = (el as HTMLInputElement).type?.toLowerCase();
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'submit' || type === 'button' || type === 'reset') return 'button';
          if (type === 'range') return 'slider';
          if (type === 'search') return 'searchbox';
          return 'textbox';
        }
        return roleMap[tag] || '';
      }

      function getAccessibleName(el: Element): string {
        // 1. aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel.trim();

        // 2. aria-labelledby
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
          const parts = labelledBy.split(/\\s+/).map(id => {
            const ref = document.getElementById(id);
            return ref ? ref.textContent?.trim() : '';
          }).filter(Boolean);
          if (parts.length) return parts.join(' ');
        }

        // 3. Label element (for inputs)
        if (el.id) {
          const label = document.querySelector(\`label[for="\${el.id}"]\`);
          if (label) return label.textContent?.trim() || '';
        }

        // 4. title or alt attribute
        const title = el.getAttribute('title');
        if (title) return title.trim();
        const alt = el.getAttribute('alt');
        if (alt) return alt.trim();

        // 5. placeholder
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) return placeholder.trim();

        // 6. Direct text content (for buttons, links, headings)
        const tag = el.tagName;
        if (['BUTTON', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SUMMARY', 'LABEL', 'LI', 'OPTION', 'TH', 'TD'].includes(tag)) {
          const text = el.textContent?.trim() || '';
          return text.length > 100 ? text.slice(0, 100) : text;
        }

        return '';
      }

      function isHidden(el: Element): boolean {
        if (el.getAttribute('aria-hidden') === 'true') return true;
        if ((el as HTMLElement).hidden) return true;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
        return false;
      }

      function buildNode(el: Element, depth: number): any | null {
        if (depth > 15) return null; // prevent infinite recursion
        if (isHidden(el)) return null;

        const role = el.getAttribute('role') || getImplicitRole(el);
        const name = getAccessibleName(el);

        // Build children
        const children: any[] = [];
        for (const child of Array.from(el.children)) {
          const childNode = buildNode(child, depth + 1);
          if (childNode) children.push(childNode);
        }

        // Skip nodes with no role, no name, and no interesting children
        if (!role && !name && children.length === 0) return null;

        // If this node has no role/name but has children, just return children flattened
        if (!role && !name && children.length > 0) {
          // Return a generic group
          return { role: 'group', name: '', children };
        }

        const node: any = { role: role || 'generic', name };

        // Value
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          const val = (el as HTMLInputElement).value;
          if (val) node.value = val;
        }

        // States
        if ((el as HTMLInputElement).disabled) node.disabled = true;
        if ((el as HTMLInputElement).required) node.required = true;
        if (el.getAttribute('aria-expanded') !== null) {
          node.expanded = el.getAttribute('aria-expanded') === 'true';
        }
        if (el.getAttribute('aria-selected') === 'true') node.selected = true;
        if (el.getAttribute('aria-checked') !== null) {
          const v = el.getAttribute('aria-checked');
          node.checked = v === 'mixed' ? 'mixed' : v === 'true';
        } else if ((el as HTMLInputElement).checked !== undefined && role === 'checkbox' || role === 'radio') {
          node.checked = (el as HTMLInputElement).checked;
        }
        if (el.getAttribute('aria-pressed') !== null) {
          const v = el.getAttribute('aria-pressed');
          node.pressed = v === 'mixed' ? 'mixed' : v === 'true';
        }
        if (['H1','H2','H3','H4','H5','H6'].includes(el.tagName)) {
          node.level = parseInt(el.tagName[1]);
        }

        if (children.length > 0) node.children = children;
        return node;
      }

      return buildNode(document.body, 0);
    }) as Promise<AXNode | null>,
    Promise.resolve(page.url()),
    page.title(),
  ]);

  const flatNodes = tree ? flattenTree(tree) : [];

  return {
    tree,
    url,
    title,
    timestamp: new Date().toISOString(),
    flatNodes,
  };
}

/**
 * Capture a snapshot and return it as a formatted text string
 * (similar to Playwright MCP's textual snapshot output).
 */
export async function captureSnapshotAsText(page: Page): Promise<string> {
  const snapshot = await captureAccessibilitySnapshot(page);
  if (!snapshot.tree) return '[Empty accessibility tree]';
  return formatTreeAsText(snapshot.tree, 0);
}

/**
 * Flatten the accessibility tree into a flat array of nodes.
 */
export function flattenTree(node: AXNode): AXNode[] {
  const result: AXNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenTree(child));
    }
  }
  return result;
}

/**
 * Format the tree as indented text (similar to MCP snapshot output).
 */
function formatTreeAsText(node: AXNode, indent: number): string {
  const prefix = '  '.repeat(indent);
  const parts: string[] = [];

  let line = \`\${prefix}- \${node.role}\`;
  if (node.name) line += \` "\${node.name}"\`;
  if (node.value) line += \` [value="\${node.value}"]\`;
  if (node.checked !== undefined) line += \` [checked=\${node.checked}]\`;
  if (node.selected) line += \` [selected]\`;
  if (node.disabled) line += \` [disabled]\`;
  if (node.expanded !== undefined) line += \` [expanded=\${node.expanded}]\`;
  if (node.required) line += \` [required]\`;
  if (node.level) line += \` [level=\${node.level}]\`;
  parts.push(line);

  if (node.children) {
    for (const child of node.children) {
      parts.push(formatTreeAsText(child, indent + 1));
    }
  }
  return parts.join('\\n');
}
`;
}

// ─────────────────────────────────────────────────────────────
// 2. pattern-resolver.ts
// ─────────────────────────────────────────────────────────────
export function generatePatternResolverFile(): string {
  return `// pattern-resolver.ts — Fast pattern-based element resolution using accessibility snapshot
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
  log.push(\`[Pattern] Searching for: \${JSON.stringify(criteria)}\`);

  // Capture snapshot if not provided
  const snap = snapshot || await captureAccessibilitySnapshot(page);
  if (!snap.tree) {
    log.push('[Pattern] Empty accessibility tree — cannot resolve');
    return { found: false, locator: null, locatorCode: '', strategy: 'none', confidence: 0, searchLog: log };
  }

  const nodes = snap.flatNodes;
  log.push(\`[Pattern] Snapshot has \${nodes.length} nodes\`);

  // ── Strategy 1: testId (highest priority) ──
  if (criteria.testId) {
    log.push(\`[Pattern] Trying testId: "\${criteria.testId}"\`);
    const locator = page.getByTestId(criteria.testId);
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(\`[Pattern] ✅ Found by testId (\${count} match(es))\`);
      return {
        found: true, locator, locatorCode: \`page.getByTestId('\${criteria.testId}')\`,
        strategy: 'testId', confidence: 0.95, searchLog: log,
      };
    }
  }

  // ── Strategy 2: role + name (exact) ──
  if (criteria.role && criteria.name) {
    log.push(\`[Pattern] Trying role="\${criteria.role}" + name="\${criteria.name}" (exact)\`);
    const matched = nodes.find(n =>
      n.role.toLowerCase() === criteria.role!.toLowerCase() &&
      n.name?.toLowerCase() === criteria.name!.toLowerCase()
    );
    if (matched) {
      const locator = page.getByRole(criteria.role as any, { name: criteria.name, exact: true });
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(\`[Pattern] ✅ Exact match by role + name (\${count} match(es))\`);
        return {
          found: true, locator,
          locatorCode: \`page.getByRole('\${criteria.role}', { name: '\${criteria.name}', exact: true })\`,
          strategy: 'role+name', confidence: 0.90, matchedNode: matched, searchLog: log,
        };
      }
    }
  }

  // ── Strategy 3: role + name (partial / contains) ──
  if (criteria.role && criteria.name) {
    log.push(\`[Pattern] Trying role="\${criteria.role}" + name contains "\${criteria.name}"\`);
    const matched = nodes.find(n =>
      n.role.toLowerCase() === criteria.role!.toLowerCase() &&
      n.name?.toLowerCase().includes(criteria.name!.toLowerCase())
    );
    if (matched) {
      const locator = page.getByRole(criteria.role as any, { name: criteria.name });
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(\`[Pattern] ✅ Partial match by role + name (\${count} match(es))\`);
        return {
          found: true, locator,
          locatorCode: \`page.getByRole('\${criteria.role}', { name: '\${criteria.name}' })\`,
          strategy: 'role+name-partial', confidence: 0.80, matchedNode: matched, searchLog: log,
        };
      }
    }
  }

  // ── Strategy 4: label ──
  if (criteria.label || criteria.name) {
    const labelText = criteria.label || criteria.name!;
    log.push(\`[Pattern] Trying label: "\${labelText}"\`);
    const locator = page.getByLabel(labelText);
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(\`[Pattern] ✅ Found by label (\${count} match(es))\`);
      return {
        found: true, locator,
        locatorCode: \`page.getByLabel('\${labelText}')\`,
        strategy: 'label', confidence: 0.75, searchLog: log,
      };
    }
  }

  // ── Strategy 5: placeholder ──
  if (criteria.placeholder || criteria.name) {
    const phText = criteria.placeholder || criteria.name!;
    log.push(\`[Pattern] Trying placeholder: "\${phText}"\`);
    const locator = page.getByPlaceholder(phText);
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(\`[Pattern] ✅ Found by placeholder (\${count} match(es))\`);
      return {
        found: true, locator,
        locatorCode: \`page.getByPlaceholder('\${phText}')\`,
        strategy: 'placeholder', confidence: 0.70, searchLog: log,
      };
    }
  }

  // ── Strategy 6: text ──
  if (criteria.text || criteria.name) {
    const textVal = criteria.text || criteria.name!;
    log.push(\`[Pattern] Trying text: "\${textVal}"\`);
    const locator = page.getByText(textVal, { exact: false });
    const count = await safeCount(locator);
    if (count > 0) {
      log.push(\`[Pattern] ✅ Found by text (\${count} match(es))\`);
      return {
        found: true, locator,
        locatorCode: \`page.getByText('\${textVal}')\`,
        strategy: 'text', confidence: 0.60, searchLog: log,
      };
    }
  }

  // ── Strategy 7: name across any role ──
  if (criteria.name) {
    log.push(\`[Pattern] Trying name "\${criteria.name}" across all roles\`);
    const matched = nodes.find(n =>
      n.name?.toLowerCase().includes(criteria.name!.toLowerCase())
    );
    if (matched) {
      const locator = page.getByRole(matched.role as any, { name: criteria.name });
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(\`[Pattern] ✅ Found by inferred role "\${matched.role}" + name (\${count} match(es))\`);
        return {
          found: true, locator,
          locatorCode: \`page.getByRole('\${matched.role}', { name: '\${criteria.name}' })\`,
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
`;
}

// ─────────────────────────────────────────────────────────────
// 3. llm-fallback-resolver.ts
// ─────────────────────────────────────────────────────────────
export function generateLLMFallbackResolverFile(): string {
  return `// llm-fallback-resolver.ts — LLM-based element resolution when pattern matching fails
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
  log.push(\`[LLM] Starting LLM fallback resolution for: "\${targetElement}" (action: \${action})\`);

  try {
    // Capture accessibility snapshot as text
    const snapshotText = await captureSnapshotAsText(page);
    log.push(\`[LLM] Captured accessibility snapshot (\${snapshotText.length} chars)\`);

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

    log.push(\`[LLM] Calling \${provider} (\${model})...\`);
    const llmResponse = await callLLM(prompt, apiKey, model, provider);
    log.push(\`[LLM] Got response (\${llmResponse.length} chars)\`);

    // Parse response
    const parsed = parseLLMResponse(llmResponse);
    log.push(\`[LLM] Parsed locator: \${parsed.locatorCode} (confidence: \${parsed.confidence})\`);

    if (!parsed.locatorCode) {
      log.push('[LLM] ❌ LLM could not determine a locator');
      return { found: false, locator: null, locatorCode: '', strategy: 'llm', confidence: 0, reasoning: parsed.reasoning, searchLog: log };
    }

    // Try to create and validate the locator
    const locator = await evalLocatorCode(page, parsed.locatorCode);
    if (locator) {
      const count = await safeCount(locator);
      if (count > 0) {
        log.push(\`[LLM] ✅ LLM locator validated (\${count} match(es))\`);
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
          log.push(\`[LLM] ✅ Alternative locator matched: \${alt}\`);
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
    log.push(\`[LLM] ❌ Error: \${err.message}\`);
    return { found: false, locator: null, locatorCode: '', strategy: 'llm', confidence: 0, reasoning: err.message, searchLog: log };
  }
}

/**
 * Build the prompt for LLM element resolution.
 */
function buildResolutionPrompt(step: string, target: string, action: string, snapshot: string): string {
  return \`You are an expert Playwright test automation engineer.

## Task
Find the correct Playwright locator for an element on the page.

## Step Description
\${step}

## Target Element
Name/text: "\${target}"
Action to perform: \${action}

## Page Accessibility Snapshot
\\\`\\\`\\\`
\${snapshot.slice(0, 6000)}
\\\`\\\`\\\`

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
\`;
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
      ? \`/openai/deployments/\${process.env.AZURE_OPENAI_DEPLOYMENT || model}/chat/completions?api-version=2024-02-01\`
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
      headers['Authorization'] = \`Bearer \${apiKey}\`;
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
            console.error(\`[LLM] API error (HTTP \${res.statusCode}): \${json.error.message || JSON.stringify(json.error)}\`);
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
  const jsonMatch = content.match(/\\{[\\s\\S]*?\\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        locatorCode: (parsed.locatorCode || '').replace(/^this\\./, ''),
        strategy: parsed.strategy || 'unknown',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
        alternatives: (parsed.alternatives || []).map((a: string) => a.replace(/^this\\./, '')),
      };
    } catch { /* fall through */ }
  }

  const locatorMatch = content.match(/page\\.\\w+\\([^)]+\\)/);
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
    const cleanCode = code.replace(/^this\\.page\\./, 'page.').replace(/^page\\./, '');

    // Handle different locator methods
    const match = cleanCode.match(/^(\\w+)\\((.*)\\)$/s);
    if (!match) return null;

    const [, method, argsStr] = match;

    // Parse arguments safely
    switch (method) {
      case 'getByRole': {
        const roleMatch = argsStr.match(/['"]([^'"]+)['"](?:\\s*,\\s*\\{\\s*name:\\s*['"]([^'"]+)['"])?/);
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
`;
}

// ─────────────────────────────────────────────────────────────
// 4. smart-locator.ts  (Orchestrator)
// ─────────────────────────────────────────────────────────────
export function generateSmartLocatorFile(): string {
  return `// smart-locator.ts — 4-tier smart element resolution orchestrator
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

  logs.push(\`[SmartLocator] ═══════════════════════════════════════\`);
  logs.push(\`[SmartLocator] Resolving: \${JSON.stringify(criteria)} for action: \${action}\`);

  // ────────────── TIER 1 & 2: Snapshot + Pattern-Based ──────────────
  logs.push(\`[SmartLocator] ── Tier 1+2: Accessibility Snapshot + Pattern Match ──\`);
  try {
    const snapshot = options.snapshot || await captureAccessibilitySnapshot(page);
    logs.push(\`[SmartLocator] Snapshot captured: \${snapshot.flatNodes.length} nodes\`);

    const patternResult = await resolveByPattern(page, criteria, snapshot);
    attempts.pattern = patternResult;
    logs.push(...patternResult.searchLog);

    if (patternResult.found && patternResult.locator) {
      logs.push(\`[SmartLocator] ✅ TIER 2 SUCCESS — \${patternResult.strategy} (confidence: \${patternResult.confidence})\`);
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
    logs.push(\`[SmartLocator] ⚠️ Snapshot/Pattern error: \${err.message}\`);
  }

  // ────────────── TIER 3: LLM Fallback ──────────────
  if (!options.skipLLM) {
    logs.push(\`[SmartLocator] ── Tier 3: LLM Fallback Resolution ──\`);
    try {
      const targetDesc = criteria.name || criteria.text || criteria.label || 'unknown';
      const stepDesc = options.stepDescription || \`\${action} on "\${targetDesc}"\`;
      const llmResult = await resolveByLLM(page, stepDesc, targetDesc, action);
      attempts.llm = llmResult;
      logs.push(...llmResult.searchLog);

      if (llmResult.found && llmResult.locator) {
        logs.push(\`[SmartLocator] ✅ TIER 3 SUCCESS — \${llmResult.strategy} (confidence: \${llmResult.confidence})\`);
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
      logs.push(\`[SmartLocator] ⚠️ LLM Fallback error: \${err.message}\`);
    }

    // ────────────── TIER 4: Healing (retry with DOM analysis) ──────────────
    logs.push(\`[SmartLocator] ── Tier 4: Healing / Auto-repair ──\`);
    try {
      // Get full page HTML for healing context
      const html = await page.content();
      const snapshotText = await captureSnapshotAsText(page);
      const targetDesc = criteria.name || criteria.text || criteria.label || 'unknown';
      const stepDesc = options.stepDescription || \`\${action} on "\${targetDesc}"\`;

      const healPrompt = buildHealPrompt(stepDesc, targetDesc, action, snapshotText, html.slice(0, 4000));
      const healResult = await resolveByLLM(page, healPrompt, targetDesc, action);
      logs.push(...healResult.searchLog.map(l => l.replace('[LLM]', '[Heal]')));

      if (healResult.found && healResult.locator) {
        logs.push(\`[SmartLocator] ✅ TIER 4 SUCCESS (Healed) — \${healResult.strategy}\`);
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
      logs.push(\`[SmartLocator] ⚠️ Healing error: \${err.message}\`);
    }
  }

  // ────────────── FALLBACK: Static locator (last resort) ──────────────
  logs.push(\`[SmartLocator] ── Static Fallback ──\`);
  const fallback = buildStaticFallback(page, criteria);
  if (fallback) {
    logs.push(\`[SmartLocator] ⚠️ Using static fallback: \${fallback.code}\`);
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

  logs.push(\`[SmartLocator] ❌ ALL TIERS FAILED — no element found\`);
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
  return \`HEALING MODE: The element could not be found by any standard method.

Step: \${step}
Target: "\${target}" 
Action: \${action}

Analyze BOTH the accessibility tree AND the raw HTML to find the element.
The element may have changed its role, name, or structure.

Accessibility Tree:
\\\`\\\`\\\`
\${snapshot.slice(0, 3000)}
\\\`\\\`\\\`

Raw HTML (excerpt):
\\\`\\\`\\\`html
\${html.slice(0, 3000)}
\\\`\\\`\\\`

Find the element and return a JSON locator. Try CSS selectors if semantic locators fail.\`;
}

function buildStaticFallback(page: Page, criteria: SearchCriteria): { locator: Locator; code: string } | null {
  if (criteria.text || criteria.name) {
    const text = criteria.text || criteria.name!;
    return { locator: page.getByText(text), code: \`page.getByText('\${text}')\` };
  }
  if (criteria.role) {
    return { locator: page.getByRole(criteria.role as any), code: \`page.getByRole('\${criteria.role}')\` };
  }
  return null;
}

function printLogs(logs: string[]): void {
  for (const line of logs) {
    console.log(line);
  }
}
`;
}

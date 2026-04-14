// accessibility-snapshot.ts — Captures accessibility tree snapshots via DOM evaluation
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
          const parts = labelledBy.split(/\s+/).map(id => {
            const ref = document.getElementById(id);
            return ref ? ref.textContent?.trim() : '';
          }).filter(Boolean);
          if (parts.length) return parts.join(' ');
        }

        // 3. Label element (for inputs)
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
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

  let line = `${prefix}- ${node.role}`;
  if (node.name) line += ` "${node.name}"`;
  if (node.value) line += ` [value="${node.value}"]`;
  if (node.checked !== undefined) line += ` [checked=${node.checked}]`;
  if (node.selected) line += ` [selected]`;
  if (node.disabled) line += ` [disabled]`;
  if (node.expanded !== undefined) line += ` [expanded=${node.expanded}]`;
  if (node.required) line += ` [required]`;
  if (node.level) line += ` [level=${node.level}]`;
  parts.push(line);

  if (node.children) {
    for (const child of node.children) {
      parts.push(formatTreeAsText(child, indent + 1));
    }
  }
  return parts.join('\n');
}

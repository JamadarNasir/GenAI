/**
 * DOM Snapshot Service — captures DOM context at the point of failure
 * to provide context for the LLM healer.
 */

/**
 * Represents a DOM snapshot captured at failure point.
 */
export interface DOMSnapshot {
  /** Full HTML of the page (or relevant section) */
  html: string;
  /** Simplified DOM tree for the area around the failed element */
  relevantHtml: string;
  /** Page URL at failure */
  url: string;
  /** Page title */
  title: string;
  /** Viewport size */
  viewport: { width: number; height: number };
}

/**
 * Extract a simplified DOM representation from full HTML.
 *
 * Strips scripts, styles, SVGs, and comments to reduce token count
 * for the LLM prompt.
 */
export function simplifyDom(fullHtml: string): string {
  let simplified = fullHtml;

  // Remove script tags and their content
  simplified = simplified.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  simplified = simplified.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove SVG tags and their content
  simplified = simplified.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG]');

  // Remove HTML comments
  simplified = simplified.replace(/<!--[\s\S]*?-->/g, '');

  // Remove data-* attributes that aren't data-testid
  simplified = simplified.replace(/\s+data-(?!testid)[a-z-]+="[^"]*"/gi, '');

  // Collapse whitespace
  simplified = simplified.replace(/\s+/g, ' ').trim();

  // Truncate if too long (LLM context limit)
  const MAX_LENGTH = 8000;
  if (simplified.length > MAX_LENGTH) {
    simplified = simplified.slice(0, MAX_LENGTH) + '\n... [truncated]';
  }

  return simplified;
}

/**
 * Extract the DOM area around a specific locator.
 *
 * Searches the HTML for elements matching common patterns related
 * to the failed locator and returns surrounding context.
 */
export function extractRelevantArea(fullHtml: string, locatorHint: string): string {
  const simplified = simplifyDom(fullHtml);

  // Try to find the area around the locator hint
  const hint = locatorHint.toLowerCase();
  const lowerHtml = simplified.toLowerCase();
  const idx = lowerHtml.indexOf(hint);

  if (idx === -1) {
    // Return the body content if hint not found
    const bodyMatch = simplified.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1].slice(0, 4000) : simplified.slice(0, 4000);
  }

  // Extract ±2000 chars around the found position
  const start = Math.max(0, idx - 2000);
  const end = Math.min(simplified.length, idx + 2000);
  return simplified.slice(start, end);
}

/**
 * Build a DOMSnapshot from provided data (sent from the automation hooks).
 */
export function buildSnapshot(
  html: string,
  url: string,
  title: string,
  failedLocator: string
): DOMSnapshot {
  return {
    html: html,
    relevantHtml: extractRelevantArea(html, failedLocator),
    url,
    title,
    viewport: { width: 1280, height: 720 },
  };
}

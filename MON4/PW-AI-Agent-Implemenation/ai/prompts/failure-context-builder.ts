import path from 'path';
import fs from 'fs';

/**
 * Build the context string for a failure healing LLM prompt.
 *
 * Combines the DOM snapshot, error stacktrace, old locator info,
 * and optional screenshot (base64) into a single prompt string
 * for the heal LLM to analyze.
 */
export function buildFailureContext(params: {
  stepText: string;
  oldLocator: string;
  error: string;
  dom: string;
  screenshot?: string;          // Base64-encoded
  pageUrl?: string;
}): string {
  const sections: string[] = [];

  // ─── Step Information ──────────────────────────────
  sections.push(`## Failed Step\n\n${params.stepText}`);

  // ─── Page URL ──────────────────────────────────────
  if (params.pageUrl) {
    sections.push(`## Page URL\n\n${params.pageUrl}`);
  }

  // ─── Old Locator ───────────────────────────────────
  sections.push(
    `## Old Locator (Failed)\n\n\`\`\`typescript\n${params.oldLocator}\n\`\`\``
  );

  // ─── Error ─────────────────────────────────────────
  sections.push(
    `## Error Message\n\n\`\`\`\n${params.error}\n\`\`\``
  );

  // ─── DOM Snapshot ──────────────────────────────────
  // Truncate DOM to avoid exceeding token limits
  const maxDomLength = 15000;
  let dom = params.dom;
  if (dom.length > maxDomLength) {
    dom = dom.substring(0, maxDomLength) + '\n\n... [DOM truncated] ...';
  }
  sections.push(
    `## DOM Snapshot\n\n\`\`\`html\n${dom}\n\`\`\``
  );

  // ─── Screenshot Reference ─────────────────────────
  if (params.screenshot) {
    sections.push(
      `## Screenshot\n\nA screenshot of the page at the point of failure has been captured (base64 encoded, ${params.screenshot.length} chars).`
    );
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Load a prompt template from the prompts directory.
 */
export function loadPromptTemplate(filename: string): string {
  const promptPath = path.resolve(__dirname, filename);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt template not found: ${promptPath}`);
  }

  return fs.readFileSync(promptPath, 'utf-8').trim();
}

/**
 * Page Object Writer Service — writes Page Object .ts files
 * to the automation/tests/pages/ directory.
 */

import path from 'path';
import fs from 'fs';
import { ParsedFeature } from './step-parser.service';
import { GeneratedFile } from '../../types/action.types';
import { generatePageObjectFile } from '../../templates/page-object.template';
import { generateBasePageFile } from '../../templates/hooks.template';
import envConfig from '../../config/env.config';

/**
 * Write page object files for all parsed features.
 * Also writes BasePage.ts if it doesn't exist.
 */
export function writePageObjects(parsedFeatures: ParsedFeature[]): GeneratedFile[] {
  const outputDir = path.join(envConfig.automationDir, 'tests', 'pages');
  ensureDir(outputDir);

  const files: GeneratedFile[] = [];

  // Write BasePage.ts (always overwrite with latest)
  const basePagePath = path.join(outputDir, 'BasePage.ts');
  const basePageContent = generateBasePageFile();
  fs.writeFileSync(basePagePath, basePageContent, 'utf-8');
  console.log(`[CodeGen] Wrote BasePage.ts`);
  files.push({
    filePath: path.relative(envConfig.automationDir, basePagePath),
    fileName: 'BasePage.ts',
    content: basePageContent,
    type: 'page-object',
  });

  // Write a page object per feature (module)
  for (const parsed of parsedFeatures) {
    const className = toPascalCase(parsed.featureName);
    const fileName = `${className}Page.ts`;
    const filePath = path.join(outputDir, fileName);
    const content = generatePageObjectFile(parsed.featureName, parsed.scenarios);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[CodeGen] Wrote page object: ${fileName}`);

    files.push({
      filePath: path.relative(envConfig.automationDir, filePath),
      fileName,
      content,
      type: 'page-object',
    });
  }

  return files;
}

// ── Utility ──

function toPascalCase(name: string): string {
  return name
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Feature Writer Service — writes .feature Gherkin files
 * to the automation/tests/features/ directory.
 */

import path from 'path';
import fs from 'fs';
import { FeatureFile } from '../../types/bdd.types';
import { GeneratedFile } from '../../types/action.types';
import envConfig from '../../config/env.config';

/**
 * Write Gherkin .feature files to disk.
 */
export function writeFeatureFiles(features: FeatureFile[]): GeneratedFile[] {
  const outputDir = path.join(envConfig.automationDir, 'tests', 'features');
  ensureDir(outputDir);

  const files: GeneratedFile[] = [];

  for (const feature of features) {
    const fileName = feature.fileName.endsWith('.feature')
      ? feature.fileName
      : `${toSlug(feature.featureName)}.feature`;

    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, feature.content, 'utf-8');
    console.log(`[CodeGen] Wrote feature file: ${fileName}`);

    files.push({
      filePath: path.relative(envConfig.automationDir, filePath),
      fileName,
      content: feature.content,
      type: 'feature',
    });
  }

  return files;
}

// ── Utility ──

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

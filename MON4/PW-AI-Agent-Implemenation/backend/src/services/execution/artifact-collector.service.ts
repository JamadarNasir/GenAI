/**
 * Artifact Collector Service — collects screenshots, videos, and traces
 * produced during test runs from allure-results/ and test-results/.
 */

import path from 'path';
import fs from 'fs';
import envConfig from '../../config/env.config';

export interface Artifact {
  type: 'screenshot' | 'video' | 'trace' | 'log' | 'report';
  filePath: string;
  fileName: string;
  size: number;
}

/**
 * Collect all artifacts from the automation directory after a run.
 */
export function collectArtifacts(): Artifact[] {
  const artifacts: Artifact[] = [];
  const automationDir = envConfig.automationDir;

  // Collect from allure-results/
  const allureDir = path.join(automationDir, 'allure-results');
  if (fs.existsSync(allureDir)) {
    collectFromDir(allureDir, artifacts);
  }

  // Collect from test-results/
  const testResultsDir = path.join(automationDir, 'test-results');
  if (fs.existsSync(testResultsDir)) {
    collectFromDir(testResultsDir, artifacts);
  }

  return artifacts;
}

/**
 * Recursively collect artifacts from a directory.
 */
function collectFromDir(dir: string, artifacts: Artifact[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFromDir(fullPath, artifacts);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const type = classifyArtifact(ext);
    if (type) {
      const stat = fs.statSync(fullPath);
      artifacts.push({
        type,
        filePath: fullPath,
        fileName: entry.name,
        size: stat.size,
      });
    }
  }
}

/**
 * Classify a file extension as an artifact type.
 */
function classifyArtifact(ext: string): Artifact['type'] | null {
  switch (ext) {
    case '.png':
    case '.jpg':
    case '.jpeg':
      return 'screenshot';
    case '.webm':
    case '.mp4':
      return 'video';
    case '.zip':
      return 'trace';
    case '.json':
    case '.txt':
    case '.log':
      return 'log';
    default:
      return null;
  }
}

/**
 * Clean up artifacts from previous runs.
 */
export function cleanArtifacts(): void {
  const automationDir = envConfig.automationDir;

  const dirsToClean = [
    path.join(automationDir, 'allure-results'),
    path.join(automationDir, 'test-results'),
  ];

  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Artifacts] Cleaned ${dir}`);
    }
  }
}

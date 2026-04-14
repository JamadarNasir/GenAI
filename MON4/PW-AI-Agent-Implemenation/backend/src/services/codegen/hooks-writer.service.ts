/**
 * Hooks Writer Service — writes hooks.ts, world.ts, and smart locator support files
 * to the automation/tests/support/ directory.
 *
 * Smart Locator files implement the 4-tier resolution flow:
 *   1. accessibility-snapshot.ts — Playwright MCP accessibility tree capture
 *   2. pattern-resolver.ts       — Fast pattern-based resolution (no API)
 *   3. llm-fallback-resolver.ts  — LLM-powered element resolution
 *   4. smart-locator.ts          — Orchestrator (Snapshot → Pattern → LLM → Heal)
 */

import path from 'path';
import fs from 'fs';
import { GeneratedFile } from '../../types/action.types';
import { generateHooksFile, generateWorldFile } from '../../templates/hooks.template';
import {
  generateAccessibilitySnapshotFile,
  generatePatternResolverFile,
  generateLLMFallbackResolverFile,
  generateSmartLocatorFile,
} from '../../templates/smart-locator.template';
import envConfig from '../../config/env.config';

/**
 * Write all support files (hooks.ts, world.ts, smart locator suite).
 */
export function writeSupportFiles(): GeneratedFile[] {
  const outputDir = path.join(envConfig.automationDir, 'tests', 'support');
  ensureDir(outputDir);

  const files: GeneratedFile[] = [];

  // hooks.ts
  const hooksPath = path.join(outputDir, 'hooks.ts');
  const hooksContent = generateHooksFile();
  fs.writeFileSync(hooksPath, hooksContent, 'utf-8');
  console.log(`[CodeGen] Wrote hooks.ts`);
  files.push({
    filePath: path.relative(envConfig.automationDir, hooksPath),
    fileName: 'hooks.ts',
    content: hooksContent,
    type: 'hook',
  });

  // world.ts
  const worldPath = path.join(outputDir, 'world.ts');
  const worldContent = generateWorldFile();
  fs.writeFileSync(worldPath, worldContent, 'utf-8');
  console.log(`[CodeGen] Wrote world.ts`);
  files.push({
    filePath: path.relative(envConfig.automationDir, worldPath),
    fileName: 'world.ts',
    content: worldContent,
    type: 'support',
  });

  // ── Smart Locator Suite (4-tier resolution) ──

  // accessibility-snapshot.ts
  const snapshotPath = path.join(outputDir, 'accessibility-snapshot.ts');
  const snapshotContent = generateAccessibilitySnapshotFile();
  fs.writeFileSync(snapshotPath, snapshotContent, 'utf-8');
  console.log(`[CodeGen] Wrote accessibility-snapshot.ts (Tier 1: MCP Snapshot)`);
  files.push({
    filePath: path.relative(envConfig.automationDir, snapshotPath),
    fileName: 'accessibility-snapshot.ts',
    content: snapshotContent,
    type: 'support',
  });

  // pattern-resolver.ts
  const patternPath = path.join(outputDir, 'pattern-resolver.ts');
  const patternContent = generatePatternResolverFile();
  fs.writeFileSync(patternPath, patternContent, 'utf-8');
  console.log(`[CodeGen] Wrote pattern-resolver.ts (Tier 2: Pattern-Based Resolution)`);
  files.push({
    filePath: path.relative(envConfig.automationDir, patternPath),
    fileName: 'pattern-resolver.ts',
    content: patternContent,
    type: 'support',
  });

  // llm-fallback-resolver.ts
  const llmPath = path.join(outputDir, 'llm-fallback-resolver.ts');
  const llmContent = generateLLMFallbackResolverFile();
  fs.writeFileSync(llmPath, llmContent, 'utf-8');
  console.log(`[CodeGen] Wrote llm-fallback-resolver.ts (Tier 3: LLM Fallback)`);
  files.push({
    filePath: path.relative(envConfig.automationDir, llmPath),
    fileName: 'llm-fallback-resolver.ts',
    content: llmContent,
    type: 'support',
  });

  // smart-locator.ts
  const smartPath = path.join(outputDir, 'smart-locator.ts');
  const smartContent = generateSmartLocatorFile();
  fs.writeFileSync(smartPath, smartContent, 'utf-8');
  console.log(`[CodeGen] Wrote smart-locator.ts (Tier 4: Orchestrator + Healing)`);
  files.push({
    filePath: path.relative(envConfig.automationDir, smartPath),
    fileName: 'smart-locator.ts',
    content: smartContent,
    type: 'support',
  });

  console.log(`[CodeGen] ✅ Smart Locator Suite written — 4-tier resolution enabled`);

  return files;
}

// ── Utility ──

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

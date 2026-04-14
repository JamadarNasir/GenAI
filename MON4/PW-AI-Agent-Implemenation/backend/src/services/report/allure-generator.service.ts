/**
 * Allure Generator Service — runs `allure generate` CLI command
 * to produce the HTML report from allure-results/.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import envConfig from '../../config/env.config';
import { convertCucumberEmbeddingsToAllure } from './cucumber-to-allure.service';

export interface AllureGenerateResult {
  success: boolean;
  reportPath: string;
  message: string;
}

/**
 * Generate the Allure HTML report from allure-results/.
 */
export async function generateAllureReport(): Promise<AllureGenerateResult> {
  const automationDir = envConfig.automationDir;
  const resultsDir = path.join(automationDir, 'allure-results');
  const reportDir = path.join(automationDir, 'allure-report');

  // Check if results exist
  if (!fs.existsSync(resultsDir)) {
    return {
      success: false,
      reportPath: '',
      message: 'No allure-results/ directory found. Run tests first.',
    };
  }

  const resultFiles = fs.readdirSync(resultsDir);
  if (resultFiles.length === 0) {
    return {
      success: false,
      reportPath: '',
      message: 'allure-results/ is empty. Run tests first.',
    };
  }

  console.log(`[Allure] Generating report from ${resultFiles.length} result file(s)...`);

  // ── Step 1: Convert Cucumber JSON embeddings → Allure-native attachments ──
  // The Cucumber JSON format stores screenshots/videos as inline base64.
  // Allure 3.x needs separate *-result.json + *-attachment.{ext} files.
  try {
    const attachmentCount = convertCucumberEmbeddingsToAllure();
    if (attachmentCount > 0) {
      console.log(`[Allure] Extracted ${attachmentCount} attachment(s) from Cucumber JSON.`);
    }
  } catch (e) {
    console.warn('[Allure] Cucumber-to-Allure conversion warning:', e);
    // Continue — the Cucumber JSON alone may still produce a report
  }

  // Clean previous report directory so it's always fresh
  if (fs.existsSync(reportDir)) {
    fs.rmSync(reportDir, { recursive: true, force: true });
  }

  return new Promise<AllureGenerateResult>((resolve) => {
    // Allure 3.x CLI: positional arg is a relative glob/path, no --clean flag
    const proc = spawn('npx', ['allure', 'generate', './allure-results', '-o', 'allure-report'], {
      cwd: automationDir,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(`[Allure] Report generated at ${reportDir}`);
        resolve({
          success: true,
          reportPath: reportDir,
          message: `Report generated successfully with ${resultFiles.length} result(s).`,
        });
      } else {
        console.error(`[Allure] Generation failed (code ${code}): ${stderr}`);
        resolve({
          success: false,
          reportPath: '',
          message: `Allure generation failed: ${stderr || stdout || `exit code ${code}`}`,
        });
      }
    });

    proc.on('error', (err) => {
      console.error(`[Allure] Spawn error: ${err.message}`);
      resolve({
        success: false,
        reportPath: '',
        message: `Failed to run allure CLI: ${err.message}. Ensure allure-commandline is installed.`,
      });
    });
  });
}

/**
 * Check if an Allure report exists.
 */
export function reportExists(): boolean {
  const reportIndex = path.join(envConfig.automationDir, 'allure-report', 'index.html');
  return fs.existsSync(reportIndex);
}

/**
 * Get the absolute path to the report directory.
 */
export function getReportPath(): string {
  return path.join(envConfig.automationDir, 'allure-report');
}

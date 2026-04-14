/**
 * MCP Allure Service — writes Playwright MCP screenshots and accessibility
 * snapshots directly into allure-results/ as Allure 2 attachment files.
 *
 * Since MCP operations run in the Express backend (not the Cucumber process),
 * they cannot use this.attach(). Instead we write raw Allure result files that
 * get picked up by `allure generate`.
 *
 * Each call creates two files in allure-results/:
 *   <uuid>-attachment.{png|txt}  — the raw data
 *   <uuid>-result.json           — Allure result envelope referencing the attachment
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import envConfig from '../../config/env.config';

const resultsDir = path.join(envConfig.automationDir, 'allure-results');

function ensureResultsDir(): void {
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
}

function writeResultJson(
  resultUuid: string,
  name: string,
  subSuite: string,
  toolName: string,
  attachments: Array<{ name: string; source: string; type: string }>,
): void {
  const now = Date.now();
  const result = {
    uuid: resultUuid,
    name,
    status: 'passed',
    stage: 'finished',
    start: now,
    stop: now + 1,
    description: `Captured via Playwright MCP tool: \`${toolName}\``,
    attachments,
    parameters: [],
    steps: [],
    labels: [
      { name: 'suite',    value: 'Playwright MCP' },
      { name: 'subSuite', value: subSuite },
      { name: 'feature',  value: 'MCP Browser Operations' },
      { name: 'story',    value: toolName },
      { name: 'tag',      value: '@mcp' },
    ],
  };

  fs.writeFileSync(
    path.join(resultsDir, `${resultUuid}-result.json`),
    JSON.stringify(result, null, 2),
    'utf-8',
  );
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Save a base64-encoded MCP screenshot as an Allure PNG attachment.
 * Returns the attachment filename that was written.
 */
export function saveMcpScreenshot(
  base64Data: string,
  label: string = 'MCP Screenshot',
  toolName: string = 'browser_take_screenshot',
): string {
  ensureResultsDir();

  const attachUuid = uuidv4();
  const resultUuid = uuidv4();
  const imgFile    = `${attachUuid}-attachment.png`;

  // Write binary PNG
  fs.writeFileSync(
    path.join(resultsDir, imgFile),
    Buffer.from(base64Data, 'base64'),
  );

  writeResultJson(resultUuid, label, 'Screenshots', toolName, [
    { name: label, source: imgFile, type: 'image/png' },
  ]);

  console.log(`[MCP-Allure] Screenshot saved → allure-results/${imgFile}`);
  return imgFile;
}

/**
 * Save an MCP accessibility snapshot text as an Allure text attachment.
 * Returns the attachment filename that was written.
 */
export function saveMcpSnapshot(
  snapshotText: string,
  label: string = 'MCP Accessibility Snapshot',
  toolName: string = 'browser_snapshot',
): string {
  ensureResultsDir();

  const attachUuid = uuidv4();
  const resultUuid = uuidv4();
  const txtFile    = `${attachUuid}-attachment.txt`;

  // Write snapshot text
  fs.writeFileSync(path.join(resultsDir, txtFile), snapshotText, 'utf-8');

  writeResultJson(resultUuid, label, 'Snapshots', toolName, [
    { name: label, source: txtFile, type: 'text/plain' },
  ]);

  console.log(`[MCP-Allure] Snapshot saved → allure-results/${txtFile}`);
  return txtFile;
}

/**
 * Save an MCP video (webm) as an Allure video attachment.
 * Returns the attachment filename that was written.
 */
export function saveMcpVideo(
  videoBuffer: Buffer,
  label: string = 'MCP Recording',
  toolName: string = 'browser_recording',
): string {
  ensureResultsDir();

  const attachUuid = uuidv4();
  const resultUuid = uuidv4();
  const videoFile  = `${attachUuid}-attachment.webm`;

  // Write video binary
  fs.writeFileSync(path.join(resultsDir, videoFile), videoBuffer);

  writeResultJson(resultUuid, label, 'Recordings', toolName, [
    { name: label, source: videoFile, type: 'video/webm' },
  ]);

  console.log(`[MCP-Allure] Video saved → allure-results/${videoFile}`);
  return videoFile;
}

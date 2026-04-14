/**
 * Runner Service — spawns a Cucumber.js child process to run
 * the generated Playwright tests.
 *
 * Streams stdout/stderr via WebSocket and tracks run status.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { v4 as uuid } from 'uuid';
import envConfig from '../../config/env.config';
import { broadcastLog } from '../../websocket/log-stream.ws';
import { buildBrowserConfig, buildEnvVars, BrowserConfig } from './browser-config.service';
import { cleanArtifacts, collectArtifacts } from './artifact-collector.service';
import {
  ExecutionRequest,
  ExecutionRun,
  ExecutionStatus,
  LogLine,
} from '../../types/execution.types';

/** In-memory store of execution runs (no DB) */
const runs = new Map<string, ExecutionRun>();

/** Currently running process (only one at a time) */
let currentProcess: ChildProcess | null = null;

/**
 * Start a test execution run.
 */
export async function startRun(request: ExecutionRequest): Promise<ExecutionRun> {
  // Don't allow concurrent runs
  if (currentProcess) {
    throw new Error('A test run is already in progress. Wait for it to complete or stop it first.');
  }

  const runId = uuid();
  const config: BrowserConfig = buildBrowserConfig({
    browser: request.browser,
    headless: request.headless,
    workers: request.workers,
    tags: request.tags?.length ? request.tags.join(' or ') : undefined,
  });

  // Initialize run record
  const run: ExecutionRun = {
    runId,
    status: 'running',
    browser: config.browser,
    tags: request.tags || [],
    headless: config.headless,
    startedAt: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    healed: 0,
  };
  runs.set(runId, run);

  // Clean previous artifacts
  cleanArtifacts();

  // Build the cucumber-js command
  const automationDir = envConfig.automationDir;
  const cucumberBin = path.join(automationDir, 'node_modules', '.bin', 'cucumber-js');
  const args = buildCucumberArgs(config);
  const envVars = buildEnvVars(config);

  log(runId, 'info', `Starting test run ${runId}`);
  log(runId, 'info', `Browser: ${config.browser} | Headless: ${config.headless} | Workers: ${config.workers}`);
  if (config.tags) {
    log(runId, 'info', `Tags: ${config.tags}`);
  }

  return new Promise<ExecutionRun>((resolve) => {
    // Spawn the cucumber-js process
    const proc = spawn(cucumberBin, args, {
      cwd: automationDir,
      env: envVars,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    currentProcess = proc;

    // Stream stdout
    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        log(runId, 'info', line);
        parseTestOutput(run, line);
      }
    });

    // Stream stderr
    proc.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        log(runId, 'error', line);
      }
    });

    // Handle process exit
    proc.on('close', (code: number | null) => {
      currentProcess = null;
      run.completedAt = new Date().toISOString();

      if (code === 0) {
        run.status = 'passed';
        log(runId, 'info', `✅ Test run completed — all tests passed`);
      } else if (code === null) {
        run.status = 'error';
        log(runId, 'error', `Test run was killed`);
      } else {
        run.status = run.failed > 0 ? 'failed' : 'error';
        log(runId, 'warn', `Test run completed with exit code ${code}`);
      }

      // Collect artifacts
      const artifacts = collectArtifacts();
      log(runId, 'info', `Collected ${artifacts.length} artifact(s)`);

      // Summary
      log(runId, 'info', `Results: ${run.passed} passed, ${run.failed} failed, ${run.skipped} skipped`);

      runs.set(runId, run);
      resolve(run);
    });

    proc.on('error', (err) => {
      currentProcess = null;
      run.status = 'error';
      run.completedAt = new Date().toISOString();
      log(runId, 'error', `Process error: ${err.message}`);
      runs.set(runId, run);
      resolve(run);
    });
  });
}

/**
 * Stop the currently running test process.
 */
export function stopRun(): boolean {
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
    return true;
  }
  return false;
}

/**
 * Get a run by ID.
 */
export function getRun(runId: string): ExecutionRun | undefined {
  return runs.get(runId);
}

/**
 * Get all runs.
 */
export function getAllRuns(): ExecutionRun[] {
  return [...runs.values()].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Check if a run is currently in progress.
 */
export function isRunning(): boolean {
  return currentProcess !== null;
}

// ──────────────── Helpers ────────────────

/**
 * Build cucumber-js CLI arguments from the browser config.
 */
function buildCucumberArgs(config: BrowserConfig): string[] {
  const args: string[] = [
    '--config', 'cucumber.config.js',
  ];

  if (config.tags) {
    // Wrap in double-quotes so the shell (shell:true) doesn't split on spaces
    args.push('--tags', `"${config.tags}"`);
  }

  return args;
}

/**
 * Parse test output lines to update run statistics.
 */
function parseTestOutput(run: ExecutionRun, line: string): void {
  const lower = line.toLowerCase().trim();

  // Cucumber-js progress output patterns
  if (lower.includes('scenario') && lower.includes('passed')) {
    const match = line.match(/(\d+)\s+scenario/i);
    if (match) run.totalTests = parseInt(match[1], 10);
  }

  if (lower.includes('passed')) {
    const match = line.match(/(\d+)\s+passed/i);
    if (match) run.passed = parseInt(match[1], 10);
  }

  if (lower.includes('failed')) {
    const match = line.match(/(\d+)\s+failed/i);
    if (match) run.failed = parseInt(match[1], 10);
  }

  if (lower.includes('skipped')) {
    const match = line.match(/(\d+)\s+skipped/i);
    if (match) run.skipped = parseInt(match[1], 10);
  }

  if (lower.includes('pending')) {
    const match = line.match(/(\d+)\s+pending/i);
    if (match) run.skipped += parseInt(match[1], 10);
  }
}

/**
 * Create a log line and broadcast via WebSocket.
 */
function log(runId: string, level: LogLine['level'], message: string): void {
  const logLine: LogLine = {
    timestamp: new Date().toISOString(),
    level,
    message,
    runId,
  };
  console.log(`[Run:${runId.slice(0, 8)}] [${level}] ${message}`);
  broadcastLog(logLine);
}

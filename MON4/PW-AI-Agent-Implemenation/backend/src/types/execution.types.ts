/**
 * Execution request — what to run and how.
 */
export interface ExecutionRequest {
  browser: 'chromium' | 'firefox' | 'webkit';
  tags?: string[];             // e.g. ["@smoke", "@login"]
  headless: boolean;
  workers?: number;
}

/**
 * Execution status
 */
export type ExecutionStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error';

/**
 * ExecutionRun — a test execution instance.
 */
export interface ExecutionRun {
  runId: string;
  status: ExecutionStatus;
  browser: string;
  tags: string[];
  headless: boolean;
  startedAt: string;
  completedAt?: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  healed: number;
  reportUrl?: string;
}

/**
 * Execution response
 */
export interface ExecutionResponse {
  success: boolean;
  runId: string;
  status: ExecutionStatus;
  message?: string;
}

/**
 * Heal request — sent when a step fails during execution.
 */
export interface HealRequest {
  stepId: string;
  dom: string;
  screenshot?: string;        // Base64 encoded
  error: string;
  oldLocator: string;
  stepText: string;
}

/**
 * Heal response
 */
export interface HealResponse {
  success: boolean;
  healedLocator: string;
  strategy: string;
  retryResult: 'pass' | 'fail';
  message?: string;
}

/**
 * Log line — sent via WebSocket to frontend.
 */
export interface LogLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  runId?: string;
}

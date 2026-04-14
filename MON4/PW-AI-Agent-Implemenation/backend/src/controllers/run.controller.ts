import { Request, Response, NextFunction } from 'express';
import { ExecutionRequest } from '../types/execution.types';
import { startRun, stopRun, getRun, getAllRuns, isRunning } from '../services/execution/runner.service';
import { createError } from '../middleware/error-handler.middleware';

/**
 * POST /api/run
 * Execute generated Playwright tests.
 *
 * Request body: { browser?, tags?, headless?, workers? }
 * Response:     { success, runId, status }
 */
export async function runTests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (isRunning()) {
      throw createError('A test run is already in progress. Wait for completion or POST /api/run/stop.', 409);
    }

    const { browser, tags, headless, workers } = req.body as Partial<ExecutionRequest>;

    const request: ExecutionRequest = {
      browser: browser || 'chromium',
      tags: tags || [],
      headless: headless !== false, // default true
      workers,
    };

    console.log(`[Run] Starting test execution — ${request.browser}, headless: ${request.headless}`);

    // Start run (async — returns when complete)
    // We respond immediately with the runId, run continues in background
    const run = startRun(request);

    // Don't await — respond immediately
    // The client tracks progress via WebSocket
    const runId = (await Promise.race([
      run.then(r => r.runId),
      new Promise<string>(resolve => setTimeout(() => resolve('pending'), 100))
    ]));

    res.status(202).json({
      success: true,
      runId: runId || 'starting',
      status: 'running',
      message: 'Test execution started. Connect to WebSocket at ws://localhost:4000/ws/logs for live updates.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/run/stop
 * Stop the currently running test execution.
 */
export async function stopTests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stopped = stopRun();
    if (stopped) {
      res.status(200).json({ success: true, message: 'Test run stopped.' });
    } else {
      res.status(404).json({ success: false, message: 'No test run is currently in progress.' });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/run/:runId
 * Get status of a specific run.
 */
export async function getRunStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const runId = req.params.runId as string;
    const run = getRun(runId);
    if (!run) {
      throw createError(`Run ${runId} not found.`, 404);
    }
    res.status(200).json({ success: true, run });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/run
 * Get all runs (history).
 */
export async function getRunHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const runs = getAllRuns();
    res.status(200).json({ success: true, runs });
  } catch (error) {
    next(error);
  }
}

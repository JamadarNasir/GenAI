import { Router } from 'express';
import { runTests, stopTests, getRunStatus, getRunHistory } from '../controllers/run.controller';

const router = Router();

/**
 * POST /api/run
 * Execute Playwright tests with given configuration.
 */
router.post('/', runTests);

/**
 * POST /api/run/stop
 * Stop the currently running test execution.
 */
router.post('/stop', stopTests);

/**
 * GET /api/run
 * Get all execution history.
 */
router.get('/', getRunHistory);

/**
 * GET /api/run/:runId
 * Get status of a specific run.
 */
router.get('/:runId', getRunStatus);

export default router;

import { Router } from 'express';
import { getReport, generateReport } from '../controllers/report.controller';

const router = Router();

/**
 * GET /api/report
 * Get Allure report status and URL.
 */
router.get('/', getReport);

/**
 * POST /api/report/generate
 * Trigger Allure report generation.
 */
router.post('/generate', generateReport);

export default router;

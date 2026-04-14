import { Router } from 'express';
import { generateCode } from '../controllers/code.controller';

const router = Router();

/**
 * POST /api/generate-code
 * Generate Playwright TypeScript code from BDD features.
 */
router.post('/', generateCode);

export default router;

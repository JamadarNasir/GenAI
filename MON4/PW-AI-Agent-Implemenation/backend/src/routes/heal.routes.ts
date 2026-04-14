import { Router } from 'express';
import { healStep } from '../controllers/heal.controller';

const router = Router();

/**
 * POST /api/heal
 * AI self-heal a failed test locator.
 */
router.post('/', healStep);

export default router;

import { Router } from 'express';
import { generateBdd } from '../controllers/bdd.controller';

const router = Router();

/**
 * POST /api/generate-bdd
 * Generate Gherkin BDD features from test cases.
 */
router.post('/', generateBdd);

export default router;

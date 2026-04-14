import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/error-handler.middleware';
import { TestCase } from '../types/test-case.types';
import { BddGenerationResponse } from '../types/bdd.types';
import { generateBddFeatures } from '../services/bdd/bdd-generator.service';

/**
 * POST /api/generate-bdd
 * Convert TestCase[] to Gherkin .feature files via LLM.
 */
export async function generateBdd(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ─── Validate request body ─────────────────────
    const { testCases } = req.body as { testCases?: TestCase[] };

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      throw createError(
        'Request body must contain a non-empty "testCases" array. ' +
        'Upload a CSV first via POST /api/upload, then pass the returned testCases here.',
        400
      );
    }

    // Basic validation on test case structure
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (!tc.testCaseId || !tc.title || !tc.steps || tc.steps.length === 0) {
        throw createError(
          `Test case at index ${i} is missing required fields (testCaseId, title, steps).`,
          400
        );
      }
    }

    console.log(`[BDD] Received ${testCases.length} test cases for BDD generation`);

    // ─── Generate BDD features ─────────────────────
    const result: BddGenerationResponse = await generateBddFeatures(testCases);

    console.log(
      `[BDD] Generated ${result.features.length} feature file(s)` +
      (result.errors ? ` with ${result.errors.length} error(s)` : '')
    );

    // ─── Response ──────────────────────────────────
    res.status(result.success ? 200 : 207).json(result);
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { FeatureFile } from '../types/bdd.types';
import { generateCode as generateCodeFromFeatures } from '../services/codegen/code-generator.service';
import { createError } from '../middleware/error-handler.middleware';

/**
 * POST /api/generate-code
 * Generate Playwright TypeScript code from Gherkin features.
 *
 * Request body: { features: FeatureFile[] }
 * Response:     { success, files, summary }
 */
export async function generateCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { features } = req.body as { features?: FeatureFile[] };

    // ── Validation ──
    if (!features || !Array.isArray(features) || features.length === 0) {
      throw createError(
        'Request body must contain a non-empty "features" array. ' +
        'Generate BDD features first via POST /api/generate-bdd, then pass the returned features here.',
        400
      );
    }

    // Validate each feature has minimal required fields
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      if (!f.content || typeof f.content !== 'string') {
        throw createError(`Feature at index ${i} is missing "content" (Gherkin text).`, 400);
      }
      if (!f.featureName || typeof f.featureName !== 'string') {
        throw createError(`Feature at index ${i} is missing "featureName".`, 400);
      }
    }

    console.log(`[Code] Received ${features.length} feature(s) for code generation`);

    // ── Generate code ──
    const result = await generateCodeFromFeatures(features);

    if (result.success) {
      res.status(200).json(result);
    } else {
      // Partial success or failure
      res.status(207).json(result);
    }
  } catch (error) {
    next(error);
  }
}

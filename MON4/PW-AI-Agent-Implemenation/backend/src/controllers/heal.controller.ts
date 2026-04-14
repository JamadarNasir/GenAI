import { Request, Response, NextFunction } from 'express';
import { HealRequest } from '../types/execution.types';
import { healFailedStep } from '../services/heal/heal-orchestrator.service';
import { createError } from '../middleware/error-handler.middleware';

/**
 * POST /api/heal
 * AI self-heal a failed locator.
 *
 * Request body: { stepId, dom, screenshot?, error, oldLocator, stepText }
 * Response:     { success, healedLocator, strategy, retryResult, message }
 */
export async function healStep(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as Partial<HealRequest>;

    // Validate required fields
    if (!body.error || typeof body.error !== 'string') {
      throw createError('Missing required field "error" (the error message from the failed step).', 400);
    }
    if (!body.oldLocator || typeof body.oldLocator !== 'string') {
      throw createError('Missing required field "oldLocator" (the Playwright locator that failed).', 400);
    }
    if (!body.stepText || typeof body.stepText !== 'string') {
      throw createError('Missing required field "stepText" (the BDD step text that failed).', 400);
    }
    if (!body.dom || typeof body.dom !== 'string') {
      throw createError('Missing required field "dom" (the HTML DOM snapshot at failure point).', 400);
    }

    const request: HealRequest = {
      stepId: body.stepId || 'unknown',
      dom: body.dom,
      screenshot: body.screenshot,
      error: body.error,
      oldLocator: body.oldLocator,
      stepText: body.stepText,
    };

    console.log(`[Heal] Received heal request for step: "${request.stepText}"`);

    const result = await healFailedStep(request);

    if (result.success) {
      res.status(200).json(result.healResponse);
    } else {
      res.status(200).json(result.healResponse);
    }
  } catch (error) {
    next(error);
  }
}

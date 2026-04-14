import { Request, Response, NextFunction } from 'express';
import { parseCsvBuffer } from '../services/csv/csv-parser.service';
import { validateCsv } from '../services/csv/csv-validator.service';
import { createError } from '../middleware/error-handler.middleware';
import { UploadResponse } from '../types/test-case.types';

/**
 * POST /api/upload
 * Upload & parse CSV file into TestCase[] array.
 */
export async function uploadCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ─── Check file exists ─────────────────────────
    const file = req.file;
    if (!file) {
      throw createError('No CSV file uploaded. Use form field name "file".', 400);
    }

    console.log(`[Upload] Received file: ${file.originalname} (${file.size} bytes)`);

    // ─── Parse CSV buffer ──────────────────────────
    const { headers, rows, testCases } = parseCsvBuffer(file.buffer);

    console.log(`[Upload] Parsed ${rows.length} rows with headers: ${headers.join(', ')}`);

    // ─── Validate headers & rows ───────────────────
    const validation = validateCsv(headers, rows);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return;
    }

    // ─── Return parsed test cases ──────────────────
    const response: UploadResponse = {
      success: true,
      testCases,
      totalCount: testCases.length,
      ...(validation.warnings.length > 0 && { warnings: validation.warnings }),
    };

    console.log(`[Upload] Successfully parsed ${testCases.length} test cases`);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

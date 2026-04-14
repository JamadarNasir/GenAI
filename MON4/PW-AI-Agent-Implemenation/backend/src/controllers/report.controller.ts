import { Request, Response, NextFunction } from 'express';
import { generateAllureReport, reportExists } from '../services/report/allure-generator.service';
import { getReportStatus } from '../services/report/allure-server.service';

/**
 * GET /api/report
 * Get Allure report status and URL.
 */
export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = getReportStatus();
    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/report/generate
 * Trigger Allure report generation from allure-results/.
 */
export async function generateReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log('[Report] Generating Allure report...');
    const result = await generateAllureReport();

    if (result.success) {
      const status = getReportStatus();
      res.status(200).json({
        success: true,
        message: result.message,
        ...status,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Allure Server Service — serves the generated Allure report
 * via Express static middleware.
 */

import path from 'path';
import express from 'express';
import envConfig from '../../config/env.config';
import { reportExists, getReportPath } from './allure-generator.service';

/**
 * Get the Express static middleware for serving the Allure report.
 */
export function getAllureStaticMiddleware(): express.RequestHandler {
  const reportPath = getReportPath();
  return express.static(reportPath);
}

/**
 * Get the report URL.
 */
export function getReportUrl(): string {
  return `http://localhost:${envConfig.port}/report`;
}

/**
 * Check report status and return metadata.
 */
export function getReportStatus(): {
  available: boolean;
  url: string;
  path: string;
} {
  return {
    available: reportExists(),
    url: getReportUrl(),
    path: getReportPath(),
  };
}

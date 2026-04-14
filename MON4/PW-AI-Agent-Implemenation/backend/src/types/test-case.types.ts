/**
 * TestCase — represents a single row from the uploaded CSV.
 */
export interface TestCase {
  testCaseId: string;
  title: string;
  module: string;
  steps: string[];           // Individual test steps (split from CSV)
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
}

/**
 * CSV validation result
 */
export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parsed CSV upload response
 */
export interface UploadResponse {
  success: boolean;
  testCases: TestCase[];
  totalCount: number;
  errors?: string[];
}

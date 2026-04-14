import { CsvValidationResult } from '../../types/test-case.types';

/**
 * Required CSV headers (case-insensitive match).
 */
const REQUIRED_HEADERS = ['testcaseid', 'title', 'steps', 'expectedresult', 'priority'];

/**
 * Optional headers that are recognized.
 */
const OPTIONAL_HEADERS = ['module', 'tags'];

/**
 * Valid priority values.
 */
const VALID_PRIORITIES = ['high', 'medium', 'low'];

/**
 * Validate CSV headers and rows.
 *
 * @param headers - Array of header strings from the first row.
 * @param rows    - Array of row objects (header → value).
 * @returns       Validation result with errors and warnings.
 */
export function validateCsv(
  headers: string[],
  rows: Record<string, string>[]
): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── Validate Headers ──────────────────────────────
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase().replace(/[\s_-]/g, ''));

  const missingHeaders = REQUIRED_HEADERS.filter(
    (required) => !normalizedHeaders.includes(required)
  );

  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    return { valid: false, errors, warnings };
  }

  // Check for unrecognized headers
  const allKnownHeaders = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
  const unknownHeaders = normalizedHeaders.filter(
    (h) => !allKnownHeaders.includes(h)
  );
  if (unknownHeaders.length > 0) {
    warnings.push(`Unrecognized headers (will be ignored): ${unknownHeaders.join(', ')}`);
  }

  // ─── Validate Rows ────────────────────────────────
  if (rows.length === 0) {
    errors.push('CSV file contains no data rows');
    return { valid: false, errors, warnings };
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is headers, index is 0-based

    // Check required fields are not empty
    const testCaseId = findValue(row, 'testcaseid');
    const title = findValue(row, 'title');
    const steps = findValue(row, 'steps');
    const expectedResult = findValue(row, 'expectedresult');
    const priority = findValue(row, 'priority');

    if (!testCaseId || testCaseId.trim() === '') {
      errors.push(`Row ${rowNum}: Missing testCaseId`);
    }

    if (!title || title.trim() === '') {
      errors.push(`Row ${rowNum}: Missing title`);
    }

    if (!steps || steps.trim() === '') {
      errors.push(`Row ${rowNum}: Missing steps`);
    }

    if (!expectedResult || expectedResult.trim() === '') {
      errors.push(`Row ${rowNum}: Missing expectedResult`);
    }

    if (!priority || priority.trim() === '') {
      errors.push(`Row ${rowNum}: Missing priority`);
    } else if (!VALID_PRIORITIES.includes(priority.trim().toLowerCase())) {
      errors.push(
        `Row ${rowNum}: Invalid priority "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find a value in a row object by normalized key match.
 * Handles variations like "Test Case Id", "testCaseId", "test_case_id".
 */
function findValue(row: Record<string, string>, normalizedKey: string): string | undefined {
  for (const key of Object.keys(row)) {
    if (key.trim().toLowerCase().replace(/[\s_-]/g, '') === normalizedKey) {
      return row[key];
    }
  }
  return undefined;
}

export { findValue };

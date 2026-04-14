import { parse } from 'csv-parse/sync';
import { TestCase } from '../../types/test-case.types';
import { findValue } from './csv-validator.service';

/**
 * Parse a CSV buffer into an array of TestCase objects.
 *
 * @param buffer - The raw CSV file buffer from multer.
 * @returns       Array of normalized TestCase objects.
 */
export function parseCsvBuffer(buffer: Buffer): {
  headers: string[];
  rows: Record<string, string>[];
  testCases: TestCase[];
} {
  const content = buffer.toString('utf-8');

  // Parse CSV with csv-parse (synchronous mode)
  const records: Record<string, string>[] = parse(content, {
    columns: true,           // First row as headers → object keys
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,      // Tolerate quotes inside unquoted fields
    bom: true,               // Handle BOM character in CSV files
  });

  // Extract headers from the first record's keys
  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  // Normalize each row into a TestCase object
  const testCases = records.map((row) => normalizeRow(row));

  return { headers, rows: records, testCases };
}

/**
 * Normalize a raw CSV row into a typed TestCase.
 */
function normalizeRow(row: Record<string, string>): TestCase {
  const rawSteps = findValue(row, 'steps') || '';
  const rawTags = findValue(row, 'tags') || '';
  const rawPriority = (findValue(row, 'priority') || 'medium').trim().toLowerCase();

  return {
    testCaseId: (findValue(row, 'testcaseid') || '').trim(),
    title: (findValue(row, 'title') || '').trim(),
    module: (findValue(row, 'module') || 'General').trim(),
    steps: parseSteps(rawSteps),
    expectedResult: (findValue(row, 'expectedresult') || '').trim(),
    priority: normalizePriority(rawPriority),
    tags: parseTags(rawTags),
  };
}

/**
 * Split steps string into individual step lines.
 * Supports delimiters: newline, semicolon, or numbered list (1. 2. 3.)
 */
function parseSteps(raw: string): string[] {
  if (!raw || raw.trim() === '') return [];

  // Try splitting by newline first
  let steps = raw.split(/\n/).map((s) => s.trim()).filter(Boolean);

  // If only one step, try splitting by semicolon
  if (steps.length === 1) {
    steps = raw.split(/;/).map((s) => s.trim()).filter(Boolean);
  }

  // If still one step, try numbered list (1. step one 2. step two)
  if (steps.length === 1) {
    const numbered = raw.split(/\d+\.\s*/).map((s) => s.trim()).filter(Boolean);
    if (numbered.length > 1) {
      steps = numbered;
    }
  }

  // Clean up: remove leading numbers/bullets
  return steps.map((step) => step.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').trim());
}

/**
 * Parse tags from a comma-separated or space-separated string.
 */
function parseTags(raw: string): string[] {
  if (!raw || raw.trim() === '') return [];

  return raw
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('@') ? t : `@${t}`)); // Ensure @ prefix
}

/**
 * Normalize priority value to one of the allowed enum values.
 */
function normalizePriority(raw: string): 'high' | 'medium' | 'low' {
  const lower = raw.toLowerCase().trim();
  if (['high', 'critical', 'p1', '1'].includes(lower)) return 'high';
  if (['low', 'minor', 'p3', '3'].includes(lower)) return 'low';
  return 'medium'; // Default to medium
}

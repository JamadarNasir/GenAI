import { TestCase } from '../../types/test-case.types';

/**
 * Priority-to-tag mapping rules.
 */
const PRIORITY_TAG_MAP: Record<string, string> = {
  high: '@smoke',
  medium: '@regression',
  low: '@exploratory',
};

/**
 * Map a test case priority to Cucumber tags.
 *
 * @param priority - TestCase priority (high | medium | low)
 * @returns Array of tag strings e.g. ['@smoke']
 */
export function mapPriorityToTag(priority: string): string {
  const normalized = priority.trim().toLowerCase();
  return PRIORITY_TAG_MAP[normalized] || '@regression';
}

/**
 * Build the complete tag set for a test case.
 * Combines: priority tag + module tag + user-supplied tags.
 *
 * @param testCase - The test case to build tags for.
 * @returns Deduplicated array of tag strings.
 */
export function buildTagsForTestCase(testCase: TestCase): string[] {
  const tags = new Set<string>();

  // 1. Priority tag
  tags.add(mapPriorityToTag(testCase.priority));

  // 2. Module tag (slugified)
  if (testCase.module) {
    const moduleTag = '@' + testCase.module
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    tags.add(moduleTag);
  }

  // 3. User-supplied tags from CSV
  if (testCase.tags && testCase.tags.length > 0) {
    testCase.tags.forEach((tag) => {
      const normalized = tag.startsWith('@') ? tag : `@${tag}`;
      tags.add(normalized.toLowerCase());
    });
  }

  return Array.from(tags);
}

/**
 * Build feature-level tags by merging tags from all scenarios in a module.
 * Returns only tags that appear in ALL scenarios (intersection).
 */
export function buildFeatureTags(testCases: TestCase[]): string[] {
  if (testCases.length === 0) return [];

  const tagSets = testCases.map((tc) => new Set(buildTagsForTestCase(tc)));

  // Intersection: tags present in every test case
  const commonTags = [...tagSets[0]].filter((tag) =>
    tagSets.every((set) => set.has(tag))
  );

  return commonTags;
}

/**
 * Group test cases by module name.
 */
export function groupByModule(testCases: TestCase[]): Map<string, TestCase[]> {
  const groups = new Map<string, TestCase[]>();

  for (const tc of testCases) {
    const module = tc.module || 'General';
    if (!groups.has(module)) {
      groups.set(module, []);
    }
    groups.get(module)!.push(tc);
  }

  return groups;
}

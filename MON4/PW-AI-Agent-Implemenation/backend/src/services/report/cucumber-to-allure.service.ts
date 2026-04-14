/**
 * Cucumber-to-Allure Converter
 *
 * Reads cucumber-report.json and converts inline base64 embeddings
 * (screenshots, videos, snapshots) into Allure-native result files
 * that `allure generate` understands.
 *
 * This replaces the incompatible allure-cucumberjs formatter (v2 vs
 * @cucumber/cucumber v10) with a reliable post-processing step.
 *
 * Produces two files per Cucumber scenario in allure-results/:
 *   <uuid>-result.json       — Allure test-result with attachment references
 *   <uuid>-attachment.{ext}  — raw binary/text attachment file
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import envConfig from '../../config/env.config';

const resultsDir = path.join(envConfig.automationDir, 'allure-results');

// ─── Types ───────────────────────────────────────────────────────────

interface CucumberEmbedding {
  data: string;
  mime_type: string;
}

interface CucumberStep {
  keyword?: string;
  name?: string;
  hidden?: boolean;
  result?: { status: string; duration?: number; error_message?: string };
  embeddings?: CucumberEmbedding[];
}

interface CucumberScenario {
  id?: string;
  keyword?: string;
  name?: string;
  description?: string;
  tags?: Array<{ name: string }>;
  type?: string;
  steps?: CucumberStep[];
  before?: CucumberStep[];
  after?: CucumberStep[];
}

interface CucumberFeature {
  keyword?: string;
  name?: string;
  description?: string;
  uri?: string;
  tags?: Array<{ name: string }>;
  elements?: CucumberScenario[];
}

// ─── Extension mapping ───────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'text/plain': 'txt',
  'text/html': 'html',
  'application/json': 'json',
  'text/csv': 'csv',
};

const MIME_LABEL: Record<string, string> = {
  'image/png': 'Screenshot',
  'image/jpeg': 'Screenshot',
  'video/webm': 'Video Recording',
  'video/mp4': 'Video Recording',
  'text/plain': 'Accessibility Snapshot',
  'text/html': 'Page DOM',
};

// ─── Status mapping ──────────────────────────────────────────────────

function mapStatus(cucumberStatus: string): string {
  switch (cucumberStatus?.toLowerCase()) {
    case 'passed': return 'passed';
    case 'failed': return 'failed';
    case 'skipped':
    case 'pending': return 'skipped';
    case 'undefined': return 'broken';
    default: return 'unknown';
  }
}

// ─── Main conversion ─────────────────────────────────────────────────

/**
 * Convert cucumber-report.json embeddings into Allure-native results.
 * Call this after tests finish and before `allure generate`.
 *
 * @returns number of attachment files written
 */
export function convertCucumberEmbeddingsToAllure(): number {
  const reportPath = path.join(resultsDir, 'cucumber-report.json');
  if (!fs.existsSync(reportPath)) {
    console.log('[CucumberToAllure] No cucumber-report.json found — skipping.');
    return 0;
  }

  let features: CucumberFeature[];
  try {
    const raw = fs.readFileSync(reportPath, 'utf-8');
    features = JSON.parse(raw);
  } catch (e) {
    console.error('[CucumberToAllure] Failed to parse cucumber-report.json:', e);
    return 0;
  }

  if (!Array.isArray(features) || features.length === 0) {
    console.log('[CucumberToAllure] cucumber-report.json is empty — skipping.');
    return 0;
  }

  let totalAttachments = 0;

  for (const feature of features) {
    if (!feature.elements) continue;

    for (const scenario of feature.elements) {
      if (scenario.type === 'background') continue;

      const resultUuid = uuidv4();
      const attachments: Array<{ name: string; source: string; type: string }> = [];
      const allureSteps: Array<Record<string, unknown>> = [];

      // Determine overall scenario status from steps
      const allSteps = [
        ...(scenario.before || []),
        ...(scenario.steps || []),
        ...(scenario.after || []),
      ];

      let overallStatus = 'passed';
      let statusDetails: Record<string, string> = {};
      let totalDurationNs = 0;

      // Process each Cucumber step → Allure step + extract embeddings
      for (const step of allSteps) {
        const stepStatus = step.result?.status || 'unknown';
        const durationNs = step.result?.duration || 0;
        totalDurationNs += durationNs;

        if (stepStatus === 'failed') {
          overallStatus = 'failed';
          if (step.result?.error_message) {
            statusDetails = {
              message: step.result.error_message.split('\n')[0],
              trace: step.result.error_message,
            };
          }
        }

        // Build Allure step (visible steps only, not hidden hooks)
        if (!step.hidden && step.keyword && step.name) {
          allureSteps.push({
            name: `${step.keyword.trim()} ${step.name}`,
            status: mapStatus(stepStatus),
            stage: 'finished',
            start: Date.now(),
            stop: Date.now() + Math.round(durationNs / 1_000_000),
          });
        }

        // Extract embeddings → write as separate attachment files
        if (step.embeddings) {
          for (const embedding of step.embeddings) {
            const ext = MIME_TO_EXT[embedding.mime_type] || 'bin';
            const label = MIME_LABEL[embedding.mime_type] || 'Attachment';
            const attachUuid = uuidv4();
            const fileName = `${attachUuid}-attachment.${ext}`;
            const filePath = path.join(resultsDir, fileName);

            try {
              const buffer = Buffer.from(embedding.data, 'base64');
              fs.writeFileSync(filePath, buffer);
              attachments.push({
                name: label,
                source: fileName,
                type: embedding.mime_type,
              });
              totalAttachments++;
            } catch (e) {
              console.error(`[CucumberToAllure] Failed to write ${fileName}:`, e);
            }
          }
        }
      }

      // Compute timing (Cucumber durations are in nanoseconds)
      const durationMs = Math.round(totalDurationNs / 1_000_000);
      const now = Date.now();

      // Build Allure result JSON
      const allureResult = {
        uuid: resultUuid,
        historyId: scenario.id || uuidv4(),
        name: scenario.name || 'Unknown Scenario',
        fullName: `${feature.name || 'Feature'} > ${scenario.name || 'Scenario'}`,
        status: mapStatus(overallStatus),
        statusDetails: Object.keys(statusDetails).length > 0 ? statusDetails : undefined,
        stage: 'finished',
        start: now - durationMs,
        stop: now,
        description: scenario.description || undefined,
        attachments,
        parameters: [],
        steps: allureSteps,
        labels: [
          { name: 'suite', value: feature.name || 'Feature' },
          { name: 'feature', value: feature.name || 'Feature' },
          { name: 'story', value: scenario.name || 'Scenario' },
          { name: 'framework', value: 'cucumber-js' },
          { name: 'language', value: 'typescript' },
          ...(feature.tags || []).map(t => ({ name: 'tag', value: t.name })),
          ...(scenario.tags || []).map(t => ({ name: 'tag', value: t.name })),
        ],
        links: [],
      };

      // Write the result JSON
      const resultPath = path.join(resultsDir, `${resultUuid}-result.json`);
      try {
        fs.writeFileSync(resultPath, JSON.stringify(allureResult, null, 2), 'utf-8');
      } catch (e) {
        console.error(`[CucumberToAllure] Failed to write ${resultUuid}-result.json:`, e);
      }
    }
  }

  console.log(`[CucumberToAllure] Converted ${totalAttachments} attachment(s) to Allure-native format.`);
  return totalAttachments;
}

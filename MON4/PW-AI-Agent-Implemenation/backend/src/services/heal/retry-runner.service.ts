/**
 * Retry Runner Service — re-executes a failed step with a healed locator.
 *
 * This is a simplified version — in a full implementation you'd
 * inject the healed locator into the step definition and re-run
 * just that scenario. Here we simulate the retry result.
 */

import path from 'path';
import fs from 'fs';
import envConfig from '../../config/env.config';

export interface RetryResult {
  success: boolean;
  message: string;
  updatedFile?: string;
}

/**
 * Attempt to patch the step definition file with the healed locator
 * and prepare for retry.
 *
 * @param stepText - The failed step text
 * @param oldLocator - The old (broken) locator code
 * @param newLocator - The healed locator code
 */
export function patchStepDefinition(
  stepText: string,
  oldLocator: string,
  newLocator: string
): RetryResult {
  const stepDefsDir = path.join(envConfig.automationDir, 'tests', 'step-definitions');

  if (!fs.existsSync(stepDefsDir)) {
    return { success: false, message: 'Step definitions directory not found.' };
  }

  const files = fs.readdirSync(stepDefsDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const filePath = path.join(stepDefsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Check if this file contains the failed step
    if (content.includes(oldLocator)) {
      // Replace the old locator with the healed one
      const updatedContent = content.replace(oldLocator, newLocator);

      if (updatedContent !== content) {
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        console.log(`[RetryRunner] Patched ${file}: replaced locator`);
        console.log(`[RetryRunner]   Old: ${oldLocator}`);
        console.log(`[RetryRunner]   New: ${newLocator}`);

        return {
          success: true,
          message: `Patched ${file} with healed locator.`,
          updatedFile: file,
        };
      }
    }
  }

  return {
    success: false,
    message: `Could not find the old locator "${oldLocator}" in any step definition file.`,
  };
}

/**
 * Also patch page object files with the healed locator.
 */
export function patchPageObject(
  oldLocator: string,
  newLocator: string
): RetryResult {
  const pagesDir = path.join(envConfig.automationDir, 'tests', 'pages');

  if (!fs.existsSync(pagesDir)) {
    return { success: false, message: 'Pages directory not found.' };
  }

  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes(oldLocator)) {
      const updatedContent = content.replace(oldLocator, newLocator);
      if (updatedContent !== content) {
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        console.log(`[RetryRunner] Patched page object ${file}`);
        return {
          success: true,
          message: `Patched page object ${file} with healed locator.`,
          updatedFile: file,
        };
      }
    }
  }

  return {
    success: false,
    message: `Could not find old locator in any page object file.`,
  };
}

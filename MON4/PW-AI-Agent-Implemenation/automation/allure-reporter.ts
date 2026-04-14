/**
 * Allure Reporter — Cucumber.js + Allure integration.
 *
 * This wires up the allure-cucumberjs formatter so that every
 * Cucumber run produces Allure-compatible JSON in allure-results/.
 */

import { CucumberJSAllureFormatter } from 'allure-cucumberjs';
import { AllureRuntime } from 'allure-js-commons';
import path from 'path';

const resultsDir = path.resolve(__dirname, './allure-results');

/**
 * Custom Allure formatter that extends CucumberJSAllureFormatter.
 * Registered in cucumber.config.js as a custom formatter.
 */
export default class AllureReporter extends CucumberJSAllureFormatter {
  constructor(options: any) {
    super(
      options,
      new AllureRuntime({ resultsDir }),
      {
        labels: [
          { name: 'epic', pattern: [/@epic:(.*)/] },
          { name: 'severity', pattern: [/@severity:(.*)/] },
        ],
        links: [
          { type: 'issue', pattern: [/@issue=(.*)/], urlTemplate: '%s' },
          { type: 'tms', pattern: [/@tms=(.*)/], urlTemplate: '%s' },
        ],
      }
    );
  }
}

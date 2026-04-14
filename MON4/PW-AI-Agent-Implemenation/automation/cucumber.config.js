/**
 * Cucumber.js Configuration
 *
 * Tells cucumber-js where to find features, step defs, support,
 * and how to transpile TypeScript via ts-node.
 */

module.exports = {
  default: {
    /* Feature files */
    paths: ['tests/features/**/*.feature'],

    /* Step definitions + support */
    require: [
      'tests/support/**/*.ts',
      'tests/step-definitions/**/*.ts',
    ],

    /* TypeScript transpilation */
    requireModule: ['ts-node/register'],

    /* Formatters */
    format: [
      'progress-bar',
      'json:allure-results/cucumber-report.json',
    ],

    /* Tags (can be overridden via CLI --tags) */
    // tags: '@smoke',

    /* Fail fast */
    failFast: false,

    /* Parallel workers (each worker gets its own browser) */
    parallel: parseInt(process.env.PARALLEL_WORKERS || '1', 10),

    /* Timeouts — 30s for steps, 60s for hooks (browser launch/teardown) */
    worldParameters: {},
  },
};

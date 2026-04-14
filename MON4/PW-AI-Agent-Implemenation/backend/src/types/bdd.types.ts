/**
 * FeatureFile — represents a generated Gherkin feature.
 */
export interface FeatureFile {
  fileName: string;            // e.g. "login.feature"
  featureName: string;         // e.g. "Login Functionality"
  content: string;             // Full Gherkin text
  scenarios: ScenarioOutline[];
  tags: string[];
}

/**
 * ScenarioOutline — individual scenario inside a feature.
 */
export interface ScenarioOutline {
  name: string;
  tags: string[];
  steps: GherkinStep[];
}

/**
 * GherkinStep — a single Given/When/Then step.
 */
export interface GherkinStep {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  dataTable?: string[][];
}

/**
 * BDD generation request
 */
export interface BddGenerationRequest {
  testCases: import('./test-case.types').TestCase[];
}

/**
 * BDD generation response
 */
export interface BddGenerationResponse {
  success: boolean;
  features: FeatureFile[];
  errors?: string[];
}

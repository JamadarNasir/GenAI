/**
 * Supported Playwright action types
 */
export type ActionType =
  | 'goto'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'press'
  | 'upload'
  | 'waitForSelector'
  | 'assertVisible'
  | 'assertText'
  | 'assertUrl'
  | 'assertTitle'
  | 'screenshot';

/**
 * LocatorStrategy — how to find the element.
 */
export type LocatorStrategy =
  | 'testId'
  | 'role'
  | 'label'
  | 'placeholder'
  | 'text'
  | 'css'
  | 'xpath';

/**
 * ActionModel — a parsed Playwright action ready for code generation.
 */
export interface ActionModel {
  action: ActionType;
  locatorStrategy?: LocatorStrategy;
  locatorValue?: string;
  roleOptions?: { name?: string };
  value?: string;               // Value to fill, select, etc.
  url?: string;                 // For goto / assertUrl
  description: string;          // Original BDD step text
}

/**
 * LocatorResolution — the resolved locator with Playwright code.
 */
export interface LocatorResolution {
  strategy: LocatorStrategy;
  code: string;                 // e.g. page.getByRole('button', { name: 'Login' })
  confidence: number;           // 0-1 confidence score
}

/**
 * GeneratedFile — a code file produced by the code generator.
 */
export interface GeneratedFile {
  filePath: string;
  fileName: string;
  content: string;
  type: 'feature' | 'step-definition' | 'page-object' | 'hook' | 'support';
}

/**
 * EvaluateTool — browser_evaluate
 */
import { BaseTool } from './BaseTool';

export interface EvaluateParams {
  /** JavaScript expression or arrow function body */
  function: string;
  /** Optional element ref for context */
  ref?: string;
  element?: string;
}

export class EvaluateTool extends BaseTool<EvaluateParams> {
  readonly toolName = 'browser_evaluate';
}

/**
 * SelectOptionTool — browser_select_option
 */
import { BaseTool } from './BaseTool';

export interface SelectOptionParams {
  element: string;
  ref: string;
  values: string[];
}

export class SelectOptionTool extends BaseTool<SelectOptionParams> {
  readonly toolName = 'browser_select_option';
}

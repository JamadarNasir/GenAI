/**
 * FillFormTool — browser_fill_form
 */
import { BaseTool } from './BaseTool';

export interface FormField {
  name: string;
  type: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'slider';
  ref: string;
  value: string;
}

export interface FillFormParams {
  fields: FormField[];
}

export class FillFormTool extends BaseTool<FillFormParams> {
  readonly toolName = 'browser_fill_form';
}

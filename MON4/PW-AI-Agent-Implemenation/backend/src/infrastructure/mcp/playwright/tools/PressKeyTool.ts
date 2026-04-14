/**
 * PressKeyTool — browser_press_key
 */
import { BaseTool } from './BaseTool';

export interface PressKeyParams {
  key: string;
}

export class PressKeyTool extends BaseTool<PressKeyParams> {
  readonly toolName = 'browser_press_key';
}

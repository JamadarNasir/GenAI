/**
 * WaitForTool — browser_wait_for
 */
import { BaseTool } from './BaseTool';

export interface WaitForParams {
  /** Text to wait for to appear */
  text?: string;
  /** Text to wait for to disappear */
  textGone?: string;
  /** Time to wait in seconds */
  time?: number;
}

export class WaitForTool extends BaseTool<WaitForParams> {
  readonly toolName = 'browser_wait_for';
}

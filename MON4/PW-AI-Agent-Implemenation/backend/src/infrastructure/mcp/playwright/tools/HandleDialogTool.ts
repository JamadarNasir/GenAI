/**
 * DialogTool — browser_handle_dialog
 */
import { BaseTool } from './BaseTool';

export interface HandleDialogParams {
  accept: boolean;
  promptText?: string;
}

export class HandleDialogTool extends BaseTool<HandleDialogParams> {
  readonly toolName = 'browser_handle_dialog';
}

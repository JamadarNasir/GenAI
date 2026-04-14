/**
 * DragTool — browser_drag
 */
import { BaseTool } from './BaseTool';

export interface DragParams {
  startElement: string;
  startRef: string;
  endElement: string;
  endRef: string;
}

export class DragTool extends BaseTool<DragParams> {
  readonly toolName = 'browser_drag';
}

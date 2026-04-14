/**
 * ResizeTool — browser_resize
 */
import { BaseTool } from './BaseTool';

export interface ResizeParams {
  width: number;
  height: number;
}

export class ResizeTool extends BaseTool<ResizeParams> {
  readonly toolName = 'browser_resize';
}

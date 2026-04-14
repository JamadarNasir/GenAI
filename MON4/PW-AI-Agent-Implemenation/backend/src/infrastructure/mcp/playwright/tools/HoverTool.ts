/**
 * HoverTool — browser_hover
 */
import { BaseTool } from './BaseTool';

export interface HoverParams {
  /** Human-readable element description */
  element: string;
  /** Exact ref from the accessibility snapshot */
  ref: string;
}

export class HoverTool extends BaseTool<HoverParams> {
  readonly toolName = 'browser_hover';
}

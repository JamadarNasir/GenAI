/**
 * ClickTool — browser_click
 */
import { BaseTool } from './BaseTool';

export interface ClickParams {
  /** Human-readable element description */
  element: string;
  /** Exact ref from the accessibility snapshot */
  ref: string;
  /** Mouse button (default: left) */
  button?: 'left' | 'right' | 'middle';
  /** Whether to double-click */
  doubleClick?: boolean;
  /** Modifier keys */
  modifiers?: Array<'Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift'>;
}

export class ClickTool extends BaseTool<ClickParams> {
  readonly toolName = 'browser_click';
}

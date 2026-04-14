/**
 * TypeTool — browser_type
 */
import { BaseTool } from './BaseTool';

export interface TypeParams {
  /** Human-readable element description */
  element: string;
  /** Exact ref from the accessibility snapshot */
  ref: string;
  /** Text to type */
  text: string;
  /** Whether to submit (press Enter after) */
  submit?: boolean;
  /** Type one character at a time */
  slowly?: boolean;
}

export class TypeTool extends BaseTool<TypeParams> {
  readonly toolName = 'browser_type';
}

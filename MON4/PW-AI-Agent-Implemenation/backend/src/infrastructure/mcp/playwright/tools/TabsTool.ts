/**
 * TabsTool — browser_tabs
 */
import { BaseTool } from './BaseTool';

export interface TabsParams {
  action: 'list' | 'new' | 'close' | 'select';
  index?: number;
}

export class TabsTool extends BaseTool<TabsParams> {
  readonly toolName = 'browser_tabs';
}

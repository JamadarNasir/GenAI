/**
 * NavigateTool — browser_navigate
 */
import { BaseTool } from './BaseTool';
import { McpToolResult } from '../../common/McpClient.interface';

export interface NavigateParams {
  url: string;
}

export class NavigateTool extends BaseTool<NavigateParams> {
  readonly toolName = 'browser_navigate';
}

/**
 * NavigateBackTool — browser_navigate_back
 */
export class NavigateBackTool extends BaseTool<Record<string, never>> {
  readonly toolName = 'browser_navigate_back';
}

/**
 * NavigateForwardTool — browser_navigate_forward
 */
export class NavigateForwardTool extends BaseTool<Record<string, never>> {
  readonly toolName = 'browser_navigate_forward';
}

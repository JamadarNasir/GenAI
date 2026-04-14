/**
 * SnapshotTool — browser_snapshot
 *
 * The most important tool — returns the accessibility tree of the page.
 * Element `ref` values from the snapshot are used by click, type, hover, etc.
 */
import { BaseTool } from './BaseTool';
import { McpToolResult } from '../../common/McpClient.interface';

export interface SnapshotParams {
  // No required params
}

export interface SnapshotResult {
  /** Raw accessibility tree text */
  snapshotText: string;
  /** Whether the call succeeded */
  success: boolean;
}

export class SnapshotTool extends BaseTool<SnapshotParams, SnapshotResult> {
  readonly toolName = 'browser_snapshot';

  protected parseResult(result: McpToolResult): SnapshotResult {
    const text = this.extractText(result);
    return {
      snapshotText: text,
      success: !result.isError && text.length > 0,
    };
  }
}

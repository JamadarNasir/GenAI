/**
 * BaseTool — abstract base class for MCP tool wrappers.
 *
 * Each tool wrapper:
 *  - defines the MCP tool name
 *  - provides typed `execute(params)` method
 *  - delegates to the underlying IMcpClient.executeTool()
 */

import { IMcpClient, McpToolResult } from '../../common/McpClient.interface';

export abstract class BaseTool<TParams extends object, TResult = McpToolResult> {
  /** MCP tool name (e.g. 'browser_click') */
  abstract readonly toolName: string;

  constructor(protected readonly client: IMcpClient) {}

  /**
   * Execute the tool with typed parameters.
   * Subclasses may override to post-process the result.
   */
  async execute(params: TParams): Promise<TResult> {
    const result = await this.client.executeTool(this.toolName, params as Record<string, unknown>);
    return this.parseResult(result);
  }

  /**
   * Override to transform the raw McpToolResult into a typed result.
   * Default implementation returns the raw result cast to TResult.
   */
  protected parseResult(result: McpToolResult): TResult {
    return result as unknown as TResult;
  }

  /**
   * Extract the first text content from a tool result.
   */
  protected extractText(result: McpToolResult): string {
    const textBlock = result.content?.find(b => b.type === 'text');
    return textBlock?.text || '';
  }
}

/**
 * IMcpClient — Generic MCP (Model Context Protocol) client interface.
 *
 * Any MCP server (Playwright, filesystem, etc.) plugs in by implementing
 * this interface.  The JSON-RPC transport details are hidden behind
 * connect / disconnect / executeTool.
 */

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
  /** Structured content returned by the tool (text, images, etc.) */
  content: McpContentBlock[];
  /** Whether the tool call produced an error */
  isError?: boolean;
}

export interface McpContentBlock {
  type: 'text' | 'image' | 'resource';
  text?: string;
  /** Base-64 encoded data for images */
  data?: string;
  mimeType?: string;
}

export interface IMcpClient {
  /** Unique identifier for the server type (e.g. 'playwright') */
  readonly serverType: string;

  /** Whether the client is currently connected to the server process */
  isConnected(): boolean;

  /**
   * Spawn the MCP server process, perform the JSON-RPC handshake
   * (`initialize` + `notifications/initialized`), and cache the tool list.
   */
  connect(): Promise<void>;

  /**
   * Gracefully shut down the server process.
   */
  disconnect(): Promise<void>;

  /**
   * Discover all tools the server exposes.
   */
  listTools(): Promise<McpToolDefinition[]>;

  /**
   * Call a single tool by name.
   *
   * @param toolName  One of the names returned by `listTools()`
   * @param args      Tool-specific arguments (matches `inputSchema`)
   */
  executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult>;
}

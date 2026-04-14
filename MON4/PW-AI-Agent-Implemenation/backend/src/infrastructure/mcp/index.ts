/**
 * MCP Infrastructure — barrel export.
 */

// Common
export type { IMcpClient, McpToolDefinition, McpToolResult, McpContentBlock } from './common';
export { McpClientFactory } from './common';

// Playwright clients
export { RealPlaywrightMcpClient, PlaywrightMcpClient } from './playwright';

// Tools
export * from './playwright/tools';

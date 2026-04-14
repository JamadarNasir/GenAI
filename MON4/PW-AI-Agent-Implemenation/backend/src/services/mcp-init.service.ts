/**
 * MCP Init Service — registers MCP client constructors and optionally
 * auto-connects on server startup.
 *
 * Called from index.ts during server bootstrap.
 */

import { McpClientFactory } from '../infrastructure/mcp/common';
import { RealPlaywrightMcpClient } from '../infrastructure/mcp/playwright/RealPlaywrightMcpClient';
import { PlaywrightMcpClient } from '../infrastructure/mcp/playwright/PlaywrightMcpClient';
import envConfig from '../config/env.config';

/**
 * Register all MCP client constructors with the factory.
 * Picks mock vs real based on USE_REAL_MCP env var.
 */
export function registerMcpClients(): void {
  if (!envConfig.mcpPlaywrightEnabled) {
    console.log('[MCP] Playwright MCP integration is DISABLED (MCP_PLAYWRIGHT_ENABLED != true)');
    return;
  }

  const useReal = envConfig.useRealMcp;

  McpClientFactory.register('playwright', () => {
    if (useReal) {
      console.log('[MCP] Registering REAL Playwright MCP client (will spawn @playwright/mcp)');
      return new RealPlaywrightMcpClient();
    } else {
      console.log('[MCP] Registering MOCK Playwright MCP client (simulation mode)');
      return new PlaywrightMcpClient();
    }
  });

  console.log(`[MCP] Playwright client registered (mode: ${useReal ? 'real' : 'mock'})`);
}

/**
 * Get the Playwright MCP client (lazy — doesn't connect yet).
 * Returns null if MCP is disabled.
 */
export function getPlaywrightMcpClient() {
  if (!envConfig.mcpPlaywrightEnabled) return null;
  if (!McpClientFactory.has('playwright')) return null;
  return McpClientFactory.get('playwright');
}

/**
 * Connect the Playwright MCP client if enabled.
 * Safe to call multiple times — skips if already connected.
 */
export async function connectPlaywrightMcp(): Promise<boolean> {
  const client = getPlaywrightMcpClient();
  if (!client) return false;
  if (client.isConnected()) return true;

  try {
    await client.connect();
    return true;
  } catch (err: any) {
    console.error(`[MCP] Failed to connect Playwright MCP: ${err.message}`);
    return false;
  }
}

/**
 * Disconnect all MCP clients (for graceful shutdown).
 */
export async function disconnectAllMcp(): Promise<void> {
  await McpClientFactory.disconnectAll();
}

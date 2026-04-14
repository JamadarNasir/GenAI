/**
 * MCP Controller — HTTP handlers for Playwright MCP operations.
 *
 * Endpoints:
 *   POST /api/mcp/connect       — Connect to the Playwright MCP server
 *   POST /api/mcp/disconnect    — Disconnect from the MCP server
 *   GET  /api/mcp/status        — Get connection status + available tools
 *   GET  /api/mcp/tools         — List all available MCP tools
 *   POST /api/mcp/execute       — Execute a single MCP tool
 *   POST /api/mcp/snapshot      — Convenience: get accessibility snapshot
 *   POST /api/mcp/navigate      — Convenience: navigate to a URL
 *   POST /api/mcp/click         — Convenience: click an element by ref
 *   POST /api/mcp/type          — Convenience: type text into an element
 *   POST /api/mcp/screenshot    — Convenience: take a screenshot
 */

import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/error-handler.middleware';
import {
  getPlaywrightMcpClient,
  connectPlaywrightMcp,
} from '../services/mcp-init.service';
import envConfig from '../config/env.config';
import { saveMcpScreenshot, saveMcpSnapshot } from '../services/report/mcp-allure.service';

// ── Helpers ──────────────────────────────────────────────────

function requireMcpEnabled(): void {
  if (!envConfig.mcpPlaywrightEnabled) {
    throw createError(
      'Playwright MCP integration is disabled. Set MCP_PLAYWRIGHT_ENABLED=true in .env',
      503,
    );
  }
}

function requireConnected() {
  requireMcpEnabled();
  const client = getPlaywrightMcpClient();
  if (!client || !client.isConnected()) {
    throw createError(
      'MCP client is not connected. POST /api/mcp/connect first.',
      409,
    );
  }
  return client;
}

// ── Endpoints ────────────────────────────────────────────────

/**
 * POST /api/mcp/connect
 */
export async function mcpConnect(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireMcpEnabled();
    const success = await connectPlaywrightMcp();
    if (!success) {
      throw createError('Failed to connect to Playwright MCP server', 500);
    }
    const client = getPlaywrightMcpClient()!;
    const tools = await client.listTools();
    res.json({
      success: true,
      message: 'Connected to Playwright MCP server',
      mode: envConfig.useRealMcp ? 'real' : 'mock',
      toolCount: tools.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/disconnect
 */
export async function mcpDisconnect(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireMcpEnabled();
    const client = getPlaywrightMcpClient();
    if (client?.isConnected()) {
      await client.disconnect();
    }
    res.json({ success: true, message: 'Disconnected from Playwright MCP server' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/mcp/status
 */
export async function mcpStatus(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const enabled = envConfig.mcpPlaywrightEnabled;
    const client = enabled ? getPlaywrightMcpClient() : null;
    const connected = client?.isConnected() ?? false;

    res.json({
      success: true,
      enabled,
      connected,
      mode: envConfig.useRealMcp ? 'real' : 'mock',
      toolCount: connected ? (await client!.listTools()).length : 0,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/mcp/tools
 */
export async function mcpListTools(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const tools = await client.listTools();
    res.json({ success: true, tools });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/execute
 * Body: { tool: string, args: Record<string, unknown> }
 */
export async function mcpExecuteTool(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const { tool, args } = req.body;

    if (!tool || typeof tool !== 'string') {
      throw createError('Missing required field: "tool" (string)', 400);
    }

    const result = await client.executeTool(tool, args || {});

    // Auto-save screenshots and snapshots to allure-results/
    const label = (args?.label as string) || undefined;
    if (tool === 'browser_take_screenshot') {
      const imageBlock = result.content?.find(b => b.type === 'image');
      if (imageBlock?.data) {
        saveMcpScreenshot(imageBlock.data, label || `Screenshot — ${new Date().toISOString()}`, tool);
      }
    } else if (tool === 'browser_snapshot') {
      const textBlock = result.content?.find(b => b.type === 'text');
      if (textBlock?.text) {
        saveMcpSnapshot(textBlock.text, label || `Accessibility Snapshot — ${new Date().toISOString()}`, tool);
      }
    }

    res.json({ success: true, tool, result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/snapshot
 * Convenience endpoint for browser_snapshot.
 */
export async function mcpSnapshot(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const result = await client.executeTool('browser_snapshot', {});
    const snapshotText = result.content?.find(b => b.type === 'text')?.text || '';

    // Save to allure-results/
    if (snapshotText) {
      saveMcpSnapshot(snapshotText, `Accessibility Snapshot — ${new Date().toISOString()}`, 'browser_snapshot');
    }

    res.json({ success: true, snapshot: snapshotText });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/navigate
 * Body: { url: string }
 */
export async function mcpNavigate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const { url } = req.body;
    if (!url) throw createError('Missing required field: "url"', 400);

    const result = await client.executeTool('browser_navigate', { url });
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/click
 * Body: { element: string, ref: string, button?, doubleClick?, modifiers? }
 */
export async function mcpClick(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const { element, ref, button, doubleClick, modifiers } = req.body;
    if (!element || !ref) throw createError('Missing required fields: "element", "ref"', 400);

    const result = await client.executeTool('browser_click', {
      element, ref, button, doubleClick, modifiers,
    });
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/type
 * Body: { element: string, ref: string, text: string, submit?, slowly? }
 */
export async function mcpType(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const { element, ref, text, submit, slowly } = req.body;
    if (!element || !ref || text == null) {
      throw createError('Missing required fields: "element", "ref", "text"', 400);
    }

    const result = await client.executeTool('browser_type', {
      element, ref, text, submit, slowly,
    });
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/mcp/screenshot
 * Body: { ref?, element?, fullPage?, filename?, type? }
 */
export async function mcpScreenshot(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = requireConnected();
    const result = await client.executeTool('browser_take_screenshot', req.body || {});

    // Save to allure-results/
    const imageBlock = result.content?.find(b => b.type === 'image');
    if (imageBlock?.data) {
      const label = (req.body?.label as string) || `Screenshot — ${new Date().toISOString()}`;
      saveMcpScreenshot(imageBlock.data, label, 'browser_take_screenshot');
    }

    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

/**
 * MCP Routes — Playwright MCP integration endpoints.
 */

import { Router } from 'express';
import {
  mcpConnect,
  mcpDisconnect,
  mcpStatus,
  mcpListTools,
  mcpExecuteTool,
  mcpSnapshot,
  mcpNavigate,
  mcpClick,
  mcpType,
  mcpScreenshot,
} from '../controllers/mcp.controller';

const router = Router();

// ─── Connection Management ─────────────────────────────────
router.post('/connect', mcpConnect);
router.post('/disconnect', mcpDisconnect);
router.get('/status', mcpStatus);

// ─── Tool Discovery ────────────────────────────────────────
router.get('/tools', mcpListTools);

// ─── Generic Tool Execution ────────────────────────────────
router.post('/execute', mcpExecuteTool);

// ─── Convenience Endpoints ─────────────────────────────────
router.post('/snapshot', mcpSnapshot);
router.post('/navigate', mcpNavigate);
router.post('/click', mcpClick);
router.post('/type', mcpType);
router.post('/screenshot', mcpScreenshot);

export default router;

import http from 'http';
import { execSync } from 'child_process';
import app from './app';
import { envConfig } from './config/env.config';
import { initWebSocket } from './websocket/log-stream.ws';
import { initAIFromEnv } from './services/ai-init.service';
import { registerMcpClients, disconnectAllMcp } from './services/mcp-init.service';

const server = http.createServer(app);

// Initialize WebSocket on the same server
initWebSocket(server);

// Initialize AI client from environment config
try {
  const aiClient = initAIFromEnv();
  console.log(`[AI] Client ready: ${aiClient.providerName}`);
} catch (error: any) {
  console.warn(`[AI] Client init warning: ${error.message}`);
}

// Register MCP clients (actual connection happens on POST /api/mcp/connect)
registerMcpClients();

const BANNER = `
╔═══════════════════════════════════════════════════════╗
║   AI Test Automation Agent — Backend Server           ║
╠═══════════════════════════════════════════════════════╣
║   Port:        ${envConfig.port}                                ║
║   Environment: ${envConfig.nodeEnv.padEnd(16)}                ║
║   AI Provider: ${envConfig.aiProvider.padEnd(16)}                ║
║   WebSocket:   ws://localhost:${envConfig.port}/ws/logs         ║
╠═══════════════════════════════════════════════════════╣
║   API Endpoints:                                      ║
║   POST /api/upload          CSV Upload                ║
║   POST /api/generate-bdd   BDD Generation             ║
║   POST /api/generate-code  Code Generation            ║
║   POST /api/run             Test Execution            ║
║   POST /api/heal            Self-Healing              ║
║   GET  /api/report          Allure Report             ║
║   POST /api/mcp/*           Playwright MCP            ║
║   GET  /api/health          Health Check              ║
╚═══════════════════════════════════════════════════════╝
`;

function killPort(port: number): void {
  try {
    // Windows: find PID via netstat and taskkill
    const result = execSync(
      `netstat -ano | findstr ":${port} "`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const pids = new Set(
      result.split('\n')
        .map(line => line.trim().split(/\s+/).pop())
        .filter(pid => pid && /^\d+$/.test(pid) && pid !== '0')
    );
    pids.forEach(pid => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`[Server] Killed stale process PID ${pid} on port ${port}`);
      } catch {}
    });
  } catch {}
}

function startServer(attempt = 1): void {
  server.listen(envConfig.port, () => {
    console.log(BANNER);
  });
}

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.warn(`[Server] Port ${envConfig.port} already in use — freeing it and retrying...`);
    killPort(envConfig.port);
    // Small delay to let OS release the port, then retry
    setTimeout(() => {
      server.removeAllListeners('error');
      server.on('error', (err: NodeJS.ErrnoException) => {
        console.error('[Server] Fatal error after retry:', err.message);
        process.exit(1);
      });
      startServer();
    }, 1500);
  } else {
    console.error('[Server] Fatal error:', error.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectAllMcp();
  server.close(() => process.exit(0));
});
process.on('SIGTERM', async () => {
  await disconnectAllMcp();
  server.close(() => process.exit(0));
});

startServer();

export default server;

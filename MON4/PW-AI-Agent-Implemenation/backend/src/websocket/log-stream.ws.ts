import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { LogLine } from '../types/execution.types';

let wss: WebSocketServer | null = null;
const clients: Set<WebSocket> = new Set();

/**
 * Initialize WebSocket server on the same HTTP server.
 */
export function initWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: '/ws/logs' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      clients.delete(ws);
    });
  });

  console.log('[WS] WebSocket server initialized at /ws/logs');
}

/**
 * Broadcast a log line to all connected WebSocket clients.
 */
export function broadcastLog(log: LogLine): void {
  const message = JSON.stringify(log);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Send a raw string message to all connected clients.
 */
export function broadcastMessage(message: string): void {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Get the count of connected clients.
 */
export function getClientCount(): number {
  return clients.size;
}

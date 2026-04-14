/**
 * RealPlaywrightMcpClient — spawns `@playwright/mcp` as a child process
 * and communicates via JSON-RPC 2.0 over stdio.
 *
 * Lifecycle:
 *  1. spawn('npx', ['@playwright/mcp@latest'])  — starts the server
 *  2. initialize handshake                       — JSON-RPC initialize + notifications/initialized
 *  3. tools/list                                 — discover available browser tools
 *  4. tools/call                                 — execute individual tools
 *  5. disconnect                                 — kill child process
 */

import { ChildProcess, spawn } from 'child_process';
import {
  IMcpClient,
  McpToolDefinition,
  McpToolResult,
  McpContentBlock,
} from '../common/McpClient.interface';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export class RealPlaywrightMcpClient implements IMcpClient {
  readonly serverType = 'playwright';

  private process: ChildProcess | null = null;
  private connected = false;
  private nextId = 1;
  private buffer = '';
  private tools: McpToolDefinition[] = [];

  /** Pending RPC calls keyed by request id */
  private pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();

  // ── IMcpClient implementation ─────────────────────────────

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    console.log('[MCP-Playwright] Spawning @playwright/mcp server …');

    this.process = spawn('npx', ['@playwright/mcp@latest'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    // Wire up stdout reader
    this.process.stdout!.on('data', (chunk: Buffer) => this.onStdout(chunk));
    this.process.stderr!.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.error(`[MCP-Playwright stderr] ${text}`);
    });
    this.process.on('exit', (code) => {
      console.log(`[MCP-Playwright] Process exited with code ${code}`);
      this.connected = false;
    });

    // Step 1 — initialize handshake
    const initResult = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ai-test-automation-agent', version: '1.0.0' },
    });
    console.log('[MCP-Playwright] Handshake complete:', JSON.stringify(initResult).slice(0, 200));

    // Step 2 — send initialized notification (no id, no response expected)
    this.sendNotification('notifications/initialized', {});

    // Step 3 — discover tools
    const toolsResult = (await this.sendRequest('tools/list', {})) as { tools?: McpToolDefinition[] };
    this.tools = toolsResult?.tools ?? [];
    console.log(`[MCP-Playwright] Discovered ${this.tools.length} tools: ${this.tools.map(t => t.name).join(', ')}`);

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.process) return;

    console.log('[MCP-Playwright] Disconnecting …');
    this.connected = false;

    // Reject any pending calls
    for (const [id, { reject }] of this.pending) {
      reject(new Error('MCP client disconnecting'));
    }
    this.pending.clear();

    // Kill process
    try {
      this.process.kill('SIGTERM');
    } catch { /* already dead */ }

    // Wait briefly for graceful exit
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try { this.process?.kill('SIGKILL'); } catch {}
        resolve();
      }, 3000);

      this.process!.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    this.process = null;
    this.tools = [];
  }

  async listTools(): Promise<McpToolDefinition[]> {
    if (!this.connected) throw new Error('[MCP-Playwright] Not connected. Call connect() first.');
    return [...this.tools];
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.connected) throw new Error('[MCP-Playwright] Not connected. Call connect() first.');

    console.log(`[MCP-Playwright] Calling tool: ${toolName}`, JSON.stringify(args).slice(0, 200));

    const result = (await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    })) as McpToolResult | undefined;

    // Normalise response to McpToolResult shape
    if (!result) {
      return { content: [{ type: 'text', text: '(empty response)' }], isError: true };
    }

    // If server returned plain content array
    if (Array.isArray(result.content)) {
      return {
        content: result.content.map((block: any) => this.normaliseContentBlock(block)),
        isError: result.isError ?? false,
      };
    }

    // Fallback: wrap raw result as text
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: false,
    };
  }

  // ── JSON-RPC transport ────────────────────────────────────

  /**
   * Send a JSON-RPC request and wait for the matching response.
   */
  private sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      if (!this.process?.stdin?.writable) {
        return reject(new Error('[MCP-Playwright] stdin not writable'));
      }

      const id = this.nextId++;
      const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

      this.pending.set(id, { resolve, reject });

      const payload = JSON.stringify(request) + '\n';
      this.process.stdin.write(payload, (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });

      // Timeout per call
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`[MCP-Playwright] Timeout waiting for response to ${method} (id=${id})`));
        }
      }, 30_000);
    });
  }

  /**
   * Send a JSON-RPC notification (no id, no response expected).
   */
  private sendNotification(method: string, params: Record<string, unknown>): void {
    if (!this.process?.stdin?.writable) return;
    const notification = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    this.process.stdin.write(notification);
  }

  /**
   * Handle raw stdout data — buffer lines and parse JSON-RPC responses.
   */
  private onStdout(chunk: Buffer): void {
    this.buffer += chunk.toString();

    // Process complete lines
    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);
      if (!line) continue;

      try {
        const msg: JsonRpcResponse = JSON.parse(line);
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(`[MCP-Playwright] RPC error (${msg.error.code}): ${msg.error.message}`));
          } else {
            resolve(msg.result);
          }
        }
        // Notifications from server (no id) — log and ignore
      } catch {
        // Not JSON — log stderr-style output
        if (line) console.log(`[MCP-Playwright stdout] ${line}`);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private normaliseContentBlock(block: Record<string, unknown>): McpContentBlock {
    return {
      type: (block.type as McpContentBlock['type']) || 'text',
      text: block.text as string | undefined,
      data: block.data as string | undefined,
      mimeType: block.mimeType as string | undefined,
    };
  }
}

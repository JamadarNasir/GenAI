/**
 * PlaywrightMcpClient — Mock / simulation client for dev & testing.
 *
 * Returns hardcoded responses so you can develop & test the API layer
 * without actually spawning a browser.  Toggle with USE_REAL_MCP=false.
 */

import {
  IMcpClient,
  McpToolDefinition,
  McpToolResult,
} from '../common/McpClient.interface';

/** Pre-defined tool list matching the real @playwright/mcp server */
const MOCK_TOOLS: McpToolDefinition[] = [
  { name: 'browser_navigate', description: 'Navigate to a URL' },
  { name: 'browser_navigate_back', description: 'Go back in history' },
  { name: 'browser_navigate_forward', description: 'Go forward in history' },
  { name: 'browser_click', description: 'Click an element' },
  { name: 'browser_type', description: 'Type text into an input' },
  { name: 'browser_snapshot', description: 'Get the accessibility tree' },
  { name: 'browser_take_screenshot', description: 'Capture a screenshot' },
  { name: 'browser_press_key', description: 'Press a keyboard key' },
  { name: 'browser_hover', description: 'Hover over an element' },
  { name: 'browser_drag', description: 'Drag and drop' },
  { name: 'browser_select_option', description: 'Select a dropdown option' },
  { name: 'browser_fill_form', description: 'Fill multiple form fields' },
  { name: 'browser_handle_dialog', description: 'Accept/dismiss dialogs' },
  { name: 'browser_file_upload', description: 'Upload files' },
  { name: 'browser_evaluate', description: 'Run JavaScript on the page' },
  { name: 'browser_wait_for', description: 'Wait for text/time/conditions' },
  { name: 'browser_tabs', description: 'List/create/close/select tabs' },
  { name: 'browser_resize', description: 'Resize the browser window' },
  { name: 'browser_console_messages', description: 'Get console logs' },
  { name: 'browser_network_requests', description: 'Get network activity' },
  { name: 'browser_close', description: 'Close the browser' },
  { name: 'browser_install', description: 'Install browser binary' },
  { name: 'browser_pdf_save', description: 'Save page as PDF' },
  { name: 'browser_add_cookies', description: 'Add cookies' },
];

export class PlaywrightMcpClient implements IMcpClient {
  readonly serverType = 'playwright';
  private connected = false;

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    console.log('[MCP-Mock] Connecting (mock mode) …');
    this.connected = true;
    console.log(`[MCP-Mock] Connected — ${MOCK_TOOLS.length} tools available`);
  }

  async disconnect(): Promise<void> {
    console.log('[MCP-Mock] Disconnecting …');
    this.connected = false;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    return [...MOCK_TOOLS];
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.connected) throw new Error('[MCP-Mock] Not connected');

    console.log(`[MCP-Mock] executeTool: ${toolName}`, JSON.stringify(args).slice(0, 200));

    // Return realistic mock responses per tool
    switch (toolName) {
      case 'browser_navigate':
        return this.text(`Navigated to ${args.url || '(no url)'}`);

      case 'browser_snapshot':
        return this.text(MOCK_SNAPSHOT);

      case 'browser_take_screenshot':
        return {
          content: [{
            type: 'image',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB',
            mimeType: 'image/png',
          }],
        };

      case 'browser_click':
        return this.text(`Clicked element: ${args.element || args.ref || '(unknown)'}`);

      case 'browser_type':
        return this.text(`Typed "${args.text || ''}" into ${args.element || args.ref || '(unknown)'}`);

      case 'browser_hover':
        return this.text(`Hovered over: ${args.element || args.ref || '(unknown)'}`);

      case 'browser_press_key':
        return this.text(`Pressed key: ${args.key || '(unknown)'}`);

      case 'browser_select_option':
        return this.text(`Selected option in ${args.element || '(unknown)'}: ${JSON.stringify(args.values)}`);

      case 'browser_fill_form':
        return this.text(`Filled ${(args.fields as unknown[])?.length || 0} form field(s)`);

      case 'browser_evaluate':
        return this.text('(mock eval result)');

      case 'browser_wait_for':
        return this.text('Wait condition satisfied (mock)');

      case 'browser_tabs':
        return this.text(JSON.stringify([{ index: 0, url: 'about:blank', title: 'Mock Tab' }]));

      case 'browser_console_messages':
        return this.text(JSON.stringify([]));

      case 'browser_network_requests':
        return this.text(JSON.stringify([]));

      case 'browser_close':
        return this.text('Browser closed (mock)');

      default:
        return this.text(`Mock response for ${toolName}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private text(message: string): McpToolResult {
    return { content: [{ type: 'text', text: message }] };
  }
}

// A realistic-looking mock accessibility snapshot
const MOCK_SNAPSHOT = `
- document [ref=s1]
  - banner [ref=s2]
    - heading "Mock Application" [level=1] [ref=s3]
    - navigation [ref=s4]
      - link "Home" [ref=s5]
      - link "About" [ref=s6]
      - link "Login" [ref=s7]
  - main [ref=s8]
    - heading "Welcome" [level=2] [ref=s9]
    - textbox "Username" [ref=s10]
    - textbox "Password" [ref=s11]
    - button "Sign In" [ref=s12]
    - link "Forgot Password?" [ref=s13]
  - contentinfo [ref=s14]
    - paragraph "© 2026 Mock Corp" [ref=s15]
`.trim();

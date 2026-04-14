/**
 * ConsoleTool — browser_console_messages
 * NetworkTool — browser_network_requests
 * CloseTool — browser_close
 * InstallTool — browser_install
 */
import { BaseTool } from './BaseTool';

export interface ConsoleParams {
  onlyErrors?: boolean;
}

export class ConsoleTool extends BaseTool<ConsoleParams> {
  readonly toolName = 'browser_console_messages';
}

export class NetworkTool extends BaseTool<Record<string, never>> {
  readonly toolName = 'browser_network_requests';
}

export class CloseTool extends BaseTool<Record<string, never>> {
  readonly toolName = 'browser_close';
}

export class InstallTool extends BaseTool<Record<string, never>> {
  readonly toolName = 'browser_install';
}

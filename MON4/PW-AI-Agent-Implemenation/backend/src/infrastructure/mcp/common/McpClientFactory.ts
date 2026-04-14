/**
 * McpClientFactory — creates and manages MCP client instances by server type.
 *
 * Usage:
 *   McpClientFactory.register('playwright', () => new RealPlaywrightMcpClient());
 *   const client = McpClientFactory.get('playwright');
 *   await client.connect();
 */

import { IMcpClient } from './McpClient.interface';

type ClientConstructor = () => IMcpClient;

class McpClientFactoryClass {
  private readonly constructors = new Map<string, ClientConstructor>();
  private readonly instances = new Map<string, IMcpClient>();

  /**
   * Register a constructor for a server type.
   * Can be called multiple times (last-write wins).
   */
  register(serverType: string, ctor: ClientConstructor): void {
    this.constructors.set(serverType, ctor);
    // Invalidate cached instance when constructor changes
    this.instances.delete(serverType);
  }

  /**
   * Get (or create) a singleton client for the given server type.
   */
  get(serverType: string): IMcpClient {
    const existing = this.instances.get(serverType);
    if (existing) return existing;

    const ctor = this.constructors.get(serverType);
    if (!ctor) {
      throw new Error(
        `[McpClientFactory] No constructor registered for server type "${serverType}". ` +
        `Available: ${[...this.constructors.keys()].join(', ') || '(none)'}`,
      );
    }

    const instance = ctor();
    this.instances.set(serverType, instance);
    return instance;
  }

  /**
   * Check if a constructor is registered for a server type.
   */
  has(serverType: string): boolean {
    return this.constructors.has(serverType);
  }

  /**
   * Disconnect and remove a cached client.
   */
  async remove(serverType: string): Promise<void> {
    const instance = this.instances.get(serverType);
    if (instance?.isConnected()) {
      await instance.disconnect();
    }
    this.instances.delete(serverType);
  }

  /**
   * Disconnect all cached clients.
   */
  async disconnectAll(): Promise<void> {
    for (const [type, client] of this.instances) {
      try {
        if (client.isConnected()) await client.disconnect();
      } catch (err) {
        console.error(`[McpClientFactory] Error disconnecting ${type}:`, err);
      }
    }
    this.instances.clear();
  }

  /**
   * List all registered server types.
   */
  registeredTypes(): string[] {
    return [...this.constructors.keys()];
  }
}

/** Singleton factory instance */
export const McpClientFactory = new McpClientFactoryClass();

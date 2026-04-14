import { AIClient } from './ai-client';
import { OpenAIProvider, OpenAIProviderConfig } from './providers/openai.provider';
import { AzureOpenAIProvider, AzureOpenAIProviderConfig } from './providers/azure-openai.provider';
import { LocalLLMProvider, LocalLLMProviderConfig } from './providers/local-llm.provider';

/**
 * Supported AI provider identifiers.
 */
export type AIProviderType = 'openai' | 'azure' | 'local';

/**
 * Full configuration needed to create any AI provider.
 */
export interface AIFactoryConfig {
  provider: AIProviderType;
  openai?: OpenAIProviderConfig;
  azure?: AzureOpenAIProviderConfig;
  local?: LocalLLMProviderConfig;
}

/**
 * AIClientFactory — Creates the correct AI provider based on configuration.
 *
 * Singleton pattern: reuse the same client instance across the app lifecycle.
 */
let cachedClient: AIClient | null = null;
let cachedConfig: AIFactoryConfig | null = null;

/**
 * Create an AI client with explicit configuration.
 */
export function createAIClient(config: AIFactoryConfig): AIClient {
  console.log(`[AI] Creating AI client — provider: ${config.provider}`);

  cachedConfig = config;

  switch (config.provider) {
    case 'openai':
      if (!config.openai) throw new Error('OpenAI config required when provider is "openai"');
      cachedClient = new OpenAIProvider(config.openai);
      break;

    case 'azure':
      if (!config.azure) throw new Error('Azure config required when provider is "azure"');
      cachedClient = new AzureOpenAIProvider(config.azure);
      break;

    case 'local':
      if (!config.local) throw new Error('Local LLM config required when provider is "local"');
      cachedClient = new LocalLLMProvider(config.local);
      break;

    default:
      console.warn(`[AI] Unknown provider "${config.provider}", falling back to local`);
      cachedClient = new LocalLLMProvider(
        config.local || { baseUrl: 'http://localhost:11434', model: 'llama3' }
      );
  }

  return cachedClient;
}

/**
 * Get the singleton AI client. Throws if not yet initialized.
 */
export function getAIClient(): AIClient {
  if (!cachedClient) {
    throw new Error(
      '[AI] AI client not initialized. Call createAIClient() first, or use initAIFromEnv().'
    );
  }
  return cachedClient;
}

/**
 * Reset the cached client (useful for testing or switching providers at runtime).
 */
export function resetAIClient(): void {
  cachedClient = null;
  cachedConfig = null;
  console.log('[AI] AI client cache cleared');
}

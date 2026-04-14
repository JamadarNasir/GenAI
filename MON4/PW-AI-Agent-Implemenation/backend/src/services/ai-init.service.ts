/**
 * AI Initializer — Bridges the backend envConfig with the AI layer.
 *
 * This is the single place where the backend creates and configures
 * the AI client using environment variables. The AI layer itself
 * remains decoupled from the backend's env.config.
 */
import { createAIClient, getAIClient, resetAIClient, AIFactoryConfig } from '../../../ai';
import type { AIClient } from '../../../ai';
import { envConfig } from '../config/env.config';

/**
 * Initialize the AI client from backend environment config.
 * Call this once at server startup.
 */
export function initAIFromEnv(): AIClient {
  const config: AIFactoryConfig = {
    provider: envConfig.aiProvider as AIFactoryConfig['provider'],
    openai: {
      apiKey: envConfig.openaiApiKey,
      model: envConfig.openaiModel,
    },
    azure: {
      endpoint: envConfig.azureOpenaiEndpoint,
      apiKey: envConfig.azureOpenaiKey,
      deployment: envConfig.azureOpenaiDeployment,
    },
    local: {
      baseUrl: envConfig.localLlmUrl,
      model: envConfig.localLlmModel,
    },
  };

  return createAIClient(config);
}

/**
 * Re-export getAIClient for convenience so other backend services
 * can just import from this file.
 */
export { getAIClient, resetAIClient };
export type { AIClient };

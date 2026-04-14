/**
 * AI / LLM Layer — Unified exports.
 *
 * Usage:
 *   import { getAIClient } from '../ai';
 *   const ai = getAIClient();
 *   const result = await ai.generateCompletion('...');
 */

// ─── Core Interface ──────────────────────────────────
export type {
  AIClient,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from './ai-client';

// ─── Factory ─────────────────────────────────────────
export {
  createAIClient,
  getAIClient,
  resetAIClient,
} from './ai-client.factory';
export type { AIProviderType, AIFactoryConfig } from './ai-client.factory';

// ─── Providers (direct imports if needed) ────────────
export { OpenAIProvider } from './providers/openai.provider';
export type { OpenAIProviderConfig } from './providers/openai.provider';
export { AzureOpenAIProvider } from './providers/azure-openai.provider';
export type { AzureOpenAIProviderConfig } from './providers/azure-openai.provider';
export { LocalLLMProvider } from './providers/local-llm.provider';
export type { LocalLLMProviderConfig } from './providers/local-llm.provider';

// ─── Prompt Utilities ────────────────────────────────
export {
  buildFailureContext,
  loadPromptTemplate,
} from './prompts/failure-context-builder';

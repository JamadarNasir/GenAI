/**
 * AIClient — Abstract interface for all LLM providers.
 *
 * All providers (OpenAI, Azure, Local) must implement this interface
 * so the rest of the codebase can call LLM functions without knowing
 * which provider is active.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;       // 0.0 – 2.0 (default: 0.3 for deterministic output)
  maxTokens?: number;         // Max tokens in the response
  topP?: number;              // Nucleus sampling
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];            // Stop sequences
}

export interface AICompletionResult {
  content: string;            // The generated text
  model: string;              // Model that produced the response
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;       // 'stop' | 'length' | 'content_filter' etc.
}

export interface AIClient {
  /**
   * Human-readable name of this provider.
   */
  readonly providerName: string;

  /**
   * Generate a completion from a single prompt with an optional system prompt.
   */
  generateCompletion(
    prompt: string,
    systemPrompt?: string,
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;

  /**
   * Generate a completion from a full message array (multi-turn).
   */
  generateChatCompletion(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;

  /**
   * Validate that the provider is configured correctly (API key, endpoint, etc.)
   */
  validateConfig(): Promise<boolean>;
}

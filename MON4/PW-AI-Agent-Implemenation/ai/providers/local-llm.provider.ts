import {
  AIClient,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from '../ai-client';

export interface LocalLLMProviderConfig {
  baseUrl: string;
  model: string;
}

/**
 * LocalLLMProvider — Ollama / self-hosted LLM via REST API.
 *
 * Ollama exposes a compatible OpenAI-style chat completions endpoint at:
 *   POST http://localhost:11434/api/chat
 *
 * Also supports the OpenAI-compatible endpoint at:
 *   POST http://localhost:11434/v1/chat/completions
 */
export class LocalLLMProvider implements AIClient {
  readonly providerName = 'Local LLM (Ollama)';
  private baseUrl: string;
  private model: string;

  constructor(config: LocalLLMProviderConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;

    console.log(
      `[AI] Local LLM provider initialized — model: ${this.model}, url: ${this.baseUrl}`
    );
  }

  async generateCompletion(
    prompt: string,
    systemPrompt?: string,
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    const messages: AIMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    return this.generateChatCompletion(messages, options);
  }

  async generateChatCompletion(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult> {
    // Use Ollama's OpenAI-compatible endpoint
    const url = `${this.baseUrl}/v1/chat/completions`;

    const body = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
      stream: false,
      ...(options?.stop && { stop: options.stop }),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Local LLM request failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      model: data.model || this.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: choice?.finish_reason || 'stop',
    };
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn('[AI] Local LLM server responded with error');
        return false;
      }

      const data = await response.json() as any;
      const models = data.models?.map((m: any) => m.name) || [];
      console.log(`[AI] Local LLM available models: ${models.join(', ')}`);

      if (!models.some((m: string) => m.includes(this.model))) {
        console.warn(
          `[AI] Configured model "${this.model}" not found. Available: ${models.join(', ')}`
        );
      }

      console.log('[AI] Local LLM configuration validated successfully');
      return true;
    } catch (error: any) {
      console.error(
        `[AI] Local LLM validation failed — is Ollama running at ${this.baseUrl}?`,
        error.message
      );
      return false;
    }
  }
}

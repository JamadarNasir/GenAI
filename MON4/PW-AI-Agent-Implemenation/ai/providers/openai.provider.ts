import OpenAI from 'openai';
import {
  AIClient,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from '../ai-client';

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
}

/**
 * OpenAI Provider — GPT-4o / GPT-4 / GPT-3.5-turbo
 */
export class OpenAIProvider implements AIClient {
  readonly providerName = 'OpenAI';
  private client: OpenAI;
  private model: string;
  private apiKey: string;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    console.log(`[AI] OpenAI provider initialized — model: ${this.model}`);
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
      frequency_penalty: options?.frequencyPenalty ?? 0,
      presence_penalty: options?.presencePenalty ?? 0,
      ...(options?.stop && { stop: options.stop }),
    });

    const choice = response.choices[0];

    return {
      content: choice.message?.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || 'unknown',
    };
  }

  async validateConfig(): Promise<boolean> {
    if (!this.apiKey || this.apiKey === 'sk-...' || this.apiKey === 'sk-your-key-here') {
      console.warn('[AI] OpenAI API key is not configured');
      return false;
    }

    try {
      // Quick validation — list models
      await this.client.models.list();
      console.log('[AI] OpenAI configuration validated successfully');
      return true;
    } catch (error: any) {
      console.error('[AI] OpenAI validation failed:', error.message);
      return false;
    }
  }
}

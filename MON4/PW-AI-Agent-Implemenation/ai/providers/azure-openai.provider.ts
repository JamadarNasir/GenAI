import { AzureOpenAI } from 'openai';
import {
  AIClient,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
} from '../ai-client';

export interface AzureOpenAIProviderConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion?: string;
}

/**
 * Azure OpenAI Provider — Uses Azure-hosted OpenAI endpoints.
 */
export class AzureOpenAIProvider implements AIClient {
  readonly providerName = 'Azure OpenAI';
  private client: AzureOpenAI;
  private deployment: string;
  private endpoint: string;
  private apiKey: string;

  constructor(config: AzureOpenAIProviderConfig) {
    this.deployment = config.deployment;
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;

    this.client = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion || '2024-08-01-preview',
      deployment: this.deployment,
    });

    console.log(
      `[AI] Azure OpenAI provider initialized — deployment: ${this.deployment}, endpoint: ${config.endpoint}`
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
    const response = await this.client.chat.completions.create({
      model: this.deployment,
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
    if (!this.endpoint || !this.apiKey) {
      console.warn('[AI] Azure OpenAI endpoint or key is not configured');
      return false;
    }

    try {
      // Quick validation — send a minimal request
      await this.client.chat.completions.create({
        model: this.deployment,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      console.log('[AI] Azure OpenAI configuration validated successfully');
      return true;
    } catch (error: any) {
      console.error('[AI] Azure OpenAI validation failed:', error.message);
      return false;
    }
  }
}

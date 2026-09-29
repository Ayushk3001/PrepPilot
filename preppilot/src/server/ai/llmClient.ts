import OpenAI from 'openai';

export const DEFAULT_API_KEY =
  process.env.OPENAI_API_KEY || '';

export const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || 'https://aicredits.in/v1';

export const DEFAULT_MODEL =
  process.env.OPENAI_MODEL || 'openai/gpt-5-nano';

/**
 * Creates and returns an OpenAI client configured for the aicredits.in endpoint.
 */
export function getOpenAIClient(customApiKey?: string, customBaseUrl?: string): OpenAI {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey : DEFAULT_API_KEY;
  const baseURL = (customBaseUrl && customBaseUrl.trim().length > 0) ? customBaseUrl : DEFAULT_BASE_URL;

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

export interface ChatOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
  stream?: boolean;
  apiKey?: string;
  baseURL?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Helper to run chat completions against the configured endpoint.
 */
export async function executeChatCompletion(options: ChatOptions) {
  const client = getOpenAIClient(options.apiKey, options.baseURL);
  const model = options.model || DEFAULT_MODEL;

  const params: any = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
  };

  if (options.responseFormat === 'json_object') {
    params.response_format = { type: 'json_object' };
  }

  if (options.stream) {
    params.stream = true;
    return await client.chat.completions.create(params, {
      timeout: options.timeoutMs,
      maxRetries: options.maxRetries,
    });
  }

  return await client.chat.completions.create(params, {
    timeout: options.timeoutMs,
    maxRetries: options.maxRetries,
  });
}

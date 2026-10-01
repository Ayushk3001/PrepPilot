import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionCreateParams } from 'openai/resources/chat/completions';

export const DEFAULT_BASE_URL = 'https://aicredits.in/v1';
export const DEFAULT_MODEL = 'gpt-5-nano';

/**
 * Creates and returns an OpenAI client configured for the API endpoint.
 * Evaluates process.env dynamically at call time so runtime environment variables are never stale.
 */
export function getOpenAIClient(customApiKey?: string, customBaseUrl?: string): OpenAI {
  const apiKey = (customApiKey && customApiKey.trim().length > 0)
    ? customApiKey
    : (process.env.OPENAI_API_KEY || '');
  const baseURL = (customBaseUrl && customBaseUrl.trim().length > 0)
    ? customBaseUrl
    : (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL);

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
  maxOutputTokens?: number;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  component?: string;
  requestId?: string;
  sessionId?: string;
  questionNumber?: number;
  caller?: string;
  langGraphNode?: string;
  purpose?: string;
  questionSource?: 'llm' | 'fallback';
}

export interface ProviderContentPart {
  type?: string;
  text?: string;
  content?: string;
}

export interface ProviderMessage {
  content?: string | ProviderContentPart[] | null;
  output_text?: string | null;
  [key: string]: unknown;
}

export interface ProviderChoice {
  finish_reason?: string | null;
  message?: ProviderMessage;
  text?: string | null;
  [key: string]: unknown;
}

export interface ProviderUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number; [key: string]: unknown };
}

export interface ProviderResponse {
  choices?: ProviderChoice[];
  output_text?: string | null;
  output?: Array<Record<string, unknown>>;
  usage?: ProviderUsage;
  model?: string;
  _request_id?: string;
  request_id?: string;
  [key: string]: unknown;
}

function asProviderResponse(response: unknown): ProviderResponse {
  return response && typeof response === 'object' ? response as ProviderResponse : {};
}

/** Extract assistant text across OpenAI-compatible response shapes. */
export function extractChatCompletionContent(response: unknown): string {
  const value = asProviderResponse(response);
  const choice = value?.choices?.[0];
  const message = choice?.message;
  const candidates = [
    message?.content,
    message?.output_text,
    choice?.text,
    value?.output_text,
    ...(Array.isArray(value?.output) ? value.output.flatMap((item) => {
      const content = item.content;
      const text = item.text;
      return Array.isArray(content) ? content : content || text || [];
    }) : []),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (Array.isArray(candidate)) {
      const text = candidate.map((part: string | ProviderContentPart) => typeof part === 'string' ? part : part.text || part.content || '').join('').trim();
      if (text) return text;
    }
  }
  return '';
}

export function getChatCompletionContentLocations(response: unknown): string[] {
  const value = asProviderResponse(response);
  const choice = value?.choices?.[0];
  const message = choice?.message;
  const locations: string[] = [];
  if (typeof message?.content === 'string' && message.content.trim()) locations.push('choices[0].message.content');
  if (Array.isArray(message?.content) && message.content.length) locations.push('choices[0].message.content[]');
  if (typeof message?.output_text === 'string' && message.output_text.trim()) locations.push('choices[0].message.output_text');
  if (typeof choice?.text === 'string' && choice.text.trim()) locations.push('choices[0].text');
  if (typeof value?.output_text === 'string' && value.output_text.trim()) locations.push('output_text');
  if (Array.isArray(value?.output) && value.output.length) locations.push('output[]');
  return locations;
}

/**
 * Helper to run chat completions against the configured endpoint.
 */
export async function executeChatCompletion(options: ChatOptions) {
  const client = getOpenAIClient(options.apiKey, options.baseURL);
  const model = options.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const params = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
  } as ChatCompletionCreateParams;

  if (options.responseFormat === 'json_object') {
    params.response_format = { type: 'json_object' };
  }
  const defaultOutputTokens = options.purpose === 'answer_evaluation'
    ? 1500
    : options.purpose === 'interview_question_generation' ? 400
      : options.purpose === 'resume_context_processing' ? 2400 : 1200;
  // max_completion_tokens is accepted by the GPT-5-compatible provider and
  // prevents long reasoning/verbosity from consuming the request budget.
  params.max_completion_tokens = options.maxOutputTokens ?? defaultOutputTokens;
  // Reasoning models can consume the entire completion budget before emitting
  // visible JSON. Keep question generation deliberately low-reasoning so the
  // bounded completion budget is reserved for the requested question.
  if (options.reasoningEffort) params.reasoning_effort = options.reasoningEffort;

  const reqOpts: { timeout?: number; maxRetries?: number } = {};
  if (typeof options.timeoutMs === 'number') {
    reqOpts.timeout = options.timeoutMs;
  }
  // All application-level calls are single-attempt. Callers must opt into a
  // retry deliberately; this prevents SDK retries from multiplying usage.
  reqOpts.maxRetries = options.maxRetries ?? 0;

  if (options.stream) (params as { stream?: boolean }).stream = true;

  const startedAt = Date.now();
  try {
    const result = await client.chat.completions.create(params, reqOpts) as ChatCompletion & { request_id?: string };
    const responseObject = asProviderResponse(result);
    const usage = responseObject.usage;
    const reasoningTokens = usage?.completion_tokens_details && typeof usage.completion_tokens_details.reasoning_tokens === 'number'
      ? usage.completion_tokens_details.reasoning_tokens
      : undefined;
    const providerContent = extractChatCompletionContent(result);
    const firstChoice = responseObject?.choices?.[0];
    const message = firstChoice?.message;
    // This module is also imported by browser-shared interviewer code, so it
    // must not import LangSmith's Node-only tracing implementation.
    console.info('[LLM_DIAGNOSTIC]', JSON.stringify({
      event: 'llm_success',
      component: options.component || 'chat-completion',
      request_id: options.requestId,
      model,
      max_output_tokens: params.max_completion_tokens,
      reasoning_effort: options.reasoningEffort,
      provider_host: (() => { try { return new URL(options.baseURL || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).host; } catch { return 'invalid-provider-url'; } })(),
      latency_ms: Date.now() - startedAt,
      provider_response_received: true,
      finish_reason: responseObject.choices?.[0]?.finish_reason,
      response_type: typeof result,
      top_level_keys: responseObject && typeof responseObject === 'object' ? Object.keys(responseObject).slice(0, 30) : [],
      choices_count: Array.isArray(responseObject?.choices) ? responseObject.choices.length : 0,
      choice_keys: firstChoice && typeof firstChoice === 'object' ? Object.keys(firstChoice).slice(0, 20) : [],
      message_keys: message && typeof message === 'object' ? Object.keys(message).slice(0, 20) : [],
      content_type: typeof message?.content,
      content_length: typeof message?.content === 'string' ? message.content.length : Array.isArray(message?.content) ? message.content.length : 0,
      raw_response_length: providerContent.length,
      visible_output_estimate: typeof usage?.completion_tokens === 'number' && typeof reasoningTokens === 'number'
        ? Math.max(0, usage.completion_tokens - reasoningTokens)
        : undefined,
      raw_response_preview: providerContent.slice(0, 240),
      content_locations: getChatCompletionContentLocations(result),
      usage: usage ? { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, total_tokens: usage.total_tokens, completion_tokens_details: usage.completion_tokens_details } : undefined,
    }));
    console.info('[LLM_CALL]', JSON.stringify({
      request_id: options.requestId,
      session_id: options.sessionId,
      question_number: options.questionNumber,
      caller: options.caller || options.component || 'unknown',
      langgraph_node: options.langGraphNode,
      purpose: options.purpose || options.component || 'chat-completion',
      model,
      max_output_tokens: params.max_completion_tokens,
      reasoning_effort: options.reasoningEffort,
      attempt_number: 1,
      input_tokens: usage?.prompt_tokens,
      output_tokens: usage?.completion_tokens,
      total_tokens: usage?.total_tokens,
      latency_ms: Date.now() - startedAt,
      status: 'success',
      finish_reason: responseObject.choices?.[0]?.finish_reason,
      raw_response_length: providerContent.length,
      provider_request_id: responseObject._request_id || responseObject.request_id,
      question_source: options.questionSource,
    }));
    return result;
  } catch (error) {
    const errorObject = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown; type?: unknown; name?: unknown; request_id?: unknown } : {};
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const fallbackReason = message.includes('timeout') || message.includes('timed out') ? 'timeout'
      : message.includes('401') || message.includes('403') || message.includes('api key') || message.includes('authentication') ? 'missing_or_invalid_api_key'
        : 'provider_request_failure';
    console.info('[LLM_DIAGNOSTIC]', JSON.stringify({
      event: 'llm_failure',
      component: options.component || 'chat-completion',
      request_id: options.requestId,
      model,
      latency_ms: Date.now() - startedAt,
      provider_response_received: false,
      fallback_reason: fallbackReason,
      error_type: typeof errorObject?.name === 'string' ? errorObject.name : error instanceof Error ? error.constructor.name : 'unknown',
      http_status: typeof errorObject?.status === 'number' ? errorObject.status : undefined,
      error_code: typeof errorObject?.code === 'string' ? errorObject.code : undefined,
    }));
    console.info('[LLM_CALL]', JSON.stringify({
      request_id: options.requestId,
      session_id: options.sessionId,
      question_number: options.questionNumber,
      caller: options.caller || options.component || 'unknown',
      langgraph_node: options.langGraphNode,
      purpose: options.purpose || options.component || 'chat-completion',
      model,
      attempt_number: 1,
      latency_ms: Date.now() - startedAt,
      status: 'error',
      provider_request_id: errorObject.request_id,
      error_type: typeof errorObject?.name === 'string' ? errorObject.name : error instanceof Error ? error.constructor.name : 'unknown',
      http_status: typeof errorObject?.status === 'number' ? errorObject.status : undefined,
      fallback_reason: fallbackReason,
      question_source: options.questionSource,
    }));
    throw error;
  }
}

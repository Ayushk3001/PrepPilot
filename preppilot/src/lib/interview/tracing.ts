import { traceable } from 'langsmith/traceable';

export function isLangSmithEnabled(): boolean {
  return process.env.LANGSMITH_TRACING?.toLowerCase() === 'true' && Boolean(process.env.LANGSMITH_API_KEY);
}

function providerHost(baseUrl?: string): string {
  try {
    return new URL(baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').host;
  } catch {
    return 'invalid-provider-url';
  }
}

function classifyError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
  if (message.includes('401') || message.includes('403') || message.includes('api key') || message.includes('authentication')) return 'missing_or_invalid_api_key';
  if (message.includes('429') || message.includes('500') || message.includes('502') || message.includes('503') || message.includes('network') || message.includes('fetch')) return 'provider_request_failure';
  return 'other';
}

function emitDiagnostic(event: Record<string, unknown>): void {
  // Deliberately contains metadata only. Never add prompts, answers, keys, or raw errors here.
  console.info('[LLM_DIAGNOSTIC]', JSON.stringify(event));
}

/**
 * Trace provider calls made by feature routes such as the planning roadmap and
 * self-assessment generator. Inputs are intentionally reduced to message
 * roles/lengths so candidate answers are not copied into observability.
 */
export async function traceLlmCall<T>(
  name: string,
  messages: Array<{ role?: string; content?: string }>,
  run: () => Promise<T>,
  options?: { model?: string; baseURL?: string; requestId?: string; metadata?: Record<string, unknown> },
): Promise<T> {
  const startedAt = Date.now();
  const project = process.env.LANGSMITH_PROJECT || 'cadence';
  const baseMetadata = {
    component: name,
    request_id: options?.requestId,
    model: options?.model || process.env.OPENAI_MODEL || 'unknown',
    provider_host: providerHost(options?.baseURL),
    langsmith_project: project,
  };

  try {
    const result = !isLangSmithEnabled()
      ? await run()
      : await traceable(run, {
        name,
        run_type: 'llm',
        project_name: project,
        tags: ['cadence', 'llm', name],
        metadata: {
          environment: process.env.NODE_ENV || 'development',
          message_count: messages.length,
          message_roles: messages.map((message) => message.role || 'unknown'),
          component: name,
          request_id: options?.requestId,
          ...(options?.metadata || {}),
        },
        processInputs: () => ({
          messages: messages.map((message) => ({ role: message.role, content_length: message.content?.length || 0 })),
        }),
        processOutputs: (output: unknown) => ({
          model: typeof output === 'object' && output !== null && 'model' in output ? output.model : undefined,
          usage: typeof output === 'object' && output !== null && 'usage' in output ? output.usage : undefined,
        }),
      })();

    const usage = typeof result === 'object' && result !== null && 'usage' in result ? (result as any).usage : undefined;
    emitDiagnostic({
      ...baseMetadata,
      event: 'llm_success',
      latency_ms: Date.now() - startedAt,
      provider_response_received: true,
      provider_request_id: typeof result === 'object' && result !== null ? (result as any)._request_id || (result as any).request_id : undefined,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      } : undefined,
      langsmith_enabled: isLangSmithEnabled(),
      langsmith_run_type: isLangSmithEnabled() ? 'llm' : 'disabled',
    });
    return result;
  } catch (error) {
    emitDiagnostic({
      ...baseMetadata,
      event: 'llm_failure',
      latency_ms: Date.now() - startedAt,
      provider_response_received: false,
      provider_request_id: (error as any)?.request_id,
      fallback_reason: classifyError(error),
      langsmith_enabled: isLangSmithEnabled(),
      langsmith_run_type: isLangSmithEnabled() ? 'llm' : 'disabled',
    });
    throw error;
  }
}

/**
 * Traces non-provider stages without misclassifying parsing, validation, or
 * fallback work as an LLM call. Inputs are intentionally redacted.
 */
export async function traceInterviewStage<T>(
  name: string,
  run: () => Promise<T> | T,
  metadata: Record<string, unknown> = {},
): Promise<T> {
  if (!isLangSmithEnabled()) return run();

  const traced = traceable(run, {
    name,
    run_type: 'chain',
    project_name: process.env.LANGSMITH_PROJECT || 'cadence',
    tags: ['cadence', 'interview', name],
    metadata: {
      environment: process.env.NODE_ENV || 'development',
      ...metadata,
    },
    processInputs: () => ({ redacted: true }),
    processOutputs: () => ({ redacted: true }),
  });

  return await traced();
}

/** Runs tracing only when explicitly configured, and redacts resume/answer text. */
export async function traceInterviewRun<T>(
  metadata: { sessionId: string; targetRole: string; interviewRound: string; requestId?: string },
  run: () => Promise<T>,
): Promise<T> {
  if (!isLangSmithEnabled()) return run();

  const traced = traceable(run, {
    name: 'cadence-interview-turn',
    project_name: process.env.LANGSMITH_PROJECT || 'cadence',
    tags: ['cadence', 'interview'],
    metadata: {
      session_id: metadata.sessionId,
      request_id: metadata.requestId,
      target_role: metadata.targetRole,
      interview_round: metadata.interviewRound,
      environment: process.env.NODE_ENV || 'development',
    },
    processInputs: () => ({ redacted: true }),
    processOutputs: () => ({ redacted: true }),
  });

  // Do not invoke the wrapped operation a second time when the provider fails;
  // retrying here can duplicate an LLM request and trigger concurrency limits.
  return traced();
}

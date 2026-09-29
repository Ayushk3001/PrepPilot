import { traceable } from 'langsmith/traceable';

export function isLangSmithEnabled(): boolean {
  return process.env.LANGSMITH_TRACING === 'true' && Boolean(process.env.LANGSMITH_API_KEY);
}

/** Runs tracing only when explicitly configured, and redacts resume/answer text. */
export async function traceInterviewRun<T>(
  metadata: { sessionId: string; targetRole: string; interviewRound: string },
  run: () => Promise<T>,
): Promise<T> {
  if (!isLangSmithEnabled()) return run();

  const traced = traceable(run, {
    name: 'cadence-interview-turn',
    project_name: process.env.LANGSMITH_PROJECT || 'cadence',
    tags: ['cadence', 'interview'],
    metadata: {
      session_id: metadata.sessionId,
      target_role: metadata.targetRole,
      interview_round: metadata.interviewRound,
      environment: process.env.NODE_ENV || 'development',
    },
    processInputs: () => ({ redacted: true }),
    processOutputs: () => ({ redacted: true }),
  });

  try {
    return await traced();
  } catch {
    // Observability must never interrupt an interview.
    return run();
  }
}

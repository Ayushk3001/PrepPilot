import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { InterviewSessionState } from '@/agents/resumeInterviewerAgent';
import { runInterviewGraph } from '@/lib/interview/graph';

type GraphResult = Awaited<ReturnType<typeof runInterviewGraph>>;
const questionRequestCache = new Map<string, { expiresAt: number; result: Promise<GraphResult> }>();
const QUESTION_CACHE_TTL_MS = 10 * 60_000;

function requestKey(sessionState: InterviewSessionState, lastAnswer?: string, lastEvaluation?: unknown): string {
  const fingerprint = JSON.stringify({
    sessionId: sessionState.sessionId,
    totalQuestionsAsked: sessionState.totalQuestionsAsked,
    coreQuestionsAsked: sessionState.coreQuestionsAsked,
    lastAnswer: lastAnswer || '',
    lastEvaluation: lastEvaluation || null,
  });
  return createHash('sha256').update(fingerprint).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const requestId = req.headers.get('x-request-id') || `question_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const body = await req.json();
    const { sessionState, lastAnswer, lastEvaluation } = body as {
      sessionState: InterviewSessionState;
      lastAnswer?: string;
      lastEvaluation?: any;
    };

    if (!sessionState || !sessionState.resumeKnowledge) {
      return NextResponse.json(
        { error: 'Session state and resume knowledge are required.' },
        { status: 400 }
      );
    }

    const key = requestKey(sessionState, lastAnswer, lastEvaluation);
    const now = Date.now();
    for (const [cachedKey, cached] of questionRequestCache) {
      if (cached.expiresAt <= now) questionRequestCache.delete(cachedKey);
    }

    let cached = questionRequestCache.get(key);
    if (!cached) {
      const result = runInterviewGraph({
        sessionState,
        lastAnswer,
        lastEvaluation,
        requestId,
        nextQuestion: undefined,
        complete: false,
      });
      cached = { expiresAt: now + QUESTION_CACHE_TTL_MS, result };
      questionRequestCache.set(key, cached);
      if (questionRequestCache.size > 500) {
        const oldestKey = questionRequestCache.keys().next().value;
        if (oldestKey) questionRequestCache.delete(oldestKey);
      }
    }
    const graphResult = await cached.result;

    return NextResponse.json({
      nextQuestion: graphResult.nextQuestion,
      sessionState: graphResult.sessionState,
      requestId,
      diagnostic: {
        component: 'interview-question-generation',
        source: graphResult.nextQuestion?.generationSource || 'not_applicable',
        llmAttempted: graphResult.nextQuestion?.llmAttempted ?? false,
        llmSucceeded: graphResult.nextQuestion?.llmSucceeded ?? false,
        fallbackUsed: graphResult.nextQuestion?.generationSource === 'deterministic_fallback',
        fallbackReason: graphResult.nextQuestion?.fallbackReason,
      },
    });
  } catch (err: any) {
    console.error('API /api/interviewer/next-question error:', err);
    return NextResponse.json(
      { error: 'Interviewer agent error', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}

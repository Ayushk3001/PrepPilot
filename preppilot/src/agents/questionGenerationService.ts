import type { InterviewerQuestionOutput } from './resumeInterviewerAgent';

export type QuestionFallbackReason =
  | 'no_api_key'
  | 'browser_deterministic_path'
  | 'invalid_or_unreachable_provider'
  | 'timeout'
  | 'invalid_model_response'
  | 'provider_output_truncated'
  | 'empty_provider_response'
  | 'malformed_structured_output'
  | 'semantic_validation_failed'
  | 'repeated_question';

export interface QuestionGenerationContext {
  round: string;
  targetRole: string;
  difficulty: string;
  resumeTopic?: string;
  previousQuestions?: string[];
  previousAnswer?: string;
}

export interface QuestionGenerationResult {
  question: InterviewerQuestionOutput;
  source: 'llm' | 'fallback';
  llmAttempted: boolean;
  llmSucceeded: boolean;
  fallbackReason?: QuestionFallbackReason;
}

export interface QuestionGenerationDependencies {
  hasApiKey?: boolean;
  isBrowser?: boolean;
  generateWithLlm: () => Promise<InterviewerQuestionOutput>;
  traceFallback?: (fallback: () => InterviewerQuestionOutput, metadata: Record<string, unknown>) => Promise<InterviewerQuestionOutput> | InterviewerQuestionOutput;
  log?: (message: string) => void;
}

const VALID_TYPES = new Set(['behavioral', 'technical', 'situational', 'leadership', 'hr', 'followup', 'role_alignment']);

function normalizeQuestion(value: Partial<InterviewerQuestionOutput>, context: QuestionGenerationContext): InterviewerQuestionOutput {
  const requestedType = String(value.questionType || context.round).toLowerCase();
  const questionType = VALID_TYPES.has(requestedType) ? requestedType : 'behavioral';
  return {
    ...value,
    question: typeof value.question === 'string' ? value.question.trim() : '',
    questionType: questionType as InterviewerQuestionOutput['questionType'],
    round: context.round as InterviewerQuestionOutput['round'],
    source: 'resume',
    competency: value.competency || context.resumeTopic || 'Interview reasoning',
    difficulty: value.difficulty || context.difficulty,
    resumeTopic: value.resumeTopic || context.resumeTopic || context.targetRole,
    reason: value.reason || 'Generated from the validated interview context.',
    expectedCompetency: value.expectedCompetency || value.competency || 'Clear, evidence-based reasoning',
    followUp: typeof value.followUp === 'boolean' ? value.followUp : false,
    evidenceUsed: Array.isArray(value.evidenceUsed) ? value.evidenceUsed.filter(Boolean).slice(0, 6) : [],
  };
}

/**
 * Validates the provider output at the single boundary used by interview flows.
 * A model response is not trusted merely because it parsed as JSON.
 */
export function validateGeneratedQuestion(
  candidate: unknown,
  context: QuestionGenerationContext,
): candidate is InterviewerQuestionOutput {
  if (!candidate || typeof candidate !== 'object') return false;
  const value = candidate as Partial<InterviewerQuestionOutput>;
  if (typeof value.question !== 'string') return false;

  const question = value.question.trim();
  const words = question.split(/\s+/).filter(Boolean);
  if (words.length < 5 || words.length > 60) return false;
  if (!VALID_TYPES.has(String(value.questionType))) return false;
  if (value.round !== context.round || value.source !== 'resume' || typeof value.competency !== 'string' || !value.competency.trim()) return false;
  if (typeof value.resumeTopic !== 'string' || !value.resumeTopic.trim()) return false;
  if (typeof value.reason !== 'string' || !value.reason.trim()) return false;
  if (typeof value.expectedCompetency !== 'string' || !value.expectedCompetency.trim()) return false;
  if (typeof value.followUp !== 'boolean' || !Array.isArray(value.evidenceUsed)) return false;

  // The prompt already supplies the validated resume context. Do not reject a
  // usable question merely because the model refers to an evidence item with
  // pronouns or natural language instead of repeating the exact topic label.
  // Evidence metadata and the question-generation trace retain the grounding.
  const anchors = [context.resumeTopic, context.targetRole, context.round]
    .filter((anchor): anchor is string => Boolean(anchor && anchor.trim()))
    .map(anchor => anchor.toLowerCase());
  const lower = question.toLowerCase();
  const hasContextAnchor = anchors.some(anchor => lower.includes(anchor));
  const isGenericInterviewPrompt = /introduce yourself|career|motivat|role|team|experience|tell me about a time/i.test(question);
  if (!hasContextAnchor && !isGenericInterviewPrompt && question.length < 20) return false;

  const previous = (context.previousQuestions || []).map(item => item.trim().toLowerCase()).filter(Boolean);
  if (previous.includes(lower)) return false;
  return true;
}

function classifyFailure(error: unknown): QuestionFallbackReason {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
  if (message.includes('provider_output_truncated')) return 'provider_output_truncated';
  if (message.includes('empty_provider_response')) return 'empty_provider_response';
  if (message.includes('malformed_structured_output')) return 'malformed_structured_output';
  if (message.includes('semantic_validation_failed')) return 'semantic_validation_failed';
  if (message.includes('json') || message.includes('malformed') || message.includes('invalid_model_response')) return 'invalid_model_response';
  if (message.includes('401') || message.includes('403') || message.includes('api key') || message.includes('authentication')) return 'invalid_or_unreachable_provider';
  return 'invalid_or_unreachable_provider';
}

/**
 * The only policy boundary the interview needs to know about:
 * LLM-first, validated, and automatically backed by the deterministic engine.
 */
export async function generateQuestion(
  context: QuestionGenerationContext,
  fallback: () => InterviewerQuestionOutput,
  dependencies: QuestionGenerationDependencies,
): Promise<QuestionGenerationResult> {
  const log = dependencies.log || ((message: string) => console.info(`[QUESTION_GENERATION] ${message}`));
  const hasApiKey = dependencies.hasApiKey ?? Boolean(process.env.OPENAI_API_KEY?.trim());
  const isBrowser = dependencies.isBrowser ?? typeof window !== 'undefined';
  const runFallback = async (fallbackReason: QuestionFallbackReason) => dependencies.traceFallback
    ? dependencies.traceFallback(fallback, {
      question_source: 'fallback',
      fallback_reason: fallbackReason,
      interview_type: context.round,
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
    })
    : fallback();

  if (isBrowser) {
    const question = await runFallback('browser_deterministic_path');
    log('question_source=fallback fallback_reason=browser_deterministic_path');
    return { question, source: 'fallback', llmAttempted: false, llmSucceeded: false, fallbackReason: 'browser_deterministic_path' };
  }

  if (!hasApiKey) {
    const question = await runFallback('no_api_key');
    log('question_source=fallback fallback_reason=no_api_key');
    return { question, source: 'fallback', llmAttempted: false, llmSucceeded: false, fallbackReason: 'no_api_key' };
  }

  try {
    const question = normalizeQuestion(await dependencies.generateWithLlm(), context);
    const validationSuccess = validateGeneratedQuestion(question, context);
    log(`question_validation validation_success=${validationSuccess}`);
    if (!validationSuccess) {
      throw new Error('invalid_model_response');
    }
    log('question_source=llm');
    return { question, source: 'llm', llmAttempted: true, llmSucceeded: true };
  } catch (error) {
    const fallbackReason = classifyFailure(error);
    const question = await runFallback(fallbackReason);
    // Do not include the error text: provider errors can contain sensitive data.
    log(`question_source=fallback fallback_reason=${fallbackReason}`);
    return { question, source: 'fallback', llmAttempted: true, llmSucceeded: false, fallbackReason };
  }
}

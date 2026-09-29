/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CandidateProfile, InterviewQuestion, SpeechMetrics, CoachingFeedback,
  AgentTraceMessage, CommunicationFeedback, ContentFeedback, StarAnalysis,
} from '@/types/interview';
import { executeChatCompletion, extractChatCompletionContent, getChatCompletionContentLocations } from '@/server/ai/llmClient';
import type { ChatOptions } from '@/server/ai/llmClient';
import { traceLlmCall } from '@/lib/interview/tracing';
import { CommunicationAnalysisAgent, CommunicationAgentOutput } from './communicationAnalysisAgent';
import { ContentEvaluationAgent, ContentAgentOutput } from './contentEvaluationAgent';
import { StarStructureAgent, StarAgentOutput } from './starStructureAgent';
import { InterviewCoachAgent, CoachAgentOutput } from './interviewCoachAgent';
import { QuestionAgentOutput } from './interviewQuestionAgent';

export type EvaluationSource = 'llm' | 'deterministic_fallback';
export type ExecutionSource = EvaluationSource | 'mixed';

// Three specialists run in parallel, then Coach runs once. Keeping each
// provider leg below 10 seconds leaves room for the next-question request and
// keeps question-to-question latency comfortably below 40 seconds.
// The configured provider's successful calls in LangSmith took 9.2–15.1s.
// Nine seconds caused valid requests to be classified as failures.
export const EVALUATION_LLM_TIMEOUT_MS = 20_000;

export interface MultiAgentExecutionResult {
  feedback: CoachingFeedback;
  traces: AgentTraceMessage[];
  modelUsed: string;
  executionTimeMs: number;
  executionSource: ExecutionSource;
  llmAttempted: boolean;
  llmSucceeded: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
  agentSources: { communication: EvaluationSource; content: EvaluationSource; star: EvaluationSource; coach: EvaluationSource };
}

export interface EvaluationDependencies {
  complete?: (options: ChatOptions) => Promise<any>;
}

const clampScore = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 0;
};
const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const object = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null && !Array.isArray(value);

function parseJsonResponse(response: any): any {
  const finishReason = response?.choices?.[0]?.finish_reason || 'unknown';
  const content = extractChatCompletionContent(response);
  if (finishReason === 'length') throw new Error('provider_output_truncated');
  if (!content) throw new Error('empty_provider_response');
  try {
    return JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
  } catch {
    throw new Error('malformed_structured_output');
  }
}

function reasonForError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('timeout') || message.includes('timed out')) return 'provider_timeout';
  if (message.includes('provider_output_truncated')) return 'provider_output_truncated';
  if (message.includes('empty_provider_response')) return 'empty_provider_response';
  if (message.includes('malformed_structured_output') || message.includes('json')) return 'malformed_structured_output';
  if (message.includes('schema_validation_failed') || message.includes('invalid_model_response')) return 'schema_validation_failed';
  if (message.includes('401') || message.includes('403') || message.includes('api key') || message.includes('authentication')) return 'provider_error';
  return 'provider_error';
}

export function calculateCanonicalOverall(scores: { relevance: number; clarity: number; structure: number; completeness: number; communication: number }): number {
  return Math.round(scores.relevance * 0.20 + scores.clarity * 0.20 + scores.structure * 0.25 + scores.completeness * 0.15 + scores.communication * 0.20);
}

function deterministicQuestionOutput(question: InterviewQuestion): QuestionAgentOutput {
  return {
    question: {
      ...(question as any), question: question.question, expectedCompetency: question.competency,
      evaluationCriteria: question.evaluationCriteria, modelPoints: question.expectedCompetencies,
      focus: question.expectedCompetencies, durationSec: 150,
      expectSTAR: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based', followUps: [],
    },
    expectedCompetency: question.competency, evaluationCriteria: question.evaluationCriteria,
    metadata: { role: question.role, competency: question.competency, difficulty: question.difficulty, durationSec: 150,
      expectSTAR: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based', tailoredToProfile: false, matchingSignals: [] },
  } as QuestionAgentOutput;
}

function communicationPrompt(question: InterviewQuestion, answer: string, speech?: SpeechMetrics): string {
  return `You are the Communication Agent. Analyze this answer semantically for clarity, conciseness, tone, and communication quality. Objective measurements are authoritative for filler count, hedging, word count, sentence length, WPM, and pauses. Do not invent evidence. Return ONLY JSON with scores 0-100.
Question: ${question.question}
Answer: ${answer}
Speech metrics: ${JSON.stringify(speech || null)}
Schema: {"clarityScore":0,"concisenessScore":0,"communicationQualityScore":0,"tone":"Professional & Confident","strengths":[""],"improvements":[""],"fillerWordCritique":"","pacingCritique":""}`;
}
function contentPrompt(question: InterviewQuestion, answer: string): string {
  return `You are the Content Evaluation Agent. Analyze relevance, completeness, technical depth, accuracy, and evidence against the exact question and rubric. Return ONLY JSON with every score from 0 to 100. Do not invent evidence.
Question: ${question.question}
Expected competencies: ${JSON.stringify(question.expectedCompetencies)}
Evaluation criteria: ${JSON.stringify(question.evaluationCriteria)}
Answer: ${answer}
Schema: {"relevanceScore":0,"technicalDepthScore":0,"accuracyScore":0,"completenessScore":0,"demonstratedCompetencies":[""],"missedKeyPoints":[""],"groundedEvidenceQuotes":[""]}`;
}
function starPrompt(question: InterviewQuestion, answer: string): string {
  return `You are the STAR Structure Agent. Semantically identify Situation, Task, Action, and Result in the answer. Do not invent evidence. Return ONLY JSON with scores from 0 to 100.
Question: ${question.question}
Answer: ${answer}
Schema: {"situation":{"present":false,"snippet":"","score":0,"critique":""},"task":{"present":false,"snippet":"","score":0,"critique":""},"action":{"present":false,"snippet":"","score":0,"critique":""},"result":{"present":false,"snippet":"","score":0,"critique":"","quantifiable":false},"overallStarScore":0}`;
}
function coachPrompt(question: InterviewQuestion, answer: string, comm: CommunicationAgentOutput, content: ContentAgentOutput, star: StarAgentOutput): string {
  return `You are the Interview Coach Agent. Synthesize the three specialist outputs into actionable coaching. Do not change or return a final numeric overall score; the application computes that deterministically. Return ONLY JSON.
Question: ${question.question}
Answer: ${answer}
Communication: ${JSON.stringify(comm)}
Content: ${JSON.stringify(content)}
STAR: ${JSON.stringify(star)}
Schema: {"strengths":[""],"areasForImprovement":[""],"improvedModelAnswer":"","answerRewriteGuidance":[""],"adaptiveFollowUpQuestion":{"question":"","intent":"","probingArea":""},"personalizedImprovementPlan":{"immediateFix":"","mediumTermPractice":"","recommendedFramework":""},"curatedResources":[],"recurringGapsIdentified":[""]}`;
}

function unifiedEvaluationPrompt(question: InterviewQuestion, answer: string, speech?: SpeechMetrics): string {
  return `Evaluate the candidate's interview answer using the question and rubric. Return ONLY valid JSON matching this compact schema; no chain-of-thought, reasoning, explanation, Markdown, code fences, preamble, repeated question, or repeated answer. Scores use the application's 0-100 scale. strengths and improvements must contain at most 2 short items. feedback must be at most 2 short sentences.
Question: ${question.question}
Expected competencies: ${JSON.stringify(question.expectedCompetencies)}
Evaluation criteria: ${JSON.stringify(question.evaluationCriteria)}
Answer: ${answer}
Speech metrics: ${JSON.stringify(speech || null)}
Schema: {"content_score":0,"communication_score":0,"star_score":0,"relevance_score":0,"technical_depth_score":0,"completeness_score":0,"strengths":[""],"improvements":[""],"feedback":""}`;
}

function validUnified(value: any): boolean {
  return object(value)
    && ['content_score', 'communication_score', 'star_score', 'relevance_score', 'technical_depth_score', 'completeness_score'].every((key) => isScore(value[key]))
    && strings(value.strengths) && value.strengths.length <= 2
    && strings(value.improvements) && value.improvements.length <= 2
    && typeof value.feedback === 'string' && value.feedback.trim().length > 0;
}

function normalizeUnified(value: any): any {
  const strengths = value.strengths.slice(0, 2);
  const improvements = value.improvements.slice(0, 2);
  const score = clampScore(value.star_score);
  const starPart = (label: string) => ({ present: score > 0, snippet: '', score, critique: `${label} assessed from the candidate answer.` });
  return {
    communication: {
      clarityScore: value.communication_score, concisenessScore: value.communication_score,
      communicationQualityScore: value.communication_score, tone: 'Professional & Confident', strengths,
      improvements, fillerWordCritique: value.feedback, pacingCritique: value.feedback,
    },
    content: {
      relevanceScore: value.relevance_score, technicalDepthScore: value.technical_depth_score,
      accuracyScore: value.content_score, completenessScore: value.completeness_score,
      demonstratedCompetencies: strengths, missedKeyPoints: improvements, groundedEvidenceQuotes: [],
    },
    star: { situation: starPart('Situation'), task: starPart('Task'), action: starPart('Action'), result: { ...starPart('Result'), quantifiable: /\d+%?|\$|ms|qps|users/i.test(value.feedback) }, overallStarScore: value.star_score },
    coach: {
      strengths, areasForImprovement: improvements, improvedModelAnswer: value.feedback,
      answerRewriteGuidance: improvements,
      adaptiveFollowUpQuestion: { question: improvements[0] || 'What measurable result did your approach achieve?', intent: 'Probe the weakest evidence area.', probingArea: 'Evidence and impact' },
      personalizedImprovementPlan: { immediateFix: improvements[0] || 'Make your personal contribution explicit.', mediumTermPractice: 'Practice concise evidence-based answers.', recommendedFramework: 'STAR' },
      curatedResources: [], recurringGapsIdentified: improvements,
    },
  };
}

function validCommunication(value: any): boolean {
  return object(value) && isScore(value.clarityScore) && isScore(value.concisenessScore) && isScore(value.communicationQualityScore) && typeof value.tone === 'string' && strings(value.strengths) && strings(value.improvements) && typeof value.fillerWordCritique === 'string' && typeof value.pacingCritique === 'string';
}
function validContent(value: any): boolean {
  return object(value) && isScore(value.relevanceScore) && isScore(value.technicalDepthScore) && isScore(value.accuracyScore) && isScore(value.completenessScore) && strings(value.demonstratedCompetencies) && strings(value.missedKeyPoints) && strings(value.groundedEvidenceQuotes);
}
function validStarPart(value: any): boolean {
  return object(value) && typeof value.present === 'boolean' && typeof value.snippet === 'string' && isScore(value.score) && typeof value.critique === 'string';
}
function validStar(value: any): boolean {
  return object(value) && validStarPart(value.situation) && validStarPart(value.task) && validStarPart(value.action) && validStarPart(value.result) && typeof value.result.quantifiable === 'boolean' && isScore(value.overallStarScore);
}
function validCoach(value: any): boolean {
  return object(value) && strings(value.strengths) && strings(value.areasForImprovement) && typeof value.improvedModelAnswer === 'string' && strings(value.answerRewriteGuidance) && object(value.adaptiveFollowUpQuestion) && typeof value.adaptiveFollowUpQuestion.question === 'string' && typeof value.adaptiveFollowUpQuestion.intent === 'string' && typeof value.adaptiveFollowUpQuestion.probingArea === 'string' && object(value.personalizedImprovementPlan) && typeof value.personalizedImprovementPlan.immediateFix === 'string' && typeof value.personalizedImprovementPlan.mediumTermPractice === 'string' && typeof value.personalizedImprovementPlan.recommendedFramework === 'string' && Array.isArray(value.curatedResources) && strings(value.recurringGapsIdentified);
}

function mergeCommunication(base: CommunicationAgentOutput, value: any): CommunicationAgentOutput {
  return { ...base, clarity: clampScore(value.clarityScore), conciseness: clampScore(value.concisenessScore), communication_quality: clampScore(value.communicationQualityScore), tone: value.tone, strengths: value.strengths, improvements: value.improvements, evaluationSource: 'llm' };
}
function mergeContent(base: ContentAgentOutput, value: any): ContentAgentOutput {
  return { ...base, relevance: clampScore(value.relevanceScore), technical_depth: clampScore(value.technicalDepthScore), completeness: clampScore(value.completenessScore), strengths: value.demonstratedCompetencies, gaps: value.missedKeyPoints, key_points_covered: value.demonstratedCompetencies, key_points_missed: value.missedKeyPoints, evidence: value.groundedEvidenceQuotes.map((quote: string) => ({ claim: quote, verified: true, category: 'answering_prompt', detail: 'LLM-grounded evidence quote.' })), evaluationSource: 'llm' };
}
function starStatus(part: any): 'strong' | 'detected' | 'weak' | 'missing' { return !part.present ? 'missing' : part.score >= 80 ? 'strong' : 'detected'; }
function mergeStar(base: StarAgentOutput, value: any): StarAgentOutput {
  return { ...base, structure_score: clampScore(value.overallStarScore), starFilled: [value.situation, value.task, value.action, value.result].filter((part) => part.present).length, situation: { status: starStatus(value.situation), evidence: value.situation.snippet || null, critique: value.situation.critique }, task: { status: starStatus(value.task), evidence: value.task.snippet || null, critique: value.task.critique }, action: { status: starStatus(value.action), evidence: value.action.snippet || null, critique: value.action.critique }, result: { status: starStatus(value.result), evidence: value.result.snippet || null, critique: value.result.critique }, evaluationSource: 'llm' };
}

function asCommunicationFeedback(output: CommunicationAgentOutput): CommunicationFeedback {
  return { clarityScore: output.clarity, concisenessScore: output.conciseness, tone: output.tone as CommunicationFeedback['tone'], communicationQualityScore: output.communication_quality, strengths: output.strengths, fillerWordCritique: output.evidence.find((item) => item.type === 'filler')?.critique || 'No filler-word issue detected.', pacingCritique: output.wpm ? `Measured pace: ${output.wpm} WPM.` : 'Pacing assessed from text cadence.' };
}
function asContentFeedback(output: ContentAgentOutput): ContentFeedback {
  return { relevanceScore: output.relevance, technicalDepthScore: output.technical_depth, accuracyScore: output.competency_match, completenessScore: output.completeness, demonstratedCompetencies: output.key_points_covered, missedKeyPoints: output.key_points_missed, groundedEvidenceQuotes: output.evidence.map((item) => item.claim).slice(0, 4) };
}
function asStarAnalysis(output: StarAgentOutput): StarAnalysis {
  const part = (value: any) => ({ present: value.status !== 'missing', snippet: value.evidence || undefined, score: value.status === 'strong' ? 90 : value.status === 'detected' ? 70 : 35, critique: value.critique });
  return { situation: part(output.situation), task: part(output.task), action: part(output.action), result: { ...part(output.result), quantifiable: output.result.evidence ? /\d+%?|\$|ms|qps|users/i.test(output.result.evidence) : false }, overallStarScore: output.structure_score };
}

function buildFeedback(question: InterviewQuestion, comm: CommunicationAgentOutput, content: ContentAgentOutput, star: StarAgentOutput, deterministicCoach: CoachAgentOutput, llmCoach: any | null, sources: MultiAgentExecutionResult['agentSources']): CoachingFeedback {
  const rubricScores = { relevance: clampScore(content.relevance), clarity: clampScore(comm.clarity), responseStructure: clampScore(star.structure_score), completeness: clampScore(content.completeness), communicationQuality: clampScore(comm.communication_quality) };
  const overallScore = calculateCanonicalOverall({ relevance: rubricScores.relevance, clarity: rubricScores.clarity, structure: rubricScores.responseStructure, completeness: rubricScores.completeness, communication: rubricScores.communicationQuality });
  const narrative = llmCoach || {};
  return {
    overallScore, verdict: deterministicCoach.verdict as CoachingFeedback['verdict'], rubricScores,
    strengths: strings(narrative.strengths) && narrative.strengths.length ? narrative.strengths.slice(0, 4) : deterministicCoach.strengths,
    areasForImprovement: strings(narrative.areasForImprovement) && narrative.areasForImprovement.length ? narrative.areasForImprovement.slice(0, 4) : deterministicCoach.improvements,
    starBreakdown: asStarAnalysis(star), communicationAnalysis: asCommunicationFeedback(comm), contentEvaluation: asContentFeedback(content),
    improvedModelAnswer: narrative.improvedModelAnswer || deterministicCoach.improvedAnswer || question.idealStarResponse || '',
    answerRewriteGuidance: strings(narrative.answerRewriteGuidance) && narrative.answerRewriteGuidance.length ? narrative.answerRewriteGuidance : deterministicCoach.actionableAdvice,
    adaptiveFollowUpQuestion: narrative.adaptiveFollowUpQuestion || { question: deterministicCoach.followUpQuestions[0] || 'What measurable result did your approach achieve?', intent: 'Probe the weakest evidence area.', probingArea: 'Evidence and impact' },
    personalizedImprovementPlan: narrative.personalizedImprovementPlan || { immediateFix: 'State your personal action clearly.', mediumTermPractice: 'Practice concise STAR answers.', recommendedFramework: 'STAR' },
    curatedResources: Array.isArray(narrative.curatedResources) ? narrative.curatedResources : [], recurringGapsIdentified: strings(narrative.recurringGapsIdentified) ? narrative.recurringGapsIdentified : deterministicCoach.improvements,
    evaluationSources: sources,
  };
}

export async function runMultiAgentInterviewCoaching(candidateProfile: CandidateProfile, question: InterviewQuestion, candidateResponse: string, speechMetrics?: SpeechMetrics, userApiKey?: string, requestId?: string, dependencies?: EvaluationDependencies): Promise<MultiAgentExecutionResult> {
  const startedAt = Date.now();
  const traces: AgentTraceMessage[] = [];
  const apiKey = userApiKey || process.env.OPENAI_API_KEY || '';
  const model = process.env.OPENAI_MODEL || 'gpt-5-nano';
  const baseURL = process.env.OPENAI_BASE_URL;
  const canUseLlm = Boolean(apiKey.trim());

  // Deterministic signals are always computed and become the per-agent fallback.
  const deterministicComm = await CommunicationAnalysisAgent.execute({ candidateResponse, mode: speechMetrics ? 'voice' : 'text', wpm: speechMetrics?.wordsPerMinute, durationSeconds: speechMetrics?.durationSeconds });
  const deterministicContent = await ContentEvaluationAgent.execute({ question: question as any, candidateResponse, candidateProfile: candidateProfile as any });
  const deterministicStar = await StarStructureAgent.execute({ candidateResponse, expectSTAR: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based' });

  async function callAgent<T>(name: string, prompt: string, validate: (value: any) => boolean): Promise<{ value: T | null; reason?: string }> {
    if (!canUseLlm) return { value: null, reason: 'no_api_key' };
    try {
      const response = await traceLlmCall(name, [{ role: 'system', content: prompt }], () => (dependencies?.complete || executeChatCompletion)({ messages: [{ role: 'system', content: prompt }], responseFormat: 'json_object', model, apiKey, baseURL, component: name, caller: 'interview.evaluate_answer', purpose: 'answer_evaluation', requestId, timeoutMs: EVALUATION_LLM_TIMEOUT_MS, maxRetries: 0, maxOutputTokens: 500, reasoningEffort: 'low' }), { model, baseURL, requestId, metadata: { purpose: 'answer_evaluation', question_source: 'llm' } });
      const choice = response?.choices?.[0];
      const usage = response?.usage;
      const raw = extractChatCompletionContent(response);
      const finishReason = choice?.finish_reason || 'unknown';
      let parsed: any = null;
      let parseStatus = 'failed';
      let validationError: string | undefined;
      try {
        parsed = parseJsonResponse(response);
        parseStatus = 'success';
        if (!validate(parsed)) validationError = 'schema_validation_failed';
      } catch (error) {
        validationError = reasonForError(error);
      }
      console.info('[EVALUATION_PARSE_DIAGNOSTIC]', JSON.stringify({
        request_id: requestId,
        finish_reason: finishReason,
        completion_tokens: usage?.completion_tokens,
        reasoning_tokens: usage?.completion_tokens_details?.reasoning_tokens,
        raw_response_length: raw.length,
        raw_response_preview: raw.slice(0, 240),
        content_locations: getChatCompletionContentLocations(response),
        parse_status: parseStatus,
        validation_success: Boolean(parsed && !validationError),
        validation_error: validationError,
      }));
      if (validationError || !parsed) throw new Error(validationError || 'schema_validation_failed');
      return { value: normalizeUnified(parsed) as T };
    } catch (error) {
      return { value: null, reason: reasonForError(error) };
    }
  }

  // One provider request evaluates all conceptual specialist dimensions. The
  // deterministic agents remain responsible for offline fallback and the
  // logical multi-agent output contract.
  const unified = await callAgent<any>('unified-evaluation', unifiedEvaluationPrompt(question, candidateResponse, speechMetrics), validUnified);
  const comm = unified.value ? mergeCommunication(deterministicComm, unified.value.communication) : { ...deterministicComm, evaluationSource: 'deterministic_fallback' as const };
  const content = unified.value ? mergeContent(deterministicContent, unified.value.content) : { ...deterministicContent, evaluationSource: 'deterministic_fallback' as const };
  const star = unified.value ? mergeStar(deterministicStar, unified.value.star) : { ...deterministicStar, evaluationSource: 'deterministic_fallback' as const };
  const sources = { communication: unified.value ? 'llm' as const : 'deterministic_fallback' as const, content: unified.value ? 'llm' as const : 'deterministic_fallback' as const, star: unified.value ? 'llm' as const : 'deterministic_fallback' as const, coach: unified.value ? 'llm' as const : 'deterministic_fallback' as const };

  const deterministicCoach = await InterviewCoachAgent.execute({ candidateProfile: candidateProfile as any, questionOutput: deterministicQuestionOutput(question), candidateResponse, commOutput: comm, contentOutput: content, starOutput: star });
  deterministicCoach.evaluationSource = 'deterministic_fallback';
  const feedback = buildFeedback(question, comm, content, star, deterministicCoach, unified.value?.coach || null, sources);

  const componentRows: Array<[string, EvaluationSource, string | undefined]> = [['Communication Analysis Agent', sources.communication, unified.reason], ['Content Evaluation Agent', sources.content, unified.reason], ['STAR Structure Agent', sources.star, unified.reason], ['Interview Coach Agent', sources.coach, unified.reason]];
  for (const [agentName, source, reason] of componentRows) {
    traces.push({ agentName: agentName as AgentTraceMessage['agentName'], stage: agentName === 'Interview Coach Agent' ? 'complete' : 'handoff', timestamp: new Date().toISOString(), latencyMs: Date.now() - startedAt, summary: `${source} evaluation${reason ? ` (${reason})` : ''}.`, details: { evaluationSource: source, fallbackReason: reason } });
  }
  const allLlm = Object.values(sources).every((source) => source === 'llm');
  const allFallback = Object.values(sources).every((source) => source === 'deterministic_fallback');
  const executionSource: ExecutionSource = allLlm ? 'llm' : allFallback ? 'deterministic_fallback' : 'mixed';
  const fallbackReasons = [unified.reason].filter(Boolean);
  return { feedback, traces, modelUsed: executionSource === 'deterministic_fallback' ? 'Offline Deterministic Rule Engine' : `${model} semantic agents + deterministic aggregation`, executionTimeMs: Date.now() - startedAt, executionSource, llmAttempted: canUseLlm, llmSucceeded: Object.values(sources).some((source) => source === 'llm'), fallbackUsed: !allLlm, fallbackReason: fallbackReasons[0], agentSources: sources };
}

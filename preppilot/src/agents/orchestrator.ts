import {
  CandidateProfile, InterviewQuestion, SpeechMetrics, CoachingFeedback,
  AgentTraceMessage, CommunicationFeedback, ContentFeedback, StarAnalysis,
} from '@/types/interview';
import { executeChatCompletion, extractChatCompletionContent, getChatCompletionContentLocations } from '@/server/ai/llmClient';
import type { ChatOptions } from '@/server/ai/llmClient';
import { traceLlmCall } from '@/lib/interview/tracing';
import { deriveAnswerEvidence, enforceEvaluationFaithfulness } from '@/lib/interview/evaluationFaithfulness';
import { CommunicationAnalysisAgent, CommunicationAgentOutput } from './communicationAnalysisAgent';
import { ContentEvaluationAgent, ContentAgentOutput, QuestionRequirementEvaluation } from './contentEvaluationAgent';
import { StarStructureAgent, StarAgentOutput, StarComponentAnalysis } from './starStructureAgent';
import { InterviewCoachAgent, CoachAgentOutput } from './interviewCoachAgent';
import { QuestionAgentOutput } from './interviewQuestionAgent';

export type EvaluationSource = 'llm' | 'llm_retry' | 'deterministic_fallback';
export type ExecutionSource = EvaluationSource | 'mixed';

// Three specialists run in parallel, then Coach runs once. Keeping each
// provider leg below 10 seconds leaves room for the next-question request and
// keeps question-to-question latency comfortably below 40 seconds.
// The configured provider's successful calls in LangSmith took 9.2–15.1s.
// Nine seconds caused valid requests to be classified as failures.
export const EVALUATION_LLM_TIMEOUT_MS = 20_000;
// Evaluation has a different output contract from question generation. Keep
// this bounded and independently configurable while avoiding SDK/application
// retry multiplication.
export const EVALUATION_MAX_OUTPUT_TOKENS = 1500;
export const EVALUATION_RETRY_MAX_OUTPUT_TOKENS = 2200;

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
  evaluationRetryCount: number;
  agentSources: { communication: EvaluationSource; content: EvaluationSource; star: EvaluationSource; coach: EvaluationSource };
}

export interface EvaluationDependencies {
  complete?: (options: ChatOptions) => Promise<EvaluationResponse>;
}

interface EvaluationResponse {
  choices?: Array<{ finish_reason?: string | null; message?: { content?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
  [key: string]: unknown;
}

const clampScore = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 0;
};
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function parseJsonResponse(response: unknown): unknown {
  const provider = response as { choices?: Array<{ finish_reason?: string | null }> };
  const finishReason = provider.choices?.[0]?.finish_reason || 'unknown';
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
  return Math.round((scores.relevance + scores.clarity + scores.structure + scores.completeness + scores.communication) / 5);
}

/** Transparent PRD weighting. STAR is excluded and its 15% is redistributed when not applicable. */
export function calculateSpecialistOverall(scores: { relevance: number; communication: number; completeness: number; structure: number; competency: number }, starApplicable: boolean): number {
  if (starApplicable) return Math.round(scores.relevance * 0.30 + scores.communication * 0.25 + scores.completeness * 0.20 + scores.structure * 0.15 + scores.competency * 0.10);
  return Math.round(scores.relevance * (0.30 / 0.85) + scores.communication * (0.25 / 0.85) + scores.completeness * (0.20 / 0.85) + scores.competency * (0.10 / 0.85));
}

const comparableText = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Prevents a non-answer from receiving a passing score because it repeats the prompt. */
export function answerQualityCap(question: string, answer: string): number | undefined {
  const normalizedQuestion = comparableText(question);
  const normalizedAnswer = comparableText(answer);
  const questionWords = normalizedQuestion ? normalizedQuestion.split(/\s+/) : [];
  const answerWords = normalizedAnswer ? normalizedAnswer.split(/\s+/) : [];
  const repeatsQuestion = normalizedAnswer === normalizedQuestion
    || (questionWords.length > 8 && normalizedAnswer.includes(normalizedQuestion) && answerWords.length <= questionWords.length + 8);
  const explicitNonAnswer = /\b(?:i do not know|i don't know|no idea|cannot answer|can't answer|not sure|pass|nothing to add|blah blah)\b/i.test(answer);
  if (repeatsQuestion || explicitNonAnswer) return 15;
  return undefined;
}

function deterministicQuestionOutput(question: InterviewQuestion): QuestionAgentOutput {
  return {
    question: {
      ...question, question: question.question, expectedCompetency: question.competency,
      evaluationCriteria: question.evaluationCriteria, modelPoints: question.expectedCompetencies,
      focus: question.expectedCompetencies, durationSec: 150,
      expectSTAR: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based', followUps: [],
    },
    expectedCompetency: question.competency, evaluationCriteria: question.evaluationCriteria,
    metadata: { role: question.role, competency: question.competency, difficulty: question.difficulty, durationSec: 150,
      expectSTAR: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based', tailoredToProfile: false, matchingSignals: [] },
  } as unknown as QuestionAgentOutput;
}

interface SpecialistResult<T> { value: T | null; source: EvaluationSource; reason?: string; retryCount: number }
type SpecialistParser<T> = (value: unknown) => T | null;
interface LlmCommunicationOutput { clarity_score: number; conciseness_score: number; communication_score: number; filler_count: number; hedging_count: number; strengths: string[]; issues: string[]; evidence: Array<{ text: string; critique: string }> }
interface LlmContentOutput { relevance_score: number; content_score: number; completeness_score: number; competency_score: number; competency_coverage: string[]; strengths: string[]; missing_elements: string[]; evidence: Array<{ claim: string; detail: string; supported: boolean }>; measurement_plan_present: boolean; outcome_present: boolean; personal_contribution_clear: boolean; question_requirements?: QuestionRequirementEvaluation[] }
interface LlmStarOutput { applicable: boolean; situation: { present: boolean; evidence: string; feedback: string }; task: { present: boolean; evidence: string; feedback: string }; action: { present: boolean; evidence: string; feedback: string }; result: { present: boolean; evidence: string; feedback: string }; structure_score: number | null; feedback: string[] }
interface LlmCoachOutput { strengths: string[]; areas_for_improvement: string[]; coaching_feedback: string; improved_answer: string; follow_up_question: string; priority_gap: string; recurring_gap_key?: CoachAgentOutput['recurringGapKey']; evidence: Array<{ dimension: string; quote_or_signal: string; coaching_note: string }> }
const validScore = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
const validEvidence = (value: unknown): value is Array<Record<string, unknown>> => Array.isArray(value) && value.every((item) => object(item));
function parseCommunicationOutput(value: unknown): LlmCommunicationOutput | null { if (!object(value)) return null; const result = { clarity_score: value.clarity_score ?? value.clarityScore, conciseness_score: value.conciseness_score ?? value.concisenessScore, communication_score: value.communication_score ?? value.communicationQualityScore, filler_count: value.filler_count ?? value.filler_words ?? 0, hedging_count: value.hedging_count ?? value.hedging ?? 0, strengths: value.strengths, issues: value.issues ?? value.improvements, evidence: value.evidence }; return validScore(result.clarity_score) && validScore(result.conciseness_score) && validScore(result.communication_score) && Number.isInteger(result.filler_count) && Number.isInteger(result.hedging_count) && strings(result.strengths) && strings(result.issues) && validEvidence(result.evidence) ? result as LlmCommunicationOutput : null; }
function parseContentOutput(value: unknown): LlmContentOutput | null { if (!object(value)) return null; const result = { relevance_score: value.relevance_score ?? value.relevanceScore, content_score: value.content_score ?? value.technicalDepthScore ?? value.relevance_score, completeness_score: value.completeness_score ?? value.completenessScore, competency_score: value.competency_score ?? value.competency_match ?? value.relevance_score, competency_coverage: value.competency_coverage ?? value.demonstratedCompetencies, strengths: value.strengths ?? value.demonstratedCompetencies, missing_elements: value.missing_elements ?? value.missedKeyPoints, evidence: value.evidence, measurement_plan_present: value.measurement_plan_present ?? false, outcome_present: value.outcome_present ?? false, personal_contribution_clear: value.personal_contribution_clear ?? false }; return validScore(result.relevance_score) && validScore(result.content_score) && validScore(result.completeness_score) && validScore(result.competency_score) && strings(result.competency_coverage) && strings(result.strengths) && strings(result.missing_elements) && validEvidence(result.evidence) && typeof result.measurement_plan_present === 'boolean' && typeof result.outcome_present === 'boolean' && typeof result.personal_contribution_clear === 'boolean' ? result as LlmContentOutput : null; }
function parseStarOutput(value: unknown): LlmStarOutput | null { if (!object(value) || typeof value.applicable !== 'boolean' || !(value.structure_score === null || validScore(value.structure_score)) || !strings(value.feedback)) return null; const part = (item: unknown) => object(item) && typeof item.present === 'boolean' && typeof item.evidence === 'string' && typeof item.feedback === 'string' ? item as LlmStarOutput['situation'] : null; const situation = part(value.situation); const task = part(value.task); const action = part(value.action); const result = part(value.result); return situation && task && action && result ? { applicable: value.applicable, situation, task, action, result, structure_score: value.structure_score as number | null, feedback: value.feedback } : null; }
function parseCoachOutput(value: unknown): LlmCoachOutput | null { if (!object(value)) return null; const result = { strengths: value.strengths, areas_for_improvement: value.areas_for_improvement ?? value.areasForImprovement, coaching_feedback: value.coaching_feedback, improved_answer: value.improved_answer ?? value.improvedModelAnswer, follow_up_question: value.follow_up_question, priority_gap: value.priority_gap, recurring_gap_key: value.recurring_gap_key, evidence: value.evidence }; return strings(result.strengths) && strings(result.areas_for_improvement) && typeof result.coaching_feedback === 'string' && typeof result.improved_answer === 'string' && typeof result.follow_up_question === 'string' && typeof result.priority_gap === 'string' && validEvidence(result.evidence) ? result as LlmCoachOutput : null; }
function communicationFromLlm(base: CommunicationAgentOutput, value: LlmCommunicationOutput, source: EvaluationSource): CommunicationAgentOutput { return { ...base, clarity: value.clarity_score, conciseness: value.conciseness_score, communication_quality: value.communication_score, filler_words: value.filler_count, hedging: value.hedging_count, strengths: value.strengths, improvements: value.issues, evidence: value.evidence.slice(0, 6).map((item) => ({ type: 'conciseness', text: item.text, critique: item.critique })), evaluationSource: source }; }
function contentFromLlm(base: ContentAgentOutput, value: LlmContentOutput, source: EvaluationSource): ContentAgentOutput { return { ...base, relevance: value.relevance_score, technical_depth: value.content_score, completeness: value.completeness_score, competency_match: value.competency_score, answered_prompt: value.relevance_score >= 50, key_points_covered: value.competency_coverage, key_points_missed: value.missing_elements, strengths: value.strengths, gaps: value.missing_elements, evidence: value.evidence.slice(0, 6).map((item) => ({ claim: item.claim, verified: item.supported, category: item.supported ? 'answering_prompt' : 'missing_point', detail: item.detail })), evaluationSource: source }; }
function starFromLlm(base: StarAgentOutput, value: LlmStarOutput, source: EvaluationSource): StarAgentOutput { const part = (item: LlmStarOutput['situation']): StarComponentAnalysis => ({ status: item.present ? 'detected' : 'missing', evidence: item.evidence || null, critique: item.feedback }); return { ...base, structure_score: value.structure_score, starFilled: [value.situation, value.task, value.action, value.result].filter((item) => item.present).length, situation: part(value.situation), task: part(value.task), action: part(value.action), result: part(value.result), improvements: value.feedback, evaluationSource: source }; }
function specialistPrompt(agent: 'communication' | 'content' | 'star' | 'coach', profile: CandidateProfile, question: InterviewQuestion, answer: string, speech: SpeechMetrics | undefined, inputs?: Record<string, unknown>): string { const context = `Question: ${question.question}\nRound: ${question.stage}\nRole: ${question.role}\nExpected competencies: ${JSON.stringify(question.expectedCompetencies)}\nEvaluation criteria: ${JSON.stringify(question.evaluationCriteria)}\nCandidate context: ${JSON.stringify({ targetRole: profile.targetRole, experienceYears: profile.experienceYears, keySkills: profile.keySkills, bio: profile.bio })}\nCandidate answer: ${answer}\nSpeech metrics: ${JSON.stringify(speech || null)}`; const rules = 'Think internally but return ONLY the required JSON object. Do not provide reasoning, markdown, or commentary. Use only evidence in the answer and supplied specialist outputs. Do not invent experience, technologies, metrics, outcomes, or ownership.'; if (agent === 'communication') return `${rules}\nYou are the Communication Analysis Agent. Evaluate clarity, conciseness, sentence quality, filler words, hedging, confidence language, and communication quality. Count only actual markers and provide evidence for deductions.\n${context}\nSchema: {"clarity_score":0,"conciseness_score":0,"communication_score":0,"filler_count":0,"hedging_count":0,"strengths":[],"issues":[],"evidence":[{"text":"","critique":""}]}`; if (agent === 'content') return `${rules}\nYou are the Content Evaluation Agent. Compare what the question asks with what the answer provides. Do not require an achieved metric when the question asks how to measure future effectiveness. Evaluate relevance, correctness, competencies, completeness, personal contribution, outcomes, and unsupported claims.\n${context}\nSchema: {"relevance_score":0,"content_score":0,"completeness_score":0,"competency_score":0,"competency_coverage":[],"strengths":[],"missing_elements":[],"measurement_plan_present":false,"outcome_present":false,"personal_contribution_clear":false,"evidence":[{"claim":"","detail":"","supported":false}]}`; if (agent === 'star') return `${rules}\nYou are the STAR / Response Structure Agent. Decide whether STAR is applicable. For technical or HR motivation questions set applicable=false and structure_score=null; do not penalize missing STAR. For behavioral questions evaluate Situation, Task, Action, Result with quoted evidence.\n${context}\nSchema: {"applicable":false,"situation":{"present":false,"evidence":"","feedback":""},"task":{"present":false,"evidence":"","feedback":""},"action":{"present":false,"evidence":"","feedback":""},"result":{"present":false,"evidence":"","feedback":""},"structure_score":null,"feedback":[]}`; return `${rules}\nYou are the Interview Coach Agent. Synthesize the three specialist outputs below. Do not independently rescore them. Do not penalize non-applicable STAR. Generate grounded coaching, an improved answer, one gap-based follow-up, and a recurring gap.\n${context}\nSpecialist outputs: ${JSON.stringify(inputs || {})}\nSchema: {"strengths":[],"areas_for_improvement":[],"coaching_feedback":"","improved_answer":"","follow_up_question":"","priority_gap":"","recurring_gap_key":"","evidence":[{"dimension":"","quote_or_signal":"","coaching_note":""}]}`; }
async function executeSpecialist<T>(name: string, prompt: string, parser: SpecialistParser<T>, dependencies: EvaluationDependencies | undefined, apiKey: string, model: string, baseURL: string | undefined, requestId: string | undefined): Promise<SpecialistResult<T>> { if (!apiKey.trim()) return { value: null, source: 'deterministic_fallback', reason: 'no_api_key', retryCount: 0 }; let reason = 'provider_error'; for (let attempt = 0; attempt < 2; attempt += 1) { const source: EvaluationSource = attempt === 0 ? 'llm' : 'llm_retry'; const maxOutputTokens = attempt === 0 ? EVALUATION_MAX_OUTPUT_TOKENS : EVALUATION_RETRY_MAX_OUTPUT_TOKENS; const attemptPrompt = attempt === 0 ? prompt : `${prompt}\nRecovery attempt: return the complete compact JSON object and include every required field.`; try { const response = await traceLlmCall(name, [{ role: 'system', content: attemptPrompt }], () => dependencies?.complete ? dependencies.complete({ messages: [{ role: 'system', content: attemptPrompt }], responseFormat: 'json_object', model, apiKey, baseURL, component: name, caller: 'interview.evaluate_answer', purpose: 'answer_evaluation', requestId, timeoutMs: EVALUATION_LLM_TIMEOUT_MS, maxRetries: 0, maxOutputTokens, reasoningEffort: 'minimal' }) : executeChatCompletion({ messages: [{ role: 'system', content: attemptPrompt }], responseFormat: 'json_object', model, apiKey, baseURL, component: name, caller: 'interview.evaluate_answer', purpose: 'answer_evaluation', requestId, timeoutMs: EVALUATION_LLM_TIMEOUT_MS, maxRetries: 0, maxOutputTokens, reasoningEffort: 'minimal' }) as unknown as Promise<EvaluationResponse>, { model, baseURL, requestId, metadata: { purpose: 'answer_evaluation', agent: name, attempt_number: attempt + 1, max_output_tokens: maxOutputTokens } }); const finishReason = (response as EvaluationResponse).choices?.[0]?.finish_reason || 'unknown'; const raw = extractChatCompletionContent(response); let parsed: unknown; try { parsed = parseJsonResponse(response); } catch (error) { reason = reasonForError(error); } const value = parsed === undefined ? null : parser(parsed); const validationSuccess = Boolean(value) && finishReason !== 'length' && raw.length > 0; console.info('[EVALUATION_AGENT_DIAGNOSTIC]', JSON.stringify({ request_id: requestId, agent: name, model, max_output_tokens: maxOutputTokens, reasoning_effort: 'minimal', finish_reason: finishReason, raw_response_length: raw.length, parse_status: parsed === undefined ? 'failed' : 'success', validation_status: validationSuccess ? 'success' : 'failed', evaluation_source: source, retry_count: attempt })); if (validationSuccess) return { value, source, retryCount: attempt }; reason = finishReason === 'length' ? 'provider_output_truncated' : reason === 'provider_error' ? 'schema_validation_failed' : reason; } catch (error) { reason = reasonForError(error); console.info('[EVALUATION_AGENT_DIAGNOSTIC]', JSON.stringify({ request_id: requestId, agent: name, model, max_output_tokens: maxOutputTokens, reasoning_effort: 'minimal', parse_status: 'not_run', validation_status: 'failed', evaluation_source: source, retry_count: attempt, validation_error: reason })); } } return { value: null, source: 'deterministic_fallback', reason, retryCount: 1 }; }

function asCommunicationFeedback(output: CommunicationAgentOutput): CommunicationFeedback {
  return { clarityScore: output.clarity, concisenessScore: output.conciseness, tone: output.tone as CommunicationFeedback['tone'], communicationQualityScore: output.communication_quality, strengths: output.strengths, fillerWordCritique: output.evidence.find((item) => item.type === 'filler')?.critique || 'No filler-word issue detected.', pacingCritique: output.wpm ? `Measured pace: ${output.wpm} WPM.` : 'Pacing assessed from text cadence.' };
}
function asContentFeedback(output: ContentAgentOutput): ContentFeedback {
  return { relevanceScore: output.relevance, technicalDepthScore: output.technical_depth, accuracyScore: output.competency_match, completenessScore: output.completeness, demonstratedCompetencies: output.key_points_covered, missedKeyPoints: output.key_points_missed, groundedEvidenceQuotes: output.evidence.map((item) => item.claim).slice(0, 4) };
}
function asStarAnalysis(output: StarAgentOutput): StarAnalysis {
  const part = (value: { status: string; evidence?: string | null; critique: string }) => ({ present: value.status !== 'missing', snippet: value.evidence || undefined, score: value.status === 'strong' ? 90 : value.status === 'detected' ? 70 : 35, critique: value.critique });
  return { situation: part(output.situation), task: part(output.task), action: part(output.action), result: { ...part(output.result), quantifiable: output.result.evidence ? /\d+%?|\$|ms|qps|users/i.test(output.result.evidence) : false }, overallStarScore: output.structure_score ?? 0 };
}

function buildFeedback(question: InterviewQuestion, candidateResponse: string, comm: CommunicationAgentOutput, content: ContentAgentOutput, star: StarAgentOutput, deterministicCoach: CoachAgentOutput, llmCoach: Record<string, unknown> | null, sources: MultiAgentExecutionResult['agentSources']): CoachingFeedback {
  const starApplicable = question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based';
  const presentationStructure = Math.round((comm.clarity + comm.conciseness) / 2);
  const rubricScores = { relevance: clampScore(content.relevance), clarity: clampScore(comm.clarity), structure: starApplicable ? clampScore(star.structure_score) : presentationStructure, completeness: clampScore(content.completeness), communication: clampScore(comm.communication_quality), responseStructure: starApplicable ? clampScore(star.structure_score) : presentationStructure, communicationQuality: clampScore(comm.communication_quality) };
  const calculatedScore = calculateSpecialistOverall({ relevance: rubricScores.relevance, communication: rubricScores.communication, completeness: rubricScores.completeness, structure: rubricScores.structure, competency: clampScore(content.competency_match) }, starApplicable);
  const qualityCap = answerQualityCap(question.question, candidateResponse);
  const overallScore = qualityCap === undefined ? calculatedScore : Math.min(calculatedScore, qualityCap);
  const narrative = llmCoach || {};
  return {
    score: overallScore, relevance: rubricScores.relevance, clarity: rubricScores.clarity, structure: rubricScores.structure, completeness: rubricScores.completeness, communication_quality: rubricScores.communication,
    overallScore, verdict: deterministicCoach.verdict as CoachingFeedback['verdict'], rubricScores,
    strengths: strings(narrative.strengths) && narrative.strengths.length ? narrative.strengths.slice(0, 4) : deterministicCoach.strengths,
    areasForImprovement: strings(narrative.areasForImprovement) && narrative.areasForImprovement.length ? narrative.areasForImprovement.slice(0, 4) : deterministicCoach.improvements,
    starBreakdown: starApplicable ? asStarAnalysis(star) : undefined, communicationAnalysis: asCommunicationFeedback(comm), contentEvaluation: asContentFeedback(content),
    improvedModelAnswer: typeof narrative.improvedModelAnswer === 'string' ? narrative.improvedModelAnswer : deterministicCoach.improvedAnswer || question.idealStarResponse || '',
    expectedAnswer: typeof narrative.expectedAnswer === 'string' ? narrative.expectedAnswer : (typeof narrative.improvedModelAnswer === 'string' ? narrative.improvedModelAnswer : deterministicCoach.improvedAnswer || question.idealStarResponse || null),
    answerRewriteGuidance: strings(narrative.answerRewriteGuidance) && narrative.answerRewriteGuidance.length ? narrative.answerRewriteGuidance : deterministicCoach.actionableAdvice,
    adaptiveFollowUpQuestion: (narrative.adaptiveFollowUpQuestion && typeof narrative.adaptiveFollowUpQuestion === 'object' ? narrative.adaptiveFollowUpQuestion : { question: deterministicCoach.followUpQuestions[0] || 'What would strengthen this answer?', intent: 'Probe the weakest evidence area.', probingArea: 'Evidence and impact' }) as CoachingFeedback['adaptiveFollowUpQuestion'],
    personalizedImprovementPlan: (narrative.personalizedImprovementPlan && typeof narrative.personalizedImprovementPlan === 'object' ? narrative.personalizedImprovementPlan : { immediateFix: 'State your personal action clearly.', mediumTermPractice: 'Practice concise STAR answers.', recommendedFramework: 'STAR' }) as CoachingFeedback['personalizedImprovementPlan'],
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
  const deterministicContent = await ContentEvaluationAgent.execute({ question: question as unknown as Parameters<typeof ContentEvaluationAgent.execute>[0]['question'], candidateResponse, candidateProfile: candidateProfile as unknown as Parameters<typeof ContentEvaluationAgent.execute>[0]['candidateProfile'] });
  const deterministicStar = await StarStructureAgent.execute({ candidateResponse, expectSTAR: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based' });

  const [communicationResult, contentResult, starResult] = await Promise.all([
    executeSpecialist('communication-agent', specialistPrompt('communication', candidateProfile, question, candidateResponse, speechMetrics), parseCommunicationOutput, dependencies, apiKey, model, baseURL, requestId),
    executeSpecialist('content-evaluation-agent', specialistPrompt('content', candidateProfile, question, candidateResponse, speechMetrics), parseContentOutput, dependencies, apiKey, model, baseURL, requestId),
    executeSpecialist('star-structure-agent', specialistPrompt('star', candidateProfile, question, candidateResponse, speechMetrics), parseStarOutput, dependencies, apiKey, model, baseURL, requestId),
  ]);
  const comm = communicationResult.value ? communicationFromLlm(deterministicComm, communicationResult.value, communicationResult.source) : { ...deterministicComm, evaluationSource: 'deterministic_fallback' as const };
  const content = contentResult.value ? contentFromLlm(deterministicContent, contentResult.value, contentResult.source) : { ...deterministicContent, evaluationSource: 'deterministic_fallback' as const };
  const star = starResult.value ? starFromLlm(deterministicStar, starResult.value, starResult.source) : { ...deterministicStar, evaluationSource: 'deterministic_fallback' as const };
  const sources = { communication: comm.evaluationSource || 'deterministic_fallback', content: content.evaluationSource || 'deterministic_fallback', star: star.evaluationSource || 'deterministic_fallback', coach: 'deterministic_fallback' as EvaluationSource };

  const deterministicCoach = await InterviewCoachAgent.execute({ candidateProfile: candidateProfile as unknown as Parameters<typeof InterviewCoachAgent.execute>[0]['candidateProfile'], questionOutput: deterministicQuestionOutput(question), candidateResponse, commOutput: comm, contentOutput: content, starOutput: star });
  deterministicCoach.evaluationSource = 'deterministic_fallback';
  const coachInputs = { communication_analysis: comm, content_evaluation: content, star_analysis: star };
  const coachResult = await executeSpecialist('interview-coach-agent', specialistPrompt('coach', candidateProfile, question, candidateResponse, speechMetrics, coachInputs), parseCoachOutput, dependencies, apiKey, model, baseURL, requestId);
  sources.coach = coachResult.value ? coachResult.source : 'deterministic_fallback';
  let llmCoach: Record<string, unknown> | null = null;
  if (coachResult.value) {
    const coach = coachResult.value;
    const evidence = deriveAnswerEvidence(candidateResponse);
    const faithful = enforceEvaluationFaithfulness({ score: 0, relevance: content.relevance, clarity: comm.clarity, structure: star.structure_score ?? 0, completeness: content.completeness, communication_quality: comm.communication_quality, strengths: coach.strengths, improvements: coach.areas_for_improvement, improved_answer: coach.improved_answer, coaching_feedback: coach.coaching_feedback, star: { applicable: question.questionType === 'Behavioral' || question.questionType === 'Scenario-Based', situation: star.situation.status !== 'missing', task: star.task.status !== 'missing', action: star.action.status !== 'missing', result: star.result.status !== 'missing' }, content_score: content.relevance, star_score: star.structure_score ?? 0, technical_depth_score: content.technical_depth, feedback: coach.coaching_feedback, expected_answer: coach.improved_answer, evidence }, question.question, candidateResponse, [...candidateProfile.keySkills, candidateProfile.targetRole, ...candidateProfile.bio.split(/[,.;\n]/)]);
    console.info('[EVALUATION_FAITHFULNESS_AGENT]', JSON.stringify({ request_id: requestId, agent: 'interview-coach-agent', raw_claims: coach.strengths.length + coach.areas_for_improvement.length + 2, claims_removed: faithful.sanitization.claims_removed, details: faithful.sanitization.details, final_passed: faithful.finalValidation.passed }));
    llmCoach = { strengths: faithful.evaluation.strengths, areasForImprovement: faithful.evaluation.improvements, coachingFeedback: faithful.evaluation.coaching_feedback, improvedModelAnswer: faithful.evaluation.improved_answer, adaptiveFollowUpQuestion: { question: coach.follow_up_question, intent: 'Probe the priority gap.', probingArea: coach.priority_gap }, recurringGapsIdentified: [coach.priority_gap], answerRewriteGuidance: faithful.evaluation.improvements };
  }
  const feedback = buildFeedback(question, candidateResponse, comm, content, star, deterministicCoach, llmCoach, sources);

  const componentRows: Array<[string, EvaluationSource, string | undefined]> = [
    ['Communication Analysis Agent', sources.communication, communicationResult.reason],
    ['Content Evaluation Agent', sources.content, contentResult.reason],
    ['STAR Structure Agent', sources.star, starResult.reason],
    ['Interview Coach Agent', sources.coach, coachResult.reason],
  ];
  for (const [agentName, source, reason] of componentRows) {
    traces.push({ agentName: agentName as AgentTraceMessage['agentName'], stage: agentName === 'Interview Coach Agent' ? 'complete' : 'handoff', timestamp: new Date().toISOString(), latencyMs: Date.now() - startedAt, summary: `${source} evaluation${reason ? ` (${reason})` : ''}.`, details: { evaluationSource: source, fallbackReason: reason } });
  }
  const allLlm = Object.values(sources).every((source) => source === 'llm' || source === 'llm_retry');
  const allFallback = Object.values(sources).every((source) => source === 'deterministic_fallback');
  const allRetry = allLlm && Object.values(sources).every((source) => source === 'llm_retry');
  const executionSource: ExecutionSource = allFallback ? 'deterministic_fallback' : allRetry ? 'llm_retry' : allLlm ? 'llm' : 'mixed';
  const fallbackReasons = [communicationResult.reason, contentResult.reason, starResult.reason, coachResult.reason].filter(Boolean);
  const retryCount = communicationResult.retryCount + contentResult.retryCount + starResult.retryCount + coachResult.retryCount;
  return { feedback, traces, modelUsed: executionSource === 'deterministic_fallback' ? 'Offline Deterministic Rule Engine' : `${model} specialist agents + coach synthesis`, executionTimeMs: Date.now() - startedAt, executionSource, llmAttempted: canUseLlm, llmSucceeded: Object.values(sources).some((source) => source === 'llm' || source === 'llm_retry'), fallbackUsed: !allLlm, fallbackReason: fallbackReasons[0], evaluationRetryCount: retryCount, agentSources: sources };
}

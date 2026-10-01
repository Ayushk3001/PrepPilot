export interface EvaluationQuestionContext {
  question: string;
  questionType?: string;
  candidateResponse?: string;
}

export interface CanonicalStar {
  applicable: boolean;
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface CanonicalEvidence {
  quantified_impact_present: boolean;
  qualitative_impact_present: boolean;
  measurement_plan_present: boolean;
  personal_contribution_clear: boolean;
  technical_approach_present: boolean;
  outcome_present: boolean;
  outcome_is_quantified: boolean;
  situation_present: boolean;
  task_present: boolean;
  action_present: boolean;
  result_present: boolean;
}

export interface CanonicalEvaluation {
  score: number;
  relevance: number;
  clarity: number;
  structure: number;
  completeness: number;
  communication_quality: number;
  strengths: string[];
  improvements: string[];
  improved_answer: string;
  coaching_feedback: string;
  star: CanonicalStar;
  evidence: CanonicalEvidence;
}

const DIMENSIONS = ['relevance', 'clarity', 'structure', 'completeness', 'communication_quality'] as const;
const EVIDENCE_FIELDS: (keyof CanonicalEvidence)[] = [
  'quantified_impact_present', 'qualitative_impact_present', 'measurement_plan_present',
  'personal_contribution_clear', 'technical_approach_present', 'outcome_present',
  'outcome_is_quantified', 'situation_present', 'task_present', 'action_present', 'result_present',
];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const defaultStar = (applicable: boolean): CanonicalStar => ({ applicable, situation: false, task: false, action: false, result: false });
const defaultEvidence = (): CanonicalEvidence => Object.fromEntries(EVIDENCE_FIELDS.map((field) => [field, false])) as unknown as CanonicalEvidence;
const isBehavioral = (context: EvaluationQuestionContext): boolean => /behavioral|scenario/i.test(context.questionType || '') || /\b(?:tell me about|describe (?:a|the|your) (?:situation|challenge|project)|what was the result|when did you)\b/i.test(context.question);

export function calculateEvaluationScore(evaluation: Pick<CanonicalEvaluation, 'relevance' | 'clarity' | 'structure' | 'completeness' | 'communication_quality'>): number {
  return Math.round((evaluation.relevance + evaluation.clarity + evaluation.structure + evaluation.completeness + evaluation.communication_quality) / 5);
}

export function normalizeEvaluation(rawEvaluation: unknown, questionContext: EvaluationQuestionContext): CanonicalEvaluation {
  if (!isObject(rawEvaluation)) throw new Error('response_not_object');
  const legacyAliases: Record<string, string> = {
    relevance: 'relevance_score', clarity: 'communication_score', structure: 'star_score',
    completeness: 'completeness_score', communication_quality: 'communication_score',
  };
  const dimensionValue = (field: typeof DIMENSIONS[number]) => rawEvaluation[field] ?? rawEvaluation[legacyAliases[field]];
  const invalidDimensions = DIMENSIONS.filter((field) => !isScore(dimensionValue(field)));
  if (invalidDimensions.length) throw new Error(`invalid_scores:${invalidDimensions.join(',')}`);

  const behavioral = isBehavioral(questionContext);
  const rawStar = isObject(rawEvaluation.star) ? rawEvaluation.star : {};
  const star: CanonicalStar = {
    applicable: typeof rawStar.applicable === 'boolean' ? rawStar.applicable : behavioral,
    situation: typeof rawStar.situation === 'boolean' ? rawStar.situation : false,
    task: typeof rawStar.task === 'boolean' ? rawStar.task : false,
    action: typeof rawStar.action === 'boolean' ? rawStar.action : false,
    result: typeof rawStar.result === 'boolean' ? rawStar.result : false,
  };
  if (!star.applicable && !behavioral) Object.assign(star, defaultStar(false));

  const rawEvidence = isObject(rawEvaluation.evidence) ? rawEvaluation.evidence : {};
  const evidence = defaultEvidence();
  for (const field of EVIDENCE_FIELDS) {
    if (typeof rawEvidence[field] === 'boolean') evidence[field] = rawEvidence[field] as boolean;
  }
  const strengths = isStringArray(rawEvaluation.strengths) ? rawEvaluation.strengths : [];
  const improvements = isStringArray(rawEvaluation.improvements) ? rawEvaluation.improvements : [];
  const rawFeedback = rawEvaluation.coaching_feedback ?? rawEvaluation.feedback;
  const coachingFeedback = typeof rawFeedback === 'string' && rawFeedback.trim()
    ? rawFeedback.trim()
    : improvements.join(' ').trim() || 'The evaluation is based only on the evidence stated in the answer.';
  const improvedAnswer = typeof rawEvaluation.improved_answer === 'string'
    ? rawEvaluation.improved_answer.trim()
    : (typeof rawEvaluation.expected_answer === 'string' ? rawEvaluation.expected_answer.trim() : (questionContext.candidateResponse || '').trim());

  const normalized: CanonicalEvaluation = {
    relevance: dimensionValue('relevance') as number,
    clarity: dimensionValue('clarity') as number,
    structure: dimensionValue('structure') as number,
    completeness: dimensionValue('completeness') as number,
    communication_quality: dimensionValue('communication_quality') as number,
    score: 0,
    strengths: strengths.slice(0, 2),
    improvements: improvements.slice(0, 2),
    improved_answer: improvedAnswer,
    coaching_feedback: coachingFeedback,
    star,
    evidence,
  };
  normalized.score = calculateEvaluationScore(normalized);
  return normalized;
}

export function validateCanonicalEvaluation(evaluation: unknown): evaluation is CanonicalEvaluation {
  if (!isObject(evaluation) || !isScore(evaluation.score)) return false;
  if (DIMENSIONS.some((field) => !isScore(evaluation[field]))) return false;
  if (!isStringArray(evaluation.strengths) || !isStringArray(evaluation.improvements)) return false;
  if (typeof evaluation.improved_answer !== 'string' || typeof evaluation.coaching_feedback !== 'string' || !evaluation.coaching_feedback.trim()) return false;
  const star = evaluation.star;
  const evidence = evaluation.evidence;
  if (!isObject(star) || typeof star.applicable !== 'boolean' || ['situation', 'task', 'action', 'result'].some((field) => typeof star[field] !== 'boolean')) return false;
  if (!isObject(evidence) || EVIDENCE_FIELDS.some((field) => typeof evidence[field] !== 'boolean')) return false;
  return evaluation.score === calculateEvaluationScore(evaluation as unknown as CanonicalEvaluation);
}

export function evaluationSchemaDiagnostic(value: unknown) {
  const missing_fields = !isObject(value) ? [...DIMENSIONS, 'strengths', 'improvements', 'improved_answer', 'coaching_feedback', 'star', 'evidence'] : DIMENSIONS.filter((field) => !(field in value));
  const invalid_fields = isObject(value) ? DIMENSIONS.filter((field) => field in value && !isScore(value[field])) : [];
  return { missing_fields, invalid_fields, passed: missing_fields.length === 0 && invalid_fields.length === 0 };
}

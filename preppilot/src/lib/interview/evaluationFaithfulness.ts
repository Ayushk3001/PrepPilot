export interface EvaluationEvidence {
  quantified_impact_present: boolean;
  qualitative_impact_present: boolean;
  /** Derived locally; optional on legacy provider payloads. */
  measurement_plan_present?: boolean;
  personal_contribution_clear: boolean;
  technical_approach_present: boolean;
  outcome_present: boolean;
  outcome_is_quantified: boolean;
  situation_present: boolean;
  task_present: boolean;
  action_present: boolean;
  result_present: boolean;
}

export interface QuestionRequirements {
  asks_for_metric: boolean;
  asks_for_existing_metric: boolean;
  asks_for_measurement_plan: boolean;
  asks_for_personal_contribution: boolean;
  asks_for_outcome: boolean;
}

export interface FaithfulEvaluation {
  score?: number; relevance?: number; clarity?: number; structure?: number;
  completeness?: number; communication_quality?: number;
  relevance_score?: number; clarity_score?: number; structure_score?: number;
  completeness_score?: number; communication_score?: number;
  strengths: string[]; improvements: string[]; improved_answer?: string;
  coaching_feedback?: string;
  star?: { applicable: boolean; situation: boolean; task: boolean; action: boolean; result: boolean };
  // Legacy input aliases. They are accepted only to migrate existing stored
  // records; new provider output and persisted output use the fields above.
  content_score: number; star_score: number; technical_depth_score: number;
  feedback: string; expected_answer: string;
  evidence: EvaluationEvidence;
}

export interface SemanticIssue {
  field: string;
  original_claim: string;
  violation: 'unsupported_metric_claim' | 'unsupported_personal_claim' | 'unsupported_resume_claim';
  action: 'removed' | 'rewritten';
}

export interface FaithfulnessResult {
  evaluation: FaithfulEvaluation; requirements: QuestionRequirements; evidence: EvaluationEvidence;
  contradictions: number; unsupportedMetricClaims: number; unsupportedPersonalClaims: number; unsupportedResumeClaims: number;
  warnings: { contradictions_found: number; unsupported_metric_claims: number; unsupported_personal_claims: number; unsupported_resume_claims: number };
  rawValidation: { passed: boolean; contradictions_found: number; issues: SemanticIssue[] };
  sanitization: { claims_removed: number; claims_rewritten: number; details: SemanticIssue[] };
  finalValidation: { passed: boolean; contradictions_found: number; unsupported_metric_claims: number; unsupported_personal_claims: number; unsupported_resume_claims: number };
  passed: boolean;
}

const existingMetricQuestion = /\b(?:what|which|how much|how many)\b[^?]{0,80}\b(?:achiev(?:e|ed)|improv(?:e|ement)|reduc(?:e|ed|tion)|metric|percentage|percent|quantif(?:y|ied)|time saved|accuracy gain|measur(?:able|ed|ement))\b/i;
const measurementPlanQuestion = /\b(?:how would you|how could you|how do you plan to|what would you use to|how will you)\b[^?]{0,100}\b(?:measure|track|monitor|assess|evaluate|effectiveness|success)\b|\bhow would you measure\b/i;
const personalQuestion = /\b(?:your contribution|your role|what did you personally do|what did you implement|your responsibility|what was your contribution|what part did you own|what did you own)\b/i;
const outcomeQuestion = /\b(?:impact|outcome|result|improvement|effectiveness)\b/i;
const explicitNoMetric = /\b(?:did not|didn't|haven't|have not|was not|wasn't|no|without)\b[^.!?]{0,90}\b(?:benchmark|measure|quantif|percentage|percent|metric|time savings?|accuracy gain)\b/i;
const historicalQuantitativeEvidence = /\b(?:from\s+\d+(?:\.\d+)?\s*(?:%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?)\s+to\s+\d+|\d+(?:\.\d+)?\s*(?:%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?|x)(?![a-z])|\$\s?\d+)/i;
const qualitativeEvidence = /\b(?:improv(?:e|ed|ement)|reduc(?:e|ed|tion)|shorten(?:ed|ing)?|streamlin(?:e|ed|ing)|sav(?:e|ed|ing)|faster|more efficient|less manual|easier to use)\b/i;
const measurementPlanEvidence = /\b(?:would|could|plan to|intend to|in production,?\s+i(?:'d| would))\b[^.!?]{0,80}\b(?:measure|track|monitor|assess|evaluate)\b|\b(?:measure|track|monitor)\b[^.!?]{0,60}\b(?:latency|accuracy|failure rate|user satisfaction|throughput|quality)\b/i;
const personalEvidence = /\bI\s+(?:implemented|designed|built|developed|integrated|created|owned|led|was responsible for|architected|validated|retrieved|generated|executed)\b/i;
const technicalEvidence = /\b(?:implemented|designed|built|integrated|validated|retrieved|generated|executed|debugged|deployed|architected|query|sql|api|workflow|pipeline)\b/i;
const resultEvidence = /\b(?:result(?:ed)?|impact|improv(?:e|ed|ement)|reduc(?:e|ed|tion)|shorten(?:ed|ing)|outcome|saved|faster|efficient|fell|increased|decreased|less manual)\b/i;
const situationEvidence = /\b(?:when|during|while|after|before|challenge|incident|project|context)\b/i;
const taskEvidence = /\b(?:task|goal|needed to|had to|responsible for|objective)\b/i;
const starRelevantQuestion = /\b(?:behavioral|tell me about|describe(?:\s+(?:a|the|your))?\s+(?:situation|challenge|project|approach|result)|what was the result|when did you)\b/i;
const unsafeMetricClaim = /\b(?:measurable|quantified|measured)\s+(?:impact|improvement|gain|time savings?|outcome)|\b(?:demonstrated|provided|achieved)\b[^.!?]{0,45}\b(?:metric|percentage|quantified|measurable)|\b(?:reduced|improved|shortened|saved)\b[^.!?]{0,45}\d+(?:\.\d+)?\s*(?:%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?)(?![a-z])|\b\d+(?:\.\d+)?\s*(?:%|percent|ms|milliseconds?|seconds?|minutes?|hours?|days?)(?![a-z])/i;
const unsafePersonalClaim = /\b(?:personally|individually)\s+(?:implemented|designed|built|led|owned)|\bthe candidate\s+(?:implemented|designed|built|led|owned)\b|\b(?:clearly\s+)?(?:demonstrated|explained|showed|provided)\b[^.!?]{0,50}\b(?:personal contribution|personal ownership|individual contribution|ownership)\b/i;
const explicitMissingMetricClaim = /\b(?:no|not|did not|didn't|without|missing|lacked?|unable to)\b[^.!?]{0,70}\b(?:metric|percentage|percent|quantif|measur|benchmark|time savings?|accuracy gain)\b/i;
const genericResumeTerms = new Set(['production','project','system','solution','technology','technical','engineering','development','experience','work','team','impact','efficiency','automation','goals']);
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const coachingRecommendation = /\b(?:you could|you should|you would|consider|try|add|mention|describe|explain|clarify|strengthen|improve|to make (?:the|this) answer|if available|how would you|would be stronger|recommend(?:ed|ation)?)\b/i;

export function deriveQuestionRequirements(question: string): QuestionRequirements {
  const asks_for_measurement_plan = measurementPlanQuestion.test(question);
  const asks_for_existing_metric = !asks_for_measurement_plan && existingMetricQuestion.test(question);
  return { asks_for_metric: asks_for_existing_metric, asks_for_existing_metric, asks_for_measurement_plan, asks_for_personal_contribution: personalQuestion.test(question), asks_for_outcome: outcomeQuestion.test(question) };
}

export function deriveAnswerEvidence(answer: string): EvaluationEvidence {
  const noMetric = explicitNoMetric.test(answer);
  const measurement_plan_present = measurementPlanEvidence.test(answer);
  const quantified = !noMetric && !measurement_plan_present && historicalQuantitativeEvidence.test(answer);
  const qualitative = qualitativeEvidence.test(answer);
  const personal = personalEvidence.test(answer);
  const technical = technicalEvidence.test(answer);
  const outcome = resultEvidence.test(answer);
  return { quantified_impact_present: quantified, qualitative_impact_present: qualitative, measurement_plan_present, personal_contribution_clear: personal, technical_approach_present: technical, outcome_present: outcome, outcome_is_quantified: quantified, situation_present: situationEvidence.test(answer), task_present: taskEvidence.test(answer), action_present: personal && technical, result_present: outcome };
}

function hasUnsupportedResumeClaim(text: string, answer: string, resumeTerms: string[]): boolean {
  if (coachingRecommendation.test(text)) return false;
  const lowerAnswer = answer.toLowerCase();
  return resumeTerms.some((term) => { const cleaned = term.trim(); const lower = cleaned.toLowerCase(); return cleaned.length >= 3 && !genericResumeTerms.has(lower) && text.toLowerCase().includes(lower) && !lowerAnswer.includes(lower); });
}
function violatesMetricEvidence(text: string, evidence: EvaluationEvidence) { return !coachingRecommendation.test(text) && !evidence.quantified_impact_present && unsafeMetricClaim.test(text) && !explicitMissingMetricClaim.test(text); }
function violatesPersonalEvidence(text: string, evidence: EvaluationEvidence) { return !coachingRecommendation.test(text) && !evidence.personal_contribution_clear && unsafePersonalClaim.test(text); }

export function enforceEvaluationFaithfulness(evaluation: FaithfulEvaluation, question: string, answer: string, resumeTerms: string[] = []): FaithfulnessResult {
  const requirements = deriveQuestionRequirements(question);
  const evidence = deriveAnswerEvidence(answer);
  const relevanceScore = evaluation.relevance ?? evaluation.relevance_score ?? evaluation.content_score ?? 0;
  const clarityScore = evaluation.clarity ?? evaluation.clarity_score ?? evaluation.communication_score ?? 0;
  const structureScore = evaluation.structure ?? evaluation.structure_score ?? evaluation.star_score ?? 0;
  const completenessScore = evaluation.completeness ?? evaluation.completeness_score ?? 0;
  const communicationScore = evaluation.communication_quality ?? evaluation.communication_score ?? 0;
  const rawFeedback = evaluation.coaching_feedback ?? evaluation.feedback ?? '';
  const rawExpectedAnswer = evaluation.improved_answer ?? evaluation.expected_answer ?? answer;
  const issues: SemanticIssue[] = [];
  const inspect = (field: string, text: string): SemanticIssue | null => {
    if (violatesMetricEvidence(text, evidence)) return { field, original_claim: text, violation: 'unsupported_metric_claim', action: 'removed' };
    if (violatesPersonalEvidence(text, evidence)) return { field, original_claim: text, violation: 'unsupported_personal_claim', action: 'removed' };
    if (hasUnsupportedResumeClaim(text, answer, resumeTerms)) return { field, original_claim: text, violation: 'unsupported_resume_claim', action: 'removed' };
    return null;
  };
  const sanitizeList = (field: 'strengths' | 'improvements', values: string[]) => values.filter((text, index) => { const issue = inspect(field + '[' + index + ']', text); if (issue) { issues.push(issue); return false; } return true; });
  const strengths = sanitizeList('strengths', evaluation.strengths);
  const improvements = sanitizeList('improvements', evaluation.improvements);
  let feedback = rawFeedback; const feedbackIssue = inspect('coaching_feedback', feedback); if (feedbackIssue) { issues.push(feedbackIssue); feedback = ''; }
  let expectedAnswer = rawExpectedAnswer; const expectedIssue = inspect('improved_answer', expectedAnswer); if (expectedIssue) { issues.push(expectedIssue); expectedAnswer = answer.trim(); }
  if (requirements.asks_for_existing_metric && !evidence.quantified_impact_present && !improvements.some((item) => /measur|metric|quantif/i.test(item))) improvements.push('No formally measured metric was provided; describe the qualitative impact and how you would measure it.');
  if (requirements.asks_for_outcome && !evidence.outcome_present && !improvements.some((item) => /outcome|result|impact/i.test(item))) improvements.push('Explain the observed outcome or result of the approach.');
  if (requirements.asks_for_personal_contribution && !evidence.personal_contribution_clear && !improvements.some((item) => /personal|individual|contribution|ownership/i.test(item))) improvements.push('Clarify your individual contribution within the team effort.');
  if (!feedback) feedback = requirements.asks_for_existing_metric && !evidence.quantified_impact_present ? 'The answer describes qualitative impact but does not provide a formally measured metric.' : evidence.measurement_plan_present ? 'The answer proposes a clear measurement plan without claiming a historical metric.' : 'The evaluation is based only on the evidence stated in the answer.';
  if (!strengths.length && evidence.technical_approach_present) strengths.push('Explained a technical approach stated in the answer.');
  const starApplicable = Boolean(evaluation.star?.applicable ?? starRelevantQuestion.test(question));
  const completenessCap = requirements.asks_for_existing_metric && !evidence.quantified_impact_present
    ? 70
    : requirements.asks_for_outcome && !evidence.outcome_present ? 75 : 100;
  const normalized: FaithfulEvaluation = { score: 0, relevance: clamp(requirements.asks_for_existing_metric && !evidence.quantified_impact_present ? Math.min(relevanceScore, 80) : relevanceScore), clarity: clamp(clarityScore), structure: clamp(starApplicable && !evidence.result_present ? Math.min(structureScore, 72) : structureScore), completeness: clamp(Math.min(completenessScore, completenessCap)), communication_quality: clamp(communicationScore), relevance_score: clamp(relevanceScore), clarity_score: clamp(clarityScore), structure_score: clamp(structureScore), completeness_score: clamp(completenessScore), communication_score: clamp(communicationScore), content_score: clamp(relevanceScore), star_score: clamp(structureScore), technical_depth_score: 0, feedback, expected_answer: expectedAnswer, strengths: strengths.slice(0, 2), improvements: improvements.slice(0, 2), improved_answer: expectedAnswer, coaching_feedback: feedback, star: { applicable: starApplicable, situation: evidence.situation_present, task: evidence.task_present, action: evidence.action_present, result: evidence.result_present }, evidence };
  normalized.score = Math.round(((normalized.relevance || 0) + (normalized.clarity || 0) + (normalized.structure || 0) + (normalized.completeness || 0) + (normalized.communication_quality || 0)) / 5);
  const finalIssues = [...normalized.strengths, ...normalized.improvements, normalized.coaching_feedback || '', normalized.improved_answer || ''].flatMap((text) => { const issue = inspect('final_output', text); return issue ? [issue] : []; });
  const finalCounts = { metric: finalIssues.filter((i) => i.violation === 'unsupported_metric_claim').length, personal: finalIssues.filter((i) => i.violation === 'unsupported_personal_claim').length, resume: finalIssues.filter((i) => i.violation === 'unsupported_resume_claim').length };
  const rawCounts = { metric: issues.filter((i) => i.violation === 'unsupported_metric_claim').length, personal: issues.filter((i) => i.violation === 'unsupported_personal_claim').length, resume: issues.filter((i) => i.violation === 'unsupported_resume_claim').length };
  const finalPassed = finalIssues.length === 0;
  const compatibilityEvaluation: FaithfulEvaluation = { ...normalized, content_score: normalized.content_score || 0, star_score: normalized.structure || 0, technical_depth_score: normalized.technical_depth_score || 0, feedback: normalized.coaching_feedback || '', expected_answer: normalized.improved_answer || answer.trim() };
  return { evaluation: compatibilityEvaluation, requirements, evidence, contradictions: finalIssues.length, unsupportedMetricClaims: finalCounts.metric, unsupportedPersonalClaims: finalCounts.personal, unsupportedResumeClaims: finalCounts.resume, warnings: { contradictions_found: issues.length, unsupported_metric_claims: rawCounts.metric, unsupported_personal_claims: rawCounts.personal, unsupported_resume_claims: rawCounts.resume }, rawValidation: { passed: issues.length === 0, contradictions_found: issues.length, issues }, sanitization: { claims_removed: issues.length, claims_rewritten: 0, details: issues }, finalValidation: { passed: finalPassed, contradictions_found: finalIssues.length, unsupported_metric_claims: finalCounts.metric, unsupported_personal_claims: finalCounts.personal, unsupported_resume_claims: finalCounts.resume }, passed: finalPassed };
}

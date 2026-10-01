import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveAnswerEvidence, enforceEvaluationFaithfulness } from '@/lib/interview/evaluationFaithfulness';
import type { FaithfulEvaluation } from '@/lib/interview/evaluationFaithfulness';

const base: FaithfulEvaluation = {
  content_score: 84, communication_score: 78, star_score: 84, relevance_score: 86,
  technical_depth_score: 76, completeness_score: 84,
  strengths: ['Clearly explained the technical approach'], improvements: ['Add more detail'],
  feedback: 'The candidate demonstrated measurable time savings.',
  expected_answer: 'I reduced reporting time by 40% through a better workflow.',
  evidence: {
    quantified_impact_present: true, qualitative_impact_present: true, personal_contribution_clear: true,
    technical_approach_present: true, outcome_present: true, outcome_is_quantified: true,
    situation_present: true, task_present: true, action_present: true, result_present: true,
  },
};

test('does not convert qualitative impact or honest uncertainty into a metric', () => {
  const answer = "I did not formally benchmark a percentage improvement, but it significantly shortened the query-to-report workflow.";
  const result = enforceEvaluationFaithfulness(base, 'What measurable improvement did you achieve?', answer);
  assert.equal(result.evidence.quantified_impact_present, false);
  assert.equal(result.evidence.qualitative_impact_present, true);
  assert.doesNotMatch(`${result.evaluation.feedback} ${result.evaluation.expected_answer}`, /40%|measurable time savings/i);
  assert.ok(result.evaluation.improvements.some((item) => /formally measured metric/i.test(item)));
});

test('recognizes a real measured outcome', () => {
  const result = enforceEvaluationFaithfulness(base, 'What measurable improvement did you achieve?', 'We reduced processing time from 30 minutes to 10 minutes.');
  assert.equal(result.evidence.quantified_impact_present, true);
  assert.equal(result.evidence.outcome_is_quantified, true);
});

test('does not upgrade team work into personal ownership', () => {
  const result = enforceEvaluationFaithfulness({ ...base, feedback: 'The candidate personally implemented the system.' }, 'What was your contribution?', 'Our team built the system.');
  assert.equal(result.evidence.personal_contribution_clear, false);
  assert.doesNotMatch(result.evaluation.feedback, /personally implemented/i);
  assert.ok(result.evaluation.improvements.some((item) => /individual contribution/i.test(item)));
});

test('recognizes explicit personal contribution', () => {
  const evidence = deriveAnswerEvidence('I implemented the SQL validation layer and integrated it into the LangGraph workflow.');
  assert.equal(evidence.personal_contribution_clear, true);
  assert.equal(evidence.technical_approach_present, true);
});

test('caps STAR score when technical action has no result', () => {
  const result = enforceEvaluationFaithfulness(base, 'Describe your approach and result.', 'The challenge was schema complexity. I retrieved the schema, generated SQL, validated it and executed the query.');
  assert.equal(result.evidence.technical_approach_present, true);
  assert.equal(result.evidence.result_present, false);
  assert.ok(result.evaluation.star_score <= 72);
});

test('does not grant resume-only technology credit', () => {
  const result = enforceEvaluationFaithfulness({ ...base, strengths: ['Strongly explained the LangGraph implementation'] }, 'Describe the project.', 'I built an HR query system.', ['LangGraph']);
  assert.equal(result.evaluation.strengths.some((item) => /langgraph/i.test(item)), false);
  assert.equal(result.unsupportedResumeClaims, 0);
  assert.ok(result.warnings.unsupported_resume_claims > 0);
});

test('final persisted output cannot retain a resume-only claim', () => {
  const result = enforceEvaluationFaithfulness({
    ...base,
    feedback: 'The candidate explained their LangGraph implementation at Prodapt.',
    expected_answer: 'I built the LangGraph system at Prodapt and improved it.',
  }, 'Describe the project.', 'I built an HR query system.', ['LangGraph', 'Prodapt']);
  const finalText = JSON.stringify(result.evaluation);
  assert.equal(result.passed, true);
  assert.equal(result.unsupportedResumeClaims, 0);
  assert.doesNotMatch(finalText, /LangGraph|Prodapt/i);
});

test('does not invent a percentage where neither question answer nor evidence contains one', () => {
  const result = enforceEvaluationFaithfulness(base, 'What percentage improvement did you achieve?', 'I improved the workflow, but no percentage was formally measured.');
  assert.equal(result.evidence.quantified_impact_present, false);
  assert.doesNotMatch(result.evaluation.expected_answer, /40%|\d+%/);
});

test('sanitizes an unsupported metric strength and passes the final evaluation', () => {
  const result = enforceEvaluationFaithfulness({ ...base, strengths: ['Provided measurable impact'] }, 'What measurable impact did you achieve?', 'The workflow became easier to use, but no percentage was measured.');
  assert.equal(result.passed, true);
  assert.equal(result.unsupportedMetricClaims, 0);
  assert.equal(result.evaluation.strengths.some((item) => /measurable impact/i.test(item)), false);
  assert.ok(result.warnings.unsupported_metric_claims > 0);
});

test('accepts an evidence-faithful missing-metric improvement', () => {
  const result = enforceEvaluationFaithfulness({ ...base, improvements: ['No quantified impact was provided'] }, 'What measurable impact did you achieve?', 'The workflow became easier to use, but no percentage was measured.');
  assert.equal(result.passed, true);
  assert.equal(result.unsupportedMetricClaims, 0);
});

test('sanitizes unsupported personal-ownership strength', () => {
  const result = enforceEvaluationFaithfulness({ ...base, strengths: ['Clearly explained personal contribution'] }, 'What was your personal contribution?', 'Our team built the system.');
  assert.equal(result.passed, true);
  assert.equal(result.unsupportedPersonalClaims, 0);
  assert.equal(result.evaluation.strengths.some((item) => /personal contribution/i.test(item)), false);
  assert.ok(result.warnings.unsupported_personal_claims > 0);
});

test('accepts an evidence-faithful personal-contribution improvement', () => {
  const result = enforceEvaluationFaithfulness({ ...base, improvements: ['Clarify your personal contribution'] }, 'What was your personal contribution?', 'Our team built the system.');
  assert.equal(result.passed, true);
  assert.equal(result.unsupportedPersonalClaims, 0);
});

test('accepts qualitative impact without treating it as quantified impact', () => {
  const result = enforceEvaluationFaithfulness({ ...base, strengths: ['Explained qualitative workflow impact'] }, 'Describe the project impact.', 'It reduced manual work and made the workflow faster.');
  assert.equal(result.passed, true);
  assert.equal(result.evidence.qualitative_impact_present, true);
  assert.equal(result.evidence.quantified_impact_present, false);
});

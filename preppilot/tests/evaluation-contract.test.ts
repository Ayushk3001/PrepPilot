import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEvaluation, validateCanonicalEvaluation } from '@/lib/interview/evaluationContract';

const latestResponse = {
  score: 60,
  relevance: 70,
  clarity: 65,
  structure: 60,
  completeness: 65,
  communication_quality: 70,
  strengths: ['The answer identifies relevant production metrics.'],
  improvements: ['Make the project impact and personal contribution clearer.'],
  improved_answer: 'I would make the project impact and my contribution explicit.',
  evidence: {
    quantified_impact_present: false,
    qualitative_impact_present: true,
    measurement_plan_present: false,
    personal_contribution_clear: false,
    technical_approach_present: true,
    outcome_present: true,
    outcome_is_quantified: false,
    situation_present: true,
    task_present: true,
    action_present: true,
    result_present: false,
  },
};

test('normalizes the latest response and calculates the dimensional overall score', () => {
  const result = normalizeEvaluation(latestResponse, { question: 'Explain the technical project.', questionType: 'technical' });
  assert.equal(result.coaching_feedback, latestResponse.improvements[0]);
  assert.equal(result.score, 66);
  assert.equal(result.star.applicable, false);
  assert.equal(validateCanonicalEvaluation(result), true);
});

test('normalizes omitted STAR on a technical question', () => {
  const result = normalizeEvaluation({ ...latestResponse, star: undefined }, { question: 'How did you design the API?', questionType: 'technical' });
  assert.deepEqual(result.star, { applicable: false, situation: false, task: false, action: false, result: false });
  assert.equal(validateCanonicalEvaluation(result), true);
});

test('normalizes omitted STAR on a behavioral question without rejecting it', () => {
  const result = normalizeEvaluation({ ...latestResponse, star: undefined }, { question: 'Tell me about a difficult project.', questionType: 'behavioral' });
  assert.equal(result.star.applicable, true);
  assert.equal(validateCanonicalEvaluation(result), true);
});

test('allows omitted strengths and improvements and derives coaching feedback', () => {
  const result = normalizeEvaluation({ ...latestResponse, strengths: undefined, improvements: ['State the result.'] }, { question: 'Explain the project.', questionType: 'technical' });
  assert.deepEqual(result.strengths, []);
  assert.equal(result.coaching_feedback, 'State the result.');
});

test('does not coerce invalid score data', () => {
  assert.throws(() => normalizeEvaluation({ ...latestResponse, relevance: 'good' }, { question: 'Explain the project.' }), /invalid_scores/);
  assert.throws(() => normalizeEvaluation({ ...latestResponse, relevance: 150 }, { question: 'Explain the project.' }), /invalid_scores/);
});

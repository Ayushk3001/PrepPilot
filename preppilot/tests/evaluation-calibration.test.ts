import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunicationAnalysisAgent } from '@/agents/communicationAnalysisAgent';
import { ContentEvaluationAgent } from '@/agents/contentEvaluationAgent';
import { StarStructureAgent } from '@/agents/starStructureAgent';
import { calculateSpecialistOverall } from '@/agents/orchestrator';
import { deriveAnswerEvidence, enforceEvaluationFaithfulness } from '@/lib/interview/evaluationFaithfulness';

const question: any = {
  question: 'At Craftech 360, how did you assess the impact of the frontend modules, and how would you measure AI/ML effectiveness in a similar role?',
  modelPoints: [], durationSec: 150,
};

test('content gives partial credit for a strong measurement plan without an achieved outcome', async () => {
  const output = await ContentEvaluationAgent.execute({
    question,
    candidateResponse: 'I would assess impact through task completion time, user feedback, usability issues, system responsiveness, model accuracy, inference time, reliability, and resource utilization.',
    candidateProfile: null,
  });

  assert.equal(output.measurement_plan_present, true);
  assert.equal(output.outcome_present, false);
  assert.ok(output.relevance > 0);
  assert.ok(output.completeness > 0);
  assert.ok(output.competency_match > 0);
  assert.equal(output.question_requirements.length, 2);
  assert.ok(output.question_requirements.some((item) => item.status === 'fully_answered'));
});

test('content rewards an achieved outcome above a measurement-only answer', async () => {
  const measured = await ContentEvaluationAgent.execute({ question, candidateResponse: 'I would measure task completion time and user feedback.', candidateProfile: null });
  const achieved = await ContentEvaluationAgent.execute({ question, candidateResponse: 'I measured task completion time and reduced it by 20%, while user feedback improved.', candidateProfile: null });
  assert.ok(achieved.completeness > measured.completeness);
  assert.equal(achieved.outcome_present, true);
});

test('irrelevant content remains low', async () => {
  const output = await ContentEvaluationAgent.execute({ question, candidateResponse: 'My favorite food is pasta and I enjoy weekend movies.', candidateProfile: null });
  assert.ok(output.relevance < 40);
  assert.equal(output.answered_prompt, false);
});

test('two fillers in a coherent answer are a modest communication deduction', async () => {
  const clean = await CommunicationAnalysisAgent.execute({ candidateResponse: 'I designed the workflow, tested it, and explained the trade-offs clearly to the team.', mode: 'text' });
  const fillers = await CommunicationAnalysisAgent.execute({ candidateResponse: 'Basically, I designed the workflow and, um, tested it before explaining the trade-offs clearly to the team.', mode: 'text' });
  assert.equal(fillers.filler_words, 2);
  assert.ok(clean.communication_quality - fillers.communication_quality <= 8);
});

test('many fillers in a short answer are penalized more strongly', async () => {
  const output = await CommunicationAnalysisAgent.execute({ candidateResponse: 'Um, uh, like, basically, you know, stuff.', mode: 'text' });
  assert.equal(output.filler_words, 6);
  assert.ok(output.communication_quality < 55);
});

test('measurement-plan language is detected as evidence', () => {
  const evidence = deriveAnswerEvidence('I would measure effectiveness through latency, accuracy, reliability, and error rate.');
  assert.equal(evidence.measurement_plan_present, true);
});

test('coaching recommendations mentioning metrics survive faithfulness validation', () => {
  const result = enforceEvaluationFaithfulness({
    strengths: [], improvements: ['You could strengthen the answer by adding a measurable outcome and baseline metric.'],
    improved_answer: 'To make the answer stronger, mention the outcome if available and explain how you would measure latency.',
    coaching_feedback: 'Consider adding a metric or target if one exists.',
    content_score: 70, star_score: 0, technical_depth_score: 0, feedback: '', expected_answer: '',
    evidence: { quantified_impact_present: false, qualitative_impact_present: true, personal_contribution_clear: true, technical_approach_present: true, outcome_present: false, outcome_is_quantified: false, situation_present: false, task_present: false, action_present: true, result_present: false },
  }, 'How did you assess impact?', 'I would measure latency and user feedback.');
  assert.equal(result.sanitization.claims_removed, 0);
});

test('unsupported candidate metrics are removed', () => {
  const result = enforceEvaluationFaithfulness({
    strengths: ['I reduced latency by 30%.'], improvements: [], improved_answer: 'I reduced latency by 30%.', coaching_feedback: 'Strong result.',
    content_score: 70, star_score: 0, technical_depth_score: 0, feedback: '', expected_answer: '',
    evidence: { quantified_impact_present: false, qualitative_impact_present: false, personal_contribution_clear: true, technical_approach_present: true, outcome_present: false, outcome_is_quantified: false, situation_present: false, task_present: false, action_present: true, result_present: false },
  }, 'Describe impact.', 'I worked on the workflow but did not measure the result.');
  assert.ok(result.sanitization.claims_removed > 0);
});

test('non-STAR questions exclude null STAR from score', async () => {
  const star = await StarStructureAgent.execute({ candidateResponse: 'I explained the architecture and trade-offs.', expectSTAR: false });
  assert.equal(star.structure_score, null);
  const withStar = calculateSpecialistOverall({ relevance: 70, communication: 80, completeness: 60, structure: 0, competency: 70 }, false);
  const changedStar = calculateSpecialistOverall({ relevance: 70, communication: 80, completeness: 60, structure: 100, competency: 70 }, false);
  assert.equal(withStar, changedStar);
});

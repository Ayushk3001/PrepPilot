/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQualityCap, calculateCanonicalOverall, calculateSpecialistOverall, runMultiAgentInterviewCoaching } from '@/agents/orchestrator';

const candidate: any = {
  id: 'candidate-1', fullName: 'Test Candidate', targetRole: 'Fullstack Software Engineer',
  experienceYears: 3, keySkills: ['TypeScript', 'Postgres'], bio: 'Engineer',
};
const question: any = {
  id: 'q-1', role: 'Fullstack Software Engineer', stage: 'Behavioral & STAR Competency',
  competency: 'Ownership', difficulty: 'Mid-Level', questionType: 'Behavioral',
  question: 'Tell me about a production incident you owned.', expectedCompetencies: ['Ownership', 'Impact'],
  evaluationCriteria: ['Context', 'Action', 'Result'],
};

const specialistResponses: Record<string, unknown> = {
  'communication-agent': {
    clarityScore: 82, concisenessScore: 78, communicationQualityScore: 80, tone: 'Professional & Confident',
    strengths: ['Clear explanation'], improvements: ['Lead with the outcome'], fillerWordCritique: 'Good control', pacingCritique: 'Balanced',
  },
  'content-evaluation-agent': {
    relevanceScore: 84, technicalDepthScore: 81, accuracyScore: 80, completenessScore: 76,
    demonstratedCompetencies: ['Ownership'], missedKeyPoints: ['Quantified impact'], groundedEvidenceQuotes: ['I owned the incident response.'],
  },
  'star-structure-agent': {
    situation: { present: true, snippet: 'During an outage', score: 80, critique: 'Good context' },
    task: { present: true, snippet: 'I was responsible for recovery', score: 78, critique: 'Clear task' },
    action: { present: true, snippet: 'I redesigned the retry path', score: 86, critique: 'Specific action' },
    result: { present: true, snippet: 'Latency fell by 30%', score: 88, critique: 'Quantified result', quantifiable: true },
    overallStarScore: 83,
  },
  'interview-coach-agent': {
    strengths: ['Specific ownership'], areasForImprovement: ['Add more impact detail'], improvedModelAnswer: 'A stronger answer would quantify the result.',
    answerRewriteGuidance: ['State the result earlier'], adaptiveFollowUpQuestion: { question: 'What was the exact customer impact?', intent: 'Probe impact', probingArea: 'Results' },
    personalizedImprovementPlan: { immediateFix: 'Quantify impact', mediumTermPractice: 'Practice STAR', recommendedFramework: 'STAR' },
    curatedResources: [], recurringGapsIdentified: ['Impact metrics'],
  },
};

function responseFor(component: string, value: unknown = specialistResponses[component]) {
  const specialistValue = component === 'communication-agent' ? { clarity_score: 82, conciseness_score: 78, communication_score: 80, filler_count: 0, hedging_count: 0, strengths: ['Clear explanation'], issues: ['Lead with the outcome'], evidence: [] }
    : component === 'content-evaluation-agent' ? { relevance_score: 84, content_score: 81, completeness_score: 76, competency_score: 80, competency_coverage: ['Ownership'], strengths: ['Specific ownership'], missing_elements: ['Quantified impact'], measurement_plan_present: false, outcome_present: true, personal_contribution_clear: true, evidence: [] }
      : component === 'star-structure-agent' ? { applicable: true, situation: { present: true, evidence: 'During an outage', feedback: 'Good context' }, task: { present: true, evidence: 'I was responsible for recovery', feedback: 'Clear task' }, action: { present: true, evidence: 'I redesigned the retry path', feedback: 'Specific action' }, result: { present: true, evidence: 'Latency fell by 30%', feedback: 'Quantified result' }, structure_score: 83, feedback: [] }
        : component === 'interview-coach-agent' ? { strengths: ['Specific ownership'], areas_for_improvement: ['Add more impact detail'], coaching_feedback: 'Clear answer. Add a measurable outcome.', improved_answer: 'During an outage, I owned recovery and reduced latency by 30%.', follow_up_question: 'What was the customer impact?', priority_gap: 'Impact metrics', recurring_gap_key: 'results', evidence: [] } : value;
  return { choices: [{ message: { content: JSON.stringify(specialistValue) } }], model: 'test-model', usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
}

function canonicalResponse(overrides: Record<string, unknown> = {}) {
  return responseFor('unified-evaluation', {
    relevance: 84, clarity: 82, structure: 83, completeness: 76, communication_quality: 82,
    strengths: ['Owned the incident response.'], improvements: ['Add the observed result.'],
    improved_answer: 'I owned incident recovery and explained the observed result.',
    coaching_feedback: 'Clear ownership; add the observed result.',
    star: { applicable: true, situation: true, task: true, action: true, result: true },
    evidence: {
      quantified_impact_present: false, qualitative_impact_present: true, measurement_plan_present: false,
      personal_contribution_clear: true, technical_approach_present: true, outcome_present: true,
      outcome_is_quantified: false, situation_present: true, task_present: true, action_present: true, result_present: true,
    },
    ...overrides,
  });
}

const unifiedResponse = {
  content_score: 80,
  communication_score: 82,
  star_score: 83,
  relevance_score: 84,
  technical_depth_score: 81,
  completeness_score: 76,
  strengths: ['Specific ownership'],
  improvements: ['Add more impact detail'],
  feedback: 'Clear answer. Add a measurable outcome.',
  expected_answer: 'During an outage, I owned the recovery work, redesigned the retry path, and reduced latency by 30%. I would also explain the trade-off and how I verified the result.',
  evidence: {
    quantified_impact_present: true, qualitative_impact_present: true, personal_contribution_clear: true,
    technical_approach_present: true, outcome_present: true, outcome_is_quantified: true,
    situation_present: true, task_present: true, action_present: true, result_present: true,
  },
};

test('uses all LLM agents and deterministic weighted aggregation on valid responses', async () => {
  const calls: string[] = [];
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'During an outage I owned recovery. I redesigned retries and latency fell by 30%.', undefined, 'test-key', 'test-request', {
      complete: async (options) => { calls.push(options.component || 'unknown'); return responseFor(options.component || '', unifiedResponse); },
  });

  assert.deepEqual(result.agentSources, { communication: 'llm', content: 'llm', star: 'llm', coach: 'llm' });
  assert.equal(result.executionSource, 'llm');
  assert.deepEqual(calls, ['communication-agent', 'content-evaluation-agent', 'star-structure-agent', 'interview-coach-agent']);
  assert.equal(result.feedback.overallScore, calculateSpecialistOverall({ relevance: 84, communication: 80, completeness: 76, structure: 83, competency: 80 }, true));
});

test('caps an answer that repeats the question instead of answering it', async () => {
  const repeated = question.question;
  const result = await runMultiAgentInterviewCoaching(candidate, question, repeated, undefined, 'test-key', 'repeated-answer', {
    complete: async () => responseFor('unified-evaluation', unifiedResponse),
  });

  assert.equal(answerQualityCap(question.question, repeated), 15);
  assert.ok(result.feedback.overallScore <= 15);
});

test('falls back only the failed specialist while retaining successful LLM agents', async () => {
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'During an outage I owned recovery and reduced latency.', undefined, 'test-key', 'failure-request', {
    complete: async (options) => {
      if (options.component === 'communication-agent') throw new Error('provider unavailable');
      return responseFor(options.component || '', unifiedResponse);
    },
  });

  assert.equal(result.agentSources.communication, 'deterministic_fallback');
  assert.equal(result.agentSources.content, 'llm');
  assert.equal(result.agentSources.star, 'llm');
  assert.equal(result.agentSources.coach, 'llm');
  assert.equal(result.executionSource, 'mixed');
  assert.equal(result.fallbackReason, 'provider_error');
});

test('falls back on malformed and invalid-score LLM responses', async () => {
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'I owned the incident response and fixed the issue.', undefined, 'test-key', 'malformed-request', {
    complete: async (options) => {
      if (options.component === 'communication-agent') return { choices: [{ message: { content: '{not-json' } }] };
      return responseFor(options.component || '', unifiedResponse);
    },
  });

  assert.equal(result.agentSources.communication, 'deterministic_fallback');
  assert.equal(result.agentSources.star, 'llm');
  assert.equal(result.agentSources.content, 'llm');
  assert.equal(result.agentSources.coach, 'llm');
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.evaluationRetryCount, 1);
});

test('retries a truncated provider response and records llm_retry', async () => {
  const budgets: number[] = [];
  let calls = 0;
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'I owned the incident response and fixed the issue.', undefined, 'test-key', 'truncated-request', {
    complete: async (options) => {
      budgets.push(options.maxOutputTokens || 0);
      calls += 1;
      if (calls === 1) return { choices: [{ finish_reason: 'length', message: { content: '' } }], usage: { completion_tokens: 1500, completion_tokens_details: { reasoning_tokens: 1500 } } };
      return responseFor(options.component || '');
    },
  });

  assert.equal(result.executionSource, 'llm');
  assert.equal(result.feedback.evaluationSources?.communication, 'llm_retry');
  assert.equal(result.evaluationRetryCount, 1);
  assert.equal(budgets.length, 5);
  assert.ok(budgets.includes(2200));
});

test('schema-invalid first response is retried before deterministic fallback', async () => {
  let calls = 0;
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'I owned the incident response and fixed the issue.', undefined, 'test-key', 'schema-retry-request', {
    complete: async (options) => {
      calls += 1;
      return calls === 1 ? responseFor(options.component || '', { relevance_score: 'not-a-score' }) : responseFor(options.component || '');
    },
  });

  assert.equal(calls, 4);
  assert.equal(result.executionSource, 'llm');
  assert.equal(result.fallbackUsed, false);
});

test('faithfulness validation removes unsupported claims without replacing valid LLM output', async () => {
  const coachFaithfulResponse = { choices: [{ message: { content: JSON.stringify({ strengths: ['I delivered a 99% latency reduction using Kubernetes, as shown on my resume.'], areas_for_improvement: ['Clarify the result.'], coaching_feedback: 'The answer should be clearer.', improved_answer: 'I owned incident recovery and delivered a 99% latency reduction using Kubernetes.', follow_up_question: 'What was the result?', priority_gap: 'Unsupported claims', evidence: [] }) } }] };
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'I owned the incident response and fixed the issue.', undefined, 'test-key', 'faithfulness-request', {
    complete: async (options) => options.component === 'interview-coach-agent' ? coachFaithfulResponse : responseFor(options.component || ''),
  });

  assert.equal(result.executionSource, 'llm');
  assert.equal(result.fallbackUsed, false);
  assert.ok(!result.feedback.strengths.some((item) => /99%|Kubernetes/i.test(item)));
});

test('specialist calls execute in parallel', async () => {
  let active = 0;
  let maxActive = 0;
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'During an outage I owned recovery and reduced latency.', undefined, 'test-key', 'parallel-request', {
    complete: async (options) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, options.component === 'interview-coach-agent' ? 0 : 20));
      active -= 1;
      return responseFor(options.component || '', unifiedResponse);
    },
  });

  assert.equal(maxActive, 3);
  assert.equal(result.agentSources.coach, 'llm');
});

test('uses complete deterministic fallback without an API key', async () => {
  let calls = 0;
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'I owned the incident response.', undefined, '', 'offline-request', {
    complete: async () => { calls += 1; return responseFor(''); },
  });

  assert.equal(calls, 0);
  assert.deepEqual(result.agentSources, { communication: 'deterministic_fallback', content: 'deterministic_fallback', star: 'deterministic_fallback', coach: 'deterministic_fallback' });
  assert.equal(result.executionSource, 'deterministic_fallback');
  assert.equal(result.fallbackReason, 'no_api_key');
  assert.equal(result.feedback.score, result.feedback.overallScore);
  assert.ok(result.feedback.overallScore >= 0 && result.feedback.overallScore <= 100);
});

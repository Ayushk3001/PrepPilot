/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCanonicalOverall, runMultiAgentInterviewCoaching } from '@/agents/orchestrator';

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
  return { choices: [{ message: { content: JSON.stringify(value) } }], model: 'test-model', usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
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
};

test('uses all LLM agents and deterministic weighted aggregation on valid responses', async () => {
  const calls: string[] = [];
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'During an outage I owned recovery. I redesigned retries and latency fell by 30%.', undefined, 'test-key', 'test-request', {
      complete: async (options) => { calls.push(options.component || 'unknown'); return responseFor(options.component || '', unifiedResponse); },
  });

  assert.deepEqual(result.agentSources, { communication: 'llm', content: 'llm', star: 'llm', coach: 'llm' });
  assert.equal(result.executionSource, 'llm');
  assert.deepEqual(calls, ['unified-evaluation']);
  assert.equal(result.feedback.overallScore, calculateCanonicalOverall({ relevance: 84, clarity: 82, structure: 83, completeness: 76, communication: 82 }));
});

test('falls back only the failed specialist while retaining successful LLM agents', async () => {
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'During an outage I owned recovery and reduced latency.', undefined, 'test-key', 'failure-request', {
    complete: async (options) => {
      if (options.component === 'unified-evaluation') throw new Error('provider unavailable');
      return responseFor(options.component || '', unifiedResponse);
    },
  });

  assert.equal(result.agentSources.communication, 'deterministic_fallback');
  assert.equal(result.agentSources.content, 'deterministic_fallback');
  assert.equal(result.agentSources.star, 'deterministic_fallback');
  assert.equal(result.agentSources.coach, 'deterministic_fallback');
  assert.equal(result.executionSource, 'deterministic_fallback');
  assert.equal(result.fallbackReason, 'provider_error');
});

test('falls back on malformed and invalid-score LLM responses', async () => {
  const result = await runMultiAgentInterviewCoaching(candidate, question, 'I owned the incident response and fixed the issue.', undefined, 'test-key', 'malformed-request', {
    complete: async (options) => {
      if (options.component === 'unified-evaluation') return { choices: [{ message: { content: '{not-json' } }] };
      return responseFor(options.component || '', unifiedResponse);
    },
  });

  assert.equal(result.agentSources.communication, 'deterministic_fallback');
  assert.equal(result.agentSources.star, 'deterministic_fallback');
  assert.equal(result.agentSources.content, 'deterministic_fallback');
  assert.equal(result.agentSources.coach, 'deterministic_fallback');
  assert.equal(result.fallbackUsed, true);
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

  assert.equal(maxActive, 1);
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
  assert.equal(result.feedback.overallScore, calculateCanonicalOverall({
    relevance: result.feedback.rubricScores.relevance,
    clarity: result.feedback.rubricScores.clarity,
    structure: result.feedback.rubricScores.responseStructure,
    completeness: result.feedback.rubricScores.completeness,
    communication: result.feedback.rubricScores.communicationQuality,
  }));
});

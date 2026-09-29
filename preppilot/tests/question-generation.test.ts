import assert from 'node:assert/strict';
import test from 'node:test';
import { generateQuestion, validateGeneratedQuestion } from '@/agents/questionGenerationService';
import { extractChatCompletionContent } from '@/server/ai/llmClient';

const fallback = () => ({
  question: 'Fallback question about the candidate experience?', questionType: 'technical' as const,
  round: 'technical' as any, competency: 'Technical depth', difficulty: 'Standard', source: 'resume' as const,
  resumeTopic: 'Revenue dashboard', reason: 'Offline fallback', expectedCompetency: 'Technical reasoning',
  followUp: false, evidenceUsed: ['Revenue dashboard'],
});

const llmQuestion = () => ({
  question: 'For the Revenue dashboard, how did you validate the SQL data and choose the architecture for the reporting workflow?',
  questionType: 'technical' as const, round: 'technical' as any, competency: 'Architecture & Tooling Mastery',
  difficulty: 'Standard', source: 'resume' as const, resumeTopic: 'Revenue dashboard',
  reason: 'The question probes the uncovered resume project and its technical decisions.',
  expectedCompetency: 'Technical reasoning', followUp: false, evidenceUsed: ['Built a revenue dashboard'],
});

const context = {
  round: 'technical', targetRole: 'Data Analyst', difficulty: 'Standard',
  resumeTopic: 'Revenue dashboard', previousQuestions: [],
};

test('configured reachable LLM is the question source', async () => {
  let fallbackCalls = 0;
  const result = await generateQuestion(context, () => { fallbackCalls += 1; return fallback(); }, {
    hasApiKey: true, isBrowser: false, generateWithLlm: async () => llmQuestion(),
  });

  assert.equal(result.source, 'llm');
  assert.equal(result.llmSucceeded, true);
  assert.equal(fallbackCalls, 0);
  assert.match(result.question.question, /Revenue dashboard/i);
});

test('accepts the minimal provider question contract and enriches metadata locally', async () => {
  const result = await generateQuestion(context, fallback, {
    hasApiKey: true, isBrowser: false,
    generateWithLlm: async () => ({ question: 'How did you validate the dashboard data before sharing it with stakeholders?' } as any),
  });
  assert.equal(result.source, 'llm');
  assert.equal(result.question.source, 'resume');
  assert.equal(result.question.round, 'technical');
  assert.equal(result.question.questionType, 'technical');
});

test('missing API key uses the existing fallback without calling the LLM', async () => {
  let llmCalls = 0;
  const result = await generateQuestion(context, fallback, {
    hasApiKey: false, isBrowser: false, generateWithLlm: async () => { llmCalls += 1; return llmQuestion(); },
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.fallbackReason, 'no_api_key');
  assert.equal(llmCalls, 0);
});

test('invalid provider output falls back and does not expose an internal error', async () => {
  const result = await generateQuestion(context, fallback, {
    hasApiKey: true, isBrowser: false, generateWithLlm: async () => ({ ...llmQuestion(), question: 'Generic question?' }),
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.fallbackReason, 'invalid_model_response');
  assert.equal(result.question.question, 'Fallback question about the candidate experience?');
});

test('invalid credentials and provider failures fall back exactly once', async () => {
  let fallbackCalls = 0;
  let llmCalls = 0;
  const result = await generateQuestion(context, () => { fallbackCalls += 1; return fallback(); }, {
    hasApiKey: true, isBrowser: false,
    generateWithLlm: async () => { llmCalls += 1; throw new Error('401 Unauthorized: invalid API key'); },
  });

  assert.equal(llmCalls, 1);
  assert.equal(fallbackCalls, 1);
  assert.equal(result.fallbackReason, 'invalid_or_unreachable_provider');
});

test('fallback tracing receives a safe reason and no secret-bearing data', async () => {
  const traceEvents: Record<string, unknown>[] = [];
  const result = await generateQuestion(context, fallback, {
    hasApiKey: true, isBrowser: false,
    generateWithLlm: async () => { throw new Error('Request timed out'); },
    traceFallback: async (fallbackFn, metadata) => {
      traceEvents.push(metadata);
      return fallbackFn();
    },
  });

  assert.equal(result.source, 'fallback');
  assert.equal(traceEvents.length, 1);
  assert.equal(traceEvents[0].fallback_reason, 'timeout');
  assert.equal('apiKey' in traceEvents[0], false);
});

test('repeated questions are rejected by validation', () => {
  assert.equal(validateGeneratedQuestion(llmQuestion(), { ...context, previousQuestions: [llmQuestion().question] }), false);
});

test('extracts question content from compatible provider response shapes', () => {
  assert.equal(extractChatCompletionContent({ choices: [{ message: { content: [{ type: 'text', text: '{"question":"How did you test it?"}' }] } }] }), '{"question":"How did you test it?"}');
  assert.equal(extractChatCompletionContent({ output_text: '{"question":"How did you test it?"}' }), '{"question":"How did you test it?"}');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { getSessionScore, profile } from '@/lib/store';

test('dashboard trend uses the canonical nested evaluation score', () => {
  const sessions = [
    {
      id: 'old',
      createdAt: '2026-09-28T10:00:00.000Z',
      overall: 42,
      coachingFeedback: { score: 81 },
    },
    {
      id: 'new',
      createdAt: '2026-09-29T10:00:00.000Z',
      result: { overall: 67 },
    },
  ];

  assert.equal(getSessionScore(sessions[0]), 81);
  assert.deepEqual(profile(sessions).trend.map((point: { score: number }) => point.score), [81, 67]);
  assert.equal(profile(sessions).avg, 74);
});

test('legacy turn-only records are recovered without a fixed fallback score', () => {
  const session = {
    id: 'turns-only',
    createdAt: '2026-09-30T10:00:00.000Z',
    turns: [{ result: { overall: 34 } }, { result: { overall: 76 } }],
  };

  assert.equal(getSessionScore(session), 55);
  assert.equal(profile([session]).trend[0].score, 55);
});

test('turn evidence repairs a stale repeated summary score', () => {
  assert.equal(getSessionScore({
    overall: 42,
    turns: [{ result: { overall: 61 } }, { result: { overall: 77 } }],
  }), 69);
});

test('unscored records are excluded from the score trend', () => {
  const result = profile([
    { id: 'unscored', createdAt: '2026-09-28T10:00:00.000Z' },
    { id: 'scored', createdAt: '2026-09-29T10:00:00.000Z', overall: 73 },
  ]);

  assert.deepEqual(result.trend.map((point: { score: number }) => point.score), [73]);
  assert.equal(result.avg, 73);
});

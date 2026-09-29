import { NextRequest, NextResponse } from 'next/server';
import { BENCHMARK_TEST_CASES } from '@/data/benchmarkDataset';
import { runSingleBenchmarkTest } from '@/server/evaluation/benchmarkRunner';
import { BenchmarkResult } from '@/types/interview';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, testCaseId } = body as { apiKey?: string; testCaseId?: string };

    const casesToRun = testCaseId
      ? BENCHMARK_TEST_CASES.filter(c => c.id === testCaseId)
      : BENCHMARK_TEST_CASES;

    const results: BenchmarkResult[] = [];
    for (const tc of casesToRun) {
      const res = await runSingleBenchmarkTest(tc, apiKey);
      results.push(res);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalCases: results.length,
      passedCases: results.filter(r => r.status === 'passed').length,
      averageScores: {
        relevance: Math.round(results.reduce((acc, r) => acc + r.questionRelevanceScore, 0) / results.length),
        groundedness: Math.round(results.reduce((acc, r) => acc + r.evidenceGroundednessScore, 0) / results.length),
        usefulness: Math.round(results.reduce((acc, r) => acc + r.usefulnessScore, 0) / results.length),
        consistency: Math.round(results.reduce((acc, r) => acc + r.feedbackConsistencyScore, 0) / results.length)
      },
      results
    });
  } catch (error) {
    console.error('API Benchmark Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to run benchmark suite', details: String(error) },
      { status: 500 }
    );
  }
}

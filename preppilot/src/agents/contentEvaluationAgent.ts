import { StructuredQuestion } from '@/lib/dataset/datasetManager';
import { CandidateProfile } from '@/lib/api';

export interface ContentAgentInput {
  question: StructuredQuestion;
  candidateResponse: string;
  candidateProfile: CandidateProfile | null;
}

export interface ContentEvidenceItem {
  claim: string;
  verified: boolean;
  category: 'metric' | 'domain_concept' | 'answering_prompt' | 'missing_point';
  detail: string;
}

export interface ContentAgentOutput {
  evaluationSource?: 'llm' | 'deterministic_fallback';
  relevance: number; // 0-100
  completeness: number; // 0-100
  competency_match: number; // 0-100
  technical_depth: number; // 0-100
  answered_prompt: boolean;
  key_points_covered: string[];
  key_points_missed: string[];
  metrics_cited: string[];
  strengths: string[];
  gaps: string[];
  evidence: ContentEvidenceItem[];
}

export class ContentEvaluationAgent {
  public static readonly agentName = "Content Evaluation Agent";
  public static readonly id = "content";
  public static readonly prompt = `You are the Content Evaluation Agent.
Determine whether the candidate answered the exact question asked, maintained relevance, proved technical or functional rigor, backed claims with concrete metrics, and satisfied the expected competencies.
Extract verbatim citations from the response and map them to the rubric checklist.`;

  public static async execute(input: ContentAgentInput): Promise<ContentAgentOutput> {
    const text = input.candidateResponse.trim();
    const words = text ? text.split(/\s+/) : [];
    const wordCount = words.length;
    const lower = text.toLowerCase();
    const qLower = input.question.question.toLowerCase();

    // 1. Check prompt keywords overlap
    const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "what", "when", "tell", "about", "describe", "explain"]);
    const qKeywords = qLower
      .split(/\W+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    let qMatches = 0;
    for (const kw of qKeywords) {
      if (lower.includes(kw)) qMatches++;
    }
    const keywordOverlapRatio = qKeywords.length > 0 ? qMatches / qKeywords.length : 0.5;

    // 2. Metric extraction (numbers, %, $, latency units, throughput)
    const metricMatches = text.match(/\b(?:\$?\d+(?:\.\d+)?%?|\d+\s*(?:ms|seconds|minutes|k|m|gb|tb|eps|qps|users))\b/gi) || [];
    const metrics_cited = Array.from(new Set(metricMatches));

    // 3. Model Checklist Points
    const key_points_covered: string[] = [];
    const key_points_missed: string[] = [];

    const modelPoints = input.question.modelPoints || [];
    for (const point of modelPoints) {
      const pWords = point.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
      const hit = pWords.some(w => lower.includes(w.slice(0, Math.max(4, w.length - 2))));
      if (hit) {
        key_points_covered.push(point);
      } else {
        key_points_missed.push(point);
      }
    }

    // 4. Calculate Scores
    const answered_prompt = wordCount >= 20 && keywordOverlapRatio >= 0.25;

    const pointsRatio = modelPoints.length > 0 ? key_points_covered.length / modelPoints.length : 0.6;
    const lengthBudget = Math.max(input.question.durationSec / 2.2, 50);
    const lengthRatio = Math.min(wordCount / lengthBudget, 1.2);

    // Scores must be earned from response evidence. The previous 60/55/50
    // baselines made an unrelated but polished answer appear competent.
    let relevance = 12 + Math.min(wordCount / 45, 1) * 18 + keywordOverlapRatio * 38 + pointsRatio * 22;
    let completeness = 8 + lengthRatio * 28 + pointsRatio * 52 + Math.min(metrics_cited.length, 2) * 4;
    let competency_match = 10 + pointsRatio * 62 + keywordOverlapRatio * 20 + Math.min(metrics_cited.length, 2) * 4;
    let technical_depth = 8 + pointsRatio * 58 + Math.min(metrics_cited.length, 2) * 8 + (wordCount >= 70 ? 8 : 0);

    if (!answered_prompt) relevance = Math.min(relevance, 42);
    if (wordCount < 25) {
      relevance = Math.min(relevance, 30);
      completeness = Math.min(completeness, 24);
      competency_match = Math.min(competency_match, 28);
      technical_depth = Math.min(technical_depth, 25);
    }

    const clamp = (v: number) => Math.max(0, Math.min(96, Math.round(v)));
    relevance = clamp(relevance);
    completeness = clamp(completeness);
    competency_match = clamp(competency_match);
    technical_depth = clamp(technical_depth);

    // 5. Evidence Extraction
    const evidence: ContentEvidenceItem[] = [];

    if (metrics_cited.length > 0) {
      evidence.push({
        claim: metrics_cited.slice(0, 3).join(', '),
        verified: true,
        category: 'metric',
        detail: `Candidate grounded claims with quantifiable empirical data: ${metrics_cited.join(', ')}.`
      });
    } else {
      evidence.push({
        claim: "Outcome was stated qualitatively without numbers",
        verified: false,
        category: 'metric',
        detail: "No numerical metrics (percentages, latency, cost savings) detected in response."
      });
    }

    if (key_points_covered.length > 0) {
      evidence.push({
        claim: key_points_covered[0],
        verified: true,
        category: 'answering_prompt',
        detail: `Addressed expected technical point: "${key_points_covered[0]}".`
      });
    }

    if (key_points_missed.length > 0) {
      evidence.push({
        claim: key_points_missed[0],
        verified: false,
        category: 'missing_point',
        detail: `Omitted key criteria: "${key_points_missed[0]}".`
      });
    }

    // 6. Strengths & Gaps
    const strengths: string[] = [];
    const gaps: string[] = [];

    if (relevance >= 80) {
      strengths.push("Directly tackled the core question without deflecting to unrelated projects.");
    }
    if (metrics_cited.length >= 2) {
      strengths.push(`Rich quantitative evidence: cited ${metrics_cited.join(', ')} to validate scale and impact.`);
    } else if (metrics_cited.length === 1) {
      strengths.push(`Included quantifiable outcome data (${metrics_cited[0]}).`);
    }

    if (key_points_covered.length >= 2) {
      strengths.push(`Hit critical expected rubric points: ${key_points_covered.slice(0, 2).join('; ')}.`);
    }

    if (metrics_cited.length === 0) {
      gaps.push("Lack of numerical grounding. Quantify your impact with at least one measurable data point (%, time saved, latency).");
    }

    if (key_points_missed.length > 0) {
      gaps.push(`Missed expected dimension: "${key_points_missed[0]}" — incorporate this trade-off explicitly.`);
    }

    if (wordCount < 70) {
      gaps.push("The explanation is thin for the required technical depth. Elaborate on the specific implementation mechanics.");
    }

    return {
      relevance,
      completeness,
      competency_match,
      technical_depth,
      answered_prompt,
      key_points_covered,
      key_points_missed,
      metrics_cited,
      strengths,
      gaps,
      evidence
    };
  }
}

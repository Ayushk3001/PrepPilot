import { CandidateProfile } from '@/lib/api';
import { StructuredQuestion } from '@/lib/dataset/datasetManager';
import { CommunicationAgentOutput } from './communicationAnalysisAgent';
import { ContentAgentOutput } from './contentEvaluationAgent';
import { StarAgentOutput } from './starStructureAgent';
import { QuestionAgentOutput } from './interviewQuestionAgent';

export interface CoachAgentInput {
  candidateProfile: CandidateProfile | null;
  questionOutput: QuestionAgentOutput;
  candidateResponse: string;
  commOutput: CommunicationAgentOutput;
  contentOutput: ContentAgentOutput;
  starOutput: StarAgentOutput;
}

export interface CoachAgentOutput {
  evaluationSource?: 'llm' | 'deterministic_fallback';
  overallScore: number; // 0-100
  verdict: string;
  dimensionScores: {
    relevance: number;
    clarity: number;
    structure: number;
    completeness: number;
    communication: number;
  };
  strengths: string[];
  improvements: string[];
  evidenceHighlights: Array<{
    dimension: string;
    quoteOrSignal: string;
    coachingNote: string;
  }>;
  actionableAdvice: string[];
  improvedAnswer: string;
  hitPoints: string[];
  followUpQuestions: string[];
  recurringGapKey?: 'fillers' | 'results' | 'structure' | 'hedges' | 'thin';
}

export class InterviewCoachAgent {
  public static readonly agentName = "Lead Interview Coach Agent";
  public static readonly id = "coach";
  public static readonly prompt = `You are the Lead Interview Coach Agent.
Consolidate the evaluations of the Interview Question Agent, Communication Analysis Agent, Content Evaluation Agent, and STAR Structure Agent into a unified, actionable coaching report.
Generate an overall score, evidence-grounded strengths and weaknesses, an improved model rewrite, and personalized follow-up questions directly responsive to the candidate's detected gaps and claims.`;

  public static async execute(input: CoachAgentInput): Promise<CoachAgentOutput> {
    const { questionOutput, candidateResponse, commOutput, contentOutput, starOutput } = input;
    const q = questionOutput.question;

    // Dimension weights:
    // Relevance 20%, Clarity 20%, Structure 25%, Completeness 15%, Communication 20%
    const dimensionScores = {
      relevance: contentOutput.relevance,
      clarity: commOutput.clarity,
      structure: starOutput.structure_score,
      completeness: contentOutput.completeness,
      communication: commOutput.communication_quality,
    };

    let overallScore = Math.round(
      dimensionScores.relevance * 0.20 +
      dimensionScores.clarity * 0.20 +
      dimensionScores.structure * 0.25 +
      dimensionScores.completeness * 0.15 +
      dimensionScores.communication * 0.20
    );

    // Guardrails prevent fluent non-answers from receiving a passing overall
    // score merely because they are concise or contain no fillers.
    const normalizedResponse = candidateResponse.trim().toLowerCase();
    const isExplicitNonAnswer = /\b(i don'?t know|no idea|cannot answer|can'?t answer|not sure|idk|whatever|nothing to say)\b/.test(normalizedResponse);
    if (isExplicitNonAnswer || commOutput.word_count < 12) {
      overallScore = Math.min(overallScore, 25);
    } else if (!contentOutput.answered_prompt || contentOutput.key_points_covered.length === 0) {
      overallScore = Math.min(overallScore, 52);
    } else if (contentOutput.key_points_covered.length === 1 && contentOutput.completeness < 45) {
      overallScore = Math.min(overallScore, 60);
    }

    // Verdict
    let verdict = "";
    if (overallScore >= 85) {
      verdict = "Panel-ready — structured, specific, and technically confident.";
    } else if (overallScore >= 72) {
      verdict = "Strong response with good technical bones. Tighten the conclusion with quantifiable metrics.";
    } else if (overallScore >= 58) {
      verdict = "Promising direction, but narrative structure and empirical evidence need calibration.";
    } else {
      verdict = "Needs substantial reinforcement. Focus on first-person ownership and concrete technical actions.";
    }

    // Consolidate Strengths
    const strengths: string[] = [];
    if (starOutput.strengths.length > 0) strengths.push(starOutput.strengths[0]);
    if (contentOutput.strengths.length > 0) strengths.push(contentOutput.strengths[0]);
    if (commOutput.strengths.length > 0) strengths.push(commOutput.strengths[0]);
    if (strengths.length < 2) {
      strengths.push("Directly tackled the challenge and shared first-hand engineering context.");
    }

    // Consolidate Improvements
    const improvements: string[] = [];
    if (starOutput.improvements.length > 0) improvements.push(starOutput.improvements[0]);
    if (contentOutput.gaps.length > 0) improvements.push(contentOutput.gaps[0]);
    if (commOutput.improvements.length > 0) improvements.push(commOutput.improvements[0]);
    if (improvements.length < 2) {
      improvements.push("Sharpen the opening line: lead with the headline impact before detailing implementation.");
    }

    // Evidence Highlights
    const evidenceHighlights: CoachAgentOutput['evidenceHighlights'] = [];

    if (starOutput.result.evidence) {
      evidenceHighlights.push({
        dimension: "STAR Result",
        quoteOrSignal: `"${starOutput.result.evidence}"`,
        coachingNote: starOutput.result.critique
      });
    } else {
      evidenceHighlights.push({
        dimension: "STAR Result",
        quoteOrSignal: "Missing final quantitative outcome",
        coachingNote: "Interviewers look for a clear statement of what changed (latency, cost, throughput, SLA)."
      });
    }

    if (commOutput.evidence.length > 0) {
      const firstComm = commOutput.evidence[0];
      evidenceHighlights.push({
        dimension: "Delivery & Tone",
        quoteOrSignal: firstComm.text,
        coachingNote: firstComm.critique
      });
    }

    if (contentOutput.evidence.length > 0) {
      const firstContent = contentOutput.evidence[0];
      evidenceHighlights.push({
        dimension: "Content Rigor",
        quoteOrSignal: firstContent.claim,
        coachingNote: firstContent.detail
      });
    }

    // Actionable Advice
    const actionableAdvice = [
      "Follow the 10-second rule: State the Situation and Task in under 30 seconds, spend 60 seconds on concrete Actions you personally took, and reserve 30 seconds for measurable Results.",
      "Quantify your contribution: Whenever you mention an improvement, pair it with a unit of measure (%, hours saved, $ cost reduction, p99 latency).",
      "Signpost out loud: Use transition markers ('First... then... which meant that...') to keep non-technical interviewers in sync."
    ];

    // Improved Model Answer
    let improvedAnswer = q.modelAnswer;
    if (!improvedAnswer) {
      improvedAnswer = `Situation: When our production services experienced scaling bottlenecks under heavy load, Task: I was responsible for diagnosing the latency degradation and delivering a resilient fix before the client release. Action: I built an empirical benchmark, identified the thread pool deadlock, refactored our asynchronous worker queues, and implemented automated retry backoffs. Result: The new architecture reduced p99 latency by 54% and passed all client load tests with zero errors.`;
    }

    // Model Checklist Hit Points
    const hitPoints = q.modelPoints.length > 0
      ? q.modelPoints
      : ["Clear situation context", "Direct first-person action", "Quantifiable business result", "Zero filler words"];

    // Generate Personalized Response-Dependent Follow-Up Questions
    const followUpQuestions: string[] = [];

    // Gaps-driven followups:
    if (starOutput.result.status === 'missing' || starOutput.result.status === 'weak') {
      followUpQuestions.push("You described the technical changes, but what was the exact quantifiable metric or percentage improvement achieved?");
    }
    if (starOutput.action.status === 'weak') {
      followUpQuestions.push("You mentioned 'we worked on the solution' — what was the specific component you personally architected or coded?");
    }
    if (contentOutput.metrics_cited.length === 0) {
      followUpQuestions.push("If executive leadership asked for the financial or customer ROI of that decision, what number would you share?");
    }

    // Domain & response-driven followups:
    const lowerResp = candidateResponse.toLowerCase();
    if (lowerResp.includes("kafka") || lowerResp.includes("queue") || lowerResp.includes("stream")) {
      followUpQuestions.push("If that event queue experienced sudden consumer lag spikes, how would your partition telemetry auto-scale?");
    } else if (lowerResp.includes("database") || lowerResp.includes("sql") || lowerResp.includes("postgres")) {
      followUpQuestions.push("How did you ensure database read-replica consistency and prevent stale queries during that traffic spike?");
    } else if (lowerResp.includes("microservice") || lowerResp.includes("api") || lowerResp.includes("service")) {
      followUpQuestions.push("What failover circuit breaker pattern did you implement to isolate upstream dependency failures?");
    } else {
      followUpQuestions.push("What was the biggest technical risk or alternative approach you considered and ultimately discarded?");
    }

    // Merge with preset followups if needed
    for (const f of q.followUps) {
      if (!followUpQuestions.includes(f) && followUpQuestions.length < 3) {
        followUpQuestions.push(f);
      }
    }

    // Identify primary recurring gap key
    let recurringGapKey: CoachAgentOutput['recurringGapKey'];
    if (commOutput.filler_words > 2) recurringGapKey = 'fillers';
    else if (starOutput.result.status === 'missing' || contentOutput.metrics_cited.length === 0) recurringGapKey = 'results';
    else if (starOutput.structure_score < 70) recurringGapKey = 'structure';
    else if (commOutput.hedging > 2) recurringGapKey = 'hedges';
    else if (commOutput.word_count < 90) recurringGapKey = 'thin';

    return {
      overallScore,
      verdict,
      dimensionScores,
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 4),
      evidenceHighlights,
      actionableAdvice,
      improvedAnswer,
      hitPoints,
      followUpQuestions: followUpQuestions.slice(0, 3),
      recurringGapKey
    };
  }
}

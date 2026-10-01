import { CandidateProfile } from '@/lib/api';
import { StructuredQuestion } from '@/lib/dataset/datasetManager';
import { InterviewQuestionAgent, QuestionAgentOutput } from './interviewQuestionAgent';
import { CommunicationAnalysisAgent, CommunicationAgentOutput } from './communicationAnalysisAgent';
import { ContentEvaluationAgent, ContentAgentOutput } from './contentEvaluationAgent';
import { StarStructureAgent, StarAgentOutput } from './starStructureAgent';
import { InterviewCoachAgent, CoachAgentOutput } from './interviewCoachAgent';

export interface A2AMessage {
  from: string; // e.g. "comm_agent"
  to: string; // e.g. "coach_agent"
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'sent' | 'delivered' | 'processed';
  latencyMs?: number;
}

export interface MultiAgentPipelineResult {
  id: string;
  questionId: string;
  questionText: string;
  competency: string;
  type: string;
  difficulty: string;
  mode: string;
  answer: string;
  metrics: {
    words: number;
    fillers: number;
    wpm: number | null;
    avgSentenceLen: number;
    numbers: number;
    hedges: number;
  };
  scores: {
    relevance: number;
    clarity: number;
    structure: number;
    completeness: number;
    communication: number;
  };
  overall: number;
  verdict: string;
  star: {
    situation: { detected: boolean; evidence: string };
    task: { detected: boolean; evidence: string };
    action: { detected: boolean; evidence: string };
    result: { detected: boolean; evidence: string };
  };
  starApplicable?: boolean;
  starFilled: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  modelPoints: string[];
  followUps: string[];
  evidenceHighlights: CoachAgentOutput['evidenceHighlights'];
  actionableAdvice: string[];
  recurringGapKey?: string;
  a2aMessages: A2AMessage[];
  timings: Record<string, number>;
  createdAt: string;
}

export type PipelineStageCallback = (
  stageId: 'question' | 'comm' | 'content' | 'star' | 'coach',
  status: 'running' | 'done' | 'error',
  output?: Record<string, unknown>
) => void;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MultiAgentPipeline {
  /**
   * Executes the full 5-agent pipeline end-to-end with real A2A messaging.
   */
  public static async execute(
    params: {
      question: StructuredQuestion;
      answer: string;
      mode: 'voice' | 'text' | string;
      candidateProfile?: CandidateProfile | null;
      wpm?: number | null;
    },
    onStage?: PipelineStageCallback
  ): Promise<MultiAgentPipelineResult> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    const a2aMessages: A2AMessage[] = [];

    // Helper to log A2A message
    const logA2A = (from: string, to: string, payload: Record<string, unknown>, latencyMs?: number) => {
      a2aMessages.push({
        from,
        to,
        payload,
        timestamp: new Date().toISOString(),
        status: 'processed',
        latencyMs
      });
    };

    // -------------------------------------------------------------
    // STAGE 1: Interview Question Agent
    // -------------------------------------------------------------
    onStage?.('question', 'running');
    const t0Question = Date.now();
    await delay(350);

    const questionOutput: QuestionAgentOutput = await InterviewQuestionAgent.execute({
      candidateProfile: params.candidateProfile || null,
      targetRole: params.question.role,
      competency: params.question.competency,
      difficulty: params.question.difficulty,
      questionType: params.question.questionType,
    });
    timings.question = Date.now() - t0Question;

    logA2A('candidate_profile', 'question_agent', {
      targetRole: params.question.role,
      competency: params.question.competency,
      difficulty: params.question.difficulty,
      candidate: params.candidateProfile?.name || 'Guest Candidate'
    }, timings.question);

    logA2A('question_agent', 'evaluators', {
      selectedQuestionId: params.question.id,
      expectedCompetency: params.question.expectedCompetency,
      expectSTAR: params.question.expectSTAR,
      modelRubricCriteriaCount: params.question.evaluationCriteria.length
    });

    onStage?.('question', 'done', {
      selected: params.question.id,
      competency: params.question.competency,
      difficulty: params.question.difficulty,
      latencyMs: timings.question
    });

    // -------------------------------------------------------------
    // STAGE 2: Communication Analysis Agent
    // -------------------------------------------------------------
    onStage?.('comm', 'running');
    const t0Comm = Date.now();
    await delay(450);

    const commOutput: CommunicationAgentOutput = await CommunicationAnalysisAgent.execute({
      candidateResponse: params.answer,
      mode: params.mode,
      wpm: params.wpm
    });
    timings.comm = Date.now() - t0Comm;

    logA2A('comm_agent', 'coach_agent', {
      clarity: commOutput.clarity,
      conciseness: commOutput.conciseness,
      fillerCount: commOutput.filler_words,
      hedgingCount: commOutput.hedging,
      wpm: commOutput.wpm,
      tone: commOutput.tone
    }, timings.comm);

    onStage?.('comm', 'done', {
      wpm: commOutput.wpm,
      fillers: commOutput.filler_words,
      hedges: commOutput.hedging,
      avg_sentence_len: commOutput.avg_sentence_len,
      clarity: commOutput.clarity,
      communication: commOutput.communication_quality,
      latencyMs: timings.comm
    });

    // -------------------------------------------------------------
    // STAGE 3: Content Evaluation Agent
    // -------------------------------------------------------------
    onStage?.('content', 'running');
    const t0Content = Date.now();
    await delay(450);

    const contentOutput: ContentAgentOutput = await ContentEvaluationAgent.execute({
      question: params.question,
      candidateResponse: params.answer,
      candidateProfile: params.candidateProfile || null
    });
    timings.content = Date.now() - t0Content;

    logA2A('content_agent', 'coach_agent', {
      relevance: contentOutput.relevance,
      completeness: contentOutput.completeness,
      competencyMatch: contentOutput.competency_match,
      metricsCitedCount: contentOutput.metrics_cited.length,
      pointsHit: contentOutput.key_points_covered.length
    }, timings.content);

    onStage?.('content', 'done', {
      relevance: contentOutput.relevance,
      completeness: contentOutput.completeness,
      words: commOutput.word_count,
      metricsCount: contentOutput.metrics_cited.length,
      latencyMs: timings.content
    });

    // -------------------------------------------------------------
    // STAGE 4: STAR Structure Agent
    // -------------------------------------------------------------
    onStage?.('star', 'running');
    const t0Star = Date.now();
    await delay(400);

    const starOutput: StarAgentOutput = await StarStructureAgent.execute({
      candidateResponse: params.answer,
      expectSTAR: params.question.expectSTAR
    });
    timings.star = Date.now() - t0Star;

    logA2A('star_agent', 'coach_agent', {
      structureScore: starOutput.structure_score ?? 0,
      starFilled: starOutput.starFilled,
      situation: starOutput.situation.status,
      task: starOutput.task.status,
      action: starOutput.action.status,
      result: starOutput.result.status
    }, timings.star);

    onStage?.('star', 'done', {
      filled: starOutput.starFilled,
      structure: starOutput.structure_score ?? 0,
      star: {
        situation: starOutput.situation.status,
        task: starOutput.task.status,
        action: starOutput.action.status,
        result: starOutput.result.status
      },
      latencyMs: timings.star
    });

    // -------------------------------------------------------------
    // STAGE 5: Interview Coach Agent
    // -------------------------------------------------------------
    onStage?.('coach', 'running');
    const t0Coach = Date.now();
    await delay(500);

    const coachOutput: CoachAgentOutput = await InterviewCoachAgent.execute({
      candidateProfile: params.candidateProfile || null,
      questionOutput,
      candidateResponse: params.answer,
      commOutput,
      contentOutput,
      starOutput
    });
    timings.coach = Date.now() - t0Coach;

    logA2A('coach_agent', 'candidate_dashboard', {
      overallScore: coachOutput.overallScore,
      verdict: coachOutput.verdict,
      followUpsGenerated: coachOutput.followUpQuestions.length,
      recurringGap: coachOutput.recurringGapKey
    }, timings.coach);

    onStage?.('coach', 'done', {
      overall: coachOutput.overallScore,
      scores: coachOutput.dimensionScores,
      latencyMs: timings.coach
    });

    // Assemble unified result
    return {
      id: `s_${Date.now()}`,
      questionId: params.question.id,
      questionText: params.question.question,
      competency: params.question.competency,
      type: params.question.questionType,
      difficulty: params.question.difficulty,
      mode: params.mode,
      answer: params.answer,
      metrics: {
        words: commOutput.word_count,
        fillers: commOutput.filler_words,
        wpm: commOutput.wpm,
        avgSentenceLen: commOutput.avg_sentence_len,
        numbers: contentOutput.metrics_cited.length,
        hedges: commOutput.hedging
      },
      scores: coachOutput.dimensionScores,
      overall: coachOutput.overallScore,
      verdict: coachOutput.verdict,
      star: {
        situation: {
          detected: starOutput.situation.status === 'detected' || starOutput.situation.status === 'strong',
          evidence: starOutput.situation.evidence || "No context-setting sentence found."
        },
        task: {
          detected: starOutput.task.status === 'detected' || starOutput.task.status === 'strong',
          evidence: starOutput.task.evidence || "No explicit responsibility statement found."
        },
        action: {
          detected: starOutput.action.status === 'detected' || starOutput.action.status === 'strong',
          evidence: starOutput.action.evidence || "No first-person action verbs detected."
        },
        result: {
          detected: starOutput.result.status === 'detected' || starOutput.result.status === 'strong',
          evidence: starOutput.result.evidence || "No measurable outcome stated."
        }
      },
      starFilled: starOutput.starFilled,
      strengths: coachOutput.strengths,
      improvements: coachOutput.improvements,
      modelAnswer: coachOutput.improvedAnswer,
      modelPoints: coachOutput.hitPoints,
      followUps: coachOutput.followUpQuestions,
      evidenceHighlights: coachOutput.evidenceHighlights,
      actionableAdvice: coachOutput.actionableAdvice,
      recurringGapKey: coachOutput.recurringGapKey,
      a2aMessages,
      timings,
      createdAt: new Date().toISOString()
    };
  }
}

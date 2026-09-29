import { CandidateProfile } from '@/lib/api';
import { defaultDatasetManager, StructuredQuestion } from '@/lib/dataset/datasetManager';

export interface QuestionAgentInput {
  candidateProfile: CandidateProfile | null;
  targetRole: string;
  competency: string;
  difficulty: 'Warm-up' | 'Standard' | 'Senior' | string;
  questionType: string;
  previousQuestionIds?: string[];
}

export interface QuestionAgentOutput {
  question: StructuredQuestion;
  expectedCompetency: string;
  evaluationCriteria: string[];
  metadata: {
    role: string;
    competency: string;
    difficulty: string;
    durationSec: number;
    expectSTAR: boolean;
    tailoredToProfile: boolean;
    matchingSignals: string[];
  };
}

export class InterviewQuestionAgent {
  public static readonly agentName = "Interview Question Agent";
  public static readonly id = "question";
  public static readonly prompt = `You are the Interview Question Agent.
Your responsibility is to analyze the candidate's profile, target role, technical skills, projects, and target competency.
Select or synthesize a rigorous, authentic interview question calibrated to the target role and difficulty.
Avoid unnecessary repetition from previous sessions and formulate the expected competencies and rubric criteria.`;

  public static async execute(input: QuestionAgentInput): Promise<QuestionAgentOutput> {
    const question = defaultDatasetManager.selectPersonalizedQuestion(input.candidateProfile, {
      role: input.targetRole,
      competency: input.competency,
      difficulty: input.difficulty,
      type: input.questionType,
      previousQuestionIds: input.previousQuestionIds,
    });

    const matchingSignals: string[] = [];
    if (input.candidateProfile) {
      const skills = input.candidateProfile.technical_skills || [];
      const text = (question.question + ' ' + (question.focus || []).join(' ')).toLowerCase();
      skills.forEach(s => {
        if (text.includes(s.toLowerCase())) matchingSignals.push(s);
      });
      (input.candidateProfile.domains || []).forEach(d => {
        if (text.includes(d.toLowerCase())) matchingSignals.push(d);
      });
    }

    return {
      question,
      expectedCompetency: question.expectedCompetency,
      evaluationCriteria: question.evaluationCriteria,
      metadata: {
        role: question.role,
        competency: question.competency,
        difficulty: question.difficulty,
        durationSec: question.durationSec,
        expectSTAR: question.expectSTAR,
        tailoredToProfile: matchingSignals.length > 0,
        matchingSignals: matchingSignals.slice(0, 4),
      },
    };
  }
}

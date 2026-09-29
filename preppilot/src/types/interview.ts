export type RoleType = 
  | 'Fullstack Software Engineer'
  | 'Telecom & Network Systems Engineer'
  | 'Cloud & DevOps Engineer'
  | 'AI & Data Platform Engineer'
  | 'Engineering Manager / Tech Lead';

export type StageType = 
  | 'HR & Culture Screening'
  | 'Behavioral & STAR Competency'
  | 'Technical & Domain Depth'
  | 'System Design & Scenarios'
  | 'Executive & Client Communication';

export type DifficultyLevel = 'Entry' | 'Mid-Level' | 'Senior' | 'Lead / Principal';

export interface CandidateProfile {
  id: string;
  fullName: string;
  targetRole: RoleType;
  experienceYears: number;
  keySkills: string[];
  bio: string;
}

export interface InterviewQuestion {
  id: string;
  role: RoleType;
  stage: StageType;
  competency: string;
  difficulty: DifficultyLevel;
  questionType: 'Behavioral' | 'Technical' | 'Scenario-Based' | 'HR / Cultural Fit';
  question: string;
  expectedCompetencies: string[];
  evaluationCriteria: string[];
  idealStarResponse?: string;
  weakResponseExample?: string;
}

export interface SpeechMetrics {
  durationSeconds: number;
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerWordsDetected: { word: string; count: number }[];
  pacingAssessment: 'Too Slow' | 'Optimal Pace' | 'Too Fast';
}

export interface StarAnalysis {
  situation: { present: boolean; snippet?: string; score: number; critique: string };
  task: { present: boolean; snippet?: string; score: number; critique: string };
  action: { present: boolean; snippet?: string; score: number; critique: string };
  result: { present: boolean; snippet?: string; score: number; critique: string; quantifiable: boolean };
  overallStarScore: number;
}

export interface CommunicationFeedback {
  clarityScore: number; // 0-100
  concisenessScore: number; // 0-100
  tone: 'Professional & Confident' | 'Hesitant / Passive' | 'Overly Informal' | 'Defensive' | 'Rushed';
  communicationQualityScore: number; // 0-100
  strengths: string[];
  fillerWordCritique: string;
  pacingCritique: string;
}

export interface ContentFeedback {
  relevanceScore: number; // 0-100
  technicalDepthScore: number; // 0-100
  accuracyScore: number; // 0-100
  completenessScore: number; // 0-100
  demonstratedCompetencies: string[];
  missedKeyPoints: string[];
  groundedEvidenceQuotes: string[];
}

export interface AgentTraceMessage {
  agentName: 'Interview Question Agent' | 'Communication Analysis Agent' | 'Content Evaluation Agent' | 'STAR Structure Agent' | 'Interview Coach Agent';
  stage: 'input' | 'processing' | 'handoff' | 'critique' | 'complete';
  timestamp: string;
  latencyMs: number;
  summary: string;
  details?: Record<string, unknown>;
}

export interface LearningResource {
  topic: string;
  type: 'video' | 'documentation' | 'tutorial';
  title: string;
  url: string;
  provider: 'YouTube' | 'Official Docs' | 'Interactive Lab' | 'Prodapt Academy';
  estimatedTime: string;
  reason: string;
}

export interface CoachingFeedback {
  overallScore: number; // 0-100
  verdict: 'Ready for Next Stage' | 'Promising - Needs Refinement' | 'Needs Substantial Practice';
  rubricScores: {
    relevance: number;
    clarity: number;
    responseStructure: number;
    completeness: number;
    communicationQuality: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  starBreakdown?: StarAnalysis;
  communicationAnalysis: CommunicationFeedback;
  contentEvaluation: ContentFeedback;
  improvedModelAnswer: string;
  answerRewriteGuidance: string[];
  adaptiveFollowUpQuestion: {
    question: string;
    intent: string;
    probingArea: string;
  };
  personalizedImprovementPlan: {
    immediateFix: string;
    mediumTermPractice: string;
    recommendedFramework: string;
  };
  curatedResources: LearningResource[];
  recurringGapsIdentified: string[];
}

export interface PracticeSessionRecord {
  id: string;
  timestamp: string;
  candidateProfile: CandidateProfile;
  question: InterviewQuestion;
  candidateResponse: string;
  speechMetrics?: SpeechMetrics;
  coachingFeedback: CoachingFeedback;
  agentTraces: AgentTraceMessage[];
  executionTimeMs: number;
  modelUsed: string;
}

export interface BenchmarkTestCase {
  id: string;
  title: string;
  question: InterviewQuestion;
  candidateResponse: string;
  expectedDeficiency: string;
}

export interface BenchmarkResult {
  testCaseId: string;
  title: string;
  questionRelevanceScore: number;
  responseAnalysisQuality: number;
  feedbackConsistencyScore: number;
  evidenceGroundednessScore: number;
  usefulnessScore: number;
  latencyMs: number;
  status: 'passed' | 'warning' | 'failed';
  detectedGroundedQuote: string;
  aiVerdictSummary: string;
}

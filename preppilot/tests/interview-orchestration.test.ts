import assert from 'node:assert/strict';
import test from 'node:test';
import { runInterviewGraph } from '@/lib/interview/graph';
import { InterviewController } from '@/lib/interview/controller';
import { initializeSessionState } from '@/agents/resumeInterviewerAgent';
import { ResumeInterviewerAgent } from '@/agents/resumeInterviewerAgent';
import { ContentEvaluationAgent } from '@/agents/contentEvaluationAgent';
import { CommunicationAnalysisAgent } from '@/agents/communicationAnalysisAgent';
import { StarStructureAgent } from '@/agents/starStructureAgent';
import { InterviewCoachAgent } from '@/agents/interviewCoachAgent';
import { runEvaluation } from '@/lib/coachEngine';
import type { ResumeKnowledgeModel } from '@/lib/resume/resumeKnowledge';

const knowledge: ResumeKnowledgeModel = {
  candidate: { name: 'Test Candidate', email: 'candidate@example.com', phone: '', location: '', summary: '' },
  education: [], experience: [], projects: [], certifications: [], achievements: [], organizations: [], rawText: '',
  skills: { technical: ['SQL'], soft: [], technologies: ['SQL'], domains: ['Analytics'] },
  evidenceGraph: [{ id: 'project_1', topic: 'Revenue dashboard', category: 'project', facts: ['Built a revenue dashboard'], skills: ['SQL'], technologies: ['SQL'], metrics: [], responsibilities: [], achievements: [], potentialCompetencies: ['Data analysis'], source: 'resume', covered: false, timesExplored: 0 }],
};

test('controller enforces total-question and follow-up limits', () => {
  const state = initializeSessionState(knowledge, 'technical', 'da');
  state.totalQuestionsAsked = state.maxTotalQuestions;
  assert.equal(InterviewController.isQuestionLimitReached(state), true);
  assert.equal(InterviewController.canAskCoreQuestion(state), false);
  state.totalQuestionsAsked = 1;
  state.currentFollowUpsForCore = state.maxFollowUpsPerQuestion;
  assert.equal(InterviewController.canAskFollowUp(state, true), false);
});

test('controller ends an expired interview regardless of model intent', () => {
  const state = initializeSessionState(knowledge, 'hr', 'da');
  state.startedAt = new Date(Date.now() - state.durationMinutes * 60_000 - 1).toISOString();
  assert.equal(InterviewController.isTimeExceeded(state), true);
  assert.equal(InterviewController.shouldEndInterview(state), true);
});

test('LangGraph returns a completion turn when the hard limit is reached', async () => {
  const state = initializeSessionState(knowledge, 'hr', 'da');
  state.totalQuestionsAsked = state.maxTotalQuestions;
  const result = await runInterviewGraph({ sessionState: state, lastAnswer: 'A detailed answer.', lastEvaluation: {}, nextQuestion: undefined, complete: false, requestId: undefined });
  assert.equal(result.complete, true);
  assert.equal(result.nextQuestion?.isCompleted, true);
  assert.equal(result.sessionState.isCompleted, true);
});

test('HR introduction stays focused on career story and role motivation', async () => {
  const state = initializeSessionState(knowledge, 'hr', 'aiml');
  const result = await ResumeInterviewerAgent.decideNextQuestion(state);
  assert.equal(result.nextQuestion.round, 'hr');
  assert.match(result.nextQuestion.question, /introduce yourself|career/i);
  assert.doesNotMatch(result.nextQuestion.question, /architecture|technical decision|project from your resume/i);
});

test('a short non-answer cannot receive a passing evaluation', async () => {
  const question: any = {
    id: 'rubric_test', question: 'Tell me about a time you resolved a production incident.', role: 'swe',
    competency: 'behavioral', difficulty: 'Standard', questionType: 'Behavioral',
    expectedCompetency: 'Incident ownership', evaluationCriteria: ['Context', 'Action', 'Result'],
    focus: [], durationSec: 150, expectSTAR: true,
    modelPoints: ['Explain the incident context', 'Describe your personal action', 'State a measurable result'],
    modelAnswer: '', followUps: [],
  };
  const answer = "I don't know. Nothing to say.";
  const [content, communication, star] = await Promise.all([
    ContentEvaluationAgent.execute({ question, candidateResponse: answer, candidateProfile: null }),
    CommunicationAnalysisAgent.execute({ candidateResponse: answer, mode: 'text' }),
    StarStructureAgent.execute({ candidateResponse: answer, expectSTAR: true }),
  ]);
  const coach = await InterviewCoachAgent.execute({
    candidateProfile: null,
    questionOutput: { question, expectedCompetency: question.expectedCompetency, evaluationCriteria: question.evaluationCriteria, metadata: {} } as any,
    candidateResponse: answer,
    commOutput: communication,
    contentOutput: content,
    starOutput: star,
  });

  assert.ok(content.relevance <= 30);
  assert.ok(content.completeness <= 24);
  assert.ok(star.structure_score < 30);
  assert.ok(coach.overallScore <= 25);
});

test('HR evaluation uses career-fit criteria instead of forcing STAR evidence', async () => {
  const result = await runEvaluation({
    question: {
      id: 'hr_rubric_test', type: 'hr', competency: 'Career motivation', difficulty: 'Standard', durationSec: 120,
      text: 'Please introduce yourself and explain why you are pursuing this AI/ML Engineer role.',
    },
    answer: 'I began in backend engineering, where I enjoyed turning ambiguous requirements into dependable services. My recent work with Python and data workflows made me want to build intelligent products. I am pursuing an AI/ML Engineer role because it connects that engineering foundation with the impact I want to create.',
    mode: 'text',
  });

  assert.ok(result.scores.structure >= 35, 'HR answers should be evaluated for organization, not missing STAR sections');
  assert.ok(result.scores.relevance > 40);
});

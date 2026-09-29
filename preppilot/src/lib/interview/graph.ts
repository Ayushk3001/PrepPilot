import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { InterviewSessionState, InterviewerQuestionOutput, ResumeInterviewerAgent } from '@/agents/resumeInterviewerAgent';
import { InterviewController } from './controller';
import { traceInterviewRun } from './tracing';

const InterviewGraphState = Annotation.Root({
  sessionState: Annotation<InterviewSessionState>,
  lastAnswer: Annotation<string | undefined>,
  lastEvaluation: Annotation<unknown | undefined>,
  nextQuestion: Annotation<InterviewerQuestionOutput | undefined>,
  complete: Annotation<boolean>,
});

export type InterviewGraphInput = typeof InterviewGraphState.State;

const completeQuestion = (state: InterviewSessionState): InterviewerQuestionOutput => ({
  question: 'The interview round is complete. Thank you for walking through your experience.',
  questionType: 'role_alignment', round: state.round, competency: 'Interview Completion',
  difficulty: state.difficulty, source: 'role_standard', resumeTopic: 'Overall Interview',
  reason: 'A deterministic interview limit has been reached.', expectedCompetency: 'Summary',
  followUp: false, evidenceUsed: [], isCompleted: true,
});

const workflow = new StateGraph(InterviewGraphState)
  .addNode('initialize_interview', (state) => ({ sessionState: state.sessionState }))
  .addNode('load_resume_context', (state) => ({ sessionState: state.sessionState }))
  // Evaluation is produced by Cadence's existing five-agent pipeline before
  // this route is called; the graph receives its structured result here.
  .addNode('evaluate_answer', (state) => ({ lastEvaluation: state.lastEvaluation }))
  .addNode('question_limit_check', (state) => ({ complete: InterviewController.shouldEndInterview(state.sessionState) }))
  .addNode('generate_next_question', async (state) => {
    const result = await ResumeInterviewerAgent.decideNextQuestion(state.sessionState, state.lastAnswer, state.lastEvaluation);
    return { sessionState: result.updatedState, nextQuestion: result.nextQuestion, complete: Boolean(result.nextQuestion.isCompleted) };
  })
  // These presentation nodes deliberately do not create content. Their
  // conditional edge makes core and follow-up turns explicit and inspectable.
  .addNode('present_core_question', (state) => ({ nextQuestion: state.nextQuestion }))
  .addNode('present_follow_up', (state) => ({ nextQuestion: state.nextQuestion }))
  .addNode('final_evaluation', (state) => ({
    sessionState: { ...state.sessionState, isCompleted: true },
    nextQuestion: completeQuestion(state.sessionState), complete: true,
  }))
  .addEdge(START, 'initialize_interview')
  .addEdge('initialize_interview', 'load_resume_context')
  .addEdge('load_resume_context', 'evaluate_answer')
  .addEdge('evaluate_answer', 'question_limit_check')
  .addConditionalEdges('question_limit_check', (state) => state.complete ? 'final_evaluation' : 'generate_next_question')
  .addConditionalEdges('generate_next_question', (state) => state.nextQuestion?.followUp ? 'present_follow_up' : 'present_core_question')
  .addEdge('present_core_question', END)
  .addEdge('present_follow_up', END)
  .addEdge('final_evaluation', END)
  .compile();

export async function runInterviewGraph(input: InterviewGraphInput) {
  return traceInterviewRun(
    { sessionId: input.sessionState.sessionId, targetRole: input.sessionState.targetRole, interviewRound: input.sessionState.round },
    () => workflow.invoke(input),
  );
}

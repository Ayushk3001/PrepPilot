import { InterviewSessionState } from '@/agents/resumeInterviewerAgent';

/**
 * Deterministic policy boundary for an interview. Models may suggest content,
 * but this controller alone decides whether another turn is permitted.
 */
export class InterviewController {
  static elapsedSeconds(state: InterviewSessionState): number {
    return Math.max(0, Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000));
  }

  static isTimeExceeded(state: InterviewSessionState): boolean {
    return this.elapsedSeconds(state) >= state.durationMinutes * 60;
  }

  static isQuestionLimitReached(state: InterviewSessionState): boolean {
    return state.totalQuestionsAsked >= state.maxTotalQuestions || state.coreQuestionsAsked >= state.totalCoreQuestions;
  }

  static canAskCoreQuestion(state: InterviewSessionState): boolean {
    return !state.isCompleted && !this.isTimeExceeded(state) && !this.isQuestionLimitReached(state)
      && state.coreQuestionsAsked < state.totalCoreQuestions;
  }

  static canAskFollowUp(state: InterviewSessionState, followUpRequired: boolean): boolean {
    return followUpRequired && !state.isCompleted && !this.isTimeExceeded(state)
      && state.totalQuestionsAsked < state.maxTotalQuestions
      && state.currentFollowUpsForCore < state.maxFollowUpsPerQuestion;
  }

  static shouldEndInterview(state: InterviewSessionState): boolean {
    return state.isCompleted || this.isTimeExceeded(state) || this.isQuestionLimitReached(state);
  }
}

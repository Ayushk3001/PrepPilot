import {
  ResumeKnowledgeModel,
  ResumeEvidenceItem,
  InterviewRoundKey,
  INTERVIEW_ROUNDS,
} from '@/lib/resume/resumeKnowledge';
import { executeChatCompletion, extractChatCompletionContent, getChatCompletionContentLocations } from '@/server/ai/llmClient';
import { generateQuestion } from './questionGenerationService';

export const INTERVIEW_QUESTION_LLM_TIMEOUT_MS = 20_000;

export interface InterviewQuestionTracing {
  traceLlm<T>(name: string, messages: Array<{ role?: string; content?: string }>, run: () => Promise<T>, options?: { model?: string; baseURL?: string; requestId?: string; metadata?: Record<string, unknown> }): Promise<T>;
  traceStage<T>(name: string, run: () => Promise<T> | T, metadata?: Record<string, unknown>): Promise<T>;
  requestId?: string;
}

export interface InterviewerQuestionOutput {
  question: string;
  questionType: 'behavioral' | 'technical' | 'situational' | 'leadership' | 'hr' | 'followup' | 'role_alignment';
  round: InterviewRoundKey;
  competency: string;
  difficulty: string;
  source: 'resume' | 'role_standard';
  resumeTopic: string;
  reason: string;
  expectedCompetency: string;
  followUp: boolean;
  evidenceUsed: string[];
  isCompleted?: boolean;
  generationSource?: 'llm' | 'deterministic_fallback';
  llmAttempted?: boolean;
  llmSucceeded?: boolean;
  fallbackReason?: string;
}

export interface InterviewTurnRecord {
  turnIndex: number;
  coreQuestionIndex: number;
  isFollowUp: boolean;
  question: InterviewerQuestionOutput;
  answer: string;
  evaluation?: any;
}

export interface InterviewSessionState {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  targetRole: string;
  round: InterviewRoundKey;
  difficulty: string;
  resumeKnowledge: ResumeKnowledgeModel;
  evidenceGraph: ResumeEvidenceItem[];
  history: InterviewTurnRecord[];
  coreQuestionsAsked: number;
  totalCoreQuestions: number;
  maxTotalQuestions: number;
  durationMinutes: number;
  startedAt: string;
  totalQuestionsAsked: number;
  maxFollowUpsPerQuestion: number;
  currentFollowUpsForCore: number;
  topicsCovered: string[];
  topicsRemaining: string[];
  /** Compact question-only history used for deduplication and prompt context. */
  questionHistory: string[];
  isCompleted: boolean;
}

/**
 * Initializes a new interview session state for any candidate and round.
 */
export function initializeSessionState(
  resumeKnowledge: ResumeKnowledgeModel,
  roundKey: InterviewRoundKey,
  targetRole: string,
  difficulty = 'Standard'
): InterviewSessionState {
  const roundDef = INTERVIEW_ROUNDS[roundKey] || INTERVIEW_ROUNDS.behavioral;
  const allTopics = resumeKnowledge.evidenceGraph.map(e => e.topic);

  return {
    sessionId: `interview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    candidateId: resumeKnowledge.candidate.email || 'anonymous-candidate',
    candidateName: resumeKnowledge.candidate.name || 'Candidate',
    targetRole,
    round: roundKey,
    difficulty,
    resumeKnowledge,
    evidenceGraph: resumeKnowledge.evidenceGraph.map(e => ({ ...e })),
    history: [],
    coreQuestionsAsked: 0,
    totalCoreQuestions: roundDef.coreQuestionCount,
    maxTotalQuestions: roundDef.maxTotalQuestions,
    durationMinutes: roundDef.durationMinutes,
    startedAt: new Date().toISOString(),
    totalQuestionsAsked: 0,
    maxFollowUpsPerQuestion: roundDef.maxFollowUpsPerQuestion,
    currentFollowUpsForCore: 0,
    topicsCovered: [],
    topicsRemaining: allTopics,
    questionHistory: [],
    isCompleted: false,
  };
}

/**
 * Core AI Interviewer Agent
 */
export class ResumeInterviewerAgent {
  public static readonly agentName = 'Resume-Driven AI Interviewer';

  /**
   * Generates or decides the next question based on candidate resume, round, and previous answers.
   */
  public static async decideNextQuestion(
    state: InterviewSessionState,
    lastAnswer?: string,
    lastEvaluation?: any,
    tracing?: InterviewQuestionTracing,
  ): Promise<{ nextQuestion: InterviewerQuestionOutput; updatedState: InterviewSessionState }> {
    const updatedState = { ...state };

    const elapsedMinutes = (Date.now() - new Date(updatedState.startedAt).getTime()) / 60000;
    const reachedQuestionLimit = updatedState.totalQuestionsAsked >= updatedState.maxTotalQuestions;
    const reachedCoreLimit = updatedState.coreQuestionsAsked >= updatedState.totalCoreQuestions;
    const reachedDurationLimit = elapsedMinutes >= updatedState.durationMinutes;

    // A round ends at the first hard limit. This is enforced before any model
    // call, so a model can never keep an interview alive indefinitely.
    if ((reachedQuestionLimit || reachedCoreLimit || reachedDurationLimit) && !updatedState.isCompleted) {
      updatedState.isCompleted = true;
      return {
        nextQuestion: {
          question: 'The interview round is complete. Thank you for walking through your experience.',
          questionType: 'role_alignment',
          round: updatedState.round,
          competency: 'Interview Completion',
          difficulty: updatedState.difficulty,
          source: 'role_standard',
          resumeTopic: 'Overall Interview',
          reason: reachedDurationLimit ? 'The interview duration budget has been reached.' : 'The configured interview question limit has been reached.',
          expectedCompetency: 'Summary',
          followUp: false,
          evidenceUsed: [],
          isCompleted: true,
        },
        updatedState,
      };
    }

    // Decide if we should ask an adaptive follow-up on the last answer
    const shouldAskFollowUp =
      !!lastAnswer &&
      lastAnswer.trim().split(/\s+/).length >= 5 &&
      updatedState.currentFollowUpsForCore < updatedState.maxFollowUpsPerQuestion &&
      this.detectFollowUpNeed(lastAnswer, lastEvaluation);

    let nextQuestion: InterviewerQuestionOutput;

    // This agent is also used as the browser's offline fallback. Provider
    // credentials deliberately exist only on the server, so browser execution
    // must remain deterministic and must never attempt an LLM request.
    // One policy boundary owns provider selection, validation, diagnostics, and
    // fallback. The rest of the interview only receives a question object.
    const generated = await generateQuestion(
      {
        round: updatedState.round,
        targetRole: updatedState.targetRole,
        difficulty: updatedState.difficulty,
        resumeTopic: updatedState.evidenceGraph.find(e => !e.covered)?.topic || updatedState.evidenceGraph[0]?.topic,
        previousQuestions: updatedState.questionHistory || [],
        previousAnswer: lastAnswer,
      },
      () => this.generateFallbackQuestion(updatedState, shouldAskFollowUp, lastAnswer, lastEvaluation),
      {
        generateWithLlm: () => this.queryLLMForNextQuestion(updatedState, shouldAskFollowUp, lastAnswer, lastEvaluation, tracing),
        traceFallback: tracing
          ? (fallback, metadata) => tracing.traceStage('fallback_question_generation', fallback, {
            session_id: updatedState.sessionId,
            question_number: updatedState.totalQuestionsAsked + 1,
            ...metadata,
          })
          : undefined,
      },
    );
    nextQuestion = generated.question;
    nextQuestion.generationSource = generated.source === 'llm' ? 'llm' : 'deterministic_fallback';
    nextQuestion.llmAttempted = generated.llmAttempted;
    nextQuestion.llmSucceeded = generated.llmSucceeded;
    nextQuestion.fallbackReason = generated.fallbackReason;
    updatedState.questionHistory = [...(updatedState.questionHistory || []), nextQuestion.question].slice(-20);

    // Update state progression
    if (nextQuestion.followUp) {
      updatedState.currentFollowUpsForCore += 1;
    } else {
      updatedState.coreQuestionsAsked += 1;
      updatedState.currentFollowUpsForCore = 0;
    }
    updatedState.totalQuestionsAsked += 1;

    // Mark resume topic as covered
    if (nextQuestion.resumeTopic && !updatedState.topicsCovered.includes(nextQuestion.resumeTopic)) {
      updatedState.topicsCovered.push(nextQuestion.resumeTopic);
      updatedState.topicsRemaining = updatedState.topicsRemaining.filter(t => t !== nextQuestion.resumeTopic);
      const graphItem = updatedState.evidenceGraph.find(e => e.topic === nextQuestion.resumeTopic);
      if (graphItem) {
        graphItem.covered = true;
        graphItem.timesExplored = (graphItem.timesExplored || 0) + 1;
      }
    }

    return { nextQuestion, updatedState };
  }

  /**
   * Detects if the candidate's last answer has a noticeable gap that warrants a targeted follow-up.
   */
  private static detectFollowUpNeed(answer: string, evaluation?: any): boolean {
    const words = answer.trim().split(/\s+/).length;
    // 1. Very brief answer
    if (words < 40) return true;

    // 2. Unquantified claim in behavioral/technical response
    const hasNumbers = /\b\d+(\.\d+)?%?\b/g.test(answer);
    if (!hasNumbers && /\b(improved|increased|grew|scaled|reduced|boosted|saved|optimized)\b/i.test(answer)) {
      return true;
    }

    // 3. Vague ownership ("we did", "the team did")
    const weCount = (answer.match(/\b(we|our team|they)\b/gi) || []).length;
    const iCount = (answer.match(/\b(i|my|me)\b/gi) || []).length;
    if (weCount > iCount * 2 && weCount >= 3) {
      return true;
    }

    // 4. Missing STAR Result
    if (evaluation?.star && !evaluation.star.result?.detected) {
      return true;
    }

    return false;
  }

  /**
   * Prompts the configured LLM endpoint (openai/gpt-5-nano) with strict resume grounding.
   */
  private static async queryLLMForNextQuestion(
    state: InterviewSessionState,
    isFollowUp: boolean,
    lastAnswer?: string,
    lastEvaluation?: any,
    tracing?: InterviewQuestionTracing,
  ): Promise<InterviewerQuestionOutput> {
    const roundDef = INTERVIEW_ROUNDS[state.round] || INTERVIEW_ROUNDS.behavioral;
    const targetEvidence = state.evidenceGraph.find(e => !e.covered) || state.evidenceGraph[0];

    const promptContext = {
      candidateName: state.candidateName,
      targetRole: state.targetRole,
      round: state.round,
      roundTitle: roundDef.name,
      difficulty: state.difficulty,
      coreQuestionNumber: isFollowUp ? state.coreQuestionsAsked : state.coreQuestionsAsked + 1,
      totalCoreQuestions: state.totalCoreQuestions,
      isFollowUp,
      selectedResumeTopic: targetEvidence?.topic || 'Core Experience',
      resumeFacts: targetEvidence?.facts || [],
      candidateTechnologies: state.resumeKnowledge.skills.technologies.slice(0, 8),
      candidateProjects: state.resumeKnowledge.projects.map(p => ({ name: p.name, desc: p.description })),
      candidateExperience: state.resumeKnowledge.experience.map(e => ({ company: e.company, role: e.role, summary: e.summary })),
      candidateOrganizations: state.resumeKnowledge.organizations,
      topicsAlreadyCovered: state.topicsCovered,
      lastQuestion: state.history[state.history.length - 1]?.question.question,
      lastAnswer: lastAnswer || null,
      identifiedWeakness: lastEvaluation?.improvements?.[0] || null,
    };

    const systemPrompt = `Generate exactly one concise interview question using the supplied candidate context. Ground it in the resume and current interview round. Avoid invented facts. Return only this JSON object: {"question":"<maximum 45-word interview question>"}. No reasoning, explanation, markdown, preamble, scoring, or additional fields.`;
    const roleGuidance = /\b(data analyst|analyst|\bda\b)\b/i.test(state.targetRole)
      ? 'For this Data Analyst role, prioritize SQL, data quality, interpretation, dashboards, statistics, business reasoning, and stakeholder communication. Do not ask ML or system-design questions unless the resume directly supports them.'
      : /\b(executive|leadership|manager|\bem\b)\b/i.test(state.targetRole)
        ? 'For this leadership role, prioritize ownership, prioritisation, business impact, ambiguity, stakeholder alignment, and judgement. Avoid deep technical implementation unless it is central to the candidate evidence.'
        : 'Match technical depth to the target role and the candidate evidence.';

    const userPrompt = `Interview Context:
${JSON.stringify(promptContext, null, 2)}

Role guidance: ${roleGuidance}

Question constraints: ask one conversational question in 20–45 words (two short sentences at most). Never combine more than two asks. A follow-up must probe one specific gap only.

For HR / Introduction, ask a warm, people-focused interviewer question about the candidate's story, motivation, or fit—not a technical or project-depth question.

Return ONLY valid JSON with one property: {"question":"Your precise, conversational question string here"}.
Do not include markdown, code fences, analysis, reasoning, explanations, metadata, or any other properties.
/*
{
  "question": "Your precise, conversational question string here",
  "questionType": "${state.round === 'technical' ? 'technical' : state.round === 'situational' ? 'situational' : state.round === 'leadership' ? 'leadership' : state.round === 'hr' ? 'hr' : 'behavioral'}",
  "round": "${state.round}",
  "competency": "${roundDef.primaryCompetencies[0]}",
  "difficulty": "${state.difficulty}",
  "source": "resume",
  "resumeTopic": "${targetEvidence?.topic || 'Resume'}",
  "reason": "Why this question was chosen based on the resume and previous responses",
  "expectedCompetency": "Key competency being tested",
  "followUp": ${isFollowUp},
  "evidenceUsed": ${JSON.stringify(targetEvidence?.facts?.slice(0, 2) || [targetEvidence?.topic || 'Resume'])}
}*/`;

    const minimalPrompt = `Candidate context:\n${JSON.stringify(promptContext)}\nRole guidance: ${roleGuidance}\nGenerate one conversational question of no more than 45 words. Return only {"question":"<maximum 45-word interview question>"}. No reasoning, explanation, markdown, preamble, scoring, or additional fields.`;
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: minimalPrompt },
    ];
    const traceMetadata = {
      session_id: state.sessionId,
      question_number: state.totalQuestionsAsked + 1,
      interview_type: state.round,
      question_source: 'llm',
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
    };
    const execute = () => executeChatCompletion({
        messages,
        responseFormat: 'json_object',
        temperature: isFollowUp ? 0.3 : 0.6,
        component: 'llm_question_generation',
        caller: 'interviewer.generate_question',
        langGraphNode: 'generate_next_question',
        purpose: 'interview_question_generation',
        sessionId: state.sessionId,
        questionNumber: state.totalQuestionsAsked + 1,
        questionSource: 'llm',
        requestId: tracing?.requestId || state.sessionId,
        timeoutMs: INTERVIEW_QUESTION_LLM_TIMEOUT_MS,
        maxRetries: 0,
        maxOutputTokens: 800,
        reasoningEffort: 'low',
      });
    const res = tracing
      ? await tracing.traceLlm('llm_question_generation', messages, execute, { model: process.env.OPENAI_MODEL, baseURL: process.env.OPENAI_BASE_URL, requestId: state.sessionId, metadata: traceMetadata })
      : await execute();

    const validate = () => {
      const choice = (res as any)?.choices?.[0];
      const raw = extractChatCompletionContent(res);
      const finishReason = choice?.finish_reason || 'unknown';
      const usage = (res as any)?.usage;
      let parsed: any = null;
      let parseStatus = 'failed';
      let validationError = '';
      const missingRequiredFields: string[] = [];
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(cleaned);
        parseStatus = 'json';
      } catch {
        const quoted = raw.match(/"question"\s*:\s*"([\s\S]*?)"/i)?.[1];
        const plain = quoted || (raw && !raw.startsWith('{') ? raw.replace(/^question\s*:\s*/i, '').trim() : '');
        if (plain) {
          parsed = { question: plain.replace(/^['"]|['"]$/g, '').trim() };
          parseStatus = 'plain_text_recovered';
        } else {
          validationError = 'unparseable_or_empty_response';
        }
      }
      const questionText = typeof parsed?.question === 'string' ? parsed.question.trim() : '';
      if (!questionText) missingRequiredFields.push('question');
      if (finishReason === 'length') validationError = 'provider_output_truncated';
      if (finishReason !== 'length' && !raw) validationError = 'empty_provider_response';
      else if (finishReason !== 'length' && parseStatus === 'failed') validationError = 'malformed_structured_output';
      else if (missingRequiredFields.length) validationError = validationError || 'semantic_validation_failed';
      console.info('[QUESTION_PARSE_DIAGNOSTIC]', JSON.stringify({
        request_id: tracing?.requestId || state.sessionId,
        question_number: state.totalQuestionsAsked + 1,
        finish_reason: finishReason,
        raw_response_length: raw.length,
        raw_response_preview: raw.slice(0, 240),
        content_type: typeof choice?.message?.content,
        content_locations: getChatCompletionContentLocations(res),
        completion_tokens: usage?.completion_tokens,
        parsed_response: parsed ? { question: questionText.slice(0, 240) } : null,
        parse_status: parseStatus,
        validation_success: Boolean(questionText) && finishReason !== 'length',
        validation_error: validationError || undefined,
        missing_required_fields: missingRequiredFields,
      }));
      if (!questionText || finishReason === 'length') {
        throw new Error(validationError || (!raw ? 'empty_provider_response' : 'semantic_validation_failed'));
      }
      return { ...parsed, question: questionText };
    };
    const parsed = tracing
      ? await tracing.traceStage('question_validation', validate, traceMetadata)
      : validate();

    return {
      question: this.limitQuestionLength(parsed.question),
      questionType: String(parsed.questionType || (state.round as any) || 'behavioral').toLowerCase() as InterviewerQuestionOutput['questionType'],
      round: state.round,
      competency: parsed.competency || roundDef.primaryCompetencies[0],
      difficulty: state.difficulty,
      source: 'resume',
      resumeTopic: parsed.resumeTopic || targetEvidence?.topic || 'Resume Experience',
      reason: parsed.reason || 'Personalized using candidate resume evidence graph.',
      expectedCompetency: parsed.expectedCompetency || 'Demonstrated ownership and technical depth',
      followUp: isFollowUp,
      evidenceUsed: parsed.evidenceUsed || [targetEvidence?.topic || 'Resume'],
    };
  }

  private static limitQuestionLength(question: string): string {
    const words = question.trim().split(/\s+/);
    if (words.length <= 45) return question.trim();
    return `${words.slice(0, 45).join(' ').replace(/[,:;\-]+$/, '')}?`;
  }

  private static displayRole(role: string): string {
    const names: Record<string, string> = {
      aiml: 'AI/ML Engineer', swe: 'Software Engineer', sse: 'Senior Software Engineer',
      pm: 'Product Manager', da: 'Data Analyst', ba: 'Business Analyst',
      devops: 'Cloud / DevOps Engineer', em: 'Engineering Manager', cs: 'Customer Success Manager',
    };
    return names[role.toLowerCase()] || role;
  }

  /**
   * Deterministic, zero-failure fallback engine that is GUARANTEED to be resume-aware.
   * Dynamically constructs questions using candidate's actual projects, companies, metrics, and skills.
   */
  public static generateFallbackQuestion(
    state: InterviewSessionState,
    isFollowUp: boolean,
    lastAnswer?: string,
    lastEvaluation?: any
  ): InterviewerQuestionOutput {
    const roundDef = INTERVIEW_ROUNDS[state.round] || INTERVIEW_ROUNDS.behavioral;

    // Pick an uncovered evidence item if possible
    const availableEvidence = state.evidenceGraph.filter(e => !e.covered);
    const evidence = availableEvidence.length > 0 ? availableEvidence[0] : state.evidenceGraph[0];

    const topic = evidence?.topic || 'Core Experience';
    const role = evidence?.role || 'Engineer';
    const organization = evidence?.organization || topic;
    const metric = evidence?.metrics?.[0];
    const tech = evidence?.technologies?.[0] || state.resumeKnowledge.skills.technologies[0] || 'your core stack';
    const project = state.resumeKnowledge.projects[0]?.name || topic;
    const isDataAnalyst = /\b(data analyst|analyst|\bda\b)\b/i.test(state.targetRole);
    const isExecutive = /\b(executive|leadership|manager|\bem\b)\b/i.test(state.targetRole);
    const targetRole = this.displayRole(state.targetRole);

    // 1. Follow-Up Generation
    if (isFollowUp && lastAnswer) {
      if (state.round === 'hr') {
        return {
          question: `What specifically motivated you to move toward a ${targetRole} role at this point in your career?`,
          questionType: 'followup', round: state.round, competency: 'Career Motivation', difficulty: state.difficulty,
          source: 'resume', resumeTopic: topic,
          reason: 'Clarifying the candidate’s career motivation in an HR interview.',
          expectedCompetency: 'Clear career direction and role fit', followUp: true, evidenceUsed: [topic],
        };
      }
      if (/\b(we|our team)\b/i.test(lastAnswer) && !/\b(i specifically|i personally)\b/i.test(lastAnswer)) {
        return {
          question: `You mentioned what the team delivered. What specifically was your personal contribution and ownership in that initiative?`,
          questionType: 'followup',
          round: state.round,
          competency: 'Personal Ownership',
          difficulty: state.difficulty,
          source: 'resume',
          resumeTopic: topic,
          reason: 'Probing personal ownership following a team-centric answer.',
          expectedCompetency: 'Individual Ownership & Accountability',
          followUp: true,
          evidenceUsed: [topic, role],
        };
      }

      if (!/\b\d+%?\b/.test(lastAnswer)) {
        return {
          question: `You mentioned seeing positive improvement in that effort. What was the concrete, measurable outcome or metric that verified success?`,
          questionType: 'followup',
          round: state.round,
          competency: 'STAR Result Rigor',
          difficulty: state.difficulty,
          source: 'resume',
          resumeTopic: topic,
          reason: 'Eliciting quantifiable outcome for STAR result completeness.',
          expectedCompetency: 'Quantified Impact',
          followUp: true,
          evidenceUsed: [topic],
        };
      }

      return {
        question: `What was the single most difficult trade-off or unexpected obstacle you encountered during that implementation?`,
        questionType: 'followup',
        round: state.round,
        competency: 'Adversity & Trade-offs',
        difficulty: state.difficulty,
        source: 'resume',
        resumeTopic: topic,
        reason: 'Deep-diving into trade-offs and decision rigor.',
        expectedCompetency: 'Critical Decision-Making',
        followUp: true,
        evidenceUsed: [topic],
      };
    }

    // 2. Core Question Generation by Round
    let questionText = '';
    let comp = roundDef.primaryCompetencies[0];

    switch (state.round) {
      case 'hr':
        if (state.coreQuestionsAsked === 0) {
          questionText = `Please introduce yourself and walk me through the experiences that led you to pursue a ${targetRole} role.`;
          comp = 'Career Story & Motivation';
        } else if (state.coreQuestionsAsked === 1) {
          questionText = `What interests you most about building a career in AI/ML, and how has your experience at ${topic} shaped that direction?`;
          comp = 'Role Motivation & Fit';
        } else {
          questionText = `What are you looking for in your next team, and how would you hope to contribute in your first few months?`;
          comp = 'Culture Fit & Communication';
        }
        break;

      case 'behavioral':
        if (evidence?.category === 'venture' || /\b(founder|owner|lead)\b/i.test(role)) {
          questionText = `I noticed you were involved in ${topic} as ${role}${metric ? ` handling ${metric}` : ''}. Tell me about a critical decision you had to make under extreme uncertainty where there was no clear right answer.`;
          comp = 'Decision Making Under Uncertainty';
        } else if (state.coreQuestionsAsked % 2 === 0) {
          questionText = `Describe a situation while working on ${topic} where a deliverable faced an unexpected production bottleneck or technical disagreement. How did you resolve it?`;
          comp = 'Conflict Resolution & Adversity';
        } else {
          questionText = `Tell me about a time on ${project} where something failed or did not meet expectations. How did you diagnose the issue and communicate the resolution?`;
          comp = 'Overcoming Failure (STAR)';
        }
        break;

      case 'technical':
        if (isDataAnalyst) {
          questionText = `Using ${topic}, walk me through one analysis you delivered. How did you validate the data and turn it into a recommendation?`;
          comp = 'Data Interpretation & Business Reasoning';
        } else if (evidence?.technologies?.length || state.resumeKnowledge.skills.technologies.length) {
          questionText = `Your resume highlights experience with ${tech} on ${topic}. Can you explain how you designed the underlying architecture and why you chose that approach over alternative solutions?`;
          comp = 'Architecture & Tooling Mastery';
        } else {
          questionText = `Walk me through the end-to-end technical implementation of ${project}. What were the key bottlenecks you had to design around?`;
          comp = 'Technical Depth & Implementation';
        }
        break;

      case 'situational':
        if (evidence?.category === 'venture' || /\b(founder|commerce|delivery)\b/i.test(topic + ' ' + (evidence?.facts || []).join(' '))) {
          questionText = `Imagine you are running ${topic} and orders or system traffic suddenly drop by 30% over a 48-hour period. Walk me through your step-by-step investigation framework.`;
          comp = 'Incident Root Cause Analysis';
        } else {
          questionText = `Imagine a critical third-party dependency in ${project} experiences a major breaking API outage right before a launch deadline. How do you mitigate the risk for users?`;
          comp = 'Crisis Management';
        }
        break;

      case 'leadership':
        questionText = isExecutive
          ? `Tell me about an ambiguous decision you owned at ${topic}. How did you align stakeholders and measure the business outcome?`
          : `Tell me about an ambiguous problem you owned at ${topic}. What did you do when no one had assigned it to you?`;
        comp = isExecutive ? 'Leadership Judgement & Stakeholder Alignment' : 'Extreme Ownership & Initiative';
        break;

      case 'mock':
      default:
        const mockStageIdx = state.coreQuestionsAsked;
        if (mockStageIdx < 2) {
          questionText = `Walk me through your background with ${topic}. What motivated you to focus on ${state.targetRole}?`;
          comp = 'HR & Background';
        } else if (mockStageIdx < 6) {
          questionText = `Tell me about a challenging situation you navigated while delivering ${topic}. Walk me through the Situation, Task, Action, and quantifiable Result.`;
          comp = 'Behavioral (STAR)';
        } else if (mockStageIdx < 10) {
          questionText = `On ${project}, you utilized ${tech}. What were the primary scalability and latency considerations you architected for?`;
          comp = 'Technical Architecture';
        } else if (mockStageIdx < 12) {
          questionText = `If your primary production pipeline for ${topic} experienced silent data corruption under heavy concurrent load, how would you triage and fix it?`;
          comp = 'Situational Troubleshooting';
        } else if (mockStageIdx < 14) {
          questionText = `Describe a time on ${topic} where you had to influence cross-functional peers to adopt a major technical or product change they initially resisted.`;
          comp = 'Leadership & Stakeholder Influence';
        } else {
          questionText = `Based on everything you built across ${topic} and your projects, why are you the strongest candidate for this ${state.targetRole} role today?`;
          comp = 'Executive Value Proposition';
        }
        break;
    }

    return {
      question: questionText,
      questionType: state.round === 'technical' ? 'technical' : state.round === 'situational' ? 'situational' : state.round === 'leadership' ? 'leadership' : state.round === 'hr' ? 'hr' : 'behavioral',
      round: state.round,
      competency: comp,
      difficulty: state.difficulty,
      source: 'resume',
      resumeTopic: topic,
      reason: `Deterministic resume-aware question generated from candidate evidence item: ${topic} (${role}).`,
      expectedCompetency: comp,
      followUp: false,
      evidenceUsed: [topic, role, ...(metric ? [metric] : [])],
    };
  }
}

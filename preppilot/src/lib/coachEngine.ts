// @ts-nocheck
import { EVAL_CRITERIA } from "./mockData";
import { MultiAgentPipeline, PipelineStageCallback } from "@/agents/multiAgentPipeline";
import { PROFILE_KEY, DEFAULT_PROFILE, CandidateProfile } from "./api";
import { isCorruptOrGarbageProfile } from "./resumeParser";
import { createRequestId } from "./requestId";

export const FILLER_RE = /\b(um|uh|like,|basically|actually|kind of|sort of|you know|i mean|stuff|things like|literally)\b/gi;
export const HEDGE_RE = /\b(i think|maybe|probably|i guess|sort of|kind of|possibly|i believe)\b/gi;
export const CONNECTOR_RE = /\b(first|firstly|to start|then|after that|next|finally|in the end|as a result|so that|which meant|leading to)\b/gi;
export const CONFIDENCE_RE = /\b(i led|i owned|i built|i designed|i decided|i drove|i shipped|i proposed)\b/gi;

const count = (re: RegExp, text: string) => (text.match(re) || []).length;

export function analyzeText(answer: string, question?: any) {
  const words = answer.trim() ? answer.trim().split(/\s+/) : [];
  const sentences = answer.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const avgLen = sentences.length ? words.length / sentences.length : 0;
  const fillers = count(FILLER_RE, answer);
  const hedges = count(HEDGE_RE, answer);
  const connectors = count(CONNECTOR_RE, answer);
  const numbers = count(/\b\d+(\.\d+)?%?\b/g, answer);
  const confident = count(CONFIDENCE_RE, answer);

  const star = {
    situation: {
      detected: /\b(when|while|at (my|the)|we were|our (team|system|customer)|last (year|quarter)|during)\b/i.test(answer),
      evidence: (answer.match(/[^.]*(?:when|while|at my|we were|our team|last year|during)[^.]*/i) || ["No context-setting sentence found."])[0],
    },
    task: {
      detected: /\b(responsible|my (job|role|task)|had to|needed to|goal was|asked to|assigned)\b/i.test(answer),
      evidence: (answer.match(/[^.]*(?:responsible|my role|had to|goal was|asked to)[^.]*/i) || ["No explicit responsibility statement found."])[0],
    },
    action: {
      detected: confident > 0 || /\b(i |we )\w+ed\b/i.test(answer),
      evidence: (answer.match(/[^.]*(?:i led|i built|i designed|i owned|i shipped|i implemented|i redesigned|i proposed|i called|i started)[^.]*/i) || ["No first-person action verbs detected."])[0],
    },
    result: {
      detected: numbers > 0 || /\b(result|impact|reduced|increased|improved|saved|dropped|lifted|grew|cut)\b/i.test(answer),
      evidence: (answer.match(/[^.]*(?:result|impact|reduced|increased|improved|saved|dropped|lifted|grew|cut|\d+%)[^.]*/i) || ["No measurable outcome stated."])[0],
    },
  };
  const starFilled = Object.values(star).filter((s) => s.detected).length;

  const wordBudget = question ? question.durationSec / 2.2 : 120;
  const lengthRatio = words.length / Math.max(wordBudget, 40);

  const clamp = (n: number) => Math.max(35, Math.min(96, Math.round(n)));

  let structure = 56 + connectors * 7 + (question?.expectSTAR ? starFilled * 8 : 12) + (sentences.length >= 3 ? 6 : 0);
  let clarity = 88 - fillers * 3.5 - hedges * 2.5 - (avgLen > 30 ? 8 : 0) - (avgLen < 7 && sentences.length > 2 ? 5 : 0);
  let relevance = 62 + Math.min(words.length / 35, 4) * 4 + (numbers > 0 ? 4 : 0);
  let completeness = 40 + Math.min(lengthRatio, 1.15) * 38 + (question ? coveredPoints(answer, question) * 6 : 0);
  let communication = 74 + confident * 5 - fillers * 3 - hedges * 2 + (avgLen >= 10 && avgLen <= 26 ? 8 : -3);

  if (words.length < 20) {
    structure = 38; completeness = 30; relevance = 42; clarity = Math.min(clarity, 55); communication = Math.min(communication, 50);
  }

  const scores = {
    relevance: clamp(relevance),
    clarity: clamp(clarity),
    structure: clamp(structure),
    completeness: clamp(completeness),
    communication: clamp(communication),
  };
  const overall = clamp(
    EVAL_CRITERIA.reduce((acc, c) => acc + scores[c.key] * (c.weight / 100), 0)
  );

  return { words: words.length, sentences: sentences.length, avgLen: Math.round(avgLen * 10) / 10, fillers, hedges, connectors, numbers, confident, star, starFilled, scores, overall };
}

function coveredPoints(answer: string, question: any) {
  if (!question?.modelPoints) return 0;
  const a = answer.toLowerCase();
  const KEY = question.modelPoints.map((p: string) => {
    const stop = new Set(["with","your","the","and","for","one","two","open","close","make","state","tie","name","use","land","cover","lead","layer","check","set","include","frame","present","bring","disagree","commit","define","choose","surface","protect","listen","separate","start","from","about","into","that","this","they","them","their","what","when"]);
    return p.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stop.has(w));
  });
  return KEY.filter((kws: string[]) => kws.some((k) => a.includes(k.slice(0, Math.max(4, k.length - 2))))).length;
}

/**
 * Real Multi-Agent Pipeline Runner
 */
export async function runEvaluation(
  { question, answer, mode }: { question: any; answer: string; mode: string },
  onStage?: PipelineStageCallback
) {
  // Retrieve candidate profile from storage if available
  let profile: CandidateProfile | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isCorruptOrGarbageProfile(parsed)) {
          localStorage.removeItem(PROFILE_KEY);
          profile = DEFAULT_PROFILE;
        } else {
          profile = parsed;
        }
      }
    } catch {
      profile = DEFAULT_PROFILE;
    }
  }

  // Normalize Question structure. Resume-interview questions are generated at
  // runtime, so retain a round-appropriate rubric when a server response has
  // not supplied one yet.
  const questionType = question.type || question.questionType || "Behavioral";
  const normalizedType = String(questionType).toLowerCase();
  const defaultModelPoints = normalizedType === 'hr'
    ? ['Share a coherent career journey', 'Explain motivation for the target role', 'Connect relevant experience to role fit']
    : normalizedType === 'technical'
      ? ['Explain the technical approach', 'Discuss a relevant trade-off', 'Validate the outcome or decision']
      : normalizedType === 'situational'
        ? ['Frame the diagnosis', 'Explain the decision process', 'Describe stakeholder or business impact']
        : normalizedType === 'leadership'
          ? ['Clarify personal ownership', 'Show stakeholder alignment', 'Describe team or business impact']
          : ['Set clear context', 'Describe your personal action', 'State a specific outcome'];
  const defaultCriteria = normalizedType === 'hr'
    ? ['Career narrative and motivation', 'Role fit', 'Clear, concise communication']
    : normalizedType === 'technical'
      ? ['Technical correctness', 'Trade-offs and reasoning', 'Role-relevant depth']
      : ['Relevance to the prompt', 'Structured explanation', 'Specific supporting evidence'];
  const expectsStar = question.expectSTAR ?? ['behavioral', 'star', 'leadership'].includes(normalizedType);

  const structuredQ = {
    id: question.id || `q_${Date.now()}`,
    question: question.text || question.question || "Tell me about a challenging project you owned.",
    role: question.role || "swe",
    competency: question.competency || "behavioral",
    difficulty: question.difficulty || "Standard",
    questionType,
    expectedCompetency: question.expectedCompetency || question.competency || "Core Competency",
    evaluationCriteria: Array.isArray(question.evaluationCriteria) && question.evaluationCriteria.length > 0
      ? question.evaluationCriteria
      : defaultCriteria,
    focus: question.focus || ["STAR", "Communication"],
    durationSec: question.durationSec || 150,
    expectSTAR: expectsStar,
    modelPoints: normalizedType === 'hr'
      ? defaultModelPoints
      : (Array.isArray(question.modelPoints) && question.modelPoints.length > 0 ? question.modelPoints : defaultModelPoints),
    modelAnswer: question.modelAnswer || "",
    followUps: question.followUps || []
  };

  // The browser used to execute the deterministic pipeline directly. Route
  // evaluation through the server so the real multi-agent LLM pipeline runs
  // with provider credentials kept off the client.
  if (typeof window !== "undefined") {
    try {
      const startedAt = Date.now();
      (['question', 'comm', 'content', 'star', 'coach'] as const).forEach((stage) => onStage?.(stage, 'running', { source: 'pending', llmAttempted: true }));
      const serverResponse = await fetch('/api/agents/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId('answer-evaluation') },
        body: JSON.stringify({
          candidateProfile: profile ? {
            id: profile.name || 'candidate',
            fullName: profile.name || 'Candidate',
            targetRole: structuredQ.role || 'Software Engineer',
            experienceYears: profile.experience?.length || 3,
            keySkills: profile.technical_skills || [],
            bio: profile.summary || '',
          } : undefined,
          question: {
            id: structuredQ.id,
            role: structuredQ.role,
            stage: structuredQ.questionType,
            competency: structuredQ.competency,
            difficulty: structuredQ.difficulty,
            questionType: structuredQ.questionType,
            question: structuredQ.question,
            expectedCompetencies: structuredQ.modelPoints,
            evaluationCriteria: structuredQ.evaluationCriteria,
          },
          candidateResponse: answer,
        }),
      });

      if (!serverResponse.ok) throw new Error(`LLM evaluation route returned ${serverResponse.status}`);
      const serverResult = await serverResponse.json();
      const feedback = serverResult.feedback;
      if (!feedback) throw new Error('LLM evaluation returned no coaching feedback');

      const scores = feedback.rubricScores || {};
      const star = feedback.starBreakdown || {};
      const metrics = analyzeText(answer, structuredQ);
      const doneMs = Date.now() - startedAt;
      const executionSource = serverResult.executionSource || (serverResult.fallbackUsed ? 'deterministic_fallback' : 'llm');
      const stageSource = executionSource === 'llm' || executionSource === 'llm_retry' ? executionSource : executionSource === 'mixed' ? 'mixed' : 'deterministic_fallback';
      (['question', 'comm', 'content', 'star', 'coach'] as const).forEach((stage) => onStage?.(stage, 'done', {
        source: stageSource,
        latencyMs: doneMs,
        llmAttempted: serverResult.llmAttempted,
        llmSucceeded: serverResult.llmSucceeded,
        fallbackUsed: serverResult.fallbackUsed,
        fallbackReason: serverResult.fallbackReason,
        requestId: serverResult.requestId,
        agentSources: serverResult.agentSources,
      }));

      return {
        id: `llm_${Date.now()}`,
        questionId: structuredQ.id,
        questionText: structuredQ.question,
        competency: structuredQ.competency,
        type: structuredQ.questionType,
        difficulty: structuredQ.difficulty,
        mode: mode || 'text',
        answer,
        metrics: { words: metrics.words, fillers: metrics.fillers, wpm: null, avgSentenceLen: metrics.avgLen, numbers: metrics.numbers, hedges: metrics.hedges },
        scores: { relevance: feedback.relevance ?? scores.relevance ?? 0, clarity: feedback.clarity ?? scores.clarity ?? 0, structure: feedback.structure ?? scores.structure ?? scores.responseStructure ?? 0, completeness: feedback.completeness ?? scores.completeness ?? 0, communication: feedback.communication_quality ?? scores.communication ?? scores.communicationQuality ?? 0 },
        overall: feedback.score ?? feedback.overallScore ?? 0,
        verdict: feedback.verdict || 'Needs Substantial Practice',
        star: { situation: { detected: Boolean(star.situation?.present), evidence: star.situation?.snippet || '' }, task: { detected: Boolean(star.task?.present), evidence: star.task?.snippet || '' }, action: { detected: Boolean(star.action?.present), evidence: star.action?.snippet || '' }, result: { detected: Boolean(star.result?.present), evidence: star.result?.snippet || '' } },
        starApplicable: Boolean(feedback.starBreakdown),
        starFilled: [star.situation, star.task, star.action, star.result].filter((item) => item?.present).length,
        strengths: feedback.strengths || [],
        improvements: feedback.areasForImprovement || [],
        modelAnswer: feedback.improvedModelAnswer || '',
        expected_answer: feedback.expectedAnswer || null,
        modelPoints: structuredQ.modelPoints,
        followUps: feedback.adaptiveFollowUpQuestion?.question ? [feedback.adaptiveFollowUpQuestion.question] : [],
        evidenceHighlights: [],
        actionableAdvice: feedback.answerRewriteGuidance || [],
        a2aMessages: [],
        timings: { llmEvaluation: serverResult.executionTimeMs || doneMs },
        createdAt: new Date().toISOString(),
        evaluationSource: serverResult.modelUsed || (stageSource === 'llm' ? 'LLM multi-agent pipeline' : 'Deterministic fallback'),
      };
    } catch (error) {
      console.warn('[CoachEngine] Server LLM evaluation unavailable; using deterministic fallback.', error);
    }
  }

  const result = await MultiAgentPipeline.execute({ question: structuredQ, answer, mode: mode || "text", candidateProfile: profile }, onStage);
  return { ...result, expected_answer: null, evaluationSource: 'Deterministic local pipeline fallback' };
}

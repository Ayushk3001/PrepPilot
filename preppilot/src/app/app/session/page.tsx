// @ts-nocheck
'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useNavigate, useSearchParams } from "@/lib/routerCompat";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Mic, Square, PenLine, Check, AlertCircle,
  RotateCcw, Copy, Clock, Award, CheckCircle2, ChevronRight, Download,
  Printer, Sparkles, Building2, User, Target, BrainCircuit, ExternalLink, ShieldCheck,
  FileText
} from "lucide-react";
import { COMPETENCIES, AGENTS, pickQuestion } from "@/lib/mockData";
import { runEvaluation, FILLER_RE, HEDGE_RE } from "@/lib/coachEngine";
import { saveSession } from "@/lib/store";
import { recommendedTopics } from "@/lib/resources";
import ResourceList from "@/components/ResourceList";
import AgentStepper from "@/components/AgentStepper";
import { ScoreRing, ScoreBar, Reveal } from "@/components/ui-bits";
import { defaultDatasetManager } from "@/lib/dataset/datasetManager";
import {
  ResumeInterviewerAgent,
  InterviewSessionState,
  initializeSessionState,
  InterviewerQuestionOutput
} from "@/agents/resumeInterviewerAgent";
import {
  INTERVIEW_ROUNDS,
  InterviewRoundKey,
  extractResumeKnowledge
} from "@/lib/resume/resumeKnowledge";
import { DEFAULT_PROFILE, PROFILE_KEY } from "@/lib/api";
import { normalizeResumeProfile, isCorruptOrGarbageProfile } from "@/lib/resumeParser";
import { createRequestId } from "@/lib/requestId";

const compLabel = (id: string) => COMPETENCIES.find((c) => c.id === id)?.label || id;
const DRAFT_KEY = "cadence_draft";

function formatInterviewQuestion(nextQuestion: any, fallbackDiff: string = "Standard") {
  if (!nextQuestion) return null;
  const text = nextQuestion.question || nextQuestion.text || "";
  const topic = nextQuestion.resumeTopic || "the initiative";
  return {
    id: nextQuestion.id || `q_${Date.now()}`,
    text,
    competency: nextQuestion.competency || "Career & Project Ownership",
    difficulty: nextQuestion.difficulty || fallbackDiff,
    type: nextQuestion.questionType || nextQuestion.type || "Behavioral",
    durationSec: nextQuestion.durationSec || 150,
    resumeTopic: nextQuestion.resumeTopic,
    reason: nextQuestion.reason,
    evidenceUsed: nextQuestion.evidenceUsed,
    expectedCompetency: nextQuestion.expectedCompetency,
    followUp: nextQuestion.followUp,
    modelAnswer: nextQuestion.modelAnswer || `When leading ${topic}, I owned the technical and business benchmarks end-to-end. We grounded our delivery in clear user metrics and shipped with measured business impact.`,
    modelPoints: nextQuestion.modelPoints || [
      `Direct ownership at ${topic}`,
      'Quantified metric and outcome verification',
      'Structured communication (STAR)'
    ],
    followUps: nextQuestion.followUps || [
      `What specific metric verified success at ${topic}?`,
      `What was the single most difficult trade-off you navigated?`,
      `How would you scale that solution today?`
    ]
  };
}

function PracticeSessionInner() {
  const [params] = useSearchParams();
  const nav = useNavigate();

  // Resume Interview Session State
  const [resumeSession, setResumeSession] = useState<InterviewSessionState | null>(null);
  const [nextPreparedQuestion, setNextPreparedQuestion] = useState<InterviewerQuestionOutput | null>(null);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [completedTurns, setCompletedTurns] = useState<any[]>([]);
  const [showFinalReport, setShowFinalReport] = useState<boolean>(false);

  const roundParam = (params?.get("round") || "behavioral") as InterviewRoundKey;
  const roleParam = params?.get("role") || "pm";
  const diffParam = params?.get("diff") || "Standard";

  const config = useMemo(
    () => ({
      role: roleParam,
      competency: params?.get("comp") || "behavioral",
      difficulty: diffParam,
      type: params?.get("type") || "Any",
    }),
    [roleParam, diffParam, params]
  );

  // Check if practice staging already prefetched an opening question
  const [isQuestionLoading, setIsQuestionLoading] = useState(true);

  // Initialize Question synchronously from prefetch cache if available
  const [question, setQuestion] = useState<any>(null);
  const openingRequestKey = useRef<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [clientHydrated, setClientHydrated] = useState(false);
  const [mode, setMode] = useState("text");
  const [listening, setListening] = useState(false);
  const [srSupported, setSrSupported] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [stages, setStages] = useState<any>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const recRef = useRef<any>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Load or Initialize Resume Interviewer Session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const requestKey = `${roundParam}:${roleParam}:${diffParam}`;
      if (openingRequestKey.current === requestKey) return;
      openingRequestKey.current = requestKey;
      let activeState: InterviewSessionState | null = null;
      const saved = sessionStorage.getItem('cadence_resume_interview_session');

      if (saved) {
        try {
          const parsedSaved = JSON.parse(saved);
          if (JSON.stringify(parsedSaved).toLowerCase().includes('flatedecode') || JSON.stringify(parsedSaved).includes('\ufffd')) {
            sessionStorage.removeItem('cadence_resume_interview_session');
            activeState = null;
          } else {
            activeState = parsedSaved;
          }
        } catch (e) {
          console.error("Failed to parse resume interview session", e);
        }
      }

      // If no session state was present in sessionStorage, build from stored profile
      if (!activeState) {
        let candidateProfile = DEFAULT_PROFILE;
        try {
          const stored = localStorage.getItem(PROFILE_KEY);
          if (stored) {
            const parsedStored = JSON.parse(stored);
            if (isCorruptOrGarbageProfile(parsedStored)) {
              localStorage.removeItem(PROFILE_KEY);
              candidateProfile = DEFAULT_PROFILE;
            } else {
              candidateProfile = normalizeResumeProfile(parsedStored);
            }
          }
        } catch (e) {
          console.error(e);
        }

        const knowledge = extractResumeKnowledge(candidateProfile);
        activeState = initializeSessionState(knowledge, roundParam, roleParam, diffParam);
        sessionStorage.setItem('cadence_resume_interview_session', JSON.stringify(activeState));
      }

      setResumeSession(activeState);

      // Check if practice staging already prefetched and prepared the opening question
      const cached = sessionStorage.getItem('cadence_prepared_opening_question');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          sessionStorage.removeItem('cadence_prepared_opening_question');
          if (parsed && (parsed.question || parsed.text)) {
            setQuestion(formatInterviewQuestion(parsed, diffParam));
            setIsQuestionLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached opening question", e);
        }
      }

      // If already set by state initializer, no need to re-fetch
      if (question?.text) {
        setIsQuestionLoading(false);
        return;
      }

      // Generate on the server so provider credentials never enter the browser.
      // If the route is temporarily unavailable, use the deterministic local
      // agent fallback instead of surfacing an LLM credential error to users.
      setIsQuestionLoading(true);
      (async () => {
        try {
          const response = await fetch('/api/interviewer/next-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId('opening-question') },
            body: JSON.stringify({ sessionState: activeState }),
          });
          if (response.ok) {
            const payload = await response.json();
            if (payload.nextQuestion && payload.sessionState) {
              return { nextQuestion: payload.nextQuestion, updatedState: payload.sessionState };
            }
          }
        } catch {
          // The local deterministic fallback below keeps practice available.
        }
        return ResumeInterviewerAgent.decideNextQuestion(activeState!);
      })()
        .then(({ nextQuestion, updatedState }) => {
          setResumeSession(updatedState);
          sessionStorage.setItem('cadence_resume_interview_session', JSON.stringify(updatedState));
          setQuestion(formatInterviewQuestion(nextQuestion, diffParam));
        })
        .catch(err => {
          console.error("Failed to generate initial question", err);
        })
        .finally(() => {
          setIsQuestionLoading(false);
        });
    }
  }, [roundParam, roleParam, diffParam]);

  useEffect(() => {
    setAnswer(localStorage.getItem(DRAFT_KEY) || "");
    setClientHydrated(true);
  }, []);

  useEffect(() => {
    if (clientHydrated && typeof window !== "undefined") {
      localStorage.setItem(DRAFT_KEY, answer);
    }
  }, [answer, clientHydrated]);

  useEffect(() => {
    if (result || running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [result, running]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSrSupported(!!SR);
    }
  }, []);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSrSupported(false);
      setMode("text");
      return;
    }
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (e: any) => {
        setAnswer(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const fillers = (answer.match(FILLER_RE) || []).length;
  const hedges = (answer.match(HEDGE_RE) || []).length;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  // Submit Answer -> 5-Agent Evaluation -> Next Question Decision
  const submit = async () => {
    if (running || isQuestionLoading || !question?.text || !answer.trim() || answer.trim().split(/\s+/).length < 10) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    }
    setRunning(true);
    setStages({});

    // 1. Run 5-Agent Pipeline
    const r = await runEvaluation(
      { question, answer: answer.trim(), mode },
      (id: string, status: string, out: any) => setStages((s: any) => ({ ...s, [id]: { status, out } }))
    );

    if (typeof window !== "undefined") {
      localStorage.removeItem(DRAFT_KEY);
    }
    // Specialist scores are deliberately kept internal until the round ends.
    // They still drive the adaptive interviewer, but a scorecard between every
    // answer makes this feel like a quiz rather than an interview.
    const currentTurn = { question, answer: answer.trim(), result: r };
    const allCompletedTurns = [...completedTurns, currentTurn];
    setCompletedTurns(allCompletedTurns);

    // 2. Query AI Interviewer for next question / follow-up decision
    if (resumeSession) {
      try {
        let nextQ: InterviewerQuestionOutput;
        let updated: InterviewSessionState;

        // Try server API first
        const apiRes = await fetch('/api/interviewer/next-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId('next-question') },
          body: JSON.stringify({
            sessionState: resumeSession,
            lastAnswer: answer.trim(),
            lastEvaluation: r,
          }),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          nextQ = data.nextQuestion;
          updated = data.sessionState;
        } else {
          // Fallback to local agent
          const localRes = await ResumeInterviewerAgent.decideNextQuestion(resumeSession, answer.trim(), r);
          nextQ = localRes.nextQuestion;
          updated = localRes.updatedState;
        }

        setResumeSession(updated);
        sessionStorage.setItem('cadence_resume_interview_session', JSON.stringify(updated));

        if (nextQ.isCompleted) {
          const overall = Math.round(
            allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.overall || 0), 0) /
            Math.max(allCompletedTurns.length, 1)
          );
          const scores = ['relevance', 'clarity', 'structure', 'completeness', 'communication'].reduce((summary, key) => {
            summary[key] = Math.round(
              allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.scores?.[key] || 0), 0) /
              Math.max(allCompletedTurns.length, 1)
            );
            return summary;
          }, {} as Record<string, number>);

          // Persist one record per completed round, with its turn-level
          // evidence attached for session history and future progress analysis.
          saveSession({
            id: `round_${Date.now()}`,
            createdAt: new Date().toISOString(),
            questionText: `${roundDef.name} interview`,
            competency: roundParam,
            difficulty: diffParam,
            mode,
            overall,
            scores,
            strengths: Array.from(new Set(allCompletedTurns.flatMap(turn => turn.result?.strengths || []))).slice(0, 4),
            improvements: Array.from(new Set(allCompletedTurns.flatMap(turn => turn.result?.improvements || []))).slice(0, 4),
            metrics: {
              words: allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.metrics?.words || 0), 0),
              fillers: allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.metrics?.fillers || 0), 0),
            },
            starFilled: Math.round(allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.starFilled || 0), 0) / Math.max(allCompletedTurns.length, 1)),
            answer: '(Open this completed round to review all answers and evidence.)',
            turns: allCompletedTurns,
          });
          setRunning(false);
          setShowFinalReport(true);
          return;
        }

        // Move directly into the adaptive follow-up or next core question.
        // The processing state is the only in-round feedback the candidate sees.
        setQuestion(formatInterviewQuestion(nextQ, diffParam));
        setTurnIndex(index => index + 1);
        setAnswer('');
        setStages({});
        setResult(null);
        setSeconds(0);
        setTab('overview');
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.warn("Falling back to local interviewer logic:", err);
        const localRes = await ResumeInterviewerAgent.decideNextQuestion(resumeSession, answer.trim(), r);
        setResumeSession(localRes.updatedState);
        sessionStorage.setItem('cadence_resume_interview_session', JSON.stringify(localRes.updatedState));
        // The deterministic resume-aware fallback follows the same no-scorecard
        // interview flow when the server or LLM is unavailable.
        if (localRes.nextQuestion.isCompleted) {
          const overall = Math.round(allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.overall || 0), 0) / Math.max(allCompletedTurns.length, 1));
          saveSession({
            id: `round_${Date.now()}`,
            createdAt: new Date().toISOString(),
            questionText: `${roundDef.name} interview`, competency: roundParam, difficulty: diffParam, mode,
            overall,
            scores: allCompletedTurns[allCompletedTurns.length - 1]?.result?.scores || {},
            strengths: Array.from(new Set(allCompletedTurns.flatMap(turn => turn.result?.strengths || []))).slice(0, 4),
            improvements: Array.from(new Set(allCompletedTurns.flatMap(turn => turn.result?.improvements || []))).slice(0, 4),
            metrics: { words: allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.metrics?.words || 0), 0), fillers: allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.metrics?.fillers || 0), 0) },
            starFilled: Math.round(allCompletedTurns.reduce((sum, turn) => sum + (turn.result?.starFilled || 0), 0) / Math.max(allCompletedTurns.length, 1)),
            answer: '(Open this completed round to review all answers and evidence.)', turns: allCompletedTurns,
          });
          setShowFinalReport(true);
        } else {
          setQuestion(formatInterviewQuestion(localRes.nextQuestion, diffParam));
          setTurnIndex(index => index + 1);
          setAnswer('');
          setStages({});
          setSeconds(0);
        }
      }
    }

    setRunning(false);
  };

  // Advance to next question (or finish round)
  const advanceTurn = () => {
    if (!nextPreparedQuestion || nextPreparedQuestion.isCompleted) {
      setShowFinalReport(true);
      return;
    }

    setTurnIndex(prev => prev + 1);
    setQuestion(formatInterviewQuestion(nextPreparedQuestion, diffParam));

    setNextPreparedQuestion(null);
    setAnswer("");
    setStages({});
    setResult(null);
    setSeconds(0);
    setTab("overview");
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const practiceFollowUp = (text: string) => {
    setQuestion({ ...question, id: `fu_${Date.now()}`, text, type: "Follow-up", durationSec: 90, expectSTAR: false });
    setAnswer("");
    setStages({});
    setResult(null);
    setSeconds(0);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Quick helper to fill sample answer for speed demonstration
  const loadSampleAnswer = () => {
    const topic = question?.resumeTopic || 'ZAVE';
    if (topic.toLowerCase().includes('zave')) {
      if (question?.followUp) {
        setAnswer(`When our customer acquisition costs spiked during week 3, I ran a rapid growth experiment with local campus micro-influencers and dynamic WhatsApp discounts. This lowered our CAC by 42% and drove 65 repeat orders within 14 days.`);
      } else {
        setAnswer(`At ZAVE, I was the Co-founder leading product and growth. We built a quick-commerce fashion platform from 0 to 1, processing 120+ orders and ₹1L+ in revenue. I personally designed our customer onboarding funnel on Shopify and integrated local delivery courier APIs with automated dispatch.`);
      }
    } else {
      setAnswer(`In my engineering work on ${topic}, I identified that our ingestion throughput was bottlenecked by synchronous API calls. I re-architected the pipeline to an event-driven model using Kafka and decoupled worker queues. As a result, processing latency dropped by 58% and we maintained 99.999% availability.`);
    }
  };

  const roundDef = INTERVIEW_ROUNDS[roundParam] || INTERVIEW_ROUNDS.behavioral;
  const currentTopic = question?.resumeTopic || resumeSession?.topicsRemaining[0] || 'Resume Experience';

  return (
    <div ref={topRef} className="space-y-6 font-sans max-w-7xl mx-auto pb-16" data-testid="practice-session-page">
      {/* ======================================================== */}
      {/* 1. TOP COCKPIT HUD & TELEMETRY STRIP                     */}
      {/* ======================================================== */}
      <div className="border-3 border-line bg-white shadow-[5px_5px_0_#111111] font-mono">
        <div className="bg-ink text-paper px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold border-b-2 border-line">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 bg-[#C7FF2F] border border-line animate-pulse" />
            <span className="text-paper">PREPPILOT_ // COCKPIT_SESSION_LIVE</span>
            <span className="text-paper/40 hidden sm:inline">|</span>
            <span className="text-[#C7FF2F] hidden sm:inline uppercase">{roundDef.name}</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-paper bg-white/10 px-2.5 py-0.5 border border-white/20" data-testid="session-timer">
              <Clock className="h-3.5 w-3.5 text-[#C7FF2F]" />
              <span className="font-bold text-[#C7FF2F]">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={() => nav("/app/practice")}
              data-testid="session-back-btn"
              className="text-[10px] uppercase font-bold text-paper/70 hover:text-[#C7FF2F] transition-colors cursor-pointer border-b border-paper/30 pb-0.5"
            >
              [ EXIT SESSION ]
            </button>
          </div>
        </div>

        {/* Turn Progression & Context Rail */}
        <div className="px-4 sm:px-6 py-3 bg-paper/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="border-2 border-line bg-[#C7FF2F] text-ink font-bold px-2.5 py-0.5 uppercase shadow-[2px_2px_0_#111111]">
              TURN 0{Math.min((resumeSession?.coreQuestionsAsked || 0) + 1, roundDef.coreQuestionCount)} OF 0{roundDef.coreQuestionCount}
            </span>
            {question?.followUp && (
              <span className="border border-line bg-white text-[#127533] font-black px-2 py-0.5 uppercase">
                ● ADAPTIVE COUNTER-PROBE
              </span>
            )}
            <span className="text-mut uppercase hidden md:inline">
              TARGET FOCUS: <strong className="text-ink font-bold">{question?.competency || 'Core Architecture'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-mut uppercase">
            <span className="flex items-center gap-1 font-bold text-[#127533]">
              <ShieldCheck className="h-3.5 w-3.5" /> GROUNDED IN:
            </span>
            <span className="border border-line bg-white px-2 py-0.5 text-ink font-bold">
              {currentTopic}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN COCKPIT GRID (8 COLS HERO STAGE + 4 COLS RAIL)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PRIMARY STAGE (8 COLS): QUESTION & CANDIDATE RESPONSE */}
        <div className="lg:col-span-8 space-y-6">
          {/* Question Card */}
          <Reveal>
            <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111]" data-testid="question-display-card">
              <div className="flex items-center justify-between border-b-2 border-line pb-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#127533]" />
                  <span className="font-bold text-ink uppercase tracking-wider">[ AI INTERVIEWER INQUIRY ]</span>
                </div>
                <span className="border border-line bg-paper px-2 py-0.5 text-[10px] font-bold text-mut uppercase">
                  CALIBRATED: ~150 SECONDS
                </span>
              </div>

              {/* Natural, readable typography instead of aggressive all-caps */}
              <div className="my-5 sm:my-6 min-h-[90px] flex items-center">
                {isQuestionLoading || !question?.text ? (
                  <div className="w-full py-6 flex flex-col items-center justify-center space-y-3 text-center border-2 border-dashed border-line/40 bg-paper/50">
                    <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-3 py-1 font-mono text-xs font-black uppercase text-ink shadow-[2px_2px_0_#111111] animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-ink" />
                      SYNTHESIZING RESUME PROBE VIA LLM...
                    </div>
                    <p className="font-mono text-xs text-mut uppercase tracking-wider">
                      Grounding inquiry in candidate dossier · Calibrating {diffParam.toUpperCase()} seniority
                    </p>
                    <div className="w-56 h-2 border-2 border-line bg-paper overflow-hidden">
                      <div className="h-full bg-ink animate-[pulse_1s_infinite] w-full" />
                    </div>
                  </div>
                ) : (
                  <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-ink leading-relaxed tracking-tight">
                    "{question.text}"
                  </h1>
                )}
              </div>

              {/* Context Tagging */}
              <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-line bg-paper px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                    ROLE: {roleParam.toUpperCase()}
                  </span>
                  <span className="border border-line bg-paper px-2.5 py-1 text-[10px] font-bold uppercase text-ink">
                    DIFFICULTY: {diffParam.toUpperCase()}
                  </span>
                  {question?.evidenceUsed?.slice(0, 2).map((ev: string) => (
                    <span key={ev} className="border border-line bg-[#C7FF2F]/30 px-2 py-1 text-[10px] font-bold uppercase text-ink">
                      REF: {ev}
                    </span>
                  ))}
                </div>
                {question?.reason && (
                  <p className="text-[11px] text-mut italic max-w-md">
                    {question.reason}
                  </p>
                )}
              </div>
            </div>
          </Reveal>

          {/* Response Workspace */}
          <Reveal delay={0.05}>
            <div className="border-3 border-line bg-white p-6 sm:p-7 shadow-[6px_6px_0_#111111]" data-testid="response-editor">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line pb-3.5">
                <div>
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-ink block">
                    CANDIDATE RESPONSE CONSOLE
                  </span>
                  <p className="font-sans text-[11px] text-mut mt-0.5">
                    Structure your answer with situation context, technical trade-offs, and quantified results.
                  </p>
                </div>

                <div className="flex border-2 border-line p-0.5 bg-paper font-mono" data-testid="speech-recording-control">
                  {[
                    { id: "text", icon: PenLine, label: "Keyboard", testid: "text-mode-btn" },
                    { id: "voice", icon: Mic, label: "Microphone", testid: "voice-mode-btn" },
                  ].map(({ id, icon: Icon, label, testid }) => (
                    <button
                      key={id}
                      data-testid={testid}
                      onClick={() => setMode(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        mode === id ? "bg-ink text-[#C7FF2F] shadow-[2px_2px_0_#127533]" : "text-ink hover:bg-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Recording Widget */}
              {mode === "voice" && (
                <div className="mt-4 border-2 border-line bg-paper p-4 shadow-[3px_3px_0_#111111]" data-testid="voice-panel">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      data-testid="voice-record-btn"
                      onClick={toggleMic}
                      disabled={!srSupported}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center border-2 border-line transition-all cursor-pointer font-bold ${
                        listening
                          ? "bg-[#FF5C35] text-white shadow-[3px_3px_0_#111111] animate-pulse"
                          : "bg-[#C7FF2F] text-ink hover:bg-[#D6FF59] shadow-[3px_3px_0_#111111]"
                      } disabled:opacity-40`}
                    >
                      {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    {listening ? (
                      <div className="flex h-10 flex-1 items-end justify-center gap-1.5 border border-line bg-white p-2" data-testid="voice-waveform">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-1.5 origin-bottom animate-wave bg-[#127533]"
                            style={{ height: "70%", animationDelay: `${i * 0.05}s` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="flex-1 font-mono text-xs leading-relaxed text-ink2 font-medium">
                        {srSupported
                          ? "Click the microphone button to start real-time speech capture."
                          : "Voice input is not supported in this browser. Please type your response."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Textarea */}
              <div className="mt-4">
                <textarea
                  data-testid="response-text-area"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={8}
                  placeholder={
                    mode === "voice"
                      ? "Your live speech transcription appears here. You can edit text before submitting…"
                      : "Deliver a structured response. Detail the specific engineering context, alternatives evaluated, trade-offs made, and the quantified outcome…"
                  }
                  className="input-warm w-full resize-y min-h-[190px] leading-relaxed text-sm font-sans p-4 border-2 border-line bg-paper/20 focus:bg-white transition-colors"
                />
              </div>

              {/* Telemetry Counters & Action Strip */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3.5 border-t-2 border-line font-mono">
                <div className="flex items-center gap-3 text-xs font-bold uppercase">
                  <span data-testid="live-word-count" className={`px-2 py-0.5 border border-line ${words < 20 ? "bg-[#FFEFEA] text-[#FF5C35]" : "bg-paper text-ink"}`}>
                    {words} WORDS
                  </span>
                  <span data-testid="live-filler-count" className={`px-2 py-0.5 border border-line ${fillers > 2 ? "bg-[#FFEFEA] text-[#FF5C35]" : "bg-paper text-mut"}`}>
                    {fillers} FILLERS
                  </span>
                  <span data-testid="live-hedge-count" className={`px-2 py-0.5 border border-line ${hedges > 2 ? "bg-[#FFEFEA] text-[#FF5C35]" : "bg-paper text-mut"}`}>
                    {hedges} HEDGES
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={loadSampleAnswer}
                    type="button"
                    className="border border-line bg-paper px-3 py-2 text-xs font-bold uppercase text-ink hover:bg-[#C7FF2F] transition-colors cursor-pointer"
                  >
                    [ DEMO QUICK-FILL ]
                  </button>
                  <button
                    data-testid="submit-response-btn"
                    onClick={submit}
                    disabled={running || isQuestionLoading || !question?.text || words < 10}
                    className="btn-terra !px-6 !py-3 text-xs font-bold disabled:opacity-40 cursor-pointer shadow-[4px_4px_0_#111111] inline-flex items-center gap-2"
                  >
                    <span>{running ? "ANALYZING RESPONSE…" : "SUBMIT RESPONSE"}</span>
                    {!running && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* RIGHT COLUMN (4 COLS): LIVE AGENT TELEMETRY & TURN BLUEPRINT */}
        <div className="lg:col-span-4 space-y-6">
          <Reveal delay={0.08}>
            <div className="border-3 border-line bg-white p-5 sm:p-6 shadow-[6px_6px_0_#111111]" data-testid="feedback-card">
              <div className="flex items-center justify-between border-b-2 border-line pb-3 mb-4 font-mono">
                <span className="text-xs font-black uppercase tracking-wider text-ink">[ 5-AGENT PIPELINE ]</span>
                <span className="border border-line bg-[#C7FF2F] px-1.5 py-0.2 text-[9px] font-black text-ink uppercase">
                  {running ? "● PROCESSING" : "STANDBY"}
                </span>
              </div>

              {/* Agent Stepper */}
              <AgentStepper stages={stages} />

              {/* Processing Animation */}
              {running && (
                <div className="p-4 border-2 border-line bg-ink text-paper mt-5 font-mono space-y-3 shadow-[3px_3px_0_#C7FF2F]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#C7FF2F] border-b border-white/20 pb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-[#C7FF2F] animate-pulse" />
                      ANALYZING TURN
                    </span>
                    <span className="text-[10px] text-paper/60 uppercase">EVALUATING</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-paper/80">
                    <div className="flex justify-between">
                      <span>SPEECH ACOUSTICS:</span>
                      <span className="text-[#C7FF2F]">CHECKING</span>
                    </div>
                    <div className="flex justify-between">
                      <span>STAR BEATS:</span>
                      <span className="text-[#C7FF2F]">CHECKING</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TECHNICAL DEPTH:</span>
                      <span className="text-[#C7FF2F]">CHECKING</span>
                    </div>
                  </div>
                  <div className="h-2 w-full border border-white/30 bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-[#C7FF2F]"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
              )}

              {/* In-turn Guidance Blueprint */}
              {!running && (
                <div className="mt-5 border-2 border-line bg-paper p-4 font-mono space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-ink tracking-wider block border-b border-line pb-1.5">
                    [ WHAT THE INTERVIEWER IS EVALUATING ]
                  </span>
                  <ul className="space-y-1.5 text-xs text-ink font-sans font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-[#127533] font-bold">✓</span>
                      <span>Specific architectural decisions & trade-offs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#127533] font-bold">✓</span>
                      <span>Quantified production outcomes & scale</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#127533] font-bold">✓</span>
                      <span>Direct personal ownership (avoid passive "we")</span>
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-line text-[10px] text-mut uppercase">
                    FULL SYNTHESIS GENERATES AFTER ROUND TURN LIMIT
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROUND SUMMARY & RECOMMENDATIONS / FINAL REPORT MODAL     */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showFinalReport && (() => {
          const isMock = roundParam === 'mock';
          const roundOverallScore = Math.round(
            completedTurns.reduce((a, t) => a + (t.result?.overall || 80), 0) / Math.max(completedTurns.length, 1)
          ) || 82;

          const allStrengths = Array.from(new Set(completedTurns.flatMap(t => t.result?.strengths || [])));
          const strengths = allStrengths.length > 0 ? allStrengths.slice(0, 3) : [
            "Clear technical grounding in core resume technologies",
            "Structured response format with direct role relevance",
            "Clear articulation of personal ownership"
          ];

          const allWeaknesses = Array.from(new Set(completedTurns.flatMap(t => t.result?.improvements || [])));
          const weaknesses = allWeaknesses.length > 0 ? allWeaknesses.slice(0, 3) : [
            "Results were not quantified with specific benchmarks",
            "STAR Action sections were sometimes brief without trade-off depth"
          ];

          const topImprovementAreas = weaknesses.slice(0, 3);
          const llmEvaluatedTurns = completedTurns.filter(t => String(t.result?.evaluationSource || '').toLowerCase().includes('llm') || String(t.result?.evaluationSource || '').toLowerCase().includes('openai'));

          const evidenceSpans = completedTurns
            .map(t => {
              const starRes = t.result?.star?.result?.evidence;
              const starAct = t.result?.star?.action?.evidence;
              const contentEv = t.result?.content?.evidence?.[0];
              const snippet = starRes || starAct || contentEv || (t.answer?.length > 40 ? t.answer.slice(0, 150) + "…" : t.answer);
              return snippet;
            })
            .filter(Boolean)
            .slice(0, 3);

          const roundRecommendationsMap: Record<string, { rec: string; practice: string; nextKey: InterviewRoundKey; nextName: string }> = {
            hr: {
              rec: "Anchor your career arc around measurable outcomes and connect your foundational training directly to role impact. State your primary differentiator in the opening 30 seconds.",
              practice: "90-Second Career Value Proposition Drill",
              nextKey: 'behavioral',
              nextName: 'Behavioral & STAR',
            },
            behavioral: {
              rec: "Focus on making your Action and Result sections more specific. Practice answering with one measurable outcome in every behavioral answer (e.g. latency reduced, user sessions grown, or revenue delivered).",
              practice: "Quantified Result & Impact Framing Drill",
              nextKey: 'technical',
              nextName: 'Technical & Domain',
            },
            technical: {
              rec: "Deepen explanations of underlying architectural trade-offs, scalability bottlenecks, and data flows. When discussing frameworks and models, explicitly explain why you selected that architecture over alternatives.",
              practice: "Architecture Trade-offs & Scalability Drill",
              nextKey: 'situational',
              nextName: 'Situational & Problem Solving',
            },
            situational: {
              rec: "Lead with a structured diagnosis framework before jumping into fixes: immediate containment → root cause diagnosis → fix verification → post-mortem prevention.",
              practice: "Crisis Management & Triage Framing Drill",
              nextKey: 'leadership',
              nextName: 'Leadership & Ownership',
            },
            leadership: {
              rec: "Elevate your leadership signals by explicitly discussing stakeholder alignment, risk prioritization, and how you drove consensus across engineering and product when opinions differed.",
              practice: "Cross-Functional Influence Drill",
              nextKey: 'mock',
              nextName: 'Full Mock Interview',
            },
          };

          const roundRec = roundRecommendationsMap[roundParam] || roundRecommendationsMap.behavioral;

          const commScore = Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.communication || t.result?.scores?.clarity || 82), 0) / Math.max(completedTurns.length, 1));
          const contentScore = Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.completeness || t.result?.scores?.relevance || 84), 0) / Math.max(completedTurns.length, 1));
          const starScore = Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.structure || 80), 0) / Math.max(completedTurns.length, 1));
          const techScore = Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.relevance || 85), 0) / Math.max(completedTurns.length, 1));
          const roleAlignScore = Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.relevance || 86), 0) / Math.max(completedTurns.length, 1));

          const recurringGaps: string[] = [];
          const missingResults = completedTurns.filter(t => t.result?.star && !t.result.star.result?.detected).length;
          if (missingResults >= 1) {
            recurringGaps.push("Unquantified STAR Results: Action statements sometimes lack measurable end metrics.");
          }
          const shortTurns = completedTurns.filter(t => (t.answer?.split(/\s+/)?.length || 0) < 60).length;
          if (shortTurns >= 1) {
            recurringGaps.push("Depth below benchmark: Key trade-offs concluded before exploring architectural alternatives.");
          }
          const fillerTurns = completedTurns.filter(t => (t.result?.metrics?.fillers || 0) > 2).length;
          if (fillerTurns >= 1) {
            recurringGaps.push("Filler words under pressure: Occasional conversational hesitations during rapid follow-ups.");
          }
          if (recurringGaps.length === 0) {
            recurringGaps.push("Articulate edge-case recovery and observability during technical breakdowns.");
          }

          return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="bg-paper max-w-4xl w-full border-3 border-line shadow-[10px_10px_0_#111111] p-6 sm:p-10 space-y-8 max-h-[92vh] overflow-y-auto"
                data-testid={isMock ? "final-mock-report-modal" : "round-summary-modal"}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-line pb-6">
                  <div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="px-3 py-1 border-2 border-line bg-[#C7FF2F] text-ink text-xs font-bold uppercase tracking-wider">
                        {isMock ? "FULL MOCK INTERVIEW // FINAL REPORT" : `ROUND SUMMARY // ${roundDef.name.toUpperCase()}`}
                      </span>
                      <span className="text-xs text-mut font-bold">[ {llmEvaluatedTurns.length > 0 ? 'LLM EVALUATION ACTIVE' : 'LOCAL FALLBACK'} ]</span>
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-ink mt-3">
                      {isMock ? "Interview Evaluation Report" : `${roundDef.name} Summary & Recommendations`}
                    </h2>
                    <p className="font-mono text-xs text-mut mt-1 uppercase">
                      Candidate: <strong className="text-ink">{resumeSession?.candidateName || 'Candidate'}</strong> · Role: <strong className="text-[#127533]">{roleParam.toUpperCase()}</strong> · Evaluated across {completedTurns.length} turns
                    </p>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => window.print()}
                      className="border-2 border-line bg-white px-3 py-1.5 text-xs font-bold uppercase text-ink hover:bg-paper cursor-pointer shadow-[2px_2px_0_#111111]"
                    >
                      <Printer className="h-3.5 w-3.5 inline mr-1" /> PRINT
                    </button>
                    <button
                      onClick={() => setShowFinalReport(false)}
                      className="border-2 border-line bg-paper hover:bg-[#FF5C35] hover:text-white p-2 text-ink text-xs cursor-pointer font-bold shadow-[2px_2px_0_#111111]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Overall Score Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center border-3 border-line bg-white p-6 shadow-[5px_5px_0_#111111]">
                  <div className="sm:col-span-4 flex flex-col items-center justify-center text-center space-y-2 border-b sm:border-b-0 sm:border-r-2 border-line pb-4 sm:pb-0 sm:pr-4">
                    <ScoreRing value={roundOverallScore} size={150} />
                    <h4 className="font-display text-base font-bold uppercase text-ink mt-2">
                      {isMock ? "Overall Mock Score" : `${roundDef.name} Score`}
                    </h4>
                    <p className="font-mono text-[10px] text-mut uppercase">CALCULATED OVER {completedTurns.length} QUESTIONS</p>
                  </div>

                  <div className="sm:col-span-8 space-y-3 font-mono">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-line pb-1">
                      CORE DIMENSION SCORE MATRIX
                    </h4>
                    {[
                      { label: 'Role & Competency Alignment', score: Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.relevance || 85), 0) / Math.max(completedTurns.length, 1)) },
                      { label: 'Communication Clarity & Conciseness', score: Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.clarity || 82), 0) / Math.max(completedTurns.length, 1)) },
                      { label: 'Structural Coherence (STAR Rigor)', score: Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.structure || 80), 0) / Math.max(completedTurns.length, 1)) },
                      { label: 'Content Depth & Grounded Evidence', score: Math.round(completedTurns.reduce((a, t) => a + (t.result?.scores?.completeness || 84), 0) / Math.max(completedTurns.length, 1)) },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-ink uppercase">
                          <span>{item.label}</span>
                          <span className="bg-[#C7FF2F] px-1.5 border border-line">{item.score}%</span>
                        </div>
                        <div className="w-full border-2 border-line bg-paper h-2.5 p-0.5">
                          <div className="bg-[#127533] h-full transition-all duration-700" style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 font-mono">
                  <div className="border-3 border-line bg-white p-5 space-y-3 shadow-[4px_4px_0_#111111]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#127533] flex items-center gap-1.5 border-b border-line pb-2">
                      <Check className="h-4 w-4 stroke-[3]" /> [ WHAT WORKED // STRENGTHS ]
                    </p>
                    <ul className="space-y-2 text-xs text-ink font-sans font-medium">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#127533] font-bold">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-3 border-line bg-white p-5 space-y-3 shadow-[4px_4px_0_#111111]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#FF5C35] flex items-center gap-1.5 border-b border-line pb-2">
                      <AlertCircle className="h-4 w-4" /> [ WHAT HELD YOU BACK // GAPS ]
                    </p>
                    <ul className="space-y-2 text-xs text-ink font-sans font-medium">
                      {weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#FF5C35] font-bold">!</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Verbatim Candidate Evidence */}
                <div className="border-3 border-line bg-white p-5 space-y-3 shadow-[4px_4px_0_#111111] font-mono">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 border-b border-line pb-2">
                    <FileText className="h-4 w-4" /> [ VERBATIM CANDIDATE EVIDENCE EXTRACTED ]
                  </p>
                  <div className="space-y-2 font-sans font-medium">
                    {evidenceSpans.length > 0 ? (
                      evidenceSpans.map((ev, i) => (
                        <div key={i} className="border-l-4 border-line pl-3.5 py-1.5 bg-paper text-xs italic text-ink2 leading-relaxed">
                          "{ev}"
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-mut italic">No candidate quotes captured yet.</p>
                    )}
                  </div>
                </div>

                {/* Recurring Gaps */}
                {isMock && (
                  <div className="border-3 border-line bg-[#FFEFEA] p-5 space-y-2.5 font-mono shadow-[4px_4px_0_#111111]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#FF5C35] flex items-center gap-1.5 border-b border-line pb-2">
                      <AlertCircle className="h-4 w-4" /> RECURRING GAPS IDENTIFIED
                    </p>
                    <ul className="space-y-1.5 text-xs text-ink font-sans font-medium">
                      {recurringGaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-bold text-[#FF5C35]">·</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ranked Recommendations */}
                <div className="border-3 border-line bg-[#C7FF2F]/20 p-6 space-y-4 shadow-[5px_5px_0_#111111]">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 border-b-2 border-line pb-2">
                    <Sparkles className="h-4 w-4" /> PREPPILOT VERDICT: TOP DIRECTIVES
                  </p>

                  <div className="space-y-2 font-mono">
                    {topImprovementAreas.map((area, i) => (
                      <div key={i} className="border-2 border-line bg-white p-3 flex items-start gap-3 text-xs text-ink font-bold shadow-[2px_2px_0_#111111]">
                        <span className="bg-[#C7FF2F] px-1.5 border border-line">0{i + 1}</span>
                        <span className="font-sans font-semibold">{area}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-2 border-line bg-white p-4 font-mono shadow-[3px_3px_0_#111111]">
                    <p className="text-xs font-bold text-ink uppercase">[ ACTIONABLE DRILL RECOMMENDATION ]</p>
                    <p className="text-xs text-ink2 mt-1 leading-relaxed font-sans font-medium">
                      {isMock
                        ? "Continue elevating technical depth and trade-off justification across all rounds. Always conclude behavioral answers with a quantified outcome."
                        : roundRec.rec}
                    </p>
                    <div className="mt-3 text-xs text-mut pt-2 border-t border-line">
                      RECOMMENDED PRACTICE: <strong className="text-ink font-bold">{isMock ? "Personalized 4-Week Improvement Plan" : roundRec.practice}</strong>
                    </div>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-line font-mono">
                  <button
                    onClick={() => {
                      setShowFinalReport(false);
                      nav("/app/sessions");
                    }}
                    className="btn-ghost !text-xs font-bold cursor-pointer w-full sm:w-auto"
                  >
                    VIEW IN SESSIONS HISTORY
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                    {!isMock && (
                      <button
                        onClick={() => {
                          setShowFinalReport(false);
                          practiceFollowUp(`Follow-up drill: Deliver a 60-second response with one quantified metric addressing: ${topImprovementAreas[0] || 'core metrics'}`);
                        }}
                        className="btn-ghost !text-xs font-bold cursor-pointer w-full sm:w-auto"
                      >
                        [ PRACTICE THIS SKILL ]
                      </button>
                    )}

                    {!isMock && roundRec.nextKey && (
                      <button
                        onClick={() => {
                          setShowFinalReport(false);
                          nav(`/app/session?round=${roundRec.nextKey}&role=${roleParam}&diff=${encodeURIComponent(diffParam)}`);
                        }}
                        className="btn-terra !text-xs font-bold cursor-pointer w-full sm:w-auto"
                      >
                        <span>CONTINUE TO NEXT ROUND ({roundRec.nextName.toUpperCase()})</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </button>
                    )}

                    {isMock && (
                      <button
                        onClick={() => {
                          setShowFinalReport(false);
                          nav("/app/plan");
                        }}
                        className="btn-terra !text-xs font-bold cursor-pointer w-full sm:w-auto"
                      >
                        <span>VIEW IMPROVEMENT PLAN</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

export default function PracticeSession() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-mut">Loading practice session…</div>}>
      <PracticeSessionInner />
    </Suspense>
  );
}

const verdict = (s: number) =>
  s >= 85
    ? "Panel-ready — structured, specific and confident."
    : s >= 70
      ? "Solid answer. Tighten the ending and it lands harder."
      : s >= 55
        ? "The bones are there — the structure needs work."
        : "Too thin to evaluate fairly. Slow down and build the story.";

function Overview({ result }: { result: any }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <div className="space-y-4">
        {Object.entries(result.scores).map(([k, v]: [string, any], i: number) => (
          <ScoreBar key={k} label={k[0].toUpperCase() + k.slice(1)} value={v} delay={i * 0.07} />
        ))}
      </div>
      <div className="space-y-6">
        <div data-testid="feedback-strengths" className="border-2 border-line p-4 bg-white shadow-[3px_3px_0_#111111]">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#127533] flex items-center gap-1.5 border-b border-line pb-2 mb-3">
            <Check className="h-4 w-4 stroke-[3]" /> [ WHAT WORKED // STRENGTHS ]
          </p>
          <ul className="space-y-2.5">
            {result.strengths.map((s: string) => (
              <li key={s} className="flex items-start gap-2 text-xs font-sans font-medium leading-relaxed text-ink">
                <span className="text-[#127533] font-bold">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div data-testid="feedback-improvements" className="border-2 border-line p-4 bg-white shadow-[3px_3px_0_#111111]">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF5C35] flex items-center gap-1.5 border-b border-line pb-2 mb-3">
            <AlertCircle className="h-4 w-4" /> [ WHAT HELD YOU BACK // IMPROVEMENTS ]
          </p>
          <ul className="space-y-2.5">
            {result.improvements.map((s: string) => (
              <li key={s} className="flex items-start gap-2 text-xs font-sans font-medium leading-relaxed text-ink">
                <span className="text-[#FF5C35] font-bold">!</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StarView({ result }: { result: any }) {
  const meta = [
    ["S", "Situation", result.star.situation],
    ["T", "Task", result.star.task],
    ["A", "Action", result.star.action],
    ["R", "Result", result.star.result],
  ];
  return (
    <div data-testid="star-breakdown-accordion" className="space-y-4">
      <div className="space-y-3">
        {meta.map(([k, label, s]) => (
          <div key={k} className="border-2 border-line bg-white p-4 shadow-[3px_3px_0_#111111]">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink font-mono">
                <span className="flex h-6 w-6 items-center justify-center border border-line bg-[#C7FF2F] text-ink font-mono text-xs font-black">
                  {k}
                </span>
                {label}
              </span>
              {s.detected ? (
                <span className="chip !border-line !bg-[#C7FF2F] !text-ink font-mono !text-[10px] font-black uppercase">
                  ● DETECTED
                </span>
              ) : (
                <span className="chip !border-line !bg-[#FFEFEA] !text-[#FF5C35] font-mono !text-[10px] font-bold uppercase">
                  ○ MISSING
                </span>
              )}
            </div>
            <p className="mt-2.5 border-l-4 border-line pl-3 py-1 bg-paper text-xs italic leading-relaxed text-ink2">
              "{s.evidence}"
            </p>
          </div>
        ))}
      </div>
      <div className="border border-line bg-paper p-3 text-xs font-mono text-mut leading-relaxed">
        {result.starFilled}/4 components detected. Evidence spans are extracted from your exact wording via the STAR Diagnostic Engine.
      </div>
    </div>
  );
}

function Rewrite({ result }: { result: any }) {
  const copy = () => navigator.clipboard?.writeText(result.modelAnswer);
  return (
    <div className="space-y-5">
      <div className="border-3 border-line bg-ink text-paper p-6 shadow-[5px_5px_0_#C7FF2F]" data-testid="model-answer-card">
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#C7FF2F]">
            [ HOW THE COACH WOULD SAY IT // MODEL REWRITE ]
          </p>
          <button
            onClick={copy}
            data-testid="copy-model-answer-btn"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-[#C7FF2F] hover:text-ink text-paper px-2 py-1 border border-white/20 transition-all cursor-pointer"
          >
            <Copy className="h-3 w-3" /> COPY TRANSCRIPT
          </button>
        </div>
        <p className="mt-4 font-mono text-sm leading-relaxed text-paper/95 font-medium">
          "{result.modelAnswer}"
        </p>
      </div>

      <div className="border-2 border-line bg-white p-5 shadow-[3px_3px_0_#111111]">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-2 mb-3">
          [ STRATEGIC CHECKLIST THIS REWRITE SATISFIES ]
        </p>
        <ul className="space-y-2">
          {result.modelPoints.map((p: string) => (
            <li key={p} className="flex items-start gap-2 text-xs font-sans font-medium text-ink2">
              <span className="text-[#127533] font-bold">✓</span> {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FollowUps({ result, onPick }: { result: any; onPick: (t: string) => void }) {
  return (
    <div data-testid="followup-list" className="space-y-4">
      <p className="text-xs font-mono text-ink2 border-b border-line pb-2">
        THE COACH AGENT DRILLS WHERE YOUR ANSWER WAS WEAKEST. SELECT A PROMPT TO CONTINUE PRACTICE:
      </p>
      <div className="space-y-3">
        {result.followUps.map((f: string, i: number) => (
          <motion.button
            key={f}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onPick(f)}
            data-testid={`followup-chip-${i}`}
            className="group flex w-full items-center justify-between gap-4 border-2 border-line bg-white p-4 text-left transition-all hover:bg-[#C7FF2F]/20 hover:translate-x-1 shadow-[3px_3px_0_#111111] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-paper border border-line px-1.5 py-0.5">
                0{i + 1}
              </span>
              <span className="text-xs font-bold font-sans text-ink">{f}</span>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-ink group-hover:translate-x-1 transition-transform" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function A2ATraceView({ result }: { result: any }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const a2aMessages = result.a2aMessages || [];

  return (
    <div className="space-y-4" data-testid="a2a-trace-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-2 border-line pb-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
            [ REAL AGENT-TO-AGENT (A2A) TRACE LOG ]
          </p>
          <p className="text-[11px] font-mono text-mut mt-0.5">
            Structured JSON payloads exchanged between the 5 specialist agents during this evaluation turn.
          </p>
        </div>
        <span className="chip !border-line !bg-[#C7FF2F] !text-ink font-mono !text-[10px] font-bold w-fit">
          {a2aMessages.length} MESSAGES EXCHANGED
        </span>
      </div>

      <div className="space-y-2.5 font-mono">
        {a2aMessages.map((msg: any, i: number) => {
          const isExpanded = expandedIndex === i;
          return (
            <div key={i} className="border-2 border-line bg-white p-3.5 shadow-[3px_3px_0_#111111] transition-all">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center border border-line bg-paper text-[10px] font-bold text-ink">
                    0{i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">{msg.from}</span>
                    <ArrowRight className="h-3 w-3 text-mut" />
                    <span className="text-xs font-bold text-[#127533]">{msg.to}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-mut">{msg.latencyMs}ms</span>
                  <span className="border border-line bg-[#C7FF2F] px-1.5 py-0.5 text-[9px] font-black uppercase text-ink">
                    {msg.status}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-[10px] text-mut uppercase tracking-wider mb-2">
                    PAYLOAD STREAM ({msg.from} → {msg.to}):
                  </p>
                  <pre className="p-3 bg-ink text-[#C7FF2F] border border-line text-[11px] overflow-x-auto max-h-64 leading-relaxed font-mono">
                    {JSON.stringify(msg.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';

import { Link } from "@/lib/routerCompat";
import {
  ArrowRight, ArrowUpRight, Check, Play, RefreshCw, Target, Trophy,
  AlertTriangle, AlertCircle, ChevronDown, ChevronUp, BookOpen, Clock,
  CheckCircle2, RotateCcw, Sparkles
} from "lucide-react";
import { loadSessions, profile, saveSession } from "@/lib/store";
import { recommendedTopics } from "@/lib/resources";
import ResourceList from "@/components/ResourceList";
import { Reveal } from "@/components/ui-bits";
import { createRequestId } from "@/lib/requestId";
import { useEffect, useMemo, useRef, useState } from "react";

export type RoadmapNode = {
  id: string;
  title: string;
  why: string;
  action: string;
  metric: string;
  week: string;
  youtubeQuery: string;
  youtubeUrl?: string;
  mistake?: string;
  groundedIn?: string;
};

export type Mcq = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type SessionDeficit = {
  type: string;
  title: string;
  detail: string;
  severity: 'high' | 'med';
  metricValue?: string;
  tag: string;
};

const GAP_COPY: Record<string, { title: string; why: string; action: string; metric: string; query: string; groundedIn: string }> = {
  fillers: {
    title: "Eradicate Speech Hesitation & Fillers",
    why: "Verbal crutches ('um', 'like', 'sort of') spike under cognitive stress, diluting technical authority and executive presence.",
    action: "Run 60-second rapid-fire drill: replace every reflexive filler with a silent, deliberate 1.5s pause. Record and review daily.",
    metric: "0–2 fillers / answer",
    query: "how to stop filler words in interviews speech pause",
    groundedIn: "Session Speech Metrics: Elevated filler word frequency under cognitive load"
  },
  results: {
    title: "Quantify Measured Impact with Hard Metrics",
    why: "Your stories stop prematurely at the technical action or leave outcomes vague, missing the hard proof interviewers demand.",
    action: "Restructure your answers so every single story concludes with verified numbers: latency %, revenue ₹, time saved, or system scale.",
    metric: "100% answers end in quantified metric",
    query: "STAR method interview quantify impact measurable results examples",
    groundedIn: "Session STAR Audit: Answer concluded without business/performance metrics"
  },
  structure: {
    title: "Enforce Audible STAR Beats & Signposting",
    why: "Without explicit signposts, complex problem solving sounds rambling and difficult for senior interviewers to score on the rubric.",
    action: "Open with a 1-sentence executive headline, then audibly state 'First... Then... As a result...' before detailing technical metrics.",
    metric: "3+ clear signposts / answer",
    query: "STAR method interview answer structure signposting technique",
    groundedIn: "Session Evaluation: Structure score below benchmark (missed Task/Action beats)"
  },
  hedges: {
    title: "Eliminate Passive Hedging with High-Agency Claims",
    why: "Words like 'I think maybe' and 'we probably' subtly undermine candidate seniority and indicate lack of direct ownership.",
    action: "Audit your transcripts; replace every hedge with an assertive claim ('I chose Kafka because...' instead of 'I think Kafka was used').",
    metric: "≤1 hedge / response",
    query: "confident communication interview answers assertiveness",
    groundedIn: "Session Communication Agent: Passive hedging detected in technical rationale"
  },
  thin: {
    title: "Deepen Technical Architecture & Trade-Offs",
    why: "Surface-level answers fail senior benchmarks because they describe what was built without justifying alternative trade-offs.",
    action: "For every architecture claim, evaluate two alternatives (e.g. SQL vs NoSQL, sync vs async) and explain why the alternative was rejected.",
    metric: "≥2 architecture trade-offs evaluated",
    query: "system design interview trade offs how to explain technical decisions",
    groundedIn: "Session Content Agent: Completeness score dipped below 70%"
  },
};

const FALLBACK_MCQ: Mcq[] = [
  {
    question: "When concluding a behavioral or technical story, which ending delivers the strongest signal of engineering ownership?",
    options: [
      "The engineering team was very satisfied with the sprint velocity.",
      "We migrated the ingestion tier to Kafka and dropped p99 consumer lag from 420ms to 18ms under 50k req/sec peak load.",
      "It was an extremely demanding project that taught me many valuable lessons.",
      "The release went smoothly without any major customer escalation."
    ],
    answer: 1,
    explanation: "Concrete, quantified metrics (dropping p99 lag from 420ms to 18ms at specified throughput) provide irrefutable proof of technical impact."
  },
  {
    question: "What is the primary strategic benefit of audible signposts ('First... Then... As a result...') in senior interviews?",
    options: [
      "They allow you to stall for extra time while formulating the next thought.",
      "They make the transcript artificially longer for higher completeness scores.",
      "They reduce cognitive friction for the interviewer, making your problem-solving logic easy to track and score on the rubric.",
      "They ensure you don't need to answer follow-up technical questions."
    ],
    answer: 2,
    explanation: "Signposts structure your answer so the interviewer can effortlessly map your thoughts into Situation, Task, Action, and Result rubrics."
  },
  {
    question: "How should a candidate handle unexpected cognitive hesitation during a difficult interview question?",
    options: [
      "Fill the dead air quickly with 'um' or 'like' to signal that you are still speaking.",
      "Take a deliberate 1.5 to 2-second silent pause to organize your next point before speaking with composure.",
      "Talk as fast as possible to overwhelm the interviewer with technical jargon.",
      "Immediately ask the interviewer to skip to another question."
    ],
    answer: 1,
    explanation: "A deliberate silent pause sounds calm, confident, and executive, whereas filler words dilute credibility and betray anxiety."
  },
  {
    question: "Which of the following statements represents high-agency communication rather than passive hedging?",
    options: [
      "I think maybe we decided to use Redis caching because it seemed faster.",
      "I evaluated Redis versus Memcached and chose Redis for cluster persistence and pub/sub capabilities, reducing database read load by 68%.",
      "We probably could have used PostgreSQL, but someone suggested NoSQL instead.",
      "It felt like the system was getting bottlenecked so we tweaked the config."
    ],
    answer: 1,
    explanation: "Direct ownership statements specify the trade-off, rationale, and quantified consequence, avoiding passive or hesitant qualifiers."
  }
];

// Sample benchmark session used when the candidate's history is fresh or for demonstration
const SAMPLE_BENCHMARK_SESSIONS = [
  {
    id: "session_benchmark_01",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    questionText: "AI/ML Technical Round: Distributed Training Pipeline Bottlenecks",
    competency: "Technical Communication",
    difficulty: "Senior",
    mode: "text",
    overall: 64,
    scores: { relevance: 72, clarity: 64, structure: 52, completeness: 58, communication: 66 },
    metrics: { words: 128, fillers: 5, hedges: 3, paceWpm: 140 },
    starFilled: 2,
    strengths: [
      "Accurate foundational knowledge of PyTorch Distributed Data Parallel",
      "Understands gradient synchronization overhead"
    ],
    improvements: [
      "Left outcome unquantified — did not measure GPU throughput or epoch speedup",
      "Structure scored 52%: skipped the Task scope and jumped straight into resolution",
      "Used 5 filler words under pressure ('um', 'like', 'sort of')",
      "Hedging language softened seniority ('I think maybe NCCL was configured')"
    ],
    turns: [
      {
        question: { text: "Describe a distributed GPU training bottleneck you resolved. What was the core trade-off?" },
        answer: "We had a cluster of 8 A100 nodes and training was slow. I think maybe the network was congested with gradient all-reduce. I enabled mixed precision and gradient accumulation so batch sizes were bigger and it trained faster.",
        result: {
          overall: 64,
          scores: { structure: 52, clarity: 64, relevance: 72, completeness: 58, communication: 66 },
          improvements: [
            "Quantify GPU utilization delta (e.g. from 42% to 91%)",
            "State network bandwidth metrics (InfiniBand 200Gbps vs RoCE)",
            "Audibly structure using First / Then / As a result"
          ]
            }
      }
    ]
  },
  {
    id: "session_benchmark_02",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    questionText: "System Architecture: Fault-Tolerant Event Ingestion Engine",
    competency: "Problem Solving",
    difficulty: "Senior",
    mode: "voice",
    overall: 68,
    scores: { relevance: 76, clarity: 68, structure: 58, completeness: 65, communication: 70 },
    metrics: { words: 165, fillers: 4, hedges: 2, paceWpm: 152 },
    starFilled: 3,
    strengths: [
      "Good identification of Kafka partition rebalancing triggers",
      "Correct implementation of idempotent consumer writes"
    ],
    improvements: [
      "Omitted backup dead-letter queue replay mechanism",
      "Used 4 filler words when explaining partition rebalancing",
      "Lacked final SLA business metric (e.g. 99.99% availability)"
    ]
  }
];

const DIRECT_YOUTUBE: Record<string, { url: string; title: string }> = {
  structure: { url: "https://www.youtube.com/watch?v=dRqN4BuhCHU", title: "STAR Method Interview: How to Answer Behavioral Questions" },
  results: { url: "https://www.youtube.com/watch?v=dRqN4BuhCHU", title: "STAR Method Interview: How to Answer Behavioral Questions" },
  fillers: { url: "https://www.youtube.com/watch?v=eDyVGYX8wVw", title: "STOP Saying Um While Speaking: Filler Words" },
  hedges: { url: "https://www.youtube.com/watch?v=eDyVGYX8wVw", title: "STOP Saying Um While Speaking: Filler Words" },
  thin: { url: "https://www.youtube.com/watch?v=vOn6wUcOXzI", title: "System Design Interview Prep: Full Course" },
  default: { url: "https://www.youtube.com/watch?v=bUHFg8CZFws", title: "System Design Interview: Step-by-Step Guide" },
};
const youtubeUrl = (node: RoadmapNode) => node.youtubeUrl || DIRECT_YOUTUBE[node.id.split("-")[1]]?.url || DIRECT_YOUTUBE.default.url;
const ROADMAP_CACHE_PREFIX = "preppilot_roadmap_v4:";
const MASTERED_KEY = "preppilot_mastered_nodes_v1";

function sessionFingerprint(sessions: any[]) {
  return sessions.map((session) => session.id || session.createdAt || session.overall).join("|");
}

function roadmapCacheKey(sessions: any[]) {
  return `${ROADMAP_CACHE_PREFIX}${sessionFingerprint(sessions)}`;
}

export function extractSessionDeficits(session: any): SessionDeficit[] {
  const deficits: SessionDeficit[] = [];
  const scores = session.scores || {};
  const metrics = session.metrics || {};

  // 1. Structure Deficit
  const structureScore = scores.structure ?? 100;
  const starFilled = session.starFilled ?? 0;
  if (structureScore < 70 || starFilled < 3) {
    deficits.push({
      type: "STAR_STRUCTURE",
      title: "Broken STAR Structure & Inaudible Beats",
      detail: `Structure scored ${structureScore}%. Your answer contained only ${starFilled}/4 STAR components, so the interviewer could not clearly follow the problem, responsibility, and resolution.`,
      severity: structureScore < 60 ? "high" : "med",
      metricValue: `${structureScore}% Structure · ${starFilled}/4 STAR`,
      tag: "Structure"
    });
  }

  // 2. Unquantified Impact
  if (!(session.star?.result?.detected ?? starFilled >= 4) && starFilled < 4) {
    deficits.push({
      type: "UNQUANTIFIED_IMPACT",
      title: "Unquantified Business / System Outcome",
      detail: "The response described technical execution but stopped before proving verified numbers (e.g. latency, revenue, cost, or scale deltas).",
      severity: "high",
      metricValue: "Result Beat Missing",
      tag: "Impact"
    });
  }

  // 3. Filler Words
  if ((metrics.fillers || 0) > 2) {
    deficits.push({
      type: "SPEECH_FILLERS",
      title: `Excessive Verbal Fillers (${metrics.fillers} detected)`,
      detail: `Candidate used ${metrics.fillers} filler words ('um', 'like', 'sort of') under cognitive pressure, diluting poise and authority.`,
      severity: metrics.fillers > 4 ? "high" : "med",
      metricValue: `${metrics.fillers} fillers`,
      tag: "Acoustics"
    });
  }

  // 4. Hedging
  if ((metrics.hedges || 0) > 1) {
    deficits.push({
      type: "HEDGING_LANGUAGE",
      title: `Passive Hedging (${metrics.hedges} instances)`,
      detail: `Softened claims with phrases like 'I think maybe' and 'we probably', weakening ownership of the engineering outcome.`,
      severity: "med",
      metricValue: `${metrics.hedges} hedges`,
      tag: "Confidence"
    });
  }

  // 5. Shallow Completeness
  const completenessScore = scores.completeness ?? 100;
  const relevanceScore = scores.relevance ?? 100;
  if (completenessScore < 70 || relevanceScore < 70) {
    deficits.push({
      type: "COMPLETENESS_DEPTH",
      title: "Shallow Technical Trade-Off Articulation",
      detail: `Completeness was ${completenessScore}% and relevance was ${relevanceScore}%. The answer needed more specific reasoning, trade-offs, or production evidence instead of stopping at a high-level description.`,
      severity: "high",
      metricValue: `${scores.completeness || 60}% Depth`,
      tag: "Technical Depth"
    });
  }

  // 6. Direct Pipeline Improvements
  if (Array.isArray(session.improvements) && session.improvements.length > 0) {
    session.improvements.forEach((imp: string) => {
      if (!deficits.some(d => d.detail.toLowerCase().includes(imp.toLowerCase().slice(0, 15)))) {
        deficits.push({
          type: "COACH_DIRECTIVE",
          title: "Specific mistake detected in your answer",
          detail: imp,
          severity: "med",
          tag: "Agent Directive"
        });
      }
    });
  }

  return deficits;
}

function fallbackRoadmap(gaps: any[]): RoadmapNode[] {
  const source = gaps.length ? gaps : [{ key: "structure" }, { key: "results" }, { key: "fillers" }, { key: "thin" }];
  return source.slice(0, 4).map((gap, index) => {
    const copy = GAP_COPY[gap.key] || GAP_COPY.structure;
    return {
      id: `node-${gap.key}-${index}`,
      title: copy.title,
      mistake: gap.evidence || copy.groundedIn,
      why: copy.why,
      action: copy.action,
      metric: copy.metric,
      week: `PHASE 0${index + 1} · ${index === 0 ? "URGENT REPAIR" : "MASTERY HABIT"}`,
      youtubeQuery: copy.query,
      youtubeUrl: DIRECT_YOUTUBE[gap.key]?.url || DIRECT_YOUTUBE.default.url,
      groundedIn: gap.evidence || copy.groundedIn
    };
  });
}

function gapKeyForDeficit(type: string): string {
  return ({
    STAR_STRUCTURE: "structure",
    UNQUANTIFIED_IMPACT: "results",
    SPEECH_FILLERS: "fillers",
    HEDGING_LANGUAGE: "hedges",
    COMPLETENESS_DEPTH: "thin",
    COACH_DIRECTIVE: "structure",
  } as Record<string, string>)[type] || "structure";
}

function parseJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    try {
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }
}

function normalizeMcqs(value: unknown): Mcq[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((item: any) => {
    const options = Array.isArray(item?.options)
      ? item.options.filter((option: unknown): option is string => Boolean(typeof option === "string" && option.trim())).slice(0, 4)
      : [];
    const answer = Number(item?.answer);
    return {
      question: typeof item?.question === "string" ? item.question.trim() : "",
      options,
      answer,
      explanation: typeof item?.explanation === "string" ? item.explanation.trim() : "",
    };
  }).filter((item) => Boolean(item.question && item.options.length === 4 && Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4 && item.explanation));
}

export default function Plan() {
  const [p, setP] = useState<any>({ index: 0, avg: 0, starRate: 0, streak: 0, gaps: [], total: 0 });
  const [sessions, setSessions] = useState<any[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapNode[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [roadmapSource, setRoadmapSource] = useState("COACH AGENT · TAILORED FROM SESSIONS");
  const [mcqs, setMcqs] = useState<Mcq[]>([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [activeQuizNode, setActiveQuizNode] = useState<RoadmapNode | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isSeededDemo, setIsSeededDemo] = useState(false);
  const roadmapRequest = useRef<Promise<void> | null>(null);
  const loadedRoadmapKey = useRef("");

  useEffect(() => {
    const rawSessions = loadSessions();
    const usingDemo = rawSessions.length === 0;
    const activeSessions = usingDemo ? SAMPLE_BENCHMARK_SESSIONS : rawSessions;
    setIsSeededDemo(usingDemo);

    const currentProfile = profile(activeSessions);
    setSessions(activeSessions);
    setP(currentProfile);

    // Load persisted mastered nodes
    if (typeof window !== "undefined") {
      try {
        const storedMastered = JSON.parse(localStorage.getItem(MASTERED_KEY) || "{}");
        if (storedMastered && typeof storedMastered === "object") {
          setCompleted(storedMastered);
        }
      } catch {
        // ignore
      }
    }

    const evidenceByGap = new Map<string, string>();
    activeSessions.forEach((session: any) => {
      extractSessionDeficits(session).forEach((deficit) => {
        const key = gapKeyForDeficit(deficit.type);
        if (!evidenceByGap.has(key)) evidenceByGap.set(key, `Session evidence: ${deficit.detail}`);
      });
    });
    const groundedGaps = (currentProfile.gaps || []).map((gap: any) => ({
      ...gap,
      evidence: evidenceByGap.get(gap.key),
    }));
    setRoadmap(fallbackRoadmap(groundedGaps));

    const cacheKey = roadmapCacheKey(activeSessions);
    if (activeSessions.length && loadedRoadmapKey.current !== cacheKey) {
      loadedRoadmapKey.current = cacheKey;
      let cached: RoadmapNode[] | null = null;
      try {
        cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      } catch {
        cached = null;
      }
      if (Array.isArray(cached) && cached.length) {
        setRoadmap(cached);
        setRoadmapSource("CACHED · GROUNDED IN SESSION DATA");
      } else {
        void generateRoadmap(activeSessions, currentProfile, cacheKey);
      }
    }
  }, []);

  async function generateRoadmap(currentSessions: any[], currentProfile: any, cacheKey = roadmapCacheKey(currentSessions)) {
    if (!currentSessions.length || roadmapRequest.current) return;
    setLoadingRoadmap(true);
    roadmapRequest.current = (async () => {
      try {
        // Collect detailed session deficits for LLM context
        const sessionAuditContext = currentSessions.slice(0, 6).map((s, idx) => ({
          sessionIndex: idx + 1,
          roundTitle: s.questionText || "Practice Round",
          overallScore: s.overall,
          scores: s.scores,
          metrics: s.metrics,
          starFilled: s.starFilled,
          deficitsIdentified: extractSessionDeficits(s).map(d => `${d.title}: ${d.detail}`)
        }));

        const response = await fetch("/api/llm/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-request-id": createRequestId('roadmap') },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: "You are an elite interview coach and learning path architect. You build hyper-specific curriculum to fix exact candidate weaknesses. Return ONLY valid JSON."
              },
              {
                role: "user",
                content: `Candidate interview audit shows specific deficits across past sessions.
Create a tailored 4-phase preparation roadmap that directly addresses what went wrong in their interview sessions.

Session Audit Data:
${JSON.stringify(sessionAuditContext, null, 2)}

Candidate Summary:
Readiness Index: ${currentProfile.index}/100, Frequent Gaps: ${JSON.stringify(currentProfile.gaps)}

Output JSON format strictly:
{
  "roadmap": [
    {
      "id": "node-1",
      "week": "PHASE 01 · FOUNDATIONAL REPAIR",
      "title": "Clear action-oriented title",
      "groundedIn": "Direct citation of what failed in sessions (e.g. Session #1 Structure score 52%)",
      "why": "Specific breakdown of why interviewers penalize this mistake and how it harms the hiring decision",
      "action": "Concrete, actionable 3-step daily drill the candidate must execute",
      "metric": "Measurable passing threshold (e.g. 4/4 STAR beats, 0 fillers, quantified metric)",
      "youtubeQuery": "Topic label for the learning objective",
      "youtubeUrl": "A direct YouTube watch URL (https://www.youtube.com/watch?v=...), never a search-results URL",
      "mistake": "The exact mistake the candidate made, quoting the session evidence"
    }
  ]
}`
              }
            ]
          })
        });

        if (!response.ok) return;
        const data = await response.json();
        const parsed = parseJson(data.content || "");
        if (Array.isArray(parsed?.roadmap) && parsed.roadmap.length) {
          const generated = parsed.roadmap.slice(0, 4).map((node: RoadmapNode, i: number) => ({
            ...node,
            id: node.id || `node-${i}`,
            youtubeQuery: node.youtubeQuery || node.title,
            youtubeUrl: /^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/.test(node.youtubeUrl || "")
              ? node.youtubeUrl
              : DIRECT_YOUTUBE.default.url,
            week: node.week || `PHASE 0${i + 1}`,
            mistake: node.mistake || node.groundedIn || "Review the evidence from the failed interview turn.",
            groundedIn: node.groundedIn || `Triggered by Session Audit #${i + 1}`
          }));
          setRoadmap(generated);
          setRoadmapSource("COACH AGENT · SYNTHESIZED FROM LIVE SESSIONS");
          try {
            localStorage.setItem(cacheKey, JSON.stringify(generated));
          } catch {
            // cache is optional
          }
        }
      } catch (err) {
        console.warn("Roadmap generation fallback used:", err);
      }
    })();

    try {
      await roadmapRequest.current;
    } finally {
      roadmapRequest.current = null;
      setLoadingRoadmap(false);
    }
  }

  // Trigger MCQ Assessment for a specific node or full plan
  async function startAssessment(targetNode?: RoadmapNode) {
    if (quizLoading) return;
    setActiveQuizNode(targetNode || null);
    setQuizOpen(true);
    setQuizLoading(true);
    setSubmitted(false);
    setSelected({});
    setMcqs([]);

    try {
      const focusTitle = targetNode ? targetNode.title : "Candidate Interview Weaknesses";
      const focusWhy = targetNode ? targetNode.why : "STAR Structure, Quantified Results, and Speech Poise";
      const focusQuery = targetNode ? targetNode.youtubeQuery : "STAR method, filler reduction, system design trade-offs";

      const sessionContext = sessions.slice(0, 4).map(s => ({
        scores: s.scores,
        metrics: s.metrics,
        improvements: s.improvements,
        question: s.questionText
      }));

      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-request-id": createRequestId('assessment') },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are an expert interview evaluator creating rigorous, practical multiple-choice questions to test candidate interview communication, STAR structuring, metrics quantification, and technical trade-offs. Return strict JSON only."
            },
            {
              role: "user",
              content: `Generate exactly 4 challenging multiple-choice questions testing whether the candidate has mastered the following roadmap milestone:
Target Focus: "${focusTitle}"
Why It Matters: "${focusWhy}"
Curriculum Context: "${focusQuery}"
Candidate Past Errors: ${JSON.stringify(sessionContext)}

Return JSON:
{
  "questions": [
    {
      "question": "Realistic scenario or answer comparison question...",
      "options": [
        "A) Option text...",
        "B) Option text...",
        "C) Option text...",
        "D) Option text..."
      ],
      "answer": 1,
      "explanation": "Deep pedagogical rationale explaining why the correct choice delivers senior signal and why the others fail interview standards."
    }
  ]
}
Note: 'answer' must be the 0-based integer index of the correct option.`
            }
          ],
          maxOutputTokens: 1200,
          reasoningEffort: "low",
          purpose: "roadmap_mcq_generation"
        })
      });

      const data = await response.json();
      const parsed = parseJson(data.content || "");
      const generatedMcqs = normalizeMcqs(parsed?.questions);
      setMcqs(generatedMcqs.length >= 3 ? generatedMcqs : FALLBACK_MCQ);
    } catch (error) {
      console.warn("MCQ generation fallback used:", error instanceof Error ? error.name : "provider_error");
      setMcqs(FALLBACK_MCQ);
    } finally {
      setQuizLoading(false);
    }
  }

  const score = useMemo(
    () => mcqs.reduce((total, q, i) => total + (selected[i] === q.answer ? 1 : 0), 0),
    [mcqs, selected]
  );

  const passingScore = mcqs.length > 0 && score >= Math.ceil(mcqs.length * 0.7);

  const handleQuizSubmit = () => {
    setSubmitted(true);
    if (passingScore && activeQuizNode) {
      const updated = { ...completed, [activeQuizNode.id]: true };
      setCompleted(updated);
      try {
        localStorage.setItem(MASTERED_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const toggleNodeMastered = (nodeId: string) => {
    const updated = { ...completed, [nodeId]: !completed[nodeId] };
    setCompleted(updated);
    try {
      localStorage.setItem(MASTERED_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const topics = recommendedTopics({ gaps: p.gaps });

  return (
    <div className="mx-auto max-w-6xl space-y-10 font-sans pb-16" data-testid="plan-page">
      {/* 1. TOP HERO HEADER */}
      <Reveal>
        <div className="border-b-3 border-line pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-2.5 py-0.5 font-mono text-[11px] font-black text-ink uppercase tracking-wider shadow-[2px_2px_0_#111111]">
              <span className="h-2 w-2 bg-ink" />
              <span>PREPPILOT_ // ADAPTIVE IMPROVEMENT PLAN</span>
            </div>
            <h1 className="mt-2.5 font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-ink">
              TURN REJECTIONS INTO <span className="bg-[#C7FF2F] px-2 border-2 border-line">LEVERAGE.</span>
            </h1>
            <p className="mt-1 font-mono text-xs text-mut uppercase tracking-wider leading-relaxed max-w-2xl">
              AN INDIVIDUALIZED RECOVERY FLIGHT-PATH SYNTHESIZED FROM EVERY TURN YOU'VE TAKEN. AUDIT WHAT WENT WRONG, STUDY THE CURATED VIDEO MASTERY NODES, AND ASSESS RETENTION WITH AI MCQS.
            </p>
          </div>

          <div className="font-mono text-xs font-bold text-ink bg-white border-2 border-line px-3 py-2 shadow-[2px_2px_0_#111111] shrink-0">
            AUDITED ROUNDS: <span className="bg-[#C7FF2F] px-1.5 border border-line ml-1 font-black">{sessions.length}</span>
          </div>
        </div>
      </Reveal>

      {/* 2. READINESS SCOREBOARD */}
      <Reveal delay={0.04}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono" data-testid="plan-summary">
          {[
            ["READINESS INDEX", p.total > 0 ? `${p.index}/100` : "—", "CALIBRATED ACROSS TURNS"],
            ["SESSIONS AUDITED", sessions.length, isSeededDemo ? "BENCHMARK BASELINE" : "USER FLIGHT LOGS"],
            ["STAR COMPLETION RATE", p.total > 0 ? `${p.starRate}%` : "—", "4/4 BEATS DETECTED"],
            ["ACTIVE STREAK", `${p.streak || 0} DAYS`, "CONTINUOUS CADENCE"],
          ].map(([label, value, sub]) => (
            <div key={label as string} className="border-3 border-line bg-white p-4 sm:p-5 shadow-[4px_4px_0_#111111]">
              <p className="text-[10px] font-black uppercase tracking-wider text-mut">{label}</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-ink">{value}</p>
              <p className="mt-1 text-[9px] text-mut uppercase tracking-wide border-t border-line/40 pt-1">{sub}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ======================================================== */}
      {/* 3. PER-SESSION AUDIT: WHAT WENT WRONG (USER REQUIREMENT) */}
      {/* ======================================================== */}
      <Reveal delay={0.07}>
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-line pb-3">
            <div>
              <div className="inline-flex items-center gap-2 border border-line bg-[#FF5C35] px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase shadow-[2px_2px_0_#111111]">
                <AlertTriangle className="h-3 w-3" />
                <span>PER-SESSION DIAGNOSTIC LEDGER</span>
              </div>
              <h2 className="mt-1.5 font-mono text-2xl font-black uppercase tracking-tight text-ink">
                WHAT WENT WRONG IN YOUR SESSIONS.
              </h2>
              <p className="font-mono text-xs text-mut uppercase">
                GRANULAR BREAKDOWN OF THE SPECIFIC GAPS, CRITIQUES, AND DEFICITS FLAGGED IN EACH INTERVIEW RUN.
              </p>
            </div>

            {isSeededDemo && (
              <span className="font-mono text-[10px] font-bold text-mut border border-line bg-paper px-2.5 py-1 uppercase self-start sm:self-auto">
                ● SHOWING BASELINE DIAGNOSTIC AUDIT
              </span>
            )}
          </div>

          <div className="space-y-4">
            {sessions.map((session, sIdx) => {
              const deficits = extractSessionDeficits(session);
              const isExpanded = expandedSessionId === (session.id || `session_${sIdx}`);
              const dateStr = session.createdAt
                ? new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Recent Flight";

              return (
                <div
                  key={session.id || sIdx}
                  className="border-3 border-line bg-white shadow-[5px_5px_0_#111111] transition-all"
                >
                  {/* Session Header Card */}
                  <div className="p-5 border-b-2 border-line flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-paper/30">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="border-2 border-line bg-ink text-[#C7FF2F] px-2 py-0.5 font-black uppercase shadow-[1px_1px_0_#111111]">
                          SESSION #{sessions.length - sIdx}
                        </span>
                        <span className="border border-line bg-white px-2 py-0.5 font-bold uppercase text-ink">
                          {dateStr}
                        </span>
                        <span className="border border-line bg-white px-2 py-0.5 font-bold uppercase text-mut">
                          {session.difficulty || "Standard"}
                        </span>
                        <span className="border border-line bg-white px-2 py-0.5 font-bold uppercase text-mut">
                          {session.competency || "Technical Comm"}
                        </span>
                      </div>
                      <h3 className="font-mono text-lg font-black uppercase text-ink">
                        {session.questionText || "Practice Session Inquiry"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 self-end lg:self-auto">
                      <div className="text-right font-mono">
                        <span className="text-[10px] font-bold text-mut uppercase block">OVERALL SCORE</span>
                        <span
                          className={`text-xl font-black px-2 py-0.5 border-2 border-line inline-block shadow-[2px_2px_0_#111111] ${
                            session.overall < 70
                              ? "bg-[#FF5C35] text-white"
                              : session.overall < 80
                              ? "bg-[#C7FF2F] text-ink"
                              : "bg-[#127533] text-white"
                          }`}
                        >
                          {session.overall}/100
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedSessionId(isExpanded ? null : (session.id || `session_${sIdx}`))}
                        className="btn-ghost !px-3 !py-2 !text-xs font-mono font-bold uppercase cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>{isExpanded ? "HIDE DETAILS" : "AUDIT DEFICITS"}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Summary of What Went Wrong */}
                  <div className="p-5 space-y-3 font-mono">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-ink">
                      <span className="h-2 w-2 bg-[#FF5C35]" />
                      <span>IDENTIFIED DEFICITS & PERFORMANCE BOTTLENECKS:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {deficits.slice(0, 4).map((def, dIdx) => (
                        <div
                          key={dIdx}
                          className={`p-3.5 border-2 border-line ${
                            def.severity === "high" ? "bg-[#FF5C35]/10 border-l-4 border-l-[#FF5C35]" : "bg-paper border-l-4 border-l-[#C7FF2F]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-ink flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-[#FF5C35]" />
                              {def.title}
                            </span>
                            {def.metricValue && (
                              <span className="border border-line bg-white px-1.5 py-0.2 text-[9px] font-black text-ink uppercase">
                                {def.metricValue}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-sans text-xs text-ink leading-relaxed font-medium">
                            {def.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Expandable Turn Evidence */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t-2 border-line space-y-3 font-sans">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-black uppercase text-ink">[ TURN-BY-TURN VERBATIM AUDIT ]</span>
                          <span className="text-mut text-[11px] uppercase">5-Agent Diagnostic Feed</span>
                        </div>

                        {session.turns && session.turns.length > 0 ? (
                          session.turns.map((turn: any, tIdx: number) => (
                            <div key={tIdx} className="border-2 border-line bg-paper p-4 font-mono text-xs space-y-2">
                              <div className="flex justify-between font-black text-ink">
                                <span>TURN 0{tIdx + 1} PROBE:</span>
                                <span className="text-[#127533]">SCORE {turn.result?.overall || 65}%</span>
                              </div>
                              <p className="font-serif italic text-ink font-semibold">
                                "{turn.question?.text || turn.questionText || "Question text"}"
                              </p>
                              <div className="p-2.5 bg-white border border-line text-ink2 font-sans text-xs">
                                <strong>CANDIDATE ANSWER SNIPPET:</strong> {turn.answer?.slice(0, 180)}...
                              </div>
                              {turn.result?.improvements && (
                                <div className="border-l-3 border-[#FF5C35] pl-2.5 text-[11px] text-ink font-sans space-y-1">
                                  <strong>WHERE THIS ANSWER FAILED:</strong>
                                  <ul className="list-disc list-inside text-mut">
                                    {turn.result.improvements.map((imp: string, iIdx: number) => (
                                      <li key={iIdx}>{imp}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-line bg-paper font-mono text-xs text-mut">
                            Session recorded aggregated metrics. Individual turns are archived in the session transcript view.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* ======================================================== */}
      {/* 4. TAILORED ROADMAP SYNTHESIZED FROM GAPS + YOUTUBE LINKS*/}
      {/* ======================================================== */}
      <Reveal delay={0.09}>
        <section data-testid="personalized-roadmap" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-line pb-4">
            <div>
              <div className="inline-flex items-center gap-2 border border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[10px] font-black text-ink uppercase shadow-[2px_2px_0_#111111]">
                <Target className="h-3 w-3" />
                <span>{roadmapSource}</span>
              </div>
              <h2 className="mt-1.5 font-mono text-2xl font-black uppercase tracking-tight text-ink">
                YOUR TAILORED RECOVERY ROADMAP.
              </h2>
              <p className="font-mono text-xs text-mut uppercase">
                TARGETED PHASES DESIGNED TO CLOSE THE EXACT BOTTLENECKS FROM YOUR SESSION AUDIT ABOVE.
              </p>
            </div>

            <button
              className="btn-ghost !px-3.5 !py-2 !text-xs font-mono font-bold uppercase cursor-pointer inline-flex items-center gap-2"
              onClick={() => {
                setLoadingRoadmap(true);
                void generateRoadmap(sessions, p).finally(() => setLoadingRoadmap(false));
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRoadmap ? "animate-spin" : ""}`} />
              <span>RE-SYNTHESIZE WITH AGENT</span>
            </button>
          </div>

          <div className="space-y-5">
            {roadmap.map((node, i) => (
              <article
                key={node.id}
                className={`border-3 border-line p-6 shadow-[6px_6px_0_#111111] transition-all ${
                  completed[node.id] ? "bg-[#EBFBEF]" : "bg-white"
                }`}
                data-testid={`roadmap-node-${i + 1}`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                  {/* Step Badge */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="flex h-12 w-12 items-center justify-center border-3 border-line bg-[#C7FF2F] font-mono text-lg font-black text-ink shadow-[3px_3px_0_#111111]">
                      0{i + 1}
                    </span>
                    <span className="font-mono text-[9px] font-black uppercase text-mut mt-1">STEP</span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3 font-mono">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-ink bg-paper px-2 py-0.5 border border-line">
                          {node.week}
                        </span>
                        {node.groundedIn && (
                          <span className="text-[10px] font-bold uppercase text-[#FF5C35] flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {node.groundedIn}
                          </span>
                        )}
                      </div>

                      {completed[node.id] && (
                        <span className="border-2 border-line bg-[#127533] text-white px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 shadow-[2px_2px_0_#111111]">
                          <Check className="h-3 w-3" /> PROFICIENCY CONFIRMED
                        </span>
                      )}
                    </div>

                    {/* Title & Why */}
                    <div>
                      <h3 className="font-mono text-xl font-black uppercase text-ink">
                        {node.title}
                      </h3>
                      {node.mistake && (
                        <div className="mt-2 border-l-4 border-[#FF5C35] bg-[#FFF1ED] p-3 font-sans text-sm leading-relaxed text-ink">
                          <span className="font-mono text-[10px] font-black uppercase text-[#FF5C35] block">WHAT YOU DID WRONG</span>
                          <p className="mt-1 font-semibold">{node.mistake}</p>
                        </div>
                      )}
                      <p className="mt-1 font-sans text-sm text-ink2 leading-relaxed">
                        {node.why}
                      </p>
                    </div>

                    {/* Action Card */}
                    <div className="border-l-4 border-[#127533] bg-paper p-4 font-sans space-y-1">
                      <span className="font-mono text-[10px] font-black uppercase text-mut block">
                        [ TACTICAL DRILL TO EXECUTE ]
                      </span>
                      <p className="text-sm font-semibold text-ink leading-relaxed">
                        {node.action}
                      </p>
                    </div>

                    {/* Bottom Action Bar: YouTube Link + AI Assessment */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Target Benchmark Chip */}
                        <span className="border border-line bg-[#C7FF2F] px-2.5 py-1 text-[10px] font-black uppercase text-ink">
                          BENCHMARK: {node.metric}
                        </span>

                        {/* YouTube Learning Link */}
                        <a
                          href={youtubeUrl(node)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 border-2 border-line bg-[#FF0033] px-3.5 py-1.5 font-mono text-[11px] font-black text-white shadow-[3px_3px_0_#111111] hover:bg-[#CC002B] hover:translate-x-0.5 transition-all cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>STUDY ON YOUTUBE · MASTERCLASS</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Interactive MCQ Assessment Trigger */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startAssessment(node)}
                          className="border-2 border-line bg-ink text-[#C7FF2F] px-3.5 py-1.5 font-mono text-[11px] font-black uppercase shadow-[3px_3px_0_#111111] hover:bg-coal2 transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>ASSESS MASTERY (AI MCQ)</span>
                        </button>

                        <button
                          onClick={() => toggleNodeMastered(node.id)}
                          className="btn-ghost !px-3 !py-1.5 !text-[10px] font-mono font-bold uppercase"
                        >
                          {completed[node.id] ? "MARK TODO" : "MARK MASTERED"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ======================================================== */}
      {/* 5. INTERACTIVE SELF-ASSESSMENT CONSOLE (LLM GENERATED MCQ)*/}
      {/* ======================================================== */}
      <Reveal delay={0.11}>
        <section className="border-3 border-line bg-ink p-6 sm:p-8 shadow-[7px_7px_0_#C7FF2F]" data-testid="self-assessment">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-paper/20 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-[#C7FF2F]">
                <Trophy className="h-4 w-4" />
                <span>INTERACTIVE READINESS EVALUATOR</span>
              </div>
              <h2 className="mt-2 font-mono text-2xl sm:text-3xl font-black uppercase text-paper tracking-tight">
                FEEL READY? PROVE IT TO THE AGENT.
              </h2>
              <p className="mt-1 max-w-2xl font-mono text-xs leading-relaxed text-paper/70 uppercase">
                {activeQuizNode
                  ? `TESTING MILESTONE: "${activeQuizNode.title}" — VERIFY MASTERY WITH AI-GENERATED SCENARIO QUESTIONS.`
                  : "THE COACH AGENT TRANSFORMS YOUR HISTORICAL DEFICITS INTO REALISTIC MCQ PROBES. EVALUATE YOUR UNDERSTANDING BEFORE THE NEXT LIVE INTERVIEW."}
              </p>
            </div>

            <button
              onClick={() => startAssessment(activeQuizNode || undefined)}
              disabled={quizLoading}
              className="btn-terra shrink-0 !text-xs font-mono font-black uppercase cursor-pointer inline-flex items-center gap-2 shadow-[3px_3px_0_#000]"
            >
              <Play className="h-4 w-4" />
              <span>{quizOpen ? "REGENERATE FRESH MCQS" : "LAUNCH SELF-ASSESSMENT"}</span>
            </button>
          </div>

          {quizOpen && (
            <div className="mt-6 border-2 border-line bg-paper p-6 text-ink shadow-[4px_4px_0_#000]">
              {quizLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 font-mono text-center">
                  <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-3 py-1 text-xs font-black uppercase text-ink shadow-[2px_2px_0_#111111] animate-pulse">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>COACH AGENT IS SYNTHESIZING MCQ SET...</span>
                  </div>
                  <p className="text-xs text-mut uppercase">
                    Grounding questions in candidate deficits · Formulating trade-off options
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quiz Status Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-line pb-4 font-mono">
                    <div>
                      <span className="text-[10px] font-black uppercase text-mut block">
                        EVALUATION DECK · {activeQuizNode ? activeQuizNode.week : "CROSS-CURRICULUM"}
                      </span>
                      <h3 className="text-lg font-black uppercase text-ink">
                        {activeQuizNode ? activeQuizNode.title : "VERIFY RETENTION OF REMEDIATED GAPS"}
                      </h3>
                    </div>

                    {submitted && (
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 font-mono text-xs font-black uppercase border-2 border-line shadow-[2px_2px_0_#111111] ${
                            passingScore ? "bg-[#127533] text-white" : "bg-[#FF5C35] text-white"
                          }`}
                        >
                          SCORE: {score}/{mcqs.length} ({Math.round((score / mcqs.length) * 100)}%)
                        </span>
                        {passingScore && (
                          <span className="chip chip-green font-mono text-xs font-black">
                            ✓ NODE MASTERED
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Question Cards */}
                  <div className="space-y-6">
                    {mcqs.map((q, qIdx) => {
                      const isChosen = selected[qIdx] !== undefined;
                      const userChoice = selected[qIdx];
                      const isCorrect = userChoice === q.answer;

                      return (
                        <div
                          key={qIdx}
                          className="border-2 border-line bg-white p-5 shadow-[4px_4px_0_#111111] font-mono space-y-4"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-line/40 pb-2">
                            <span className="text-xs font-black text-ink uppercase">
                              QUESTION 0{qIdx + 1} OF 0{mcqs.length}
                            </span>
                            {submitted && (
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 border ${
                                  isCorrect ? "bg-[#127533] text-white border-line" : "bg-[#FF5C35] text-white border-line"
                                }`}
                              >
                                {isCorrect ? "CORRECT" : "REVISE"}
                              </span>
                            )}
                          </div>

                          <p className="font-sans text-sm font-bold text-ink leading-relaxed">
                            {q.question}
                          </p>

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {q.options.map((optText, optIdx) => {
                              const isSelectedOpt = selected[qIdx] === optIdx;
                              let btnStyle = "bg-paper text-ink hover:bg-[#E2F8E7]";
                              if (isSelectedOpt) {
                                btnStyle = "bg-[#C7FF2F] text-ink font-black shadow-[2px_2px_0_#111111]";
                              }
                              if (submitted) {
                                if (optIdx === q.answer) {
                                  btnStyle = "!bg-[#127533] !text-white font-black";
                                } else if (isSelectedOpt && optIdx !== q.answer) {
                                  btnStyle = "!bg-[#FF5C35] !text-white line-through";
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={submitted}
                                  onClick={() => setSelected((prev) => ({ ...prev, [qIdx]: optIdx }))}
                                  className={`p-3.5 border-2 border-line text-left text-xs font-mono transition-all cursor-pointer flex items-start gap-2.5 ${btnStyle}`}
                                >
                                  <span className="font-black shrink-0">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span className="font-sans font-medium leading-relaxed">
                                    {optText}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          {submitted && (
                            <div className="border-l-4 border-[#127533] bg-[#E2F8E7] p-3.5 font-sans text-xs text-ink leading-relaxed space-y-1">
                              <span className="font-mono text-[10px] font-black uppercase text-[#127533] block">
                                [ EXPERT INTERVIEW RATIONALE ]
                              </span>
                              <p>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Reset Actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4 font-mono">
                    {!submitted ? (
                      <button
                        onClick={handleQuizSubmit}
                        disabled={Object.keys(selected).length < mcqs.length}
                        className="btn-dark !px-6 !py-3 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-[3px_3px_0_#111111] inline-flex items-center gap-2"
                      >
                        <span>SUBMIT ASSESSMENT</span>
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          onClick={() => {
                            setSelected({});
                            setSubmitted(false);
                          }}
                          className="btn-ghost !px-4 !py-2 text-xs font-bold uppercase cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>RETAKE THIS SET</span>
                        </button>
                        <button
                          onClick={() => startAssessment(activeQuizNode || undefined)}
                          className="btn-terra !px-4 !py-2 text-xs font-bold uppercase cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>GENERATE DIFFERENT QUESTIONS</span>
                        </button>
                      </div>
                    )}

                    {submitted && (
                      <p className="text-xs font-black uppercase text-ink">
                        {passingScore
                          ? "🎉 PROFICIENCY CONFIRMED: MILESTONE MARKED AS MASTERED."
                          : "⚠️ REVIEW THE EXPLANATIONS ABOVE AND RETAKE TO LOCK IN RETENTION."}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </Reveal>

      {/* 6. CURATED RESOURCES ARCHIVE */}
      <Reveal delay={0.13}>
        <section data-testid="plan-resources" className="space-y-4">
          <div className="border-b-2 border-line pb-4">
            <div className="inline-flex items-center gap-2 border border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink uppercase">
              <span>PREP ARCHIVE</span>
              <span>//</span>
              <span>CURATED INTEL</span>
            </div>
            <h2 className="mt-2 font-mono text-2xl font-black uppercase tracking-tight text-ink">
              RESOURCES FOR IDENTIFIED GAPS.
            </h2>
            <p className="mt-1 font-mono text-xs text-mut uppercase">
              DOCUMENTATION, CHEATSHEETS, AND DEEP-DIVES MATCHED TO YOUR HIGHEST-FREQUENCY DEFICITS.
            </p>
          </div>
          <ResourceList topics={topics} testPrefix="plan-resources" />
        </section>
      </Reveal>

      {/* 7. BOTTOM CALL TO ACTION */}
      <Reveal delay={0.15}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-3 border-line bg-white p-6 sm:p-7 shadow-[6px_6px_0_#111111]">
          <div>
            <span className="font-mono text-[10px] font-black uppercase text-mut block">
              OPERATIONAL NEXT MOVE
            </span>
            <p className="mt-1 font-mono text-xl sm:text-2xl font-black uppercase text-ink">
              PUT THIS RECOVERY ROADMAP UNDER LIVE PRESSURE.
            </p>
            <p className="font-sans text-xs text-mut mt-0.5">
              Launch a practice session to apply your remediated STAR structure and quantified benchmarks.
            </p>
          </div>
          <Link
            to="/app/practice"
            data-testid="plan-practice-cta"
            className="btn-terra shrink-0 !px-6 !py-3.5 !text-xs font-mono font-bold uppercase cursor-pointer shadow-[3px_3px_0_#111111] inline-flex items-center gap-2"
          >
            <span>LAUNCH PRACTICE SESSION</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

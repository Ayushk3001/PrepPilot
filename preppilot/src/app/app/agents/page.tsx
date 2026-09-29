'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mic, FileText, Layers, Sparkles, Play, Loader2, ChevronDown, GitBranch, CheckCircle2, ShieldCheck, BarChart3, Database, ArrowRight } from "lucide-react";
import { AGENTS } from "@/lib/mockData";
import { runEvaluation } from "@/lib/coachEngine";
import AgentStepper from "@/components/AgentStepper";
import { Reveal } from "@/components/ui-bits";
import { BENCHMARK_TEST_CASES } from "@/data/benchmarkDataset";

const ICONS: Record<string, any> = { question: HelpCircle, comm: Mic, content: FileText, star: Layers, coach: Sparkles };

const AGENT_SCHEMAS: Record<string, {
  purpose: string;
  inputSchema: string;
  outputSchema: string;
  tools: string[];
}> = {
  question: {
    purpose: "Analyzes candidate profile, target role, and past questions to select or generate a tailored question with rubrics.",
    inputSchema: `{
  "candidateProfile": { "name": string, "skills": string[], "projects": string[] },
  "targetRole": "swe" | "sse" | "em" | "pm" | "da" | "cs",
  "competency": "behavioral" | "tech-comm" | "problem" | "leadership",
  "difficulty": "Warm-up" | "Standard" | "Senior"
}`,
    outputSchema: `{
  "question": { "id": string, "question": string, "durationSec": number },
  "expectedCompetency": string,
  "evaluationCriteria": string[],
  "metadata": { "tailoredToProfile": boolean, "matchingSignals": string[] }
}`,
    tools: ["RecruitView Dataset Indexer", "Profile Alignment Scorer", "Previous Question Deduplicator"]
  },
  comm: {
    purpose: "Performs acoustic and linguistic diagnostics on speech clarity, filler crutches, hedging, and pacing.",
    inputSchema: `{
  "candidateResponse": string,
  "mode": "voice" | "text",
  "wpm": number | null
}`,
    outputSchema: `{
  "clarity": number, // 0-100
  "conciseness": number, // 0-100
  "communication_quality": number, // 0-100
  "filler_words": number,
  "hedging": number,
  "tone": string,
  "evidence": Array<{ "type": string, "text": string, "critique": string }>
}`,
    tools: ["Acoustic WPM Telemetry", "Regex Filler Extractor", "Hedging Pattern Detector", "Sentence Cadence Analyzer"]
  },
  content: {
    purpose: "Verifies technical depth, relevance to the exact prompt, domain rigor, and quantitative claim verification.",
    inputSchema: `{
  "question": StructuredQuestion,
  "candidateResponse": string,
  "candidateProfile": CandidateProfile
}`,
    outputSchema: `{
  "relevance": number, // 0-100
  "completeness": number, // 0-100
  "competency_match": number, // 0-100
  "answered_prompt": boolean,
  "metrics_cited": string[],
  "evidence": Array<{ "claim": string, "verified": boolean, "detail": string }>
}`,
    tools: ["Prompt Keyword Overlap Matrix", "Numerical Metric Verifier", "Rubric Checklist Comparator"]
  },
  star: {
    purpose: "Deconstructs the narrative into Situation, Task, Action, and Result components with verbatim quoted evidence.",
    inputSchema: `{
  "candidateResponse": string,
  "expectSTAR": boolean
}`,
    outputSchema: `{
  "structure_score": number, // 0-100
  "starFilled": number, // 0-4
  "situation": { "status": "strong" | "detected" | "weak" | "missing", "evidence": string },
  "task": { "status": "strong" | "detected" | "weak" | "missing", "evidence": string },
  "action": { "status": "strong" | "detected" | "weak" | "missing", "evidence": string },
  "result": { "status": "strong" | "detected" | "weak" | "missing", "evidence": string }
}`,
    tools: ["STAR Sentence Classifier", "Verbatim Span Extractor", "Signposting Connector Detector"]
  },
  coach: {
    purpose: "Consolidates specialist findings into a cohesive score, model answer rewrite, and adaptive follow-ups.",
    inputSchema: `{
  "questionOutput": QuestionAgentOutput,
  "commOutput": CommunicationAgentOutput,
  "contentOutput": ContentAgentOutput,
  "starOutput": StarAgentOutput
}`,
    outputSchema: `{
  "overallScore": number, // 0-100
  "verdict": string,
  "dimensionScores": { "relevance": number, "clarity": number, "structure": number, "completeness": number, "communication": number },
  "improvedAnswer": string,
  "followUpQuestions": string[]
}`,
    tools: ["Holistic Rubric Synthesizer", "Response-Dependent Follow-Up Generator", "Model Answer Rewrite Engine"]
  }
};

const SAMPLE = {
  question: {
    id: "swe-beh-01",
    question: "Describe a challenging situation where you had a strong technical disagreement with a team member or architect. How did you resolve it?",
    role: "sse",
    competency: "behavioral",
    difficulty: "Standard",
    type: "Behavioral",
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["State architectural dispute", "Empirical benchmark data", "Quantified production outcome"]
  },
  answer:
    "When I joined, our order pipeline was dropping 2% of payments at peak. A senior architect favored maintaining legacy polling, but I proposed Server-Sent Events. To resolve the disagreement with data rather than opinions, I built a 2-day proof of concept benchmark measuring socket throughput under 10k connections. The benchmark showed SSE reduced server CPU by 58%. I scheduled a review, presented the data, and addressed his reconnect concerns. We shipped on schedule and eliminated $1,200/month in idle cloud costs.",
  mode: "text",
};

export default function AgentsExplorer() {
  const [open, setOpen] = useState<string | null>("coach");
  const [stages, setStages] = useState<any>({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'topology' | 'benchmark'>('topology');

  // Benchmark state
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResults, setBenchResults] = useState<any[]>([]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setStages({});
    setLog([]);
    const res = await runEvaluation(SAMPLE, (id: string, status: string, out: any) => {
      setStages((s: any) => ({ ...s, [id]: { status, out } }));
    });
    if (res && res.a2aMessages) {
      setLog(res.a2aMessages);
    }
    setRunning(false);
  };

  const runBenchmark = async () => {
    if (benchRunning) return;
    setBenchRunning(true);
    const results: any[] = [];
    try {
      for (const testCase of BENCHMARK_TEST_CASES) {
        const response = await fetch('/api/benchmark/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseId: testCase.id }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Benchmark request failed');
        results.push(payload.results[0]);
        setBenchResults([...results]);
      }
    } finally {
      setBenchRunning(false);
    }
  };

  return (
    <div className="space-y-10" data-testid="agents-explorer-page">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-line pb-6">
          <div>
            <div className="inline-flex items-center gap-2 border border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[11px] font-black text-ink uppercase tracking-wider">
              <span>[05] AGENT ARCHITECTURE</span>
              <span>//</span>
              <span>TOPOLOGY & BENCHMARK</span>
            </div>
            <h1 className="mt-3 font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-ink">
              INSIDE THE PIPELINE.
            </h1>
            <p className="mt-1 font-mono text-xs text-mut uppercase tracking-wider">
              5 SPECIALIST AGENTS · STRICT CONTRACT VALIDATION · DETERMINISTIC HEURISTICS
            </p>
          </div>

          <div className="flex border-2 border-line bg-white shadow-[3px_3px_0_#111111] font-mono">
            <button
              onClick={() => setActiveTab('topology')}
              className={`px-4 py-2 text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'topology' ? 'bg-[#C7FF2F] text-ink font-black' : 'text-ink2 hover:bg-paper'
              }`}
            >
              A2A TOPOLOGY & DEBUGGER
            </button>
            <div className="w-[2px] bg-line" />
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-4 py-2 text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'benchmark' ? 'bg-[#C7FF2F] text-ink font-black' : 'text-ink2 hover:bg-paper'
              }`}
            >
              BENCHMARK SUITE
            </button>
          </div>
        </div>
      </Reveal>

      {activeTab === 'topology' ? (
        <>
          <Reveal delay={0.05}>
            <div className="border-3 border-line bg-white p-7 shadow-[5px_5px_0_#111111]" data-testid="a2a-topology">
              <div className="flex items-center justify-between border-b-2 border-line pb-4 mb-6">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    [ A2A TOPOLOGY · ASYNC HANDOFF SEQUENCE ]
                  </p>
                  <p className="font-mono text-[11px] text-mut mt-0.5">
                    PARALLEL EVALUATION OF 3 SPECIALISTS CONVERGING INTO COACH AGENT
                  </p>
                </div>
                <span className="chip !border-line !bg-[#C7FF2F] !text-ink font-mono !text-[10px] font-bold">
                  <ShieldCheck className="h-3 w-3 mr-1" /> CONTRACTS ACTIVE
                </span>
              </div>

              <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
                {[
                  { id: "candidate", label: "CANDIDATE", sub: "RESPONSE + PROFILE", node: false },
                  ...AGENTS.map((a) => ({ id: a.id, label: a.short.toUpperCase(), sub: a.tag.toUpperCase(), node: true })),
                  { id: "out", label: "FEEDBACK", sub: "VERDICT + PLAN", node: false },
                ].map((n, i, arr) => (
                  <div key={n.id} className="flex flex-1 items-center gap-3 md:flex-col md:gap-0">
                    <div
                      className={`flex-1 md:w-full border-2 p-3 text-center transition-all ${
                        n.node
                          ? "border-line bg-paper shadow-[2px_2px_0_#111111]"
                          : "border-dashed border-line bg-white"
                      }`}
                      data-testid={`topology-node-${n.id}`}
                    >
                      <p className={`font-mono text-xs font-black uppercase ${n.node ? "text-ink" : "text-mut"}`}>{n.label}</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-mut font-bold">{n.sub}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="hidden h-0.5 w-4 shrink-0 bg-line md:block" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-start gap-3 border-2 border-line bg-paper p-4 font-mono">
                <GitBranch className="h-4 w-4 shrink-0 text-[#127533] mt-0.5 stroke-[2.5]" />
                <p className="text-xs leading-relaxed text-ink font-medium">
                  <strong>QUESTION AGENT</strong> injects grounded rubrics. <strong>COMMUNICATION</strong>, <strong>CONTENT</strong>, and <strong>STAR</strong> agents evaluate the candidate response in parallel; the <strong>COACH AGENT</strong> synthesizes all telemetry into actionable directives and model rewrites.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Agent Inspector */}
              <div className="space-y-3 lg:col-span-5" data-testid="agent-inspector-list">
                <div className="border-b-2 border-line pb-2 mb-2">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    [ SPECIALIST AGENT INSPECTOR ({AGENTS.length} ENGINES) ]
                  </p>
                </div>
                {AGENTS.map((a) => {
                  const Icon = ICONS[a.id] || HelpCircle;
                  const isOpen = open === a.id;
                  const schema = AGENT_SCHEMAS[a.id];
                  return (
                    <div
                      key={a.id}
                      className={`border-2 border-line bg-white transition-all shadow-[3px_3px_0_#111111] ${
                        isOpen ? "bg-paper/40" : ""
                      }`}
                      data-testid={`inspector-${a.id}`}
                    >
                      <button
                        onClick={() => setOpen(isOpen ? null : a.id)}
                        className="flex w-full items-center gap-4 p-4 text-left cursor-pointer"
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center border border-line ${isOpen ? "bg-[#C7FF2F] text-ink" : "bg-paper text-ink"}`}>
                          <Icon className="h-4 w-4 stroke-[2.5]" />
                        </span>
                        <span className="min-w-0 flex-1 font-mono">
                          <span className="block truncate text-xs font-black uppercase text-ink">{a.name}</span>
                          <span className="text-[9px] uppercase tracking-wider text-mut font-bold">{a.tag}</span>
                        </span>
                        <ChevronDown className={`h-4 w-4 text-ink transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t-2 border-line bg-white font-mono"
                          >
                            <div className="p-4 space-y-4">
                              <p className="text-xs font-sans font-medium text-ink2 leading-relaxed">{schema?.purpose || a.desc}</p>

                              {schema?.tools && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-mut mb-1.5 font-bold">
                                    [ TOOLS & HEURISTICS ]
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {schema.tools.map(t => (
                                      <span key={t} className="border border-line bg-paper px-2 py-0.5 text-[10px] font-bold text-ink uppercase">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-mut mb-1 font-bold">[ INPUT SCHEMA ]</p>
                                <pre className="p-3 bg-ink text-[#C7FF2F] border border-line text-[10px] overflow-x-auto leading-relaxed">{schema?.inputSchema}</pre>
                              </div>

                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-mut mb-1 font-bold">[ OUTPUT SCHEMA ]</p>
                                <pre className="p-3 bg-ink text-[#C7FF2F] border border-line text-[10px] overflow-x-auto leading-relaxed">{schema?.outputSchema}</pre>
                              </div>

                              <div className="border-2 border-line bg-paper p-3">
                                <p className="text-[10px] uppercase tracking-wider text-ink font-bold mb-1.5">[ SYSTEM PROMPT ]</p>
                                <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-ink2">{a.prompt}</pre>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Pipeline Debugger */}
              <div className="lg:col-span-7">
                <div className="border-3 border-line bg-white p-6 shadow-[5px_5px_0_#111111] sticky top-24" data-testid="pipeline-debugger">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-line pb-4">
                    <div>
                      <h2 className="font-mono text-lg font-black uppercase text-ink">LIVE PIPELINE DEBUGGER</h2>
                      <p className="font-mono text-xs text-mut uppercase">EXECUTE SAMPLE RESPONSE THROUGH ALL 5 SPECIALIST AGENTS</p>
                    </div>
                    <button
                      onClick={run}
                      disabled={running}
                      data-testid="debugger-run-btn"
                      className="btn-terra !px-4 !py-2 !text-xs font-mono font-bold uppercase disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                      {running ? "RUNNING PIPELINE..." : "RUN SAMPLE →"}
                    </button>
                  </div>

                  <div className="mt-5 border-2 border-line bg-paper p-4">
                    <AgentStepper dark stages={stages} agents={AGENTS} testPrefix="debugger" />
                  </div>

                  <div className="mt-5 font-mono">
                    <div className="flex items-center justify-between mb-2 border-b border-line pb-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink">
                        [ A2A MESSAGE STREAM ({log.length}) ]
                      </p>
                      {log.length > 0 && (
                        <span className="text-[10px] text-[#127533] flex items-center gap-1 font-bold bg-[#C7FF2F] px-1.5 border border-line">
                          <CheckCircle2 className="h-3 w-3" /> ALL CONTRACTS SATISFIED
                        </span>
                      )}
                    </div>
                    {log.length > 0 ? (
                      <div className="max-h-80 space-y-2 overflow-y-auto border-2 border-line bg-ink p-4 text-[10px] leading-relaxed" data-testid="a2a-message-log">
                        <AnimatePresence>
                          {log.map((m, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="p-2.5 border border-white/20 bg-white/5">
                              <div className="flex items-center justify-between text-[#C7FF2F] text-[9px] font-bold mb-1 border-b border-white/10 pb-1">
                                <span>{m.from} → {m.to}</span>
                                <span className="text-paper/60">{m.latencyMs ? `${m.latencyMs}ms` : 'instant'}</span>
                              </div>
                              <pre className="text-paper/90 whitespace-pre-wrap overflow-x-auto text-[9px] font-mono leading-relaxed">{JSON.stringify(m.payload, null, 2)}</pre>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-line bg-paper text-xs font-mono text-mut uppercase">
                        CLICK "RUN SAMPLE →" TO DISPATCH EXECUTION PIPELINE AND LOG OBSERVED A2A MESSAGES.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </>
      ) : (
        /* Evaluation & Benchmark Suite Tab */
        <Reveal delay={0.05}>
          <div className="border-3 border-line bg-white p-7 space-y-6 shadow-[5px_5px_0_#111111]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-line pb-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  [ LLM-AS-A-JUDGE EVALUATION SUITE ]
                </p>
                <h2 className="font-mono text-2xl font-black uppercase text-ink mt-1">
                  COACHING RUBRIC & EVIDENCE BENCHMARK
                </h2>
                <p className="font-mono text-xs text-mut uppercase mt-1">
                  EMPIRICAL HARNESS MEASURING RELEVANCE, ANALYSIS QUALITY, AND EVIDENCE GROUNDEDNESS
                </p>
              </div>
              <button
                onClick={runBenchmark}
                disabled={benchRunning}
                className="btn-terra !px-6 !py-3 !text-xs font-mono font-bold uppercase disabled:opacity-50 cursor-pointer shrink-0"
              >
                {benchRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                {benchRunning ? "RUNNING 5 TEST CASES..." : "RUN BENCHMARK SUITE →"}
              </button>
            </div>

            {benchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 border-2 border-line bg-paper font-mono">
                <div className="border border-line bg-white p-3 shadow-[2px_2px_0_#111111]">
                  <p className="text-[10px] uppercase tracking-wider text-mut font-bold">AVG RELEVANCE</p>
                  <p className="text-2xl font-black text-ink mt-1">
                    {Math.round(benchResults.reduce((a, b) => a + b.questionRelevanceScore, 0) / benchResults.length)}%
                  </p>
                </div>
                <div className="border border-line bg-white p-3 shadow-[2px_2px_0_#111111]">
                  <p className="text-[10px] uppercase tracking-wider text-mut font-bold">EVIDENCE GROUNDEDNESS</p>
                  <p className="text-2xl font-black text-[#127533] mt-1">
                    {Math.round(benchResults.reduce((a, b) => a + b.evidenceGroundednessScore, 0) / benchResults.length)}%
                  </p>
                </div>
                <div className="border border-line bg-white p-3 shadow-[2px_2px_0_#111111]">
                  <p className="text-[10px] uppercase tracking-wider text-mut font-bold">CONSISTENCY</p>
                  <p className="text-2xl font-black text-ink mt-1">
                    {Math.round(benchResults.reduce((a, b) => a + b.feedbackConsistencyScore, 0) / benchResults.length)}%
                  </p>
                </div>
                <div className="border border-line bg-white p-3 shadow-[2px_2px_0_#111111]">
                  <p className="text-[10px] uppercase tracking-wider text-mut font-bold">SUGGESTION UTILITY</p>
                  <p className="text-2xl font-black text-ink mt-1">
                    {Math.round(benchResults.reduce((a, b) => a + b.suggestionUsefulnessScore, 0) / benchResults.length)}%
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-1.5">
                [ STANDARDIZED BENCHMARK CASES ({BENCHMARK_TEST_CASES.length}) ]
              </p>
              {BENCHMARK_TEST_CASES.map((tc, idx) => {
                const res = benchResults.find(b => b.testCaseId === tc.id);
                return (
                  <div key={tc.id} className="p-5 border-2 border-line bg-white space-y-3 shadow-[3px_3px_0_#111111]">
                    <div className="flex items-start justify-between gap-4 border-b border-line pb-2">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-mut font-bold block">
                          CASE 0{idx + 1}
                        </span>
                        <h4 className="font-mono text-sm font-black uppercase text-ink mt-0.5">{tc.title}</h4>
                      </div>
                      {res ? (
                        <div className="flex gap-2 font-mono">
                          <span className="border border-line bg-[#C7FF2F] px-2 py-0.5 text-[10px] font-black uppercase text-ink">
                            GROUNDED: {res.evidenceGroundednessScore}%
                          </span>
                          <span className="border border-line bg-paper px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                            QUALITY: {res.responseAnalysisQuality}%
                          </span>
                        </div>
                      ) : (
                        <span className="border border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-mut">
                          PENDING RUN
                        </span>
                      )}
                    </div>

                    <div className="p-3 border-l-4 border-line bg-paper text-xs italic font-sans text-ink2 leading-relaxed">
                      "{tc.candidateResponse}"
                    </div>

                    <p className="font-mono text-[11px] text-mut uppercase">
                      <strong className="text-ink">EXPECTED DEFICIENCY:</strong> {tc.expectedDeficiency}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}

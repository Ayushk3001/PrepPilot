// @ts-nocheck
'use client';

import { useState } from "react";
import { Link } from "@/lib/routerCompat";
import { motion } from "framer-motion";
import { ArrowRight, RotateCcw, Check, Loader2, Terminal, Sparkles } from "lucide-react";
import { AGENTS } from "@/lib/mockData";
import { runEvaluation } from "@/lib/coachEngine";
import { ScoreBar } from "@/components/ui-bits";
import AgentStepper from "@/components/AgentStepper";

const SAMPLE_Q = {
  id: "demo",
  text: "Describe a challenging project you worked on. What made it hard, and what was the outcome?",
  durationSec: 180,
  expectSTAR: true,
  modelPoints: ["Frame the situation", "Your specific actions", "Quantified result"]
};

const WEAK_A = "So basically we had this project that was really hard because of the deadline, and I think we had to kind of figure out a lot of things. I worked with the team on it and after some back and forth we improved the numbers over time and it went pretty well in the end, I guess. Everyone was happy with how it turned out.";

const STRONG_A = "Situation: At Apex Cloud, our checkout service latency spiked past 2.4s during peak traffic. Task: As lead engineer, I was responsible for cutting latency without scheduled maintenance. Action: I redesigned the caching layer using Redis clusters with active connection pooling and implemented asynchronous Kafka event publishing. Result: We shrank p99 response time by 72% down to 380ms and eliminated transaction timeouts for 250,000 daily users.";

export default function PracticeDemo() {
  const [answer, setAnswer] = useState(WEAK_A);
  const [stages, setStages] = useState<any>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setStages({});
    const r = await runEvaluation(
      { question: SAMPLE_Q, answer, mode: "text" },
      (id: string, status: string, out: any) => setStages((s: any) => ({ ...s, [id]: { status, out } }))
    );
    setResult(r);
    setRunning(false);
  };

  return (
    <section id="practice-demo" className="border-t-3 border-line bg-coal py-20 text-paper sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-coaline bg-coal2 px-3 py-1 font-mono text-xs font-bold uppercase text-[#C7FF2F]">
              <Terminal className="h-3.5 w-3.5" />
              [ LIVE PIPELINE TERMINAL ]
            </div>
            <h2 className="mt-4 max-w-xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-paper">
              GRADE AN ANSWER <span className="bg-[#C7FF2F] text-ink px-2 py-0.5 border-2 border-line inline-block">LIVE IN BROWSER</span>.
            </h2>
          </div>
          <p className="max-w-md font-sans text-xs sm:text-sm leading-relaxed text-paper/70 font-medium">
            This is the complete 5-agent evaluation pipeline executing directly in your browser. Switch presets or type your own response, trigger the run, and watch the agents dissect your delivery.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Input Sandbox */}
          <div className="lg:col-span-5">
            <div className="border-3 border-line bg-coal2 p-6 sm:p-7 shadow-[6px_6px_0_#C7FF2F]" data-testid="demo-question-card">
              <div className="flex items-center justify-between border-b border-coaline pb-3 font-mono text-xs">
                <span className="text-[#C7FF2F] font-bold uppercase">[ QUESTION 01 // BEHAVIORAL ]</span>
                <span className="text-paper/50">TIME: 180s</span>
              </div>
              <p className="mt-4 font-display text-lg font-bold uppercase text-paper leading-snug">
                "{SAMPLE_Q.text}"
              </p>

              {/* Preset Selector Buttons */}
              <div className="mt-4 flex gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => { setAnswer(WEAK_A); setResult(null); setStages({}); }}
                  className={`px-2.5 py-1 border transition-all cursor-pointer font-bold ${
                    answer === WEAK_A 
                      ? "border-[#FF5C35] bg-[#FFEFEA] text-[#FF5C35]" 
                      : "border-coaline bg-coal text-paper/70 hover:text-paper"
                  }`}
                >
                  LOAD WEAK ANSWER (UNQUANTIFIED)
                </button>
                <button
                  type="button"
                  onClick={() => { setAnswer(STRONG_A); setResult(null); setStages({}); }}
                  className={`px-2.5 py-1 border transition-all cursor-pointer font-bold ${
                    answer === STRONG_A 
                      ? "border-[#C7FF2F] bg-[#C7FF2F] text-ink" 
                      : "border-coaline bg-coal text-paper/70 hover:text-paper"
                  }`}
                >
                  LOAD STRONG ANSWER (STAR RIGOR)
                </button>
              </div>

              <textarea
                data-testid="demo-answer-textarea"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={7}
                className="mt-4 w-full border-2 border-coaline bg-coal p-4 font-mono text-xs leading-relaxed text-paper placeholder:text-paper/30 focus:border-[#C7FF2F] focus:outline-none"
                placeholder="Type your response here…"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono">
                <span className="text-xs text-paper/50">
                  {answer.trim() ? answer.trim().split(/\s+/).length : 0} WORDS
                </span>
                <div className="flex gap-2">
                  <button
                    data-testid="demo-reset-btn"
                    onClick={() => { setAnswer(WEAK_A); setResult(null); setStages({}); }}
                    className="border-2 border-coaline bg-coal px-3 py-2 text-xs font-bold text-paper/80 transition-colors hover:bg-coal3 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 inline mr-1" /> RESET
                  </button>
                  <button
                    data-testid="demo-run-btn"
                    onClick={run}
                    disabled={running || !answer.trim()}
                    className="btn-terra !px-4 !py-2 !text-xs font-mono font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {running ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : "RUN PIPELINE"}
                    {!running && <ArrowRight className="h-4 w-4 ml-1 inline" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Stepper & Results */}
          <div className="lg:col-span-7">
            <div className="h-full border-3 border-line bg-coal2 p-6 sm:p-7 shadow-[6px_6px_0_#111111]" data-testid="demo-results-panel">
              <AgentStepper dark stages={stages} agents={AGENTS} />

              {result && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 border-t-2 border-coaline pt-6 font-mono" data-testid="demo-feedback">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="border-2 border-coaline bg-coal px-3 py-1 font-mono text-3xl font-black text-[#C7FF2F]">
                        {result.overall}
                      </span>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-paper block">OVERALL VERDICT</span>
                        <span className="text-[10px] text-paper/60 uppercase">WEIGHTED CONSENSUS SCORE</span>
                      </div>
                    </div>
                    <span className="border-2 border-coaline bg-coal px-3 py-1 text-xs font-bold text-paper">
                      {result.metrics.fillers} FILLERS · {result.metrics.words} WORDS
                    </span>
                  </div>

                  <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {Object.entries(result.scores).map(([k, v], i) => (
                      <ScoreBar key={k} label={k[0].toUpperCase() + k.slice(1)} value={v} delay={i * 0.05} />
                    ))}
                  </div>

                  <div className="mt-6 space-y-2 border-t border-coaline pt-4">
                    <span className="text-[10px] font-bold uppercase text-[#C7FF2F] tracking-wider block mb-1">
                      TOP IMPROVEMENT DIRECTIVES:
                    </span>
                    {result.improvements.slice(0, 2).map((imp: string) => (
                      <p key={imp} className="flex items-start gap-2 text-xs text-paper/80 font-sans">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C7FF2F]" /> {imp}
                      </p>
                    ))}
                  </div>

                  <Link
                    to="/app/practice"
                    className="btn-terra mt-6 inline-flex items-center gap-2 !text-xs font-bold cursor-pointer"
                    data-testid="demo-cta-app"
                  >
                    PRACTICE YOUR REAL RESUME <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

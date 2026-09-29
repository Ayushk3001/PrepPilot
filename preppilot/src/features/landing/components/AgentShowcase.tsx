// @ts-nocheck
'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mic, FileText, Layers, Sparkles, ArrowRight, CornerDownRight } from "lucide-react";
import { AGENTS } from "@/lib/mockData";
import { Reveal, SectionTag } from "@/components/ui-bits";

const ICONS: Record<string, any> = { question: HelpCircle, comm: Mic, content: FileText, star: Layers, coach: Sparkles };

export default function AgentShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % AGENTS.length), 3800);
    return () => clearInterval(t);
  }, [paused]);

  const agent = AGENTS[active];
  const next = AGENTS[(active + 1) % AGENTS.length];
  const Icon = ICONS[agent.id] || HelpCircle;

  return (
    <section id="agents" className="py-20 sm:py-28" data-testid="agent-pipeline-container">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTag>THE 5-AGENT MULTI-MODEL ENGINE</SectionTag>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <h2 className="max-w-2xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
              FIVE SPECIALISTS. <br />
              ONE <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line">HONEST</span> VERDICT.
            </h2>
            <p className="max-w-md font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
              Every response is handed agent-to-agent — from dynamic question selection to acoustic analysis and final coaching synthesis. No single model grades you alone.
            </p>
          </div>
        </Reveal>

        <div
          className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Agent Selector List */}
          <div className="space-y-3 lg:col-span-5 font-mono">
            {AGENTS.map((a: any, i: number) => {
              const AIcon = ICONS[a.id] || HelpCircle;
              const isActive = i === active;
              return (
                <button
                  key={a.id}
                  data-testid={`agent-card-${a.id}_agent`}
                  onClick={() => setActive(i)}
                  className={`flex w-full items-center gap-4 border-2 p-4 text-left transition-all duration-100 cursor-pointer ${
                    isActive
                      ? "border-line bg-[#C7FF2F] text-ink shadow-[4px_4px_0_#111111] translate-x-1"
                      : "border-line bg-white text-ink hover:bg-paper"
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-line ${
                    isActive ? "bg-ink text-[#C7FF2F]" : "bg-paper text-ink"
                  }`}>
                    <AIcon className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-tight">{a.name}</span>
                      <span className="text-[10px] text-mut font-bold">[0{i + 1}]</span>
                    </div>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-mut font-bold">
                      {a.tag}
                    </span>
                  </div>

                  {isActive && <CornerDownRight className="h-4 w-4 shrink-0 text-ink stroke-[2.5]" />}
                </button>
              );
            })}
          </div>

          {/* Detailed Agent Dossier */}
          <div className="lg:col-span-7">
            <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111] h-full flex flex-col justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`agent-detail-${agent.id}_agent`}
                  className="space-y-6"
                >
                  {/* Agent Header */}
                  <div className="flex items-center justify-between border-b-2 border-line pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center border-2 border-line bg-coal text-[#C7FF2F] shadow-[3px_3px_0_#111111]">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
                          {agent.name}
                        </h3>
                        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#127533]">
                          [ {agent.tag} ]
                        </p>
                      </div>
                    </div>
                    <span className="border-2 border-line bg-paper px-3 py-1 font-mono text-xs font-bold text-ink shadow-[2px_2px_0_#111111]">
                      STEP 0{active + 1} OF 05
                    </span>
                  </div>

                  <p className="text-sm sm:text-base leading-relaxed text-ink2 font-medium">
                    {agent.desc}
                  </p>

                  {/* Terminal System Prompt Inspection */}
                  <div className="border-2 border-line bg-coal p-4 text-paper shadow-[3px_3px_0_#111111]">
                    <div className="flex items-center justify-between border-b border-coaline pb-2 mb-3 font-mono text-[10px] text-paper/60 uppercase">
                      <span className="flex items-center gap-1.5 text-[#C7FF2F] font-bold">
                        <span className="h-2 w-2 bg-[#C7FF2F]" />
                        SYSTEM PROMPT // INSPECTABLE
                      </span>
                      <span>RUNTIME: DETERMINISTIC LOCAL + LLM</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-paper/90 max-h-48 overflow-y-auto">
{agent.prompt}
                    </pre>
                  </div>

                  {/* Handoff Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line pt-4 font-mono text-xs">
                    <span className="font-bold uppercase tracking-wider text-mut">
                      A2A PROTOCOL HANDOFF:
                    </span>
                    <span className="border-2 border-line bg-[#C7FF2F] px-3 py-1 font-bold text-ink shadow-[2px_2px_0_#111111]">
                      DISPATCHES TO → {next.short.toUpperCase()}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from "framer-motion";
import { AGENTS } from "@/lib/mockData";
import { HelpCircle, Mic, FileText, Layers, Sparkles, Check, Loader2 } from "lucide-react";

const ICONS: Record<string, any> = { question: HelpCircle, comm: Mic, content: FileText, star: Layers, coach: Sparkles };

export default function AgentStepper({ stages, agents = AGENTS, dark = false, testPrefix = "agent" }: any) {
  return (
    <div className="relative space-y-2 font-mono" data-testid={`${testPrefix}-stepper`}>
      <div className="flex items-center justify-between border-b-2 border-line pb-2 mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-paper/60" : "text-ink"}`}>
          [ 5-AGENT PIPELINE CONCURRENCY ]
        </span>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border border-line ${dark ? "bg-coal3 text-[#C7FF2F]" : "bg-[#C7FF2F] text-ink"}`}>
          LIVE ORCHESTRATION
        </span>
      </div>

      {agents.map((a: any, i: number) => {
        const st = stages[a.id];
        const Icon = ICONS[a.id] || HelpCircle;
        const running = st?.status === "running";
        const done = st?.status === "done";

        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`border-2 border-line p-3 transition-all duration-150 ${
              running
                ? dark ? "bg-coal2 shadow-[3px_3px_0_#C7FF2F]" : "bg-paper shadow-[3px_3px_0_#111111]"
                : done
                ? dark ? "bg-coal shadow-[2px_2px_0_#222]" : "bg-white shadow-[2px_2px_0_#111111]"
                : dark ? "bg-coal/60 opacity-60" : "bg-cream/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 border-line text-xs font-bold ${
                  done
                    ? "bg-[#C7FF2F] text-ink"
                    : running
                    ? "bg-[#111111] text-[#C7FF2F] animate-pulse"
                    : dark
                    ? "bg-coal3 text-paper/50"
                    : "bg-paper text-mut"
                }`}
                data-testid={`${testPrefix}-status-${a.id}`}
              >
                {done ? <Check className="h-4 w-4 stroke-[3]" /> : running ? <Loader2 className="h-4 w-4 animate-spin" /> : `0${i + 1}`}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold tracking-tight uppercase ${dark ? "text-paper" : "text-ink"}`}>
                      {a.name}
                    </span>
                    <span className={`text-[9px] px-1 border border-line ${dark ? "bg-coal3 text-paper/70" : "bg-cream text-ink2"}`}>
                      {a.tag || "AGENT"}
                    </span>
                  </div>

                  {running && (
                    <span className="text-[10px] font-bold text-[#127533] dark:text-[#C7FF2F] animate-pulse uppercase tracking-wider">
                      [ ANALYZING ]
                    </span>
                  )}
                  {done && (
                    <span className="text-[10px] font-bold text-mut" data-testid={`${testPrefix}-latency-${a.id}`}>
                      {((st.out?.latencyMs || 450) / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {done && st.out && (
                  <p className={`mt-1 text-[11px] truncate font-medium ${dark ? "text-paper/80" : "text-ink2"}`}>
                    → {summary(a.id, st.out)}
                  </p>
                )}

                {running && (
                  <div className="mt-2 h-1.5 w-full border border-line bg-paper overflow-hidden">
                    <motion.div
                      className="h-full bg-[#C7FF2F]"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function summary(id: string, out: any) {
  switch (id) {
    case "question":
      return `Selected ${out.competency} · ${out.difficulty}`;
    case "comm":
      return `Clarity ${out.clarity}% · ${out.fillers} fillers${out.wpm ? ` · ${out.wpm} WPM` : ""}`;
    case "content":
      return `Relevance ${out.relevance}% · Completeness ${out.completeness}%`;
    case "star":
      return `${out.filled}/4 STAR components · Structure ${out.structure}%`;
    case "coach":
      return `Overall ${out.overall}/100 · Synthesis complete`;
    default:
      return "";
  }
}

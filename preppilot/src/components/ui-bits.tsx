// @ts-nocheck
'use client';

import { motion } from "framer-motion";

export const Reveal = ({ children, delay = 0, className = "", y = 20 }: any) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export const SectionTag = ({ children, dark = false }: any) => (
  <div className="inline-flex items-center gap-2 mb-2">
    <span className={`inline-block w-2.5 h-2.5 border-2 border-line ${dark ? "bg-coal3" : "bg-[#C7FF2F]"}`} />
    <span className={`font-mono text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-paper/70" : "text-ink"}`}>
      {children}
    </span>
  </div>
);

export const ScoreRing = ({ value, size = 120, label = "Overall", testid }: any) => {
  return (
    <div
      className="relative flex flex-col items-center justify-center border-2 border-line bg-paper p-4 shadow-[4px_4px_0_#111111]"
      style={{ width: size, height: size }}
      data-testid={testid || "score-gauge-overall"}
    >
      <div className="absolute top-1 left-1.5 flex gap-1">
        <span className="w-1.5 h-1.5 bg-[#C7FF2F] border border-line" />
        <span className="w-1.5 h-1.5 bg-line" />
      </div>
      <span className="font-mono text-3xl font-black tracking-tight text-ink">{value}</span>
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-mut mt-0.5">{label}</span>
      <div className="absolute bottom-1 w-3/4 h-1 border border-line bg-cream overflow-hidden">
        <div className="h-full bg-[#127533]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
};

export const ScoreBar = ({ label, value, weight, delay = 0 }: any) => (
  <div data-testid={`score-bar-${label.toLowerCase().replace(/\s+/g, "-")}`} className="w-full">
    <div className="mb-1.5 flex items-baseline justify-between font-mono">
      <span className="text-xs font-bold text-ink uppercase tracking-wider">
        {label} {weight ? <span className="text-[10px] text-mut font-normal">[{weight}%]</span> : null}
      </span>
      <span className="text-sm font-black text-ink bg-[#C7FF2F] px-1.5 border border-line">{value}%</span>
    </div>
    <div className="h-3 w-full border-2 border-line bg-white p-0.5 shadow-[2px_2px_0_#111111]">
      <motion.div
        className="h-full bg-[#127533]"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  </div>
);

export const statusTone = (score: number) =>
  score >= 80 
    ? "border-2 border-line bg-[#C7FF2F] text-ink font-bold shadow-[2px_2px_0_#111111]" 
    : score >= 65 
      ? "border-2 border-line bg-[#FFEFEA] text-[#FF5C35] font-bold shadow-[2px_2px_0_#111111]" 
      : "border-2 border-line bg-[#F4F1E8] text-ink font-bold shadow-[2px_2px_0_#111111]";

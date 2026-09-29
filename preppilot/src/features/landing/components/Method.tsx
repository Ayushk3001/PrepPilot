// @ts-nocheck
import { FLOW_STEPS } from "@/lib/mockData";
import { Reveal, SectionTag } from "@/components/ui-bits";

const EDITORIAL_STEPS = [
  {
    num: "01",
    title: "UPLOAD YOUR RESUME",
    desc: "The AI Profile Agent ingests your PDF or DOCX, parses projects, verified metrics, tech stacks, and flags recurring focus areas.",
    accent: "bg-[#C7FF2F]",
  },
  {
    num: "02",
    title: "ENTER THE COCKPIT",
    desc: "Speak or type against an adaptive interviewer that probes technical trade-offs, architecture decisions, and behavioral claims.",
    accent: "bg-white",
  },
  {
    num: "03",
    title: "GET THE VERDICT",
    desc: "Receive granular acoustic telemetry, line-by-line STAR validation, model answer rewrites, and prioritized drills for your next round.",
    accent: "bg-paper",
  },
];

export default function Method() {
  return (
    <section id="method" className="border-t-3 border-line py-20 sm:py-28 bg-paper">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTag>THE METHODOLOGY</SectionTag>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <h2 className="max-w-xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
              ONE SYSTEM. <br />
              <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line">THREE PHASES.</span>
            </h2>
            <p className="max-w-md font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
              Every round generates new telemetry. Every answer refines the next question.
            </p>
          </div>
        </Reveal>

        {/* 3 Large Editorial Steps */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {EDITORIAL_STEPS.map((s, idx) => (
            <Reveal key={s.num} delay={idx * 0.08}>
              <div className={`border-3 border-line ${s.accent} p-8 shadow-[6px_6px_0_#111111] h-full flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between border-b-2 border-line pb-4 font-mono">
                    <span className="text-4xl sm:text-5xl font-black text-ink">[{s.num}]</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-mut">PHASE {s.num}</span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-bold uppercase leading-tight text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-4 font-sans text-sm leading-relaxed text-ink2 font-medium">
                    {s.desc}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t-2 border-line font-mono text-[10px] font-bold uppercase tracking-wider text-mut">
                  STATUS: ENGINE READY
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Flow Breakdown Strip */}
        <div className="mt-12 border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111]" data-testid="method-flow">
          <div className="border-b-2 border-line pb-3 mb-6 flex items-center justify-between font-mono">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">[ 7-STEP CONTINUOUS EXECUTION LOOP ]</span>
            <span className="text-[10px] font-bold uppercase text-mut bg-paper px-2 py-0.5 border border-line">LOOP V2.0</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 font-mono">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="border-2 border-line bg-paper p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-mut">0{i + 1}</span>
                  <p className="mt-1 text-xs font-bold uppercase text-ink tracking-tight">{step.label}</p>
                </div>
                <p className="mt-2 text-[10px] text-mut leading-tight font-sans">{step.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

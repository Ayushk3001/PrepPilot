// @ts-nocheck
'use client';

import { Link } from "@/lib/routerCompat";
import { FLOW_STEPS, ROLES } from "@/lib/mockData";
import { Reveal, SectionTag } from "@/components/ui-bits";
import { ArrowRight, Compass, ShieldCheck, CheckCircle2, Award } from "lucide-react";

const EDITORIAL_STEPS = [
  {
    num: "01",
    title: "INGEST YOUR RESUME",
    desc: "PrepPilot deconstructs your PDF or DOCX into an active Evidence Graph—extracting companies, tech stacks, verified metrics, and architectural decisions.",
    accent: "bg-[#C7FF2F]",
  },
  {
    num: "02",
    title: "FLY THE COCKPIT",
    desc: "Speak with live voice audio or type against an interviewer that cross-examines your actual achievements across 6 calibrated interview rounds.",
    accent: "bg-white",
  },
  {
    num: "03",
    title: "MASTER THE TELEMETRY",
    desc: "Receive instant 0-100 Readiness scores, speech cadence telemetry, line-by-line STAR validation, model answer rewrites, and longitudinal roadmap tracking.",
    accent: "bg-paper",
  },
];

export default function Method() {
  return (
    <section id="method" className="border-t-3 border-line py-20 sm:py-28 bg-paper">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTag>THE FLIGHT METHODOLOGY</SectionTag>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="max-w-xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
                ONE SYSTEM. <br />
                <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line inline-block mt-1">THREE PHASES.</span>
              </h2>
            </div>
            <p className="max-w-md font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
              Every round generates new telemetry. Every answer refines the next probing question. No generic static scripts.
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

        {/* 7-Step Continuous Execution Loop Strip */}
        <div className="mt-12 border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111]" data-testid="method-flow">
          <div className="border-b-2 border-line pb-3 mb-6 flex flex-wrap items-center justify-between gap-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">[ 7-STEP CONTINUOUS EXECUTION LOOP ]</span>
            <span className="text-[10px] font-bold uppercase text-mut bg-paper px-2 py-0.5 border border-line">DETERMINISTIC + LLM A2A</span>
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

        {/* Target Disciplines & Roles Grid */}
        <div className="mt-12 border-3 border-line bg-coal p-6 sm:p-8 text-paper shadow-[6px_6px_0_#C7FF2F]">
          <div className="flex flex-wrap items-center justify-between border-b border-coaline pb-3 mb-6 font-mono text-xs">
            <span className="text-[#C7FF2F] font-bold uppercase">[ CALIBRATED INTERVIEW DISCIPLINES ]</span>
            <span className="text-paper/60 uppercase text-[10px]">ALL EXPERIENCE TIERS (IC TO EXECUTIVE)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
            {ROLES.slice(0, 5).map((r) => (
              <div key={r.id} className="border-2 border-coaline bg-coal2 p-3">
                <span className="text-[9px] uppercase tracking-wider text-[#C7FF2F] block font-bold">{r.tag}</span>
                <p className="mt-1 text-xs font-bold uppercase text-paper leading-tight">{r.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-coaline">
            <p className="font-sans text-xs text-paper/70 font-medium">
              Calibrated rubrics for Software Engineers, AI/ML Specialists, Product Leads, DevOps Architects, and Engineering Managers.
            </p>
            <Link
              to="/app/practice"
              className="btn-terra !px-5 !py-2.5 !text-xs font-mono font-bold uppercase inline-flex items-center gap-2 cursor-pointer"
            >
              <span>LAUNCH SORTIE →</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

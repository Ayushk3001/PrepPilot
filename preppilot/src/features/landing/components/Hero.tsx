// @ts-nocheck
'use client';

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@/lib/routerCompat";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { ArrowRight, Play, Terminal, Activity, Crosshair } from "lucide-react";
import { SectionTag } from "@/components/ui-bits";
import { getStartPracticingRoute } from "@/lib/authRoute";

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, [0, 700], [0, 50]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 70, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 70, damping: 18 });

  const [practiceRoute, setPracticeRoute] = useState("/signup");
  const nav = useNavigate();

  useEffect(() => {
    setPracticeRoute(getStartPracticingRoute());
  }, []);

  const handleStartPracticing = (e: React.MouseEvent) => {
    e.preventDefault();
    nav(getStartPracticingRoute());
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section id="top" ref={ref} onMouseMove={onMove} className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-36">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12">
        {/* Left Editorial Content */}
        <div className="lg:col-span-6 z-10">
          <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-3 py-1 font-mono text-xs font-bold uppercase shadow-[2px_2px_0_#111111]">
            <span className="h-2 w-2 bg-ink" />
            [ AI INTERVIEW SYSTEM / V2.0 ]
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95] tracking-tight uppercase text-ink">
            STOP <br />
            PRACTICING <br />
            <span className="bg-ink text-[#C7FF2F] px-2 py-0.5 inline-block shadow-[4px_4px_0_#127533] mt-1">
              BLIND.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-ink2 font-medium">
            PrepPilot analyzes your resume, runs adaptive mock interviews, evaluates your responses in real time, and tells you exactly what to fix.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={practiceRoute}
              onClick={handleStartPracticing}
              data-testid="landing-hero-cta"
              className="btn-terra text-sm !px-6 !py-3.5 font-bold"
            >
              START INTERVIEW <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#agents"
              data-testid="landing-hero-secondary-cta"
              className="btn-ghost text-sm !px-6 !py-3.5 font-bold"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> 5-AGENT ENGINE
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-line pt-4 font-mono text-xs uppercase font-bold text-mut">
            <span className="text-ink">01 // 5 SPECIALIST AGENTS</span>
            <span className="text-line2">/</span>
            <span className="text-ink">02 // ADAPTIVE PROBING</span>
            <span className="text-line2">/</span>
            <span className="text-ink">03 // 5 SCORING AXES</span>
          </div>
        </div>

        {/* Right Cockpit Control Panel */}
        <motion.div style={{ y: drift }} className="lg:col-span-6" data-testid="hero-visual">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ perspective: 1000 }}
          >
            <motion.div
              style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
              className="relative mx-auto max-w-xl"
              data-testid="hero-product-card"
            >
              <HeroCockpit />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

const AGENT_ROWS = [
  { name: "Question Selection Agent", chip: "SELECTED // BEHAVIORAL", tone: "bg-[#C7FF2F] text-ink" },
  { name: "Communication Analysis", chip: "CLARITY 88% // 1 FILLER", tone: "bg-paper text-ink" },
  { name: "Content Verification", chip: "RELEVANCE 84% // METRIC VERIFIED", tone: "bg-paper text-ink" },
  { name: "STAR Structure Agent", chip: "3/4 DETECTED // RESULT MISSING", tone: "bg-[#FFEFEA] text-[#FF5C35]" },
  { name: "Interview Coach Agent", chip: "SYNTHESIS READY // SCORE 88", tone: "bg-[#C7FF2F] text-ink font-bold" },
];

function HeroCockpit() {
  return (
    <div className="border-3 border-line bg-paper shadow-[8px_8px_0_#111111] overflow-hidden">
      {/* Top Cockpit Header */}
      <div className="flex items-center justify-between border-b-2 border-line bg-white px-5 py-3 font-mono text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 bg-[#C7FF2F] border border-line animate-pulse" />
          <span className="text-ink uppercase tracking-wider">PREPPILOT // LIVE SESSION</span>
        </div>
        <div className="flex items-center gap-3 text-mut">
          <span className="text-[10px] bg-paper px-2 py-0.5 border border-line text-ink">SYS_REC_024</span>
          <span className="text-[10px] text-ink">ROUND 03 / 08</span>
        </div>
      </div>

      {/* Cockpit Meta Row */}
      <div className="grid grid-cols-3 border-b-2 border-line bg-cream font-mono text-[11px] font-bold text-ink">
        <div className="p-3 border-r-2 border-line">
          <span className="text-mut text-[9px] block uppercase">Target Role</span>
          <span>STAFF SWE</span>
        </div>
        <div className="p-3 border-r-2 border-line">
          <span className="text-mut text-[9px] block uppercase">Round Key</span>
          <span>TECH TRADE-OFF</span>
        </div>
        <div className="p-3 bg-[#C7FF2F]">
          <span className="text-mut text-[9px] block uppercase text-ink">Status</span>
          <span className="text-ink">● INTERVIEW ACTIVE</span>
        </div>
      </div>

      {/* Main Cockpit Body */}
      <div className="p-6 space-y-5 bg-white">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
              CURRENT QUESTION [PROMPT_03]
            </span>
            <span className="font-mono text-[10px] font-bold text-mut">LIMIT: 180s</span>
          </div>
          <p className="mt-3 font-display text-xl font-bold uppercase leading-snug text-ink">
            "Describe a time you made an architectural trade-off with significant operational risk. What was the metric outcome?"
          </p>
        </div>

        {/* 5-Agent Concurrency Rows */}
        <div className="space-y-2 border-t-2 border-line pt-4" data-testid="hero-agent-rows">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut block">
            Agent Handoff Pipeline:
          </span>
          {AGENT_ROWS.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between border-2 border-line bg-paper px-3 py-2 text-xs font-mono"
            >
              <span className="font-bold text-ink">{a.name}</span>
              <span className={`px-2 py-0.5 border border-line text-[10px] font-bold ${a.tone}`}>
                {a.chip}
              </span>
            </div>
          ))}
        </div>

        {/* Hero Score Diagnostic Block */}
        <div className="border-2 border-line bg-coal p-5 text-paper shadow-[4px_4px_0_#111111]">
          <div className="flex items-center justify-between border-b border-coaline pb-3">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C7FF2F]">
                READINESS INDEX
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-4xl font-black text-paper">88</span>
                <span className="font-mono text-xs text-paper/60">/ 100 [STRONG SIGNAL]</span>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-paper/70">
              <span>STAR RIGOR: </span>
              <span className="text-[#C7FF2F] font-bold">PASS</span> <br />
              <span>PACE: </span>
              <span className="text-[#C7FF2F] font-bold">132 WPM</span>
            </div>
          </div>

          <div className="mt-4 space-y-2 font-mono text-xs">
            {[
              ["Clarity & Conciseness", 92],
              ["Technical Grounding", 88],
              ["Structure & STAR", 84],
            ].map(([l, v]) => (
              <div key={l} className="space-y-1">
                <div className="flex justify-between text-[10px] text-paper/80 uppercase font-bold">
                  <span>{l}</span>
                  <span className="text-[#C7FF2F]">{v}%</span>
                </div>
                <div className="h-2 w-full border border-coaline bg-coal3 p-0.5">
                  <div className="h-full bg-[#C7FF2F]" style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

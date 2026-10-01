// @ts-nocheck
'use client';

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@/lib/routerCompat";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { ArrowRight, Play, Terminal, Activity, Crosshair, Sparkles, FileText, CheckCircle2 } from "lucide-react";
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
            <span className="h-2 w-2 bg-ink animate-pulse" />
            [ AI INTERVIEW SYSTEM / V2.0 // GROUNDED IN YOUR RESUME ]
          </div>

          <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95] tracking-tight uppercase text-ink">
            STOP <br />
            PRACTICING <br />
            <span className="bg-ink text-[#C7FF2F] px-2 py-0.5 inline-block shadow-[4px_4px_0_#127533] mt-1">
              BLIND.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-ink2 font-medium">
            PrepPilot transforms your resume into an active Evidence Graph, runs 6 calibrated mock interview rounds, and deploys 5 concurrent AI specialists to evaluate your verbal delivery, technical depth, and STAR structure in real time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={practiceRoute}
              onClick={handleStartPracticing}
              data-testid="landing-hero-cta"
              className="btn-terra text-sm !px-6 !py-3.5 font-bold cursor-pointer"
            >
              START AN INTERVIEW <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#rounds"
              data-testid="landing-hero-secondary-cta"
              className="btn-ghost text-sm !px-6 !py-3.5 font-bold cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> 6 SIMULATION ROUNDS
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-line pt-4 font-mono text-xs uppercase font-bold text-mut">
            <a href="#evidence" className="text-ink hover:text-[#127533] transition-colors">
              01 // RESUME EVIDENCE GRAPH
            </a>
            <span className="text-line2">/</span>
            <a href="#rounds" className="text-ink hover:text-[#127533] transition-colors">
              02 // 6 INTERVIEW ROUNDS
            </a>
            <span className="text-line2">/</span>
            <a href="#agents" className="text-ink hover:text-[#127533] transition-colors">
              03 // 5-AGENT RUNWAY
            </a>
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
  { name: "Question Selection Agent", chip: "RESUME GROUNDED // ADAPTIVE", tone: "bg-[#C7FF2F] text-ink font-bold" },
  { name: "Communication Analysis", chip: "132 WPM // 1 FILLER CRUTCH", tone: "bg-paper text-ink" },
  { name: "Content Verification", chip: "KAFKA SLA VERIFIED // 88%", tone: "bg-paper text-ink" },
  { name: "STAR Structure Agent", chip: "4/4 BEATS HIT // RESULT QUANTIFIED", tone: "bg-[#E2F8E7] text-[#127533] font-bold" },
  { name: "Interview Coach Agent", chip: "SYNTHESIS READY // SCORE 88/100", tone: "bg-[#C7FF2F] text-ink font-bold" },
];

function HeroCockpit() {
  return (
    <div className="border-3 border-line bg-paper shadow-[8px_8px_0_#111111] overflow-hidden">
      {/* Top Cockpit Header */}
      <div className="flex items-center justify-between border-b-2 border-line bg-white px-5 py-3 font-mono text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 bg-[#C7FF2F] border border-line animate-pulse" />
          <span className="text-ink uppercase tracking-wider">PREPPILOT // ACTIVE SIMULATION COCKPIT</span>
        </div>
        <div className="flex items-center gap-2 text-mut">
          <span className="text-[10px] bg-paper px-2 py-0.5 border border-line text-ink">LIVE AUDIO</span>
          <span className="text-[10px] text-ink font-bold">Q 03 / 06</span>
        </div>
      </div>

      {/* Cockpit Meta Row */}
      <div className="grid grid-cols-3 border-b-2 border-line bg-cream font-mono text-[11px] font-bold text-ink">
        <div className="p-3 border-r-2 border-line">
          <span className="text-mut text-[9px] block uppercase">Target Discipline</span>
          <span className="truncate block">STAFF DISTRIBUTED SWE</span>
        </div>
        <div className="p-3 border-r-2 border-line">
          <span className="text-mut text-[9px] block uppercase">Simulation Round</span>
          <span className="truncate block">ROUND 3: TECH TRADE-OFF</span>
        </div>
        <div className="p-3 bg-[#C7FF2F]">
          <span className="text-mut text-[9px] block uppercase text-ink">Telemetry</span>
          <span className="text-ink">● 5 ENGINES LIVE</span>
        </div>
      </div>

      {/* Main Cockpit Body */}
      <div className="p-6 space-y-5 bg-white">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
              GROUNDED IN CLAIM: "Kafka Pipeline (45k msg/sec)"
            </span>
            <span className="font-mono text-[10px] font-bold text-mut">LIMIT: 180s</span>
          </div>
          <p className="mt-3 font-display text-lg sm:text-xl font-bold uppercase leading-snug text-ink">
            "On your resume you noted achieving near-zero message loss at 45k msg/sec. How did you handle consumer rebalances without causing partition lag?"
          </p>
        </div>

        {/* 5-Agent Concurrency Rows */}
        <div className="space-y-2 border-t-2 border-line pt-4" data-testid="hero-agent-rows">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut block">
            Multi-Agent Concurrent Telemetry:
          </span>
          {AGENT_ROWS.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between border-2 border-line bg-paper px-3 py-1.5 text-xs font-mono"
            >
              <span className="font-bold text-ink text-[11px]">{a.name}</span>
              <span className={`px-2 py-0.5 border border-line text-[9px] font-bold ${a.tone}`}>
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
                READINESS QUOTIENT
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-4xl font-black text-paper">88</span>
                <span className="font-mono text-xs text-paper/60">/ 100 [TARGET BENCHMARK MET]</span>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-paper/70">
              <span>STAR RIGOR: </span>
              <span className="text-[#C7FF2F] font-bold">4/4 BEATS HIT</span> <br />
              <span>VOCAL PACE: </span>
              <span className="text-[#C7FF2F] font-bold">132 WPM (OPTIMAL)</span>
            </div>
          </div>

          <div className="mt-4 space-y-2 font-mono text-xs">
            {[
              ["Clarity & Vocal Cadence", 92],
              ["Resume Grounding & Architecture", 88],
              ["STAR Structural Rigor", 84],
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

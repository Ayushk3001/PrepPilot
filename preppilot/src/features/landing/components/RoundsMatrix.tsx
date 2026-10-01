// @ts-nocheck
'use client';

import { useState } from "react";
import { Link } from "@/lib/routerCompat";
import { 
  Clock, ArrowRight, ShieldCheck, CheckCircle2, 
  HelpCircle, Target, Layers, PlayCircle, Award, Compass, Zap
} from "lucide-react";
import { Reveal, SectionTag } from "@/components/ui-bits";

const ROUNDS_DATA = [
  {
    key: "hr",
    num: "01",
    title: "HR & Introduction",
    tagline: "First Impressions, Career Trajectory & Motivation",
    duration: "10–15 mins",
    questions: "3–5 Questions",
    competencies: ["Communication", "Career Motivation", "Elevator Pitch", "Cultural Fit"],
    sampleQ: "Walk me through your career journey. Why are you transitioning from your current role now, and how does this position fit into your 3-year vision?",
    evaluationFocus: "Clear narrative arc without rambling. Concise 90-second framing of past impact.",
    accent: "bg-[#C7FF2F]",
    btnText: "LAUNCH HR ROUND →"
  },
  {
    key: "behavioral",
    num: "02",
    title: "Behavioral & STAR",
    tagline: "Adversity, Disagreement, Teamwork & Failure",
    duration: "20–25 mins",
    questions: "5–6 Questions",
    competencies: ["STAR Rigor", "Conflict Resolution", "Overcoming Failure", "Cross-functional Collaboration"],
    sampleQ: "Tell me about a high-stakes project where a core requirement changed 48 hours before launch. How did you realign the team and what was the metric outcome?",
    evaluationFocus: "Deconstructed into Situation, Task, Action, Result. Verifies that 'Action' highlights your individual contribution.",
    accent: "bg-white",
    btnText: "LAUNCH BEHAVIORAL ROUND →"
  },
  {
    key: "technical",
    num: "03",
    title: "Technical & Domain",
    tagline: "Architecture, Systems, Tech Stacks & Trade-offs",
    duration: "25–30 mins",
    questions: "6–8 Questions",
    competencies: ["Technical Depth", "Architecture Trade-offs", "Tech Stack Mastery", "Root-Cause Debugging"],
    sampleQ: "On your resume you describe migrating to event-driven microservices. What specific consistency trade-offs did you make, and how did you prevent dual-write anomalies?",
    evaluationFocus: "Pushes past surface-level definitions into production failure modes, concurrency, and trade-offs.",
    accent: "bg-white",
    btnText: "LAUNCH TECHNICAL ROUND →"
  },
  {
    key: "situational",
    num: "04",
    title: "Situational & Problem Solving",
    tagline: "Ambiguity, Operational Crisis & Priority Battles",
    duration: "20–25 mins",
    questions: "5–7 Questions",
    competencies: ["Critical Thinking", "Crisis Management", "Trade-off Reasoning", "Resource Allocation"],
    sampleQ: "Your flagship API error rate spikes to 8% during a marketing blitz, but engineering leads disagree on the cause. How do you triage under active customer impact?",
    evaluationFocus: "Structured problem breakdown, prioritization framework, and customer-first escalation protocols.",
    accent: "bg-white",
    btnText: "LAUNCH SITUATIONAL ROUND →"
  },
  {
    key: "leadership",
    num: "05",
    title: "Leadership & Ownership",
    tagline: "Extreme Ownership, Influence & Decisions Under Uncertainty",
    duration: "15–20 mins",
    questions: "4–6 Questions",
    competencies: ["Extreme Ownership", "Stakeholder Influence", "Mentorship", "Vision Under Ambiguity"],
    sampleQ: "Describe an unassigned problem in your previous organization that no one owned. Why did you take it on, who did you persuade, and what was the lasting cultural impact?",
    evaluationFocus: "Shows initiative beyond job scope. Probes accountability without deflecting blame to peers.",
    accent: "bg-white",
    btnText: "LAUNCH LEADERSHIP ROUND →"
  },
  {
    key: "mock",
    num: "06",
    title: "Full Comprehensive Mock",
    tagline: "The Full 6-Axis Gauntlet",
    duration: "25–30 mins",
    questions: "6–9 Questions",
    competencies: ["HR (2)", "Behavioral (4)", "Technical (4)", "Situational (2)", "Leadership (2)"],
    sampleQ: "A seamless transition from resume walkthrough into deep technical cross-examination, behavioral conflict resolution, and situational crisis handling.",
    evaluationFocus: "Simulates the entire final-round loop. Weighted readiness quotient across all 5 evaluation engines.",
    accent: "bg-[#C7FF2F]",
    btnText: "LAUNCH FULL FLIGHT SIMULATION →"
  }
];

export default function RoundsMatrix() {
  const [selectedKey, setSelectedKey] = useState("behavioral");
  const activeRound = ROUNDS_DATA.find((r) => r.key === selectedKey) || ROUNDS_DATA[0];

  return (
    <section id="rounds" className="border-t-3 border-line bg-paper py-20 sm:py-28" data-testid="landing-rounds-section">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTag>THE 6 SIMULATION SORTIES</SectionTag>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="max-w-3xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
                SIX CALIBRATED ROUNDS. <br />
                <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line inline-block mt-1">
                  NO SURPRISES ON INTERVIEW DAY.
                </span>
              </h2>
            </div>
            <p className="max-w-md font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
              Don't train for behavioral questions when you have a system design loop tomorrow. Launch the exact interview round you are facing.
            </p>
          </div>
        </Reveal>

        {/* 6 Round Navigation Pills */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          {ROUNDS_DATA.map((r) => {
            const isSelected = r.key === selectedKey;
            return (
              <button
                key={r.key}
                onClick={() => setSelectedKey(r.key)}
                className={`border-2 p-3 text-left transition-all duration-100 cursor-pointer ${
                  isSelected
                    ? "border-line bg-[#C7FF2F] text-ink shadow-[4px_4px_0_#111111] translate-x-0.5 -translate-y-0.5"
                    : "border-line bg-white text-ink hover:bg-paper"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-mut">[{r.num}]</span>
                  <span className="text-[9px] uppercase font-bold text-ink2">{r.duration.split(" ")[0]}</span>
                </div>
                <p className="mt-2 text-xs font-black uppercase tracking-tight line-clamp-1">{r.title.split(" — ")[0]}</p>
              </button>
            );
          })}
        </div>

        {/* Active Round Interactive Dossier */}
        <div className="mt-6 border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Round Specification & Metadata */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="border-2 border-line bg-ink text-[#C7FF2F] px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_#111111]">
                  ROUND {activeRound.num} // {activeRound.title.toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-mut border border-line bg-paper px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" /> {activeRound.duration}
                </span>
                <span className="font-mono text-xs font-bold text-mut border border-line bg-paper px-2.5 py-1">
                  {activeRound.questions}
                </span>
              </div>

              <div>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-ink">
                  {activeRound.tagline}
                </h3>
                <div className="mt-4 border-2 border-line bg-paper p-4 font-mono">
                  <span className="text-[10px] font-bold uppercase text-mut block mb-1">
                    [ CALIBRATED SAMPLE PROMPT ]
                  </span>
                  <p className="font-sans text-sm sm:text-base font-bold text-ink leading-snug">
                    "{activeRound.sampleQ}"
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut block">
                  Core Competencies Evaluated:
                </span>
                <div className="flex flex-wrap gap-2 font-mono">
                  {activeRound.competencies.map((c) => (
                    <span
                      key={c}
                      className="border-2 border-line bg-paper px-2.5 py-1 text-xs font-bold text-ink shadow-[2px_2px_0_#111111]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-l-4 border-l-[#127533] bg-[#E2F8E7] p-3.5 font-mono text-xs">
                <span className="text-[#127533] font-bold block uppercase mb-0.5">Evaluation Rubric:</span>
                <p className="text-ink2 font-sans font-medium text-xs leading-relaxed">
                  {activeRound.evaluationFocus}
                </p>
              </div>
            </div>

            {/* Right: Round Cockpit Readiness Launch Pad */}
            <div className="lg:col-span-5 border-2 border-line bg-paper p-6 shadow-[4px_4px_0_#111111] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-line pb-3 font-mono text-xs">
                <span className="font-bold text-ink uppercase">[ SORTIE DISPATCH HUD ]</span>
                <span className="bg-[#C7FF2F] border border-line px-2 py-0.5 text-[10px] font-bold text-ink">
                  READY FOR TAKEOFF
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-line/40 pb-2">
                  <span className="text-mut">INPUT MODES:</span>
                  <span className="font-bold text-ink">REAL-TIME VOICE OR TYPED</span>
                </div>
                <div className="flex justify-between border-b border-line/40 pb-2">
                  <span className="text-mut">AI CONCURRENCY:</span>
                  <span className="font-bold text-ink">5 ENGINES RUNNING</span>
                </div>
                <div className="flex justify-between border-b border-line/40 pb-2">
                  <span className="text-mut">FOLLOW-UP PROBES:</span>
                  <span className="font-bold text-[#127533]">ADAPTIVE RESUME REBOUND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mut">BENCHMARK REPORT:</span>
                  <span className="font-bold text-ink">INSTANT READINESS SCORE</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/app/practice?round=${activeRound.key}`}
                  className="btn-terra w-full !py-3.5 !text-xs font-mono font-bold uppercase text-center block shadow-[4px_4px_0_#111111] cursor-pointer"
                >
                  {activeRound.btnText}
                </Link>
                <p className="mt-2 text-center font-mono text-[10px] text-mut uppercase">
                  FREE FLIGHT · LOCAL CLIENT PERSISTENCE
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

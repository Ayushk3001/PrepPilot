'use client';

import { Link } from "@/lib/routerCompat";
import { ArrowRight, CalendarClock, Dumbbell, TrendingUp, Check, Target, Zap } from "lucide-react";
import { loadSessions, profile } from "@/lib/store";
import { recommendedTopics } from "@/lib/resources";
import ResourceList from "@/components/ResourceList";
import { Reveal } from "@/components/ui-bits";
import { useEffect, useState } from "react";

const DRILLS: Record<string, any> = {
  fillers: { title: "KILL THE FILLER WORDS", drill: "Record a 60-second answer. Replay. Count every 'um'. Do it three times — the count drops on its own.", metric: "0–2 fillers per answer" },
  results: { title: "LAND EVERY RESULT WITH A NUMBER", drill: "Before submitting, force yourself to end with one sentence containing a %, a time saved, or a revenue figure.", metric: "100% of answers end quantified" },
  structure: { title: "SIGNPOST OUT LOUD", drill: "Open with 'Two things happened…', use 'First / Then / Which meant' — make the structure audible to a tired interviewer.", metric: "3+ connectors per answer" },
  hedges: { title: "DELETE THE HEDGING", drill: "Replace every 'I think / maybe / I guess' with the plain claim. If you can't say it plainly, don't claim it.", metric: "≤1 hedge per answer" },
  thin: { title: "ADD A SECOND BEAT", drill: "Structure answers as: claim → example → result. Most thin answers only have the claim.", metric: "90+ words per answer" },
};

const GENERIC = [
  { title: "PRACTICE 4 SESSIONS THIS WEEK", drill: "Mix one behavioral, one technical-communication, one situational and one follow-up drill.", metric: "4 sessions / week" },
  { title: "ONE ANSWER OUT LOUD EVERY DAY", drill: "Voice mode only for a week — the Communication Agent measures what typing hides.", metric: "7 voice sessions" },
];

export default function Plan() {
  const [p, setP] = useState<any>({ index: 0, avg: 0, starRate: 0, streak: 0, trend: [], gaps: [], weekCount: 0, total: 0 });

  useEffect(() => {
    const s = loadSessions();
    setP(profile(s));
  }, []);

  const milestones = [
    ...(p.gaps || []).slice(0, 2).map((g: any) => ({
      ...DRILLS[g.key],
      progress: Math.max(10, 100 - g.pct),
      weeks: "This week",
    })),
    ...GENERIC.slice(0, 3 - Math.min((p.gaps || []).length, 2)).map((g) => ({ ...g, progress: Math.min(90, p.index || 60), weeks: "Ongoing" })),
  ].slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl space-y-10" data-testid="plan-page">
      <Reveal>
        <div className="border-b-2 border-line pb-6">
          <div className="inline-flex items-center gap-2 border border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[11px] font-black text-ink uppercase tracking-wider">
            <span>[04] IMPROVEMENT PLAN</span>
            <span>//</span>
            <span>ADAPTIVE CURRICULUM</span>
          </div>
          <h1 className="mt-3 font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-ink">
            WHERE YOUR ANSWERS <span className="bg-[#C7FF2F] px-2 border border-line">ACTUALLY</span> SLIP.
          </h1>
          <p className="mt-2 font-mono text-xs text-mut uppercase tracking-wider max-w-xl leading-relaxed">
            RANKED BY RECURRING FREQUENCY ACROSS COMPLETED SESSIONS. ZERO GENERIC ADVICE — PURE TARGETED CORRECTION.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="plan-summary">
          {[
            ["READINESS INDEX", p.total > 0 && p.index > 0 ? `${p.index}/100` : "—"],
            ["SESSIONS RUN", p.total || 0],
            ["STAR SUCCESS RATE", p.total > 0 ? `${p.starRate}%` : "—"],
            ["ACTIVE STREAK", `${p.streak || 0} DAYS`],
          ].map(([l, v]) => (
            <div key={l} className="border-3 border-line bg-white p-4 shadow-[4px_4px_0_#111111] font-mono">
              <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{l}</p>
              <p className="mt-1 text-2xl font-black text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {p.total === 0 ? (
        <div className="border-3 border-line bg-white p-8 sm:p-10 shadow-[6px_6px_0_#111111]" data-testid="plan-empty-state">
          <div className="flex flex-col sm:flex-row items-start gap-4 border-b-2 border-line pb-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink font-mono font-black text-lg shadow-[2px_2px_0_#111111]">
              <Target className="h-6 w-6 stroke-[2.5]" />
            </span>
            <div>
              <div className="inline-block border border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-mut uppercase mb-1">
                STATUS: INSUFFICIENT TELEMETRY
              </div>
              <h2 className="font-mono text-xl sm:text-2xl font-black uppercase text-ink">
                YOUR ROADMAP GENERATES AFTER 2-3 TURNS.
              </h2>
              <p className="mt-1 font-mono text-xs text-mut leading-relaxed uppercase">
                THE COACH AGENT CONTINUOUSLY SAMPLES 7 DIAGNOSTIC METRIC CHANNELS TO TAILOR YOUR TARGETED DRILLS:
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 font-mono">
            {[
              { title: "COMMUNICATION", desc: "Pacing, articulation, and vocal confidence signals" },
              { title: "STAR STRUCTURE", desc: "Situation, Task, Action, and Result framing" },
              { title: "CONTENT DEPTH", desc: "Technical depth and prompt relevance" },
              { title: "FILLER WORDS", desc: "Detecting 'um', 'uh', 'like' under pressure" },
              { title: "HEDGING", desc: "Eliminating passive or uncertain phrasing" },
              { title: "COMPLETENESS", desc: "Ensuring all prompt requirements are answered" },
              { title: "RECURRING GAPS", desc: "Multi-session trends identified by the Coach Agent" },
            ].map((item, idx) => (
              <div key={item.title} className="border-2 border-line bg-paper p-3.5 shadow-[2px_2px_0_#111111]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-white border border-line px-1">0{idx + 1}</span>
                  <p className="text-xs font-black uppercase text-ink">{item.title}</p>
                </div>
                <p className="text-[11px] font-sans text-ink2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center pt-6 border-t-2 border-line">
            <Link to="/app/practice" className="btn-terra inline-flex items-center gap-2 !px-8 !py-3.5 font-mono text-xs font-bold uppercase cursor-pointer">
              <span>START FIRST PRACTICE SESSION</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="improvement-plan-roadmap">
          {milestones.map((m, i) => (
            <Reveal key={m.title || i} delay={i * 0.06}>
              <div className="border-3 border-line bg-white p-6 shadow-[5px_5px_0_#111111]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start border-b border-line pb-4">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink font-mono font-black text-sm shadow-[2px_2px_0_#111111]">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-mono text-base font-black uppercase text-ink">{m.title}</h3>
                      <p className="mt-1 font-sans text-xs font-medium leading-relaxed text-ink2">{m.drill}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start sm:items-end gap-1.5 font-mono">
                    <span className="border border-line bg-paper px-2 py-0.5 text-[10px] font-black text-ink uppercase">
                      {m.metric}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-mut">{m.weeks}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="h-3 flex-1 border-2 border-line bg-paper p-0.5">
                    <div className="h-full bg-[#127533] transition-all" style={{ width: `${m.progress}%` }} />
                  </div>
                  <span className="font-mono text-xs font-black text-ink bg-[#C7FF2F] px-1.5 border border-line">
                    {m.progress}%
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <Reveal delay={0.08}>
        <section data-testid="plan-resources" className="space-y-4">
          <div className="border-b-2 border-line pb-4">
            <div className="inline-flex items-center gap-2 border border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink uppercase">
              <span>PREP ARCHIVE</span>
              <span>//</span>
              <span>CURATED INTEL</span>
            </div>
            <h2 className="mt-2 font-mono text-2xl font-black uppercase tracking-tight text-ink">
              RESOURCES FOR IDENTIFIED GAPS.
            </h2>
            <p className="mt-1 font-mono text-xs text-mut uppercase">
              DOCUMENTATION, CHEATSHEETS, AND READING MATCHED TO YOUR HIGHEST-FREQUENCY SYSTEM GAPS.
            </p>
          </div>
          <div>
            <ResourceList topics={recommendedTopics({ gaps: p.gaps })} testPrefix="plan-resources" />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col items-start justify-between gap-5 border-3 border-line bg-ink text-paper p-8 shadow-[6px_6px_0_#C7FF2F] sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase font-bold text-[#C7FF2F] tracking-wider">
              ● READY FOR EXECUTION
            </span>
            <p className="font-mono text-xl sm:text-2xl font-black uppercase text-paper leading-tight">
              THE PLAN ONLY WORKS IF THE PIPELINE RUNS. NEXT QUESTION IS ONE CLICK AWAY.
            </p>
          </div>
          <Link to="/app/practice" data-testid="plan-practice-cta" className="btn-terra shrink-0 !text-xs font-mono font-bold uppercase cursor-pointer">
            <span>PRACTICE NOW</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

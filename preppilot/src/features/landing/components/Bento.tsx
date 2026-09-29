// @ts-nocheck
'use client';

import { Check, AlertCircle, Waves, Target, Wand2 } from "lucide-react";
import { Reveal, SectionTag } from "@/components/ui-bits";

export default function Bento() {
  return (
    <section id="features" className="border-t-2 border-line bg-paper py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTag>DIAGNOSTIC CAPABILITIES</SectionTag>
          <h2 className="mt-4 max-w-3xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
            FEEDBACK THAT READS LIKE A <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line">COACH</span>, NOT A RUBRIC.
          </h2>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-ink2 font-medium">
            Generic interview tools give you a percentage score. PrepPilot deconstructs your cadence, extracts your STAR structure, and writes the high-impact answer for you.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
          {/* Card 1: Acoustic & Speech Telemetry (Span 8) */}
          <Reveal className="lg:col-span-8" delay={0.05}>
            <div className="border-3 border-line bg-white p-7 sm:p-8 shadow-[6px_6px_0_#111111] h-full flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                <div className="max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink">
                      <Waves className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut">
                      [ CADENCE &amp; ACOUSTIC TELEMETRY ]
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl sm:text-3xl font-bold uppercase text-ink">
                    Hear what the interviewer hears
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink2 font-medium">
                    Filler words, hedging crutches, rambling sentences, and cadence. The Communication Agent transcribes your audio and scores your actual delivery signals.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 font-mono">
                    {["UM ×3", "BASICALLY ×1", "YOU KNOW ×2", "PACE: 128 WPM"].map((t) => (
                      <span key={t} className="border-2 border-line bg-[#FFEFEA] text-[#FF5C35] px-2.5 py-1 text-[10px] font-bold shadow-[2px_2px_0_#111111]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Animated Waveform Bars */}
                <div className="hidden h-32 flex-1 items-end justify-center gap-2 sm:flex border-2 border-line bg-paper p-3 shadow-[3px_3px_0_#111111]" data-testid="bento-waveform">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-2 origin-bottom animate-wave bg-[#127533] border border-line"
                      style={{ height: `${20 + ((i * 37) % 75)}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: STAR Line-by-Line (Span 4) */}
          <Reveal className="lg:col-span-4" delay={0.1}>
            <div className="border-3 border-line bg-white p-7 sm:p-8 shadow-[6px_6px_0_#111111] h-full" data-testid="bento-star-card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink">
                  <Target className="h-4 w-4" />
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut">
                  [ STAR RIGOR ]
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase text-ink">
                STAR, scored line by line
              </h3>
              <div className="mt-5 space-y-2 font-mono">
                {[
                  ["S", "Situation", true],
                  ["T", "Task", true],
                  ["A", "Action", true],
                  ["R", "Result", false],
                ].map(([k, label, ok]) => (
                  <div key={String(k)} className="flex items-center justify-between border-2 border-line bg-paper px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 font-bold text-ink">
                      <span className="border border-line bg-white px-1.5 py-0.2">{k}</span> {label}
                    </span>
                    {ok ? (
                      <span className="border border-line bg-[#C7FF2F] px-1.5 py-0.2 text-[10px] font-bold text-ink">PASS</span>
                    ) : (
                      <span className="border border-line bg-[#FF5C35] px-1.5 py-0.2 text-[10px] font-bold text-white">MISSING</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[11px] text-mut border-l-2 border-line pl-2">
                "Result component missing: Anchor your finale with measurable numbers."
              </p>
            </div>
          </Reveal>

          {/* Card 3: Adaptive Questions (Span 4) */}
          <Reveal className="lg:col-span-4" delay={0.15}>
            <div className="border-3 border-line bg-white p-7 sm:p-8 shadow-[6px_6px_0_#111111] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink">
                    <Wand2 className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut">
                    [ RESUME GROUNDING ]
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold uppercase text-ink">
                  Questions that probe your claims
                </h3>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink2 font-medium">
                  Selected by role, competency, difficulty, and your extracted work experience — probing your real stack and trade-offs.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-1.5 font-mono">
                {["Behavioral", "System Design", "Failure Modes", "Leadership", "Trade-Offs"].map((t) => (
                  <span key={t} className="border border-line bg-paper px-2 py-0.5 text-[10px] font-bold text-ink">
                    [{t}]
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Card 4: Coach Rewrite (Span 8) */}
          <Reveal className="lg:col-span-8" delay={0.2}>
            <div className="border-3 border-line bg-white p-7 sm:p-8 shadow-[6px_6px_0_#111111] h-full" data-testid="bento-coach-card">
              <div className="flex items-center justify-between border-b-2 border-line pb-3">
                <h3 className="font-display text-2xl font-bold uppercase text-ink">
                  The model rewrite, not just criticism
                </h3>
                <span className="border-2 border-line bg-[#C7FF2F] px-2.5 py-1 font-mono text-[10px] font-bold text-ink shadow-[2px_2px_0_#111111]">
                  COACH AGENT
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="border-2 border-line bg-paper p-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mut block mb-2">
                    [ WHAT YOU SAID ]
                  </span>
                  <p className="text-xs sm:text-sm leading-relaxed text-ink2 italic">
                    "…and then basically, after a lot of back and forth, we kind of improved the numbers over time and it went pretty well overall, I think."
                  </p>
                </div>
                <div className="border-2 border-line bg-coal p-4 text-paper shadow-[3px_3px_0_#C7FF2F]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C7FF2F] block mb-2">
                    [ COACH SYNTHESIS ]
                  </span>
                  <p className="text-xs sm:text-sm leading-relaxed text-paper font-medium">
                    "We cut checkout failure rates from 2.1% to 0.08% in six weeks. I owned the telemetry diagnosis, the async event pipeline redesign, and production canary deployment."
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

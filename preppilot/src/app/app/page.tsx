// @ts-nocheck
'use client';

import { Link } from "@/lib/routerCompat";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowRight, ArrowUpRight, Flame, Target, CalendarCheck, Gauge, Plus } from "lucide-react";
import { loadSessions, profile } from "@/lib/store";
import { COMPETENCIES } from "@/lib/mockData";
import { Reveal, ScoreRing, statusTone } from "@/components/ui-bits";
import { useEffect, useState } from "react";

const compLabel = (id: string) => COMPETENCIES.find((c) => c.id === id)?.label || id;

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [p, setP] = useState<any>({ index: 0, avg: 0, starRate: 0, streak: 0, trend: [], gaps: [], weekCount: 0, total: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = loadSessions();
    setSessions(s);
    setP(profile(s));
    setMounted(true);
  }, []);

  const recent = [...sessions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Command Center Header */}
      <Reveal>
        <div className="flex flex-col justify-between gap-4 border-b-3 border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-ink shadow-[2px_2px_0_#111111]">
              <span className="h-2 w-2 bg-ink" />
              INTERVIEW COMMAND CENTER // 01
            </div>
            <p className="font-mono text-xs text-mut font-bold uppercase tracking-wider mt-2">
              SESSION DISPATCH: READY
            </p>
            <h1 className="mt-1 font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
              READY FOR THE <br />
              <span className="bg-ink text-[#C7FF2F] px-2 py-0.5 inline-block shadow-[4px_4px_0_#127533] mt-1">
                NEXT ROUND?
              </span>
            </h1>
          </div>
          <Link to="/app/practice" data-testid="dashboard-new-practice-btn" className="btn-terra !px-6 !py-3.5 !text-sm font-bold shadow-[4px_4px_0_#111111]">
            START NEW INTERVIEW <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>

      {/* 4 Brutalist Metric Blocks */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 font-mono">
        {[
          {
            icon: Gauge,
            label: "Communication Index",
            value: p.total > 0 && p.index > 0 ? `${p.index}/100` : "—",
            note: p.total > 0 ? "LAST 5 SESSIONS" : "NO TELEMETRY YET",
            badge: "INDEX",
            testid: "stat-index",
          },
          {
            icon: Target,
            label: "STAR Compliance",
            value: p.total > 0 ? `${p.starRate}%` : "—",
            note: p.total > 0 ? "3+ COMPONENTS" : "FIRST ROUND AWAITED",
            badge: "STRUCTURE",
            testid: "stat-star",
          },
          {
            icon: CalendarCheck,
            label: "This Week",
            value: p.weekCount || 0,
            note: "PRACTICE SESSIONS",
            badge: "VOLUME",
            testid: "stat-week",
          },
          {
            icon: Flame,
            label: "Practice Streak",
            value: `${p.streak || 0}d`,
            note: p.streak > 0 ? "CONSECUTIVE DAYS" : "INITIATE FIRST TURN",
            badge: "MOMENTUM",
            testid: "stat-streak",
          },
        ].map(({ icon: Icon, label, value, note, badge, testid }, i) => (
          <Reveal key={label} delay={i * 0.04} className="h-full">
            <div className="border-3 border-line bg-white p-5 shadow-[5px_5px_0_#111111] h-full flex flex-col justify-between" data-testid={testid}>
              <div className="flex items-center justify-between border-b-2 border-line pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mut">{label}</span>
                <span className="border border-line bg-paper px-1.5 py-0.2 text-[9px] font-bold text-ink">[{badge}]</span>
              </div>
              <div className="my-5">
                <p className="font-mono text-4xl font-black tracking-tight text-ink">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-mut">{note}</p>
              </div>
              <div className="border-t border-line pt-2 flex items-center justify-between text-[10px] text-mut font-bold">
                <span>SIGNAL // 0{i + 1}</span>
                <Icon className="h-4 w-4 text-ink" />
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Trajectory & Communication Index Gauge */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111] h-full" data-testid="score-trend-card">
            <div className="flex items-center justify-between border-b-2 border-line pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
                  SCORE TRAJECTORY
                </span>
                <h2 className="font-display text-2xl font-bold uppercase text-ink mt-2">Historical Performance Curve</h2>
                <p className="font-mono text-xs text-mut">Consolidated coaching scores across recent completed rounds</p>
              </div>
              {p.trend?.length > 1 && (
                <span className="border-2 border-line bg-[#C7FF2F] px-2.5 py-1 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_#111111]">
                  <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> TRENDING UP
                </span>
              )}
            </div>

            <div className="mt-6 h-64">
              {mounted && p.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={p.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="terraBrutal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C7FF2F" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#C7FF2F" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#111111" strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#111111", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#111111", strokeWidth: 2 }} />
                    <YAxis domain={[40, 100]} tick={{ fill: "#111111", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#111111", strokeWidth: 2 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 0, border: "2px solid #111111", background: "#FFFFFF", fontSize: 12, fontFamily: "monospace", boxShadow: "4px 4px 0 #111111" }}
                      formatter={(v) => [`${v}/100`, "SCORE"]}
                    />
                    <Area type="monotone" dataKey="score" stroke="#111111" strokeWidth={3} fill="url(#terraBrutal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center border-2 border-dashed border-line bg-paper p-6 text-center font-mono">
                  <p className="text-xs font-bold text-ink uppercase">NO SESSIONS COMPLETED YET.</p>
                  <p className="mt-1 text-[11px] text-mut">Your score trajectory curve will populate after your first practice turn.</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-4" delay={0.08}>
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111] flex h-full flex-col items-center justify-center gap-5 text-center" data-testid="index-ring-card">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-mut border border-line bg-paper px-2 py-0.5">
              [ AGENT CONSENSUS GAUGING ]
            </span>
            <ScoreRing value={p.total > 0 ? p.index : 0} size={160} />
            <div>
              <p className="font-display text-xl font-bold uppercase text-ink">Communication Index</p>
              <p className="mt-2 max-w-[240px] font-mono text-[11px] leading-relaxed text-mut font-medium">
                {p.total > 0
                  ? "Synthesized from relevance, clarity, STAR structure, completeness, and speech cadence."
                  : "Complete your first practice round to calculate your Communication Index."}
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Recent Sessions & Recurring Gaps */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111] h-full" data-testid="recent-sessions-card">
            <div className="flex items-center justify-between border-b-2 border-line pb-3">
              <h2 className="font-display text-2xl font-bold uppercase text-ink">Recent Sessions</h2>
              {recent.length > 0 && (
                <Link to="/app/sessions" className="border border-line bg-paper px-2.5 py-1 font-mono text-xs font-bold uppercase text-ink hover:bg-[#C7FF2F] transition-colors" data-testid="view-all-sessions-link">
                  VIEW ALL →
                </Link>
              )}
            </div>

            {recent.length > 0 ? (
              <div className="mt-4 divide-y-2 divide-line font-mono">
                {recent.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 py-3.5" data-testid="recent-session-row">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase text-ink tracking-tight font-sans">{s.questionText}</p>
                      <p className="mt-1 text-[10px] uppercase text-mut">
                        {compLabel(s.competency)} · {s.difficulty} · {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-xs font-black ${statusTone(s.overall)}`}>
                      {s.overall}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-line bg-paper p-8 text-center font-mono">
                <p className="font-display text-lg font-bold uppercase text-ink">NO INTERVIEWS YET.</p>
                <p className="mt-1 text-xs text-mut max-w-sm">YOUR FIRST BAD ANSWER IS WAITING TO HAPPEN. CRUSH IT BEFORE REAL INTERVIEWERS HEAR IT.</p>
                <Link to="/app/practice" className="btn-terra mt-4 !px-4 !py-2 !text-xs font-bold font-mono">
                  [ START PRACTICING → ]
                </Link>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={0.08}>
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111] h-full flex flex-col justify-between" data-testid="gaps-card">
            <div>
              <div className="flex items-center justify-between border-b-2 border-line pb-3">
                <h2 className="font-display text-2xl font-bold uppercase text-ink">Recurring Gaps</h2>
                <span className="chip !text-[10px] !bg-[#C7FF2F] !text-ink">COACH AGENT</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-mut uppercase">Speech patterns &amp; structural flaws detected across sessions</p>

              <div className="mt-6 space-y-4 font-mono">
                {(!p.gaps || p.gaps.length === 0) ? (
                  <div className="border-2 border-dashed border-line bg-paper p-6 text-center">
                    <p className="text-xs text-mut">
                      No recurring gaps yet. Flaws will be diagnosed across your practice rounds.
                    </p>
                  </div>
                ) : (
                  p.gaps.map((g: any) => (
                    <div key={g.key} data-testid={`gap-${g.key}`}>
                      <div className="flex items-baseline justify-between text-xs font-bold">
                        <span className="text-ink uppercase">{g.label}</span>
                        <span className="text-[#127533]">{g.pct}% OF SESSIONS</span>
                      </div>
                      <div className="mt-1.5 h-2.5 w-full border border-line bg-paper p-0.5">
                        <div className="h-full bg-[#127533]" style={{ width: `${g.pct}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {p.total > 0 && (
              <div className="mt-6 pt-4 border-t-2 border-line font-mono">
                <Link to="/app/plan" className="btn-ghost w-full text-center !text-xs font-bold" data-testid="gaps-plan-link">
                  OPEN IMPROVEMENT ROADMAP →
                </Link>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

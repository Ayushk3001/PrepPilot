// @ts-nocheck
'use client';

import { Link } from "@/lib/routerCompat";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  ArrowRight, ArrowUpRight, Flame, Target, CalendarCheck, Gauge, 
  Zap, Compass, Activity, ShieldAlert, Award, PlayCircle, Clock, ChevronRight
} from "lucide-react";
import { loadSessions, profile } from "@/lib/store";
import { COMPETENCIES } from "@/lib/mockData";
import { Reveal, ScoreRing, statusTone } from "@/components/ui-bits";
import { useEffect, useState } from "react";

const compLabel = (id: string) => COMPETENCIES.find((c) => c.id === id)?.label || id;

function TrajectoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  // Read the score from the active chart row itself. Recharts' formatter can
  // receive a stale value when adjacent points share the same formatted date.
  const point = payload[0]?.payload;
  const score = Number(point?.score);
  if (!Number.isFinite(score)) return null;

  return (
    <div className="border-2 border-line bg-white px-4 py-3 font-mono text-[11px] shadow-[4px_4px_0_#111111]">
      <div className="mb-2">{point.date}</div>
      <div>SCORE : {score}/100</div>
    </div>
  );
}

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
      {/* 1. ASYMMETRIC MISSION CONTROL HERO & FLIGHT DISPATCH HUD */}
      <Reveal>
        <div className="border-3 border-line bg-white shadow-[6px_6px_0_#111111] overflow-hidden">
          <div className="bg-ink text-paper px-6 py-2.5 flex flex-wrap items-center justify-between border-b-2 border-line font-mono text-xs font-bold uppercase">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-[#C7FF2F] animate-pulse" />
              <span>PREPPILOT_ // MISSION READINESS COCKPIT</span>
              <span className="text-white/40">|</span>
              <span className="text-[#C7FF2F]">5-AGENT NEURAL RUNWAY ONLINE</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-paper/70">
              <span>LATENCY: 38MS</span>
              <span>·</span>
              <span>TELEMETRY: SYNCHRONIZED</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Big Mission Title */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-block border border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink">
                LIVE INTERVIEW SIMULATION ENVIRONMENT
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-ink leading-[0.95]">
                STOP DRILLING BLIND. <br />
                <span className="bg-ink text-[#C7FF2F] px-2 py-0.5 inline-block mt-1 shadow-[3px_3px_0_#127533]">
                  COMMAND THE COCKPIT.
                </span>
              </h1>
              <p className="font-sans text-xs sm:text-sm text-ink2 font-medium max-w-xl leading-relaxed">
                Adaptive interview stress-testing tailored to your actual resume accomplishments. 
                5 specialist AI engines continuously evaluate structural rigor, verbal cadence, and technical depth.
              </p>
              
              <div className="pt-2 flex flex-wrap items-center gap-3 font-mono">
                <Link 
                  to="/app/practice" 
                  data-testid="dashboard-new-practice-btn" 
                  className="btn-terra !px-6 !py-3 !text-xs font-bold uppercase shadow-[4px_4px_0_#111111] inline-flex items-center gap-2 cursor-pointer"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>INITIALIZE NEW SORTIE →</span>
                </Link>
                <Link
                  to="/app/plan"
                  className="btn-ghost !px-4 !py-3 !text-xs font-bold uppercase cursor-pointer"
                >
                  VIEW TACTICAL ROADMAP
                </Link>
              </div>
            </div>

            {/* Right Column: Direct HUD Ring & Status Matrix */}
            <div className="lg:col-span-5 border-2 border-line bg-paper p-5 shadow-[4px_4px_0_#111111]" data-testid="index-ring-card">
              <div className="flex items-center justify-between border-b-2 border-line pb-2 mb-4 font-mono">
                <span className="text-[10px] font-black uppercase text-ink tracking-wider">[ FLIGHT STATUS GAUGING ]</span>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase border border-line ${p.total > 0 ? 'bg-[#C7FF2F] text-ink' : 'bg-white text-mut'}`}>
                  {p.total > 0 ? '● FLIGHT ACTIVE' : '○ STANDBY'}
                </span>
              </div>

              <div className="flex items-center gap-5">
                <div className="shrink-0">
                  <ScoreRing value={p.total > 0 ? p.index : 0} size={110} />
                </div>
                <div className="space-y-1 font-mono">
                  <p className="text-xs font-bold uppercase text-mut">READINESS QUOTIENT</p>
                  <p className="text-2xl font-black text-ink">
                    {p.total > 0 && p.index > 0 ? `${p.index}/100` : "00/100"}
                  </p>
                  <p className="text-[10px] font-sans text-ink2 leading-tight">
                    {p.total > 0 
                      ? "Weighted consensus across relevance, STAR structure, and technical depth." 
                      : "Launch your first round to establish flight baseline."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 2. FOUR TACTICAL TELEMETRY TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {[
          {
            icon: Gauge,
            label: "Readiness Index",
            value: p.total > 0 && p.index > 0 ? `${p.index}/100` : "—",
            note: p.total > 0 ? "CONSENSUS ACROSS 5 ENGINES" : "CALIBRATION AWAITED",
            badge: "INDEX",
            testid: "stat-index",
            accent: "border-l-6 border-l-[#C7FF2F]",
          },
          {
            icon: Target,
            label: "STAR Structural Rigor",
            value: p.total > 0 ? `${p.starRate}%` : "—",
            note: p.total > 0 ? "4-BEAT NARRATIVE HIT RATE" : "FIRST ROUND REQUIRED",
            badge: "FRAMEWORK",
            testid: "stat-star",
            accent: "border-l-6 border-l-[#127533]",
          },
          {
            icon: CalendarCheck,
            label: "Weekly Missions",
            value: p.weekCount || 0,
            note: "DRILLS COMPLETED THIS WEEK",
            badge: "VELOCITY",
            testid: "stat-week",
            accent: "border-l-6 border-l-ink",
          },
          {
            icon: Flame,
            label: "Tactical Habit Streak",
            value: `${p.streak || 0}d`,
            note: p.streak > 0 ? "CONSECUTIVE DAYS ACTIVE" : "COMMENCE DAILY SORTIE",
            badge: "MOMENTUM",
            testid: "stat-streak",
            accent: "border-l-6 border-l-[#FF5C35]",
          },
        ].map(({ icon: Icon, label, value, note, badge, testid, accent }, i) => (
          <Reveal key={label} delay={i * 0.03}>
            <div className={`border-3 border-line bg-white p-4 shadow-[4px_4px_0_#111111] h-full flex flex-col justify-between ${accent}`} data-testid={testid}>
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-[10px] font-black uppercase text-mut">{label}</span>
                <span className="border border-line bg-paper px-1.5 py-0.2 text-[9px] font-bold text-ink">[{badge}]</span>
              </div>
              <div className="my-3">
                <p className="text-3xl font-black text-ink">{value}</p>
                <p className="mt-1 text-[9px] font-bold uppercase text-mut">{note}</p>
              </div>
              <div className="border-t border-line pt-2 flex items-center justify-between text-[9px] text-mut font-bold">
                <span>CHANNEL 0{i + 1}</span>
                <Icon className="h-3.5 w-3.5 text-ink" />
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* 3. REORDERED ASYMMETRIC WORKSPACE: VULNERABILITY RADAR (LEFT 5 COLS) + TRAJECTORY (RIGHT 7 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vulnerability Scanner & Critical Gaps (Promoted to Primary Attention) */}
        <Reveal className="lg:col-span-5">
          <div className="border-3 border-line bg-white p-6 shadow-[5px_5px_0_#111111] h-full flex flex-col justify-between" data-testid="gaps-card">
            <div>
              <div className="flex items-center justify-between border-b-2 border-line pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#FF5C35]" />
                  <h2 className="font-mono text-lg font-black uppercase text-ink">VULNERABILITY SCANNER</h2>
                </div>
                <span className="chip !text-[9px] !bg-[#C7FF2F] !text-ink font-mono font-bold">COACH ENGINE</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-mut uppercase">Persistent speech crutches and structural narrative holes detected across turns</p>

              <div className="mt-5 space-y-3 font-mono">
                {(!p.gaps || p.gaps.length === 0) ? (
                  <div className="border-2 border-dashed border-line bg-paper p-6 text-center">
                    <p className="text-xs text-mut font-bold uppercase">ALL SYSTEMS NOMINAL</p>
                    <p className="mt-1 text-[11px] text-mut font-normal">Complete 2+ practice rounds to activate multi-session vulnerability scanning.</p>
                  </div>
                ) : (
                  p.gaps.map((g: any) => (
                    <div key={g.key} data-testid={`gap-${g.key}`} className="border-2 border-line bg-paper p-3 shadow-[2px_2px_0_#111111]">
                      <div className="flex items-baseline justify-between text-xs font-bold">
                        <span className="text-ink uppercase">{g.label}</span>
                        <span className="text-[#127533] bg-white px-1 border border-line">{g.pct}% INCIDENCE</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full border border-line bg-white p-0.5">
                        <div className="h-full bg-[#127533]" style={{ width: `${g.pct}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-line font-mono">
              <Link to="/app/plan" className="btn-ghost w-full text-center !text-xs font-bold" data-testid="gaps-plan-link">
                OPEN IMPROVEMENT ROADMAP →
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Performance Trajectory Vector (7 cols) */}
        <Reveal className="lg:col-span-7">
          <div className="border-3 border-line bg-white p-6 shadow-[5px_5px_0_#111111] h-full" data-testid="score-trend-card">
            <div className="flex items-center justify-between border-b-2 border-line pb-3">
              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
                  TELEMETRY LOGS
                </span>
                <h2 className="font-mono text-lg font-black uppercase text-ink mt-1">PERFORMANCE TRAJECTORY VECTOR</h2>
                <p className="font-mono text-[11px] text-mut">Historical multi-agent evaluation score curve</p>
              </div>
              {p.trend?.length > 1 && (
                <span className="border-2 border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0_#111111]">
                  <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> UPWARD VELOCITY
                </span>
              )}
            </div>

            <div className="mt-4 h-60">
              {mounted && p.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={p.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="prepBrutal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C7FF2F" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#C7FF2F" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#111111" strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#111111", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#111111", strokeWidth: 2 }} />
                    <YAxis domain={[40, 100]} tick={{ fill: "#111111", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#111111", strokeWidth: 2 }} />
                    <Tooltip content={<TrajectoryTooltip />} />
                    <Area type="monotone" dataKey="score" stroke="#111111" strokeWidth={3} fill="url(#prepBrutal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center border-2 border-dashed border-line bg-paper p-6 text-center font-mono">
                  <p className="text-xs font-bold text-ink uppercase">NO TELEMETRY LOGS RECORDED YET.</p>
                  <p className="mt-1 text-[11px] text-mut">Your score trajectory curve will populate after your initial practice turn.</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* 4. FULL-WIDTH MISSION FLIGHT LOGS TABLE */}
      <Reveal>
        <div className="border-3 border-line bg-white p-6 sm:p-7 shadow-[6px_6px_0_#111111]" data-testid="recent-sessions-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-line pb-4">
            <div>
              <div className="inline-block border border-line bg-paper px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-ink">
                MISSION ARCHIVE // RECENT FLIGHT RECORDS
              </div>
              <h2 className="font-mono text-xl sm:text-2xl font-black uppercase text-ink mt-1">
                RECENT FLIGHT SESSIONS
              </h2>
            </div>
            {recent.length > 0 && (
              <Link 
                to="/app/sessions" 
                className="btn-ghost !px-3 !py-1.5 !text-xs font-mono font-bold uppercase self-start sm:self-auto cursor-pointer" 
                data-testid="view-all-sessions-link"
              >
                VIEW FULL ARCHIVE ({sessions.length}) →
              </Link>
            )}
          </div>

          {recent.length > 0 ? (
            <div className="mt-4 divide-y-2 divide-line font-mono">
              {recent.map((s, idx) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 hover:bg-paper/40 px-2 transition-colors" data-testid="recent-session-row">
                  <div className="min-w-0 flex items-start gap-3">
                    <span className="border border-line bg-paper text-ink px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase text-ink tracking-tight font-sans">{s.questionText}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-mut uppercase">
                        <span className="bg-[#C7FF2F] text-ink px-1 border border-line">{compLabel(s.competency)}</span>
                        <span>·</span>
                        <span className="border border-line bg-white px-1">{s.difficulty}</span>
                        <span>·</span>
                        <span>{new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span className={`border-2 border-line px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0_#111111] ${statusTone(s.overall)}`}>
                      SCORE: {s.overall}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-line bg-paper p-8 text-center font-mono">
              <p className="font-mono text-lg font-black uppercase text-ink">ZERO FLIGHT SESSIONS RECORDED.</p>
              <p className="mt-1 text-xs text-mut max-w-sm uppercase">
                Your worst answer should happen in the simulator, never in front of the hiring committee.
              </p>
              <Link to="/app/practice" className="btn-terra mt-4 !px-6 !py-2.5 !text-xs font-bold font-mono uppercase cursor-pointer">
                [ LAUNCH INITIAL SIMULATION → ]
              </Link>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

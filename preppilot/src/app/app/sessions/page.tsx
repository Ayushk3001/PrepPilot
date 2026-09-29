'use client';

import { useMemo, useState, useEffect } from "react";
import { Link } from "@/lib/routerCompat";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, PenLine, ChevronDown, ArrowRight, Check, AlertCircle } from "lucide-react";
import { COMPETENCIES } from "@/lib/mockData";
import { loadSessions } from "@/lib/store";
import { ScoreBar, statusTone, Reveal } from "@/components/ui-bits";

const compLabel = (id: string) => COMPETENCIES.find((c) => c.id === id)?.label || id;

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [comp, setComp] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const list = loadSessions().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setSessions(list);
  }, []);

  const filtered = sessions.filter(
    (s) =>
      (comp === "All" || s.competency === comp) &&
      s.questionText.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-8" data-testid="sessions-page">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-line pb-6">
          <div>
            <div className="inline-flex items-center gap-2 border border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[11px] font-black text-ink uppercase tracking-wider">
              <span>● SYSTEM ARCHIVE</span>
              <span>//</span>
              <span>HISTORICAL AUDIT</span>
            </div>
            <h1 className="mt-3 font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-ink">
              EVERY ROUND RECORDED.
            </h1>
            <p className="mt-1 font-mono text-xs text-mut uppercase tracking-wider">
              VERBATIM TRANSCRIPTS · 5-AGENT SCORING · DETECTED STAR PHRASES · STRATEGIC DIRECTIVES
            </p>
          </div>
          <div className="font-mono text-xs font-bold text-ink bg-white border-2 border-line px-3 py-2 shadow-[2px_2px_0_#111111] shrink-0">
            TOTAL SESSIONS: <span className="bg-[#C7FF2F] px-1.5 border border-line ml-1">{sessions.length}</span>
          </div>
        </div>
      </Reveal>

      {sessions.length === 0 ? (
        <div className="border-3 border-line bg-white p-12 text-center shadow-[6px_6px_0_#111111]" data-testid="sessions-empty-state">
          <div className="inline-block border border-line bg-paper px-3 py-1 font-mono text-xs font-bold uppercase text-mut">
            STATUS: 0 SESSIONS LOGGED
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-black uppercase text-ink mt-4">
            NO INTERVIEWS YET.
          </p>
          <p className="mt-2 max-w-md mx-auto font-mono text-xs text-mut leading-relaxed uppercase">
            YOUR FIRST EVALUATION IS WAITING TO HAPPEN. LAUNCH A ROUND TO PRESERVE ITS COMPLETE COCKPIT AUDIT.
          </p>
          <div className="mt-6">
            <Link to="/app/practice" className="btn-terra inline-flex items-center gap-2 !px-6 !py-3 font-mono font-bold text-xs uppercase cursor-pointer">
              <span>START FIRST PRACTICE</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <Reveal delay={0.05}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-2 border-line bg-paper p-4 shadow-[4px_4px_0_#111111]">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
                <input
                  data-testid="history-search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SEARCH TRANSCRIPTS & PROMPTS..."
                  className="input-warm !pl-10 font-mono text-xs font-semibold placeholder:text-mut"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar font-mono">
                {["All", ...COMPETENCIES.map((c) => c.id)].map((id) => (
                  <button
                    key={id}
                    data-testid={`sessions-filter-${id}`}
                    onClick={() => setComp(id)}
                    className={`whitespace-nowrap border-2 border-line px-3 py-1.5 text-xs font-bold uppercase transition-all cursor-pointer ${
                      comp === id
                        ? "bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]"
                        : "bg-white text-ink hover:bg-paper"
                    }`}
                  >
                    {id === "All" ? "ALL" : compLabel(id).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="space-y-4" data-testid="sessions-list">
            {filtered.length === 0 && (
              <div className="border-2 border-dashed border-line bg-white p-10 text-center font-mono text-xs text-mut uppercase">
                NO SESSIONS MATCH FILTER: "{query || comp}"
              </div>
            )}
            {filtered.map((s, i) => (
              <Reveal key={s.id} delay={Math.min(i * 0.03, 0.3)}>
                <div className="border-3 border-line bg-white shadow-[4px_4px_0_#111111] overflow-hidden" data-testid="session-row">
                  <button
                    onClick={() => setOpenId(openId === s.id ? null : s.id)}
                    data-testid={`session-toggle-${s.id}`}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left cursor-pointer hover:bg-paper/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold text-mut">
                        <span className="bg-[#C7FF2F] text-ink border border-line px-1.5 py-0.2">
                          {compLabel(s.competency).toUpperCase()}
                        </span>
                        <span>·</span>
                        <span className="border border-line bg-paper px-1.5 py-0.2 text-ink">
                          {s.difficulty?.toUpperCase()}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 border border-line bg-paper px-1.5 py-0.2 text-ink">
                          {s.mode === "voice" ? <Mic className="h-3 w-3" /> : <PenLine className="h-3 w-3" />} {s.mode?.toUpperCase()}
                        </span>
                        <span>·</span>
                        <span>{new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}</span>
                      </div>
                      <p className="truncate font-sans text-sm font-bold text-ink">{s.questionText}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="border-2 border-line bg-white p-1 shadow-[2px_2px_0_#111111]">
                        <span
                          className={`block px-2.5 py-1 font-mono text-xs font-black uppercase ${statusTone(s.overall)}`}
                          data-testid={`session-score-${s.id}`}
                        >
                          SCORE: {s.overall}
                        </span>
                      </div>
                      <div className="border border-line p-1 bg-paper">
                        <ChevronDown className={`h-4 w-4 text-ink transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {openId === s.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t-2 border-line bg-paper"
                      >
                        <div className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-2" data-testid="session-detail">
                          <div className="space-y-4">
                            <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-1.5">
                              [ FIVE-VECTOR SCORE MATRIX ]
                            </p>
                            {Object.entries(s.scores || {}).map(([k, v]: [string, any]) => (
                              <ScoreBar key={k} label={k[0].toUpperCase() + k.slice(1)} value={v} />
                            ))}
                            <div className="border-2 border-line bg-white p-3 font-mono text-xs font-bold text-ink space-y-1">
                              <div className="flex justify-between">
                                <span>STAR STRUCTURE DETECTED:</span>
                                <span className="bg-[#C7FF2F] px-1 border border-line">{s.starFilled || 0}/4</span>
                              </div>
                              <div className="flex justify-between text-mut text-[11px]">
                                <span>SPEECH METRICS:</span>
                                <span>{s.metrics?.fillers || 0} FILLERS · {s.metrics?.words || 0} WORDS</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-5">
                            {Array.isArray(s.turns) && s.turns.length > 0 ? (
                              <div className="space-y-3">
                                <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-1.5">
                                  [ INTERVIEW ROUND TRANSCRIPT // {s.turns.length} TURNS ]
                                </p>
                                {s.turns.map((turn: any, index: number) => (
                                  <div key={`${turn.question?.id || index}-${index}`} className="border-2 border-line bg-white p-3.5 shadow-[2px_2px_0_#111111]">
                                    <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2 font-mono text-[10px] text-mut uppercase">
                                      <span className="font-bold text-ink">TURN 0{index + 1}</span>
                                      <span>SCORE {turn.result?.overall ?? '—'} · STAR {turn.result?.starFilled ?? 0}/4</span>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed text-ink font-sans">
                                      {turn.question?.text || turn.question?.question}
                                    </p>
                                    <p className="mt-2 border-l-2 border-line pl-2.5 py-1 bg-paper text-xs italic leading-relaxed text-ink2">
                                      “{turn.answer}”
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : s.answer && s.answer !== "(Archived practice response)" && (
                              <div>
                                <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-1.5 mb-2">
                                  [ VERBATIM CANDIDATE RESPONSE ]
                                </p>
                                <p className="border-2 border-line bg-white p-3.5 text-xs italic leading-relaxed text-ink2 shadow-[2px_2px_0_#111111]">
                                  "{s.answer}"
                                </p>
                              </div>
                            )}

                            <div className="border-2 border-line bg-white p-4 shadow-[2px_2px_0_#111111]">
                              <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-line pb-1.5 mb-2.5">
                                [ COACH DIRECTIVES & TAKEAWAYS ]
                              </p>
                              <ul className="space-y-2">
                                {[...(s.strengths || []), ...(s.improvements || [])].slice(0, 4).map((t: string, idx: number) => (
                                  <li key={idx} className="text-xs leading-relaxed text-ink flex items-start gap-2">
                                    <span className="font-bold text-[#127533]">▪</span>
                                    <span>{t}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

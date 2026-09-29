// @ts-nocheck
'use client';

import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/routerCompat";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Mic, Upload, FileText, CheckCircle2, 
  Sparkles, Building2, User, ChevronRight, Check, Compass, Award, ShieldCheck, Zap, PlayCircle, Radio
} from "lucide-react";
import { ROLES, DIFFICULTIES } from "@/lib/mockData";
import { parseResumeText, parseJDText, analyzeResumeJDMatch, normalizeResumeProfile, isCorruptOrGarbageProfile } from "@/lib/resumeParser";
import { 
  INTERVIEW_ROUNDS, 
  InterviewRoundKey, 
  extractResumeKnowledge, 
  buildEvidenceGraph 
} from "@/lib/resume/resumeKnowledge";
import { initializeSessionState, ResumeInterviewerAgent } from "@/agents/resumeInterviewerAgent";
import { DEFAULT_PROFILE, PROFILE_KEY, createEmptyProfile } from "@/lib/api";
import { Reveal } from "@/components/ui-bits";
import { createRequestId } from "@/lib/requestId";

export default function PracticeSetup() {
  const nav = useNavigate();

  // Custom Upload Inputs
  const [resumeText, setResumeText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [showUploadArea, setShowUploadArea] = useState<boolean>(false);
  const [isLaunchingInterview, setIsLaunchingInterview] = useState(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Practice Configuration
  const [role, setRole] = useState("aiml");
  const [selectedRoundKey, setSelectedRoundKey] = useState<InterviewRoundKey>('hr');
  const [difficulty, setDifficulty] = useState("Standard");

  // Load candidate profile from storage on mount if available
  const [activeProfile, setActiveProfile] = useState<any>(createEmptyProfile());
  const [hasProfile, setHasProfile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (isCorruptOrGarbageProfile(parsed)) {
            console.warn("Discarding corrupt binary profile from localStorage");
            localStorage.removeItem(PROFILE_KEY);
            localStorage.removeItem('cadence_profile_source');
            localStorage.removeItem('cadence_resume_diagnostic');
            setActiveProfile(createEmptyProfile());
            setHasProfile(false);
            return;
          }
          const normalized = normalizeResumeProfile(parsed);
          const name = String(normalized.name || normalized.basics?.fullName || '').trim();
          const hasData = Boolean(
            (name && !name.toLowerCase().includes('candidate') && !name.toLowerCase().includes('flatedecode')) ||
            (normalized.workExperience && normalized.workExperience.length > 0) || 
            (normalized.experience && normalized.experience.length > 0) ||
            (normalized.projects && normalized.projects.length > 0)
          );
          if (hasData) {
            setActiveProfile(normalized);
            setHasProfile(true);
            const allText = JSON.stringify(normalized).toLowerCase();
            if (allText.includes("machine learning") || allText.includes("ai/ml") || allText.includes("llm")) {
              setRole("aiml");
            } else if (allText.includes("product lead") || allText.includes("product manager")) {
              setRole("pm");
            } else {
              setRole("swe");
            }
          } else {
            setActiveProfile(createEmptyProfile());
            setHasProfile(false);
          }
        } catch (e) {
          console.error("Failed to parse stored profile", e);
          setActiveProfile(createEmptyProfile());
          setHasProfile(false);
        }
      } else {
        setActiveProfile(createEmptyProfile());
        setHasProfile(false);
      }
    }
  }, []);

  const handleResetCleanState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem('cadence_profile_source');
      localStorage.removeItem('cadence_resume_diagnostic');
      localStorage.removeItem('cadence_sessions_v1');
      localStorage.removeItem('cadence_profile_confirmed');
      sessionStorage.removeItem('cadence_resume_interview_session');
      sessionStorage.removeItem('cadence_active_interview_session');
      setActiveProfile(createEmptyProfile());
      setHasProfile(false);
      setResumeText('');
      setFileName('');
    }
  };

  const activeKnowledge = extractResumeKnowledge(activeProfile, resumeText || activeProfile.summary);
  const activeEvidence = activeKnowledge.evidenceGraph;
  const currentRound = INTERVIEW_ROUNDS[selectedRoundKey] || INTERVIEW_ROUNDS.hr;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsUploading(true);

    if (file.name.toLowerCase().match(/\.(pdf|docx)$/)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/onboarding/resume", {
          method: "POST",
          headers: { 'x-request-id': createRequestId('resume-upload') },
          body: fd,
        });
        const data = await res.json();
        if (data.profile && !isCorruptOrGarbageProfile(data.profile)) {
          const normalized = normalizeResumeProfile(data.profile);
          setActiveProfile(normalized);
          setHasProfile(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
            if (normalized.resumeId) localStorage.setItem('cadence_active_resume_id', normalized.resumeId);
            localStorage.setItem('cadence_profile_source', data.source || 'ai');
            sessionStorage.removeItem('cadence_resume_interview_session');
            sessionStorage.removeItem('cadence_active_interview_session');
            sessionStorage.removeItem('cadence_prepared_opening_question');
          }
        }
      } catch (err) {
        console.error("Failed to parse file", err);
      } finally {
        setIsUploading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setResumeText(content);
        if (content && !content.includes('%PDF-') && !content.includes('FlateDecode')) {
          const parsedResume = parseResumeText(content, activeProfile);
          if (!isCorruptOrGarbageProfile(parsedResume)) {
            const customProf = normalizeResumeProfile(parsedResume);
            setActiveProfile(customProf);
            setHasProfile(true);
            if (typeof window !== 'undefined') {
              localStorage.setItem(PROFILE_KEY, JSON.stringify(customProf));
              localStorage.setItem('cadence_profile_source', 'uploaded');
            }
          }
        }
        setIsUploading(false);
      };
      reader.readAsText(file);
    }
  };

  const startSession = async () => {
    if (isLaunchingInterview) return;
    setIsLaunchingInterview(true);
    const knowledge = extractResumeKnowledge(activeProfile, resumeText || activeProfile.summary);
    const sessionState = initializeSessionState(knowledge, selectedRoundKey, role, difficulty);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cadence_resume_interview_session', JSON.stringify(sessionState));
      sessionStorage.removeItem('cadence_active_interview_session');
      sessionStorage.removeItem('cadence_prepared_opening_question');
    }

    let preparedQuestion: any = null;
    let preparedState: any = null;
    try {
      const response = await fetch('/api/interviewer/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId('opening-question') },
        body: JSON.stringify({ sessionState }),
      });
      if (response.ok) {
        const prepared = await response.json();
        if (prepared.nextQuestion && prepared.sessionState) {
          preparedQuestion = prepared.nextQuestion;
          preparedState = prepared.sessionState;
        }
      }
    } catch (error) {
      console.warn('Opening question prefetch failed; using interview fallback.', error);
    }

    if (!preparedQuestion) {
      const fallback = await ResumeInterviewerAgent.decideNextQuestion(sessionState);
      preparedQuestion = fallback.nextQuestion;
      preparedState = fallback.updatedState;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cadence_resume_interview_session', JSON.stringify(preparedState));
      sessionStorage.setItem('cadence_prepared_opening_question', JSON.stringify(preparedQuestion));
    }

    nav(`/app/session?round=${selectedRoundKey}&role=${role}&diff=${encodeURIComponent(difficulty)}`);
  };

  const candidateDisplayName = activeProfile.name || activeProfile.basics?.fullName || "Candidate";

  return (
    <div className="space-y-8 pb-16" data-testid="practice-setup-page">
      {/* 1. TOP HEADER STRIP */}
      <Reveal>
        <div className="border-b-3 border-line pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-ink shadow-[2px_2px_0_#111111]">
              <span className="h-2 w-2 bg-ink" />
              PREPPILOT_ // MISSION CALIBRATION DECK
            </div>
            <h1 className="mt-2 font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-ink">
              STAGE YOUR FLIGHT.
            </h1>
            <p className="mt-1 font-mono text-xs text-mut uppercase tracking-wider">
              CONFIGURE YOUR TARGET OBJECTIVE · CALIBRATE SENIORITY · INITIALIZE PROBES
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs font-bold bg-white border-2 border-line p-2 shadow-[2px_2px_0_#111111] shrink-0">
            <span className="h-2 w-2 rounded-full bg-[#127533] animate-pulse" />
            <span className="text-ink">STATUS: READY TO ARM</span>
          </div>
        </div>
      </Reveal>

      {/* 2. ASYMMETRIC TWO-COLUMN STAGING WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: THE CONFIGURATION WORKBENCH (7 cols) */}
        <div className="lg:col-span-7 space-y-7">
          {/* Career Dossier Box */}
          {hasProfile ? (
            <Reveal delay={0.02}>
              <div className="border-3 border-line bg-white p-5 sm:p-6 shadow-[5px_5px_0_#111111]" data-testid="resume-intelligence-card">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b-2 border-line pb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]">
                      <Check className="h-5 w-5 stroke-[3]" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-mono text-base font-black uppercase text-ink">CAREER DOSSIER VAULT</h2>
                        <span className="bg-[#C7FF2F] border border-line px-1.5 py-0.2 font-mono text-[9px] font-black uppercase text-ink">
                          ● GROUNDED
                        </span>
                      </div>
                      <p className="font-mono text-xs text-mut mt-0.5">
                        PILOT: <strong className="text-ink font-bold">{candidateDisplayName}</strong> · <span className="bg-paper px-1 border border-line">{activeEvidence.length} NODES</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs font-bold">
                    <button
                      onClick={() => setShowUploadArea(!showUploadArea)}
                      className="border border-line bg-paper px-2 py-1 text-ink hover:bg-[#C7FF2F] transition-colors cursor-pointer text-[11px]"
                    >
                      {showUploadArea ? "[ CLOSE ]" : "[ UPDATE DOSSIER ]"}
                    </button>
                    <button
                      onClick={handleResetCleanState}
                      className="border border-line bg-paper px-2 py-1 text-[#FF5C35] hover:bg-[#FFEFEA] transition-colors cursor-pointer text-[11px]"
                    >
                      [ PURGE ]
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 font-mono">
                  <span className="text-[10px] uppercase font-bold text-mut tracking-wider">[ VERIFIED CAREER MILESTONES ]</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeEvidence.filter(item => item.category === 'experience' || item.category === 'venture').slice(0, 4).map((item) => (
                      <span key={item.id} className="border border-line bg-paper px-2 py-1 text-[11px] font-bold text-ink">
                        <span>{item.topic}</span>{item.role ? <span className="ml-1">// {item.role}</span> : ''}{item.organization ? <span className="ml-1 text-mut">// {item.organization}</span> : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.02}>
              <div className="border-3 border-line bg-white p-5 sm:p-6 shadow-[5px_5px_0_#111111]" data-testid="resume-onboarding-card">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
                      [ DOSSIER MISSING ]
                    </span>
                    <h3 className="mt-1 font-mono text-lg font-black uppercase text-ink">
                      INGEST RESUME FOR ZERO-HALLUCINATION PROBING
                    </h3>
                    <p className="mt-1 font-sans text-xs text-ink2">
                      Upload your real background to calibrate trade-offs, architecture decisions, and metrics.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          {/* Upload Dropzone */}
          {(!hasProfile || showUploadArea) && (
            <Reveal delay={0.04}>
              <div className="border-3 border-line bg-white p-5 shadow-[4px_4px_0_#111111] space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">[ RESUME INGESTION PROTOCOL ]</span>
                  <span className="text-[10px] text-mut uppercase">PDF / DOCX / TEXT</span>
                </div>
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-line bg-paper hover:bg-[#C7FF2F]/30 transition-all cursor-pointer">
                  <Upload className="h-5 w-5 text-ink mb-1.5" />
                  <span className="text-xs font-bold text-ink uppercase text-center">
                    {fileName || "DRAG CAREER DOSSIER HERE OR BROWSE"}
                  </span>
                  <input type="file" accept=".txt,.pdf,.docx,.md" onChange={handleFileUpload} className="hidden" />
                </label>
                <textarea
                  rows={2}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Or paste resume text directly here for instant ingestion…"
                  className="input-warm text-xs resize-none"
                />
              </div>
            </Reveal>
          )}

          {/* Section 01: Target Role Selector */}
          <Reveal delay={0.06}>
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-line pb-1.5 font-mono">
                <span className="text-xs font-black uppercase tracking-wider text-ink">[ 01 · TARGET ROLE SPECIFICATION ]</span>
                <span className="text-[10px] text-mut uppercase">SETS RUBRICS</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5" data-testid="practice-role-select">
                {ROLES.map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`border-2 p-2.5 text-left transition-all cursor-pointer font-mono ${
                        active
                          ? "border-line bg-[#C7FF2F] text-ink shadow-[3px_3px_0_#111111] translate-x-0.5"
                          : "border-line bg-white text-ink hover:bg-paper"
                      }`}
                    >
                      <p className="text-xs font-black uppercase truncate">{r.label}</p>
                      <p className="mt-0.5 text-[9px] uppercase text-mut font-bold">{r.tag}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          </Reveal>

          {/* Section 02: 6 Round Mission Objectives */}
          <Reveal delay={0.08}>
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-line pb-1.5 font-mono">
                <span className="text-xs font-black uppercase tracking-wider text-ink">[ 02 · MISSION OBJECTIVE SELECTOR ]</span>
                <span className="text-[10px] text-mut uppercase">6 SPECIALIZED DRILLS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" data-testid="practice-category-select">
                {Object.values(INTERVIEW_ROUNDS).map((r) => {
                  const active = selectedRoundKey === r.key;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setSelectedRoundKey(r.key)}
                      className={`border-3 p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        active
                          ? "border-line bg-[#C7FF2F] text-ink shadow-[4px_4px_0_#111111]"
                          : "border-line bg-white text-ink hover:bg-paper"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase border-b border-line pb-1.5">
                          <span className="bg-paper px-1 border border-line">{r.coreQuestionCount} QUESTIONS</span>
                          <span>{r.estimatedDuration}</span>
                        </div>
                        <h3 className="font-mono text-sm font-black uppercase text-ink mt-2">{r.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-ink2 font-sans font-medium line-clamp-2">{r.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-line font-mono text-[9px] font-bold uppercase tracking-wider text-mut flex items-center justify-between">
                        <span>OBJECTIVE</span>
                        <span className={`px-1 border ${active ? 'bg-ink text-[#C7FF2F] border-ink' : 'border-line bg-paper text-ink'}`}>
                          {active ? "● SELECTED" : "SELECT"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </Reveal>

          {/* Section 03: Difficulty Grading */}
          <Reveal delay={0.1}>
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-line pb-1.5 font-mono">
                <span className="text-xs font-black uppercase tracking-wider text-ink">[ 03 · SENIORITY RIGOR THRESHOLD ]</span>
                <span className="text-[10px] text-mut uppercase">GRADING INTENSITY</span>
              </div>
              <div className="flex flex-wrap gap-2.5 font-mono">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    data-testid={`chip-${d.toLowerCase()}`}
                    className={`border-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      difficulty === d
                        ? "border-line bg-[#111111] text-[#C7FF2F] shadow-[3px_3px_0_#C7FF2F]"
                        : "border-line bg-white text-ink hover:bg-paper"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </section>
          </Reveal>
        </div>

        {/* RIGHT COLUMN: STICKY PRE-FLIGHT BRIEFING MANIFEST & LAUNCH COCKPIT (5 cols) */}
        <div className="lg:col-span-5 sticky top-20">
          <Reveal delay={0.12}>
            <div className="border-3 border-line bg-white p-6 shadow-[7px_7px_0_#111111] space-y-6">
              <div className="border-b-2 border-line pb-4">
                <div className="flex items-center justify-between font-mono text-[10px] font-black uppercase text-mut">
                  <span>FLIGHT MANIFEST</span>
                  <span className="bg-[#C7FF2F] px-1.5 py-0.2 border border-line text-ink">CONFIRMED</span>
                </div>
                <h3 className="font-mono text-2xl font-black uppercase text-ink mt-2">
                  {currentRound.name.toUpperCase()}
                </h3>
                <p className="font-mono text-xs text-mut mt-0.5">
                  ESTIMATED DURATION: <strong className="text-ink">{currentRound.estimatedDuration}</strong>
                </p>
              </div>

              {/* Mission Parameters Checklist */}
              <div className="space-y-2 font-mono text-xs">
                <p className="text-[10px] font-bold uppercase text-mut">[ FLIGHT VERIFICATION CHECKLIST ]</p>
                <div className="border-2 border-line bg-paper p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-ink">CAREER DOSSIER:</span>
                    <span className="font-bold text-[#127533]">{hasProfile ? `GROUNDED (${activeEvidence.length} NODES)` : 'GENERIC MODE'}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line/50 pt-1.5">
                    <span className="text-ink">ROLE EXPECTATION:</span>
                    <span className="font-bold text-ink bg-white px-1 border border-line">{role.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line/50 pt-1.5">
                    <span className="text-ink">SENIORITY BAR:</span>
                    <span className="font-bold text-ink bg-white px-1 border border-line">{difficulty.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line/50 pt-1.5">
                    <span className="text-ink">5 SPECIALIST AGENTS:</span>
                    <span className="font-bold text-[#127533]">ONLINE</span>
                  </div>
                </div>
              </div>

              {/* What will be probed briefing */}
              <div className="border-2 border-line bg-paper p-4 font-mono">
                <p className="text-[10px] font-bold uppercase text-ink">[ DRILL FOCUS AREA ]</p>
                <p className="mt-1 text-xs font-sans text-ink2 leading-relaxed font-medium">
                  {currentRound.description}
                </p>
              </div>

              {/* Input Modality Notice */}
              <div className="flex items-center gap-3 border-2 border-line bg-white p-3 font-mono">
                <Mic className="h-5 w-5 text-ink shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-ink uppercase">VOICE OR KEYBOARD INPUT</p>
                  <p className="text-[10px] text-mut uppercase">Multimodal speech or text response</p>
                </div>
              </div>

              {/* The Master Launch Button */}
              <div className="pt-2 font-mono">
                <button
                  data-testid="practice-start-btn"
                  onClick={startSession}
                  disabled={isLaunchingInterview}
                  className="btn-terra !px-6 !py-4 w-full font-bold !text-sm shadow-[5px_5px_0_#111111] cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>{isLaunchingInterview ? 'INITIALIZING INTERVIEW COCKPIT…' : 'INITIALIZE FLIGHT MISSION →'}</span>
                </button>
                <p className="mt-2 text-[10px] text-center text-mut uppercase font-bold">
                  TELEMETRY RECORDING READY ON LAUNCH
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

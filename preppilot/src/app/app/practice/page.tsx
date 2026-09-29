// @ts-nocheck
'use client';

import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/routerCompat";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Mic, Upload, FileText, CheckCircle2, 
  Sparkles, Building2, User, ChevronRight, Check, Compass, Award, ShieldCheck
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

export default function PracticeSetup() {
  const nav = useNavigate();

  // Custom Upload Inputs
  const [resumeText, setResumeText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [showUploadArea, setShowUploadArea] = useState<boolean>(false);
  const [showEvidence, setShowEvidence] = useState<boolean>(false);
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
          body: fd,
        });
        const data = await res.json();
        if (data.profile && !isCorruptOrGarbageProfile(data.profile)) {
          const normalized = normalizeResumeProfile(data.profile);
          setActiveProfile(normalized);
          setHasProfile(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
            localStorage.setItem('cadence_profile_source', data.source || 'ai');
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
        headers: { 'Content-Type': 'application/json' },
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
    <div className="mx-auto max-w-5xl space-y-10 pb-16" data-testid="practice-setup-page">
      {/* Page Title */}
      <Reveal>
        <div className="border-b-3 border-line pb-6">
          <div className="inline-flex items-center gap-2 border-2 border-line bg-[#C7FF2F] px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-ink shadow-[2px_2px_0_#111111]">
            <span className="h-2 w-2 bg-ink" />
            PRACTICE ARENA // CONFIGURATION
          </div>
          <h1 className="mt-3 font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
            INTERVIEW WITH AN AI THAT HAS <br />
            <span className="bg-ink text-[#C7FF2F] px-2 py-0.5 inline-block shadow-[4px_4px_0_#127533] mt-1">
              READ YOUR RESUME.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
            Your interview is fully personalized using your actual companies, stack, projects, and metrics.
            The AI Interviewer probes claims, tests trade-offs, and follows up adaptively.
          </p>
        </div>
      </Reveal>

      {/* Resume Grounding Card */}
      {hasProfile ? (
        <Reveal delay={0.03}>
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111]" data-testid="resume-intelligence-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b-2 border-line pb-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]">
                  <Check className="h-5 w-5 stroke-[3]" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-bold uppercase text-ink">Resume Intelligence</h2>
                    <span className="border-2 border-line bg-[#C7FF2F] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
                      VERIFIED RESUME
                    </span>
                    <span className="border-2 border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                      {activeEvidence.length} EVIDENCE NODES
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-xs text-ink2 font-medium">
                    Grounding active for <strong className="text-ink">{candidateDisplayName}</strong>. Questions will target your verified accomplishments.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-bold">
                <button
                  onClick={() => setShowUploadArea(!showUploadArea)}
                  className="border border-line bg-paper px-2.5 py-1 text-ink hover:bg-[#C7FF2F] transition-colors cursor-pointer"
                >
                  {showUploadArea ? "[ HIDE UPDATER ]" : "[ UPDATE RESUME ]"}
                </button>
                <button
                  onClick={handleResetCleanState}
                  className="border border-line bg-paper px-2.5 py-1 text-[#FF5C35] hover:bg-[#FFEFEA] transition-colors cursor-pointer"
                >
                  [ CLEAR ]
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-mut tracking-wider">[ EXTRACTED EXPERIENCES ]</span>
                <span className="text-[10px] text-[#127533] font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> ZERO-HALLUCINATION GROUNDING
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeEvidence.filter(item => item.category === 'experience' || item.category === 'venture').slice(0, 4).map((item) => (
                  <span key={item.id} className="border-2 border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink shadow-[2px_2px_0_#111111]">
                    <strong>{item.topic}</strong> {item.role ? `// ${item.role}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.03}>
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[6px_6px_0_#111111]" data-testid="resume-onboarding-card">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink shadow-[3px_3px_0_#111111]">
                <FileText className="h-6 w-6" />
              </span>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
                  [ STEP 01 // RESUME MISSING ]
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold uppercase text-ink">
                  Add your resume for grounded practice questions.
                </h3>
                <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-ink2 font-medium">
                  We'll parse your real stack, systems, and metrics to grill your actual achievements.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Upload Box */}
      {(!hasProfile || showUploadArea) && (
        <Reveal delay={0.05}>
          <div className="border-3 border-line bg-white p-6 sm:p-7 shadow-[5px_5px_0_#111111] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b-2 border-line pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">[ RESUME INGESTION ]</span>
              <span className="text-[10px] text-mut uppercase">PDF // DOCX // TEXT</span>
            </div>
            <label className="flex flex-col items-center justify-center p-6 border-3 border-dashed border-line bg-paper hover:bg-[#C7FF2F]/30 transition-all cursor-pointer">
              <Upload className="h-6 w-6 text-ink mb-2" />
              <span className="text-xs font-bold text-ink uppercase">
                {fileName || "DRAG RESUME FILE HERE OR CLICK TO BROWSE"}
              </span>
              <input type="file" accept=".txt,.pdf,.docx,.md" onChange={handleFileUpload} className="hidden" />
            </label>
            <textarea
              rows={3}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Or paste resume plain text directly here…"
              className="input-warm text-xs resize-none"
            />
          </div>
        </Reveal>
      )}

      {/* Section 01: Target Role */}
      <Reveal delay={0.07}>
        <section>
          <div className="flex items-center justify-between mb-3 border-b-2 border-line pb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">[ 01 · TARGET ROLE SPECIFICATION ]</span>
            <span className="text-[10px] text-mut uppercase">CALIBRATES RUBRICS</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="practice-role-select">
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`border-2 p-3 text-left transition-all duration-100 cursor-pointer font-mono ${
                    active
                      ? "border-line bg-[#C7FF2F] text-ink shadow-[3px_3px_0_#111111] translate-x-0.5"
                      : "border-line bg-white text-ink hover:bg-paper"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-tight truncate">{r.label}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-wider text-mut font-bold">{r.tag}</p>
                </button>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Section 02: Interview Rounds */}
      <Reveal delay={0.09}>
        <section>
          <div className="flex items-center justify-between mb-3 border-b-2 border-line pb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">[ 02 · SELECT INTERVIEW ROUND ]</span>
            <span className="text-[10px] text-mut uppercase">6 SPECIALIZED MODES</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="practice-category-select">
            {Object.values(INTERVIEW_ROUNDS).map((r) => {
              const active = selectedRoundKey === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setSelectedRoundKey(r.key)}
                  className={`border-3 p-5 text-left transition-all duration-100 cursor-pointer flex flex-col justify-between ${
                    active
                      ? "border-line bg-[#C7FF2F] text-ink shadow-[5px_5px_0_#111111] translate-x-1"
                      : "border-line bg-white text-ink hover:bg-paper"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase border-b-2 border-line pb-2">
                      <span>{r.coreQuestionCount} QUESTIONS</span>
                      <span className="bg-paper px-1.5 py-0.2 border border-line text-ink">{r.estimatedDuration}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ink mt-3">{r.name}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink2 font-medium font-sans line-clamp-2">{r.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line font-mono text-[9px] font-bold uppercase tracking-wider text-mut">
                    MODE // {active ? "SELECTED" : "AVAILABLE"}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Section 03: Difficulty */}
      <Reveal delay={0.11}>
        <section>
          <div className="flex items-center justify-between mb-3 border-b-2 border-line pb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">[ 03 · SENIORITY CALIBRATION ]</span>
            <span className="text-[10px] text-mut uppercase">DIFFICULTY GRADING</span>
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

      {/* Confirmation & Launch Screen */}
      <Reveal delay={0.13}>
        <div className="border-3 border-line bg-white p-7 sm:p-9 shadow-[8px_8px_0_#111111] space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-line pb-6">
            <div>
              <span className="border-2 border-line bg-[#C7FF2F] px-3 py-1 font-mono text-xs font-bold uppercase text-ink shadow-[2px_2px_0_#111111]">
                {currentRound.name.toUpperCase()}
              </span>
              <h3 className="font-display text-3xl font-extrabold uppercase text-ink mt-3">
                {currentRound.coreQuestionCount} Core Questions + Adaptive Probing
              </h3>
              <p className="font-mono text-xs text-mut mt-1">
                DURATION: <strong className="text-ink">{currentRound.estimatedDuration}</strong> · CANDIDATE: <strong className="text-ink">{candidateDisplayName}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 border-2 border-line bg-paper p-3 shadow-[2px_2px_0_#111111] font-mono">
              <Mic className="h-5 w-5 text-ink" />
              <div className="text-xs">
                <p className="font-bold text-ink uppercase">VOICE OR TEXT</p>
                <p className="text-[10px] text-mut uppercase">SPEAK OR TYPE</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="border-2 border-line bg-paper p-3.5 shadow-[2px_2px_0_#111111]">
              <p className="font-bold uppercase text-ink">[ RESUME GROUNDED ]</p>
              <p className="mt-1 text-[11px] text-mut font-sans font-medium">
                {activeEvidence.length > 0 ? `Probing ${activeEvidence.length} verified project nodes` : "Tested against real tech background"}
              </p>
            </div>
            <div className="border-2 border-line bg-paper p-3.5 shadow-[2px_2px_0_#111111]">
              <p className="font-bold uppercase text-ink">[ ROLE TARGET ]</p>
              <p className="mt-1 text-[11px] text-mut font-sans font-medium">Calibrated for {role.toUpperCase()} expectations</p>
            </div>
            <div className="border-2 border-line bg-paper p-3.5 shadow-[2px_2px_0_#111111]">
              <p className="font-bold uppercase text-ink">[ ADAPTIVE FOLLOW-UPS ]</p>
              <p className="mt-1 text-[11px] text-mut font-sans font-medium">Specialist agents evaluate and probe weaknesses</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 font-mono">
            <p className="text-xs text-mut uppercase font-bold">
              AI INTERVIEWER IS INITIALIZED AND READY TO OPEN THE ROOM.
            </p>
            <button
              data-testid="practice-start-btn"
              onClick={startSession}
              disabled={isLaunchingInterview}
              className="btn-terra !px-8 !py-4 w-full sm:w-auto font-bold !text-sm shadow-[4px_4px_0_#111111] cursor-pointer"
            >
              <span>{isLaunchingInterview ? 'INITIALIZING INTERVIEW COCKPIT…' : 'ENTER INTERVIEW ROOM →'}</span>
            </button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

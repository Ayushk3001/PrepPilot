// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@/lib/routerCompat";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Check, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import api, { formatApiError } from "@/lib/api";

const STEPS = ["Account", "Resume", "AI Profile"];
const STAGES = [
  "Uploading",
  "Reading Resume",
  "Extracting Information",
  "Building AI Profile",
  "Profile Ready"
];

export default function ResumeUpload() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stageIdx, setStageIdx] = useState(-1);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState<{
    name: string;
    expCount: number;
    projCount: number;
    skillsCount: number;
  } | null>(null);

  const run = async (chosen: File) => {
    setError("");
    if (!chosen.name.toLowerCase().match(/\.(pdf|docx|txt)$/)) {
      setError("Unsupported format. Please upload a PDF or DOCX file.");
      return;
    }
    if (chosen.size > 10 * 1024 * 1024) {
      setError("File too large — please keep it under 10 MB.");
      return;
    }
    setFile(chosen);
    setStatus("processing");
    setStageIdx(0);
    const timer = setInterval(() => setStageIdx((i) => Math.min(i + 1, 3)), 1600);
    try {
      const fd = new FormData();
      fd.append("file", chosen);
      const res = await api.post("/onboarding/resume", fd);

      if (typeof window !== "undefined" && res?.data?.profile) {
        localStorage.setItem("cadence_candidate_profile", JSON.stringify(res.data.profile));
        localStorage.setItem("cadence_profile_source", res.data.source || "ai");
        if (res.data.diagnostic) {
          localStorage.setItem("cadence_resume_diagnostic", JSON.stringify(res.data.diagnostic));
        }

        const prof = res.data.profile;
        setExtractedSummary({
          name: prof.basics?.fullName || prof.name || "",
          expCount: (prof.workExperience || prof.experience || []).length,
          projCount: (prof.projects || []).length,
          skillsCount: (prof.technicalSkills || prof.technical_skills || []).length,
        });
      }

      clearInterval(timer);
      setStageIdx(4);
      setStatus("done");
      setTimeout(() => nav("/onboarding/profile"), 1200);
    } catch (e: any) {
      clearInterval(timer);
      setError(formatApiError(e));
      setStatus("error");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (status === "processing" || status === "done") return;
    const f = e.dataTransfer.files?.[0];
    if (f) run(f);
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper" data-testid="resume-upload-page">
      <header className="border-b-2 border-line bg-paper px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" data-testid="upload-home-link">
            <Logo />
          </Link>
          <div className="font-mono text-xs font-bold text-mut uppercase">
            [ RESUME / INTELLIGENCE INGESTION ]
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-xl">
          {/* Stepper Header */}
          <div className="mb-6 flex items-center gap-2 font-mono" data-testid="onboarding-stepper-resume">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`flex-1 border-t-4 ${i <= 1 ? "border-[#C7FF2F]" : "border-line"}`}
              />
            ))}
            <span className="ml-2 text-xs font-bold uppercase tracking-wider text-ink">
              [ 02 · {STEPS[1].toUpperCase()} ]
            </span>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-ink tracking-tight">
              UPLOAD YOUR RESUME.
            </h1>
            <p className="mt-2 font-sans text-sm text-ink2 leading-relaxed font-medium">
              The AI Profile Agent ingests your projects, stack, and metrics so your mock interview questions fit your exact background.
            </p>
          </div>

          {/* Brutalist Dropzone Card */}
          <div className="border-3 border-line bg-white p-7 sm:p-9 shadow-[8px_8px_0_#111111]" data-testid="upload-card">
            <AnimatePresence mode="wait">
              {status === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    data-testid="upload-dropzone"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center border-3 border-dashed px-6 py-12 text-center transition-all ${
                      dragging ? "border-line bg-[#C7FF2F]" : "border-line bg-paper hover:bg-[#C7FF2F]/30"
                    }`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink shadow-[3px_3px_0_#111111]">
                      <UploadCloud className="h-7 w-7" />
                    </span>
                    <p className="mt-5 font-display text-lg font-bold uppercase text-ink">
                      DROP RESUME FILE HERE
                    </p>
                    <p className="mt-1 font-mono text-xs text-mut font-bold">
                      OR CLICK TO SELECT FROM FILESYSTEM
                    </p>
                    <div className="mt-6 flex gap-2 font-mono">
                      <span className="border border-line bg-white px-2 py-0.5 text-xs font-bold text-ink">PDF</span>
                      <span className="border border-line bg-white px-2 py-0.5 text-xs font-bold text-ink">DOCX</span>
                      <span className="border border-line bg-white px-2 py-0.5 text-xs font-bold text-mut">MAX 10MB</span>
                    </div>
                    <input
                      ref={inputRef}
                      data-testid="upload-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && run(e.target.files[0])}
                    />
                  </div>
                  <button
                    onClick={() => nav("/onboarding/profile")}
                    data-testid="upload-skip-btn"
                    className="mt-6 w-full text-center font-mono text-xs font-bold uppercase text-mut hover:text-ink hover:underline cursor-pointer"
                  >
                    → CONTINUE MANUALLY WITHOUT A RESUME
                  </button>
                </motion.div>
              )}

              {status === "processing" && (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="upload-processing">
                  <div className="flex items-center gap-3 border-2 border-line bg-paper p-3 shadow-[2px_2px_0_#111111]">
                    <FileText className="h-5 w-5 shrink-0 text-ink" />
                    <p className="truncate font-mono text-xs font-bold text-ink uppercase">{file?.name}</p>
                  </div>
                  <div className="mt-6 space-y-2 font-mono" data-testid="processing-stages">
                    {STAGES.map((s, i) => {
                      const active = i === stageIdx;
                      const done = i < stageIdx;
                      return (
                        <div
                          key={s}
                          className={`flex items-center gap-3 border-2 px-3 py-2 text-xs font-bold transition-all ${
                            active
                              ? "border-line bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]"
                              : done
                              ? "border-line bg-paper text-ink"
                              : "border-line2 bg-white text-mut opacity-50"
                          }`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] ${
                            done ? "bg-ink text-[#C7FF2F] border-line" : active ? "bg-ink text-[#C7FF2F] border-line" : "border-line text-mut"
                          }`}>
                            {done ? <Check className="h-3 w-3 stroke-[3]" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                          </span>
                          <span className="uppercase tracking-wider">{s}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 h-2 w-full border-2 border-line bg-paper p-0.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-[#127533]"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}

              {status === "done" && (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-6 text-center" data-testid="upload-success">
                  <span className="flex h-14 w-14 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink shadow-[4px_4px_0_#111111]">
                    <Check className="h-7 w-7 stroke-[3]" />
                  </span>
                  <p className="mt-4 font-display text-2xl font-bold uppercase text-ink">PROFILE READY</p>
                  <p className="mt-1 font-mono text-xs font-bold text-ink2">
                    {extractedSummary?.name ? `CANDIDATE: ${extractedSummary.name.toUpperCase()}` : "RESUME PARSED SUCCESSFULLY."}
                  </p>
                  {extractedSummary && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2 font-mono">
                      <span className="border-2 border-line bg-paper px-2 py-1 text-xs font-bold">{extractedSummary.expCount} EXPERIENCE</span>
                      <span className="border-2 border-line bg-paper px-2 py-1 text-xs font-bold">{extractedSummary.projCount} PROJECTS</span>
                      <span className="border-2 border-line bg-paper px-2 py-1 text-xs font-bold">{extractedSummary.skillsCount} SKILLS</span>
                    </div>
                  )}
                  <p className="mt-4 font-mono text-[10px] text-mut uppercase font-bold animate-pulse">
                    OPENING CANDIDATE AI PROFILE FOR INSPECTION…
                  </p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="upload-error">
                  <div className="flex items-start gap-3 border-2 border-line bg-[#FFEFEA] p-4 text-[#FF5C35]">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-bold uppercase">EXTRACTION ERROR</p>
                      <p className="mt-1 text-xs leading-relaxed font-sans font-medium">{error}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => { setStatus("idle"); setError(""); }}
                      data-testid="upload-retry-btn"
                      className="btn-ghost !text-xs font-mono font-bold"
                    >
                      TRY ANOTHER FILE
                    </button>
                    <button
                      onClick={() => nav("/onboarding/profile")}
                      data-testid="upload-error-manual-btn"
                      className="btn-terra !text-xs font-mono font-bold"
                    >
                      ENTER DETAILS MANUALLY <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

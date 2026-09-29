// @ts-nocheck
'use client';

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/routerCompat";
import { ArrowRight, Sparkles, Plus, X, AlertCircle, RefreshCw, PenTool, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import api, { formatApiError, CandidateProfile, createEmptyProfile } from "@/lib/api";
import { normalizeResumeProfile } from "@/lib/resumeParser";

const STEPS = ["Account", "Resume", "AI Profile"];

const EMPTY: CandidateProfile = createEmptyProfile();

export default function AIProfile() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("manual");
  const [diagnostic, setDiagnostic] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cadence_candidate_profile");
      const storedSource = localStorage.getItem("cadence_profile_source");
      const storedDiag = localStorage.getItem("cadence_resume_diagnostic");
      if (storedDiag) {
        try {
          setDiagnostic(JSON.parse(storedDiag));
        } catch {
          // ignore
        }
      }
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const normalized = normalizeResumeProfile(parsed);
          setProfile(normalized);
          if (storedSource) setSource(storedSource);
          setLoading(false);
        } catch (e) {
          console.error("Failed to parse stored profile", e);
        }
      }
    }
    api
      .get("/onboarding/profile")
      .then(({ data }) => {
        if (data?.profile) {
          setProfile((prev) => {
            const isServerNonEmpty =
              (data.profile.basics?.fullName && data.profile.basics.fullName.toLowerCase() !== "candidate") ||
              data.profile.experience?.length > 0 ||
              data.profile.workExperience?.length > 0 ||
              data.profile.projects?.length > 0 ||
              data.profile.technical_skills?.length > 0 ||
              data.profile.technicalSkills?.length > 0;

            if (prev && !isServerNonEmpty) {
              return prev;
            }
            return normalizeResumeProfile({ ...(prev || {}), ...data.profile });
          });
          if (data.source && data.source !== "manual") {
            setSource(data.source);
          }
        }
      })
      .catch(() => {
        setProfile((prev) => prev || createEmptyProfile());
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof CandidateProfile, v: any) => {
    setProfile((p) => {
      if (!p) return null;
      const updated: any = { ...p, [k]: v };
      if (!updated.basics) {
        updated.basics = {
          fullName: p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          location: p.location || "",
          summary: p.summary || "",
        };
      }
      if (k === "name") updated.basics.fullName = v;
      if (k === "email") updated.basics.email = v;
      if (k === "phone") updated.basics.phone = v;
      if (k === "location") updated.basics.location = v;
      if (k === "summary") updated.basics.summary = v;
      return updated;
    });
  };

  const setList = (k: 'education' | 'experience' | 'internships' | 'projects', i: number, key: string, v: string) => {
    setProfile((p) => {
      if (!p) return null;
      const list = [...(p[k] as any[])];
      list[i] = { ...list[i], [key]: v };
      const updated: any = { ...p, [k]: list };
      if (k === 'experience') {
        updated.workExperience = list;
      }
      return updated;
    });
  };

  const setStringItem = (k: 'achievements', i: number, v: string) => {
    setProfile((p) => {
      if (!p) return null;
      const list = [...p[k]];
      list[i] = v;
      return { ...p, [k]: list };
    });
  };

  const addToList = (k: keyof CandidateProfile, item: any) => {
    setProfile((p) => {
      if (!p) return null;
      const list = [...(p[k] as any[]), item];
      const updated: any = { ...p, [k]: list };
      if (k === 'experience') updated.workExperience = list;
      if (k === 'technical_skills') updated.technicalSkills = list;
      if (k === 'soft_skills') updated.softSkills = list;
      return updated;
    });
  };

  const rmList = (k: keyof CandidateProfile, i: number) => {
    setProfile((p) => {
      if (!p) return null;
      const list = (p[k] as any[]).filter((_, j) => j !== i);
      const updated: any = { ...p, [k]: list };
      if (k === 'experience') updated.workExperience = list;
      if (k === 'technical_skills') updated.technicalSkills = list;
      if (k === 'soft_skills') updated.softSkills = list;
      return updated;
    });
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const normalized = normalizeResumeProfile(profile);
      await api.put("/onboarding/profile", normalized);
      localStorage.setItem("cadence_candidate_profile", JSON.stringify(normalized));
      localStorage.setItem("cadence_profile_confirmed", "true");
      nav("/app/practice");
    } catch (e: any) {
      alert(formatApiError(e));
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper" data-testid="profile-loading">
        <Logo />
      </div>
    );
  }

  const isProfileEmpty =
    !profile.name &&
    profile.education.length === 0 &&
    profile.experience.length === 0 &&
    profile.projects.length === 0 &&
    profile.technical_skills.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-paper" data-testid="ai-profile-page">
      <header className="border-b-2 border-line bg-paper px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" data-testid="profile-home-link">
            <Logo />
          </Link>
          <div className="font-mono text-xs font-bold text-mut uppercase">
            [ CANDIDATE AI DOSSIER // INSPECTION ]
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 pb-28">
        {/* Stepper Header */}
        <div className="mb-6 flex items-center gap-2 font-mono" data-testid="onboarding-stepper-profile">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`flex-1 border-t-4 ${i <= 2 ? "border-[#C7FF2F]" : "border-line"}`}
            />
          ))}
          <span className="ml-2 text-xs font-bold uppercase tracking-wider text-ink">
            [ 03 · {STEPS[2].toUpperCase()} ]
          </span>
        </div>

        <div className="border-b-2 border-line pb-4 mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-ink tracking-tight">
            YOUR AI PROFILE.
          </h1>
          <p className="mt-2 font-sans text-sm text-ink2 font-medium">
            {source === "ai"
              ? "Extracted from your resume by the AI Profile Agent. Verify or edit any claims before interview initiation."
              : source === "heuristic"
              ? "Extracted via local deterministic engine. Review and complete your technical background."
              : "Populate your background — it powers personalized question generation and claim verification."}
          </p>
        </div>

        {/* Development Diagnostic Panel */}
        {process.env.NODE_ENV === "development" && diagnostic && (
          <div className="border-2 border-line bg-[#E2F8E7] p-5 shadow-[4px_4px_0_#111111] mb-6" data-testid="dev-diagnostic-panel">
            <div className="flex items-center justify-between border-b-2 border-line pb-2 font-mono text-xs font-bold text-ink">
              <span>DEVELOPMENT EXTRACTION DIAGNOSTIC</span>
              <span className="bg-[#C7FF2F] px-2 py-0.5 border border-line">
                SOURCE: {diagnostic.parserSource?.toUpperCase()}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-ink">
              <div>FILE: <span className="font-bold">{diagnostic.fileName}</span></div>
              <div>TEXT: <span className="font-bold">{diagnostic.charCount?.toLocaleString()} chars</span></div>
              <div>EXP: <span className="font-bold">{diagnostic.experienceCount}</span></div>
              <div>SKILLS: <span className="font-bold">{diagnostic.skillsCount}</span></div>
            </div>
          </div>
        )}

        {/* Empty warning banner */}
        {isProfileEmpty && source !== "manual" && (
          <div className="border-3 border-line bg-[#FFEFEA] p-6 shadow-[5px_5px_0_#111111] mb-6" data-testid="profile-empty-warning">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#FF5C35]" />
              <div>
                <p className="font-mono text-xs font-bold uppercase text-[#FF5C35]">EXTRACTION INCOMPLETE</p>
                <p className="mt-1 text-xs leading-relaxed text-ink2 font-medium">
                  We could not parse details from this file. Please re-upload or input your information manually below.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 font-mono">
                  <button
                    onClick={() => nav("/onboarding/resume")}
                    data-testid="profile-retry-extraction-btn"
                    className="btn-terra !px-3 !py-1.5 !text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> RETRY UPLOAD
                  </button>
                  <button
                    onClick={() => setSource("manual")}
                    data-testid="profile-enter-manually-btn"
                    className="btn-ghost !px-3 !py-1.5 !text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <PenTool className="h-3.5 w-3.5" /> ENTER MANUALLY
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Form Cards */}
        <div className="space-y-6">
          <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[5px_5px_0_#111111]" data-testid="profile-contact-card">
            <p className="eyebrow mb-4">Candidate Identity &amp; Contact</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" testid="profile-name-input" value={profile.name} onChange={(v) => set("name", v)} placeholder="Alex Morgan" />
              <Field label="Email" testid="profile-email-input" value={profile.email} onChange={(v) => set("email", v)} placeholder="alex@domain.com" />
              <Field label="Phone" testid="profile-phone-input" value={profile.phone} onChange={(v) => set("phone", v)} placeholder="+1 (555) 000-0000" />
              <Field label="Location" testid="profile-location-input" value={profile.location} onChange={(v) => set("location", v)} placeholder="San Francisco, CA" />
            </div>
            <label className="mt-4 block">
              <span className="eyebrow mb-1.5 block">Professional summary</span>
              <textarea
                data-testid="profile-summary-input"
                rows={3}
                value={profile.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="Staff Software Engineer with 8+ years building distributed real-time systems…"
                className="input-warm resize-none leading-relaxed"
              />
            </label>
          </div>

          <ListCard
            title="Work experience" k="experience" items={profile.experience}
            fields={[["company", "Company"], ["role", "Role"], ["location", "Location"], ["startDate", "Start date"], ["endDate", "End date"]]}
            summaryKey="summary" onSet={setList} onAdd={() => addToList("experience", { company: "", role: "", location: "", startDate: "", endDate: "", duration: "", summary: "" })} onRm={rmList}
          />
          <ListCard
            title="Projects" k="projects" items={profile.projects}
            fields={[["name", "Project name"]]}
            summaryKey="summary" onSet={setList} onAdd={() => addToList("projects", { name: "", summary: "" })} onRm={rmList}
          />
          <ListCard
            title="Education" k="education" items={profile.education}
            fields={[["institution", "Institution"], ["degree", "Degree / Field"], ["year", "Years"]]}
            onSet={setList} onAdd={() => addToList("education", { institution: "", degree: "", year: "" })} onRm={rmList}
          />
          <ListCard
            title="Internships" k="internships" items={profile.internships}
            fields={[["company", "Company"], ["role", "Role"], ["location", "Location"], ["startDate", "Start date"], ["endDate", "End date"]]}
            summaryKey="summary" onSet={setList} onAdd={() => addToList("internships", { company: "", role: "", location: "", startDate: "", endDate: "", duration: "", summary: "" })} onRm={rmList}
          />

          <ChipCard title="Technical skills" k="technical_skills" items={profile.technical_skills} onAdd={(v) => addToList("technical_skills", v)} onRm={rmList} />
          <ChipCard title="Technologies & Frameworks" k="technologies" items={profile.technologies} onAdd={(v) => addToList("technologies", v)} onRm={rmList} />
          <ChipCard title="Soft skills" k="soft_skills" items={profile.soft_skills} onAdd={(v) => addToList("soft_skills", v)} onRm={rmList} />
          <ChipCard title="Certifications" k="certifications" items={profile.certifications} onAdd={(v) => addToList("certifications", v)} onRm={rmList} />
          <AchievementsCard items={profile.achievements} onSet={(i, v) => setStringItem("achievements", i, v)} onAdd={(v) => addToList("achievements", v)} onRm={(i) => rmList("achievements", i)} />
          <ChipCard title="Domain experience" k="domains" items={profile.domains} onAdd={(v) => addToList("domains", v)} onRm={rmList} />
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-6 mt-10 flex justify-between items-center border-3 border-line bg-paper p-4 shadow-[6px_6px_0_#111111] z-30 font-mono">
          <span className="text-xs font-bold text-ink uppercase hidden sm:inline">
            [ READY TO ENTER ARENA ]
          </span>
          <button
            onClick={save}
            disabled={saving}
            data-testid="profile-continue-btn"
            className="btn-terra !px-6 !py-3.5 font-bold shadow-[3px_3px_0_#111111] disabled:opacity-50"
          >
            {saving ? "SAVING PROFILE…" : "CONTINUE TO INTERVIEW SETUP"}
            {!saving && <ArrowRight className="h-4 w-4 ml-1" />}
          </button>
        </div>
      </main>
    </div>
  );
}

const Field = ({ label, value, onChange, placeholder, testid }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; testid: string }) => (
  <label className="block">
    <span className="eyebrow mb-1.5 block">{label}</span>
    <input data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-warm" />
  </label>
);

function ListCard({
  title,
  k,
  items,
  fields,
  summaryKey,
  onSet,
  onAdd,
  onRm,
}: {
  title: string;
  k: 'education' | 'experience' | 'internships' | 'projects';
  items: any[];
  fields: string[][];
  summaryKey?: string;
  onSet: (k: any, i: number, key: string, v: string) => void;
  onAdd: () => void;
  onRm: (k: any, i: number) => void;
}) {
  return (
    <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[5px_5px_0_#111111]" data-testid={`profile-section-${k}`}>
      <div className="flex items-center justify-between border-b-2 border-line pb-3">
        <p className="eyebrow">{title}</p>
        <button
          onClick={onAdd}
          data-testid={`profile-add-${k}-btn`}
          className="border border-line bg-[#C7FF2F] px-2.5 py-1 font-mono text-xs font-bold uppercase text-ink hover:bg-line hover:text-paper transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-3 w-3" /> ADD ENTRY
        </button>
      </div>

      {items.length === 0 && <p className="mt-4 font-mono text-xs text-mut">None listed — add your details so questions match your background.</p>}

      <div className="mt-4 space-y-4">
        {items.map((it, i) => (
          <div key={i} className="border-2 border-line bg-paper p-4 shadow-[2px_2px_0_#111111]">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                {fields.map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-mut font-bold">{label}</span>
                    <input value={it[key] || ""} onChange={(e) => onSet(k, i, key, e.target.value)} className="input-warm !px-2.5 !py-1.5 !text-xs" />
                  </label>
                ))}
              </div>
              <button
                onClick={() => onRm(k, i)}
                data-testid={`profile-rm-${k}-${i}`}
                className="border border-line p-1 bg-white hover:bg-[#FF5C35] hover:text-white transition-colors cursor-pointer"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {summaryKey && (
              <label className="mt-3 block">
                <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-mut font-bold">Summary</span>
                <textarea rows={2} value={it[summaryKey] || ""} onChange={(e) => onSet(k, i, summaryKey, e.target.value)} className="input-warm resize-none !px-2.5 !py-1.5 !text-xs leading-relaxed" />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipCard({
  title,
  k,
  items,
  onAdd,
  onRm,
}: {
  title: string;
  k: keyof CandidateProfile;
  items: string[];
  onAdd: (v: string) => void;
  onRm: (k: keyof CandidateProfile, i: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v.slice(0, 80));
    setDraft("");
  };
  return (
    <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[5px_5px_0_#111111]" data-testid={`profile-section-${k}`}>
      <p className="eyebrow mb-3">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2" data-testid={`profile-chips-${k}`}>
        {items.map((s, i) => (
          <span key={`${s}-${i}`} className="chip">
            {s}
            <button onClick={() => onRm(k, i)} data-testid={`profile-chip-rm-${k}-${i}`} className="text-mut hover:text-ink ml-1" aria-label={`Remove ${s}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="font-mono text-xs text-mut">None added yet.</p>}
      </div>
      <div className="mt-4 flex gap-2 font-mono">
        <input
          data-testid={`profile-chip-input-${k}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
          placeholder={`Add ${title.toLowerCase()}…`}
          className="input-warm !px-3 !py-2 !text-xs"
        />
        <button onClick={commit} data-testid={`profile-chip-add-${k}-btn`} className="btn-ghost !px-4 !py-2 !text-xs font-bold">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AchievementsCard({
  items,
  onSet,
  onAdd,
  onRm,
}: {
  items: string[];
  onSet: (i: number, v: string) => void;
  onAdd: (v: string) => void;
  onRm: (i: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
  };
  return (
    <div className="border-3 border-line bg-white p-6 sm:p-8 shadow-[5px_5px_0_#111111]" data-testid="profile-section-achievements">
      <p className="eyebrow mb-3">Achievements &amp; Publications</p>
      <div className="mt-3 space-y-2 font-mono" data-testid="profile-achievements-list">
        {items.map((ach, i) => (
          <div key={i} className="flex items-center gap-2 border-2 border-line bg-paper px-3 py-2">
            <input
              value={ach}
              onChange={(e) => onSet(i, e.target.value)}
              className="flex-1 bg-transparent text-xs text-ink focus:outline-none font-sans font-medium"
              placeholder="Achievement statement..."
            />
            <button
              onClick={() => onRm(i)}
              data-testid={`profile-rm-achievements-${i}`}
              className="border border-line p-1 bg-white hover:bg-[#FF5C35] hover:text-white transition-colors cursor-pointer"
              aria-label="Remove achievement"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="font-mono text-xs text-mut">None added yet.</p>}
      </div>
      <div className="mt-4 flex gap-2 font-mono">
        <input
          data-testid="profile-chip-input-achievements"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
          placeholder="Add an achievement statement…"
          className="input-warm !px-3 !py-2 !text-xs"
        />
        <button onClick={commit} data-testid="profile-add-achievements-btn" className="btn-ghost !px-4 !py-2 !text-xs font-bold">
          <Plus className="h-3.5 w-3.5" /> ADD
        </button>
      </div>
    </div>
  );
}

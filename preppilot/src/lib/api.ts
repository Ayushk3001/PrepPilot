export const TOKEN_KEY = "cadence_token";
export const PROFILE_KEY = "cadence_candidate_profile";
export const USER_KEY = "cadence_user";
export const DIAGNOSTIC_KEY = "cadence_resume_diagnostic";
const ACCOUNTS_KEY = "cadence_accounts_v1";

type LocalAccount = {
  user: { id: string; name: string; email: string };
  profile?: CandidateProfile;
  profileConfirmed?: boolean;
  profileSource?: string;
};

function accountId(email: string) {
  return email.trim().toLowerCase();
}

function readAccounts(): Record<string, LocalAccount> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") as Record<string, LocalAccount>;
  } catch {
    return {};
  }
}

function writeAccount(account: LocalAccount) {
  if (typeof window === "undefined" || !account.user.email) return;
  const accounts = readAccounts();
  accounts[accountId(account.user.email)] = account;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function persistActiveProfile(profile: CandidateProfile, source = "manual", confirmed = false) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem("cadence_profile_source", source);
  if (confirmed) localStorage.setItem("cadence_profile_confirmed", "true");
  const userRaw = localStorage.getItem(USER_KEY);
  if (!userRaw) return;
  try {
    const user = JSON.parse(userRaw);
    const prior = readAccounts()[accountId(user.email)];
    writeAccount({ user, profile, profileSource: source, profileConfirmed: confirmed || prior?.profileConfirmed });
  } catch {
    // The active profile remains usable even if a malformed legacy user record exists.
  }
}

export interface CanonicalBasics {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
}

export interface CanonicalEducation {
  institution: string;
  degree: string;
  field?: string;
  year: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  location?: string;
  achievements?: string[];
}

export interface CanonicalWorkExperience {
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  duration: string;
  summary?: string;
  responsibilities?: string[];
  achievements?: string[];
  technologies?: string[];
  metrics?: string[];
  sectionSource?: 'professional_experience' | 'internships';
  sourceText?: string;
  confidence?: number;
}

export interface CanonicalProject {
  name: string;
  summary: string;
  description?: string;
  contribution?: string;
  technologies?: string[];
  results?: string;
  metrics?: string[];
  descriptions?: string[];
  year?: string;
  sectionSource?: 'projects' | 'technical_projects';
  sourceText?: string;
  confidence?: number;
}

export interface CandidateProfile {
  // Canonical schema per Section 7
  basics: CanonicalBasics;
  education: CanonicalEducation[];
  workExperience: CanonicalWorkExperience[];
  internships: CanonicalWorkExperience[];
  projects: CanonicalProject[];
  technicalSkills: string[];
  softSkills: string[];
  technologies: string[];
  certifications: string[];
  achievements: string[];
  domains: string[];

  // Backward compatibility aliases for existing UI and agents
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: CanonicalWorkExperience[];
  technical_skills: string[];
  soft_skills: string[];

  /** Resume snapshot metadata; optional for backwards-compatible local profiles. */
  resumeId?: string;
  parsedAt?: string;
  parserSource?: 'ai' | 'heuristic' | 'manual';
}

export function createEmptyProfile(userAccount?: { name?: string; email?: string }): CandidateProfile {
  const name = userAccount?.name || "";
  const email = userAccount?.email || "";
  return {
    basics: {
      fullName: name,
      email,
      phone: "",
      location: "",
      summary: "",
    },
    education: [],
    workExperience: [],
    internships: [],
    projects: [],
    technicalSkills: [],
    softSkills: [],
    technologies: [],
    certifications: [],
    achievements: [],
    domains: [],
    name,
    email,
    phone: "",
    location: "",
    summary: "",
    experience: [],
    technical_skills: [],
    soft_skills: [],
  };
}

export const DEFAULT_PROFILE: CandidateProfile = createEmptyProfile();

export function formatApiError(e: any): string {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || "Something went wrong. Please try again.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x && typeof x.msg === "string" ? x.msg : JSON.stringify(x))).filter(Boolean).join(" ");
  if (d && typeof d.msg === "string") return d.msg;
  return "Something went wrong. Please try again.";
}

// Local mock client mimicking Axios interface
const api = {
  async get(url: string) {
    if (typeof window === "undefined") return { data: {} };

    if (url === "/auth/me") {
      const userRaw = localStorage.getItem(USER_KEY);
      if (!userRaw) {
        throw { response: { status: 401, data: { detail: "Unauthorized" } } };
      }
      return { data: JSON.parse(userRaw) };
    }

    if (url === "/onboarding/profile") {
      const profRaw = localStorage.getItem(PROFILE_KEY);
      const source = localStorage.getItem("cadence_profile_source") || "manual";
      if (profRaw) {
        try {
          const parsed = JSON.parse(profRaw);
          const name = String(parsed.name || parsed.basics?.fullName || '').toLowerCase();
          const allStr = JSON.stringify(parsed).toLowerCase();
          if (name.includes('flatedecode') || name.includes('filter') || allStr.includes('flatedecode') || allStr.includes('\ufffd')) {
            localStorage.removeItem(PROFILE_KEY);
            localStorage.removeItem("cadence_profile_source");
            localStorage.removeItem("cadence_resume_diagnostic");
          } else {
            return { data: { profile: parsed, source } };
          }
        } catch {
          // parse error
        }
      }
      const userRaw = localStorage.getItem(USER_KEY);
      const u = userRaw ? JSON.parse(userRaw) : { name: "", email: "" };
      const empty = createEmptyProfile(u);
      return { data: { profile: empty, source: "manual" } };
    }

    return { data: {} };
  },

  async post(url: string, data?: any, _config?: any) {
    if (typeof window === "undefined") return { data: {} };

    if (url === "/auth/register") {
      const email = String(data?.email || "").trim();
      const existing = readAccounts()[accountId(email)];
      const user = {
        id: existing?.user.id || `u_${Date.now()}`,
        name: data?.name || "",
        email,
      };
      const token = `token_${Date.now()}`;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, token);

      // Initialize clean candidate profile with user name/email without fake demo experience
      const freshProfile = createEmptyProfile(user);
      persistActiveProfile(freshProfile, "manual", false);
      localStorage.removeItem("cadence_profile_confirmed");
      writeAccount({ user, profile: freshProfile, profileSource: "manual", profileConfirmed: false });
      return { data: { user, access_token: token } };
    }

    if (url === "/auth/login") {
      const email = String(data?.email || "").trim();
      const saved = readAccounts()[accountId(email)];
      const user = {
        id: saved?.user.id || `u_${Date.now()}`,
        name: saved?.user.name || data?.name || (email.split("@")[0] ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Candidate"),
        email,
      };
      const token = `token_${Date.now()}`;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, token);
      if (saved?.profile) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(saved.profile));
        localStorage.setItem("cadence_profile_source", saved.profileSource || "manual");
        if (saved.profileConfirmed) localStorage.setItem("cadence_profile_confirmed", "true");
      } else {
        const freshProfile = createEmptyProfile(user);
        persistActiveProfile(freshProfile, "manual", false);
      }
      writeAccount({ ...saved, user });
      return { data: { user, access_token: token } };
    }

    if (url === "/auth/logout") {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem("cadence_profile_source");
      localStorage.removeItem("cadence_profile_confirmed");
      localStorage.removeItem("cadence_sessions_v1");
      localStorage.removeItem("elevate_ai_sessions_v1");
      localStorage.removeItem("cadence_answer_draft");
      localStorage.removeItem("cadence_candidate_account");
      localStorage.removeItem("cadence_resume_diagnostic");
      sessionStorage.removeItem("cadence_resume_interview_session");
      sessionStorage.removeItem("cadence_active_interview_session");
      return { data: { status: "logged_out" } };
    }

    if (url === "/onboarding/resume") {
      try {
        const res = await fetch("/api/onboarding/resume", {
          method: "POST",
          headers: { "x-request-id": `resume-upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
          body: data,
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.profile) {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(resData.profile));
            if (resData.profile.resumeId) localStorage.setItem("cadence_active_resume_id", resData.profile.resumeId);
            sessionStorage.removeItem("cadence_resume_interview_session");
            sessionStorage.removeItem("cadence_active_interview_session");
            sessionStorage.removeItem("cadence_prepared_opening_question");
            localStorage.setItem("cadence_profile_source", resData.source || "ai");
            if (resData.diagnostic) {
              localStorage.setItem("cadence_resume_diagnostic", JSON.stringify(resData.diagnostic));
            }
            return {
              data: {
                status: "uploaded",
                profile: resData.profile,
                source: resData.source || "ai",
                diagnostic: resData.diagnostic
              }
            };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed with status ${res.status}`);
        }
      } catch (err: any) {
        console.warn("API resume endpoint error:", err);
        throw err;
      }
      throw new Error("Resume processing did not return a valid profile");
    }

    return { data: {} };
  },

  async put(url: string, data?: any) {
    if (typeof window === "undefined") return { data: {} };

    if (url === "/onboarding/profile") {
      // Ensure sync between canonical fields and aliases
      const name = data?.basics?.fullName || data?.name || "";
      const email = data?.basics?.email || data?.email || "";
      const phone = data?.basics?.phone || data?.phone || "";
      const location = data?.basics?.location || data?.location || "";
      const summary = data?.basics?.summary || data?.summary || "";
      const workExperience = data?.workExperience || data?.experience || [];
      const technicalSkills = data?.technicalSkills || data?.technical_skills || [];
      const softSkills = data?.softSkills || data?.soft_skills || [];

      const synced: CandidateProfile = {
        ...data,
        basics: {
          fullName: name,
          email,
          phone,
          location,
          summary,
        },
        name,
        email,
        phone,
        location,
        summary,
        workExperience,
        experience: workExperience,
        technicalSkills,
        technical_skills: technicalSkills,
        softSkills,
        soft_skills: softSkills,
      };

      persistActiveProfile(synced, localStorage.getItem("cadence_profile_source") || "manual", true);

      // update user name if present
      const userRaw = localStorage.getItem(USER_KEY);
      if (userRaw && name) {
        const u = JSON.parse(userRaw);
        u.name = name;
        if (email) u.email = email;
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      }

      return { data: { status: "ok", profile: synced } };
    }

    return { data: {} };
  },
};

export default api;

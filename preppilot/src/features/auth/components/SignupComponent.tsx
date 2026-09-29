'use client';

import { useState } from "react";
import { Link, useNavigate } from "@/lib/routerCompat";
import { ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/features/auth/context/AuthContext";
import api, { formatApiError } from "@/lib/api";

const STEPS = ["Account", "Resume", "AI Profile"];

export default function SignupComponent({ mode = "signup" }: { mode?: "signup" | "login" }) {
  const nav = useNavigate();
  const { signup, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isSignup && name.trim().length < 2) return setError("Please enter your full name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (isSignup) {
        await signup(name.trim(), email.trim().toLowerCase(), password);
        nav("/onboarding/resume");
      } else {
        await login(email.trim().toLowerCase(), password);
        try {
          await api.get("/onboarding/profile");
          nav("/app/practice");
        } catch {
          nav("/onboarding/resume");
        }
      }
    } catch (err: any) {
      setError(formatApiError(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper" data-testid="signup-page">
      <header className="border-b-2 border-line bg-paper px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" data-testid="signup-home-link">
            <Logo />
          </Link>
          <div className="font-mono text-xs font-bold text-mut uppercase">
            [ AUTHENTICATION GATE ]
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {/* Stepper Header */}
          <div className="mb-6 flex items-center gap-2 font-mono" data-testid="onboarding-stepper">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`flex-1 border-t-4 ${i === 0 ? "border-[#C7FF2F]" : "border-line"}`}
              />
            ))}
            <span className="ml-2 text-xs font-bold uppercase tracking-wider text-ink">
              [ 01 · {STEPS[0].toUpperCase()} ]
            </span>
          </div>

          {/* Brutalist Form Card */}
          <div className="border-3 border-line bg-white p-7 sm:p-9 shadow-[8px_8px_0_#111111]">
            <div className="border-b-2 border-line pb-4 mb-6">
              <h1 className="font-display text-3xl font-extrabold uppercase text-ink tracking-tight">
                {isSignup ? "CREATE ACCOUNT." : "WELCOME BACK."}
              </h1>
              <p className="mt-1 font-sans text-xs text-ink2 font-medium">
                {isSignup
                  ? "Access resume-grounded mock rounds and coaching analytics."
                  : "Sign in to resume your practice sessions and improvement plan."}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5" data-testid="signup-form">
              {isSignup && (
                <label className="block">
                  <span className="eyebrow mb-1.5 block">Candidate Full Name</span>
                  <input
                    data-testid="signup-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="input-warm"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="block">
                <span className="eyebrow mb-1.5 block">Email Address</span>
                <input
                  data-testid="signup-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@domain.com"
                  className="input-warm"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="eyebrow mb-1.5 block">Password</span>
                <input
                  data-testid="signup-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "Min. 8 characters" : "Your password"}
                  className="input-warm"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
              </label>

              {error && (
                <div
                  className="flex items-start gap-2.5 border-2 border-line bg-[#FFEFEA] p-3 text-xs text-[#FF5C35] font-bold shadow-[2px_2px_0_#111111]"
                  data-testid="signup-error"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5C35]" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="signup-submit-btn"
                className="btn-terra w-full font-bold !py-3.5 !text-sm disabled:opacity-50"
              >
                {busy ? "AUTHENTICATING…" : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-6 border-t-2 border-line pt-4 text-center font-mono text-xs">
              <span className="text-mut">
                {isSignup ? "ALREADY REGISTERED? " : "NEW CANDIDATE? "}
              </span>
              <Link
                to={isSignup ? "/login" : "/signup"}
                data-testid="signup-mode-toggle"
                className="font-bold uppercase text-ink underline hover:bg-[#C7FF2F] px-1 transition-colors"
              >
                {isSignup ? "SIGN IN HERE" : "CREATE ACCOUNT"}
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-mut font-bold">
            NEXT STEP // 02 RESUME UPLOAD → 03 AI PROFILE
          </p>
        </div>
      </main>
    </div>
  );
}

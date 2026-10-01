// @ts-nocheck
'use client';

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/routerCompat";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/ui-bits";
import { getStartPracticingRoute } from "@/lib/authRoute";

export default function Footer() {
  const [practiceRoute, setPracticeRoute] = useState("/signup");
  const nav = useNavigate();

  useEffect(() => {
    setPracticeRoute(getStartPracticingRoute());
  }, []);

  const handleStartPracticing = (e: React.MouseEvent) => {
    e.preventDefault();
    nav(getStartPracticingRoute());
  };

  return (
    <footer className="border-t-3 border-line bg-coal text-paper">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <Reveal>
          <div className="border-3 border-coaline bg-coal2 p-8 sm:p-12 shadow-[8px_8px_0_#C7FF2F] flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 border border-coaline bg-coal px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C7FF2F]">
                [ READY FOR PRODUCTION ROUNDS ]
              </div>
              <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-paper">
                READY FOR YOUR <br />
                <span className="text-[#C7FF2F]">NEXT ROUND?</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm text-paper/70 font-sans">
                Turn uncertainty into repeatable interview execution. Upload your resume and start training with PrepPilot.
              </p>
            </div>
            <a
              href={practiceRoute}
              onClick={handleStartPracticing}
              data-testid="footer-cta"
              className="btn-terra !px-6 !py-3.5 !text-sm font-mono font-bold shrink-0 shadow-[4px_4px_0_#paper] cursor-pointer"
            >
              START PRACTICING <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>

        <div className="mt-16 flex flex-col justify-between gap-6 border-t-2 border-coaline pt-8 sm:flex-row sm:items-center font-mono">
          <Logo dark />
          <nav className="flex flex-wrap gap-4 sm:gap-6 text-xs font-bold uppercase tracking-wider text-paper/70">
            <a href="#evidence" className="transition-colors hover:text-[#C7FF2F]">Evidence Graph</a>
            <a href="#rounds" className="transition-colors hover:text-[#C7FF2F]">6 Rounds</a>
            <a href="#agents" className="transition-colors hover:text-[#C7FF2F]">5 Agents</a>
            <a href="#practice-demo" className="transition-colors hover:text-[#C7FF2F]">Live Demo</a>
            <a href="#features" className="transition-colors hover:text-[#C7FF2F]">Telemetry</a>
            <Link to="/app" className="transition-colors hover:text-[#C7FF2F]">Dashboard</Link>
          </nav>
          <p className="text-[10px] uppercase tracking-widest text-paper/40 font-bold">
            PREPPILOT // INTERVIEW COCKPIT v2.0
          </p>
        </div>
      </div>
    </footer>
  );
}

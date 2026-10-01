import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/routerCompat";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getStartPracticingRoute } from "@/lib/authRoute";

const LINKS = [
  { num: "01", label: "Evidence Graph", href: "#evidence" },
  { num: "02", label: "6 Rounds", href: "#rounds" },
  { num: "03", label: "5-Agent Engine", href: "#agents" },
  { num: "04", label: "Live Simulator", href: "#practice-demo" },
  { num: "05", label: "Telemetry & FAQ", href: "#features" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [practiceRoute, setPracticeRoute] = useState("/signup");
  const nav = useNavigate();

  useEffect(() => {
    setPracticeRoute(getStartPracticingRoute());
  }, []);

  const handleStartPracticing = (e: React.MouseEvent) => {
    e.preventDefault();
    const route = getStartPracticingRoute();
    nav(route);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-line bg-paper/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" data-testid="nav-logo-link" className="flex items-center gap-3">
          <Logo />
        </a>

        <div className="hidden items-center gap-2 font-mono text-[11px] font-bold text-ink xl:flex">
          <span className="h-2 w-2 bg-[#C7FF2F] border border-line animate-pulse" />
          <span>STATUS: AI ONLINE</span>
        </div>

        <nav className="hidden items-center gap-4 lg:gap-6 font-mono md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-testid={`nav-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-xs font-bold uppercase tracking-wider text-ink transition-all hover:bg-[#C7FF2F] hover:text-ink px-2 py-1 border border-transparent hover:border-line"
            >
              <span className="text-mut mr-1">[{l.num}]</span>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex font-mono">
          <Link
            to="/app"
            data-testid="nav-dashboard-btn"
            className="text-xs font-bold uppercase tracking-wider text-ink px-3 py-2 border-2 border-transparent hover:border-line hover:bg-white transition-all cursor-pointer"
          >
            Dashboard
          </Link>
          <a
            href={practiceRoute}
            onClick={handleStartPracticing}
            data-testid="nav-launch-arena-btn"
            className="btn-terra !px-4 !py-2 !text-xs font-bold cursor-pointer"
          >
            START SESSION <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <button
          className="border-2 border-line bg-white p-2 md:hidden cursor-pointer"
          onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t-2 border-line bg-paper px-6 py-5 md:hidden font-mono space-y-4">
          <div className="space-y-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block border-2 border-line bg-white p-3 text-xs font-bold uppercase tracking-wider text-ink"
              >
                <span className="text-mut mr-2">[{l.num}]</span>
                {l.label}
              </a>
            ))}
          </div>
          <div className="pt-2 border-t-2 border-line space-y-2">
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="block w-full border-2 border-line bg-white p-3 text-center text-xs font-bold uppercase tracking-wider text-ink"
            >
              Candidate Dashboard
            </Link>
            <a
              href={practiceRoute}
              onClick={(e) => {
                setOpen(false);
                handleStartPracticing(e);
              }}
              className="btn-terra block w-full !p-3 text-center !text-xs font-bold uppercase"
            >
              START SESSION NOW →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

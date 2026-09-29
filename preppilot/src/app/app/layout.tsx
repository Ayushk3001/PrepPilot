'use client';

import { NavLink, Link } from "@/lib/routerCompat";
import { LayoutDashboard, Mic, History, TrendingUp, Plus, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/features/auth/context/AuthContext";

const NAV = [
  { to: "/app", num: "01", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/app/practice", num: "02", label: "Practice", icon: Mic, testid: "nav-practice" },
  { to: "/app/sessions", num: "03", label: "Sessions", icon: History, testid: "nav-sessions" },
  { to: "/app/plan", num: "04", label: "Plan", icon: TrendingUp, testid: "nav-plan" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop Sidebar */}
        <aside
          className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-2 border-line bg-paper px-5 py-6 lg:flex"
          data-testid="dashboard-sidebar-nav"
        >
          <Link to="/" data-testid="sidebar-logo-link" className="block pb-2">
            <Logo />
          </Link>

          <div className="my-5 border-y-2 border-line py-2 flex items-center justify-between font-mono text-[11px] font-bold">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[#C7FF2F] border border-line animate-pulse" />
              <span>AI ONLINE</span>
            </span>
            <span className="bg-line text-paper px-1.5 py-0.2">v2.0</span>
          </div>

          <nav className="flex-1 space-y-1.5 font-mono">
            {NAV.map(({ to, num, label, icon: Icon, end, testid }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                data-testid={testid}
                className={({ isActive }: { isActive: boolean }) =>
                  `flex items-center justify-between border-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-100 ${
                    isActive
                      ? "border-line bg-[#C7FF2F] text-ink shadow-[3px_3px_0_#111111] translate-x-1"
                      : "border-transparent text-ink2 hover:border-line hover:bg-white"
                  }`
                }
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" /> {label}
                </span>
                <span className="text-[10px] text-mut">[{num}]</span>
              </NavLink>
            ))}
          </nav>

          <div className="space-y-4 pt-4 border-t-2 border-line">
            <Link
              to="/app/practice"
              data-testid="sidebar-new-practice-btn"
              className="btn-terra w-full !text-xs !py-3 font-mono font-bold"
            >
              <Plus className="h-4 w-4" /> START SESSION →
            </Link>

            <div
              className="border-2 border-line bg-white p-3.5 shadow-[4px_4px_0_#111111]"
              data-testid="sidebar-profile-card"
            >
              <Link to="/onboarding/profile" className="flex items-center gap-3 group">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-line bg-[#C7FF2F] font-mono text-sm font-black text-ink shadow-[2px_2px_0_#111111]">
                  {(user?.name || "P").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold uppercase tracking-wide text-ink group-hover:text-[#127533] transition-colors">
                    {user?.name || "Guest Candidate"}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-mut">
                    {user ? "[ VERIFIED CANDIDATE ]" : "[ GUEST MODE ]"}
                  </p>
                </div>
              </Link>
              {user ? (
                <button
                  onClick={logout}
                  data-testid="sidebar-signout-btn"
                  className="mt-3 w-full border-2 border-line bg-paper py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink transition-colors hover:bg-line hover:text-paper cursor-pointer"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/signup"
                  data-testid="sidebar-signin-btn"
                  className="mt-3 block border-2 border-line bg-paper py-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-ink transition-colors hover:bg-line hover:text-paper"
                >
                  Sign in to save progress
                </Link>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:pl-64">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b-2 border-line bg-paper px-5 py-3 lg:hidden">
            <Link to="/"><Logo /></Link>
            <Link to="/app/practice" className="btn-terra !px-3.5 !py-2 !text-xs font-mono font-bold" data-testid="mobile-new-practice-btn">
              <Plus className="h-3.5 w-3.5" /> Practice
            </Link>
          </header>

          <div className="flex gap-2 overflow-x-auto no-scrollbar border-b-2 border-line bg-paper px-4 py-2 lg:hidden font-mono">
            {NAV.map(({ to, num, label, end, testid }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                data-testid={`${testid}-mobile`}
                className={({ isActive }: { isActive: boolean }) =>
                  `whitespace-nowrap border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                    isActive ? "border-line bg-[#C7FF2F] text-ink shadow-[2px_2px_0_#111111]" : "border-line bg-white text-ink2"
                  }`
                }
              >
                [{num}] {label}
              </NavLink>
            ))}
          </div>

          <main className="px-5 py-8 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

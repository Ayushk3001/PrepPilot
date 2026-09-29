import { Link } from "@/lib/routerCompat";
import { ArrowRight, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-8 text-center font-mono">
      <div className="border-2 border-line bg-white p-8 sm:p-12 shadow-[8px_8px_0_#111111] max-w-lg">
        <div className="inline-flex items-center gap-2 border-2 border-line bg-[#FF5C35] text-white px-3 py-1 font-bold text-xs mb-6 shadow-[2px_2px_0_#111111]">
          <AlertTriangle className="h-4 w-4" /> ERROR_404
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase text-ink leading-tight">
          SESSION <br /> DISCONNECTED.
        </h1>
        <p className="mt-4 font-sans text-sm text-ink2 leading-relaxed">
          The requested route was not found in the PrepPilot execution graph. Return to the command center to resume practice.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/" className="btn-terra">
            RETURN TO PREPPILOT <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

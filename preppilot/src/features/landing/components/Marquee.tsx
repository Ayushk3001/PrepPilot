import { Asterisk } from "lucide-react";

const TICKER_ITEMS = [
  "RESUME ANALYSIS",
  "MOCK INTERVIEWS",
  "ADAPTIVE QUESTIONS",
  "AI FEEDBACK",
  "SKILL SCORING",
  "CAREER READINESS",
  "STAR VALIDATION",
  "AUDIO CADENCE",
];

export default function Marquee() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <section className="border-y-3 border-line bg-coal py-4 text-paper overflow-hidden select-none" data-testid="editorial-marquee">
      <div className="mask-fade-x overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-8 pr-8">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-8 whitespace-nowrap">
              <span className="font-mono text-sm sm:text-base font-black tracking-widest text-paper uppercase">
                {item}
              </span>
              <Asterisk className="h-4 w-4 text-[#C7FF2F] stroke-[3]" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

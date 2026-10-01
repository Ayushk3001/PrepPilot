import { Asterisk } from "lucide-react";

const TICKER_ITEMS = [
  "RESUME EVIDENCE GRAPH",
  "6 INTERVIEW ROUNDS",
  "5-AGENT CONCURRENT PIPELINE",
  "STAR 4-BEAT RIGOR",
  "LIVE WPM SPEECH CADENCE",
  "ADAPTIVE RESUME FOLLOW-UPS",
  "MODEL ANSWER REWRITES",
  "DETERMINISTIC OFFLINE ENGINE",
  "READINESS INDEX 0-100",
  "ZERO GENERIC QUESTIONS",
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

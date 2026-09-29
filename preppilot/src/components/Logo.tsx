export const LogoMark = ({ className = "h-8 w-8" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center border-2 border-line bg-coal p-1 shadow-[2px_2px_0_#111111] ${className}`} aria-hidden="true">
    <div className="grid grid-cols-2 gap-1 w-full h-full p-0.5">
      <span className="bg-[#C7FF2F] border border-line" />
      <span className="bg-paper border border-line" />
      <span className="bg-[#127533] border border-line" />
      <span className="bg-[#C7FF2F] border border-line" />
    </div>
  </div>
);

export const Logo = ({ dark = false, markClass = "h-8 w-8", textClass = "text-xl" }: { dark?: boolean; markClass?: string; textClass?: string }) => (
  <span className="inline-flex items-center gap-2.5 tracking-tight group select-none">
    <LogoMark className={markClass} />
    <span className={`font-mono font-bold uppercase tracking-wider ${dark ? "text-paper" : "text-ink"} ${textClass}`}>
      <span>PREP</span>
      <span className="text-[#127533] dark:text-[#C7FF2F]">.</span>
      <span>PILOT</span>
      <span className="animate-blink text-[#127533] dark:text-[#C7FF2F]">_</span>
    </span>
  </span>
);

export default Logo;

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  tone?: "light" | "dark";
};

function BrandGlyph({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const primaryStroke = tone === "dark" ? "#5eead4" : "#163b32";
  const secondaryStroke = tone === "dark" ? "#fbbf24" : "#b86c08";
  const nodeFill = tone === "dark" ? "#f8fafc" : "#111827";

  return (
    <span className={["inline-flex shrink-0 items-center justify-center", compact ? "h-12 w-12" : "h-16 w-16"].join(" ")} aria-hidden>
      <svg viewBox="0 0 64 64" fill="none" className={compact ? "h-11 w-11" : "h-14 w-14"}>
        <path d="M30 14C24.5 9.8 15.7 11.5 12.6 17.9C9.6 24.2 12.5 31.4 18 34C14 39 15.3 46.5 21 49.6C26.1 52.4 32.1 50.9 35 46.8" stroke={primaryStroke} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M34 14C39.5 9.8 48.3 11.5 51.4 17.9C54.4 24.2 51.5 31.4 46 34C50 39 48.7 46.5 43 49.6C37.9 52.4 31.9 50.9 29 46.8" stroke={secondaryStroke} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M32 18V44" stroke={nodeFill} strokeWidth="3.4" strokeLinecap="round"/>
        <path d="M21 23C24.2 24 26.1 26.2 26.8 29" stroke={primaryStroke} strokeWidth="3.4" strokeLinecap="round"/>
        <path d="M21.5 40C24.7 39.1 26.7 37 27.4 34.2" stroke={primaryStroke} strokeWidth="3.4" strokeLinecap="round"/>
        <path d="M43 23C39.8 24 37.9 26.2 37.2 29" stroke={secondaryStroke} strokeWidth="3.4" strokeLinecap="round"/>
        <path d="M42.5 40C39.3 39.1 37.3 37 36.6 34.2" stroke={secondaryStroke} strokeWidth="3.4" strokeLinecap="round"/>
        <circle cx="32" cy="31" r="4.6" fill={nodeFill} />
      </svg>
    </span>
  );
}

export function BrandMark({ compact = false, className, tone = "light" }: BrandMarkProps) {
  const eyebrowClass = tone === "dark" ? "text-stone-400" : "text-[#8b7d71]";
  const wordmarkClass = tone === "dark" ? "text-stone-50" : "text-[#1c1713]";
  const accentClass = tone === "dark" ? "text-[#5eead4]" : "text-[#1a4a3a]";

  return (
    <span className={["inline-flex items-center gap-3.5", className ?? ""].join(" ").trim()}>
      <BrandGlyph compact={compact} tone={tone} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`text-[0.62rem] font-medium uppercase tracking-[0.34em] ${eyebrowClass}`}>
          Company Intelligence
        </span>
        <span className="flex items-baseline gap-2 whitespace-nowrap">
          <span className={`${wordmarkClass} text-[1.2rem] font-semibold tracking-[-0.045em] sm:text-[1.35rem]`}>
            Deep-Dive
          </span>
          <span className={`text-[0.72rem] font-semibold uppercase tracking-[0.26em] ${accentClass}`}>
            Engine
          </span>
        </span>
      </span>
    </span>
  );
}
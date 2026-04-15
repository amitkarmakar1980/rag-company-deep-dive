type BrandMarkProps = {
  compact?: boolean;
  className?: string;
  tone?: "light" | "dark";
};

function BrandGlyph({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/40 bg-[radial-gradient(circle_at_30%_22%,rgba(251,191,36,0.42),transparent_34%),radial-gradient(circle_at_72%_78%,rgba(217,119,6,0.22),transparent_30%),linear-gradient(145deg,#111827_0%,#1f2937_48%,#0c0a09_100%)] text-white shadow-[0_16px_34px_rgba(28,25,23,0.22)]",
        compact ? "h-10 w-10" : "h-11 w-11",
      ].join(" ")}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" fill="none" className={compact ? "h-6 w-6" : "h-7 w-7"}>
        <path d="M16 6.5 18.85 13.15 25.5 16l-6.65 2.85L16 25.5l-2.85-6.65L6.5 16l6.65-2.85L16 6.5Z" fill="currentColor" opacity="0.95" />
        <path d="M16 10.35 17.55 14.45 21.65 16 17.55 17.55 16 21.65 14.45 17.55 10.35 16 14.45 14.45 16 10.35Z" fill="#f59e0b" opacity="0.95" />
        <circle cx="16" cy="16" r="1.4" fill="white" />
      </svg>
      <span className="absolute inset-x-1.5 bottom-1.5 h-px bg-white/20" />
    </span>
  );
}

export function BrandMark({ compact = false, className, tone = "light" }: BrandMarkProps) {
  const eyebrowClass = tone === "dark" ? "text-stone-400" : "text-[#9c8d81]";
  const wordmarkClass = tone === "dark"
    ? "bg-[linear-gradient(135deg,#fafaf9_0%,#fde68a_52%,#f59e0b_100%)]"
    : "bg-[linear-gradient(135deg,#1a4a3a_0%,#2d7a62_48%,#1c1713_100%)]";
  const pillClass = tone === "dark"
    ? "border border-white/10 bg-white/6 text-stone-200 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
    : "border border-[#d4cdc4] bg-white text-[#7a6d63] shadow-[0_2px_8px_rgba(28,23,19,0.07)]";

  return (
    <span className={["inline-flex items-center gap-3", className ?? ""].join(" ").trim()}>
      <BrandGlyph compact={compact} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`text-[0.6rem] font-medium uppercase tracking-[0.34em] ${eyebrowClass}`}>
          Company Intelligence
        </span>
        <span className="flex items-baseline gap-2 whitespace-nowrap">
          <span className={`${wordmarkClass} bg-clip-text text-lg font-semibold tracking-[-0.045em] text-transparent sm:text-xl`}>
            Deep-Dive
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.26em] ${pillClass}`}>
            Engine
          </span>
        </span>
      </span>
    </span>
  );
}
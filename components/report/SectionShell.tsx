"use client";

import { useState } from "react";

interface SectionShellProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  badge?: React.ReactNode;
  feedback?: React.ReactNode;
  evidenceBacked?: boolean;
}

export function SectionShell({
  id,
  title,
  subtitle,
  children,
  collapsible = false,
  defaultCollapsed = false,
  badge,
  feedback,
  evidenceBacked,
}: SectionShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const scrollToTop = () => {
    const section = document.getElementById(id);
    const scrollRoot = section?.closest<HTMLElement>("[data-report-scroll-root='true']");
    if (scrollRoot && scrollRoot.scrollHeight > scrollRoot.clientHeight) {
      scrollRoot.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="relative border-t border-[#e7ddd2] py-5 first:border-t-0 first:pt-0 sm:py-6"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2
              id={`${id}-heading`}
              className="text-[1rem] font-semibold tracking-[-0.025em] text-[#1c1713] leading-tight sm:text-[1.05rem]"
            >
              {title}
            </h2>
            {badge}
            {evidenceBacked !== undefined && (
              <span
                className={`text-[0.68rem] px-2.5 py-1 rounded-full font-semibold uppercase tracking-[0.18em] ${
                  evidenceBacked
                    ? "bg-[#1a4a3a]/8 text-[#1a4a3a] border border-[#1a4a3a]/20"
                    : "bg-[#f0ece4] text-[#7a6d63] border border-[#d4cdc4]"
                }`}
              >
                {evidenceBacked ? "Evidence-backed" : "Inferred"}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 max-w-3xl text-[0.88rem] leading-5 text-[#7a6d63] sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#8a7b6d] hover:text-[#1a4a3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
            aria-label={`Back to top from ${title}`}
          >
            Top
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7M12 3v18" />
            </svg>
          </button>
          {collapsible && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-controls={`${id}-content`}
              className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c8] bg-[#fffdfa] px-2.5 py-1.5 text-[0.7rem] font-medium text-[#7a6d63] hover:text-[#1c1713] hover:border-[#cbbfb0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 sm:px-3 sm:text-xs transition-colors"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              {collapsed ? "Expand" : "Collapse"}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {(!collapsible || !collapsed) && (
        <div id={`${id}-content`} className="mt-3.5 space-y-3.5 sm:mt-4 sm:space-y-4">
          {children}
          {feedback && (
            <div className="pt-4 border-t border-[#eee4d8]">{feedback}</div>
          )}
        </div>
      )}
    </section>
  );
}

/** Bulleted list */
export function BulletList({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={`space-y-1.5 ${className}`} role="list">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[#4a3f36] leading-6">
          <span className="mt-[0.65rem] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#c8bfb4]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Label + prose block */
export function ProseBlock({ label, value }: { label?: string; value: string }) {
  return (
    <div>
      {label && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-1.5">
          {label}
        </h3>
      )}
      <p className="text-sm text-[#4a3f36] leading-6">{value}</p>
    </div>
  );
}

/** Confidence pill */
export function ConfidencePill({ level }: { level: "high" | "medium" | "low" | "none" }) {
  const styles: Record<string, string> = {
    high: "bg-[#1a4a3a]/8 text-[#1a4a3a] border-[#1a4a3a]/20",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-[#f0ece4] text-[#7a6d63] border-[#d4cdc4]",
    none: "bg-[#f5f1e8] text-[#9c8d81] border-[#d4cdc4]",
  };
  const labels: Record<string, string> = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
    none: "Not assessed",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${styles[level] ?? styles.low}`}
      aria-label={`Confidence: ${level}`}
    >
      {labels[level] ?? level}
    </span>
  );
}

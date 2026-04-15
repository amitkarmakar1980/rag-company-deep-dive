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

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="bg-white border border-[#e4ddd4] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(28,23,19,0.05),0_4px_12px_rgba(28,23,19,0.04)]"
    >
      <div className="px-6 py-5 border-b border-[#f0ece4]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2
                id={`${id}-heading`}
                className="text-sm font-semibold text-[#1c1713] leading-snug"
              >
                {title}
              </h2>
              {badge}
              {evidenceBacked !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
              <p className="text-xs text-[#9c8d81] mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {collapsible && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-controls={`${id}-content`}
              className="flex-shrink-0 text-[#9c8d81] hover:text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 rounded p-1 transition-colors"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              <svg
                className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
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
        <div id={`${id}-content`} className="px-6 py-5 space-y-4">
          {children}
          {feedback && (
            <div className="pt-3 border-t border-[#f0ece4]">{feedback}</div>
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
    <ul className={`space-y-2 ${className}`} role="list">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-[#4a3f36] leading-relaxed">
          <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#c8bfb4]" aria-hidden />
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
      <p className="text-sm text-[#4a3f36] leading-relaxed">{value}</p>
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

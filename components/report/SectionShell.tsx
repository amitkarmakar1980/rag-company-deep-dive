"use client";

import { useState } from "react";

export type ProvenanceType = "cited" | "inferred" | "mixed" | "resume";

const PROVENANCE_STYLES: Record<ProvenanceType, string> = {
  cited: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inferred: "bg-amber-50 text-amber-700 border-amber-200",
  mixed: "bg-sky-50 text-sky-700 border-sky-200",
  resume: "bg-violet-50 text-violet-700 border-violet-200",
};

const PROVENANCE_LABELS: Record<ProvenanceType, string> = {
  cited: "Cited",
  inferred: "Inferred",
  mixed: "Mixed",
  resume: "Resume-based",
};

function SectionIcon({ id }: { id: string }) {
  const iconClass = "h-[1.2rem] w-[1.2rem]";
  const colorBySection: Record<string, string> = {
    executive_summary: "text-[#1f6f5f]",
    five_minute_brief: "text-[#2b6cb0]",
    assessment_snapshot: "text-[#9f7aea]",
    strategic_bet_analysis: "text-[#dd6b20]",
    likely_interview_agenda: "text-[#0f766e]",
    questions_to_ask: "text-[#2563eb]",
    risks_red_flags: "text-[#dc2626]",
    unknowns_to_validate: "text-[#7c3aed]",
    company_snapshot: "text-[#0f766e]",
    company_swot: "text-[#2563eb]",
    role_snapshot: "text-[#c2410c]",
    role_swot: "text-[#7c3aed]",
    why_role_exists_now: "text-[#db2777]",
    evidence_contract: "text-[#059669]",
    candidate_role_match: "text-[#0284c7]",
    strengths_to_emphasize: "text-[#ca8a04]",
    objection_handling: "text-[#dc2626]",
    interviewer_concerns: "text-[#7c3aed]",
    gap_management: "text-[#ea580c]",
    story_recommendations: "text-[#0891b2]",
    positioning_strategy: "text-[#16a34a]",
  };

  const iconBySection: Record<string, React.ReactNode> = {
    executive_summary: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h8l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
    five_minute_brief: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    assessment_snapshot: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V9m5 7V5m5 11v-4" />
      </svg>
    ),
    strategic_bet_analysis: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19l5.5-7 4 4L19 8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 8h4v4" />
      </svg>
    ),
    likely_interview_agenda: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M6 5h12a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1z" />
      </svg>
    ),
    questions_to_ask: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10a4 4 0 117.4 2.1c-.9 1.3-2.4 2.1-2.4 3.9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01" />
      </svg>
    ),
    risks_red_flags: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      </svg>
    ),
    unknowns_to_validate: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3 7.5-7 9-4-1.5-7-4-7-9V7l7-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l1.5 1.5 3.5-4" />
      </svg>
    ),
    company_snapshot: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M9 14h.01M15 10h.01M15 14h.01" />
      </svg>
    ),
    company_swot: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </svg>
    ),
    role_snapshot: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6V4h6v2m-9 2h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V9a1 1 0 011-1z" />
      </svg>
    ),
    role_swot: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </svg>
    ),
    why_role_exists_now: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6l4 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 5.6a9 9 0 1012.8 0" />
      </svg>
    ),
    evidence_contract: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2.5 2.5L16 9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5-3 7.5-7 9-4-1.5-7-4-7-9V7l7-4z" />
      </svg>
    ),
    candidate_role_match: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    strengths_to_emphasize: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17l-5 3 1.5-5.8L4 10.5l6-.4L12 4l2 6.1 6 .4-4.5 3.7L17 20z" />
      </svg>
    ),
    objection_handling: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      </svg>
    ),
    interviewer_concerns: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10a4 4 0 117.4 2.1c-.9 1.3-2.4 2.1-2.4 3.9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01" />
      </svg>
    ),
    gap_management: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h6m4 0h6M10 8l-4 4 4 4M14 8l4 4-4 4" />
      </svg>
    ),
    story_recommendations: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 5.5A2.5 2.5 0 019.5 3H19v16H9.5A2.5 2.5 0 007 21.5v-16z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 5.5v16" />
      </svg>
    ),
    positioning_strategy: (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l4.5-1 9-9a2.1 2.1 0 10-3-3l-9 9L4 20z" />
      </svg>
    ),
  };

  const icon = iconBySection[id] ?? (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14" />
    </svg>
  );

  return (
    <span className={`inline-flex items-center justify-center self-center ${colorBySection[id] ?? "text-[#1a4a3a]"}`} aria-hidden>
      {icon}
    </span>
  );
}

interface SectionShellProps {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  badge?: React.ReactNode;
  feedback?: React.ReactNode;
  provenance?: ProvenanceType;
  onProvenanceClick?: (type: ProvenanceType) => void;
}

export function ProvenancePill({
  type,
  onClick,
}: {
  type: ProvenanceType;
  onClick?: () => void;
}) {
  const className = `inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${PROVENANCE_STYLES[type]}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} cursor-pointer transition-colors hover:brightness-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30`}
        aria-label={`Open provenance details for ${PROVENANCE_LABELS[type]}`}
      >
        {PROVENANCE_LABELS[type]}
      </button>
    );
  }

  return (
    <span className={className}>
      {PROVENANCE_LABELS[type]}
    </span>
  );
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
  provenance,
  onProvenanceClick,
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
              className="inline-flex items-center gap-2 text-[1rem] font-semibold tracking-[-0.025em] text-[#1c1713] leading-tight sm:text-[1.05rem]"
            >
              {title}
              <SectionIcon id={id} />
            </h2>
            {provenance && <ProvenancePill type={provenance} onClick={onProvenanceClick ? () => onProvenanceClick(provenance) : undefined} />}
            {badge}
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
  items: React.ReactNode[];
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
export function ProseBlock({ label, value }: { label?: string; value: React.ReactNode }) {
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

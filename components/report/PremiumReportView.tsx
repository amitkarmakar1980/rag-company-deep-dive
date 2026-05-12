"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { AssessmentSnapshotSection } from "@/components/report/AssessmentSnapshot";
import { PremiumSectionCard } from "@/components/report/PremiumSectionCard";
import { SourceStrategyFeedback } from "@/components/report/SourceStrategyFeedback";
import { SourceStrategyPanel, type SourceStrategyResearchPlan } from "@/components/report/SourceStrategyPanel";
import { ProvenancePill, type ProvenanceType } from "@/components/report/SectionShell";
import { PremiumSectionContent } from "@/lib/report/premiumTypes";
import { buildPremiumPresentationViewModel, type PremiumParsedViewSection, type PremiumViewMode } from "@/lib/report/premiumPresentationViewModel";
import { RecommendationType, ReportScore, ScoreDetail, StructuredReport } from "@/lib/types";
import { formatDateTimeParts } from "@/lib/timezone";

type ViewMode = PremiumViewMode;

type TocSubsection = {
  id: string;
  label: string;
};

type TocItem = {
  id: string;
  label: string;
  group: string;
  subsections?: TocSubsection[];
};

type ParsedPremiumSection = PremiumParsedViewSection;

type AssessmentSnapshotData = StructuredReport["assessment_snapshot"];

interface PremiumReportViewProps {
  requestId: string;
  report: {
    id: string;
    recommendation: RecommendationType;
    reportFormat?: string | null;
    personaProfile?: {
      primaryRoleFamilyLabel?: string;
      secondaryRoleFamilyLabel?: string | null;
      isBlendedPersona?: boolean;
      roleFamilyLabel?: string;
      seniorityLabel?: string;
      subspecialization?: string | null;
      confidence?: "high" | "medium" | "low";
    } | null;
    qualityGate?: {
      overall_quality_score?: number;
      depth_score?: number;
      company_context_score?: number;
      evidence_score?: number;
      persona_score?: number;
      interview_prep_score?: number;
      readiness_to_release_score?: number;
      release_decision?: string;
      warning_flags?: string[];
      blocked_release_reasons?: string[];
    } | null;
    sections: Array<{
      id: string;
      key: string;
      title: string;
      content: string;
      citations?: Array<{ source_id: string; url?: string; title: string }>;
    }>;
    sources: Array<{
      id: string;
      type: string;
      title: string;
      url?: string;
      publishedAt?: string;
    }>;
    tokenUsage: { total_cost_usd: number } | null;
    researchPlan?: SourceStrategyResearchPlan | null;
    company: { name: string; websiteUrl: string | null };
    roleTitle: string | null;
    companyUrl?: string | null;
    jobDescription?: string | null;
    resumeProvided?: boolean;
    scores: ReportScore;
    createdAt: string;
    completedAt: string | null;
  };
  timeZone: string;
}

const GROUP_DESCRIPTIONS: Record<string, string> = {
  "Company Deep Dive": "Use this section to understand the company, its products, its strategic bets, and the real market pressure around the role.",
  "About the Role": "Use this section to understand what the role likely owns, why it exists now, and what problem the company is trying to solve through it.",
  "Candidate-Skill Match": "Use this section to judge whether your background truly fits the role and whether you should pursue the process.",
  "Interview Preparation": "Use this section to rehearse likely questions, choose the right stories, and prepare for the risks interviewers are likely to test.",
  Overview: "Decision-critical orientation points and quick jumps for the report.",
  Appendix: "Reference material preserved with the report for later review.",
};

/** Converts a heading text to a DOM-safe anchor id. */
function headingToId(sectionKey: string, text: string): string {
  return `${sectionKey}__${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Extracts `## Heading` lines from V3 markdown content as subsection TOC entries.
 * Skips the document-level `# Company Deep Dive: …` title.
 */
function extractMarkdownSubsections(sectionKey: string, content: string): TocSubsection[] {
  return content
    .split("\n")
    .filter((line) => /^## /.test(line))
    .map((line) => {
      const label = line.replace(/^## /, "").trim();
      return { id: headingToId(sectionKey, label), label };
    });
}

const PROVENANCE_EXPLAINERS: Record<ProvenanceType, { description: string }> = {
  cited: {
    description: "This section leans on claims that can be traced back to explicit source material or direct citations.",
  },
  mixed: {
    description: "This section combines cited evidence with synthesized interpretation or judgment layered on top of the facts.",
  },
  inferred: {
    description: "This section is built mainly from inference, pattern matching, or incomplete evidence rather than direct verification.",
  },
  resume: {
    description: "This section is personalized using your uploaded resume and the system's interpretation of your background.",
  },
};



const RECOMMENDATION_META: Record<RecommendationType, { label: string; icon: string; tone: string; pill: string }> = {
  pursue: {
    label: "Pursue Aggressively",
    icon: "^",
    tone: "border-[#cfe1d8] bg-[#edf6f0] text-[#1a4a3a]",
    pill: "bg-[#1a4a3a] text-white",
  },
  pursue_cautiously: {
    label: "Pursue Cautiously",
    icon: "~",
    tone: "border-[#eadfbf] bg-[#fff6e7] text-[#8a5a14]",
    pill: "bg-[#b66a00] text-white",
  },
  avoid: {
    label: "Do Not Pursue",
    icon: "!",
    tone: "border-[#ead7d2] bg-[#fbefeb] text-[#8a3d2f]",
    pill: "bg-[#8a3d2f] text-white",
  },
  need_more_signal: {
    label: "Borderline",
    icon: "!",
    tone: "border-[#ddd4c8] bg-[#f5f1e8] text-[#6b5e52]",
    pill: "bg-[#6b5e52] text-white",
  },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsd(value: number): string {
  if (value < 0.001) return "<$0.001";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(3)}`;
}

function sentenceFrom(text: string | undefined, fallback: string): string {
  if (!text) return fallback;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  const firstSentence = normalized.match(/.+?[.!?](\s|$)/)?.[0]?.trim();
  return firstSentence ?? normalized;
}

function extractHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getFaviconUrl(domain: string | null | undefined): string | null {
  const host = extractHostname(domain);
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : null;
}

function getOverviewCardStyle(score: number | null | undefined) {
  if (score == null) {
    return {
      card: "border-[#e5dbcf] bg-[#faf6ef]",
      label: "text-[#9c8d81]",
      value: "text-[#1c1713]",
      detail: "text-[#7a6d63]",
      badge: "bg-[#f0ece4] text-[#5f554c]",
    };
  }

  if (score >= 8) {
    return {
      card: "border-[#cfe1d8] bg-[#edf6f0]",
      label: "text-[#4a7a5a]",
      value: "text-[#1a4a3a]",
      detail: "text-[#4f6a59]",
      badge: "bg-[#1a4a3a] text-white",
    };
  }

  if (score >= 5) {
    return {
      card: "border-[#eadfbf] bg-[#fff6e7]",
      label: "text-[#8a6914]",
      value: "text-[#8a5a14]",
      detail: "text-[#8a7050]",
      badge: "bg-[#8a5a14] text-white",
    };
  }

  return {
    card: "border-[#ead7d2] bg-[#fbefeb]",
    label: "text-[#8a3d2f]",
    value: "text-[#8a3d2f]",
    detail: "text-[#8b6259]",
    badge: "bg-[#8a3d2f] text-white",
  };
}

function getRiskCountStyle(count: number) {
  if (count <= 0) return getOverviewCardStyle(8);
  if (count <= 2) return getOverviewCardStyle(5);
  return getOverviewCardStyle(3);
}

function getScoreMeterTheme(value: number | null | undefined) {
  if (value == null) {
    return {
      card: "bg-[#fffdfa]",
      dialFace: "#f7f2ea",
      dialGlow: "rgba(156,141,129,0.12)",
      needle: "#7a6d63",
      center: "#f0ece4",
      centerText: "#5f554c",
      scaleText: "text-[#9c8d81]",
    };
  }

  if (value >= 8) {
    return {
      card: "bg-[linear-gradient(180deg,#fffdfa_0%,#f1f8f4_100%)]",
      dialFace: "#eff6f1",
      dialGlow: "rgba(26,74,58,0.15)",
      needle: "#1a4a3a",
      center: "#1a4a3a",
      centerText: "#ffffff",
      scaleText: "text-[#4a7a5a]",
    };
  }

  if (value >= 5) {
    return {
      card: "bg-[linear-gradient(180deg,#fffdfa_0%,#fff7e7_100%)]",
      dialFace: "#fff5e3",
      dialGlow: "rgba(237,174,73,0.18)",
      needle: "#c88b20",
      center: "#edae49",
      centerText: "#1c1713",
      scaleText: "text-[#9b6a16]",
    };
  }

  return {
    card: "bg-[linear-gradient(180deg,#fff8f6_0%,#fcefed_100%)]",
    dialFace: "#fbefeb",
    dialGlow: "rgba(199,86,76,0.18)",
    needle: "#c7564c",
    center: "#c7564c",
    centerText: "#ffffff",
    scaleText: "text-[#a54d44]",
  };
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const angleInRadians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function scoreToSignal(score: number): { label: "Strong" | "Mixed" | "Weak"; confidence: "high" | "medium" | "low" } {
  if (score >= 8) return { label: "Strong", confidence: "high" };
  if (score >= 5) return { label: "Mixed", confidence: "medium" };
  return { label: "Weak", confidence: "low" };
}

function riskToSignal(score: number): { label: "Low" | "Medium" | "High"; confidence: "high" | "medium" | "low" } {
  if (score <= 3) return { label: "Low", confidence: "high" };
  if (score <= 6) return { label: "Medium", confidence: "medium" };
  return { label: "High", confidence: "low" };
}

function evidenceMetric(
  sourceCount: number,
  citationCount: number,
  summary: string | undefined,
  evidence: PremiumSectionContent["evidence"] | undefined
): ScoreDetail {
  const baseScore = evidence?.status === "met" ? 8 : evidence?.status === "partial" ? 6 : Math.min(4, Math.max(1, sourceCount >= 3 ? 4 : 3));
  const score = Math.max(baseScore, citationCount >= 8 ? 8 : citationCount >= 4 ? 6 : citationCount > 0 ? 5 : baseScore);
  const signal = scoreToSignal(score);

  return {
    score,
    label: signal.label,
    rationale: sentenceFrom(summary, "Evidence quality reflects how much of the premium brief could be backed by retrieved sources."),
    confidence: evidence?.confidence === "high" ? "high" : evidence?.confidence === "medium" ? "medium" : signal.confidence,
  };
}

function buildAssessmentSnapshotData(args: {
  scores: ReportScore;
  sourceCount: number;
  citationCount: number;
  companySummary?: string;
  strategySummary?: string;
  roleSummary?: string;
  riskSummary?: string;
  candidateSummary?: string;
  evidenceSummary?: string;
  evidence?: PremiumSectionContent["evidence"];
}): AssessmentSnapshotData {
  const companySignal = scoreToSignal(args.scores.company_momentum);
  const orgSignal = scoreToSignal(args.scores.org_clarity);
  const leverageSignal = scoreToSignal(args.scores.role_leverage);
  const riskSignal = riskToSignal(args.scores.execution_risk);
  const candidateNotAssessed = args.scores.candidate_fit <= 0;
  const candidateSignal = candidateNotAssessed ? null : scoreToSignal(args.scores.candidate_fit);

  return {
    company_momentum: {
      score: args.scores.company_momentum,
      label: companySignal.label,
      rationale: sentenceFrom(args.companySummary, "Retrieved company signals indicate the business momentum is a meaningful part of the opportunity."),
      confidence: companySignal.confidence,
    },
    org_clarity: {
      score: args.scores.org_clarity,
      label: orgSignal.label,
      rationale: sentenceFrom(args.strategySummary, "The premium brief suggests some clarity on role scope and org context, but not every operating detail is explicit."),
      confidence: orgSignal.confidence,
    },
    role_leverage: {
      score: args.scores.role_leverage,
      label: leverageSignal.label,
      rationale: sentenceFrom(args.roleSummary, "The role appears positioned to influence priority work if the mandate matches the brief."),
      confidence: leverageSignal.confidence,
    },
    execution_risk: {
      score: args.scores.execution_risk,
      label: riskSignal.label,
      rationale: sentenceFrom(args.riskSummary, "Execution risk reflects the complexity, ambiguity, and delivery pressure implied by the evidence."),
      confidence: riskSignal.confidence,
    },
    candidate_role_match: candidateNotAssessed
      ? {
          score: null,
          label: "NOT_ASSESSED",
          rationale: "No resume-backed personalization was available for this premium report.",
          confidence: "low",
        }
      : {
          score: args.scores.candidate_fit,
          label: candidateSignal!.label,
          rationale: sentenceFrom(args.candidateSummary, "Current fit signals point to how well your background aligns with the role's likely hiring bar."),
          confidence: candidateSignal!.confidence,
        },
    evidence_strength: evidenceMetric(args.sourceCount, args.citationCount, args.evidenceSummary, args.evidence),
  };
}

function ScoreMeter({ label, value }: { label: string; value: number | null | undefined }) {
  const score = value == null ? null : Math.max(0, Math.min(10, value));
  const normalized = score == null ? 0 : score / 10;
  const sweepStart = -120;
  const sweepEnd = 120;
  const needleAngle = sweepStart + normalized * (sweepEnd - sweepStart);
  const theme = getScoreMeterTheme(value);
  const meterBands = [
    { start: 0, end: 5, color: "#c7564c" },
    { start: 5, end: 8, color: "#edae49" },
    { start: 8, end: 10, color: "#1a4a3a" },
  ];
  const ticks = Array.from({ length: 11 }, (_, index) => {
    const tickAngle = sweepStart + (index / 10) * (sweepEnd - sweepStart);
    const outer = polarToCartesian(110, 112, 74, tickAngle);
    const inner = polarToCartesian(110, 112, index % 5 === 0 ? 58 : 64, tickAngle);

    return {
      label: index,
      isMajor: index % 5 === 0,
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      textPoint: polarToCartesian(110, 112, 44, tickAngle),
    };
  });

  return (
    <div className={`rounded-[1.45rem] px-4 py-4 shadow-[0_14px_34px_rgba(28,23,19,0.06)] ${theme.card}`}>
      <p className="text-[0.94rem] font-medium leading-tight text-[#4a3f36]">{label}</p>

      <div
        className="mt-3 rounded-[1.4rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(246,240,232,0.9)_100%)] px-3 py-3"
        aria-label={value == null ? `${label} score unavailable` : `${label} analog score meter ${Math.round(value)} out of 10`}
      >
        <div className="mx-auto w-full max-w-[15rem]">
          <svg viewBox="0 0 220 160" className="w-full overflow-visible" role="presentation" aria-hidden>
            <defs>
              <filter id={`score-meter-glow-${label.replace(/\s+/g, "-").toLowerCase()}`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor={theme.dialGlow} />
              </filter>
            </defs>

            {meterBands.map((band) => {
              const bandStart = sweepStart + (band.start / 10) * (sweepEnd - sweepStart);
              const bandEnd = sweepStart + (band.end / 10) * (sweepEnd - sweepStart);

              return (
                <path
                  key={`${label}-band-${band.start}-${band.end}`}
                  d={describeArc(110, 112, 74, bandStart, bandEnd)}
                  fill="none"
                  stroke={band.color}
                  strokeWidth="18"
                  strokeLinecap="round"
                />
              );
            })}

            <circle cx="110" cy="112" r="52" fill={theme.dialFace} />

            {ticks.map((tick) => (
              <g key={`${label}-tick-${tick.label}`}>
                <line
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke={tick.isMajor ? "rgba(28,23,19,0.55)" : "rgba(28,23,19,0.22)"}
                  strokeWidth={tick.isMajor ? 3 : 2}
                  strokeLinecap="round"
                />
                {tick.isMajor ? (
                  <text
                    x={tick.textPoint.x}
                    y={tick.textPoint.y + 4}
                    textAnchor="middle"
                    className="fill-current text-[10px] font-semibold"
                    style={{ color: "rgba(28,23,19,0.62)" }}
                  >
                    {tick.label}
                  </text>
                ) : null}
              </g>
            ))}

            {score != null ? (
              <g transform={`rotate(${needleAngle} 110 112)`}>
                <path d="M 110 62 L 116 114 L 104 114 Z" fill={theme.needle} />
              </g>
            ) : null}

            <circle cx="110" cy="112" r="11" fill={theme.needle} />
            <circle cx="110" cy="112" r="5" fill="#fffdfa" fillOpacity="0.9" />
          </svg>
        </div>

        <div className="mt-3 flex justify-center">
          <div
            className="min-w-[5.8rem] rounded-full px-3 py-2 text-center shadow-[0_10px_26px_rgba(28,23,19,0.12)]"
            style={{ backgroundColor: theme.center, color: theme.centerText }}
          >
            <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.06em]">
              {score == null ? "N/A" : Math.round(score)}
            </p>
          </div>
        </div>

        <div className={`mt-1 flex items-center justify-between text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${theme.scaleText}`}>
          <span>0</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

function SectionGroupLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="pb-1 pt-6 sm:pt-7">
      <p className="text-[1.38rem] font-semibold uppercase tracking-[0.12em] text-[#5f554c] sm:text-[1.47rem]">{title}</p>
      <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#7a6d63]">{description}</p>
    </div>
  );
}

const COMING_SOON_SECTIONS = [
  {
    id: "candidate-role-analysis",
    title: "Candidate — Role Analysis",
    group: "Candidate Intelligence",
    description: "Structured analysis of how your background maps to the role's requirements, hidden expectations, and likely evaluation criteria.",
  },
  {
    id: "interview-preparation",
    title: "Interview Preparation",
    group: "Interview Intelligence",
    description: "Likely interview structure, question themes, hiring committee concerns, and how to position your experience for this specific role.",
  },
];

function ComingSoonCard({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <section id={id} className="rounded-[24px] border border-dashed border-[#d3c7b9] bg-[#fdfaf5] px-5 py-6 sm:px-7 sm:py-7">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f0e8dc]">
          <svg className="h-3.5 w-3.5 text-[#9c8d81]" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.7" fill="currentColor" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#4a3f36]">{title}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0e8dc] px-2.5 py-0.5 text-[0.67rem] font-semibold uppercase tracking-[0.16em] text-[#9c8d81]">
              Coming soon
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-sm leading-[1.65] text-[#7a6d63]">{description}</p>
        </div>
      </div>
    </section>
  );
}

function ComingSoonGroup() {
  return (
    <div className="mt-9 space-y-3 sm:mt-10">
      <SectionGroupLabel
        title="Candidate Intelligence"
        description="Personalised analysis layers — coming soon. Upload a resume to be notified when these sections launch."
      />
      <div className="space-y-3">
        {COMING_SOON_SECTIONS.map((s) => (
          <ComingSoonCard key={s.id} id={s.id} title={s.title} description={s.description} />
        ))}
      </div>
    </div>
  );
}

function BackToTopButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#8a7b6d] hover:text-[#1a4a3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
    >
      Top
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7M12 3v18" />
      </svg>
    </button>
  );
}

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="inline-flex w-full rounded-full border border-[#ddd4c8] bg-white/85 p-1 shadow-[0_8px_18px_rgba(28,23,19,0.04)] sm:w-auto">
      <button
        type="button"
        onClick={() => onChange("brief")}
        className={`flex-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:flex-none ${mode === "brief" ? "bg-[#1a4a3a] text-white" : "text-[#6b5e52]"}`}
      >
        5-Min Brief
      </button>
      <button
        type="button"
        onClick={() => onChange("full")}
        className={`flex-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:flex-none ${mode === "full" ? "bg-[#1a4a3a] text-white" : "text-[#6b5e52]"}`}
      >
        Full Report
      </button>
    </div>
  );
}


function MobileJumpMenu({
  items,
  activeId,
  open,
  onOpen,
  onClose,
  onSelect,
}: {
  items: TocItem[];
  activeId: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <>
      <div className="sticky top-0 z-20 -mx-1 rounded-[20px] border border-[#e4dacf] bg-[#fffaf3]/92 px-3 py-2.5 shadow-[0_10px_30px_rgba(28,23,19,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Jump to section</p>
            <p className="mt-1 truncate text-sm font-medium text-[#1c1713]">{activeItem?.label ?? "Overview"}</p>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-full border border-[#d7ccbf] bg-white px-3.5 py-2 text-sm font-medium text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            Browse
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Browse report sections">
          <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1c1713]/28 backdrop-blur-[2px]" aria-label="Close section menu" />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[28px] bg-[#fffaf3] shadow-[0_-20px_60px_rgba(28,23,19,0.16)] ring-1 ring-[#eadfd2]">
            <div className="flex items-center justify-between border-b border-[#eee4d8] px-5 py-4">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Mobile contents</p>
                <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-[#1c1713]">Choose a section</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd4c8] bg-white text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
                aria-label="Close section menu"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[calc(82vh-5rem)] overflow-y-auto px-4 py-4">
              <div className="space-y-5">
                {items.map((item, index) => {
                  const showGroupLabel = index === 0 || items[index - 1].group !== item.group;

                  return (
                    <div key={item.id} className="space-y-2">
                      {showGroupLabel ? <p className="px-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">{item.group}</p> : null}
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 ${item.id === activeId ? "border-[#1a4a3a]/20 bg-[#1a4a3a] text-white" : "border-[#e7ddd2] bg-white text-[#4a3f36]"}`}
                      >
                        <span className="font-medium leading-5">{item.label}</span>
                        <svg className={`h-4 w-4 flex-shrink-0 ${item.id === activeId ? "text-white/75" : "text-[#9c8d81]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProvenanceModal({
  openType,
  onClose,
}: {
  openType: ProvenanceType | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!openType) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openType, onClose]);

  if (!openType) return null;

  const explainer = PROVENANCE_EXPLAINERS[openType];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="premium-provenance-modal-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1c1713]/40 backdrop-blur-[3px]" aria-label="Close provenance details" />
      <div className="absolute inset-x-4 top-1/2 mx-auto max-h-[86vh] max-w-3xl -translate-y-1/2 overflow-hidden rounded-[32px] border border-[#ddd4c8] bg-[#fffaf3] shadow-[0_32px_80px_rgba(28,23,19,0.22)] sm:inset-x-8">
        <div className="flex items-start justify-between gap-4 border-b border-[#eee4d8] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Section provenance</p>
            <h2 id="premium-provenance-modal-title" className="mt-1 text-[1.55rem] font-semibold tracking-[-0.04em] text-[#1c1713]">
              How this brief was built
            </h2>
            <div className="mt-3 flex items-center gap-2.5">
              <ProvenancePill type={openType} />
              <p className="text-sm leading-6 text-[#6b5e52]">{explainer.description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd4c8] bg-white text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30" aria-label="Close provenance details">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-sm leading-6 text-[#6b5e52]">
            Use this marker to distinguish direct evidence, synthesis layered on evidence, and sections that depend more heavily on inference.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PremiumReportView({ requestId, report, timeZone }: PremiumReportViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [activeSectionId, setActiveSectionId] = useState("brief-overview");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [desktopTocFloating, setDesktopTocFloating] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = useCallback(async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/deep-dive/${requestId}/regenerate`, { method: "POST" });
      if (res.ok) {
        window.location.href = `/deep-dive/${requestId}`;
      } else {
        setRegenerating(false);
      }
    } catch {
      setRegenerating(false);
    }
  }, [requestId, regenerating]);
  const [activeProvenance, setActiveProvenance] = useState<ProvenanceType | null>(null);

  const scrollReportToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const presentationViewModel = useMemo(
    () => buildPremiumPresentationViewModel(report, viewMode),
    [report, viewMode]
  );

  const visibleSections = presentationViewModel.visibleSections;

  const orderedVisibleSections = visibleSections;

  const sectionMap = useMemo(
    () => Object.fromEntries(orderedVisibleSections.map((section) => [section.key, section])) as Record<string, ParsedPremiumSection>,
    [orderedVisibleSections]
  );

  const completedAtParts = formatDateTimeParts(report.completedAt ?? report.createdAt, timeZone);
  const companyName = report.company.name || "Unknown Company";
  const roleTitle = report.roleTitle || "Target Role";
  const companyHref = report.companyUrl ?? report.company.websiteUrl;
  const companyLogoUrl = getFaviconUrl(companyHref);
  const [personaFamilyLabel, personaSeniorityLabel, personaSubspecialization] = presentationViewModel.personaBadges;

  const decisionSection = sectionMap.decision_memo?.parsed;
  const strategySection = sectionMap.company_role_strategy?.parsed;
  const roleSection = sectionMap.why_role_exists_now?.parsed;
  const candidateFitSection = sectionMap.candidate_fit?.parsed;
  const interviewPrepSection = sectionMap.interview_prep?.parsed;
  const credibilitySection = sectionMap.credibility_layer?.parsed;
  const costSection = sectionMap.operations_and_cost?.parsed;
  const sourceCount = report.sources.length;
  const citationCount = visibleSections.reduce((count, section) => count + (section.citations?.length ?? 0), 0);
  const uniqueWebsiteCount = new Set(
    report.sources
      .map((source) => extractHostname(source.url))
      .filter((host): host is string => Boolean(host))
  ).size;
  const hasResumePersonalization = Boolean(report.resumeProvided) || report.scores.candidate_fit > 0;

  const freshestMeaningfulSource = report.sources
    .filter((source) => source.type !== "job_description" && !!source.publishedAt)
    .map((source) => ({
      title: source.title,
      date: new Date(source.publishedAt as string),
    }))
    .filter((source) => !Number.isNaN(source.date.getTime()))
    .sort((left, right) => right.date.getTime() - left.date.getTime())[0] ?? null;

  const freshestSourceAgeDays = freshestMeaningfulSource
    ? Math.max(0, Math.floor((Date.now() - freshestMeaningfulSource.date.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const unresolvedRiskCount = visibleSections.reduce((count, section) => {
    const calloutCount = section.parsed.callouts?.filter((callout) => callout.tone === "risk" || callout.tone === "unknown").length ?? 0;
    const evidencePenalty = section.parsed.evidence?.status === "insufficient" ? 1 : 0;
    return count + calloutCount + evidencePenalty;
  }, 0);

  const recommendationConfidenceLabel =
    decisionSection?.evidence?.confidence === "high"
      ? "High"
      : decisionSection?.evidence?.confidence === "medium"
      ? "Mixed"
      : decisionSection?.evidence?.confidence === "low"
      ? "Low"
      : "Mixed";
  const recommendationConfidenceScore =
    decisionSection?.evidence?.confidence === "high"
      ? 8
      : decisionSection?.evidence?.confidence === "medium"
      ? 6
      : decisionSection?.evidence?.confidence === "low"
      ? 4
      : 6;

  const overviewCards = [
    (() => {
      const style = hasResumePersonalization ? getOverviewCardStyle(report.scores.candidate_fit) : getOverviewCardStyle(null);
      return {
        label: "Candidate Role Match",
        value: hasResumePersonalization ? `${report.scores.candidate_fit.toFixed(1)}/10` : "Missing Signal",
        detail: hasResumePersonalization
          ? sentenceFrom(candidateFitSection?.summary, "Resume-backed signals indicate how your background maps to the role.")
          : "Upload a resume to unlock the candidate-role match scoring layer.",
        badge: hasResumePersonalization ? scoreToSignal(report.scores.candidate_fit).label : "No Resume",
        style,
      };
    })(),
    (() => {
      const style = getOverviewCardStyle(recommendationConfidenceScore);
      return {
        label: "Recommendation Confidence",
        value: recommendationConfidenceLabel,
        detail: sentenceFrom(decisionSection?.summary, "Confidence reflects how strongly the evidence supports the recommendation."),
        badge: null,
        style,
      };
    })(),
    (() => {
      const freshnessScore = freshestSourceAgeDays == null ? null : freshestSourceAgeDays <= 30 ? 8 : freshestSourceAgeDays <= 90 ? 5 : 3;
      const style = getOverviewCardStyle(freshnessScore);
      const value = freshestSourceAgeDays == null ? "Undated" : freshestSourceAgeDays === 0 ? "Today" : freshestSourceAgeDays === 1 ? "1 day" : `${freshestSourceAgeDays} days`;

      return {
        label: "Evidence Freshness",
        value,
        detail: freshestMeaningfulSource
          ? `${freshestMeaningfulSource.title} is the newest dated source in the evidence set.`
          : "No published dates were available across meaningful external sources.",
        badge: null,
        style,
      };
    })(),
    (() => {
      const style = getRiskCountStyle(unresolvedRiskCount);
      return {
        label: "Unresolved Risks",
        value: `${unresolvedRiskCount}`,
        detail:
          unresolvedRiskCount === 0
            ? "No open risk callouts were stored in the visible premium sections."
            : `${unresolvedRiskCount} visible risk or unknown signals still merit validation before the interview process.`,
        badge: null,
        style,
      };
    })(),
  ];

  const assessmentSnapshotData = useMemo(
    () =>
      buildAssessmentSnapshotData({
        scores: report.scores,
        sourceCount,
        citationCount,
        companySummary: decisionSection?.summary,
        strategySummary: strategySection?.summary,
        roleSummary: roleSection?.summary,
        riskSummary: interviewPrepSection?.summary,
        candidateSummary: candidateFitSection?.summary,
        evidenceSummary: credibilitySection?.summary,
        evidence: credibilitySection?.evidence ?? decisionSection?.evidence,
      }),
    [
      candidateFitSection?.summary,
      citationCount,
      credibilitySection?.evidence,
      credibilitySection?.summary,
      decisionSection?.evidence,
      decisionSection?.summary,
      interviewPrepSection?.summary,
      report.scores,
      roleSection?.summary,
      sourceCount,
      strategySection?.summary,
    ]
  );

  const tocItems = useMemo((): TocItem[] => [
    { id: "brief-overview", label: "Overview", group: "Overview", subsections: [] },
    ...(report.jobDescription ? [{ id: "job-description", label: "Job Description", group: "Overview", subsections: [] }] : []),
    { id: "assessment_snapshot", label: "Assessment Snapshot", group: "Decision", subsections: [] },
    ...orderedVisibleSections.map((section): TocItem => ({
      id: section.key,
      label: section.title,
      group: section.group,
      subsections:
        section.key === "company_deep_dive_v3"
          ? extractMarkdownSubsections(section.key, section.content)
          : [],
    })),
    ...COMING_SOON_SECTIONS.map((s) => ({ id: s.id, label: s.title, group: s.group, subsections: [] })),
    ...(report.researchPlan ? [{ id: "source-strategy-catalog", label: "Source Strategy Catalog", group: "Appendix", subsections: [] }] : []),
  ], [orderedVisibleSections, report.jobDescription, report.researchPlan]);

  const currentTocItem = tocItems.find((item) => item.id === activeSectionId) ?? tocItems[0] ?? null;
  const recommendationMeta = RECOMMENDATION_META[report.recommendation] ?? RECOMMENDATION_META.need_more_signal;

  const scrollToSection = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(id);
    setMobileTocOpen(false);
  }, []);

  useEffect(() => {
    // Observe top-level report sections (section[id])
    const observedSections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    // Also observe V3 subsection headings (h2[id^="company_deep_dive_v3__"])
    const observedHeadings = Array.from(
      document.querySelectorAll<HTMLElement>('h2[id^="company_deep_dive_v3__"]')
    );
    const allTargets = [...observedSections, ...observedHeadings];
    if (allTargets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSectionId(visible.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-16% 0px -58% 0px",
        threshold: [0.12, 0.3, 0.55, 0.8],
      }
    );

    allTargets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [viewMode, visibleSections.length, report.jobDescription]);

  useEffect(() => {
    const updateFloatingState = () => {
      setDesktopTocFloating(window.scrollY >= window.innerHeight * 0.9);
    };

    updateFloatingState();
    window.addEventListener("scroll", updateFloatingState, { passive: true });

    return () => window.removeEventListener("scroll", updateFloatingState);
  }, []);

  const groupedContent = orderedVisibleSections.flatMap((section, index) => {
    const previous = orderedVisibleSections[index - 1];
    const groupIntro = !previous || previous.group !== section.group;

    return [
      groupIntro ? (
        <SectionGroupLabel
          key={`${section.id}-group-label`}
          title={section.group}
          description={GROUP_DESCRIPTIONS[section.group] ?? ""}
        />
      ) : null,
      <PremiumSectionCard
        key={section.id}
        sectionKey={section.key}
        title={section.title}
        content={section.content}
        citations={section.citations}
        onProvenanceClick={setActiveProvenance}
        feedback={<FeedbackButtons reportId={report.id} sectionKey={section.key} compact />}
      />,
    ];
  });

  return (
    <main id="top" className="min-h-screen bg-[linear-gradient(180deg,#f8f4ed_0%,#f6f1e8_45%,#f4efe6_100%)]">
      <ProvenanceModal openType={activeProvenance} onClose={() => setActiveProvenance(null)} />
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 xl:py-3">
        <div className="xl:grid xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-6">
          <aside className="mt-[30px] hidden xl:block xl:self-start xl:sticky xl:top-4 xl:h-fit">
            <div>
              <nav className="relative pl-3 pr-1" aria-label="Report table of contents">
                <div className="absolute bottom-0 left-0 top-0 w-px bg-[linear-gradient(180deg,rgba(201,191,180,0.18),rgba(201,191,180,0.88)_16%,rgba(201,191,180,0.88)_84%,rgba(201,191,180,0.18))]" aria-hidden />
                <div className={`transition-all duration-300 ${desktopTocFloating ? "py-1.5" : "py-0.5"}`}>
                  <div className="space-y-0.5">
                    {tocItems.map((item, index) => {
                      const showGroupLabel = index === 0 || tocItems[index - 1].group !== item.group;
                      const hasSubsections = (item.subsections?.length ?? 0) > 0;
                      const isCollapsed = collapsedSections.has(item.id);
                      const isActive = activeSectionId === item.id ||
                        (item.subsections?.some((s) => s.id === activeSectionId) ?? false);

                      return (
                        <div key={item.id}>
                          {showGroupLabel ? (
                            <p className="px-1.5 pb-1 pt-7 text-[0.65rem] font-bold uppercase leading-none tracking-[0.2em] text-[#9c8d81] first:pt-2">
                              {item.group}
                            </p>
                          ) : null}

                          {/* Section row — scroll + optional collapse toggle */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => scrollToSection(item.id)}
                              className={`group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-[5px] text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 ${isActive ? "text-[#1a4a3a]" : "text-[#6b5e52] hover:text-[#1c1713]"}`}
                              aria-current={activeSectionId === item.id ? "location" : undefined}
                            >
                              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${isActive ? "bg-[#1a4a3a]" : "bg-[#d4ccc4] group-hover:bg-[#9c8d81]"}`} aria-hidden />
                              <span className={`truncate text-[0.73rem] leading-[1.1rem] ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                            </button>

                            {hasSubsections && (
                              <button
                                type="button"
                                onClick={() => setCollapsedSections((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                })}
                                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#9c8d81] transition-colors hover:bg-[#ede8e1] hover:text-[#4a3f36] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a4a3a]/30"
                                aria-label={isCollapsed ? "Expand subsections" : "Collapse subsections"}
                              >
                                <svg className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} fill="none" viewBox="0 0 10 6">
                                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Subsection list */}
                          {hasSubsections && !isCollapsed && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[#e5dbcf] pl-2">
                              {item.subsections!.map((sub) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => scrollToSection(sub.id)}
                                  className={`block w-full rounded px-1.5 py-[3px] text-left text-[0.68rem] leading-[1.2rem] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1a4a3a]/30 ${activeSectionId === sub.id ? "font-semibold text-[#1a4a3a]" : "font-medium text-[#9c8d81] hover:text-[#4a3f36]"}`}
                                  aria-current={activeSectionId === sub.id ? "location" : undefined}
                                >
                                  {sub.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>
          </aside>

          <div data-report-scroll-root="true" className="xl:border-b xl:border-x xl:border-[#ddd4c8]">
            <article className="report-density-tight mx-auto w-[90%] max-w-none px-3 pb-4 pt-0 sm:px-7 sm:pb-7 sm:pt-0">
              <section id="brief-overview" className="relative overflow-hidden px-4 pb-5 pt-1 sm:px-8 sm:pb-8 sm:pt-1">
                <div className="absolute -left-16 top-6 h-28 w-28 rounded-full bg-[#1a4a3a]/6 blur-3xl sm:top-8 sm:h-40 sm:w-40" aria-hidden />
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#4a7a8a]/10 blur-3xl sm:h-32 sm:w-32" aria-hidden />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-[2.08rem] font-semibold tracking-[-0.055em] leading-[0.93] text-[#1c1713] sm:text-[2.56rem] whitespace-nowrap">
                        Company Deep Dive And Interview Prep
                      </h1>
                      <p className="mt-1.5 text-[0.76rem] text-[#9c8d81]">
                        {completedAtParts
                          ? `Generated ${completedAtParts.date} at ${completedAtParts.time} ${completedAtParts.shortLabel}`
                          : "Generated recently"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3 pt-1">
                      <div className="hidden xl:block">
                        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
                      </div>
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="flex items-center gap-1.5 rounded-lg border border-[#d3c7b9] bg-white px-3 py-1.5 text-[0.76rem] font-medium text-[#4a3f36] shadow-sm transition-all hover:border-[#b8a99a] hover:bg-[#faf6ef] hover:text-[#1c1713] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
                        title="Regenerate this report with the same inputs"
                      >
                        <svg
                          className={`h-3.5 w-3.5 flex-shrink-0 ${regenerating ? "animate-spin" : ""}`}
                          viewBox="0 0 16 16" fill="none" aria-hidden
                        >
                          <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M8 1v3l2.5-1.5L8 1Z" fill="currentColor" />
                        </svg>
                        {regenerating ? "Regenerating…" : "Regenerate"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 border-b border-[#e2d8cc]" aria-hidden />

                  <div className="mt-6 flex items-center gap-4 sm:gap-5">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_20px_rgba(28,23,19,0.08)] ring-1 ring-[#e2d8cc] sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[22px]">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-9 w-9 sm:h-12 sm:w-12" />
                      ) : (
                        <span className="text-xl font-semibold tracking-[-0.04em] text-[#1a4a3a] sm:text-2xl">{companyName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-[1.75rem] font-semibold tracking-[-0.05em] leading-[0.95] text-[#1c1713] sm:text-[2.4rem]">{companyName}</h2>
                      <p className="mt-1 text-[1rem] font-medium text-[#5f554c] sm:text-[1.1rem]">{roleTitle}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold sm:text-sm ${recommendationMeta.pill}`}>
                      <span aria-hidden>{recommendationMeta.icon}</span>
                      {recommendationMeta.label}
                    </span>
                    {personaFamilyLabel ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d3c7b9] bg-white px-3.5 py-1.5 text-[0.82rem] font-medium text-[#1c1713] sm:text-sm">
                        {personaFamilyLabel}
                        {personaSubspecialization ? <span className="text-[#9c8d81]">· {personaSubspecialization}</span> : null}
                      </span>
                    ) : null}
                    {personaSeniorityLabel ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d3c7b9] bg-[#f5f1e8] px-3.5 py-1.5 text-[0.82rem] font-medium text-[#4a3f36] sm:text-sm">
                        {personaSeniorityLabel}
                      </span>
                    ) : null}
                    {hasResumePersonalization ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1a4a3a]/20 bg-[#1a4a3a]/8 px-3.5 py-1.5 text-[0.82rem] font-medium text-[#1a4a3a] sm:text-sm">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Personalized with your resume
                      </span>
                    ) : null}
                    {companyHref ? (
                      <a
                        href={companyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#d3c7b9] bg-white px-3.5 py-1.5 text-[0.82rem] font-medium text-[#1c1713] transition-colors hover:border-[#bfb3a4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 sm:text-sm"
                      >
                        Company Site
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 4h6m0 0v6m0-6L10 14" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 001 1h9" />
                        </svg>
                      </a>
                    ) : null}
                    {report.jobDescription ? (
                      <button
                        type="button"
                        onClick={() => scrollToSection("job-description")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#d3c7b9] bg-[#f5f1e8] px-3.5 py-1.5 text-[0.82rem] font-medium text-[#4a3f36] transition-colors hover:border-[#bfb3a4] hover:text-[#1c1713] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 sm:text-sm"
                      >
                        View Job Description
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    ) : null}
                    <div className="xl:hidden">
                      <ViewModeToggle mode={viewMode} onChange={setViewMode} />
                    </div>
                  </div>


                  <div className="mt-7 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 xl:grid-cols-4">
                    {overviewCards.map((card) => (
                      <div key={card.label} className={`rounded-[24px] border px-5 py-4 sm:px-6 sm:py-5 ${card.style.card}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${card.style.label}`}>{card.label}</p>
                            <p className={`mt-2 text-[1.45rem] font-semibold leading-none tracking-[-0.05em] sm:text-[1.7rem] ${card.style.value}`}>{card.value}</p>
                          </div>
                          {card.badge ? <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${card.style.badge}`}>{card.badge}</span> : null}
                        </div>
                        <p className={`mt-3 text-[0.8rem] leading-[1.5] ${card.style.detail}`}>{card.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
                    <ScoreMeter label="Company Momentum" value={report.scores.company_momentum} />
                    <ScoreMeter label="Org Clarity" value={report.scores.org_clarity} />
                    <ScoreMeter label="Role Leverage" value={report.scores.role_leverage} />
                    <ScoreMeter label="Execution Risk" value={report.scores.execution_risk} />
                  </div>
                </div>
              </section>

              <section className="mt-4 xl:hidden">
                <MobileJumpMenu
                  items={tocItems}
                  activeId={currentTocItem?.id ?? "brief-overview"}
                  open={mobileTocOpen}
                  onOpen={() => setMobileTocOpen(true)}
                  onClose={() => setMobileTocOpen(false)}
                  onSelect={scrollToSection}
                />
              </section>

              {viewMode === "brief" ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5">
                  <svg className="h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">5-Minute Brief mode</span> shows only the decision-critical sections.
                    <button
                      type="button"
                      onClick={() => setViewMode("full")}
                      className="ml-1 rounded underline hover:text-amber-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-700"
                    >
                      Switch to Full Report
                    </button>
                  </p>
                </div>
              ) : null}

              <section id="assessment_snapshot" className="mt-9 border-t border-[#e2d8cc] px-1 pt-8 sm:mt-10 sm:pt-10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-[1.65rem] font-semibold tracking-[-0.04em] text-[#1c1713]">Assessment Snapshot</h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#b66a00]">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V9m5 7V5m5 11v-4" />
                        </svg>
                        Inferred
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7a6d63]">
                      AI-generated signal scores based on retrieved evidence. Use for decision support, not as facts.
                    </p>
                  </div>
                  <BackToTopButton onClick={scrollReportToTop} />
                </div>

                <div className="mt-5 rounded-[24px] bg-[#f7f2ea] px-4 py-4 ring-1 ring-[#e5dbcf] sm:px-5 sm:py-5">
                  <AssessmentSnapshotSection data={assessmentSnapshotData} />
                </div>
              </section>

              <div className="mt-9 space-y-1.5 sm:mt-10">{groupedContent}</div>

              <ComingSoonGroup />

              {report.researchPlan ? (
                <div className="mt-9 sm:mt-10">
                  <SourceStrategyPanel
                    id="source-strategy-catalog"
                    researchPlan={report.researchPlan}
                    feedback={<SourceStrategyFeedback reportId={report.id} />}
                  />
                </div>
              ) : null}

              {report.jobDescription ? (
                <section id="job-description" className="mt-8 rounded-[24px] bg-[#f7f2ea] px-4 py-5 ring-1 ring-[#e5dbcf] sm:mt-9 sm:rounded-[30px] sm:px-7 sm:py-6">
                  <div className="flex items-start justify-between gap-3">
                    <div />
                    <BackToTopButton onClick={scrollReportToTop} />
                  </div>
                  <div className="mt-2 grid gap-7 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Appendix</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">Job Description</h2>
                        <p className="mt-2.5 text-sm leading-5 text-[#7a6d63]">The original role language is preserved here at the end of the report for reference.</p>
                      </div>
                      <div className="space-y-3 text-sm text-[#4a3f36]">
                        <p><span className="font-semibold text-[#1c1713]">Company:</span> {companyName}</p>
                        <p><span className="font-semibold text-[#1c1713]">Role:</span> {roleTitle}</p>
                        <p><span className="font-semibold text-[#1c1713]">Sources:</span> {formatNumber(sourceCount)} retrieved items across {formatNumber(uniqueWebsiteCount)} websites</p>
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-[#e8ded2] sm:rounded-[26px] sm:px-5 sm:py-5">
                      <div className="max-h-[24rem] overflow-y-auto pr-2">
                        <p className="whitespace-pre-line text-sm leading-6 text-[#4a3f36]">{report.jobDescription}</p>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {costSection?.facts?.length ? (
                <div className="mt-8 rounded-[24px] border border-[#ddd4c8] bg-white/85 px-5 py-5 text-sm leading-6 text-[#6b5e52]">
                  This premium report is the default experience for new runs. Legacy reports remain stored in the database and are not overwritten.
                  {report.tokenUsage ? <span className="ml-1 font-medium text-[#1c1713]">Visible compute cost: {formatUsd(report.tokenUsage.total_cost_usd)}.</span> : null}
                </div>
              ) : null}
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}

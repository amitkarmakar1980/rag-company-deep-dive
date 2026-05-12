"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { ReportSectionCard } from "@/components/ReportSectionCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { SourcesPanel } from "@/components/report/SourcesPanel";
import { CitationResourcesPanel } from "@/components/report/CitationResourcesPanel";
import { ResumeUploadPanel } from "@/components/report/ResumeUploadPanel";
import { PremiumReportView } from "@/components/report/PremiumReportView";
import { SourceStrategyPanel, type SourceStrategyResearchPlan } from "@/components/report/SourceStrategyPanel";
import { SourceStrategyFeedback } from "@/components/report/SourceStrategyFeedback";
import { getCanonicalRecommendation } from "@/lib/report/recommendation";
import {
  CandidateRoleMatchSection,
  StrengthsToEmphasizeSection,
  InterviewerConcernsSection,
  GapManagementSection,
  StoryRecommendationsSection,
  PositioningStrategySection,
  SectionSkeleton,
} from "@/components/report/CandidateOverlaySections";
import { ObjectionHandlingSection } from "@/components/report/ObjectionHandling";
import { SectionShell, ProvenancePill, ConfidencePill, type ProvenanceType } from "@/components/report/SectionShell";
import { RecommendationType, ReportScore, CandidateOverlayData, ReportTokenUsage, StructuredReport } from "@/lib/types";
import { useResumeStore } from "@/lib/hooks/useResumeStore";
import { normalizeHttpUrl } from "@/lib/report/sourceLinks";
import { formatDateTimeParts, useRequestTimeZone } from "@/lib/timezone";

interface Report {
  id: string;
  reportFormat?: string;
  reportFamily?: string;
  personaProfile?: {
    primaryRoleFamilyLabel?: string;
    secondaryRoleFamilyLabel?: string | null;
    isBlendedPersona?: boolean;
    roleFamilyLabel?: string;
    seniorityLabel?: string;
    subspecialization?: string | null;
    confidence?: "high" | "medium" | "low";
  } | null;
  presentationPlan?: {
    sectionOrder?: string[];
    titleBySectionKey?: Record<string, string>;
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
  recommendation: RecommendationType;
  scores: ReportScore;
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
  tokenUsage: ReportTokenUsage | null;
  researchPlan?: SourceStrategyResearchPlan | null;
  createdAt: string;
  company: {
    name: string;
    websiteUrl: string | null;
  };
  roleTitle: string | null;
  companyUrl: string | null;
  jobDescription: string | null;
  resumeProvided?: boolean;
  requestCreatedAt: string | null;
  completedAt: string | null;
}

interface RequestStatus {
  requestId: string;
  status: string;
  errorMessage?: string | null;
  requestMeta?: {
    companyUrl?: string | null;
    roleTitle?: string | null;
  } | null;
  requestSources?: Array<{
    id: string;
    title: string;
    type: string;
    url?: string | null;
  }>;
  researchPlan?: SourceStrategyResearchPlan | null;
  progress?: {
    stage: "synthesizing" | "writing_sections" | "finalizing";
    completedSections: number;
    totalSections: number;
    headline: string;
    detail: string;
  } | null;
  report?: { id: string };
}

type ProcessingStep = {
  key: string;
  label: string;
  detail?: string;
  state?: "pending" | "current" | "complete";
};

type ProcessingSubStep = {
  key: string;
  label: string;
  detail?: string;
  state: "pending" | "current" | "complete";
};

type OverlayStatus = "none" | "uploading" | "generating" | "completed" | "failed";

interface OverlayState {
  status: OverlayStatus;
  data: CandidateOverlayData | null;
  error: string | null;
}

type ViewMode = "full" | "brief";

const PROVENANCE_EXPLAINERS: Record<ProvenanceType, { title: string; description: string }> = {
  cited: {
    title: "Cited",
    description: "This section leans on claims that can be traced back to explicit source material or direct citations.",
  },
  mixed: {
    title: "Mixed",
    description: "This section combines cited evidence with synthesized interpretation or judgment layered on top of the facts.",
  },
  inferred: {
    title: "Inferred",
    description: "This section is built mainly from inference, pattern matching, or incomplete evidence rather than direct verification.",
  },
  resume: {
    title: "Resume-based",
    description: "This section is personalized using your uploaded resume and the system's interpretation of your background.",
  },
};

const PROCESSING_STATUSES = new Set([
  "pending",
  "fetching_sources",
  "indexing",
  "generating_report",
  "generating_deep_analysis",
  "generating_interview_layer",
]);

const STATUS_LABELS: Record<string, string> = {
  pending: "Starting analysis...",
  fetching_sources: "Fetching sources from the web...",
  indexing: "Indexing and embedding content...",
  generating_report: "Generating your intelligence brief...",
  generating_deep_analysis: "Running deep strategic analysis...",
  generating_interview_layer: "Running interview prep layer...",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  company_homepage: "Company Site",
  blog: "Company Blog",
  job_description: "Job Description",
  newsroom: "News & Press",
  custom_url: "External URL",
  profile_text: "Provided Context",
};

const RECOMMENDATION_META: Record<RecommendationType, { label: string; icon: string; tone: string }> = {
  pursue: {
    label: "Pursue",
    icon: "^",
    tone: "border-[#cfe1d8] bg-[#edf6f0] text-[#1a4a3a]",
  },
  pursue_cautiously: {
    label: "Pursue Cautiously",
    icon: "~",
    tone: "border-[#d8e5ea] bg-[#eef5f8] text-[#2d5c6a]",
  },
  avoid: {
    label: "Avoid",
    icon: "!",
    tone: "border-[#ead7d2] bg-[#fbefeb] text-[#8a3d2f]",
  },
  need_more_signal: {
    label: "Need More Signal",
    icon: "!",
    tone: "border-[#ead7d2] bg-[#fbefeb] text-[#8a3d2f]",
  },
};

const PROCESSING_COLOR_BY_STAGE: Record<string, { accent: string; soft: string; border: string }> = {
  pending: {
    accent: "#7a6d63",
    soft: "bg-[#f5f1e8]",
    border: "border-[#ddd4c8]",
  },
  fetching_sources: {
    accent: "#2d5c6a",
    soft: "bg-[#eef5f8]",
    border: "border-[#d8e5ea]",
  },
  indexing: {
    accent: "#8a5a14",
    soft: "bg-[#fff6e7]",
    border: "border-[#eadfbf]",
  },
  generating_report: {
    accent: "#1a4a3a",
    soft: "bg-[#edf6f0]",
    border: "border-[#cfe1d8]",
  },
  generating_deep_analysis: {
    accent: "#7f4c9a",
    soft: "bg-[#f3ecfa]",
    border: "border-[#e3d6f3]",
  },
  generating_interview_layer: {
    accent: "#9b6a16",
    soft: "bg-[#fff6e7]",
    border: "border-[#eadfbf]",
  },
};

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function ProgressPieIndicator({
  fill,
  accent,
  state,
}: {
  fill: number;
  accent: string;
  state: ProcessingStep["state"];
}) {
  const clampedFill = Math.max(0, Math.min(100, fill));
  const fillDegrees = Math.round((clampedFill / 100) * 360);
  const background = state === "complete"
    ? `conic-gradient(${accent} 0deg 360deg, rgba(228,221,212,0.7) 360deg 360deg)`
    : `conic-gradient(${accent} 0deg ${fillDegrees}deg, rgba(228,221,212,0.9) ${fillDegrees}deg 360deg)`;

  return (
    <span className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background }} aria-hidden>
      <span className="absolute inset-[2px] rounded-full bg-[#fffdfa]" />
      <span
        className="relative h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: state === "pending" ? "#c4b8aa" : accent, opacity: state === "pending" ? 0.7 : 1 }}
      />
    </span>
  );
}

function parseSectionContent<T>(content: string | null | undefined): T | null {
  if (!content) return null;

  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

const OVERLAY_SECTIONS = [
  { key: "candidate_role_match", title: "Candidate Role Match", subtitle: "How your background maps to the role, seniority, and likely hiring bar." },
  { key: "strengths_to_emphasize", title: "Strengths to Emphasize", subtitle: "Themes to lean into when positioning your experience." },
  { key: "objection_handling", title: "Objection Handling", subtitle: "Likely pushback and the strongest response frames." },
  { key: "interviewer_concerns", title: "Interviewer Concerns", subtitle: "Concerns that may surface and how they are likely to be interpreted." },
  { key: "gap_management", title: "Gap Management", subtitle: "How to discuss missing experience or ambiguity without overreaching." },
  { key: "story_recommendations", title: "Story Recommendations", subtitle: "Narratives and examples that best support your candidacy." },
  { key: "positioning_strategy", title: "Positioning Strategy", subtitle: "Overall angle for how to frame yourself against this role." },
] as const;

const BRIEF_SECTION_KEYS = new Set(["executive_summary", "interview_decision_summary", "five_minute_brief", "assessment_snapshot"]);

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
}

function formatUsd(value: number): string {
  if (value < 0.001) return "<$0.001";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(3)}`;
}

function titleCaseWord(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
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

function getScoreMeterTheme(value: number | null | undefined) {
  if (value == null) {
    return {
      card: "bg-[#fffdfa]",
      accent: "#9c8d81",
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
      accent: "#1a4a3a",
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
      accent: "#9b6a16",
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
    accent: "#b44d43",
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
                {tick.isMajor && (
                  <text
                    x={tick.textPoint.x}
                    y={tick.textPoint.y + 4}
                    textAnchor="middle"
                    className="fill-current text-[10px] font-semibold"
                    style={{ color: "rgba(28,23,19,0.62)" }}
                  >
                    {tick.label}
                  </text>
                )}
              </g>
            ))}

            {score != null && (
              <g transform={`rotate(${needleAngle} 110 112)`}>
                <path d="M 110 62 L 116 114 L 104 114 Z" fill={theme.needle} />
              </g>
            )}

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
      <button type="button" onClick={() => onChange("brief")} className={`flex-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:flex-none ${mode === "brief" ? "bg-[#1a4a3a] text-white" : "text-[#6b5e52]"}`}>
        5-Min Brief
      </button>
      <button type="button" onClick={() => onChange("full")} className={`flex-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:flex-none ${mode === "full" ? "bg-[#1a4a3a] text-white" : "text-[#6b5e52]"}`}>
        Full Report
      </button>
    </div>
  );
}

function LockedOverlaySection({ sectionId, title, subtitle, onProvenanceClick }: { sectionId: string; title: string; subtitle?: string; onProvenanceClick?: (type: ProvenanceType) => void }) {
  return (
    <SectionShell id={sectionId} title={title} subtitle={subtitle} provenance="resume" onProvenanceClick={onProvenanceClick}>
      <div className="rounded-2xl border border-[#e5dbcf] bg-[#faf6ef] px-4 py-4 text-sm leading-6 text-[#7a6d63]">
        Upload a resume to unlock this personalized section.
      </div>
    </SectionShell>
  );
}

function LockedPersonalisedSection({ sectionId, title, subtitle, generating = false, onProvenanceClick }: { sectionId: string; title: string; subtitle?: string; generating?: boolean; onProvenanceClick?: (type: ProvenanceType) => void }) {
  return (
    <SectionShell id={sectionId} title={title} subtitle={subtitle} provenance="resume" onProvenanceClick={onProvenanceClick}>
      <div className="rounded-2xl border border-[#e5dbcf] bg-[#faf6ef] px-4 py-4 text-sm leading-6 text-[#7a6d63]">
        {generating ? "Generating a personalized version of this section now..." : "Upload a resume to unlock this personalized section."}
      </div>
    </SectionShell>
  );
}

function ProvenanceModal({
  openType,
  onClose,
  children,
}: {
  openType: ProvenanceType | null;
  onClose: () => void;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="provenance-modal-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1c1713]/40 backdrop-blur-[3px]" aria-label="Close provenance details" />
      <div className="absolute inset-x-4 top-1/2 mx-auto max-h-[86vh] max-w-5xl -translate-y-1/2 overflow-hidden rounded-[32px] border border-[#ddd4c8] bg-[#fffaf3] shadow-[0_32px_80px_rgba(28,23,19,0.22)] sm:inset-x-8">
        <div className="flex items-start justify-between gap-4 border-b border-[#eee4d8] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Section provenance</p>
            <h2 id="provenance-modal-title" className="mt-1 text-[1.55rem] font-semibold tracking-[-0.04em] text-[#1c1713]">
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
        <div className="max-h-[calc(86vh-7.5rem)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function getStepStatusRank(state: ProcessingStep["state"]): number {
  if (state === "complete") return 2;
  if (state === "current") return 1;
  return 0;
}

function getSimpleStepProgress(step: Pick<ProcessingStep, "key" | "state">, elapsedSeconds: number, progress?: RequestStatus["progress"]): number {
  if (step.state === "complete") return 100;
  if (step.state === "pending") return 0;

  if (step.key === "writing_sections") {
    const total = Math.max(progress?.totalSections ?? 1, 1);
    return Math.max(10, Math.min(95, Math.round(((progress?.completedSections ?? 0) / total) * 100)));
  }

  // Asymptotic curve: starts ~8%, approaches 92%, never decreases.
  // Half-life tuned per step so the bar feels responsive without stalling early.
  const halfLifeSeconds = step.key === "rag" ? 25 : 55;
  return Math.round(8 + 84 * (1 - Math.exp(-elapsedSeconds / halfLifeSeconds)));
}

function buildRagSiteSteps(
  statusKey: string,
  requestSources?: RequestStatus["requestSources"],
  researchPlan?: SourceStrategyResearchPlan | null
): ProcessingSubStep[] {
  const fetchedUrls = new Set(
    (requestSources ?? [])
      .map((source) => normalizeHttpUrl(source.url ?? undefined))
      .filter((url): url is string => Boolean(url))
  );

  const plannedSources = (researchPlan?.selectedSources ?? [])
    .filter((source) => Boolean(normalizeHttpUrl(source.url)))
    .slice(0, 8);

  const fallbackSources = (requestSources ?? [])
    .filter((source) => Boolean(normalizeHttpUrl(source.url ?? undefined)))
    .slice(0, 8)
    .map((source) => ({
      key: source.id,
      label: extractHostname(source.url) ?? source.title,
      detail: SOURCE_TYPE_LABELS[source.type] ?? source.type.replace(/_/g, " "),
      state: (statusKey === "fetching_sources" || statusKey === "indexing") ? "current" : "complete",
    } satisfies ProcessingSubStep));

  if (!plannedSources.length) {
    return fallbackSources;
  }

  return plannedSources.map((source, index) => {
    const normalizedUrl = normalizeHttpUrl(source.url)!;
    const fetched = fetchedUrls.has(normalizedUrl);
    const state = fetched
      ? "complete"
      : statusKey === "fetching_sources" || statusKey === "indexing"
      ? index === 0 || fallbackSources.length > 0
        ? "current"
        : "pending"
      : "pending";

    return {
      key: `${source.type}-${index}`,
      label: source.label?.trim() || extractHostname(normalizedUrl) || normalizedUrl,
      detail: SOURCE_TYPE_LABELS[source.type] ?? source.type.replace(/_/g, " "),
      state,
    } satisfies ProcessingSubStep;
  });
}

function buildSimpleProgressSteps(args: {
  statusKey: string;
  progress?: RequestStatus["progress"];
  elapsedSeconds: number;
  requestSources?: RequestStatus["requestSources"];
  researchPlan?: SourceStrategyResearchPlan | null;
}) {
  const ragState: ProcessingStep["state"] =
    args.statusKey === "pending"
      ? "pending"
      : args.statusKey === "fetching_sources" || args.statusKey === "indexing"
      ? "current"
      : "complete";
  const synthesisState: ProcessingStep["state"] =
    args.statusKey === "generating_report" || args.statusKey === "generating_deep_analysis" || args.statusKey === "generating_interview_layer"
      ? "current"
      : args.statusKey === "completed"
      ? "complete"
      : getStepStatusRank(ragState) >= 2
      ? "pending"
      : "pending";
  const finalizeState: ProcessingStep["state"] =
    args.progress?.stage === "finalizing"
      ? "current"
      : args.statusKey === "completed"
      ? "complete"
      : "pending";

  const steps: Array<ProcessingStep & { progressValue: number; items?: ProcessingSubStep[] }> = [
    {
      key: "plan",
      label: "Prepare the run",
      detail: "Validate the request, set up the report run, and prepare the retrieval plan.",
      state: args.statusKey === "pending" ? "current" : "complete",
      progressValue: args.statusKey === "pending" ? getSimpleStepProgress({ key: "plan", state: "current" }, args.elapsedSeconds) : 100,
    },
    {
      key: "rag",
      label: "RAG: crawl and prepare evidence",
      detail: "Fetch role and company evidence, then clean and prepare it for retrieval.",
      state: ragState,
      progressValue: ragState === "complete" ? 100 : ragState === "current" ? getSimpleStepProgress({ key: "rag", state: ragState }, args.elapsedSeconds, args.progress) : 0,
      items: buildRagSiteSteps(args.statusKey, args.requestSources, args.researchPlan),
    },
    {
      key: "synthesis",
      label: "Generate the report",
      detail: args.progress?.detail ?? "Synthesize company, role, candidate-fit, and interview-prep sections.",
      state: synthesisState,
      progressValue: synthesisState === "complete" ? 100 : synthesisState === "current" ? getSimpleStepProgress({ key: args.progress?.stage === "writing_sections" ? "writing_sections" : "synthesis", state: synthesisState }, args.elapsedSeconds, args.progress) : 0,
    },
    {
      key: "finalize",
      label: "Finalize and publish",
      detail: "Finish persistence and flip the report into the completed state.",
      state: finalizeState,
      progressValue: finalizeState === "complete" ? 100 : finalizeState === "current" ? getSimpleStepProgress({ key: "finalize", state: finalizeState }, args.elapsedSeconds, args.progress) : 0,
    },
  ];

  return steps;
}

function ProcessingScreen({
  statusKey,
  progress,
  requestSources,
  researchPlan,
}: {
  statusKey: string;
  progress?: RequestStatus["progress"];
  requestSources?: RequestStatus["requestSources"];
  researchPlan?: SourceStrategyResearchPlan | null;
}) {
  const label = progress?.headline ?? STATUS_LABELS[statusKey] ?? "Generating report...";
  const detail = progress?.detail;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [statusKey, progress?.stage]);

  const palette = PROCESSING_COLOR_BY_STAGE[statusKey] ?? PROCESSING_COLOR_BY_STAGE.pending;
  const simpleSteps = useMemo(
    () => buildSimpleProgressSteps({ statusKey, progress, elapsedSeconds, requestSources, researchPlan }),
    [statusKey, progress, elapsedSeconds, requestSources, researchPlan]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl items-start px-4 py-10 sm:py-14">
      <div className="w-full rounded-[28px] border border-[#ddd4c8] bg-[#fffaf3] px-6 py-7 shadow-[0_22px_50px_rgba(28,23,19,0.08)] sm:px-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">In progress</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#1c1713] sm:text-[1.55rem]">{label}</h1>
            {detail ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b5e52]">{detail}</p> : null}
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${palette.border} ${palette.soft}`} style={{ color: palette.accent }}>
            Elapsed {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {simpleSteps.map((step) => (
            <div key={step.key} className="rounded-[20px] border border-[#e7ddd2] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(28,23,19,0.04)]">
              <div className="flex items-start gap-3">
                <ProgressPieIndicator
                  fill={step.progressValue}
                  accent={palette.accent}
                  state={step.state}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-[#1c1713]">{step.label}</p>
                      {step.detail ? <p className="mt-1 text-xs leading-5 text-[#7a6d63]">{step.detail}</p> : null}
                    </div>
                    <span className="rounded-full border border-[#e5dbcf] bg-[#faf6ef] px-2.5 py-1 text-[0.68rem] font-medium text-[#6b5e52]">
                      {step.state === "complete" ? "Complete" : step.state === "current" ? "In progress" : "Pending"}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#efe7dc]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${step.progressValue}%`,
                        background: `linear-gradient(90deg, ${palette.accent} 0%, rgba(26,74,58,0.78) 100%)`,
                      }}
                    />
                  </div>

                  {step.items?.length ? (
                    <ul className="mt-3 space-y-2">
                      {step.items.map((item) => (
                        <li key={item.key} className="flex items-start gap-2 text-xs leading-5 text-[#6b5e52]">
                          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${item.state === "complete" ? "bg-[#1a4a3a]" : item.state === "current" ? "bg-[#2d5c6a]" : "bg-[#c4b8aa]"}`} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-[#4a3f36]">{item.label}</span>
                            {item.detail ? <span className="text-[#8a7d70]"> · {item.detail}</span> : null}
                          </span>
                          <span className="text-[#9c8d81]">
                            {item.state === "complete" ? "done" : item.state === "current" ? "crawling" : "queued"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompletionTransitionScreen({
  companyName,
  roleTitle,
}: {
  companyName?: string | null;
  roleTitle?: string | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl items-start px-4 py-10 sm:py-14">
      <div className="relative w-full overflow-hidden rounded-[32px] border border-[#d7e5dc] bg-[linear-gradient(180deg,rgba(255,252,246,0.98)_0%,rgba(240,248,243,0.98)_100%)] px-6 py-10 shadow-[0_28px_70px_rgba(26,74,58,0.10)] sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(26,74,58,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(141,181,158,0.18),transparent_42%)]" aria-hidden />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#cfe1d8] bg-white shadow-[0_18px_40px_rgba(26,74,58,0.10)]">
            <span className="absolute inset-0 rounded-full bg-[#1a4a3a]/8 animate-ping" aria-hidden />
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1a4a3a] text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6f8e80]">Report ready</p>
          <h1 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.05em] text-[#18382d] sm:text-[2.35rem]">
            Your brief is prepared.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#4d6358] sm:text-[0.98rem]">
            Handing off from premium synthesis to the finished report for {roleTitle ?? "your target role"}
            {companyName ? ` at ${companyName}` : ""}.
          </p>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#dbe8df] bg-white/80 px-4 py-4 text-left">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#89a095]">Completed</p>
              <p className="mt-2 text-sm font-medium text-[#18382d]">Synthesis locked</p>
              <p className="mt-2 text-xs leading-5 text-[#62776d]">Strategy, fit, and interview-prep layers are now consistent enough to publish.</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe8df] bg-white/80 px-4 py-4 text-left">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#89a095]">Now loading</p>
              <p className="mt-2 text-sm font-medium text-[#18382d]">Final report shell</p>
              <p className="mt-2 text-xs leading-5 text-[#62776d]">Sections, navigation, and evidence panels are being attached for reading mode.</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe8df] bg-white/80 px-4 py-4 text-left">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#89a095]">Next</p>
              <p className="mt-2 text-sm font-medium text-[#18382d]">Reading handoff</p>
              <p className="mt-2 text-xs leading-5 text-[#62776d]">You’ll land directly in the finished report rather than a jarring page swap.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TocButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group ml-2 flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 ${active ? "text-[#1a4a3a]" : "text-[#6b5e52] hover:text-[#1c1713]"}`}
      aria-current={active ? "location" : undefined}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${active ? "bg-[#1a4a3a]" : "bg-[#d4ccc4] group-hover:bg-[#9c8d81]"}`} aria-hidden />
      <span className={`text-[0.73rem] leading-[1.1rem] ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </button>
  );
}

function MobileJumpMenu({ items, activeId, open, onOpen, onClose, onSelect }: { items: Array<{ id: string; label: string; group: string }>; activeId: string; open: boolean; onOpen: () => void; onClose: () => void; onSelect: (id: string) => void; }) {
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  return (
    <>
      <div className="sticky top-0 z-20 -mx-1 rounded-[20px] border border-[#e4dacf] bg-[#fffaf3]/92 px-3 py-2.5 shadow-[0_10px_30px_rgba(28,23,19,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Jump to section</p>
            <p className="mt-1 truncate text-sm font-medium text-[#1c1713]">{activeItem?.label ?? "Overview"}</p>
          </div>
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-full border border-[#d7ccbf] bg-white px-3.5 py-2 text-sm font-medium text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30" aria-haspopup="dialog" aria-expanded={open}>
            Browse
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Browse report sections">
          <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1c1713]/28 backdrop-blur-[2px]" aria-label="Close section menu" />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[28px] bg-[#fffaf3] shadow-[0_-20px_60px_rgba(28,23,19,0.16)] ring-1 ring-[#eadfd2]">
            <div className="flex items-center justify-between border-b border-[#eee4d8] px-5 py-4">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Mobile contents</p>
                <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-[#1c1713]">Choose a section</h2>
              </div>
              <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd4c8] bg-white text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30" aria-label="Close section menu">
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
                      {showGroupLabel && <p className="px-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">{item.group}</p>}
                      <button type="button" onClick={() => onSelect(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 ${item.id === activeId ? "border-[#1a4a3a]/20 bg-[#1a4a3a] text-white" : "border-[#e7ddd2] bg-white text-[#4a3f36]"}`}>
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
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState<"useful" | "not_useful" | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [credibilityCollapsed, setCredibilityCollapsed] = useState(true);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeProvenance, setActiveProvenance] = useState<ProvenanceType | null>(null);
  const [completionHandoff, setCompletionHandoff] = useState<{ visible: boolean; companyName?: string | null; roleTitle?: string | null }>({
    visible: false,
    companyName: null,
    roleTitle: null,
  });
  const { timeZone } = useRequestTimeZone();

  const { stored: storedResume } = useResumeStore();

  // Overlay state
  const [overlay, setOverlay] = useState<OverlayState>({
    status: "none",
    data: null,
    error: null,
  });
  const overlayPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("brief-overview");
  const [desktopTocFloating, setDesktopTocFloating] = useState(false);
  const openProvenanceModal = useCallback((type: ProvenanceType) => {
    setActiveProvenance(type);
  }, []);
  const closeProvenanceModal = useCallback(() => {
    setActiveProvenance(null);
  }, []);

  // ─── Overlay polling ──────────────────────────────────────────────────────

  const pollOverlay = useCallback(async () => {
    try {
      const res = await fetch(`/api/overlay/${requestId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.exists) return;

      if (data.status === "completed" && data.data) {
        setOverlay({ status: "completed", data: data.data, error: null });
        if (overlayPollRef.current) {
          clearInterval(overlayPollRef.current);
          overlayPollRef.current = null;
        }
      } else if (data.status === "failed") {
        setOverlay({ status: "failed", data: null, error: data.error });
        if (overlayPollRef.current) {
          clearInterval(overlayPollRef.current);
          overlayPollRef.current = null;
        }
      } else if (data.status === "generating" || data.status === "pending") {
        setOverlay((prev) => ({ ...prev, status: "generating" }));
      }
    } catch {
      // Swallow poll errors silently
    }
  }, [requestId]);

  const startOverlayPolling = useCallback(() => {
    if (overlayPollRef.current) clearInterval(overlayPollRef.current);
    overlayPollRef.current = setInterval(pollOverlay, 3000);
  }, [pollOverlay]);

  const checkExistingOverlay = useCallback(async (storedResumeText?: string) => {
    try {
      const res = await fetch(`/api/overlay/${requestId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.exists) {
        // Determine the best resume source to use for auto-personalization
        const body = data.resumeOnFile
          ? JSON.stringify({ requestId, reuseExisting: true })          // resume in DB — reuse it
          : storedResumeText
          ? JSON.stringify({ requestId, resumeText: storedResumeText }) // resume in localStorage
          : null;                                                        // no resume at all

        if (body) {
          // Auto-trigger overlay — no click needed
          setOverlay({ status: "generating", data: null, error: null });
          fetch("/api/resume/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body,
          })
            .then((r) => r.ok ? r.json() : Promise.reject(`Upload returned ${r.status}`))
            .then(() => startOverlayPolling())
            .catch((err) => {
              console.error("[overlay auto-retry]", err);
              setOverlay({ status: "failed", data: null, error: "Personalization failed" });
            });
        }
        // No resume anywhere — panel will offer user-triggered option
        return;
      }

      if (data.status === "completed" && data.data) {
        setOverlay({ status: "completed", data: data.data, error: null });
      } else if (data.status === "generating" || data.status === "pending") {
        setOverlay({ status: "generating", data: null, error: null });
        startOverlayPolling();
      } else if (data.status === "failed") {
        setOverlay({ status: "failed", data: null, error: data.error });
      }
    } catch {
      // Non-critical
    }
  }, [requestId, startOverlayPolling]);

  const handleOverlayUploaded = useCallback(() => {
    setOverlay({ status: "generating", data: null, error: null });
    startOverlayPolling();
  }, [startOverlayPolling]);

  useEffect(() => {
    return () => {
      if (overlayPollRef.current) clearInterval(overlayPollRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    };
  }, []);

  // ─── Base report fetching ─────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/deep-dive/status?id=${requestId}`);
      if (!res.ok) throw new Error("Failed to fetch status");

      const data: RequestStatus = await res.json();
      const shouldShowCompletionHandoff =
        data.status === "completed" &&
        Boolean(data.report) &&
        previousStatusRef.current !== null &&
        PROCESSING_STATUSES.has(previousStatusRef.current);

      setStatus(data);

      if (data.report) {
        const reportRes = await fetch(`/api/report/${data.report.id}`);
        if (!reportRes.ok) throw new Error("Failed to fetch report");
        const reportData = await reportRes.json();

        if (shouldShowCompletionHandoff) {
          if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
          setCompletionHandoff({
            visible: true,
            companyName: reportData.company?.name ?? null,
            roleTitle: reportData.roleTitle ?? null,
          });
          completionTimeoutRef.current = setTimeout(() => {
            setReport(reportData);
            setCompletionHandoff({ visible: false, companyName: null, roleTitle: null });
            checkExistingOverlay(storedResume?.text);
          }, 1600);
        } else {
          setReport(reportData);
          checkExistingOverlay(storedResume?.text);
        }
      }

      previousStatusRef.current = data.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [requestId, checkExistingOverlay, storedResume]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!status || !PROCESSING_STATUSES.has(status.status)) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [status?.status, fetchStatus]);

  const handleRegenerate = async () => {
    if (!confirm("This will re-fetch all sources and regenerate the full brief. Continue?")) return;
    setRegenerating(true);
    setReport(null);
    setError(null);
    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    setCompletionHandoff({ visible: false, companyName: null, roleTitle: null });
    previousStatusRef.current = null;
    try {
      const res = await fetch(`/api/deep-dive/${requestId}/regenerate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start regeneration");
      }
      setStatus({ requestId, status: "pending" });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const handleOverallFeedback = async (feedbackType: "useful" | "not_useful") => {
    if (!report) return;
    setOverallFeedback(feedbackType);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, feedbackType }),
    });
  };

  const scrollToSection = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(id);
    setMobileTocOpen(false);
  }, []);

  const scrollReportToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!report) return;

    const observedSections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
    if (observedSections.length === 0) return;

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

    observedSections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [report, viewMode, overlay.status]);

  useEffect(() => {
    const updateFloatingState = () => {
      setDesktopTocFloating(window.scrollY >= window.innerHeight * 0.9);
    };

    updateFloatingState();
    window.addEventListener("scroll", updateFloatingState, { passive: true });

    return () => window.removeEventListener("scroll", updateFloatingState);
  }, [report]);

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf8f3]">
        <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#e4ddd4] border-t-[#1a4a3a] animate-spin" role="status" aria-label="Loading" />
          <p className="text-sm text-[#9c8d81]">Loading…</p>
        </div>
      </main>
    );
  }

  // ─── Error / failed ───────────────────────────────────────────────────────

  if (error || status?.status === "failed") {
    const failureMessage = error ?? status?.errorMessage ?? "An error occurred while generating this report.";

    return (
      <main className="min-h-screen bg-[#faf8f3]">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center" role="alert">
            <h1 className="text-base font-semibold text-red-800 mb-2">Report Generation Failed</h1>
            <p className="text-sm text-[#6b5e52] mb-6">{failureMessage}</p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 bg-[#1a4a3a] text-white border border-[#1a4a3a] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#153d30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/50 disabled:opacity-50 transition-colors"
            >
              {regenerating ? "Starting…" : "Try Again"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Processing ───────────────────────────────────────────────────────────

  if (status && PROCESSING_STATUSES.has(status.status)) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-[#faf8f3]">
        <ProcessingScreen
          statusKey={status.status}
          progress={status.progress}
          requestSources={status.requestSources}
          researchPlan={status.researchPlan}
        />
      </main>
    );
  }

  if (completionHandoff.visible) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-[#faf8f3]">
        <CompletionTransitionScreen companyName={completionHandoff.companyName} roleTitle={completionHandoff.roleTitle} />
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[#faf8f3]">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-[#9c8d81] text-sm">Report not found.</p>
        </div>
      </main>
    );
  }

  if (report.reportFamily === "premium" || report.reportFormat === "premium_v1" || report.reportFormat === "premium_v2" || report.reportFormat === "premium_v3") {
    return <PremiumReportView requestId={requestId} report={report} timeZone={timeZone} />;
  }

  // ─── Report ready ─────────────────────────────────────────────────────────

  // Build a keyed lookup for sections
  const sectionByKey = Object.fromEntries(report.sections.map((s) => [s.key, s]));
  const completedAtParts = formatDateTimeParts(report.completedAt ?? report.createdAt, timeZone);
  const companyName = report.company.name || "Unknown Company";
  const roleTitle = report.roleTitle || "Target Role";
  const companyHref = report.companyUrl ?? report.company.websiteUrl;
  const companyLogoUrl = getFaviconUrl(companyHref);
  const executiveSummaryData = parseSectionContent<StructuredReport["executive_summary"]>(
    sectionByKey.executive_summary?.content
  );
  const interviewDecisionData = parseSectionContent<StructuredReport["interview_decision_summary"]>(
    sectionByKey.interview_decision_summary?.content
  );
  const assessmentSnapshotData = parseSectionContent<StructuredReport["assessment_snapshot"]>(
    sectionByKey.assessment_snapshot?.content
  );
  const risksRedFlagsData = parseSectionContent<StructuredReport["risks_red_flags"]>(
    sectionByKey.risks_red_flags?.content
  ) ?? [];
  const unknownsToValidateData = parseSectionContent<StructuredReport["unknowns_to_validate"]>(
    sectionByKey.unknowns_to_validate?.content
  );
  const evidenceContractData = parseSectionContent<StructuredReport["evidence_contract"]>(
    sectionByKey.evidence_contract?.content
  );
  const hasOverlay = overlay.status === "completed" && overlay.data !== null;
  const overlayGenerating = overlay.status === "generating" || overlay.status === "uploading";
  const effectiveCandidateFitScore = hasOverlay
    ? overlay.data?.candidate_role_match?.match_score ?? report.scores.candidate_fit
    : report.scores.candidate_fit;
  const canonicalRecommendation = getCanonicalRecommendation({
    reportRecommendation: report.recommendation,
    executiveRecommendation: executiveSummaryData?.recommendation,
    pursuitStance: executiveSummaryData?.pursuit_stance,
    interviewRecommendation: interviewDecisionData?.pursue_recommendation,
    candidateFitScore: effectiveCandidateFitScore,
  });
  const recommendationMeta =
    canonicalRecommendation.level === 3
      ? { label: canonicalRecommendation.displayLabel, icon: "~", tone: "border-[#d8e5ea] bg-[#eef5f8] text-[#2d5c6a]", pill: "bg-[#2d5c6a] text-white" }
      : canonicalRecommendation.level === 2
      ? { label: canonicalRecommendation.displayLabel, icon: "~", tone: "border-[#eadfbf] bg-[#fff6e7] text-[#8a5a14]", pill: "bg-amber-600 text-white" }
      : canonicalRecommendation.level <= 1
      ? { label: canonicalRecommendation.displayLabel, icon: "!", tone: "border-[#ead7d2] bg-[#fbefeb] text-[#8a3d2f]", pill: "bg-red-600 text-white" }
      : { ...(RECOMMENDATION_META[canonicalRecommendation.reportRecommendation] ?? RECOMMENDATION_META.need_more_signal), pill: "bg-[#1a4a3a] text-white" };
  const uniqueWebsiteCount = new Set(
    report.sources
      .map((source) => extractHostname(source.url))
      .filter((host): host is string => Boolean(host))
  ).size;
  const sourceBreakdown = Object.entries(
    report.sources.reduce<Record<string, number>>((accumulator, source) => {
      const label = SOURCE_TYPE_LABELS[source.type] ?? source.type.replace(/_/g, " ");
      accumulator[label] = (accumulator[label] ?? 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1]);
  const hasValidCitations = report.sections.some((section) =>
    (section.citations ?? []).some((citation) => {
      const source = report.sources.find((item) => item.id === citation.source_id);
      return Boolean(normalizeHttpUrl(citation.url) ?? normalizeHttpUrl(source?.url));
    })
  );

  const freshestMeaningfulSource = report.sources
    .filter((source) => source.type !== "job_description" && source.type !== "profile_text" && !!source.publishedAt)
    .map((source) => ({
      title: source.title,
      date: new Date(source.publishedAt as string),
    }))
    .filter((source) => !Number.isNaN(source.date.getTime()))
    .sort((left, right) => right.date.getTime() - left.date.getTime())[0] ?? null;

  const freshestSourceAgeDays = freshestMeaningfulSource
    ? Math.max(0, Math.floor((Date.now() - freshestMeaningfulSource.date.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const evidenceStrength = assessmentSnapshotData?.evidence_strength;
  const unresolvedRiskCount = risksRedFlagsData.length + (unknownsToValidateData?.unknowns.length ?? 0);

  const overviewCards = [
    (() => {
      const style = hasOverlay ? getOverviewCardStyle(effectiveCandidateFitScore) : getOverviewCardStyle(null);
      const badge = hasOverlay
        ? titleCaseWord(overlay.data?.candidate_role_match?.overall_fit ?? "strong")
        : overlayGenerating
        ? "In Progress"
        : "No Resume";

      return {
        label: "Candidate Role Match",
        value: hasOverlay
          ? `${(effectiveCandidateFitScore ?? 0).toFixed(1)}/10`
          : overlayGenerating
          ? "Pending"
          : "Missing Signal",
        detail: hasOverlay
          ? (overlay.data?.candidate_role_match?.rationale ?? "Resume-based assessment of how your background maps to the role.")
          : overlayGenerating
          ? "Resume uploaded. Candidate-role match is still generating."
          : "Upload a resume to score candidate-role match.",
        badge,
        style,
      };
    })(),
    (() => {
      const style = getOverviewCardStyle(evidenceStrength?.score ?? null);
      return {
        label: "Recommendation Confidence",
        value: evidenceStrength?.label && evidenceStrength.label !== "NOT_ASSESSED" ? evidenceStrength.label : "Missing Signal",
        detail: evidenceStrength?.rationale ?? `Evidence quality is based on ${formatNumber(report.sources.length)} sources across ${formatNumber(uniqueWebsiteCount)} websites.`,
        badge: null,
        style,
      };
    })(),
    (() => {
      const freshnessScore = freshestSourceAgeDays == null ? null : freshestSourceAgeDays <= 30 ? 8 : freshestSourceAgeDays <= 90 ? 5 : 3;
      const style = getOverviewCardStyle(freshnessScore);
      const value = freshestSourceAgeDays == null
        ? "Undated"
        : freshestSourceAgeDays === 0
        ? "Today"
        : freshestSourceAgeDays === 1
        ? "1 day"
        : `${freshestSourceAgeDays} days`;

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
      const unknownCount = unknownsToValidateData?.unknowns.length ?? 0;

      return {
        label: "Unresolved Risks",
        value: `${unresolvedRiskCount}`,
        detail: unresolvedRiskCount === 0
          ? "No open red flags or unresolved interview unknowns are currently tracked."
          : `${risksRedFlagsData.length} red flags and ${unknownCount} unknowns still need validation.`,
        badge: null,
        style,
      };
    })(),
  ];

  // Sections that are visible in 5-min brief mode
  const visibleSections = (key: string) =>
    viewMode === "full" || BRIEF_SECTION_KEYS.has(key);
  const hasCredibilityFlow = viewMode === "full" && Boolean(evidenceContractData || report.sources.length > 0);

  const tocItems = [
    { id: "brief-overview", label: "Overview", group: "Overview" },
    report.jobDescription ? { id: "job-description", label: "Job Description", group: "Overview" } : null,
    sectionByKey.executive_summary && visibleSections("executive_summary")
      ? { id: "executive_summary", label: sectionByKey.executive_summary.title, group: "Decision" }
      : null,
    sectionByKey.five_minute_brief && visibleSections("five_minute_brief")
      ? { id: "five_minute_brief", label: sectionByKey.five_minute_brief.title, group: "Decision" }
      : null,
    sectionByKey.assessment_snapshot && visibleSections("assessment_snapshot")
      ? { id: "assessment_snapshot", label: sectionByKey.assessment_snapshot.title, group: "Decision" }
      : null,
    viewMode === "full" ? { id: OVERLAY_SECTIONS[0].key, label: OVERLAY_SECTIONS[0].title, group: "Candidate Positioning" } : null,
    sectionByKey.strategic_bet_analysis && visibleSections("strategic_bet_analysis")
      ? { id: "strategic_bet_analysis", label: sectionByKey.strategic_bet_analysis.title, group: "Candidate Positioning" }
      : null,
    viewMode === "full"
      ? OVERLAY_SECTIONS.slice(1).map((section) => ({ id: section.key, label: section.title, group: "Candidate Positioning" }))
      : null,
    sectionByKey.likely_interview_agenda && visibleSections("likely_interview_agenda")
      ? { id: "likely_interview_agenda", label: sectionByKey.likely_interview_agenda.title, group: "Interview Prep" }
      : null,
    sectionByKey.questions_to_ask && visibleSections("questions_to_ask")
      ? { id: "questions_to_ask", label: sectionByKey.questions_to_ask.title, group: "Interview Prep" }
      : null,
    sectionByKey.risks_red_flags && visibleSections("risks_red_flags")
      ? { id: "risks_red_flags", label: sectionByKey.risks_red_flags.title, group: "Interview Prep" }
      : null,
    sectionByKey.unknowns_to_validate && visibleSections("unknowns_to_validate")
      ? { id: "unknowns_to_validate", label: sectionByKey.unknowns_to_validate.title, group: "Interview Prep" }
      : null,
    sectionByKey.company_snapshot && visibleSections("company_snapshot")
      ? { id: "company_snapshot", label: sectionByKey.company_snapshot.title, group: "Strategic Context" }
      : null,
    sectionByKey.company_swot && visibleSections("company_swot")
      ? { id: "company_swot", label: sectionByKey.company_swot.title, group: "Strategic Context" }
      : null,
    sectionByKey.role_snapshot && visibleSections("role_snapshot")
      ? { id: "role_snapshot", label: sectionByKey.role_snapshot.title, group: "Strategic Context" }
      : null,
    sectionByKey.role_swot && visibleSections("role_swot")
      ? { id: "role_swot", label: sectionByKey.role_swot.title, group: "Strategic Context" }
      : null,
    sectionByKey.why_role_exists_now && visibleSections("why_role_exists_now")
      ? { id: "why_role_exists_now", label: sectionByKey.why_role_exists_now.title, group: "Strategic Context" }
      : null,
    hasCredibilityFlow && hasValidCitations ? { id: "citations", label: "Citations", group: "Credibility" } : null,
    hasCredibilityFlow ? { id: "how-this-was-built", label: "How This Brief Was Built", group: "Credibility" } : null,
    hasCredibilityFlow ? { id: "ai-activity", label: "AI Activity", group: "Credibility" } : null,
    hasCredibilityFlow && report.sources.length > 0 ? { id: "sources", label: "Evidence Sources", group: "Credibility" } : null,
    report.researchPlan ? { id: "source-strategy-catalog", label: "Source Strategy Catalog", group: "Credibility" } : null,
  ]
    .flat()
    .filter((item): item is { id: string; label: string; group: string } => Boolean(item));
  const currentTocItem = tocItems.find((item) => item.id === activeSectionId) ?? tocItems[0] ?? null;

  // Helper: merge overlay candidate_role_match into assessment_snapshot content
  const getAssessmentSnapshotContent = (section: typeof report.sections[0]): string => {
    if (!hasOverlay || !overlay.data) return section.content;
    try {
      const parsed = JSON.parse(section.content);
      const om = overlay.data.candidate_role_match;
      const fitToLabel: Record<string, string> = {
        strong: "Strong",
        moderate: "Mixed",
        stretch: "Weak",
        mismatch: "Weak",
      };
      parsed.candidate_role_match = {
        score: om.match_score,
        label: fitToLabel[om.overall_fit] ?? "Mixed",
        rationale: om.rationale,
        confidence: "high",
      };
      return JSON.stringify(parsed);
    } catch {
      return section.content;
    }
  };

  // Helper: render a base section card
  const renderBaseSection = (key: string) => {
    const section = sectionByKey[key];
    if (!section) return null;
    if (!visibleSections(key)) return null;

    // interview_decision_summary requires resume context to be meaningful
    if (key === "interview_decision_summary") {
      if (overlayGenerating) {
        return (
          <LockedPersonalisedSection
            key={key}
            sectionId={key}
            title={section.title}
            subtitle="Personalised pursue recommendation — generating now…"
            generating
            onProvenanceClick={openProvenanceModal}
          />
        );
      }
      if (!hasOverlay) {
        return (
          <LockedPersonalisedSection
            key={key}
            sectionId={key}
            title={section.title}
            subtitle="Pursue recommendation, positioning angle, top questions, and key watchouts"
            onProvenanceClick={openProvenanceModal}
          />
        );
      }
    }

    const content =
      key === "assessment_snapshot"
        ? getAssessmentSnapshotContent(section)
        : key === "executive_summary" && executiveSummaryData
        ? JSON.stringify({
            ...executiveSummaryData,
            recommendation: canonicalRecommendation.reportRecommendation,
            pursuit_stance: canonicalRecommendation.pursuitStance,
            interview_decision_summary: interviewDecisionData
              ? {
                  ...interviewDecisionData,
                  pursue_recommendation: canonicalRecommendation.interviewRecommendation,
                  biggest_interviewer_concern:
                    overlay.data?.candidate_role_match?.overall_fit === "mismatch"
                      ? "Domain mismatch with the core requirements of the role."
                      : interviewDecisionData.biggest_interviewer_concern,
                  best_positioning_angle:
                    overlay.data?.positioning_strategy?.headline &&
                    interviewDecisionData.best_positioning_angle?.startsWith("REQUIRES_RESUME")
                      ? overlay.data.positioning_strategy.headline
                      : interviewDecisionData.best_positioning_angle,
                }
              : undefined,
          })
        : key === "interview_decision_summary" && interviewDecisionData
        ? JSON.stringify({
            ...interviewDecisionData,
            pursue_recommendation: canonicalRecommendation.interviewRecommendation,
          })
        : section.content;

    return (
      <ReportSectionCard
        key={section.id}
        sectionKey={section.key}
        title={section.title}
        content={content}
        citations={section.citations}
        feedback={
          <FeedbackButtons reportId={report.id} sectionKey={section.key} compact />
        }
        onProvenanceClick={openProvenanceModal}
      />
    );
  };

  const renderCredibilitySection = ({ inModal = false }: { inModal?: boolean } = {}) => {
    if (!(evidenceContractData || report.sources.length > 0)) return null;

    const selectedExplainer = activeProvenance ? PROVENANCE_EXPLAINERS[activeProvenance] : null;
    const wrapperClassName = inModal
      ? "rounded-[24px] border border-[#ddd4c8] bg-white/90 px-4 py-5 shadow-[0_14px_30px_rgba(28,23,19,0.05)] sm:px-6 sm:py-6"
      : "mt-6 rounded-[24px] border border-[#ddd4c8] bg-white/90 px-4 py-5 shadow-[0_14px_30px_rgba(28,23,19,0.05)] sm:mt-7 sm:px-6 sm:py-6";

    return (
      <section id={inModal ? undefined : "how-this-was-built"} className={wrapperClassName}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Credibility Layer</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">How this brief was built</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b5e52]">
              The brief combines directly cited source material, system inference, and optional resume-based personalization. The pill on each section tells you which mode dominates that section.
            </p>
          </div>
          {!inModal && <BackToTopButton onClick={scrollReportToTop} />}
        </div>

        {selectedExplainer && (
          <div className="mt-4 rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Selected indicator</p>
              <ProvenancePill type={activeProvenance!} />
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6b5e52]">{selectedExplainer.description}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-[#faf6ef] px-3 py-1.5 text-xs text-[#6b5e52]">
            <ProvenancePill type="cited" onClick={() => openProvenanceModal("cited")} />
            Direct facts tied to sources or explicit citations
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-[#faf6ef] px-3 py-1.5 text-xs text-[#6b5e52]">
            <ProvenancePill type="mixed" onClick={() => openProvenanceModal("mixed")} />
            Cited evidence plus synthesized interpretation
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-[#faf6ef] px-3 py-1.5 text-xs text-[#6b5e52]">
            <ProvenancePill type="inferred" onClick={() => openProvenanceModal("inferred")} />
            Built mainly from inference or incomplete evidence
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-[#faf6ef] px-3 py-1.5 text-xs text-[#6b5e52]">
            <ProvenancePill type="resume" onClick={() => openProvenanceModal("resume")} />
            Personalized from your uploaded resume
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Verified Facts</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{evidenceContractData?.verified_facts?.length ?? 0}</p>
            <p className="mt-2 text-xs leading-5 text-[#7a6d63]">Claims that can be traced back to explicit source material.</p>
          </div>
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Key Inferences</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{evidenceContractData?.key_inferences?.length ?? 0}</p>
            <p className="mt-2 text-xs leading-5 text-[#7a6d63]">Judgment calls created by combining signals across sources.</p>
          </div>
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Evidence Gaps</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{evidenceContractData?.evidence_gaps?.length ?? 0}</p>
            <p className="mt-2 text-xs leading-5 text-[#7a6d63]">Unknowns the system could not verify from the evidence set.</p>
          </div>
          <div className="rounded-[20px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Source Coverage</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{formatNumber(uniqueWebsiteCount)}</p>
            <p className="mt-2 text-xs leading-5 text-[#7a6d63]">Distinct external websites represented in the retrieved evidence.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[22px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">What fed this brief</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.jobDescription ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">Job description included</span> : <span className="rounded-full bg-[#f5f1e8] px-3 py-1 text-xs font-medium text-[#7a6d63]">No job description</span>}
              {hasOverlay ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Resume personalization included</span> : <span className="rounded-full bg-[#f5f1e8] px-3 py-1 text-xs font-medium text-[#7a6d63]">No resume personalization</span>}
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{formatNumber(report.sources.length)} total sources</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{formatNumber(uniqueWebsiteCount)} distinct websites</span>
            </div>
            {sourceBreakdown.length > 0 && (
              <div className="mt-4 space-y-2">
                {sourceBreakdown.slice(0, 4).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#4a3f36]">{label}</span>
                    <span className="font-medium text-[#1c1713]">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
            <div className="rounded-[22px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Verified Facts</p>
              <div className="mt-3 space-y-3">
                {(evidenceContractData?.verified_facts ?? []).slice(0, 2).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm leading-5 text-[#1c1713]">{item.claim}</p>
                    <p className="text-xs text-[#9c8d81]">{item.source_ref}</p>
                  </div>
                ))}
                {(evidenceContractData?.verified_facts?.length ?? 0) === 0 && <p className="text-sm text-[#9c8d81]">No verified facts were stored for this report.</p>}
              </div>
            </div>
            <div className="rounded-[22px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Key Inferences</p>
              <div className="mt-3 space-y-3">
                {(evidenceContractData?.key_inferences ?? []).slice(0, 2).map((item, index) => (
                  <div key={index} className="space-y-1.5">
                    <p className="text-sm leading-5 text-[#1c1713]">{item.inference}</p>
                    <ConfidencePill level={item.confidence} />
                  </div>
                ))}
                {(evidenceContractData?.key_inferences?.length ?? 0) === 0 && <p className="text-sm text-[#9c8d81]">No explicit inferences were stored for this report.</p>}
              </div>
            </div>
            <div className="rounded-[22px] border border-[#e8ded2] bg-[#fffdfa] px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Evidence Gaps</p>
              <div className="mt-3 space-y-3">
                {(evidenceContractData?.evidence_gaps ?? []).slice(0, 2).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm leading-5 text-[#1c1713]">{item.what_is_missing}</p>
                    <p className="text-xs text-[#9c8d81]">{item.why_it_matters}</p>
                  </div>
                ))}
                {(evidenceContractData?.evidence_gaps?.length ?? 0) === 0 && <p className="text-sm text-[#9c8d81]">No major evidence gaps were stored for this report.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderCredibilityAppendix = () => {
    if (viewMode !== "full") return null;

    return (
      <>
        <div className="mt-9 sm:mt-10">
          <section id="ai-activity" className="rounded-[24px] bg-[#f7f2ea] px-4 py-5 ring-1 ring-[#e5dbcf] sm:rounded-[30px] sm:px-6 sm:py-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">AI Activity</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">Model workflow behind the brief</h2>
              </div>
              <div className="flex items-start gap-2.5">
                <BackToTopButton onClick={scrollReportToTop} />
                {report.tokenUsage && (
                  <div className="rounded-2xl bg-white px-4 py-3 text-right ring-1 ring-[#e9dfd3]">
                    <p className="text-xs text-[#9c8d81]">Estimated cost</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{formatUsd(report.tokenUsage.total_cost_usd)}</p>
                  </div>
                )}
              </div>
            </div>
            {report.tokenUsage ? (
              <div className="mt-4 overflow-hidden rounded-[20px] bg-white ring-1 ring-[#e8ded2] sm:mt-5 sm:rounded-[24px]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f1e8] text-[#7a6d63]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.2em]">Model</th>
                      <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.2em]">Purpose</th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.2em]">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.tokenUsage.calls.map((call, index) => (
                      <tr key={`${call.model}-${index}`} className="border-t border-[#f0ece4] align-top">
                        <td className="px-4 py-3 font-medium text-[#1c1713]">{call.model}</td>
                        <td className="px-4 py-3 text-[#4a3f36]">{call.purpose}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#1c1713]">{formatTokenCount(call.input_tokens + call.output_tokens + (call.reasoning_tokens ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#9c8d81]">Token usage details were not persisted for this report.</p>
            )}
          </section>
        </div>

        {report.sources.length > 0 && (
          <section
            id="sources"
            aria-labelledby="sources-heading"
            className="mt-9 rounded-[24px] bg-[#f7f2ea] px-4 py-5 ring-1 ring-[#e5dbcf] sm:mt-10 sm:rounded-[30px] sm:px-6 sm:py-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="sources-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">
                  Evidence Sources
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#7a6d63]">
                  Every source fetched or provided for this brief, in the order stored with the report.
                </p>
              </div>
              <BackToTopButton onClick={scrollReportToTop} />
            </div>

            <div className="mt-5">
              <SourcesPanel sources={report.sources} />
            </div>
          </section>
        )}
      </>
    );
  };

  // Helper: render an overlay section
  const renderOverlaySection = ({ key, title, subtitle }: (typeof OVERLAY_SECTIONS)[number]) => {
    if (viewMode === "brief") return null; // overlay sections hidden in brief mode

    if (hasOverlay && overlay.data![key]) {
      return (
        <SectionShell key={key} id={key} title={title} subtitle={subtitle} provenance="resume" onProvenanceClick={openProvenanceModal}>
          {key === "candidate_role_match" && (
            <CandidateRoleMatchSection data={overlay.data!.candidate_role_match} />
          )}
          {key === "strengths_to_emphasize" && (
            <StrengthsToEmphasizeSection data={overlay.data!.strengths_to_emphasize} />
          )}
          {key === "objection_handling" && (
            <ObjectionHandlingSection data={overlay.data!.objection_handling} />
          )}
          {key === "interviewer_concerns" && (
            <InterviewerConcernsSection data={overlay.data!.interviewer_concerns} />
          )}
          {key === "gap_management" && (
            <GapManagementSection data={overlay.data!.gap_management} />
          )}
          {key === "story_recommendations" && (
            <StoryRecommendationsSection data={overlay.data!.story_recommendations} />
          )}
          {key === "positioning_strategy" && (
            <PositioningStrategySection data={overlay.data!.positioning_strategy} />
          )}
        </SectionShell>
      );
    }

    if (overlayGenerating) {
      return (
        <SectionShell key={key} id={key} title={title} subtitle={subtitle} provenance="resume" onProvenanceClick={openProvenanceModal}>
          <SectionSkeleton />
        </SectionShell>
      );
    }

    return <LockedOverlaySection key={key} sectionId={key} title={title} subtitle={subtitle} onProvenanceClick={openProvenanceModal} />;
  };

  return (
    <main id="top" className="min-h-screen bg-[linear-gradient(180deg,#f8f4ed_0%,#f6f1e8_45%,#f4efe6_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 xl:py-3">
        <div className="xl:grid xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-6">
          <aside className="mt-[30px] hidden xl:block xl:self-start xl:sticky xl:top-4 xl:h-fit">
            <div className="transition-all duration-300">
              <nav className="relative pl-3 pr-1" aria-label="Report table of contents">
                <div className="absolute bottom-0 left-0 top-0 w-px bg-[linear-gradient(180deg,rgba(201,191,180,0.18),rgba(201,191,180,0.88)_16%,rgba(201,191,180,0.88)_84%,rgba(201,191,180,0.18))]" aria-hidden />
                <div className={`transition-all duration-300 ${desktopTocFloating ? "py-1.5" : "py-0.5"}`}>
                  <div className="space-y-1.5">
                    {tocItems.map((item, index) => {
                      const showGroupLabel = index === 0 || tocItems[index - 1].group !== item.group;

                      return (
                        <div key={item.id} className="space-y-0">
                          {showGroupLabel && (
                            <p className="px-1.5 pb-1 pt-7 text-[0.68rem] font-bold uppercase leading-none tracking-[0.2em] text-[#9c8d81] first:pt-2">
                              {item.group}
                            </p>
                          )}
                          <TocButton
                            label={item.label}
                            active={activeSectionId === item.id}
                            onClick={() => scrollToSection(item.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>
          </aside>

          <div
            data-report-scroll-root="true"
            className="xl:border-b xl:border-x xl:border-[#ddd4c8]"
          >
            <article className="report-density-tight mx-auto w-[90%] max-w-none px-3 pb-4 pt-0 sm:px-7 sm:pb-7 sm:pt-0">
              <section
                id="brief-overview"
                className="relative overflow-hidden px-4 pb-5 pt-1 sm:px-8 sm:pb-8 sm:pt-1"
              >
                <div className="absolute -left-16 top-6 h-28 w-28 rounded-full bg-[#1a4a3a]/6 blur-3xl sm:top-8 sm:h-40 sm:w-40" aria-hidden />
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#4a7a8a]/10 blur-3xl sm:h-32 sm:w-32" aria-hidden />

                <div className="relative">
                  {/* ── Row 1: App title + timestamp pill ─────────────────── */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-[2.08rem] font-semibold tracking-[-0.055em] leading-[0.93] text-[#1c1713] sm:text-[2.56rem] whitespace-nowrap">
                        Interview Intelligence Report
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
                    </div>
                  </div>

                  <div className="mt-6 border-b border-[#e2d8cc]" aria-hidden />

                  {/* ── Row 2: Company identity ───────────────────────────── */}
                  <div className="mt-6 flex items-center gap-4 sm:gap-5">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_20px_rgba(28,23,19,0.08)] ring-1 ring-[#e2d8cc] sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[22px]">
                      {companyLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-9 w-9 sm:h-12 sm:w-12" />
                      ) : (
                        <span className="text-xl font-semibold tracking-[-0.04em] text-[#1a4a3a] sm:text-2xl">{companyName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-[1.75rem] font-semibold tracking-[-0.05em] leading-[0.95] text-[#1c1713] sm:text-[2.4rem]">
                        {companyName}
                      </h2>
                      <p className="mt-1 text-[1rem] font-medium text-[#5f554c] sm:text-[1.1rem]">{roleTitle}</p>
                    </div>
                  </div>

                  {/* ── Action pills + links ──────────────────────────────── */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold sm:text-sm ${recommendationMeta.pill}`}>
                      <span aria-hidden>{recommendationMeta.icon}</span>
                      {recommendationMeta.label}
                    </span>
                    {hasOverlay && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1a4a3a]/20 bg-[#1a4a3a]/8 px-3.5 py-1.5 text-[0.82rem] font-medium text-[#1a4a3a] sm:text-sm">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Personalized with your resume
                      </span>
                    )}
                    {companyHref && (
                      <a
                        href={companyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#d3c7b9] bg-white px-3.5 py-1.5 text-[0.82rem] font-medium text-[#1c1713] hover:border-[#bfb3a4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 sm:text-sm transition-colors"
                      >
                        Company Site
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 4h6m0 0v6m0-6L10 14" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 001 1h9" />
                        </svg>
                      </a>
                    )}
                    {report.jobDescription && (
                      <button
                        type="button"
                        onClick={() => scrollToSection("job-description")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#d3c7b9] bg-[#f5f1e8] px-3.5 py-1.5 text-[0.82rem] font-medium text-[#4a3f36] hover:border-[#bfb3a4] hover:text-[#1c1713] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 sm:text-sm transition-colors"
                      >
                        View Job Description
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
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
                          {card.badge ? (
                            <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${card.style.badge}`}>
                              {card.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-3 text-[0.8rem] leading-[1.5] ${card.style.detail}`}>{card.detail}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── Signal Scorecard ──────────────────────────────────── */}
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

              {viewMode === "brief" && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 flex items-center gap-3">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">5-Minute Brief mode</span> shows only the decision-critical sections.
                    <button onClick={() => setViewMode("full")} className="ml-1 underline hover:text-amber-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-700 rounded">
                      Switch to Full Report
                    </button>
                  </p>
                </div>
              )}

              {report.jobDescription && (
                <section id="job-description" className="mt-8 rounded-[24px] bg-[#f7f2ea] px-4 py-5 ring-1 ring-[#e5dbcf] sm:mt-9 sm:rounded-[30px] sm:px-7 sm:py-6">
                  <div className="flex items-start justify-between gap-3">
                    <div />
                    <BackToTopButton onClick={scrollReportToTop} />
                  </div>
                  <div className="mt-2 grid gap-7 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Role Brief</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">Job Description</h2>
                        <p className="mt-2.5 text-sm leading-5 text-[#7a6d63]">Keep the original role language close while reading the decision and interview analysis.</p>
                      </div>
                      <div className="space-y-3 text-sm text-[#4a3f36]">
                        <p><span className="font-semibold text-[#1c1713]">Company:</span> {companyName}</p>
                        <p><span className="font-semibold text-[#1c1713]">Role:</span> {roleTitle}</p>
                        <p>
                          <span className="font-semibold text-[#1c1713]">Generated:</span>{" "}
                          {completedAtParts ? `${completedAtParts.date} · ${completedAtParts.time} ${completedAtParts.shortLabel}` : "Recently"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-[#e8ded2] sm:rounded-[26px] sm:px-5 sm:py-5">
                      <div className="max-h-[24rem] overflow-y-auto pr-2">
                        <p className="whitespace-pre-line text-sm leading-6 text-[#4a3f36]">{report.jobDescription}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {!hasOverlay && !overlayGenerating && viewMode === "full" && (
                <div className="mt-10">
                  <ResumeUploadPanel
                    requestId={requestId}
                    onUploaded={handleOverlayUploaded}
                    storedResume={storedResume}
                  />
                </div>
              )}

              {overlayGenerating && (
                <div className="mt-8 rounded-2xl border border-[#e4ddd4] bg-white px-4 py-4 flex items-center gap-3 shadow-[0_8px_20px_rgba(28,23,19,0.05)] sm:mt-10 sm:px-6 sm:gap-4">
                  <span className="w-5 h-5 rounded-full border-2 border-[#e4ddd4] border-t-[#1a4a3a] animate-spin flex-shrink-0" role="status" aria-label="Generating personalization" />
                  <div>
                    <p className="text-sm font-semibold text-[#1c1713]">Personalizing your brief…</p>
                    <p className="text-xs text-[#9c8d81] mt-0.5">Analyzing your background against this role and updating the brief.</p>
                  </div>
                </div>
              )}

              {overlay.status === "failed" && (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:mt-10 sm:px-6" role="alert">
                  <p className="text-sm font-semibold text-red-800">Personalization failed</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {overlay.error ?? "Could not generate personalized sections."} You can try uploading again.
                  </p>
                </div>
              )}

              <div className="mt-9 space-y-1.5 sm:mt-10">
                <SectionGroupLabel
                  title="Decision"
                  description="Start with the core recommendation, top-line judgment, and the fastest version of the story."
                />
                {renderBaseSection("executive_summary")}
                {renderBaseSection("five_minute_brief")}
                {renderBaseSection("assessment_snapshot")}

                <SectionGroupLabel
                  title="Candidate Positioning"
                  description="How your background maps to the role, where friction will show up, and how to address it."
                />
                {renderOverlaySection(OVERLAY_SECTIONS[0])}
                {renderBaseSection("strategic_bet_analysis")}
                {OVERLAY_SECTIONS.slice(1).map(renderOverlaySection)}

                <SectionGroupLabel
                  title="Interview Prep"
                  description="Use this layer to rehearse the likely agenda, shape your questions, and pressure-test risk areas."
                />
                {renderBaseSection("likely_interview_agenda")}
                {renderBaseSection("questions_to_ask")}
                {renderBaseSection("risks_red_flags")}
                {renderBaseSection("unknowns_to_validate")}

                <SectionGroupLabel
                  title="Strategic Context"
                  description="Expanded company and role context for deeper prep and better calibration before final-round conversations."
                />
                {renderBaseSection("company_snapshot")}
                {renderBaseSection("company_swot")}
                {renderBaseSection("role_snapshot")}
                {renderBaseSection("role_swot")}
                {renderBaseSection("why_role_exists_now")}

                {hasCredibilityFlow && hasValidCitations && (
                  <div className="mt-9 sm:mt-10">
                    <CitationResourcesPanel sections={report.sections} sources={report.sources} onBackToTop={scrollReportToTop} />
                  </div>
                )}

                {hasCredibilityFlow && (
                  <>
                    <SectionGroupLabel
                      title="Credibility"
                      description="Review the evidence model, citations, and model workflow after reading the report body."
                    />
                    <div className="mt-3 rounded-[22px] border border-[#ddd4c8] bg-white/80 px-4 py-3 shadow-[0_12px_28px_rgba(28,23,19,0.04)] sm:px-5">
                      <button
                        type="button"
                        onClick={() => setCredibilityCollapsed((current) => !current)}
                        className="flex w-full items-center justify-between gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 rounded-[16px]"
                        aria-expanded={!credibilityCollapsed}
                        aria-controls="credibility-section-content"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#4a3f36]">
                            {credibilityCollapsed ? "Credibility details are hidden." : "Credibility details are expanded."}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#9c8d81]">
                            Toggle the evidence model, citations, and AI activity appendix.
                          </p>
                        </div>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e4ddd4] bg-[#faf6ef] text-[#6b5e52]">
                          <svg
                            className={`h-4 w-4 transition-transform duration-200 ${credibilityCollapsed ? "" : "rotate-180"}`}
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                          </svg>
                        </span>
                      </button>
                    </div>
                    {!credibilityCollapsed && (
                      <div id="credibility-section-content">
                        {renderCredibilitySection()}
                        {renderCredibilityAppendix()}
                      </div>
                    )}
                  </>
                )}
              </div>

              <section className="mt-10 rounded-[24px] bg-[#f7f2ea] px-4 py-5 ring-1 ring-[#e5dbcf] sm:mt-12 sm:rounded-[30px] sm:px-6 sm:py-6">
                {report.researchPlan ? (
                  <div className="mb-8">
                    <SourceStrategyPanel
                      id="source-strategy-catalog"
                      researchPlan={report.researchPlan}
                      feedback={<SourceStrategyFeedback reportId={report.id} />}
                    />
                  </div>
                ) : null}

                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">Was this brief useful overall?</h2>
                {overallFeedback ? (
                  <p className="mt-3 text-sm text-[#9c8d81]" role="status" aria-live="polite">
                    {overallFeedback === "useful" ? "Thanks - glad it helped." : "Thanks for the feedback."}
                  </p>
                ) : (
                  <div className="mt-4 flex gap-3" role="group" aria-label="Overall report feedback">
                    <button
                      onClick={() => handleOverallFeedback("useful")}
                      className="rounded-full border border-[#d4cdc4] bg-white px-4 py-2 text-sm text-[#4a3f36] hover:border-[#1a4a3a]/30 hover:bg-[#1a4a3a]/6 hover:text-[#1a4a3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 transition-colors"
                    >
                      Yes, useful
                    </button>
                    <button
                      onClick={() => handleOverallFeedback("not_useful")}
                      className="rounded-full border border-[#d4cdc4] bg-white px-4 py-2 text-sm text-[#4a3f36] hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 transition-colors"
                    >
                      Not useful
                    </button>
                  </div>
                )}

                <div className="mt-6 text-center xl:hidden">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="text-sm text-[#7a6d63] underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 rounded disabled:opacity-40 transition-colors"
                  >
                    {regenerating ? "Starting regeneration…" : "Re-run analysis"}
                  </button>
                </div>
              </section>
            </article>
          </div>
        </div>
      </div>
      <ProvenanceModal openType={activeProvenance} onClose={closeProvenanceModal}>
        {renderCredibilitySection({ inModal: true })}
      </ProvenanceModal>
    </main>
  );
}

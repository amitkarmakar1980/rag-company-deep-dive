"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ReportSectionCard } from "@/components/ReportSectionCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { SourcesPanel } from "@/components/report/SourcesPanel";
import { ResumeUploadPanel } from "@/components/report/ResumeUploadPanel";
import { BrandMark } from "@/components/BrandMark";
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
import { SectionShell } from "@/components/report/SectionShell";
import { RecommendationType, ReportScore, CandidateOverlayData, ReportTokenUsage } from "@/lib/types";
import { useResumeStore } from "@/lib/hooks/useResumeStore";
import { TokenUsagePanel } from "@/components/report/TokenUsagePanel";
import { formatDateTimeParts, formatGenerationDuration, useRequestTimeZone } from "@/lib/timezone";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Report {
  id: string;
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
  createdAt: string;
  company: {
    name: string;
    websiteUrl: string | null;
  };
  roleTitle: string | null;
  companyUrl: string | null;
  jobDescription: string | null;
  requestCreatedAt: string | null;
  completedAt: string | null;
}

interface RequestStatus {
  requestId: string;
  status: string;
  report?: { id: string };
}

type OverlayStatus = "none" | "uploading" | "generating" | "completed" | "failed";

interface OverlayState {
  status: OverlayStatus;
  data: CandidateOverlayData | null;
  error: string | null;
}

type ViewMode = "full" | "brief";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROCESSING_STATUSES = new Set([
  "pending",
  "fetching_sources",
  "indexing",
  "generating_report",
  "generating_deep_analysis",
  "generating_interview_layer",
]);

const STATUS_LABELS: Record<string, string> = {
  pending: "Starting analysis…",
  fetching_sources: "Fetching sources from the web…",
  indexing: "Indexing and embedding content…",
  generating_report: "Generating your intelligence brief…",
  generating_deep_analysis: "Running deep strategic analysis…",
  generating_interview_layer: "Running interview prep layer…",
};

// Animated sub-step messages shown per status phase
const STATUS_SUBSTEPS: Record<string, string[]> = {
  pending: ["Initializing the analysis pipeline…", "Preparing retrieval context…"],
  fetching_sources: [
    "Crawling company website…",
    "Pulling recent news and press releases…",
    "Retrieving earnings reports and investor docs…",
    "Scanning industry analyst coverage…",
    "Fetching job posting context…",
    "Gathering competitive landscape data…",
  ],
  indexing: [
    "Embedding retrieved content into vector store…",
    "Ranking sources by relevance to the role…",
    "Deduplicating and chunking evidence…",
  ],
  generating_report: [
    "Preparing retrieval context for LLM calls…",
    "Running semantic search over sources…",
  ],
  generating_deep_analysis: [
    "Running o3 deep strategic analysis…",
    "Building SWOT quadrants from evidence…",
    "Classifying strategic role significance…",
    "Identifying why this role exists now…",
    "Surfacing risks and red flags…",
  ],
  generating_interview_layer: [
    "Running gpt-4o-mini interview prep layer…",
    "Synthesizing candidate positioning angles…",
    "Generating executive-caliber questions…",
    "Assembling interview decision summary…",
    "Building 5-minute brief…",
  ],
};

const RECOMMENDATION_META: Record<string, { label: string; tone: string; icon: string }> = {
  pursue: {
    label: "Aggressive Pursue",
    tone: "bg-[#1a4a3a]/8 text-[#1a4a3a] border-[#1a4a3a]/15",
    icon: "↑",
  },
  pursue_cautiously: {
    label: "Cautious Pursue",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    icon: "~",
  },
  avoid: {
    label: "Pass",
    tone: "bg-red-50 text-red-700 border-red-200",
    icon: "×",
  },
  need_more_signal: {
    label: "Need More Signal",
    tone: "bg-[#f0ece4] text-[#7a6d63] border-[#d4cdc4]",
    icon: "?",
  },
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  company_homepage: "Company Site",
  blog: "Company Blog",
  job_description: "Job Description",
  newsroom: "News & Press",
  custom_url: "External URL",
  profile_text: "Provided Context",
};

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

function scoreTone(value: number | null | undefined): string {
  if (value == null) return "bg-[#f0ece4] text-[#7a6d63]";
  if (value >= 8) return "bg-[#1a4a3a] text-white";
  if (value >= 6) return "bg-[#4a7a8a] text-white";
  if (value >= 4) return "bg-amber-400 text-[#1c1713]";
  return "bg-red-400 text-white";
}

function scoreBarTone(value: number | null | undefined): string {
  if (value == null) return "bg-[#d4cdc4]";
  if (value >= 8) return "bg-[#1a4a3a]";
  if (value >= 6) return "bg-[#4a7a8a]";
  if (value >= 4) return "bg-amber-400";
  return "bg-red-400";
}

function HeroMetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#d9d0c5] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(28,23,19,0.05)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f1e8] text-[#4a3f36]" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#7a6d63]">{detail}</p>
    </div>
  );
}

function ScoreMeter({ label, value }: { label: string; value: number | null | undefined }) {
  const normalized = value == null ? null : Math.max(0, Math.min(100, Math.round(value * 10)));

  return (
    <div className="space-y-2.5 rounded-2xl border border-[#ebe4da] bg-[#fffdfa] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#4a3f36]">{label}</p>
        <span className={`inline-flex min-w-[3rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${scoreTone(value)}`}>
          {value == null ? "N/A" : `${value.toFixed(1)}/10`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ece5db]">
        <div
          className={`h-full rounded-full ${scoreBarTone(value)}`}
          style={{ width: `${normalized ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function SectionGroupLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-1 pt-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9c8d81]">{title}</p>
      <p className="mt-1 text-sm text-[#7a6d63]">{description}</p>
    </div>
  );
}

/**
 * Sections that appear in the "5-Minute Brief" view only.
 * All other base sections are full-report only.
 */
const BRIEF_SECTION_KEYS = new Set([
  "interview_decision_summary",
  "five_minute_brief",
  "assessment_snapshot",
]);

// Candidate overlay section config — order matters
const OVERLAY_SECTIONS: Array<{
  key: keyof CandidateOverlayData;
  title: string;
  subtitle: string;
}> = [
  {
    key: "candidate_role_match",
    title: "Candidate–Role Match",
    subtitle: "How your background aligns with this specific role and where the gaps are",
  },
  {
    key: "strengths_to_emphasize",
    title: "Strengths to Emphasize",
    subtitle: "Resume-grounded strengths mapped to what this hiring manager actually cares about",
  },
  {
    key: "objection_handling",
    title: "Objections You Must Overcome",
    subtitle: "The hardest objections this interviewer will raise — and exactly how to handle them",
  },
  {
    key: "interviewer_concerns",
    title: "Likely Interviewer Concerns",
    subtitle: "What they're probably worried about — and the questions they'll ask to probe it",
  },
  {
    key: "gap_management",
    title: "Gap Management",
    subtitle: "Your real gaps, honest reframes, and specific talking points for each",
  },
  {
    key: "story_recommendations",
    title: "Story Recommendations",
    subtitle: "Specific stories from your background mapped to this role's requirements",
  },
  {
    key: "positioning_strategy",
    title: "Positioning Strategy",
    subtitle: "Your headline, narrative arc, and a ready-to-use Tell Me About Yourself",
  },
];

// ─── Processing screen with animated thinking messages ────────────────────────

const PHASE_ORDER = [
  "fetching_sources",
  "indexing",
  "generating_deep_analysis",
  "generating_interview_layer",
];

function ProcessingScreen({ statusKey }: { statusKey: string }) {
  const [subStep, setSubStep] = useState(0);
  const subSteps = STATUS_SUBSTEPS[statusKey] ?? [];
  const phaseIdx = PHASE_ORDER.indexOf(statusKey);

  useEffect(() => {
    if (subSteps.length === 0) return;
    setSubStep(0);
    const id = setInterval(() => {
      setSubStep((prev) => (prev + 1) % subSteps.length);
    }, 2800);
    return () => clearInterval(id);
  }, [statusKey, subSteps.length]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-8">
      {/* Spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-[#e4ddd4]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1a4a3a] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#1a4a3a] animate-pulse" />
        </div>
      </div>

      {/* Phase label */}
      <div className="text-center space-y-2">
        <p className="text-base font-semibold text-[#1c1713]">
          {STATUS_LABELS[statusKey] ?? statusKey}
        </p>
        {subSteps.length > 0 && (
          <p key={subStep} className="text-sm text-[#9c8d81] animate-pulse">
            {subSteps[subStep]}
          </p>
        )}
        <p className="text-xs text-[#b0a496] mt-3">Analysis runs in multiple steps · Stay on this page</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0">
        {PHASE_ORDER.map((phase, i) => {
          const isCompleted = i < phaseIdx;
          const isActive = i === phaseIdx;
          const isUpcoming = i > phaseIdx;
          return (
            <div key={phase} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isCompleted
                      ? "bg-[#1a4a3a]"
                      : isActive
                      ? "bg-[#1a4a3a] ring-4 ring-[#1a4a3a]/20"
                      : "bg-[#e4ddd4]"
                  }`}
                />
                <span className={`text-xs whitespace-nowrap ${isUpcoming ? "text-[#c8bfb4]" : isActive ? "text-[#4a3f36] font-medium" : "text-[#9c8d81]"}`}>
                  {STATUS_LABELS[phase]?.replace("…", "") ?? phase}
                </span>
              </div>
              {i < PHASE_ORDER.length - 1 && (
                <div className={`h-px w-12 mx-1.5 mb-4 ${i < phaseIdx ? "bg-[#1a4a3a]" : "bg-[#e4ddd4]"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Thinking log — last few messages */}
      <div className="w-full max-w-md bg-white border border-[#e4ddd4] rounded-xl px-5 py-4 space-y-2.5 shadow-[0_2px_8px_rgba(28,23,19,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#c8bfb4] mb-1">What&apos;s happening</p>
        {PHASE_ORDER.slice(0, phaseIdx + 1).map((phase) => (
          STATUS_SUBSTEPS[phase]?.slice(0, phase === statusKey ? subStep + 1 : STATUS_SUBSTEPS[phase].length).map((msg, i) => (
            <div key={`${phase}-${i}`} className="flex items-start gap-2.5">
              <div className={`flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${phase === statusKey && i === subStep ? "bg-[#1a4a3a]" : "bg-[#d4cdc4]"}`} />
              <span className={`text-xs leading-relaxed ${phase === statusKey && i === subStep ? "text-[#4a3f36]" : "text-[#9c8d81]"}`}>
                {msg}
              </span>
            </div>
          ))
        ))}
      </div>
    </div>
  );
}

// ─── Locked personalised section (resume required) ───────────────────────────

function LockedPersonalisedSection({
  title,
  subtitle,
  generating,
}: {
  title: string;
  subtitle: string;
  generating?: boolean;
}) {
  if (generating) {
    return (
      <div className="bg-white border border-[#e4ddd4] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(28,23,19,0.05)]">
        <div className="px-6 py-4 border-b border-[#f0ece4]">
          <h2 className="text-sm font-semibold text-[#1c1713]">{title}</h2>
          <p className="text-xs text-[#9c8d81] mt-0.5">{subtitle}</p>
        </div>
        <div className="px-6 py-5 space-y-2">
          <SectionSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-dashed border-[#c8bfb4] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#f0ece4] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#4a3f36]">{title}</h2>
          <p className="text-xs text-[#9c8d81] mt-0.5">{subtitle}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#7a6d63] bg-[#f5f1e8] border border-[#d4cdc4] px-2.5 py-1 rounded-full flex-shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Requires your resume
        </span>
      </div>
      <div className="px-6 py-5 space-y-3">
        <p className="text-sm text-[#9c8d81] leading-relaxed">
          A pursue recommendation without knowing your background isn&apos;t meaningful — this section is generated specifically for you once you upload your resume.
        </p>
        <div className="space-y-2" aria-hidden>
          <div className="h-3 bg-[#f0ece4] rounded w-3/4" />
          <div className="h-3 bg-[#f0ece4] rounded w-full" />
          <div className="h-3 bg-[#f0ece4] rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ─── Locked overlay placeholder ───────────────────────────────────────────────

function LockedOverlaySection({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="bg-white border border-[#e4ddd4] rounded-xl overflow-hidden opacity-60"
      aria-hidden="true"
    >
      <div className="px-6 py-4 border-b border-[#f0ece4] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#1c1713]">{title}</h2>
          {subtitle && (
            <p className="text-xs text-[#9c8d81] mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-[#9c8d81] bg-[#f0ece4] px-2.5 py-1 rounded-full flex-shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Resume required
        </span>
      </div>
      <div className="px-6 py-5 space-y-2">
        <div className="h-3 bg-[#f0ece4] rounded w-3/4" />
        <div className="h-3 bg-[#f0ece4] rounded w-full" />
        <div className="h-3 bg-[#f0ece4] rounded w-2/3" />
        <div className="h-3 bg-[#f0ece4] rounded w-5/6" />
      </div>
    </div>
  );
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center bg-[#f0ece4] rounded-lg p-0.5 gap-0.5"
      role="group"
      aria-label="View mode"
    >
      <button
        onClick={() => onChange("brief")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 ${
          mode === "brief"
            ? "bg-white text-[#1c1713] shadow-sm"
            : "text-[#7a6d63] hover:text-[#4a3f36]"
        }`}
      >
        5-Min Brief
      </button>
      <button
        onClick={() => onChange("full")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 ${
          mode === "full"
            ? "bg-white text-[#1c1713] shadow-sm"
            : "text-[#7a6d63] hover:text-[#4a3f36]"
        }`}
      >
        Full Report
      </button>
    </div>
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
  const { timeZone, shortLabel } = useRequestTimeZone();

  const { stored: storedResume } = useResumeStore();

  // Overlay state
  const [overlay, setOverlay] = useState<OverlayState>({
    status: "none",
    data: null,
    error: null,
  });
  const overlayPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    };
  }, []);

  // ─── Base report fetching ─────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/deep-dive/status?id=${requestId}`);
      if (!res.ok) throw new Error("Failed to fetch status");

      const data: RequestStatus = await res.json();
      setStatus(data);

      if (data.report) {
        const reportRes = await fetch(`/api/report/${data.report.id}`);
        if (!reportRes.ok) throw new Error("Failed to fetch report");
        const reportData = await reportRes.json();
        setReport(reportData);
        checkExistingOverlay(storedResume?.text);
      }
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
    return (
      <main className="min-h-screen bg-[#faf8f3]">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center" role="alert">
            <h1 className="text-base font-semibold text-red-800 mb-2">Report Generation Failed</h1>
            <p className="text-sm text-[#6b5e52] mb-6">{error ?? "An error occurred while generating this report."}</p>
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
      <main className="min-h-screen bg-[#faf8f3]">
        <ProcessingScreen statusKey={status.status} />
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

  // ─── Report ready ─────────────────────────────────────────────────────────

  // Build a keyed lookup for sections
  const sectionByKey = Object.fromEntries(report.sections.map((s) => [s.key, s]));
  const completedAtParts = formatDateTimeParts(report.completedAt ?? report.createdAt, timeZone);
  const generationDuration = formatGenerationDuration(report.requestCreatedAt, report.completedAt);
  const companyName = report.company.name || "Unknown Company";
  const roleTitle = report.roleTitle || "Target Role";
  const companyHref = report.companyUrl ?? report.company.websiteUrl;
  const companyLogoUrl = getFaviconUrl(companyHref);
  const recommendationMeta = RECOMMENDATION_META[report.recommendation] ?? RECOMMENDATION_META.need_more_signal;
  const uniqueWebsiteCount = new Set(
    report.sources
      .map((source) => extractHostname(source.url))
      .filter((host): host is string => Boolean(host))
  ).size;
  const aiQueryCount = report.tokenUsage?.calls.length ?? 0;
  const sourceBreakdown = Object.entries(
    report.sources.reduce<Record<string, number>>((accumulator, source) => {
      const label = SOURCE_TYPE_LABELS[source.type] ?? source.type.replace(/_/g, " ");
      accumulator[label] = (accumulator[label] ?? 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1]);

  const hasOverlay = overlay.status === "completed" && overlay.data !== null;
  const overlayGenerating = overlay.status === "generating" || overlay.status === "uploading";
  const effectiveCandidateFitScore = hasOverlay
    ? overlay.data?.candidate_role_match?.match_score ?? report.scores.candidate_fit
    : report.scores.candidate_fit;

  // Sections that are visible in 5-min brief mode
  const visibleSections = (key: string) =>
    viewMode === "full" || BRIEF_SECTION_KEYS.has(key);

  const quickLinks = [
    report.jobDescription ? { href: "#job-description", label: "Job Description" } : null,
    sectionByKey.executive_summary && visibleSections("executive_summary")
      ? { href: "#executive_summary", label: "Decision" }
      : null,
    sectionByKey.five_minute_brief && visibleSections("five_minute_brief")
      ? { href: "#five_minute_brief", label: "5-Min Brief" }
      : null,
    sectionByKey.strategic_bet_analysis && visibleSections("strategic_bet_analysis")
      ? { href: "#strategic_bet_analysis", label: "Strategic Bet" }
      : null,
    sectionByKey.likely_interview_agenda && visibleSections("likely_interview_agenda")
      ? { href: "#likely_interview_agenda", label: "Interview Agenda" }
      : null,
    viewMode === "full" && report.sources.length > 0 ? { href: "#sources", label: "Sources" } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

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
            title={section.title}
            subtitle="Personalised pursue recommendation — generating now…"
            generating
          />
        );
      }
      if (!hasOverlay) {
        return (
          <LockedPersonalisedSection
            key={key}
            title={section.title}
            subtitle="Pursue recommendation, positioning angle, top questions, and key watchouts"
          />
        );
      }
    }

    const content =
      key === "assessment_snapshot"
        ? getAssessmentSnapshotContent(section)
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
      />
    );
  };

  // Helper: render an overlay section
  const renderOverlaySection = ({ key, title, subtitle }: typeof OVERLAY_SECTIONS[0]) => {
    if (viewMode === "brief") return null; // overlay sections hidden in brief mode

    if (hasOverlay && overlay.data![key]) {
      return (
        <SectionShell key={key} id={key} title={title} subtitle={subtitle}>
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
        <SectionShell key={key} id={key} title={title} subtitle={subtitle}>
          <SectionSkeleton />
        </SectionShell>
      );
    }

    return <LockedOverlaySection key={key} title={title} subtitle={subtitle} />;
  };

  return (
    <main id="top" className="min-h-screen bg-[#faf8f3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <section className="relative overflow-hidden rounded-[30px] border border-[#d9d0c5] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),rgba(255,255,255,0.9)_38%,rgba(245,241,232,0.92)_100%)] px-6 py-6 shadow-[0_24px_60px_rgba(28,23,19,0.08)] sm:px-8 sm:py-8">
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-[#1a4a3a]/6 blur-3xl" aria-hidden />
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#4a7a8a]/10 blur-3xl" aria-hidden />

          <div className="relative space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#ddd4c8] bg-white/80 px-3 py-2 shadow-[0_8px_24px_rgba(28,23,19,0.05)] backdrop-blur-sm">
                <BrandMark compact />
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9c8d81]">Interview Intelligence Brief</p>
                  <p className="text-xs text-[#7a6d63]">Times shown in {shortLabel}</p>
                </div>
              </div>
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-[#d9d0c5] bg-white shadow-[0_10px_24px_rgba(28,23,19,0.06)] mt-0.5">
                    {companyLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-9 w-9" />
                    ) : (
                      <span className="text-lg font-semibold tracking-[-0.04em] text-[#1a4a3a]">{companyName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-[1.65rem] font-bold tracking-[-0.04em] text-[#1c1713] leading-[1.1] sm:text-[2rem]">
                      {companyName}
                    </h1>
                    <p className="text-[0.95rem] font-medium text-[#5f554c] leading-snug">
                      {roleTitle}
                    </p>
                  </div>
                </div>

                <p className="max-w-3xl text-sm leading-7 text-[#5f554c] sm:text-[0.98rem]">
                  A recruiter-grade briefing assembled from {formatNumber(report.sources.length)} evidence sources across {formatNumber(uniqueWebsiteCount)} websites, organized for fast interview preparation and sharper decision-making.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${recommendationMeta.tone}`}>
                    <span aria-hidden>{recommendationMeta.icon}</span>
                    {recommendationMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c8] bg-white/80 px-3 py-1.5 text-sm text-[#5f554c]">
                    <svg className="h-4 w-4 text-[#7a6d63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
                    </svg>
                    {completedAtParts
                      ? `Generated ${completedAtParts.date} at ${completedAtParts.time} ${completedAtParts.shortLabel}`
                      : "Generated recently"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c8] bg-white/80 px-3 py-1.5 text-sm text-[#5f554c]">
                    <svg className="h-4 w-4 text-[#7a6d63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {generationDuration ? `Generated in ${generationDuration}` : `Times shown in ${shortLabel}`}
                  </span>
                  {hasOverlay && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1a4a3a]/20 bg-[#1a4a3a]/8 px-3 py-1.5 text-sm text-[#1a4a3a]">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personalized with your resume
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {companyHref && (
                    <a
                      href={companyHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#d1c7ba] bg-white px-4 py-2.5 text-sm font-medium text-[#1c1713] shadow-[0_8px_18px_rgba(28,23,19,0.05)] hover:border-[#bfb3a4] hover:bg-[#fffdfa] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 transition-colors"
                    >
                      Company Site
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 4h6m0 0v6m0-6L10 14" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 001 1h9" />
                      </svg>
                    </a>
                  )}
                  {report.jobDescription && (
                    <a
                      href="#job-description"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#d1c7ba] bg-[#f5f1e8] px-4 py-2.5 text-sm font-medium text-[#4a3f36] hover:border-[#bfb3a4] hover:text-[#1c1713] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 transition-colors"
                    >
                      View Job Description
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                <HeroMetricCard
                  label="Recommendation"
                  value={recommendationMeta.label}
                  detail="Current decision signal based on the evidence assembled for this role."
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                />
                <HeroMetricCard
                  label="Candidate Fit"
                  value={effectiveCandidateFitScore != null ? `${effectiveCandidateFitScore.toFixed(1)}/10` : "N/A"}
                  detail={hasOverlay
                    ? "Personalized candidate-role match based on your resume and the inferred interview bar."
                    : "How well your background appears to map to the charter and likely interview bar."}
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.567-3 3.5-3S19 9.343 19 11c0 1.306-.835 2.417-2 2.83V16a1 1 0 01-1 1h-1m-6 0H8a1 1 0 01-1-1v-2.17C5.835 13.417 5 12.306 5 11c0-1.657 1.567-3 3.5-3S12 9.343 12 11zm0 0v1" /></svg>}
                />
                <HeroMetricCard
                  label="Evidence Sources"
                  value={formatNumber(report.sources.length)}
                  detail={`${formatNumber(uniqueWebsiteCount)} distinct websites researched for this brief.`}
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 010 18M12 3a15.3 15.3 0 000 18" /></svg>}
                />
                <HeroMetricCard
                  label="AI Queries"
                  value={formatNumber(aiQueryCount)}
                  detail={report.tokenUsage ? `${formatTokenCount(report.tokenUsage.total_tokens)} total tokens across all model calls.` : "No token usage trace stored for this report."}
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div className="rounded-[26px] border border-[#ddd4c8] bg-white/82 px-5 py-5 shadow-[0_14px_28px_rgba(28,23,19,0.05)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Signal Scorecard</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1c1713]">How this opportunity reads at a glance</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ScoreMeter label="Company Momentum" value={report.scores.company_momentum} />
                  <ScoreMeter label="Org Clarity" value={report.scores.org_clarity} />
                  <ScoreMeter label="Role Leverage" value={report.scores.role_leverage} />
                  <ScoreMeter label="Execution Risk" value={report.scores.execution_risk} />
                </div>
              </div>

              <div className="rounded-[26px] border border-[#ddd4c8] bg-[#fffdf9] px-5 py-5 shadow-[0_14px_28px_rgba(28,23,19,0.05)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Navigation</p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1c1713]">Jump to the parts that matter most</h2>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {quickLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-2 rounded-full border border-[#d8d0c5] bg-white px-3 py-1.5 text-sm text-[#4a3f36] hover:border-[#bfb3a4] hover:text-[#1c1713] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/35 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#ebe4da] bg-white px-4 py-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Websites</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{formatNumber(uniqueWebsiteCount)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#ebe4da] bg-white px-4 py-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Model Calls</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{formatNumber(aiQueryCount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {viewMode === "brief" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center gap-3">
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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section className="rounded-[26px] border border-[#ddd4c8] bg-white px-6 py-5 shadow-[0_14px_30px_rgba(28,23,19,0.05)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Research Footprint</p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1c1713]">Where the brief pulled evidence from</h2>
              </div>
              <div className="rounded-2xl border border-[#ebe4da] bg-[#faf8f3] px-4 py-3 text-right">
                <p className="text-xs text-[#9c8d81]">Distinct websites</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{formatNumber(uniqueWebsiteCount)}</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#ebe4da] bg-[#fffdfa]">
              <table className="w-full text-sm">
                <thead className="bg-[#f5f1e8] text-[#7a6d63]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.2em]">Source Type</th>
                    <th className="px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.2em]">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceBreakdown.length > 0 ? (
                    sourceBreakdown.map(([label, count]) => (
                      <tr key={label} className="border-t border-[#f0ece4]">
                        <td className="px-4 py-3 text-[#4a3f36]">{label}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#1c1713]">{formatNumber(count)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-[#9c8d81]">No source trace was stored for this report.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[26px] border border-[#ddd4c8] bg-white px-6 py-5 shadow-[0_14px_30px_rgba(28,23,19,0.05)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">AI Activity</p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1c1713]">Model workflow behind the brief</h2>
              </div>
              {report.tokenUsage && (
                <div className="rounded-2xl border border-[#ebe4da] bg-[#faf8f3] px-4 py-3 text-right">
                  <p className="text-xs text-[#9c8d81]">Estimated cost</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1c1713]">{formatUsd(report.tokenUsage.total_cost_usd)}</p>
                </div>
              )}
            </div>

            {report.tokenUsage ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#ebe4da] bg-[#fffdfa]">
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

        {report.jobDescription && (
          <section id="job-description" className="rounded-[26px] border border-[#ddd4c8] bg-white px-6 py-6 shadow-[0_14px_30px_rgba(28,23,19,0.05)]">
            <div className="grid gap-5 xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
              <div className="space-y-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9c8d81]">Role Brief</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1c1713]">Job Description</h2>
                  <p className="mt-2 text-sm leading-6 text-[#7a6d63]">Keep the original role language close at hand while reading the interview analysis.</p>
                </div>
                <div className="rounded-2xl border border-[#ebe4da] bg-[#faf8f3] px-4 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c8d81]">Company</p>
                    <p className="mt-1 text-sm text-[#1c1713]">{companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c8d81]">Role</p>
                    <p className="mt-1 text-sm text-[#1c1713]">{roleTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9c8d81]">Generated</p>
                    <p className="mt-1 text-sm text-[#1c1713]">
                      {completedAtParts ? `${completedAtParts.date} · ${completedAtParts.time} ${completedAtParts.shortLabel}` : "Recently"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ebe4da] bg-[#fffdfa] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="max-h-[24rem] overflow-auto pr-2">
                  <p className="whitespace-pre-line text-sm leading-7 text-[#4a3f36]">{report.jobDescription}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {!hasOverlay && !overlayGenerating && viewMode === "full" && (
          <ResumeUploadPanel
            requestId={requestId}
            onUploaded={handleOverlayUploaded}
            storedResume={storedResume}
          />
        )}

        {overlayGenerating && (
          <div className="bg-white border border-[#e4ddd4] rounded-2xl px-6 py-4 flex items-center gap-4 shadow-[0_8px_20px_rgba(28,23,19,0.05)]">
            <span className="w-5 h-5 rounded-full border-2 border-[#e4ddd4] border-t-[#1a4a3a] animate-spin flex-shrink-0" role="status" aria-label="Generating personalization" />
            <div>
              <p className="text-sm font-semibold text-[#1c1713]">Personalizing your brief…</p>
              <p className="text-xs text-[#9c8d81] mt-0.5">Analyzing your background against this role and updating the brief.</p>
            </div>
          </div>
        )}

        {overlay.status === "failed" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4" role="alert">
            <p className="text-sm font-semibold text-red-800">Personalization failed</p>
            <p className="text-xs text-red-600 mt-0.5">
              {overlay.error ?? "Could not generate personalized sections."} You can try uploading again.
            </p>
          </div>
        )}

        <SectionGroupLabel
          title="Decision Layer"
          description="Start with the core recommendation, top-line judgment, and the fastest version of the story."
        />
        {renderBaseSection("executive_summary")}
        {renderBaseSection("interview_decision_summary")}
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
          title="Interview Preparation"
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

        {viewMode === "full" && (
          <section
            id="sources"
            aria-labelledby="sources-heading"
            className="bg-white border border-[#e4ddd4] rounded-[26px] px-6 py-5 shadow-[0_12px_24px_rgba(28,23,19,0.05)]"
          >
            <h2 id="sources-heading" className="text-sm font-semibold text-[#1c1713] mb-4">
              Evidence Sources
            </h2>
            <SourcesPanel sources={report.sources} />
          </section>
        )}

        {report.tokenUsage && viewMode === "full" && (
          <TokenUsagePanel usage={report.tokenUsage} />
        )}

        <div className="bg-white border border-[#e4ddd4] rounded-[26px] px-6 py-5 shadow-[0_12px_24px_rgba(28,23,19,0.05)]">
          <h2 className="text-sm font-semibold text-[#4a3f36] mb-3">Was this brief useful overall?</h2>
          {overallFeedback ? (
            <p className="text-sm text-[#9c8d81]" role="status" aria-live="polite">
              {overallFeedback === "useful" ? "Thanks — glad it helped." : "Thanks for the feedback."}
            </p>
          ) : (
            <div className="flex gap-3" role="group" aria-label="Overall report feedback">
              <button
                onClick={() => handleOverallFeedback("useful")}
                className="px-4 py-2 rounded-lg bg-white text-[#4a3f36] text-sm border border-[#d4cdc4] hover:bg-[#1a4a3a]/6 hover:text-[#1a4a3a] hover:border-[#1a4a3a]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 transition-colors"
              >
                Yes, useful
              </button>
              <button
                onClick={() => handleOverallFeedback("not_useful")}
                className="px-4 py-2 rounded-lg bg-white text-[#4a3f36] text-sm border border-[#d4cdc4] hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 transition-colors"
              >
                Not useful
              </button>
            </div>
          )}
        </div>

        <div className="text-center py-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 rounded disabled:opacity-40 transition-colors"
          >
            {regenerating ? "Starting regeneration…" : "Re-run analysis"}
          </button>
        </div>
      </div>
    </main>
  );
}

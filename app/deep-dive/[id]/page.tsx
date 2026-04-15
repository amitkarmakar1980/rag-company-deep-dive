"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ReportSectionCard } from "@/components/ReportSectionCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { SourcesPanel } from "@/components/report/SourcesPanel";
import { ResumeUploadPanel } from "@/components/report/ResumeUploadPanel";
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

  const hasOverlay = overlay.status === "completed" && overlay.data !== null;
  const overlayGenerating = overlay.status === "generating" || overlay.status === "uploading";

  // Sections that are visible in 5-min brief mode
  const visibleSections = (key: string) =>
    viewMode === "full" || BRIEF_SECTION_KEYS.has(key);

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
    <main className="min-h-screen bg-[#faf8f3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-3">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-[#1c1713] mb-1.5">
              Interview Intelligence Brief
            </h1>
            <p className="text-sm text-[#9c8d81]">
              {completedAtParts
                ? `Generated ${completedAtParts.date} at ${completedAtParts.time} ${completedAtParts.shortLabel}`
                : "Generated recently"}
            </p>
            <p className="text-xs text-[#9c8d81] mt-1">
              {generationDuration ? `Time to generate ${generationDuration}` : `Times shown in ${shortLabel}`}
              {hasOverlay && <span className="ml-2 text-[#1a4a3a]">· Personalized with your resume</span>}
            </p>
          </div>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Brief mode banner */}
        {viewMode === "brief" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-xs text-amber-800">
              <span className="font-semibold">5-Minute Brief mode</span> — showing decision-critical sections only.{" "}
              <button onClick={() => setViewMode("full")} className="underline hover:text-amber-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-700 rounded">
                Switch to Full Report
              </button>
            </p>
          </div>
        )}

        {/* Resume upload CTA */}
        {!hasOverlay && !overlayGenerating && viewMode === "full" && (
          <ResumeUploadPanel
            requestId={requestId}
            onUploaded={handleOverlayUploaded}
            storedResume={storedResume}
          />
        )}

        {/* Overlay generating banner */}
        {overlayGenerating && (
          <div className="bg-white border border-[#e4ddd4] rounded-xl px-6 py-4 flex items-center gap-4 shadow-[0_2px_8px_rgba(28,23,19,0.05)]">
            <span className="w-5 h-5 rounded-full border-2 border-[#e4ddd4] border-t-[#1a4a3a] animate-spin flex-shrink-0" role="status" aria-label="Generating personalization" />
            <div>
              <p className="text-sm font-semibold text-[#1c1713]">Personalizing your brief…</p>
              <p className="text-xs text-[#9c8d81] mt-0.5">Analyzing your background against this role and updating the brief.</p>
            </div>
          </div>
        )}

        {/* Overlay failed banner */}
        {overlay.status === "failed" && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4" role="alert">
            <p className="text-sm font-semibold text-red-800">Personalization failed</p>
            <p className="text-xs text-red-600 mt-0.5">
              {overlay.error ?? "Could not generate personalized sections."} You can try uploading again.
            </p>
          </div>
        )}

        {/* ── DECISION LAYER ── */}
        {renderBaseSection("executive_summary")}
        {renderBaseSection("interview_decision_summary")}
        {renderBaseSection("five_minute_brief")}
        {renderBaseSection("assessment_snapshot")}

        {/* ── CANDIDATE ROLE MATCH (second card after assessment, needs resume) ── */}
        {renderOverlaySection(OVERLAY_SECTIONS[0])}

        {renderBaseSection("strategic_bet_analysis")}

        {/* ── REMAINING CANDIDATE OVERLAY (after strategic context, before agenda) ── */}
        {OVERLAY_SECTIONS.slice(1).map(renderOverlaySection)}

        {/* ── INTERVIEW PREP ── */}
        {renderBaseSection("likely_interview_agenda")}
        {renderBaseSection("questions_to_ask")}
        {renderBaseSection("risks_red_flags")}
        {renderBaseSection("unknowns_to_validate")}

        {/* ── DEEP CONTEXT (collapsed by default) ── */}
        {renderBaseSection("company_snapshot")}
        {renderBaseSection("company_swot")}
        {renderBaseSection("role_snapshot")}
        {renderBaseSection("role_swot")}
        {renderBaseSection("why_role_exists_now")}

        {/* Sources */}
        {viewMode === "full" && (
          <section
            id="sources"
            aria-labelledby="sources-heading"
            className="bg-white border border-[#e4ddd4] rounded-xl px-6 py-5 shadow-[0_2px_8px_rgba(28,23,19,0.05)]"
          >
            <h2 id="sources-heading" className="text-sm font-semibold text-[#1c1713] mb-4">
              Evidence Sources
            </h2>
            <SourcesPanel sources={report.sources} />
          </section>
        )}

        {/* Token usage */}
        {report.tokenUsage && viewMode === "full" && (
          <TokenUsagePanel usage={report.tokenUsage} />
        )}

        {/* Overall feedback */}
        <div className="bg-white border border-[#e4ddd4] rounded-xl px-6 py-5 shadow-[0_2px_8px_rgba(28,23,19,0.05)]">
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

        {/* Regenerate */}
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

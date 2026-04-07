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
import { SectionShell } from "@/components/report/SectionShell";
import { RecommendationType, ReportScore, CandidateOverlayData } from "@/lib/types";
import { useResumeStore } from "@/lib/hooks/useResumeStore";

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
  createdAt: string;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const PROCESSING_STATUSES = new Set([
  "pending",
  "fetching_sources",
  "indexing",
  "generating_report",
]);

const STATUS_LABELS: Record<string, string> = {
  pending: "Starting analysis…",
  fetching_sources: "Fetching sources from the web…",
  indexing: "Indexing and embedding content…",
  generating_report: "Generating your intelligence brief…",
};

// Base sections rendered from the report
const BASE_SECTION_ORDER = [
  "executive_summary",
  "assessment_snapshot",
  "company_snapshot",
  "company_swot",
  "role_snapshot",
  "role_swot",
  "why_role_exists_now",
  "strategic_bet_analysis",
  "questions_to_ask",
  "risks_red_flags",
  "evidence_gaps",
];

// Candidate overlay sections — locked until resume uploaded
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

// ─── Candidate section placeholder (locked state) ─────────────────────────

function LockedOverlaySection({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl overflow-hidden opacity-60"
      aria-hidden="true"
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Resume required
        </span>
      </div>
      <div className="px-6 py-5 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
    </div>
  );
}

// ─── Mode badge ──────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: "deep_dive" | "interview_prep" }) {
  if (mode === "interview_prep") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Interview Prep Mode
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      Deep Dive Mode
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState<"useful" | "not_useful" | null>(null);

  const { stored: storedResume } = useResumeStore();

  // Overlay state
  const [overlay, setOverlay] = useState<OverlayState>({
    status: "none",
    data: null,
    error: null,
  });
  const overlayPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Overlay polling ────────────────────────────────────────────────────

  const pollOverlay = useCallback(async () => {
    try {
      const res = await fetch(`/api/overlay/${requestId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.exists) return; // no overlay yet — keep polling if we expect one

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

  // Auto-submit resume from localStorage if no overlay exists yet
  const autoSubmitStoredResume = useCallback(async (resumeText: string) => {
    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, resumeText }),
      });
      if (res.ok) {
        setOverlay({ status: "generating", data: null, error: null });
        startOverlayPolling();
      }
    } catch {
      // Non-critical — user can still upload manually
    }
  }, [requestId, startOverlayPolling]);

  // Check for existing overlay on load
  const checkExistingOverlay = useCallback(async (resumeText?: string) => {
    try {
      const res = await fetch(`/api/overlay/${requestId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.exists) {
        // No overlay — if we have a stored resume, kick it off automatically
        if (resumeText) {
          autoSubmitStoredResume(resumeText);
        }
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
  }, [requestId, autoSubmitStoredResume]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOverlayUploaded = useCallback(() => {
    setOverlay({ status: "generating", data: null, error: null });
    startOverlayPolling();
  }, [startOverlayPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlayPollRef.current) clearInterval(overlayPollRef.current);
    };
  }, []);

  // ─── Base report fetching ───────────────────────────────────────────────

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
        // Check for existing overlay now that we have the report;
        // pass stored resume text so it can auto-trigger overlay if needed
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

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center gap-4">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin"
            role="status"
            aria-label="Loading"
          />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </main>
    );
  }

  // ─── Error / failed state ───────────────────────────────────────────────

  if (error || status?.status === "failed") {
    return (
      <main className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-8 text-center"
            role="alert"
          >
            <h1 className="text-base font-semibold text-red-800 mb-2">
              Report Generation Failed
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              {error ?? "An error occurred while generating this report."}
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 bg-gray-900 text-white border border-gray-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:opacity-50 transition-colors"
            >
              {regenerating ? "Starting…" : "Try Again"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Processing state ───────────────────────────────────────────────────

  if (status && PROCESSING_STATUSES.has(status.status)) {
    return (
      <main className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-6">
          <div
            className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin"
            role="status"
            aria-label="Processing"
          />
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">
              {STATUS_LABELS[status.status] ?? status.status}
            </p>
            <p className="text-sm text-gray-400 mt-1.5">
              Takes 45–90 seconds. Stay on this page.
            </p>
          </div>
          <div className="flex gap-2 mt-2" aria-hidden>
            {Object.keys(STATUS_LABELS).map((s, i) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${
                  Object.keys(STATUS_LABELS).indexOf(status.status) >= i
                    ? "bg-gray-900 w-8"
                    : "bg-gray-200 w-4"
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─── No report ──────────────────────────────────────────────────────────

  if (!report) {
    return (
      <main className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400 text-sm">Report not found.</p>
        </div>
      </main>
    );
  }

  // ─── Report ready ────────────────────────────────────────────────────────

  const sortedSections = [...report.sections].sort((a, b) => {
    const ai = BASE_SECTION_ORDER.indexOf(a.key);
    const bi = BASE_SECTION_ORDER.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const hasOverlay = overlay.status === "completed" && overlay.data !== null;
  const overlayGenerating = overlay.status === "generating" || overlay.status === "uploading";
  const reportMode = hasOverlay ? "interview_prep" : "deep_dive";

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-3">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl font-semibold text-gray-900">Interview Intelligence Brief</h1>
              <ModeBadge mode={reportMode} />
            </div>
            <p className="text-sm text-gray-400">
              Generated{" "}
              {new Date(report.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {hasOverlay && (
                <span className="ml-2 text-emerald-600">· Personalized with your resume</span>
              )}
            </p>
          </div>
        </div>

        {/* Resume upload CTA — shown only when no overlay exists and not currently generating */}
        {!hasOverlay && !overlayGenerating && (
          <ResumeUploadPanel
            requestId={requestId}
            onUploaded={handleOverlayUploaded}
            storedResume={storedResume}
          />
        )}

        {/* Overlay generating banner */}
        {overlayGenerating && (
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-4">
            <span
              className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin flex-shrink-0"
              role="status"
              aria-label="Generating personalization"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">Personalizing your brief…</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Analyzing your background against this role. Takes about 30 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Overlay failed banner */}
        {overlay.status === "failed" && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl px-6 py-4"
            role="alert"
          >
            <p className="text-sm font-semibold text-red-800">Personalization failed</p>
            <p className="text-xs text-red-600 mt-0.5">
              {overlay.error ?? "Could not generate personalized sections."} You can try uploading again.
            </p>
          </div>
        )}

        {/* ── Base sections ── */}
        {sortedSections.map((section) => (
          <ReportSectionCard
            key={section.id}
            sectionKey={section.key}
            title={section.title}
            content={section.content}
            citations={section.citations}
            feedback={
              <FeedbackButtons
                reportId={report.id}
                sectionKey={section.key}
                compact
              />
            }
          />
        ))}

        {/* ── Candidate overlay sections ── */}
        {OVERLAY_SECTIONS.map(({ key, title, subtitle }) => {
          // Overlay completed — render live data
          if (hasOverlay && overlay.data![key]) {
            return (
              <SectionShell
                key={key}
                id={key}
                title={title}
                subtitle={subtitle}
              >
                {key === "candidate_role_match" && (
                  <CandidateRoleMatchSection
                    data={overlay.data!.candidate_role_match}
                  />
                )}
                {key === "strengths_to_emphasize" && (
                  <StrengthsToEmphasizeSection
                    data={overlay.data!.strengths_to_emphasize}
                  />
                )}
                {key === "interviewer_concerns" && (
                  <InterviewerConcernsSection
                    data={overlay.data!.interviewer_concerns}
                  />
                )}
                {key === "gap_management" && (
                  <GapManagementSection
                    data={overlay.data!.gap_management}
                  />
                )}
                {key === "story_recommendations" && (
                  <StoryRecommendationsSection
                    data={overlay.data!.story_recommendations}
                  />
                )}
                {key === "positioning_strategy" && (
                  <PositioningStrategySection
                    data={overlay.data!.positioning_strategy}
                  />
                )}
              </SectionShell>
            );
          }

          // Overlay generating — skeleton
          if (overlayGenerating) {
            return (
              <SectionShell key={key} id={key} title={title} subtitle={subtitle}>
                <SectionSkeleton />
              </SectionShell>
            );
          }

          // No overlay — locked placeholder
          return (
            <LockedOverlaySection key={key} title={title} subtitle={subtitle} />
          );
        })}

        {/* Sources */}
        <section
          id="sources"
          aria-labelledby="sources-heading"
          className="bg-white border border-gray-200 rounded-xl px-6 py-5"
        >
          <h2
            id="sources-heading"
            className="text-sm font-semibold text-gray-900 mb-4"
          >
            Evidence Sources
          </h2>
          <SourcesPanel sources={report.sources} />
        </section>

        {/* Overall feedback */}
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Was this brief useful overall?
          </h2>
          {overallFeedback ? (
            <p className="text-sm text-gray-400" role="status" aria-live="polite">
              {overallFeedback === "useful"
                ? "Thanks — glad it helped."
                : "Thanks for the feedback."}
            </p>
          ) : (
            <div className="flex gap-3" role="group" aria-label="Overall report feedback">
              <button
                onClick={() => handleOverallFeedback("useful")}
                className="px-4 py-2 rounded-lg bg-white text-gray-700 text-sm border border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 transition-colors"
              >
                Yes, useful
              </button>
              <button
                onClick={() => handleOverallFeedback("not_useful")}
                className="px-4 py-2 rounded-lg bg-white text-gray-700 text-sm border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 transition-colors"
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

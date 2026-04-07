"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ReportSectionCard } from "@/components/ReportSectionCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { SourcesPanel } from "@/components/report/SourcesPanel";
import { RecommendationType, ReportScore } from "@/lib/types";

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

const SECTION_ORDER = [
  "executive_summary",
  "assessment_snapshot",
  "company_snapshot",
  "company_swot",
  "role_snapshot",
  "role_swot",
  "why_role_exists_now",
  "strategic_bet_analysis",
  "candidate_positioning",
  "questions_to_ask",
  "risks_red_flags",
  "evidence_gaps",
];

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

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/deep-dive/status?id=${requestId}`);
      if (!res.ok) throw new Error("Failed to fetch status");

      const data: RequestStatus = await res.json();
      setStatus(data);

      if (data.report) {
        const reportRes = await fetch(`/api/report/${data.report.id}`);
        if (!reportRes.ok) throw new Error("Failed to fetch report");
        setReport(await reportRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

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

  // ─── Loading state ──────────────────────────────────────────────────────────
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

  // ─── Error / failed state ───────────────────────────────────────────────────
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

  // ─── Processing state ───────────────────────────────────────────────────────
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

  // ─── No report ──────────────────────────────────────────────────────────────
  if (!report) {
    return (
      <main className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-400 text-sm">Report not found.</p>
        </div>
      </main>
    );
  }

  // ─── Sort sections into canonical order ─────────────────────────────────────
  const sortedSections = [...report.sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.key);
    const bi = SECTION_ORDER.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // ─── Report ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-3">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Interview Intelligence Brief</h1>
          <p className="text-sm text-gray-400 mt-1">
            Generated{" "}
            {new Date(report.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Report sections */}
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
                aria-label="Mark overall report as useful"
              >
                Yes, useful
              </button>
              <button
                onClick={() => handleOverallFeedback("not_useful")}
                className="px-4 py-2 rounded-lg bg-white text-gray-700 text-sm border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 transition-colors"
                aria-label="Mark overall report as not useful"
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
            aria-label="Re-run the full analysis"
          >
            {regenerating ? "Starting regeneration…" : "Re-run analysis"}
          </button>
        </div>

      </div>
    </main>
  );
}

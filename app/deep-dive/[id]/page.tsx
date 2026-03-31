"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { RecommendationBanner } from "@/components/RecommendationBanner";
import { ScoreCards } from "@/components/ScoreCards";
import { ReportSectionCard } from "@/components/ReportSectionCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { RecommendationType, ReportScore } from "@/lib/types";

interface Report {
  id: string;
  recommendation: RecommendationType;
  scores: ReportScore;
  sections: Array<{
    id: string;
    key: string;
    title: string;
    content: string;
    citations?: Array<{
      source_id: string;
      url?: string;
      title: string;
    }>;
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

const PROCESSING_STATUSES = new Set([
  "pending",
  "fetching_sources",
  "indexing",
  "generating_report",
]);

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

  // Poll while processing
  useEffect(() => {
    if (!status || !PROCESSING_STATUSES.has(status.status)) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [status?.status, fetchStatus]);

  const handleRegenerate = async () => {
    if (!confirm("This will re-fetch all sources and regenerate the report. Continue?")) return;
    setRegenerating(true);
    setReport(null);
    setError(null);
    try {
      const res = await fetch(`/api/deep-dive/${requestId}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start regeneration");
      }
      // Reset to polling state
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

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (error || status?.status === "failed") {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Report Generation Failed
            </h2>
            <p className="text-red-700 mb-4">
              {error || "Unable to generate report."}
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 transition"
            >
              {regenerating ? "Starting..." : "Try Again"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (status && PROCESSING_STATUSES.has(status.status)) {
    const statusLabel: Record<string, string> = {
      pending: "Starting analysis...",
      fetching_sources: "Fetching sources...",
      indexing: "Indexing content...",
      generating_report: "Generating report...",
    };
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-6" />
            <p className="text-gray-900 font-medium">
              {statusLabel[status.status] ?? status.status}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This takes 30–60 seconds. Stay on this page.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-600">
          Report not found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Recommendation Banner */}
        <RecommendationBanner recommendation={report.recommendation} />

        {/* Score Cards */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Confidence Indicators</h2>
          <ScoreCards scores={report.scores} />
          <p className="text-xs text-gray-500 mt-2">
            AI-generated scores based on public signals. Use for decision support, not as facts.
          </p>
        </div>

        {/* Report Sections */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Analysis</h2>
          {report.sections.map((section) => (
            <div key={section.id} className="mb-8">
              <ReportSectionCard
                title={section.title}
                content={section.content}
                citations={section.citations}
              />
              <div className="ml-6 mt-2">
                <FeedbackButtons
                  reportId={report.id}
                  sectionKey={section.key}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Overall Report Feedback */}
        <div className="border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Was this report useful overall?
          </h3>
          {overallFeedback ? (
            <p className="text-sm text-gray-600">
              {overallFeedback === "useful"
                ? "Thanks — glad it helped."
                : "Thanks for the feedback."}
            </p>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleOverallFeedback("useful")}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-green-100 hover:text-green-700 transition"
              >
                Yes, useful
              </button>
              <button
                onClick={() => handleOverallFeedback("not_useful")}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-red-100 hover:text-red-700 transition"
              >
                Not useful
              </button>
            </div>
          )}
        </div>

        {/* Evidence Sources */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Evidence Sources</h3>
          <div className="space-y-2">
            {report.sources.map((source) => (
              <div key={source.id} className="text-sm">
                <span className="inline-block bg-gray-200 px-2 py-1 rounded text-xs font-medium mr-2">
                  {source.type}
                </span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span>{source.title}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Regenerate */}
        <div className="text-center">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-sm text-gray-500 hover:text-gray-900 underline disabled:no-underline disabled:text-gray-400 transition"
          >
            {regenerating ? "Starting regeneration..." : "Re-run analysis"}
          </button>
        </div>
      </div>
    </main>
  );
}

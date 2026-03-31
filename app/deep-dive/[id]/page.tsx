"use client";

import { useEffect, useState } from "react";
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
  report?: {
    id: string;
  };
}

export default function ReportPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/deep-dive/status?id=${requestId}`);
        if (!res.ok) throw new Error("Failed to fetch status");

        const data: RequestStatus = await res.json();
        setStatus(data);

        // If report is available, fetch it
        if (data.report) {
          const reportRes = await fetch(`/api/report/${data.report.id}`);
          if (!reportRes.ok) throw new Error("Failed to fetch report");

          const reportData = await reportRes.json();
          setReport(reportData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Poll for updates if still processing
    if (status?.status !== "completed" && status?.status !== "failed") {
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [requestId, status?.status]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Generating your deep dive report...</p>
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
            <p className="text-red-700">
              {error || "Unable to generate report. Please try again."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (status?.status === "pending" || status?.status === "fetching_sources" || status?.status === "indexing" || status?.status === "generating_report") {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-4 w-1/2 mx-auto" />
              <div className="h-4 bg-gray-300 rounded w-1/3 mx-auto" />
            </div>
            <p className="text-gray-600 mt-6">
              Status: {status.status.replace("_", " ")}...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center text-gray-600">
            Report not found.
          </div>
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
          <p className="text-xs text-gray-600 mt-2">
            These AI-generated scores are based on public signals. Use them for decision support, not as facts.
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
              <div className="ml-6">
                <FeedbackButtons
                  reportId={report.id}
                  sectionKey={section.key}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Evidence Sources */}
        <div className="bg-gray-50 rounded-lg p-6">
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
      </div>
    </main>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase";
import { getCanonicalRecommendation } from "@/lib/report/recommendation";

type HistoryMetricReport = {
  created_at?: string | null;
  recommendation?: string;
  candidate_fit_score?: number | null;
  ai_query_count?: number | null;
  source_count?: number | null;
  source_host_count?: number | null;
  summary_json?: any;
  report_sections?: Array<{
    section_key?: string | null;
    content_markdown?: string | null;
  }>;
};

type HistoryOverlay = {
  id?: string;
  status?: string | null;
  ai_query_count?: number | null;
};

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function countAiQueries(summaryJson: any): number {
  const calls = summaryJson?.token_usage?.calls;
  return Array.isArray(calls) ? calls.length : 0;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function getPrimaryReport(value: HistoryMetricReport | HistoryMetricReport[] | null | undefined): HistoryMetricReport | null {
  return asArray(value)[0] ?? null;
}

function getSectionContent(report: HistoryMetricReport | null, sectionKey: string): any | null {
  const section = asArray(report?.report_sections).find(
    (entry) => entry?.section_key === sectionKey
  );

  if (!section?.content_markdown) {
    return null;
  }

  try {
    return JSON.parse(section.content_markdown);
  } catch {
    return null;
  }
}

function getDetailedRecommendation(report: HistoryMetricReport | null): string | null {
  const executiveSummary = getSectionContent(report, "executive_summary");
  const interviewDecision = getSectionContent(report, "interview_decision_summary");
  const canonical = getCanonicalRecommendation({
    reportRecommendation: report?.recommendation ?? null,
    executiveRecommendation: executiveSummary?.recommendation,
    pursuitStance: executiveSummary?.pursuit_stance,
    interviewRecommendation: interviewDecision?.pursue_recommendation,
    candidateFitScore: report?.candidateFitScore ?? null,
  });

  return canonical.displayLabel;
}

function getOverlayAiQueries(overlays: HistoryOverlay[]): number {
  return overlays.reduce((total, overlay) => {
    if (typeof overlay.ai_query_count === "number" && overlay.ai_query_count > 0) {
      return total + overlay.ai_query_count;
    }

    if (overlay.status === "completed" || overlay.status === "failed" || overlay.status === "generating") {
      return total + 1;
    }

    return total;
  }, 0);
}

function isMissingReportMetricsColumn(error: { message?: string } | null | undefined): boolean {
  return /ai_query_count|source_count|source_host_count/i.test(error?.message ?? "");
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: requestIds, error: requestIdsError } = await supabaseAdmin
      .from("deep_dive_requests")
      .select("id")
      .eq("user_id", user.id);

    if (requestIdsError) throw requestIdsError;

    const ids = (requestIds ?? []).map((row: any) => row.id);

    let requestQuery = supabaseAdmin
      .from("deep_dive_requests")
      .select(`
        *,
        companies(name, website_url),
        reports(created_at, recommendation, candidate_fit_score, ai_query_count, source_count, source_host_count, summary_json, report_sections(section_key, content_markdown)),
        candidate_overlays(id, status, ai_query_count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    let sourceQuery = supabaseAdmin
      .from("sources")
      .select("request_id, url");

    if (ids.length > 0) {
      sourceQuery = sourceQuery.in("request_id", ids);
    } else {
      sourceQuery = sourceQuery.limit(0);
    }

    let [{ data, error }, { data: sourceRows, error: sourcesError }] = await Promise.all([requestQuery, sourceQuery]);

    if (error && isMissingReportMetricsColumn(error)) {
      requestQuery = supabaseAdmin
        .from("deep_dive_requests")
        .select(`
          *,
          companies(name, website_url),
          reports(created_at, recommendation, candidate_fit_score, summary_json, report_sections(section_key, content_markdown)),
          candidate_overlays(id, status)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      [{ data, error }, { data: sourceRows, error: sourcesError }] = await Promise.all([requestQuery, sourceQuery]);
    }

    if (error) throw error;
    if (sourcesError) throw sourcesError;

    const websiteHosts = new Set<string>();
    const sourceMetricsByRequest = new Map<string, { sourceCount: number; sourceHosts: Set<string> }>();

    for (const source of sourceRows ?? []) {
      const host = getHostname(source.url);
      const requestId = source.request_id as string | undefined;

      if (requestId) {
        const existing = sourceMetricsByRequest.get(requestId) ?? { sourceCount: 0, sourceHosts: new Set<string>() };
        existing.sourceCount += 1;
        if (host) {
          existing.sourceHosts.add(host);
        }
        sourceMetricsByRequest.set(requestId, existing);
      }

      if (host) {
        websiteHosts.add(host);
      }
    }

    const items = (data ?? []).map((item: any) => {
      const report = getPrimaryReport(item.reports as HistoryMetricReport | HistoryMetricReport[] | null | undefined);
      const overlays = asArray(item.candidate_overlays as HistoryOverlay | HistoryOverlay[] | null | undefined);
      const sourceMetrics = sourceMetricsByRequest.get(item.id);
      const reportAiQueries = report
        ? (typeof report.ai_query_count === "number" && report.ai_query_count > 0
          ? report.ai_query_count
          : countAiQueries(report.summary_json))
        : 0;
      const overlayAiQueries = getOverlayAiQueries(overlays);

      return {
        requestId: item.id,
        company: item.companies || { name: "Unknown", website_url: null },
        roleTitle: item.role_title,
        status: item.status,
        createdAt: item.created_at,
        completedAt: item.status === "completed"
          ? (item.updated_at ?? report?.created_at ?? null)
          : null,
        companyUrl: item.company_url || item.companies?.website_url || null,
        hasJobDescription: !!item.job_description,
        hasResume: overlays.some(
          (overlay) => overlay.status === "completed" || overlay.status === "generating"
        ),
        report: report
          ? {
              createdAt: report.created_at ?? null,
              recommendation: getDetailedRecommendation(report) ?? report.recommendation ?? "need_more_signal",
              candidateFitScore: report.candidate_fit_score ?? null,
              aiQueryCount: reportAiQueries + overlayAiQueries,
              sourceCount: typeof report.source_count === "number"
                ? report.source_count
                : (sourceMetrics?.sourceCount ?? 0),
              sourceHostCount: typeof report.source_host_count === "number"
                ? report.source_host_count
                : (sourceMetrics?.sourceHosts.size ?? 0),
              sectionKeys: asArray(report.report_sections).flatMap((section) =>
                section?.section_key ? [section.section_key] : []
              ),
            }
          : null,
      };
    });

    const initialStats: {
      totalReports: number;
      websitesSearched: number;
      aiQueries: number;
    } = {
      totalReports: 0,
      websitesSearched: websiteHosts.size,
      aiQueries: 0,
    };

    const stats = items.reduce(
      (totals: typeof initialStats, item: any) => {
        if (item.report) {
          totals.totalReports += 1;
          totals.aiQueries += item.report.aiQueryCount;
        }

        return totals;
      },
      initialStats
    );

    return NextResponse.json(
      {
        items,
        stats,
      }
    );
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

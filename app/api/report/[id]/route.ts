import { NextRequest, NextResponse } from "next/server";
import { getReportById, getReportSections, getRequestSources } from "@/lib/db/operations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;

    const report = await getReportById(reportId);
    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    const sections = await getReportSections(reportId);

    // Get sources for evidence
    const sources = await getRequestSources(report.request_id);

    return NextResponse.json({
      id: report.id,
      recommendation: report.recommendation,
      scores: {
        company_momentum: report.company_momentum_score,
        org_clarity: report.org_clarity_score,
        role_leverage: report.role_leverage_score,
        execution_risk: report.execution_risk_score,
        candidate_fit: report.candidate_fit_score,
      },
      sections: sections.map((s) => ({
        id: s.id,
        key: s.section_key,
        title: s.section_title,
        content: s.content_markdown,
        citations: s.citations_json,
      })),
      sources: sources.map((s) => ({
        id: s.id,
        type: s.source_type,
        title: s.title,
        url: s.url,
        publishedAt: s.published_at,
      })),
      createdAt: report.created_at,
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

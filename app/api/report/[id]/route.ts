import { NextRequest, NextResponse } from "next/server";
import {
  getDeepDiveRequest,
  getEffectiveReportFamily,
  getEffectiveReportFormat,
  getReportById,
  getReportSections,
  getRequestSources,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";

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
    const request = await getDeepDiveRequest(report.request_id);
    const { data: company, error: companyError } = request?.company_id
      ? await supabaseAdmin
          .from("companies")
          .select("name, website_url")
          .eq("id", request.company_id)
          .single()
      : { data: null, error: null };

    if (companyError && companyError.code !== "PGRST116") {
      throw companyError;
    }

    // Get sources for evidence
    const sources = await getRequestSources(report.request_id);

    return NextResponse.json({
      id: report.id,
      reportFormat: getEffectiveReportFormat(report),
      reportFamily: getEffectiveReportFamily(report),
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
      tokenUsage: report.summary_json?.token_usage ?? null,
      createdAt: report.created_at,
      company: {
        name: company?.name ?? "Unknown Company",
        websiteUrl: company?.website_url ?? null,
      },
      roleTitle: request?.role_title ?? null,
      companyUrl: request?.company_url ?? company?.website_url ?? null,
      jobDescription: request?.job_description ?? null,
      requestCreatedAt: request?.created_at ?? null,
      completedAt: request?.status === "completed"
        ? (request.updated_at ?? report.created_at)
        : null,
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

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

function sortSectionsByPresentationPlan<T extends { key: string }>(
  sections: T[],
  presentationPlan: { sectionOrder?: string[] } | null | undefined
): T[] {
  const sectionOrder = presentationPlan?.sectionOrder;
  if (!sectionOrder?.length) {
    return sections;
  }

  const orderIndex = new Map(sectionOrder.map((key, index) => [key, index]));
  return [...sections].sort((left, right) => {
    const leftIndex = orderIndex.get(left.key) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.get(right.key) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.key.localeCompare(right.key);
  });
}

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

    const rawSections = await getReportSections(reportId);
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

    const presentationPlan = report.summary_json?.presentation_plan ?? null;
    const sections = sortSectionsByPresentationPlan(
      rawSections.map((s) => ({
        id: s.id,
        key: s.section_key,
        title: s.section_title,
        content: s.content_markdown,
        citations: s.citations_json,
      })),
      presentationPlan
    );

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
      sections,
      sources: sources.map((s) => ({
        id: s.id,
        type: s.source_type,
        title: s.title,
        url: s.url,
        publishedAt: s.published_at,
      })),
      tokenUsage: report.summary_json?.token_usage ?? null,
      sourceCoverage: report.summary_json?.source_coverage ?? null,
      personaQa: report.summary_json?.persona_qa ?? null,
      qualityGate: report.summary_json?.quality_gate ?? null,
      personaProfile: report.summary_json?.persona_profile ?? null,
      researchPlan: report.summary_json?.research_plan ?? null,
      presentationPlan,
      createdAt: report.created_at,
      company: {
        name: company?.name ?? "Unknown Company",
        websiteUrl: company?.website_url ?? null,
      },
      roleTitle: request?.role_title ?? null,
      companyUrl: request?.company_url ?? company?.website_url ?? null,
      jobDescription: request?.job_description ?? null,
      resumeProvided: Boolean(request?.profile_context?.trim()),
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

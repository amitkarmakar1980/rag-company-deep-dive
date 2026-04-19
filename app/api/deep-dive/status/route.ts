import { NextRequest, NextResponse } from "next/server";
import { getDeepDiveRequest, getReport, getReportSectionCount, getRequestSources } from "@/lib/db/operations";
import { PREMIUM_SECTION_DEFINITIONS } from "@/lib/report/premiumTypes";

function buildGeneratingReportProgress(
  report: Awaited<ReturnType<typeof getReport>>,
  completedSections: number
) {
  const totalSections = PREMIUM_SECTION_DEFINITIONS.length;

  if (!report) {
    return {
      stage: "synthesizing",
      completedSections: 0,
      totalSections,
      headline: "Running premium synthesis across the retrieved evidence...",
      detail: "The model is assembling strategy, candidate-fit, and interview-prep layers before anything is written to the database.",
    };
  }

  if (completedSections < totalSections) {
    return {
      stage: "writing_sections",
      completedSections,
      totalSections,
      headline: `Writing report sections and citations (${completedSections}/${totalSections})...`,
      detail: "The premium report row exists. The pipeline is now persisting structured sections and attaching evidence citations.",
    };
  }

  return {
    stage: "finalizing",
    completedSections,
    totalSections,
    headline: "Finalizing the cost ledger and publishing the report...",
    detail: "All report sections are written. The pipeline is finishing telemetry and the operations layer before the report flips to completed.",
  };
}

export async function GET(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const request = await getDeepDiveRequest(requestId);
    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const report = await getReport(requestId);
    const requestSources = await getRequestSources(requestId);
    const completedSections = report ? await getReportSectionCount(report.id) : 0;
    const researchPlan = request.metadata_json?.research_plan ?? report?.summary_json?.research_plan ?? null;
    const progress = request.status === "generating_report"
      ? buildGeneratingReportProgress(report, completedSections)
      : null;

    return NextResponse.json({
      requestId,
      status: request.status,
      errorMessage: request.error_message ?? null,
      requestMeta: {
        companyUrl: request.company_url ?? null,
        roleTitle: request.role_title ?? null,
      },
      requestSources: requestSources.map((source) => ({
        id: source.id,
        title: source.title,
        type: source.source_type,
        url: source.url ?? null,
      })),
      researchPlan,
      progress,
      report: report
        ? {
            id: report.id,
            recommendation: report.recommendation,
            scores: {
              company_momentum: report.company_momentum_score,
              org_clarity: report.org_clarity_score,
              role_leverage: report.role_leverage_score,
              execution_risk: report.execution_risk_score,
              candidate_fit: report.candidate_fit_score,
            },
          }
        : null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

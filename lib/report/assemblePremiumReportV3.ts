import {
  createReport,
  createReportSection,
  deleteReportForRequest,
  getDeepDiveRequest,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import type { Report, RecommendationType } from "@/lib/types";
import { type ResearchPlan } from "@/lib/ingestion/firecrawl";
import { getPremiumPresentationPlan, inferPremiumPersona } from "@/lib/report/premiumPersona";
import { runCompanyDeepDiveV3 } from "@/lib/report/v3/companyDeepDive";

function toStoredResearchPlan(researchPlanOrQueries?: ResearchPlan | string[]) {
  if (!researchPlanOrQueries || Array.isArray(researchPlanOrQueries)) {
    return null;
  }
  return {
    strategy_summary: researchPlanOrQueries.strategySummary,
    retrieval_queries: researchPlanOrQueries.retrievalQueries,
    source_strategy: researchPlanOrQueries.sourceStrategy,
  };
}

function deriveRecommendation(overallScore: number): RecommendationType {
  if (overallScore >= 8) return "pursue";
  if (overallScore >= 6) return "pursue";
  if (overallScore >= 4) return "pursue_cautiously";
  return "need_more_signal";
}

export async function assemblePremiumReportV3(
  requestId: string,
  researchPlanOrQueries?: ResearchPlan | string[]
): Promise<Report | null> {
  const request = await getDeepDiveRequest(requestId);
  if (!request) throw new Error("Request not found");

  const persona = inferPremiumPersona(
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );
  const presentationPlan = getPremiumPresentationPlan(persona);
  const storedResearchPlan = toStoredResearchPlan(researchPlanOrQueries);

  // Fetch company name
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name, website_url")
    .eq("id", request.company_id)
    .single();

  // Fetch sources for coverage summary
  const { data: sourcesData } = await supabaseAdmin
    .from("sources")
    .select("id, source_type")
    .eq("request_id", requestId);
  const sources = sourcesData ?? [];

  const sourceCoverageSummary = sources.length
    ? `${sources.length} sources fetched across ${new Set(sources.map((s: any) => s.source_type)).size} source types`
    : undefined;

  // ── Run Company Deep Dive V3 module ────────────────────────────────────────
  const { moduleJson, markdownContent, evaluation, usages } = await runCompanyDeepDiveV3({
    requestId,
    companyName: company?.name ?? "Unknown Company",
    companyUrl: company?.website_url ?? request.company_url ?? undefined,
    roleTitle: request.role_title,
    jobDescription: request.job_description ?? undefined,
    sourceCoverageSummary,
  });

  const sc = moduleJson.scorecard ?? {};
  const overallScore = sc.overall_company_attractiveness?.score ?? 5;
  const recommendation = deriveRecommendation(overallScore);

  const totalTokens = usages.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0);
  const totalCost = usages.reduce((sum, u) => sum + u.estimated_cost_usd, 0);

  // ── Delete any prior report for this request (unique constraint on request_id) ─
  await deleteReportForRequest(requestId);

  // ── Create report record ───────────────────────────────────────────────────
  const report = await createReport(
    requestId,
    recommendation,
    {
      company_momentum: sc.business_momentum?.score ?? 5,
      org_clarity: sc.strategic_clarity?.score ?? 5,
      role_leverage: sc.senior_pm_opportunity_quality?.score ?? 5,
      execution_risk: 10 - (sc.competitive_position?.score ?? 5),
      candidate_fit: 0,
    },
    {
      report_format: "premium_v3",
      report_family: "premium",
      generator_version: "premium_v3_company_deep_dive_001",
      company_name: company?.name ?? null,
      persona_profile: persona,
      presentation_plan: {
        ...presentationPlan,
        sectionOrder: ["company_deep_dive_v3"],
      },
      research_plan: storedResearchPlan,
      token_usage: {
        calls: usages,
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
      },
      quality_gate: evaluation,
      source_coverage: sourceCoverageSummary ?? null,
      persona_qa: null,
      company_deep_dive_v3_json: moduleJson,
      company_deep_dive_v3_evaluation: evaluation,
    },
    {
      ai_query_count: usages.length,
      source_count: sources?.length ?? 0,
      source_host_count: 0,
    },
    {
      report_format: "premium_v3",
      report_family: "premium",
    }
  );

  if (!report) throw new Error("Failed to create report record");

  // ── Store the company_deep_dive_v3 section ─────────────────────────────────
  const citations = (moduleJson.evidence_quality?.strongest_sources ?? []).map((c) => ({
    source_id: c.source_id,
    url: c.url,
    title: c.title ?? "Unknown",
    source_type: c.source_type,
  }));

  await createReportSection(
    report.id,
    "company_deep_dive_v3",
    "Company Deep Dive",
    markdownContent,
    0,
    citations
  );

  return report;
}

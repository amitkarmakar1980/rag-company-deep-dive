import { randomUUID } from "crypto";
import {
  createReport,
  createReportSection,
  getDeepDiveRequest,
  getRequestSources,
  updateDeepDiveStatus,
  updateReportSummaryJson,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import { generatePremiumReport } from "@/lib/ai/openai";
import { getPremiumReportPromptV2 } from "@/lib/ai/premiumPromptsV2";
import { multiTopicSearch, rerank } from "@/lib/retrieval/search";
import { Report, ReportTokenUsage, RetrievalContext, RecommendationType } from "@/lib/types";
import {
  PREMIUM_SECTION_DEFINITIONS,
  PremiumGeneratedSection,
  PremiumSectionContent,
  PremiumSectionKey,
} from "@/lib/report/premiumTypes";
import {
  assessPremiumEvidenceQuality,
  buildPremiumCostLedger,
  buildPremiumOperationsSection,
  buildPremiumSourceCoverageSummary,
} from "@/lib/report/premiumTelemetry";

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toValidRecommendation(raw: string): RecommendationType {
  const valid: RecommendationType[] = ["pursue", "pursue_cautiously", "avoid", "need_more_signal"];
  return valid.includes(raw as RecommendationType)
    ? (raw as RecommendationType)
    : "need_more_signal";
}

function clampScore(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(10, value));
}

function fallbackGeneratedSection(question: string): PremiumGeneratedSection {
  return {
    summary: "INSUFFICIENT_EVIDENCE",
    blocks: [
      {
        title: "Evidence gap",
        body: "The system could not support a premium-quality answer for this section with the current evidence base.",
      },
    ],
    evidence: {
      threshold: question,
      status: "insufficient",
      confidence: "suppressed",
      note: "This section was intentionally constrained because the evidence threshold was not met.",
    },
  };
}

function wrapSection(
  _key: PremiumSectionKey,
  generated: PremiumGeneratedSection | undefined,
  fallbackQuestion: string,
  fallbackGroup: PremiumSectionContent["group"],
  fallbackSurface: PremiumSectionContent["surface"]
): PremiumSectionContent {
  const safe = generated ?? fallbackGeneratedSection(fallbackQuestion);

  return {
    schema: "premium_section_v1",
    group: fallbackGroup,
    surface: fallbackSurface,
    question: fallbackQuestion,
    summary: safe.summary || "INSUFFICIENT_EVIDENCE",
    callouts: safe.callouts,
    facts: safe.facts,
    bullets: safe.bullets,
    blocks: safe.blocks,
    evidence: safe.evidence
      ? {
          threshold: safe.evidence.threshold || "See report_generation_spec.md",
          status: safe.evidence.status || "partial",
          confidence: safe.evidence.confidence || "suppressed",
          note: safe.evidence.note || "Confidence is suppressed because the evidence bar was not explicitly met.",
        }
      : undefined,
  };
}

export async function assemblePremiumReportV2(
  requestId: string,
  retrievalQueries?: string[]
): Promise<Report | null> {
  const assemblyStartedAt = Date.now();
  const runId = randomUUID();
  const request = await getDeepDiveRequest(requestId);
  if (!request) {
    throw new Error("Request not found");
  }

  const retrievalStartedAt = Date.now();
  const sources = await getRequestSources(requestId);
  const rawResults = await multiTopicSearch(requestId, 8, 0.35, retrievalQueries);

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", request.company_id)
    .single();
  const companyName = company?.name ?? "the company";

  const reranked = rerank(rawResults, {
    role_title: request.role_title,
    company_name: companyName,
  });
  const retrievalDurationMs = Date.now() - retrievalStartedAt;

  const effectiveQueries = retrievalQueries?.length ? retrievalQueries : [];
  const evidenceQuality = assessPremiumEvidenceQuality(rawResults, reranked);
  const coverage = buildPremiumSourceCoverageSummary(sources, reranked, effectiveQueries);
  const context: RetrievalContext = {
    chunks: reranked.map((result) => ({
      text: result.chunk.text,
      source_id: result.source.id,
      source_title: result.source.title,
      source_url: result.source.url,
      source_type: result.source.source_type,
    })),
    metadata: {
      total_chunks_available: sources.length * 5,
      retrieval_confidence: Math.min(1, reranked.length / 15),
      evidence_quality: evidenceQuality,
    },
  };

  await updateDeepDiveStatus(requestId, "generating_report");

  const synthesisStartedAt = Date.now();
  const prompt = await getPremiumReportPromptV2(
    context,
    companyName,
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined,
    evidenceQuality,
    coverage
  );

  const { data, usage } = await generatePremiumReport(prompt);
  const synthesisDurationMs = Date.now() - synthesisStartedAt;

  const tokenUsage: ReportTokenUsage = {
    calls: [usage],
    total_tokens: usage.input_tokens + usage.output_tokens,
    total_cost_usd: usage.estimated_cost_usd,
  };

  const scores = {
    company_momentum: clampScore(data.scorecard?.company_momentum, 6),
    org_clarity: clampScore(data.scorecard?.org_clarity, 5),
    role_leverage: clampScore(data.scorecard?.role_leverage, 6),
    execution_risk: clampScore(data.scorecard?.execution_risk, 5),
    candidate_fit: clampScore(data.scorecard?.candidate_fit, request.profile_context?.trim() ? 5 : 0),
  };

  const report = await createReport(
    requestId,
    toValidRecommendation(data.report_recommendation),
    scores,
    {
      token_usage: tokenUsage,
      report_format: "premium_v2",
      report_family: "premium",
      generator_version: "premium_v2_default",
      evidence_quality: evidenceQuality,
      source_coverage: coverage,
    },
    {
      ai_query_count: tokenUsage.calls.length,
      source_count: sources.length,
      source_host_count: new Set(
        sources.map((source) => getHostname(source.url)).filter((host): host is string => Boolean(host))
      ).size,
    },
    {
      report_format: "premium_v2",
      report_family: "premium",
    }
  );

  const persistenceStartedAt = Date.now();
  const initialLedger = buildPremiumCostLedger({
    reportId: report.id,
    requestId,
    runId,
    companyName,
    roleTitle: request.role_title,
    tokenUsage,
    primaryUsage: usage,
    sources,
    retrievalQueries: effectiveQueries,
    evidenceQuality,
    coverage,
    hasResumeOverlay: Boolean(request.profile_context?.trim()),
    durations: {
      retrieval_ms: retrievalDurationMs,
      synthesis_ms: synthesisDurationMs,
      persistence_ms: 0,
      total_ms: Date.now() - assemblyStartedAt,
    },
  });

  const citations = context.chunks.map((chunk) => ({
    source_id: chunk.source_id,
    url: chunk.source_url,
    title: chunk.source_title,
  }));

  for (const [index, sectionDefinition] of PREMIUM_SECTION_DEFINITIONS.entries()) {
    const content = sectionDefinition.key === "operations_and_cost"
      ? buildPremiumOperationsSection(tokenUsage, evidenceQuality, coverage, initialLedger)
      : wrapSection(
          sectionDefinition.key,
          data.sections[sectionDefinition.key as Exclude<PremiumSectionKey, "operations_and_cost">],
          sectionDefinition.question,
          sectionDefinition.group,
          sectionDefinition.surface
        );

    await createReportSection(
      report.id,
      sectionDefinition.key,
      sectionDefinition.title,
      JSON.stringify(content),
      index,
      sectionDefinition.key === "operations_and_cost" ? undefined : citations
    );
  }

  const persistenceDurationMs = Date.now() - persistenceStartedAt;
  await updateReportSummaryJson(report.id, {
    token_usage: tokenUsage,
    report_format: "premium_v2",
    report_family: "premium",
    generator_version: "premium_v2_default",
    evidence_quality: evidenceQuality,
    source_coverage: coverage,
    cost_ledger: buildPremiumCostLedger({
      reportId: report.id,
      requestId,
      runId,
      companyName,
      roleTitle: request.role_title,
      tokenUsage,
      primaryUsage: usage,
      sources,
      retrievalQueries: effectiveQueries,
      evidenceQuality,
      coverage,
      hasResumeOverlay: Boolean(request.profile_context?.trim()),
      durations: {
        retrieval_ms: retrievalDurationMs,
        synthesis_ms: synthesisDurationMs,
        persistence_ms: persistenceDurationMs,
        total_ms: Date.now() - assemblyStartedAt,
      },
    }),
  });

  return report;
}
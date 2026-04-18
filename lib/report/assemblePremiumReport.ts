import {
  createReport,
  createReportSection,
  getDeepDiveRequest,
  getRequestSources,
  updateDeepDiveStatus,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import { generatePremiumReport } from "@/lib/ai/openai";
import { getPremiumReportPrompt } from "@/lib/ai/premiumPrompts";
import { multiTopicSearch, rerank } from "@/lib/retrieval/search";
import { Report, ReportTokenUsage, RetrievalContext, RecommendationType } from "@/lib/types";
import {
  PREMIUM_SECTION_DEFINITIONS,
  PremiumGeneratedSection,
  PremiumSectionContent,
  PremiumSectionKey,
} from "@/lib/report/premiumTypes";
import { buildReportCitations } from "@/lib/report/citationMetadata";

interface PremiumEvidenceQuality {
  raw_chunk_count: number;
  final_chunk_count: number;
  distinct_source_count: number;
  distinct_source_types: number;
  rating: "strong" | "moderate" | "weak" | "insufficient";
  warnings: string[];
}

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function assessEvidenceQuality(
  rawResults: import("@/lib/retrieval/search").RetrievalResult[],
  reranked: import("@/lib/retrieval/search").RetrievalResult[]
): PremiumEvidenceQuality {
  const distinctSources = new Set(reranked.map((result) => result.source.id));
  const distinctTypes = new Set(reranked.map((result) => result.source.source_type));

  const warnings: string[] = [];
  if (reranked.length < 6) warnings.push("Very few chunks available; strategic coverage may be thin.");
  if (distinctSources.size <= 1) warnings.push("All evidence comes from a single source; conclusions may be one-sided.");
  if (distinctSources.size <= 2) warnings.push("Source diversity is low; key claims may not be well corroborated.");
  if (!distinctTypes.has("job_description")) warnings.push("No exact job description was captured; role scope is partially inferred.");
  if (!distinctTypes.has("newsroom") && !distinctTypes.has("blog")) warnings.push("Recent official company signals are limited; freshness is weaker than ideal.");

  let rating: PremiumEvidenceQuality["rating"] = "insufficient";
  if (reranked.length >= 12 && distinctSources.size >= 3 && distinctTypes.size >= 2) {
    rating = "strong";
  } else if (reranked.length >= 6 && distinctSources.size >= 2) {
    rating = "moderate";
  } else if (reranked.length >= 3) {
    rating = "weak";
  }

  return {
    raw_chunk_count: rawResults.length,
    final_chunk_count: reranked.length,
    distinct_source_count: distinctSources.size,
    distinct_source_types: distinctTypes.size,
    rating,
    warnings,
  };
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

function wrapSection(
  _key: PremiumSectionKey,
  generated: PremiumGeneratedSection,
  fallbackQuestion: string,
  fallbackGroup: PremiumSectionContent["group"],
  fallbackSurface: PremiumSectionContent["surface"]
): PremiumSectionContent {
  const normalizeCitationStyle = (text: string | undefined): string | undefined => {
    if (!text) {
      return text;
    }

    return text.replace(/\b[Ss]ource\s+(\d+)\b/g, "[$1]");
  };

  return {
    schema: "premium_section_v1",
    group: fallbackGroup,
    surface: fallbackSurface,
    question: fallbackQuestion,
    summary: normalizeCitationStyle(generated.summary) || "INSUFFICIENT_EVIDENCE",
    callouts: generated.callouts?.map((callout) => ({
      ...callout,
      label: normalizeCitationStyle(callout.label) || callout.label,
      value: normalizeCitationStyle(callout.value) || callout.value,
    })),
    facts: generated.facts?.map((fact) => ({
      ...fact,
      label: normalizeCitationStyle(fact.label) || fact.label,
      value: normalizeCitationStyle(fact.value) || fact.value,
    })),
    bullets: generated.bullets?.map((bullet) => normalizeCitationStyle(bullet) || bullet),
    blocks: generated.blocks?.map((block) => ({
      ...block,
      title: normalizeCitationStyle(block.title) || block.title,
      body: normalizeCitationStyle(block.body),
      bullets: block.bullets?.map((bullet) => normalizeCitationStyle(bullet) || bullet),
    })),
    evidence: generated.evidence
      ? {
          threshold: normalizeCitationStyle(generated.evidence.threshold) || "See report generation spec",
          status: generated.evidence.status || "partial",
          confidence: generated.evidence.confidence || "suppressed",
          note: normalizeCitationStyle(generated.evidence.note) || "Confidence is suppressed because the evidence bar was not explicitly met.",
        }
      : undefined,
  };
}

function buildOperationsSection(
  tokenUsage: ReportTokenUsage,
  sources: Awaited<ReturnType<typeof getRequestSources>>,
  evidenceQuality: PremiumEvidenceQuality
): PremiumSectionContent {
  const distinctSourceHosts = new Set(
    sources.map((source) => getHostname(source.url)).filter((host): host is string => Boolean(host))
  );

  return {
    schema: "premium_section_v1",
    group: "Operations",
    surface: "full",
    question: "What did the system do, and what did it cost to generate this report?",
    summary: "This section reports the model workflow and visible compute cost for this premium report. Retrieval and storage economics are not yet fully itemized in the live product, so this remains an honest partial operations view rather than a complete cost ledger.",
    callouts: [
      {
        label: "Visible compute cost",
        value: `$${tokenUsage.total_cost_usd.toFixed(3)}`,
        tone: tokenUsage.total_cost_usd >= 0.05 ? "caution" : "neutral",
      },
      {
        label: "Evidence sources used",
        value: `${sources.length} source(s) across ${distinctSourceHosts.size} host(s)`,
        tone: evidenceQuality.rating === "strong" ? "strong" : evidenceQuality.rating === "insufficient" ? "risk" : "neutral",
      },
      {
        label: "Evidence quality",
        value: evidenceQuality.rating,
        tone: evidenceQuality.rating === "strong" ? "strong" : evidenceQuality.rating === "insufficient" ? "risk" : "caution",
      },
    ],
    facts: [
      { label: "Model calls", value: String(tokenUsage.calls.length) },
      { label: "Total tokens", value: String(tokenUsage.total_tokens) },
      { label: "Primary limitation", value: "Retrieval, rerank, storage, and cache-avoided costs are not fully persisted yet." },
    ],
    blocks: [
      {
        title: "Workflow actually used",
        bullets: tokenUsage.calls.map(
          (call) => `${call.model}: ${call.purpose} (${call.input_tokens + call.output_tokens + (call.reasoning_tokens ?? 0)} tokens)`
        ),
      },
      {
        title: "Cost-accounting gap",
        body: "The live product still undercounts the full premium cost because it only persists model-call token usage. The premium report exposes that gap instead of pretending the visible cost is complete.",
        bullets: [
          "Missing today: retrieval vendor cost",
          "Missing today: embedding and rerank cost",
          "Missing today: storage and cache amortization",
          "Missing today: cached cost avoided and marginal refresh deltas",
        ],
      },
    ],
    evidence: {
      threshold: "Telemetry-derived only",
      status: "partial",
      confidence: "suppressed",
      note: "This section is partially deterministic but not yet backed by the full premium ledger defined in cost_ledger_schema.json.",
    },
  };
}

export async function assemblePremiumReport(
  requestId: string,
  retrievalQueries?: string[]
): Promise<Report | null> {
  const request = await getDeepDiveRequest(requestId);
  if (!request) {
    throw new Error("Request not found");
  }

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

  const evidenceQuality = assessEvidenceQuality(rawResults, reranked);
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

  const prompt = getPremiumReportPrompt(
    context,
    companyName,
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );

  const { data, usage } = await generatePremiumReport(prompt);

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
      report_format: "premium_v1",
      report_family: "premium",
      evidence_quality: evidenceQuality,
    },
    {
      ai_query_count: tokenUsage.calls.length,
      source_count: sources.length,
      source_host_count: new Set(
        sources.map((source) => getHostname(source.url)).filter((host): host is string => Boolean(host))
      ).size,
    },
    {
      report_format: "premium_v1",
      report_family: "premium",
    }
  );

  const citations = buildReportCitations(context.chunks, request.company_url ?? undefined);

  for (const [index, sectionDefinition] of PREMIUM_SECTION_DEFINITIONS.entries()) {
    const content = sectionDefinition.key === "operations_and_cost"
      ? buildOperationsSection(tokenUsage, sources, evidenceQuality)
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

  return report;
}

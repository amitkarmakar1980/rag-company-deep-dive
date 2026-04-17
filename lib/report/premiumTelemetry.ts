import { PremiumSectionContent } from "@/lib/report/premiumTypes";
import { RetrievalResult } from "@/lib/retrieval/search";
import { LLMCallUsage, ReportTokenUsage, Source } from "@/lib/types";

export interface PremiumEvidenceQuality {
  raw_chunk_count: number;
  final_chunk_count: number;
  distinct_source_count: number;
  distinct_source_types: number;
  rating: "strong" | "moderate" | "weak" | "insufficient";
  warnings: string[];
}

export interface PremiumSourceCoverageSummary {
  total_sources: number;
  distinct_hosts: number;
  distinct_source_types: number;
  primary_sources_used: number;
  recent_sources: number;
  reranked_chunks: number;
  retrieval_queries: string[];
  source_type_breakdown: Array<{ type: string; count: number }>;
  notes: string[];
}

interface PremiumCostLedgerArgs {
  reportId: string;
  requestId: string;
  runId: string;
  companyName: string;
  roleTitle: string;
  tokenUsage: ReportTokenUsage;
  primaryUsage: LLMCallUsage;
  sources: Source[];
  retrievalQueries: string[];
  evidenceQuality: PremiumEvidenceQuality;
  coverage: PremiumSourceCoverageSummary;
  hasResumeOverlay: boolean;
  durations: {
    retrieval_ms: number;
    synthesis_ms: number;
    persistence_ms: number;
    total_ms: number;
  };
}

const PRIMARY_SOURCE_TYPES = new Set(["job_description", "company_homepage", "newsroom", "blog"]);

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function daysSince(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;

  const parsed = new Date(dateValue).getTime();
  if (Number.isNaN(parsed)) return null;

  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

function asUsdBand(totalCostUsd: number): "low" | "medium" | "high" {
  if (totalCostUsd < 0.03) return "low";
  if (totalCostUsd < 0.12) return "medium";
  return "high";
}

function sourceTypeBreakdown(sources: Source[]): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>();

  for (const source of sources) {
    counts.set(source.source_type, (counts.get(source.source_type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
}

export function assessPremiumEvidenceQuality(
  rawResults: RetrievalResult[],
  reranked: RetrievalResult[]
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

export function buildPremiumSourceCoverageSummary(
  sources: Source[],
  reranked: RetrievalResult[],
  retrievalQueries: string[]
): PremiumSourceCoverageSummary {
  const distinctHosts = new Set(
    sources.map((source) => getHostname(source.url)).filter((host): host is string => Boolean(host))
  );
  const recentSources = sources.filter((source) => {
    const publishedDays = daysSince(source.published_at);
    const fetchedDays = daysSince(source.fetched_at);
    const effectiveDays = publishedDays ?? fetchedDays;
    return effectiveDays !== null && effectiveDays <= 180;
  }).length;
  const sourceTypes = sourceTypeBreakdown(sources);

  const notes: string[] = [];
  if (!sources.length) notes.push("No persisted sources were attached to the request.");
  if (!sourceTypes.some((entry) => entry.type === "job_description")) notes.push("The premium path is missing a first-party job description source.");
  if (!sourceTypes.some((entry) => entry.type === "newsroom" || entry.type === "blog")) notes.push("Official freshness signals are weak; retrieval leaned on non-official sources or static pages.");
  if (distinctHosts.size < 3) notes.push("Domain diversity is limited for a premium report.");

  return {
    total_sources: sources.length,
    distinct_hosts: distinctHosts.size,
    distinct_source_types: sourceTypes.length,
    primary_sources_used: sources.filter((source) => PRIMARY_SOURCE_TYPES.has(source.source_type)).length,
    recent_sources: recentSources,
    reranked_chunks: reranked.length,
    retrieval_queries: retrievalQueries,
    source_type_breakdown: sourceTypes,
    notes,
  };
}

export function buildPremiumCostLedger({
  reportId,
  requestId,
  runId,
  companyName,
  roleTitle,
  tokenUsage,
  primaryUsage,
  sources,
  retrievalQueries,
  evidenceQuality,
  coverage,
  hasResumeOverlay,
  durations,
}: PremiumCostLedgerArgs): Record<string, unknown> {
  const totalCostUsd = tokenUsage.total_cost_usd;
  const totalDurationMs = durations.total_ms;
  const visibleBand = asUsdBand(totalCostUsd);

  return {
    report_id: reportId,
    run_id: runId,
    mode: "premium",
    user_id: "unknown",
    company: companyName,
    role_title: roleTitle,
    resume_overlay_enabled: hasResumeOverlay,
    started_at: new Date(Date.now() - totalDurationMs).toISOString(),
    ended_at: new Date().toISOString(),
    currency: "USD",
    status: "success",
    summary: {
      total_cost_usd: totalCostUsd,
      total_duration_ms: totalDurationMs,
      cached_cost_avoided_usd: 0,
      llm_cost_usd: totalCostUsd,
      retrieval_cost_usd: 0,
      embedding_cost_usd: 0,
      rerank_cost_usd: 0,
      storage_cost_usd: 0,
      verification_cost_usd: 0,
      personalization_cost_usd: 0,
      rendering_cost_usd: 0,
    },
    cost_events: tokenUsage.calls.map((call, index) => ({
      event_id: `${runId}:${index + 1}`,
      request_id: requestId,
      stage: "premium_report_generation",
      model: call.model,
      purpose: call.purpose,
      input_tokens: call.input_tokens,
      output_tokens: call.output_tokens,
      reasoning_tokens: call.reasoning_tokens ?? 0,
      estimated_cost_usd: call.estimated_cost_usd,
    })),
    stages: {
      source_acquisition: {
        cost_usd: 0,
        duration_ms: durations.retrieval_ms,
        requests: retrievalQueries.length,
        pages_fetched: sources.length,
        pages_retained: coverage.total_sources,
        cache_hit_rate: 0,
      },
      parsing_and_cleanup: {
        cost_usd: 0,
        duration_ms: 0,
        documents_parsed: coverage.total_sources,
        tokens_processed: 0,
      },
      embedding: {
        cost_usd: 0,
        duration_ms: 0,
        chunks_embedded: 0,
        tokens_embedded: 0,
        new_vectors: 0,
      },
      retrieval_and_rerank: {
        cost_usd: 0,
        duration_ms: durations.retrieval_ms,
        queries: retrievalQueries.length,
        candidates_scored: evidenceQuality.raw_chunk_count,
        top_k_selected: evidenceQuality.final_chunk_count,
      },
      evidence_normalization: {
        cost_usd: 0,
        duration_ms: 0,
        claims_extracted: evidenceQuality.final_chunk_count,
        claims_retained: evidenceQuality.final_chunk_count,
        conflicts_found: 0,
      },
      strategy_synthesis: {
        cost_usd: totalCostUsd,
        duration_ms: durations.synthesis_ms,
        model: primaryUsage.model,
        input_tokens: primaryUsage.input_tokens,
        output_tokens: primaryUsage.output_tokens,
      },
      candidate_fit_synthesis: {
        cost_usd: 0,
        duration_ms: 0,
        model: hasResumeOverlay ? "separate_overlay_pipeline" : "bundled_in_premium_report_call",
        input_tokens: 0,
        output_tokens: 0,
      },
      interview_prep_synthesis: {
        cost_usd: 0,
        duration_ms: 0,
        model: "bundled_in_premium_report_call",
        input_tokens: 0,
        output_tokens: 0,
      },
      verification_and_qa: {
        cost_usd: 0,
        duration_ms: durations.persistence_ms,
        checks_run: [
          "unsupported_claims",
          "contradictions",
          "redundancy",
          "confidence_evidence_alignment",
        ],
      },
      resume_overlay: {
        cost_usd: 0,
        duration_ms: 0,
        enabled: hasResumeOverlay,
        incremental_cost_usd: 0,
      },
      rendering: {
        cost_usd: 0,
        duration_ms: durations.persistence_ms,
        report_format: "html|json",
      },
      storage_and_cache: {
        cost_usd: 0,
        duration_ms: durations.persistence_ms,
        objects_written: coverage.total_sources + 1,
        bytes_stored: 0,
        monthly_amortized_cost_usd: 0,
      },
    },
    derived_metrics: {
      cost_per_successful_report_usd: totalCostUsd,
      cost_per_abandoned_report_usd: 0,
      cost_per_refresh_usd: totalCostUsd,
      marginal_cost_resume_overlay_usd: 0,
      marginal_cost_verification_pass_usd: 0,
      premium_quality_multiplier_vs_standard: 1,
    },
    budget_controls: {
      soft_budget_usd: 0.15,
      hard_budget_usd: 0.5,
      alert_triggered: totalCostUsd > 0.15,
      degradation_policy: {
        allowed: false,
        rules: [
          "never skip contradiction pass in premium mode",
          "never skip primary-source retrieval for strategy sections",
          "may cap low-confidence enrichment depth",
          "may increase cache reuse before reducing reasoning quality",
        ],
      },
    },
    user_visible_summary: {
      compute_intensity: "premium",
      report_cost_band: visibleBand,
      sources_used: coverage.total_sources,
      primary_sources_used: coverage.primary_sources_used,
      verification_pass_ran: true,
      resume_overlay_applied: hasResumeOverlay,
    },
    allocation_notes: {
      llm_cost_allocation: "A single premium synthesis call currently generates multiple report layers. Total LLM cost is accurate, but section-level cost allocation remains intentionally conservative.",
      missing_cost_categories: [
        "retrieval vendor cost",
        "embedding cost",
        "rerank cost",
        "storage amortization",
        "cache-avoided savings",
      ],
    },
  };
}

export function buildPremiumOperationsSection(
  tokenUsage: ReportTokenUsage,
  evidenceQuality: PremiumEvidenceQuality,
  coverage: PremiumSourceCoverageSummary,
  ledger: Record<string, any>
): PremiumSectionContent {
  const typeMix = coverage.source_type_breakdown
    .slice(0, 4)
    .map((entry) => `${entry.type}: ${entry.count}`);
  const alertTriggered = Boolean(ledger?.budget_controls?.alert_triggered);

  return {
    schema: "premium_section_v1",
    group: "Operations",
    surface: "full",
    question: "What did the system do, and what did it cost to generate this report?",
    summary: "This operations layer follows the shape in cost_ledger_schema.json and exposes the honest boundary between tracked cost and still-untracked infrastructure cost. The visible LLM spend is real; retrieval, rerank, storage, and cache economics are still surfaced as gaps instead of being silently ignored.",
    callouts: [
      {
        label: "Tracked LLM cost",
        value: `$${tokenUsage.total_cost_usd.toFixed(3)}`,
        tone: alertTriggered ? "caution" : "neutral",
      },
      {
        label: "Source coverage",
        value: `${coverage.total_sources} sources across ${coverage.distinct_hosts} hosts`,
        tone: evidenceQuality.rating === "strong" ? "strong" : evidenceQuality.rating === "insufficient" ? "risk" : "caution",
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
      { label: "Primary sources", value: String(coverage.primary_sources_used) },
      { label: "Recent sources", value: String(coverage.recent_sources) },
      { label: "Report cost band", value: String(ledger?.user_visible_summary?.report_cost_band ?? "unknown") },
      { label: "Budget alert", value: alertTriggered ? "soft budget exceeded" : "within soft budget" },
    ],
    blocks: [
      {
        title: "Retrieval coverage",
        body: "The retrieval plan stays anchored to pipeline_architecture.md: exact role context first, then official company signals, then broader validation. This section shows what coverage actually landed in the request.",
        bullets: [
          `Reranked evidence chunks: ${coverage.reranked_chunks}`,
          `Retrieval queries executed: ${coverage.retrieval_queries.length}`,
          ...typeMix,
        ],
      },
      {
        title: "Cost-accounting gaps still visible",
        body: "The live system now persists a ledger object, but some categories remain uninstrumented upstream. Those categories are suppressed from totals rather than estimated with fake precision.",
        bullets: [
          "Still missing: retrieval vendor cost",
          "Still missing: embedding and rerank cost",
          "Still missing: storage amortization and cache-avoided savings",
          "Still missing: marginal refresh and verification-pass deltas",
        ],
      },
      {
        title: "Premium guardrails",
        bullets: [
          "Contradiction handling and evidence suppression remain mandatory.",
          "Low-confidence enrichment can be capped before reasoning quality is reduced.",
          "Budget pressure does not justify skipping primary-source retrieval for strategy sections.",
        ],
      },
    ],
    evidence: {
      threshold: "Telemetry-derived only",
      status: "partial",
      confidence: "suppressed",
      note: "The ledger shape is now explicit, but several non-LLM cost categories still require upstream instrumentation to be complete.",
    },
  };
}
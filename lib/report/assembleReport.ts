import {
  getDeepDiveRequest,
  getRequestSources,
  getReport,
  createReport,
  updateReport,
  updateReportSummaryJson,
  clearReportSections,
  createReportSection,
  updateDeepDiveStatus,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import {
  generateDeepAnalysis,
  generateInterviewLayer,
  DeepAnalysisResult,
  InterviewLayerResult,
} from "@/lib/ai/openai";
import { getDeepAnalysisPrompt, getInterviewLayerPrompt } from "@/lib/ai/prompts";
import { multiTopicSearch, rerank } from "@/lib/retrieval/search";
import {
  RetrievalContext,
  Report,
  StructuredReport,
  RecommendationType,
  ReportTokenUsage,
  LLMCallUsage,
} from "@/lib/types";

// ─── Evidence quality assessment ─────────────────────────────────────────────

export interface EvidenceQuality {
  /** Total chunks retrieved before reranking */
  raw_chunk_count: number;
  /** Chunks that survived reranking */
  final_chunk_count: number;
  /** Number of distinct sources in the final context */
  distinct_source_count: number;
  /** Number of distinct source types (job_description, newsroom, blog, etc.) */
  distinct_source_types: number;
  /** Human-readable rating */
  rating: "strong" | "moderate" | "weak" | "insufficient";
  /** Specific gaps for the prompt */
  warnings: string[];
}

function assessEvidenceQuality(
  rawResults: import("@/lib/retrieval/search").RetrievalResult[],
  reranked: import("@/lib/retrieval/search").RetrievalResult[]
): EvidenceQuality {
  const distinctSources = new Set(reranked.map((r) => r.source.id));
  const distinctTypes = new Set(reranked.map((r) => r.source.source_type));

  const warnings: string[] = [];
  if (reranked.length < 6) warnings.push("Very few chunks available — analysis may be shallow");
  if (distinctSources.size <= 1) warnings.push("All evidence from a single source — high risk of one-sided view");
  if (distinctSources.size <= 2) warnings.push("Low source diversity — conclusions may be poorly corroborated");
  if (!distinctTypes.has("job_description")) warnings.push("No job description provided — role scope is inferred only");
  if (!distinctTypes.has("newsroom") && !distinctTypes.has("blog")) warnings.push("No recent company news or blog evidence — momentum signals may be stale or missing");

  let rating: EvidenceQuality["rating"];
  if (reranked.length >= 12 && distinctSources.size >= 3 && distinctTypes.size >= 2) {
    rating = "strong";
  } else if (reranked.length >= 6 && distinctSources.size >= 2) {
    rating = "moderate";
  } else if (reranked.length >= 3) {
    rating = "weak";
  } else {
    rating = "insufficient";
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

const SECTION_TITLES: Record<keyof StructuredReport, string> = {
  company_overview: "Company Overview",
  mission_vision_leadership: "Mission, Vision & Leadership",
  interview_decision_summary: "Interview Decision Summary",
  five_minute_brief: "5-Minute Interview Brief",
  executive_summary: "Executive Summary",
  assessment_snapshot: "Assessment Snapshot",
  strategic_bet_analysis: "Strategic Importance of This Role",
  likely_interview_agenda: "Likely Interview Agenda",
  questions_to_ask: "Questions to Ask",
  risks_red_flags: "Risks & Red Flags",
  unknowns_to_validate: "Unknowns to Validate Live",
  company_snapshot: "Company Snapshot",
  company_swot: "Company SWOT",
  role_snapshot: "Role Snapshot",
  role_swot: "Role SWOT",
  why_role_exists_now: "Why This Role Exists Now",
  evidence_contract: "Evidence Contract",
};

const SECTION_ORDER: (keyof StructuredReport)[] = [
  "company_overview",
  "mission_vision_leadership",
  "interview_decision_summary",
  "five_minute_brief",
  "executive_summary",
  "assessment_snapshot",
  "strategic_bet_analysis",
  "likely_interview_agenda",
  "questions_to_ask",
  "risks_red_flags",
  "unknowns_to_validate",
  "company_snapshot",
  "company_swot",
  "role_snapshot",
  "role_swot",
  "why_role_exists_now",
  "evidence_contract",
];

const DEFAULT_SCORES = {
  company_momentum: 5,
  org_clarity: 5,
  role_leverage: 5,
  execution_risk: 5,
  candidate_fit: 5,
};

/**
 * Assembles the full report for a requestId.
 *
 * Checkpointing: runs deep analysis (o3) first, saves result to reports.summary_json,
 * then runs interview layer (gpt-4o-mini), saves result, then finalizes.
 * On retry, completed stages are skipped using the saved checkpoint.
 */
export async function assembleReport(requestId: string): Promise<Report | null> {
  // 1. Load request
  const request = await getDeepDiveRequest(requestId);
  if (!request) throw new Error("Request not found");

  // 2. Check for existing partial report (from a prior failed attempt)
  let existingReport = await getReport(requestId);
  const checkpoint = existingReport?.summary_json?.checkpoint ?? {};

  let deepData: DeepAnalysisResult | null = checkpoint.deep_analysis ?? null;
  let deepUsage: LLMCallUsage | null = checkpoint.deep_usage ?? null;
  let interviewData: InterviewLayerResult | null = checkpoint.interview_layer ?? null;
  let interviewUsage: LLMCallUsage | null = checkpoint.interview_usage ?? null;

  if (deepData) {
    console.log(`[assembleReport] Resuming from checkpoint — deep analysis already done`);
  }
  if (interviewData) {
    console.log(`[assembleReport] Resuming from checkpoint — interview layer already done`);
  }

  // 3. Build retrieval context (always needed for prompts)
  const sources = await getRequestSources(requestId);
  if (sources.length === 0) {
    console.warn(`[assembleReport] No sources found for request ${requestId}`);
  }

  // Multi-topic retrieval: 6 focused queries × 8 chunks each → deduped pool
  const rawResults = await multiTopicSearch(requestId, 8, 0.35);

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

  // Assess evidence quality before synthesis
  const evidenceQuality = assessEvidenceQuality(rawResults, reranked);
  console.log(`[assembleReport] Evidence quality: ${JSON.stringify(evidenceQuality)}`);

  const context: RetrievalContext = {
    chunks: reranked.map((r) => ({
      text: r.chunk.text,
      source_id: r.source.id,
      source_title: r.source.title,
      source_url: r.source.url,
      source_type: r.source.source_type,
    })),
    metadata: {
      total_chunks_available: sources.length * 5,
      retrieval_confidence: Math.min(1, reranked.length / 15),
      evidence_quality: evidenceQuality,
    },
  };

  // 4. Stage 1: Deep analysis (o3) — skip if checkpoint exists
  if (!deepData) {
    await updateDeepDiveStatus(requestId, "generating_deep_analysis");
    console.log(`[assembleReport] Running o3 deep analysis…`);

    const deepPrompt = getDeepAnalysisPrompt(
      context,
      companyName,
      request.role_title,
      request.job_description ?? undefined,
      request.profile_context ?? undefined
    );

    const result = await generateDeepAnalysis(deepPrompt);
    deepData = result.data;
    deepUsage = result.usage;

    console.log(
      `[assembleReport] Deep analysis done — ${deepUsage.input_tokens}in/${deepUsage.output_tokens}out` +
      (deepUsage.reasoning_tokens ? ` (${deepUsage.reasoning_tokens} reasoning)` : "")
    );

    // Save checkpoint to DB so a retry can skip this stage
    if (!existingReport) {
      existingReport = await createReport(requestId, "need_more_signal", DEFAULT_SCORES, {
        checkpoint: { deep_analysis: deepData, deep_usage: deepUsage },
      });
    } else {
      await updateReportSummaryJson(existingReport.id, {
        checkpoint: { deep_analysis: deepData, deep_usage: deepUsage },
      });
    }
  }

  // 5. Stage 2: Interview layer (gpt-4o-mini) — skip if checkpoint exists
  if (!interviewData) {
    await updateDeepDiveStatus(requestId, "generating_interview_layer");
    console.log(`[assembleReport] Running gpt-4o-mini interview layer…`);

    const interviewPrompt = getInterviewLayerPrompt(
      context,
      companyName,
      request.role_title,
      request.job_description ?? undefined,
      request.profile_context ?? undefined
    );

    const result = await generateInterviewLayer(interviewPrompt);
    interviewData = result.data;
    interviewUsage = result.usage;

    console.log(
      `[assembleReport] Interview layer done — ${interviewUsage.input_tokens}in/${interviewUsage.output_tokens}out`
    );

    // Update checkpoint with both results
    await updateReportSummaryJson(existingReport!.id, {
      checkpoint: {
        deep_analysis: deepData,
        deep_usage: deepUsage,
        interview_layer: interviewData,
        interview_usage: interviewUsage,
      },
    });
  }

  // 6. Merge results
  const structured: StructuredReport = {
    ...deepData!,
    ...interviewData!,
  };

  // 7. Build token usage
  const tokenUsage: ReportTokenUsage = {
    calls: [deepUsage!, interviewUsage!],
    total_tokens:
      deepUsage!.input_tokens +
      deepUsage!.output_tokens +
      interviewUsage!.input_tokens +
      interviewUsage!.output_tokens,
    total_cost_usd:
      deepUsage!.estimated_cost_usd + interviewUsage!.estimated_cost_usd,
  };

  // 8. Finalize report record (update with real scores + clear checkpoint)
  const snap = structured.assessment_snapshot;
  const scores = {
    company_momentum: snap.company_momentum.score ?? 5,
    org_clarity: snap.org_clarity.score ?? 5,
    role_leverage: snap.role_leverage.score ?? 5,
    execution_risk: snap.execution_risk.score ?? 5,
    candidate_fit: snap.candidate_role_match.score ?? 0, // 0 = not assessed
  };
  const recommendation = validateRecommendation(
    structured.executive_summary.recommendation
  );

  let finalReport: Report;
  if (existingReport) {
    // Clear checkpoint (no longer needed) and store final token usage
    finalReport = await updateReport(existingReport.id, recommendation, scores, {
      token_usage: tokenUsage,
    });
    // Clear any stale sections from a prior partial run
    await clearReportSections(finalReport.id);
  } else {
    finalReport = await createReport(requestId, recommendation, scores, {
      token_usage: tokenUsage,
    });
  }

  // 9. Store sections
  const citationsForSection = context.chunks.map((c) => ({
    source_id: c.source_id,
    url: c.source_url,
    title: c.source_title,
  }));

  const CITATION_SECTIONS = new Set([
    "company_snapshot",
    "company_swot",
    "role_snapshot",
    "role_swot",
    "why_role_exists_now",
    "strategic_bet_analysis",
  ]);

  await Promise.all(
    SECTION_ORDER.map(async (sectionKey) => {
      const sectionData = structured[sectionKey];
      if (!sectionData) return;
      try {
        await createReportSection(
          finalReport.id,
          sectionKey,
          SECTION_TITLES[sectionKey],
          JSON.stringify(sectionData),
          CITATION_SECTIONS.has(sectionKey) ? citationsForSection : undefined
        );
      } catch (err) {
        console.error(`Failed to store section ${sectionKey}:`, err);
      }
    })
  );

  console.log(`[assembleReport] Complete — report ${finalReport.id}`);
  return finalReport;
}

function validateRecommendation(raw: string): RecommendationType {
  const valid: RecommendationType[] = [
    "pursue",
    "pursue_cautiously",
    "avoid",
    "need_more_signal",
  ];
  return valid.includes(raw as RecommendationType)
    ? (raw as RecommendationType)
    : "need_more_signal";
}

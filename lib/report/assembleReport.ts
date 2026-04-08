import {
  getDeepDiveRequest,
  getRequestSources,
  createReport,
  createReportSection,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { generateDeepAnalysis, generateInterviewLayer } from "@/lib/ai/openai";
import { getDeepAnalysisPrompt, getInterviewLayerPrompt } from "@/lib/ai/prompts";
import { semanticSearch, rerank } from "@/lib/retrieval/search";
import {
  RetrievalContext,
  Report,
  StructuredReport,
  RecommendationType,
  ReportTokenUsage,
} from "@/lib/types";

// Broad retrieval query — used by both parallel calls
const BROAD_RETRIEVAL_QUERY =
  "company strategy priorities product platform leadership org structure " +
  "role responsibilities hiring team metrics success risks opportunities " +
  "competitive market growth momentum executive vision";

const SECTION_TITLES: Record<keyof StructuredReport, string> = {
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
};

const SECTION_ORDER: (keyof StructuredReport)[] = [
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
];

export async function assembleReport(requestId: string): Promise<Report | null> {
  // 1. Load request and sources
  const request = await getDeepDiveRequest(requestId);
  if (!request) throw new Error("Request not found");

  const sources = await getRequestSources(requestId);
  if (sources.length === 0) {
    console.warn(`[assembleReport] No sources found for request ${requestId} — generating with empty context`);
  }

  // 2. Semantic retrieval — shared across both parallel calls
  const queryEmbedding = await generateEmbedding(BROAD_RETRIEVAL_QUERY);
  const rawResults = await semanticSearch(requestId, queryEmbedding, 25, 0.4);

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
    },
  };

  // 3. Build both prompts from the same context
  const deepPrompt = getDeepAnalysisPrompt(
    context,
    companyName,
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );

  const interviewPrompt = getInterviewLayerPrompt(
    context,
    companyName,
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );

  // 4. Fire both LLM calls in parallel
  console.log(`[assembleReport] Firing parallel LLM calls: o3 (deep) + gpt-4o-mini (interview layer)`);

  let deepResult: Awaited<ReturnType<typeof generateDeepAnalysis>>;
  let interviewResult: Awaited<ReturnType<typeof generateInterviewLayer>>;

  try {
    [deepResult, interviewResult] = await Promise.all([
      generateDeepAnalysis(deepPrompt),
      generateInterviewLayer(interviewPrompt),
    ]);
  } catch (err) {
    console.error("[assembleReport] Parallel LLM calls failed:", err);
    throw err;
  }

  console.log(
    `[assembleReport] Done — deep: ${deepResult.usage.input_tokens}in/${deepResult.usage.output_tokens}out ` +
    `(${deepResult.usage.reasoning_tokens ?? 0} reasoning) | ` +
    `interview: ${interviewResult.usage.input_tokens}in/${interviewResult.usage.output_tokens}out`
  );

  // 5. Merge into a single StructuredReport
  const structured: StructuredReport = {
    ...deepResult.data,
    ...interviewResult.data,
  };

  // 6. Build token usage summary
  const tokenUsage: ReportTokenUsage = {
    calls: [deepResult.usage, interviewResult.usage],
    total_tokens:
      deepResult.usage.input_tokens +
      deepResult.usage.output_tokens +
      interviewResult.usage.input_tokens +
      interviewResult.usage.output_tokens,
    total_cost_usd:
      deepResult.usage.estimated_cost_usd + interviewResult.usage.estimated_cost_usd,
  };

  // 7. Derive scores from the interview layer's assessment_snapshot
  const snap = structured.assessment_snapshot;
  const scores = {
    company_momentum: snap.company_momentum.score,
    org_clarity: snap.org_clarity.score,
    role_leverage: snap.role_leverage.score,
    execution_risk: snap.execution_risk.score,
    candidate_fit: snap.candidate_fit.score,
  };

  const recommendation = validateRecommendation(
    structured.executive_summary.recommendation
  );

  // 8. Create the report record — store token usage in summary_json
  const report = await createReport(requestId, recommendation, scores, {
    token_usage: tokenUsage,
  });

  // 9. Store each section
  const citationsForSection = context.chunks.map((c) => ({
    source_id: c.source_id,
    url: c.source_url,
    title: c.source_title,
  }));

  for (const sectionKey of SECTION_ORDER) {
    const sectionData = structured[sectionKey];
    if (!sectionData) continue;

    try {
      await createReportSection(
        report.id,
        sectionKey,
        SECTION_TITLES[sectionKey],
        JSON.stringify(sectionData),
        ["company_snapshot", "company_swot", "role_snapshot", "role_swot", "why_role_exists_now", "strategic_bet_analysis"].includes(sectionKey)
          ? citationsForSection
          : undefined
      );
    } catch (err) {
      console.error(`Failed to store section ${sectionKey}:`, err);
    }
  }

  return report;
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

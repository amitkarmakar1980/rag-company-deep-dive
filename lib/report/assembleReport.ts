import {
  getDeepDiveRequest,
  getRequestSources,
  createReport,
  createReportSection,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { generateFullReport } from "@/lib/ai/openai";
import { getFullReportPrompt } from "@/lib/ai/prompts";
import { semanticSearch, rerank } from "@/lib/retrieval/search";
import { RetrievalContext, Report, StructuredReport, RecommendationType } from "@/lib/types";

// Broad query that retrieves context relevant to all sections in one pass
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
  // Warn but continue — LLM will still generate based on JD/profile text if present
  if (sources.length === 0) {
    console.warn(`[assembleReport] No sources found for request ${requestId} — generating with empty context`);
  }

  // 2. Broad semantic retrieval — top 25 chunks across all topics
  const queryEmbedding = await generateEmbedding(BROAD_RETRIEVAL_QUERY);
  const rawResults = await semanticSearch(requestId, queryEmbedding, 25, 0.4);

  // Fetch company name (getDeepDiveRequest doesn't join companies)
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

  // 3. Single LLM call — generate full structured report
  const prompt = getFullReportPrompt(
    context,
    companyName,
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );

  let structured: StructuredReport;
  try {
    structured = await generateFullReport(prompt);
  } catch (err) {
    console.error("Full report generation failed:", err);
    throw err;
  }

  // 4. Derive scores for the reports table from the LLM's own assessment
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

  // 5. Create the report record
  const report = await createReport(requestId, recommendation, scores);

  // 6. Store each section as JSON in content_markdown
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
        // Store the structured data as JSON string in the content_markdown column
        JSON.stringify(sectionData),
        // Only attach citations to evidence-heavy sections
        ["company_snapshot", "company_swot", "role_snapshot", "role_swot", "why_role_exists_now", "strategic_bet_analysis"].includes(
          sectionKey
        )
          ? citationsForSection
          : undefined
      );
    } catch (err) {
      console.error(`Failed to store section ${sectionKey}:`, err);
      // Continue — don't fail the whole report for one section
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

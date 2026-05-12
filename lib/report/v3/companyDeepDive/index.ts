import { generateEmbeddings } from "@/lib/ai/embeddings";
import { semanticSearch, rerank, deduplicateChunks } from "@/lib/retrieval/search";
import type { LLMCallUsage } from "@/lib/types";
import { buildCompanyRetrievalQueries } from "./retrievalQueries";
import { buildCompanyDeepDivePrompt, buildCompanyDeepDiveEvaluationPrompt } from "./prompt";
import { generateCompanyDeepDive, evaluateCompanyDeepDive } from "./generate";
import { renderCompanyDeepDiveMarkdown } from "./renderMarkdown";
import type { CompanyDeepDiveV3, CompanyDeepDiveEvaluation } from "./schema";

const MAX_CHUNKS = 24;
const PER_QUERY_LIMIT = 6;
const SIMILARITY_THRESHOLD = 0.3;

export interface CompanyDeepDiveResult {
  moduleJson: CompanyDeepDiveV3;
  markdownContent: string;
  evaluation: CompanyDeepDiveEvaluation;
  usages: LLMCallUsage[];
}

export async function runCompanyDeepDiveV3(options: {
  requestId: string;
  companyName: string;
  companyUrl?: string;
  roleTitle?: string;
  jobDescription?: string;
  sourceCoverageSummary?: string;
}): Promise<CompanyDeepDiveResult> {
  const {
    requestId,
    companyName,
    companyUrl,
    roleTitle,
    jobDescription,
    sourceCoverageSummary,
  } = options;

  // ── 1. Section-specific retrieval ──────────────────────────────────────────
  const queries = buildCompanyRetrievalQueries(companyName);
  const embeddings = await generateEmbeddings(queries);

  const topicResults = await Promise.all(
    embeddings.map((embedding) =>
      semanticSearch(requestId, embedding, PER_QUERY_LIMIT, SIMILARITY_THRESHOLD)
    )
  );

  const merged = topicResults.flat().sort((a, b) => b.similarity - a.similarity);
  const unique = deduplicateChunks(merged);
  const reranked = rerank(unique, { role_title: roleTitle ?? "", company_name: companyName });
  const chunks = reranked.slice(0, MAX_CHUNKS);

  console.log(
    `[companyDeepDiveV3] ${merged.length} raw → ${unique.length} deduped → ${chunks.length} used`
  );

  // ── 2. Synthesis ───────────────────────────────────────────────────────────
  const synthesisPrompt = buildCompanyDeepDivePrompt({
    companyName,
    companyUrl,
    roleTitle,
    jobDescription,
    chunks,
    sourceCoverageSummary,
  });

  console.log(`[companyDeepDiveV3] Starting synthesis for ${companyName}`);
  const { data: moduleJson, usage: synthesisUsage } = await generateCompanyDeepDive(synthesisPrompt);
  console.log(`[companyDeepDiveV3] Synthesis complete, tokens=${synthesisUsage.input_tokens}/${synthesisUsage.output_tokens}`);

  // Ensure generated_at is set
  if (!moduleJson.generated_at) {
    moduleJson.generated_at = new Date().toISOString();
  }

  // ── 3. Quality gate evaluation ─────────────────────────────────────────────
  console.log(`[companyDeepDiveV3] Starting evaluation`);
  const evalPrompt = buildCompanyDeepDiveEvaluationPrompt(
    companyName,
    JSON.stringify(moduleJson)
  );

  const { data: evaluation, usage: evalUsage } = await evaluateCompanyDeepDive(evalPrompt);
  console.log(`[companyDeepDiveV3] Evaluation complete: ${evaluation.overall_verdict}`);

  // ── 4. Markdown rendering ──────────────────────────────────────────────────
  console.log(`[companyDeepDiveV3] Rendering markdown`);
  const markdownContent = renderCompanyDeepDiveMarkdown(moduleJson);
  console.log(`[companyDeepDiveV3] Markdown rendered, length=${markdownContent.length}`);

  return {
    moduleJson,
    markdownContent,
    evaluation,
    usages: [synthesisUsage, evalUsage],
  };
}

export type { CompanyDeepDiveV3, CompanyDeepDiveEvaluation };

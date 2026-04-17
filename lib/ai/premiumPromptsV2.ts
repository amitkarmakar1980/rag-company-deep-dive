import { readFile } from "fs/promises";
import path from "path";
import { RetrievalContext } from "@/lib/types";
import { formatUntrustedTextBlock } from "@/lib/ai/untrustedInput";
import { PremiumEvidenceQuality, PremiumSourceCoverageSummary } from "@/lib/report/premiumTelemetry";

const artifactCache = new Map<string, Promise<string>>();

async function loadArtifact(relativePathParts: string[]): Promise<string> {
  const cacheKey = relativePathParts.join("/");

  if (!artifactCache.has(cacheKey)) {
    const artifactPath = path.join(process.cwd(), ...relativePathParts);
    artifactCache.set(cacheKey, readFile(artifactPath, "utf8").catch(() => ""));
  }

  return artifactCache.get(cacheKey)!;
}

function formatArtifactSection(title: string, content: string, fallbackMessage: string): string {
  return content.trim()
    ? `\n${title}\n${content.trim()}\n`
    : `\n${title}\n${fallbackMessage}\n`;
}

function formatChunks(context: RetrievalContext): string {
  return context.chunks
    .map(
      (chunk, index) =>
        `[SOURCE ${index + 1} - UNTRUSTED EVIDENCE] ${chunk.source_title} (${chunk.source_type})\n${chunk.text}`
    )
    .join("\n\n---\n\n");
}

function formatCoverageSummary(coverage: PremiumSourceCoverageSummary): string {
  const breakdown = coverage.source_type_breakdown
    .map((entry) => `- ${entry.type}: ${entry.count}`)
    .join("\n");
  const queries = coverage.retrieval_queries.map((query, index) => `${index + 1}. ${query}`).join("\n");

  return `SOURCE COVERAGE\n- total sources: ${coverage.total_sources}\n- distinct hosts: ${coverage.distinct_hosts}\n- source types: ${coverage.distinct_source_types}\n- primary sources used: ${coverage.primary_sources_used}\n- recent sources: ${coverage.recent_sources}\n- reranked evidence chunks: ${coverage.reranked_chunks}\nSOURCE TYPE BREAKDOWN\n${breakdown || "- none"}\nRETRIEVAL QUERIES\n${queries || "none"}\nCOVERAGE WARNINGS\n${coverage.notes.map((note) => `- ${note}`).join("\n") || "- none"}`;
}

function formatEvidenceSummary(evidenceQuality: PremiumEvidenceQuality): string {
  return `EVIDENCE QUALITY: ${evidenceQuality.rating.toUpperCase()}\n- raw chunks: ${evidenceQuality.raw_chunk_count}\n- reranked chunks: ${evidenceQuality.final_chunk_count}\n- distinct sources: ${evidenceQuality.distinct_source_count}\n- distinct source types: ${evidenceQuality.distinct_source_types}\nEVIDENCE WARNINGS\n${evidenceQuality.warnings.map((warning) => `- ${warning}`).join("\n") || "- none"}`;
}

export async function getPremiumReportPromptV2(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  profileContext: string | undefined,
  evidenceQuality: PremiumEvidenceQuality,
  coverage: PremiumSourceCoverageSummary
): Promise<string> {
  const jdSection = formatUntrustedTextBlock("JOB DESCRIPTION", jobDescription);
  const profileSection = formatUntrustedTextBlock("CANDIDATE PROFILE / CONTEXT", profileContext);
  const [specArtifact, architectureArtifact, costSchemaArtifact, masterPromptArtifact] = await Promise.all([
    loadArtifact(["lib", "ai", "report_generation_spec.md"]),
    loadArtifact(["lib", "ai", "pipeline_architecture.md"]),
    loadArtifact(["lib", "ai", "cost_ledger_schema.json"]),
    loadArtifact(["lib", "ai", "premium_vscode_copilot_prompt.md"]),
  ]);
  const artifactBundle = [
    formatArtifactSection(
      "REPORT GENERATION SPEC ARTIFACT (loaded from report_generation_spec.md)",
      specArtifact,
      "UNAVAILABLE AT RUNTIME - continue using the embedded premium constraints below."
    ),
    formatArtifactSection(
      "PIPELINE ARCHITECTURE ARTIFACT (loaded from pipeline_architecture.md)",
      architectureArtifact,
      "UNAVAILABLE AT RUNTIME - continue using the embedded premium constraints below."
    ),
    formatArtifactSection(
      "COST LEDGER SCHEMA ARTIFACT (loaded from cost_ledger_schema.json)",
      costSchemaArtifact,
      "UNAVAILABLE AT RUNTIME - continue using the embedded premium constraints below."
    ),
    formatArtifactSection(
      "MASTER PROMPT ARTIFACT (loaded from premium_vscode_copilot_prompt.md)",
      masterPromptArtifact,
      "UNAVAILABLE AT RUNTIME - continue using the embedded premium constraints below."
    ),
  ].join("\n");

  return `You are generating the default premium interview report.

Your governing constraints are the following artifacts, and you must follow them explicitly:
- report_generation_spec.md
- pipeline_architecture.md
- cost_ledger_schema.json
- premium_vscode_copilot_prompt.md

This is PREMIUM mode. Optimize for trust, evidence quality, specificity, candidate outcomes, premium insight density, and honest operational visibility.

Non-negotiable rules:
- Do not fabricate metrics, org structures, reporting lines, stakeholder maps, timelines, or year-1 goals.
- Do not generate why-this-role-exists-now, strategic importance, role leverage, KPI logic, or year-1 expectations from generic news search alone.
- Use "INSUFFICIENT_EVIDENCE" when the evidence bar is not met.
- Hide weak specificity rather than inventing certainty.
- Separate verified fact, cited synthesis, informed inference, and unknowns.
- Each section must add net-new value and must not repeat prior sections.
- Candidate-fit content must stay generic if no candidate profile is provided.
- Company strategy and role strategy are core differentiators of the premium product.
- Interview prep must be interviewer-specific, theme-specific, and proof-oriented.
- Generic PM coaching is a failure.
- Generic competitor bullets are a failure.
- Restating the JD as role strategy is a failure.

Company: ${companyName}
Role: ${roleTitle}
${jdSection}
${profileSection}

${formatEvidenceSummary(evidenceQuality)}

${formatCoverageSummary(coverage)}
${artifactBundle}

Available evidence (${context.chunks.length} chunks):
${formatChunks(context)}

Return exactly one valid JSON object with this schema and no extra text:
{
  "report_recommendation": "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal",
  "scorecard": {
    "company_momentum": number,
    "org_clarity": number,
    "role_leverage": number,
    "execution_risk": number,
    "candidate_fit": number
  },
  "sections": {
    "decision_memo": {
      "summary": string,
      "callouts": [{ "label": string, "value": string, "tone": "neutral" | "strong" | "caution" | "risk" | "unknown" }],
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "five_minute_brief": {
      "summary": string,
      "bullets": [string],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "why_role_exists_now": {
      "summary": string,
      "callouts": [{ "label": string, "value": string, "tone": "neutral" | "strong" | "caution" | "risk" | "unknown" }],
      "bullets": [string],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "how_to_win_this_process": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "company_role_strategy": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "facts": [{ "label": string, "value": string }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "candidate_fit": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "callouts": [{ "label": string, "value": string, "tone": "neutral" | "strong" | "caution" | "risk" | "unknown" }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "interview_prep": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "credibility_layer": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "facts": [{ "label": string, "value": string }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    }
  }
}

Section requirements:
- decision_memo: be decisive; include strongest upside, strongest downside, what must be true, and what would change the recommendation.
- five_minute_brief: 5 to 8 bullets max; every bullet should be usable immediately before an interview.
- why_role_exists_now: explain why now, not why ever. If the evidence threshold is not met, say so directly.
- how_to_win_this_process: include what to lead with, what to prove, what not to overclaim, and which questions will create leverage.
- company_role_strategy: this must be deep and multi-block, not compressed into a summary. Include distinct blocks for business model deep dive, company strategic priorities, product / platform strategy context, market / industry context, competitor analysis, strategic tensions / tradeoffs, role mandate reconstruction, role leverage, scope and power, stakeholder / org map, metric tree logic, first-90-days / year-1 thesis, role risks / hidden constraints, and what would impress the hiring team. If evidence is weak, suppress the weak block instead of writing filler.
- candidate_fit: if no candidate profile exists, say that explicitly. If one exists, cover strengths to emphasize, likely objections, story-to-requirement mapping, and what would impress this hiring team.
- interview_prep: this must read like a premium interview-preparation suite. Include the likely interview loop, interviewer agenda map by interviewer type, strategic themes to master, story-to-interview mapping, objection handling by interviewer type, role-specific mock questions, questions to ask grouped by purpose, what not to say, and concrete answer-quality scaffolding. Reject any output that could apply to any PM interview.
- credibility_layer: include separate blocks for verified facts, cited synthesis, informed inferences, conflicts, and unknowns or insufficient evidence. Do not collapse them together.

Tone rules:
- Director+ quality bar.
- Anti-generic and anti-repetition.
- Prefer omission over unsupported specificity.
- Do not repeat the same claim across multiple sections.
- Never invent precision to make the report feel complete.
- Name strategic tensions and tradeoffs explicitly.
- Explain what interviewers are trying to validate and what proof they need.
- Make competitor analysis consequential for the role.
- Make story guidance concrete enough that a real candidate could rehearse from it.
`;
}
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { RetrievalContext } from "@/lib/types";
import { formatUntrustedTextBlock } from "@/lib/ai/untrustedInput";
import { PremiumEvidenceQuality, PremiumSourceCoverageSummary } from "@/lib/report/premiumTelemetry";
import { formatPersonaForPrompt, PremiumPersonaProfile } from "@/lib/report/premiumPersona";

const ARTIFACT_PATHS = {
  spec: fileURLToPath(new URL("./report_generation_spec.md", import.meta.url)),
  architecture: fileURLToPath(new URL("./pipeline_architecture.md", import.meta.url)),
  costSchema: fileURLToPath(new URL("./cost_ledger_schema.json", import.meta.url)),
  masterPrompt: fileURLToPath(new URL("./premium_vscode_copilot_prompt.md", import.meta.url)),
} as const;

const artifactCache = new Map<keyof typeof ARTIFACT_PATHS, Promise<string>>();
const MAX_ARTIFACT_CHARS = 3500;
const MAX_EVIDENCE_CHUNKS = 12;
const MAX_CHARS_PER_CHUNK = 1800;

async function loadArtifact(key: keyof typeof ARTIFACT_PATHS): Promise<string> {
  if (!artifactCache.has(key)) {
    artifactCache.set(key, readFile(ARTIFACT_PATHS[key], "utf8").catch(() => ""));
  }

  return artifactCache.get(key)!;
}

function truncateForPrompt(content: string, maxChars: number, label: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars).trim()}\n\n[${label.toUpperCase()} TRUNCATED FOR PROMPT BUDGET]`;
}

function formatArtifactSection(title: string, content: string, fallbackMessage: string): string {
  return content.trim()
    ? `\n${title}\n${truncateForPrompt(content, MAX_ARTIFACT_CHARS, title)}\n`
    : `\n${title}\n${fallbackMessage}\n`;
}

function formatChunks(context: RetrievalContext): string {
  return context.chunks
    .slice(0, MAX_EVIDENCE_CHUNKS)
    .map(
      (chunk, index) =>
        `[SOURCE ${index + 1} - UNTRUSTED EVIDENCE] ${chunk.source_title} (${chunk.source_type})\n${truncateForPrompt(chunk.text, MAX_CHARS_PER_CHUNK, `source ${index + 1}`)}`
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
  coverage: PremiumSourceCoverageSummary,
  persona: PremiumPersonaProfile,
  repairInstructions?: string[]
): Promise<string> {
  const jdSection = formatUntrustedTextBlock("JOB DESCRIPTION", jobDescription);
  const profileSection = formatUntrustedTextBlock("CANDIDATE PROFILE / CONTEXT", profileContext);
  const [specArtifact, architectureArtifact, costSchemaArtifact, masterPromptArtifact] = await Promise.all([
    loadArtifact("spec"),
    loadArtifact("architecture"),
    loadArtifact("costSchema"),
    loadArtifact("masterPrompt"),
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
  const repairSection = repairInstructions?.length
    ? `\nREPAIR PRIORITIES\n${repairInstructions.map((instruction, index) => `${index + 1}. ${instruction}`).join("\n")}\nTreat these as mandatory repair targets for this regeneration pass. Preserve any strong content that already exists, but fully rewrite the weak sections instead of making cosmetic edits. On a repair pass, company_context, company_role_strategy, and interview_prep must be expanded until they satisfy the structural and depth rules below or explicitly state what evidence is missing.\n`
    : "";

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
- Generic Product-centric framing for clearly non-Product roles is a failure.
- Generic competitor bullets are a failure.
- Restating the JD as role strategy is a failure.
- Use the inferred persona as the default retrieval, analysis, interview-prep, and reading-experience lens unless the evidence materially contradicts it.
- Do not classify lead, senior, group, or principal product-manager titles as executive unless the JD explicitly shows business-unit, portfolio, org-design, or P&L authority.
- Treat safety, trust, privacy, compliance, and risk language as domain modifiers, not automatic persona switches.
- Candidate-fit scoring must evaluate transferability dimension by dimension; direct domain-specialist experience cannot dominate the score on its own.
- Do not turn senior technical PM interview prep into engineering architecture theater unless the JD explicitly centers engineering-system interviews.
- Keep section categories clean: company_context is company context, candidate_fit is candidate transferability, and interview_prep is interview proof strategy.
- When making a claim grounded in retrieved evidence, append bracketed citations using the available source order, for example [1] or [2, 3].
- Prefer bracketed citation style over prose like "Source 1".
- Do not cite claims that are explicitly marked as insufficient evidence or unknown.
- company_context must usually deliver at least 150 words of net-new interpretation when evidence quality is at least partial; if it cannot, say what evidence is missing.
- company_role_strategy must usually deliver at least 300 words of net-new strategic analysis when evidence quality is at least partial; if it cannot, say what evidence is missing.
- highlight vision, mission, and culture explicitly when evidence supports them; do not bury them in generic background copy.
- treat culture as operating behavior, leadership signals, collaboration norms, or execution habits, not employer-brand fluff.
- include a clearly labeled current-strategy read and a SWOT with 3 to 5 substantive bullets each for strengths, weaknesses, opportunities, and threats when evidence supports that specificity.
- When the evidence supports it, strategy analysis must explicitly address some combination of capital allocation, margin or unit-economics logic, segment or product portfolio dynamics, marketplace structure, strategic priorities, and management tradeoffs. Do not settle for mission-plus-newsroom background if richer operating evidence exists in the prompt.
- Company-facing strategy should read like an investor-grade or operator-grade briefing, not a brand summary. Explain what management appears to be optimizing for, where growth or margin appears to come from, and what tensions matter for this role.
- On a repair pass, treat company-facing depth misses as hard failures. Do not return a compact rewrite for company_context or company_role_strategy.
- When evidence quality is at least partial, the company sections must satisfy the block structure expected by the quality gate, not just mention the topics in passing.
- For company_context and company_role_strategy, do not behave like an extractor that summarizes the company site. These sections must be LLM-generated strategy synthesis built from the enhanced RAG evidence set and deep research coverage.
- Before writing the final company_context and company_role_strategy sections, internally create a comprehensive strategy report for interview preparation, then critique it through these lenses: Director of Product, VP of Product, Economist, External Strategist, Competitive Analyst, and Market Researcher.
- Use those internal lenses to find missing logic, shallow analysis, unsupported leaps, missing market context, missing competitor context, missing economic logic, and missing role consequences. Then upgrade the report and output only the final improved version. Do not output the intermediate critiques.
- The final company-facing sections should read like the result of deep research plus multi-perspective synthesis, not a stitched summary of retrieved snippets.

Company: ${companyName}
Role: ${roleTitle}
${jdSection}
${profileSection}

${formatPersonaForPrompt(persona)}

${formatEvidenceSummary(evidenceQuality)}

${formatCoverageSummary(coverage)}
${artifactBundle}
${repairSection}

Available evidence (${context.chunks.length} chunks total, showing up to ${Math.min(context.chunks.length, MAX_EVIDENCE_CHUNKS)} highest-ranked chunks within prompt budget):
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
    "company_context": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "facts": [{ "label": string, "value": string }],
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
- five_minute_brief: 5 to 8 bullets max; every bullet should be usable immediately before an interview and should reflect the inferred role family and seniority.
- company_context: include only the company-context subsections that can be supported. Prioritize key company insights, brief history or evolution, mission or vision interpretation, values or leadership principles, work culture, and cautious employee-review synthesis. Suppress weak subsections instead of writing filler. When evidence quality is at least partial, this section should usually exceed 150 words total and should use explicit blocks titled Company Snapshot, Vision And Mission, and Culture Signals unless a block must be suppressed for evidence reasons.
- company_context: when scale, operating footprint, or leadership posture are visible in the evidence, interpret them. Do not list facts without explaining what they imply about how the company operates or decides.
- company_context: generate this as the final upgraded version of a comprehensive strategy brief, not as raw extraction. It should synthesize first-party evidence, external validation, market context, leadership commentary, and operating signals into a role-relevant company read.
- company_context: include what leadership appears to be optimizing for, what kind of operating cadence or decision style the company likely runs on, and where the company may be under pressure, even when those conclusions require careful synthesis across multiple sources.
- why_role_exists_now: explain why now, not why ever. If the evidence threshold is not met, say so directly.
- how_to_win_this_process: include what to lead with, what to prove, what not to overclaim, and which questions will create leverage. This must be persona-specific, not generic.
- company_role_strategy: this must be deep and multi-block, not compressed into a summary. Include distinct blocks for business model deep dive, company strategic priorities, product / platform strategy context, market / industry context, competitor analysis, strategic tensions / tradeoffs, role mandate reconstruction, role leverage, scope and power, stakeholder / org map, metric tree logic, first-90-days / year-1 thesis, role risks / hidden constraints, and what would impress the hiring team. When evidence supports it, also cover capital allocation, unit economics or margin logic, portfolio or segment dynamics, and marketplace or structural advantages and constraints. This section should usually exceed 300 words total when evidence quality is at least partial. It must include an explicit Current Strategy block and explicit SWOT - Strengths, SWOT - Weaknesses, SWOT - Opportunities, and SWOT - Threats blocks, each with 3 to 5 substantive bullets when evidence supports that specificity. If evidence is weak, suppress the weak block instead of writing filler.
- company_role_strategy: generate this as the final upgraded version of a comprehensive strategy report after internally gap-checking it through product leadership, economics, external strategy, competitive analysis, and market-research lenses. The final output should feel pressure-tested, not first-draft.
- company_role_strategy: do not anchor this section mainly on company-site language. Use company-site material as one evidence stream, then strengthen it with investor, leadership, competitive, market, review, analyst, and external validation evidence whenever available.
- candidate_fit: if no candidate profile exists, say that explicitly. If one exists, cover strengths to emphasize, likely objections, story-to-requirement mapping, and what would impress this hiring team.
- interview_prep: this must read like a premium interview-preparation suite. Include the likely interview loop, interviewer agenda map by interviewer type, strategic themes to master, story-to-interview mapping, objection handling by interviewer type, role-specific mock questions, questions to ask grouped by purpose, what not to say, and concrete answer-quality scaffolding. Reject any output that could apply unchanged to a different role family or seniority band.
- credibility_layer: include separate blocks for verified facts, cited synthesis, informed inferences, conflicts, and unknowns or insufficient evidence. Do not collapse them together.

Hard structural contract for company-facing sections:
- company_context: if evidence quality is partial or better, return a summary plus explicit blocks titled Company Snapshot, Vision And Mission, and Culture Signals. Each returned block must contain role-relevant interpretation, not just description. Vision And Mission must explain what leadership appears to be trying to accomplish. Culture Signals must explain how people likely decide, execute, collaborate, or escalate.
- company_context: if a required block cannot be supported, keep the title and begin the block body with INSUFFICIENT_EVIDENCE: followed by the exact evidence gap. Do not replace the block with generic filler.
- company_context: the section should reflect enhanced-RAG synthesis, not just official-company-source extraction. When external strategy, labor-market, customer, partner, analyst, or competitor evidence changes the interpretation, incorporate that into the final view.
- company_role_strategy: if evidence quality is partial or better, return a summary plus explicit blocks titled Current Strategy, Strategic Tensions, SWOT - Strengths, SWOT - Weaknesses, SWOT - Opportunities, and SWOT - Threats.
- company_role_strategy: each SWOT block must contain 3 to 5 differentiated bullets when evidence quality is partial or better. Bullets must be analytic, consequential for the role, and non-redundant.
- company_role_strategy: the combined Current Strategy and Strategic Tensions bodies should explain the business model, present strategic priorities, current market pressure, management tradeoffs, and why those pressures shape this role now.
- company_role_strategy: when the evidence supports it, the combined Current Strategy and Strategic Tensions bodies should also explain where growth appears to come from, where margin or monetization appears to come from, how management seems to allocate investment, and which portfolio or marketplace tensions are most relevant to the role.
- company_role_strategy: the final section should show evidence of multi-lens gap-filling. It should not stop at product strategy; it should also include external market structure, competitor moves, economic logic, and strategic blind spots that matter for interview preparation.
- company_role_strategy: if evidence is too weak for one of these required blocks, keep the block title and begin the body with INSUFFICIENT_EVIDENCE: followed by the missing evidence. Do not silently omit the block on a repair pass.
- company_role_strategy: on a repair pass, do not return this section with fewer than 6 blocks unless the evidence object explicitly says the section is insufficient.
- interview_prep: on a repair pass, prefer adding interviewer logic, proof expectations, likely objections, and mock-question specificity over compressing the section.

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
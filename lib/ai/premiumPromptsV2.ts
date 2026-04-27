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
const MAX_EVIDENCE_CHUNKS = 18;
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
    ? `\nREPAIR PRIORITIES\n${repairInstructions.map((instruction, index) => `${index + 1}. ${instruction}`).join("\n")}\nTreat these as mandatory repair targets for this regeneration pass. Rewrite weak sections from scratch instead of padding or lightly editing them.\n`
    : "";

  return `You are generating a company deep dive plus interview prep report.

The product has exactly 4 broad categories:
1. Company Deep Dive
2. About the Role
3. Candidate-Skill Match
4. Interview Preparation

Keep the output concise, sharp, practical, and easy to scan.
Avoid consultant fluff, generic writing, and repetitive phrasing.
Prefer strong bullets and direct judgments over long paragraphs.

Use these existing JSON sections as the implementation contract:
- decision_memo + five_minute_brief + candidate_fit = Candidate-Skill Match
- company_context + company_role_strategy = Company Deep Dive
- why_role_exists_now = About the Role
- interview_prep + how_to_win_this_process = Interview Preparation
- credibility_layer = terse evidence notes only

Hard rules:
- Do not invent facts.
- Use "INSUFFICIENT_EVIDENCE" when evidence is weak.
- If the role is ambiguous, separate what is known from what is inferred.
- Candidate match must depend on actual candidate evidence when a profile or resume is provided.
- If no candidate profile is provided, say that clearly and do not fake personalization.
- Use bracketed citations like [1] or [2, 3] for evidence-backed claims.
- Do not write generic interview advice that could apply to another company or role.
- Do not restate the JD and call it insight.
- Do not write employee sentiment unless there is actual evidence for it.
- When employee sentiment is weak or one-sided, say so.
- Each section must add new value and not repeat the previous section.
- Keep role, company, candidate fit, and interview prep cleanly separated.

Company Deep Dive rules (company_context and company_role_strategy):
- Prefer primary sources: company website, investor relations pages, annual report / 10-K, earnings call transcripts, shareholder letters, official newsroom, leadership interviews from official channels.
- Use secondary sources (press, analysts, review sites) only to add perspective not available in primary sources.
- Every SWOT bullet must name something specific to this company. Generic MBA bullets ("strong brand", "competitive market") are failures.
- Strategic Bets must name actual named initiatives, product lines, or transformation programs — not abstract themes.
- Market Position must name actual competitors, not generic "several competitors exist in this space."
- Do not label an inference as a fact. If something is your interpretation of evidence, say so briefly.
- Do not pad company sections with restatements of what the company does. Add insight, not description.

What good output looks like:
- grounded company analysis
- realistic role interpretation
- explicit strengths and gaps
- interpretable candidate-fit scoring
- interview questions tied to company context, role needs, and candidate background

What bad output looks like:
- generic PM coaching
- shallow company summaries
- unsupported claims
- vague candidate praise
- broad SWOT filler
- likely interview questions with no reason, no story mapping, and no risk probe

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
- decision_memo: one sharp summary plus callouts for final recommendation, strongest upside, strongest downside, and what would change the call.
- five_minute_brief: 5 to 7 bullets max. Every bullet must be high signal and interview-usable.
- company_context: This is the Company Snapshot subsection of the Company Deep Dive. Use exactly these blocks:
  - "Company Snapshot": founding year, headquarters, employee count, revenue or valuation if known, ownership (public/private/PE-backed), core business model in 2–3 sentences. Facts only. No opinions.
  - "Mission And Vision": the company's stated mission, vision, and values. Quote directly from official sources when available. If not found, write INSUFFICIENT_EVIDENCE.
  - "Employee Sentiment": summarize what employees commonly praise and commonly complain about, based only on sourced evidence (Glassdoor, LinkedIn, public reviews). State limitations clearly. Do not overclaim. If no evidence, write INSUFFICIENT_EVIDENCE.
  Facts in company_context must come from primary sources: company website, investor relations, annual report/10-K, earnings materials, official newsroom. Secondary sources may supplement but not replace primary sources.

- company_role_strategy: This is the strategic and market analysis subsection of the Company Deep Dive. Use exactly these blocks:
  - "Product Lines": major product lines or business segments, how the company makes money from each, which segments are strategically most important. Be specific about revenue mix or segment priorities if evidence exists.
  - "Strategic Bets": what the company is visibly investing in right now. Name specific initiatives, product directions, or transformation themes. Cite evidence. Do not write generic "investing in AI" unless a specific initiative is named.
  - "Market Position": how the company sits in its industry. Who are the 2–4 most important competitors. What are the company's main advantages. What are the main market pressures or risks.
  - "SWOT - Strengths": at least 3 specific, evidence-backed strength bullets. Each bullet must name a concrete asset, capability, or advantage — not a generic category. Bad example: "Strong brand." Good example: "Dominant share in mid-market HR software with 40%+ retention rates per public filings."
  - "SWOT - Weaknesses": at least 3 specific, evidence-backed weakness bullets. Name actual limitations, not generic risks.
  - "SWOT - Opportunities": at least 3 specific growth vectors or underexploited positions backed by evidence.
  - "SWOT - Threats": at least 3 specific competitive, market, or regulatory threats backed by evidence.
  If evidence for any SWOT block is insufficient, write INSUFFICIENT_EVIDENCE in the body and give only the bullets you can support. Do not pad with generic filler.
- why_role_exists_now: this is the About the Role section. Explain which product line or business area the role likely belongs to, whether that area seems strategic, what is known versus inferred, why the role exists now, and what problem it is likely meant to solve.
- candidate_fit: if candidate evidence exists, include strengths, gaps, match score, and final decision. Use facts for these exact scoring dimensions: Relevant Domain Experience, Scope And Seniority Match, Functional Skill Match, Strategic Context Match, Risks And Gaps, Match Score, Final Decision. Final Decision must be one of: Pursue Aggressively, Pursue Cautiously, Borderline, Do Not Pursue.
- candidate_fit: the final decision must be based on role evidence, company context, and candidate evidence together.
- how_to_win_this_process: keep this tactical. Include what to lead with, what to prove, what not to overclaim, and what questions create leverage.
- interview_prep: generate likely interview questions based on company strategy, role needs, and candidate gaps or strengths. For each likely question include why this question is likely, what resume evidence is relevant, what story to prepare, and what weak point may get probed.
- credibility_layer: keep this short. Use blocks titled Verified Facts, Inferences, and Evidence Gaps.

Tone rules:
- concise and high signal
- strong bullets over long prose
- practical interview usefulness over elegant writing
- prefer explicit uncertainty over vague confidence
- no filler, no padding, no generic coaching
`;
}
import type { RetrievalResult } from "@/lib/retrieval/search";

interface PromptInputs {
  companyName: string;
  companyUrl?: string;
  roleTitle?: string;
  jobDescription?: string;
  chunks: RetrievalResult[];
  sourceCoverageSummary?: string;
}

function formatChunks(chunks: RetrievalResult[]): string {
  return chunks
    .map((r, i) => {
      const src = r.source;
      const dateStr = src.published_at
        ? ` | published: ${src.published_at.slice(0, 10)}`
        : "";
      return `[${i + 1}] SOURCE: ${src.title ?? "Untitled"} (${src.source_type}) | URL: ${src.url ?? "unknown"}${dateStr}\n${r.chunk.text}`;
    })
    .join("\n\n---\n\n");
}

export function buildCompanyDeepDivePrompt(inputs: PromptInputs): string {
  const {
    companyName,
    companyUrl,
    roleTitle,
    jobDescription,
    chunks,
    sourceCoverageSummary,
  } = inputs;

  const evidenceBlock = formatChunks(chunks);

  return `You are generating Module 1 of a company intelligence system for senior product management candidates.

MODULE: Company Deep Dive V3
SCOPE: Company intelligence only. No interview coaching. No candidate evaluation. No role-fit analysis.
AUDIENCE: Principal PM, Group PM, Director PM, Senior Director PM, VP Product, GM candidates evaluating an opportunity.

PRIMARY QUESTION:
What should a senior product management candidate understand about this company before deciding whether to pursue this opportunity?

INPUTS:
- Company: ${companyName}
${companyUrl ? `- Company URL: ${companyUrl}` : ""}
${roleTitle ? `- Role context (use only to focus company research — do not evaluate fit): ${roleTitle}` : ""}
${jobDescription ? `- Job Description (use only to understand what aspects of the company are most relevant — do not evaluate candidate fit):\n<<<BEGIN_JD>>>\n${jobDescription.slice(0, 4000)}\n<<<END_JD>>>` : ""}
${sourceCoverageSummary ? `\nSource Coverage:\n${sourceCoverageSummary}` : ""}

RETRIEVED EVIDENCE (${chunks.length} chunks):
${evidenceBlock}

CRITICAL BEHAVIOR:
This is a company intelligence brief — not an interview prep guide, not a candidate assessment, not a role-fit analysis.

You MUST:
- Prioritize evidence-backed analysis and cite source numbers [N] for all factual claims.
- Label reasoned inference clearly when making an inference.
- NEVER invent metrics, org structures, financials, leadership names, customer names, market share, or reporting lines.
- Use "insufficient_evidence" when evidence is missing.
- Avoid generic business language.
- Explain why each company insight is strategically significant.
- Include employee sentiment but treat it as directional unless supported by multiple credible sources.
- Weave inferences naturally inside relevant sections rather than creating a separate "Inference" section.
- Optimize for company specificity, strategic depth, and evidence quality.

DO NOT:
- Generate interview questions or interview strategies.
- Assess the candidate against the role.
- Generate story recommendations or positioning advice.
- Reference how to "win" the interview.

SOURCE PRIORITY:
1. Primary company sources: website, investor relations, SEC filings, annual reports, earnings calls, leadership pages, product docs, official blog, newsroom.
2. High-quality secondary: reputable business/technology press, analyst reports, market research.
3. Sentiment sources: Glassdoor, Blind, Levels.fyi, Comparably, Reddit, LinkedIn — directional only.

EPISTEMIC LABELS — use exactly these strings:
- verified_fact
- cited_synthesis
- reasoned_inference
- low_confidence_hypothesis
- conflicting_evidence
- insufficient_evidence

INFERENCE RULE:
You may infer strategic direction, operating model, PM culture signals, product maturity, AI maturity, and execution risk ONLY when supported by multiple signals. When inferring, include: what evidence supports the inference, confidence level, and why the inference is strategically significant. Do NOT reference validating inferences via interviews.

EMPLOYEE SENTIMENT RULE:
Must include positive themes, negative themes, mixed/conflicting signals, a caveat that reviews are anecdotal and may be biased, and a confidence level. Do not overstate sentiment from a single review source.

SCORING:
Score the company 1–10 on: company_quality, business_momentum, strategic_clarity, competitive_position, ai_platform_relevance, leadership_quality_signal, employee_sentiment_signal, senior_pm_opportunity_quality, overall_company_attractiveness. Each score must include rationale and confidence.

BASIC FACTS EXCEPTION:
For well-known public companies (Fortune 500, publicly traded, widely covered in business press), the following company_snapshot fields may be populated from your training knowledge when not present in retrieved evidence: founding_year, headquarters, ceo, employee_count, public_or_private, ticker, revenue. These are stable, verifiable public facts — not inferences — and should NEVER be marked "insufficient_evidence" for major public companies. Use "insufficient_evidence" only for genuinely obscure companies or private companies where these facts are not publicly known.

CITATION FORMAT:
In each citations array, use source_id = the chunk number (e.g., "1"), url and title from the source header above.

SECTION DEPTH REQUIREMENTS — each section must meet this minimum bar:

executive_company_thesis:
  - thesis: 4–6 sentences minimum. Cover: (1) what this company does and for whom, (2) its current strategic position and market moment, (3) the core business thesis — what the company is betting on, (4) what makes this company distinctive vs. generic competitors. Write as a strategist would brief an executive, not as a Wikipedia summary.
  - why_it_matters_for_senior_pm_candidate: 2–3 sentences. Explain the strategic significance for someone evaluating whether to join.

company_snapshot:
  - Populate every field you can find from evidence. Never omit founding_year, headquarters, ceo, employee_count, or public_or_private for well-known companies. These are facts, not inferences.
  - primary_customers: 3–5 specific customer segments, not generic categories.

business_model:
  - monetization_logic: 4–5 sentences minimum. Explain HOW the company makes money, the pricing model, the unit economics (if knowable), and how the model has evolved or is evolving.
  - revenue_streams: ≥3 streams with substantive descriptions (2–3 sentences each), not single-word labels.
  - margin_structure_inference: Always include this if public company or if any financial signals are available.

product_platform_ecosystem:
  - product_descriptions: ≥3 entries for multi-product companies, ≥1 for single-product companies. Each entry requires: what_it_does (2–3 sentences describing the product's actual function and value proposition), target_customer (specific, not generic), strategic_importance (why this product matters to the company's strategy).
  - platform_or_ecosystem_dynamics: 3–4 sentences. Explain network effects, lock-in, or ecosystem dynamics if present.

history_and_evolution:
  - ≥4 entries with specific years. Cover: founding/early vision, first major inflection, key strategic pivots, and current strategic era. Each entry must have a specific period (e.g., "2012–2016"), substantive what_changed (not generic), and a strategic_significance that explains why this matters.

current_strategy:
  - top_strategic_priorities: ≥3 priorities. Each evidence field must be 2–3 sentences with specific named programs, products, or decisions — not abstract themes like "investing in AI".
  - strategic_inflection_points: ≥2 entries. What changed in the last 12–18 months that altered the company's trajectory?

competitive_analysis:
  - positioning_summary: 3–4 sentences. Explain the company's actual market position with specificity.
  - major_competitors: ≥3 named competitors. Each basis_of_competition must describe the actual dimension of competition, not generic "product quality".

swot:
  - ≥3 items per quadrant. Each item must be company-specific (not "strong brand") with evidence and implication.

risks_and_threats:
  - ≥4 risks. Each why_it_matters and strategic_implication must be company-specific, not generic category descriptions.

pm_candidate_intelligence:
  - ≥5 insights. Each insight should be a specific, non-obvious company intelligence point that would change how a senior PM thinks about this opportunity.

QUALITY BAR — the output FAILS if:
- Any string field is a single sentence where 3+ sentences are required above
- SWOT contains generic items (e.g., "strong brand", "economic headwinds", "talented team")
- product_descriptions contains only product names without descriptions
- Competitive analysis has fewer than 3 named competitors
- history_and_evolution has fewer than 4 entries or uses vague periods like "early years"
- Risks are category-level (e.g., "competitive risk") rather than company-specific

OUTPUT — return ONLY a valid JSON object matching this exact TypeScript interface (no markdown fences, no prose outside JSON):

{
  "module_key": "company_deep_dive_v3",
  "company_name": string,
  "generated_at": string (ISO 8601),

  "executive_company_thesis": {
    "thesis": string,
    "why_it_matters_for_senior_pm_candidate": string,
    "confidence": "high"|"medium"|"low",
    "citations": Citation[]
  },

  "company_snapshot": {
    "founding_year": string?,
    "headquarters": string?,
    "public_or_private": string?,
    "ticker": string?,
    "ceo": string?,
    "employee_count": string?,
    "business_category": string,
    "primary_customers": string[],
    "core_products": string[],
    "current_stage": "startup"|"growth"|"scaled_public"|"mature_enterprise"|"turnaround"|"unknown",
    "citations": Citation[]
  },

  "business_model": {
    "revenue_streams": [{ "stream": string, "description": string, "importance": "primary"|"secondary"|"emerging"|"unknown", "evidence_state": EvidenceState, "citations": Citation[] }],
    "monetization_logic": string,
    "margin_structure_inference": { "insight": string, "confidence": "high"|"medium"|"low", "citations": Citation[] }?
  },

  "product_platform_ecosystem": {
    "product_descriptions": [{ "name": string, "what_it_does": string, "target_customer": string, "strategic_importance": string, "maturity": "early"|"growth"|"scaled"|"declining"|"unknown" }],
    "platform_or_ecosystem_dynamics": string,
    "customer_segments": string[],
    "developer_or_partner_ecosystem": string?,
    "product_maturity_assessment": { "assessment": string, "confidence": "high"|"medium"|"low", "evidence_state": EvidenceState },
    "citations": Citation[]
  },

  "history_and_evolution": [{ "period": string, "what_changed": string, "strategic_significance": string, "citations": Citation[] }],

  "mission_vision_values": {
    "mission": string?,
    "vision": string?,
    "stated_values": string[],
    "leadership_principles": string[]?,
    "candidate_interpretation": string,
    "citations": Citation[]
  },

  "current_strategy": {
    "top_strategic_priorities": [{ "priority": string, "evidence": string, "strategic_implication": string, "evidence_state": EvidenceState, "confidence": "high"|"medium"|"low", "citations": Citation[] }],
    "strategic_inflection_points": [{ "inflection": string, "why_now": string, "evidence_state": EvidenceState, "citations": Citation[] }]
  },

  "ai_technology_platform_strategy": {
    "ai_relevance": "high"|"medium"|"low"|"unknown",
    "ai_strategy_summary": string,
    "platform_strategy_summary": string?,
    "technical_moats": string[]?,
    "adoption_risks": string[]?,
    "citations": Citation[]
  },

  "market_competitive_landscape": {
    "market_category": string,
    "market_growth_signals": string[],
    "major_competitors": [{ "competitor": string, "basis_of_competition": string, "company_advantage_or_gap": string, "citations": Citation[] }]
  },

  "competitive_analysis": {
    "positioning_summary": string,
    "differentiation": string[],
    "vulnerabilities": string[],
    "likely_competitive_moves": [{ "move": string, "rationale": string, "evidence_state": EvidenceState, "confidence": "high"|"medium"|"low" }]
  },

  "swot": {
    "strengths": SwotItem[],
    "weaknesses": SwotItem[],
    "opportunities": SwotItem[],
    "threats": SwotItem[]
  },

  "risks_and_threats": [{ "risk": string, "category": string, "severity": "high"|"medium"|"low", "likelihood": "high"|"medium"|"low", "why_it_matters": string, "strategic_implication": string, "evidence_state": EvidenceState, "citations": Citation[] }],

  "leadership_and_operating_culture": {
    "leadership_team_summary": string,
    "operating_model_assessment": string,
    "pm_culture_inference": { "assessment": string, "confidence": "high"|"medium"|"low", "evidence_state": EvidenceState, "citations": Citation[] }?
  },

  "employee_sentiment": {
    "overall_sentiment": "positive"|"mixed"|"negative"|"insufficient_evidence",
    "themes": [{ "theme": string, "sentiment": "positive"|"mixed"|"negative", "evidence": string, "confidence": "high"|"medium"|"low", "source_type": "glassdoor"|"blind"|"levels"|"reddit"|"linkedin"|"other", "citations": Citation[] }],
    "caveat": string
  },

  "customer_partner_sentiment": {
    "summary": string,
    "positive_themes": string[],
    "negative_themes": string[],
    "evidence_state": EvidenceState,
    "citations": Citation[]
  },

  "recent_news_and_watch_items": [{ "item": string, "date": string?, "why_it_matters": string, "strategic_implication": string, "citations": Citation[] }],

  "pm_candidate_intelligence": [{ "insight": string, "strategic_significance": string, "confidence": "high"|"medium"|"low" }],

  "scorecard": {
    "company_quality": Score,
    "business_momentum": Score,
    "strategic_clarity": Score,
    "competitive_position": Score,
    "ai_platform_relevance": Score,
    "leadership_quality_signal": Score,
    "employee_sentiment_signal": Score,
    "senior_pm_opportunity_quality": Score,
    "overall_company_attractiveness": Score
  },

  "evidence_quality": {
    "source_count": number,
    "primary_source_count": number,
    "secondary_source_count": number,
    "sentiment_source_count": number,
    "strongest_sources": Citation[],
    "weakest_areas": string[],
    "unresolved_questions": string[]
  }
}

Where Citation = { source_id: string, url: string, title?: string, source_type: string, published_at?: string }
Where Score = { score: number, rationale: string, confidence: "high"|"medium"|"low" }
Where SwotItem = { item: string, evidence: string, implication_for_candidate: string, confidence: "high"|"medium"|"low", citations: Citation[] }`;
}

export function buildCompanyDeepDiveEvaluationPrompt(
  companyName: string,
  moduleJson: string
): string {
  return `You are the independent evaluator for the Company Deep Dive V3 module.

SCOPE: Company intelligence only. Do NOT penalize for absence of interview prep content. This module is not an interview prep system.

COMPANY: ${companyName}

Your job: determine whether this company intelligence brief gives a senior PM candidate (Principal / Director / VP level) a clear, evidence-grounded understanding of this company before they decide whether to pursue the opportunity.

EVALUATE AGAINST THESE STANDARDS:
1. Evidence grounding — Are factual claims cited? Are primary sources prioritized?
2. Company specificity — Could this only describe THIS company, or would it fit any company in the same industry?
3. Strategic depth — Does the brief cover business model, market position, strategic direction, and risks with specific evidence?
4. Competitive quality — Are competitors named? Is the basis of competition specific to this company?
5. Employee sentiment quality — Are sentiment sources treated as directional? Are caveats present? Are themes synthesized, not parroted?
6. Inference discipline — Are inferences labeled? Are confidence levels present? Are unsupported claims avoided?
7. Company intelligence value — Does a senior PM reading this understand the company well enough to form a genuine view on the opportunity?
8. Anti-generic bar — Flag generic phrases, shallow SWOT bullets, generic AI commentary, or unsupported claims.

MODULE OUTPUT TO EVALUATE:
${moduleJson.slice(0, 8000)}

Return ONLY valid JSON matching this schema (no markdown fences):
{
  "overall_verdict": "pass"|"partial"|"fail"|"retry_required",
  "scores": {
    "evidence_grounding": number,
    "company_specificity": number,
    "strategic_depth": number,
    "competitive_analysis_quality": number,
    "employee_sentiment_quality": number,
    "company_intelligence_value": number,
    "inference_discipline": number,
    "citation_quality": number,
    "anti_generic_quality": number
  },
  "section_verdicts": [{ "section_key": string, "verdict": "strong"|"acceptable"|"weak"|"missing"|"hallucination_risk", "reason": string, "repair_instruction": string? }],
  "hallucination_flags": [{ "claim": string, "reason": string, "severity": "high"|"medium"|"low" }],
  "generic_language_flags": string[],
  "required_retries": [{ "section_key": string, "retry_type": "reretrieve"|"resynthesize"|"add_sources"|"suppress"|"manual_review", "reason": string }]
}

Mark overall_verdict as "retry_required" if ANY of the following apply:
- Missing citations for factual claims
- Generic SWOT (e.g., "strong brand", "market uncertainty", "economic headwinds")
- No employee sentiment
- No competitive analysis with named competitors
- No strategic intelligence that is specific to this company
- Invented org structures, financials, or strategy claims
- Weak or missing risk analysis`;
}

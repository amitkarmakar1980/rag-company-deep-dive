import { executeWithOpenAIProviders, resolveModelForProvider } from "@/lib/ai/openaiClient";
import type { LLMCallUsage } from "@/lib/types";
import type { CompanyDeepDiveV3, CompanyDeepDiveEvaluation } from "./schema";
import type { EvaluationResult } from "./types";

// ── Evaluation prompt ─────────────────────────────────────────────────────────

export function buildEvaluationPrompt(
  companyName: string,
  moduleJson: CompanyDeepDiveV3
): string {
  // Only send a summary slice — full JSON can exceed context for the evaluation model
  const summarySlice = {
    company_name: moduleJson.company_name,
    executive_company_thesis: moduleJson.executive_company_thesis,
    company_snapshot: moduleJson.company_snapshot,
    business_model: {
      monetization_logic: moduleJson.business_model.monetization_logic,
      stream_count: moduleJson.business_model.revenue_streams.length,
    },
    current_strategy: {
      priority_count: moduleJson.current_strategy.top_strategic_priorities.length,
      inflection_count: moduleJson.current_strategy.strategic_inflection_points.length,
    },
    major_competitor_count: moduleJson.market_competitive_landscape.major_competitors.length,
    swot_counts: {
      strengths: moduleJson.swot.strengths.length,
      weaknesses: moduleJson.swot.weaknesses.length,
      opportunities: moduleJson.swot.opportunities.length,
      threats: moduleJson.swot.threats.length,
    },
    risk_count: moduleJson.risks_and_threats.length,
    employee_sentiment: moduleJson.employee_sentiment.overall_sentiment,
    employee_theme_count: moduleJson.employee_sentiment.themes.length,
    pm_intelligence_count: moduleJson.pm_candidate_intelligence?.length ?? 0,
    scorecard: moduleJson.scorecard,
    evidence_quality: moduleJson.evidence_quality,
  };

  // Sample SWOT and risks for generic-language detection
  const swotSample = [
    ...moduleJson.swot.strengths.slice(0, 2).map((s) => `[strength] ${s.item}`),
    ...moduleJson.swot.weaknesses.slice(0, 2).map((s) => `[weakness] ${s.item}`),
    ...moduleJson.swot.opportunities.slice(0, 2).map((s) => `[opportunity] ${s.item}`),
    ...moduleJson.swot.threats.slice(0, 2).map((s) => `[threat] ${s.item}`),
  ];

  const riskSample = moduleJson.risks_and_threats
    .slice(0, 3)
    .map((r) => `[${r.severity}] ${r.risk} — ${r.why_it_matters.slice(0, 120)}`);

  const takeawaySample = (moduleJson.pm_candidate_intelligence ?? [])
    .slice(0, 2)
    .map((t: { insight: string }) => t.insight);

  const competitorSample = moduleJson.market_competitive_landscape.major_competitors
    .map((c) => c.competitor);

  return `You are the independent quality reviewer for Company Deep Dive V3 — a company intelligence module.

SCOPE: Company intelligence only. This is NOT an interview prep system. Do NOT penalize for absence of interview coaching content.

COMPANY: ${companyName}

Your job: determine whether this company intelligence brief gives a senior PM candidate (Principal / Director / VP level) a clear, evidence-grounded understanding of the company before deciding whether to pursue the opportunity.

METADATA SUMMARY:
${JSON.stringify(summarySlice, null, 2)}

SWOT SAMPLE (first 2 per quadrant):
${swotSample.join("\n")}

RISK SAMPLE (top 3):
${riskSample.join("\n")}

SENIOR PM TAKEAWAY SAMPLE:
${takeawaySample.join("\n")}

NAMED COMPETITORS:
${competitorSample.join(", ") || "NONE FOUND"}

EVALUATION STANDARDS:
1. evidence_grounding (1–10) — Are factual claims cited? Are primary sources used where available?
2. company_specificity (1–10) — Could this only describe THIS company, or any company in the industry?
3. strategic_depth (1–10) — Business model, market position, direction, risks, PM implications all present?
4. competitive_analysis_quality (1–10) — Named competitors? Basis of competition clear? Advantages/vulnerabilities specific?
5. employee_sentiment_quality (1–10) — Sentiment treated carefully, caveats included, themes synthesized?
6. company_intelligence_value (1–10) — Does a senior PM reading this understand the company well enough to form a genuine view on the opportunity?
7. inference_discipline (1–10) — Inferences labeled? Confidence levels present? Unsupported claims avoided?
8. citation_quality (1–10) — Are citations present and traceable?
9. anti_generic_quality (1–10) — Are generic phrases, shallow SWOT bullets, or generic AI commentary absent?

FAILURE CONDITIONS — mark overall_verdict as "retry_required" if ANY apply:
- competitor list is empty or contains unnamed placeholders
- SWOT items are generic (e.g., "strong brand", "market uncertainty", "economic headwinds")
- no employee sentiment themes
- no senior PM takeaways
- executive thesis is absent or boilerplate
- risks are category-level (e.g., "competitive risk", "market risk") not company-specific
- invented claims without evidence citations

Return ONLY valid JSON (no markdown fences, no prose outside JSON):
{
  "overall_verdict": "pass" | "partial" | "fail" | "retry_required",
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
  "section_verdicts": [
    { "section_key": string, "verdict": "strong"|"acceptable"|"weak"|"missing"|"hallucination_risk", "reason": string, "repair_instruction": string | null }
  ],
  "hallucination_flags": [
    { "claim": string, "reason": string, "severity": "high"|"medium"|"low" }
  ],
  "generic_language_flags": string[],
  "required_retries": [
    { "section_key": string, "retry_type": "reretrieve"|"resynthesize"|"add_sources"|"suppress"|"manual_review", "reason": string }
  ]
}`;
}

// ── Evaluation LLM call ───────────────────────────────────────────────────────

function extractJSON<T>(raw: string, context: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No JSON found in ${context} response`);
    return JSON.parse(match[0]) as T;
  }
}

export async function runEvaluation(
  companyName: string,
  moduleJson: CompanyDeepDiveV3
): Promise<{ data: CompanyDeepDiveEvaluation; usage: LLMCallUsage }> {
  const prompt = buildEvaluationPrompt(companyName, moduleJson);

  return executeWithOpenAIProviders({
    operationName: "evaluateCompanyDeepDiveV3",
    getModels: (providerKind) => [resolveModelForProvider("standard", providerKind)],
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are the strict internal quality reviewer for a company intelligence module. Return only valid JSON matching the requested schema. Never include markdown fences or extra prose.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from evaluation model");

      const raw = extractJSON<any>(content, "company deep dive evaluation");

      // Normalize to CompanyDeepDiveEvaluation shape
      const evaluation: CompanyDeepDiveEvaluation = {
        overall_verdict: raw.overall_verdict,
        scores: raw.scores,
        section_verdicts: (raw.section_verdicts ?? []).map((sv: any) => ({
          section_key: sv.section_key,
          verdict: sv.verdict,
          reason: sv.reason,
          repair_instruction: sv.repair_instruction ?? undefined,
        })),
        hallucination_flags: raw.hallucination_flags ?? [],
        generic_language_flags: raw.generic_language_flags ?? [],
        required_retries: (raw.required_retries ?? []).map((r: any) => ({
          section_key: r.section_key,
          retry_type: r.retry_type,
          reason: r.reason,
        })),
      };

      const p = { input: 0.15, output: 0.60 }; // gpt-4o-mini pricing
      const inp = response.usage?.prompt_tokens ?? 0;
      const out = response.usage?.completion_tokens ?? 0;
      const usage: LLMCallUsage = {
        model,
        purpose: "Company Deep Dive V3 Quality Gate",
        input_tokens: inp,
        output_tokens: out,
        estimated_cost_usd: parseFloat(
          ((inp / 1_000_000) * p.input + (out / 1_000_000) * p.output).toFixed(6)
        ),
      };

      return { data: evaluation, usage };
    },
  });
}

// ── Convenience accessor ──────────────────────────────────────────────────────

export function toEvaluationResult(e: CompanyDeepDiveEvaluation): EvaluationResult {
  return {
    verdict: e.overall_verdict,
    scores: e.scores,
    sectionVerdicts: e.section_verdicts.map((sv) => ({
      sectionKey: sv.section_key,
      verdict: sv.verdict,
      reason: sv.reason,
      repairInstruction: sv.repair_instruction,
    })),
    hallucinationFlags: e.hallucination_flags,
    genericLanguageFlags: e.generic_language_flags,
    requiredRetries: e.required_retries.map((r) => ({
      sectionKey: r.section_key,
      retryType: r.retry_type,
      reason: r.reason,
    })),
  };
}

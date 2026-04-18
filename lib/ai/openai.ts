import OpenAI from "openai";
import { StructuredReport, CandidateOverlayData, LLMCallUsage } from "@/lib/types";
import { PremiumReportModelOutput } from "@/lib/report/premiumTypes";
import type { PremiumEvaluationModelOutput } from "@/lib/report/premiumQualityGate";
import { executeWithOpenAIProviders, resolveModelForProvider, type OpenAIProviderKind } from "@/lib/ai/openaiClient";

// ─── Model constants ──────────────────────────────────────────────────────────

/**
 * Deep analysis tier — used for SWOT, strategic classification, risk assessment,
 * and why-role-exists. These sections require multi-step reasoning and evidence
 * synthesis; the quality difference between o3 and a standard model is material.
 */
export const DEEP_MODEL = process.env.OPENAI_DEEP_MODEL?.trim() || "o4-mini";

/**
 * Standard synthesis tier — used for interview prep sections, summaries, and
 * structured formatting. Fast and cost-efficient; complexity is synthesis, not
 * strategic reasoning.
 */
export const STANDARD_MODEL = process.env.OPENAI_STANDARD_MODEL?.trim() || "gpt-4o-mini";

/**
 * Overlay model — candidate personalization. Requires nuanced career coaching
 * judgment. Stays on gpt-4o (not mini) for quality on gap/objection analysis.
 */
export const OVERLAY_MODEL = process.env.OPENAI_OVERLAY_MODEL?.trim() || "gpt-4o";
export const PREMIUM_MODEL = process.env.OPENAI_PREMIUM_MODEL?.trim() || "o3";

// ─── Pricing (USD per 1M tokens, approximate) ────────────────────────────────
// Update if OpenAI changes pricing.
const PRICING: Record<string, { input: number; output: number }> = {
  "o4-mini":      { input:  1.10, output:  4.40 },
  o3:             { input: 10.00, output: 40.00 },
  "gpt-4o":       { input:  2.50, output: 10.00 },
  "gpt-4o-mini":  { input:  0.15, output:  0.60 },
  "gpt-4-turbo":  { input: 10.00, output: 30.00 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { input: 5, output: 15 };
  return parseFloat(
    ((inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output).toFixed(6)
  );
}

function buildUsage(
  model: string,
  purpose: string,
  usage: OpenAI.Completions.CompletionUsage | undefined
): LLMCallUsage {
  const input = usage?.prompt_tokens ?? 0;
  const output = usage?.completion_tokens ?? 0;
  // o3 exposes reasoning_tokens inside completion_tokens_details
  const reasoning =
    (usage as any)?.completion_tokens_details?.reasoning_tokens ?? undefined;

  return {
    model,
    purpose,
    input_tokens: input,
    output_tokens: output,
    reasoning_tokens: reasoning,
    estimated_cost_usd: estimateCost(model, input, output),
  };
}

function uniqueModels(models: string[]): string[] {
  return Array.from(new Set(models.filter(Boolean)));
}

function deepAnalysisModels(providerKind: OpenAIProviderKind): string[] {
  return uniqueModels([
    resolveModelForProvider("deep", providerKind),
    resolveModelForProvider("overlay", providerKind),
  ]);
}

function premiumSynthesisModels(providerKind: OpenAIProviderKind): string[] {
  return uniqueModels([
    resolveModelForProvider("premium", providerKind),
    resolveModelForProvider("deep", providerKind),
    resolveModelForProvider("overlay", providerKind),
  ]);
}

function premiumEvaluationModels(providerKind: OpenAIProviderKind): string[] {
  return uniqueModels([
    resolveModelForProvider("standard", providerKind),
    resolveModelForProvider("overlay", providerKind),
  ]);
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

function extractJSON<T>(raw: string, context: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No JSON found in ${context} response`);
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      console.error(`Invalid JSON in ${context}:`, match[0].slice(0, 500));
      throw new Error(`Invalid JSON in ${context} response`);
    }
  }
}

// ─── Deep sections (o3) ───────────────────────────────────────────────────────

export type DeepAnalysisResult = Pick<
  StructuredReport,
  "company_swot" | "role_swot" | "strategic_bet_analysis" | "why_role_exists_now" | "risks_red_flags"
>;

export async function generateDeepAnalysis(
  prompt: string
): Promise<{ data: DeepAnalysisResult; usage: LLMCallUsage }> {
  return executeWithOpenAIProviders({
    operationName: "generateDeepAnalysis",
    getModels: deepAnalysisModels,
    execute: async ({ client, model }) => {
      const isReasoningModel = model.startsWith("o");
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        // Reasoning models use max_completion_tokens; standard models use max_tokens
        ...(isReasoningModel
          ? { max_completion_tokens: 8000 }
          : { max_tokens: 6000, temperature: 0.4 }),
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from deep analysis model");

      return {
        data: extractJSON<DeepAnalysisResult>(content, "deep analysis"),
        usage: buildUsage(model, "Deep Analysis (SWOT + Strategy)", response.usage),
      };
    },
  });
}

// ─── Interview layer (gpt-4o-mini) ───────────────────────────────────────────

export type InterviewLayerResult = Pick<
  StructuredReport,
  | "company_overview"
  | "mission_vision_leadership"
  | "executive_summary"
  | "assessment_snapshot"
  | "likely_interview_agenda"
  | "questions_to_ask"
  | "unknowns_to_validate"
  | "company_snapshot"
  | "role_snapshot"
  | "interview_decision_summary"
  | "five_minute_brief"
  | "evidence_contract"
>;

export async function generateInterviewLayer(
  prompt: string
): Promise<{ data: InterviewLayerResult; usage: LLMCallUsage }> {
  return executeWithOpenAIProviders({
    operationName: "generateInterviewLayer",
    getModels: (providerKind) => [resolveModelForProvider("standard", providerKind)],
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a structured intelligence engine. Return only valid JSON matching the requested schema. Never include markdown fences or any text outside the JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 7000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from interview layer model");

      return {
        data: extractJSON<InterviewLayerResult>(content, "interview layer"),
        usage: buildUsage(model, "Interview Layer (prep sections)", response.usage),
      };
    },
  });
}

// ─── Candidate overlay (gpt-4o) ───────────────────────────────────────────────

export async function generateCandidateOverlay(
  prompt: string
): Promise<{ data: CandidateOverlayData; usage: LLMCallUsage }> {
  return executeWithOpenAIProviders({
    operationName: "generateCandidateOverlay",
    getModels: (providerKind) => [resolveModelForProvider("overlay", providerKind)],
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an executive career coach and interview strategist. Return only valid JSON matching the requested schema. Never include markdown fences or any text outside the JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from overlay model");

      return {
        data: extractJSON<CandidateOverlayData>(content, "candidate overlay"),
        usage: buildUsage(model, "Candidate Overlay (personalization)", response.usage),
      };
    },
  });
}

export async function generatePremiumReport(
  prompt: string
): Promise<{ data: PremiumReportModelOutput; usage: LLMCallUsage }> {
  return executeWithOpenAIProviders({
    operationName: "generatePremiumReport",
    getModels: premiumSynthesisModels,
    execute: async ({ client, model }) => {
      const isReasoningModel = model.startsWith("o");
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a premium interview-intelligence engine. Return only valid JSON that matches the requested schema. Never include markdown fences or extra prose.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        ...(isReasoningModel
          ? { max_completion_tokens: 14000 }
          : { max_tokens: 8000, temperature: 0.35 }),
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from premium report model");
      }

      return {
        data: extractJSON<PremiumReportModelOutput>(content, "premium report"),
        usage: buildUsage(model, "Premium Report Synthesis", response.usage),
      };
    },
  });
}

export async function generatePremiumEvaluation(
  prompt: string
): Promise<{ data: PremiumEvaluationModelOutput; usage: LLMCallUsage }> {
  return executeWithOpenAIProviders({
    operationName: "generatePremiumEvaluation",
    getModels: premiumEvaluationModels,
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are the strict internal reviewer for a premium interview-intelligence product. Return only valid JSON matching the requested schema. Never include markdown fences or extra prose.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from premium evaluation model");
      }

      return {
        data: extractJSON<PremiumEvaluationModelOutput>(content, "premium evaluation"),
        usage: buildUsage(model, "Premium Quality Evaluation", response.usage),
      };
    },
  });
}

// ─── Legacy (kept for any remaining callers) ──────────────────────────────────

/** @deprecated Use generateDeepAnalysis + generateInterviewLayer instead */
export async function generateFullReport(prompt: string): Promise<StructuredReport> {
  return executeWithOpenAIProviders({
    operationName: "generateFullReport",
    getModels: (providerKind) => [resolveModelForProvider("legacyStructured", providerKind)],
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a structured intelligence engine. You return only valid JSON matching the requested schema. Never include markdown fences or any text outside the JSON object.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 6000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from LLM");
      return extractJSON<StructuredReport>(content, "full report");
    },
  });
}

export async function generateStructuredCompletion(
  prompt: string,
  _jsonSchema?: Record<string, any>
): Promise<any> {
  return executeWithOpenAIProviders({
    operationName: "generateStructuredCompletion",
    getModels: (providerKind) => [resolveModelForProvider("legacyStructured", providerKind)],
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are a business analysis engine. Respond with valid JSON only. Do not fabricate details.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content in response");
      return extractJSON(content, "structured completion");
    },
  });
}

export async function generateText(prompt: string): Promise<string> {
  return executeWithOpenAIProviders({
    operationName: "generateText",
    getModels: (providerKind) => [resolveModelForProvider("legacyText", providerKind)],
    execute: async ({ client, model }) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are a business analysis engine. Be concise, grounded, and honest.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      });

      return response.choices[0].message.content || "";
    },
  });
}

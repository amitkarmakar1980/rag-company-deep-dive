import { executeWithOpenAIProviders, resolveModelForProvider } from "@/lib/ai/openaiClient";
import type { LLMCallUsage } from "@/lib/types";
import type { CompanyDeepDiveV3, CompanyDeepDiveEvaluation } from "./schema";

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

function buildUsage(
  model: string,
  purpose: string,
  usage: { prompt_tokens?: number; completion_tokens?: number } | undefined
): LLMCallUsage {
  const PRICING: Record<string, { input: number; output: number }> = {
    "o4-mini":     { input: 1.10, output: 4.40 },
    o3:            { input: 10.00, output: 40.00 },
    "gpt-4o":      { input: 2.50, output: 10.00 },
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
  };
  const input = usage?.prompt_tokens ?? 0;
  const output = usage?.completion_tokens ?? 0;
  const p = PRICING[model] ?? { input: 5, output: 15 };
  return {
    model,
    purpose,
    input_tokens: input,
    output_tokens: output,
    estimated_cost_usd: parseFloat(
      ((input / 1_000_000) * p.input + (output / 1_000_000) * p.output).toFixed(6)
    ),
  };
}

export async function generateCompanyDeepDive(
  prompt: string
): Promise<{ data: CompanyDeepDiveV3; usage: LLMCallUsage }> {
  return executeWithOpenAIProviders({
    operationName: "generateCompanyDeepDiveV3",
    getModels: (providerKind) => {
      const models = [
        resolveModelForProvider("premium", providerKind),
        resolveModelForProvider("deep", providerKind),
      ];
      return Array.from(new Set(models.filter(Boolean)));
    },
    execute: async ({ client, model }) => {
      const isReasoningModel = model.startsWith("o");
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a premium company intelligence engine. Your output is company analysis only — no interview coaching, no candidate evaluation, no role-fit analysis. Return only valid JSON that matches the requested schema. Never include markdown fences or any text outside the JSON object.",
          },
          { role: "user", content: prompt },
        ],
        ...(isReasoningModel
          ? { max_completion_tokens: 28000 }
          : { max_tokens: 16000, temperature: 0.3 }),
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from company deep dive model");

      return {
        data: extractJSON<CompanyDeepDiveV3>(content, "company deep dive v3"),
        usage: buildUsage(model, "Company Deep Dive V3 Synthesis", response.usage),
      };
    },
  });
}

export async function evaluateCompanyDeepDive(
  prompt: string
): Promise<{ data: CompanyDeepDiveEvaluation; usage: LLMCallUsage }> {
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

      return {
        data: extractJSON<CompanyDeepDiveEvaluation>(content, "company deep dive evaluation"),
        usage: buildUsage(model, "Company Deep Dive V3 Quality Gate", response.usage),
      };
    },
  });
}

import OpenAI from "openai";
import { StructuredReport, CandidateOverlayData } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate the full structured report in a single LLM call.
 * Returns a parsed StructuredReport or throws on failure.
 */
export async function generateFullReport(prompt: string): Promise<StructuredReport> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a structured intelligence engine. You return only valid JSON matching the requested schema. Never include markdown fences or any text outside the JSON object.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
    max_tokens: 6000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response from LLM");

  // Strip any accidental markdown fences
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: StructuredReport;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try extracting outermost JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("No JSON found in response:", cleaned.slice(0, 500));
      throw new Error("Could not extract JSON from LLM response");
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch (e2) {
      console.error("Failed to parse extracted JSON:", match[0].slice(0, 500));
      throw new Error("Invalid JSON in LLM response");
    }
  }

  return parsed;
}

/**
 * Generate the candidate overlay (personalization layer) from resume + role context.
 * This is a separate, lighter LLM call that does NOT redo company/role analysis.
 */
export async function generateCandidateOverlay(prompt: string): Promise<CandidateOverlayData> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
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
  if (!content) throw new Error("Empty response from LLM");

  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned) as CandidateOverlayData;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in overlay response");
    return JSON.parse(match[0]) as CandidateOverlayData;
  }
}

/**
 * Legacy: structured completion for individual section prompts.
 * Still used by older code paths during transition.
 */
export async function generateStructuredCompletion(
  prompt: string,
  _jsonSchema?: Record<string, any>
): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a business analysis engine. Respond with valid JSON only. Do not fabricate details.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.5,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content in response");

  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not extract JSON from LLM response");

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Invalid JSON in LLM response");
  }
}

export async function generateText(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
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
}

import { fetchPageWithFirecrawl } from "./firecrawl";
import { generateStructuredCompletion } from "@/lib/ai/openai";

/**
 * Attempts to extract job details from a job description page using Firecrawl.
 * Tries to parse out company name, role title, and job description from the content/metadata.
 */
export async function fetchAndExtractJobDetails(
  url: string
): Promise<{
  companyName?: string;
  roleTitle?: string;
  companyUrl?: string;
  jobDescription?: string;
} | null> {
  const res = await fetchPageWithFirecrawl(url);
  if (!res.success || !res.data) return null;

    const { markdown, html } = res.data;
    let rawText = (markdown && typeof markdown === 'string' && markdown.length > 100)
      ? markdown
      : (typeof html === 'string' && html.length > 100 ? html : undefined);
    if (!rawText) return null;

    // Clean the extracted text
    let cleanedText = cleanContent(rawText);
    // Truncate to 10,000 characters (approx. 3,000 tokens)
    if (cleanedText.length > 10000) {
      cleanedText = cleanedText.slice(0, 10000);
    }

    // LOGGING: Output the cleaned and truncated text and prompt to the server console
    console.log("[JD Extraction] Cleaned & truncated text for LLM:", cleanedText.slice(0, 1000));
    const prompt = `Extract the following fields from the job description below. Respond ONLY with valid JSON in this format:\n{\n  "companyName": string, // company name\n  "roleTitle": string, // job title\n  "companyUrl": string, // company website (if present)\n  "jobDescription": string // full job description text\n}\n\nJob Description:\n"""\n${cleanedText}\n"""`;
    console.log("[JD Extraction] LLM prompt:", prompt.slice(0, 1000));

  try {
    const result = await generateStructuredCompletion(prompt);
    // Fallback: add companyUrl from URL if missing
    if (!result.companyUrl) {
      try {
        const u = new URL(url);
        result.companyUrl = u.origin;
      } catch {}
    }
    // Always include the full job description text
      // Always include the cleaned and truncated job description text
      result.jobDescription = cleanedText;
    return result;
  } catch (e) {
    console.error("[JD Extraction] LLM extraction failed", e);
    return null;
  }
}

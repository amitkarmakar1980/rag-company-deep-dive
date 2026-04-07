import { fetchPageWithFirecrawl } from "./firecrawl";
import { generateStructuredCompletion } from "@/lib/ai/openai";
import { cleanContent } from "./clean";

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
  let rawText =
    markdown && typeof markdown === "string" && markdown.length > 100
      ? markdown
      : typeof html === "string" && html.length > 100
      ? html
      : undefined;
  if (!rawText) return null;

  // Clean the extracted text
  let cleanedText = cleanContent(rawText);

  // Remove leading JSON blobs or boilerplate
  cleanedText = cleanedText.replace(/^(\s*`?\{[\s\S]+?\}`?\s*)+/g, "");

  // Try to start from the first job description heading
  const jobDescMatch = cleanedText.match(
    /(Job description|Overview|Responsibilities|Role|About the job|Position summary|^#\s*Job|^##\s*Job)/i
  );
  if (jobDescMatch && jobDescMatch.index !== undefined) {
    cleanedText = cleanedText.slice(jobDescMatch.index);
  }

  // Truncate to 10,000 characters (~3,000 tokens)
  if (cleanedText.length > 10000) {
    cleanedText = cleanedText.slice(0, 10000);
  }

  try {
    // Use LLM to extract company name and role title from the page text
    const extracted = await generateStructuredCompletion(
      `Extract the company name and role title from this job posting text. Return only valid JSON.

Text:
${cleanedText}

Return JSON with this shape:
{
  "companyName": "...",
  "roleTitle": "..."
}

If you cannot confidently determine a value, omit that field.`
    );

    const result: {
      companyName?: string;
      roleTitle?: string;
      companyUrl?: string;
      jobDescription?: string;
    } = {
      companyName: extracted?.companyName || undefined,
      roleTitle: extracted?.roleTitle || undefined,
      jobDescription: cleanedText,
    };

    try {
      const u = new URL(url);
      result.companyUrl = u.origin;
    } catch {
      // URL parsing failed — companyUrl stays undefined
    }

    return result;
  } catch (e) {
    console.error("[JD Extraction] LLM extraction failed", e);
    // Return what we can without LLM-extracted fields
    try {
      const u = new URL(url);
      return { companyUrl: u.origin, jobDescription: cleanedText };
    } catch {
      return { jobDescription: cleanedText };
    }
  }
}

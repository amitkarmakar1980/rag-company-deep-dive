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

  let cleanedText: string;

  if (markdown && typeof markdown === "string" && markdown.length > 100) {
    // Markdown path: strip markdown syntax but preserve structure and newlines
    cleanedText = markdown
      // Remove code fences
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]*`/g, "")
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // Remove links but keep text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Strip heading markers (#, ##, etc.) but keep text
      .replace(/^#{1,6}\s+/gm, "")
      // Strip bold/italic markers
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // Strip blockquotes
      .replace(/^>\s+/gm, "")
      // Collapse 3+ consecutive blank lines to 2
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else if (typeof html === "string" && html.length > 100) {
    // HTML path: use the HTML cleaner
    cleanedText = cleanContent(html);
  } else {
    return null;
  }

  if (!cleanedText) return null;

  // Remove leading JSON blobs or boilerplate
  cleanedText = cleanedText.replace(/^(\s*`?\{[\s\S]+?\}`?\s*)+/g, "");

  // Try to start from the first job description heading
  const jobDescMatch = cleanedText.match(
    /(Job description|Overview|Responsibilities|Role|About the job|Position summary|Job Title)/i
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

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
    let rawText = (markdown && typeof markdown === 'string' && markdown.length > 100)
      ? markdown
      : (typeof html === 'string' && html.length > 100 ? html : undefined);
    if (!rawText) return null;

      // Clean the extracted text
      let cleanedText = cleanContent(rawText);

      // Remove leading JSON blobs or boilerplate before the real job description
      // This will remove any leading lines that look like JSON objects or arrays
      cleanedText = cleanedText.replace(/^(\s*`?\{[\s\S]+?\}`?\s*)+/g, "");

      // Try to find the first occurrence of a job description heading
      const jobDescMatch = cleanedText.match(/(Job description|Overview|Responsibilities|Role|About the job|Position summary|^#\s*Job|^##\s*Job)/i);
      if (jobDescMatch && jobDescMatch.index !== undefined) {
        cleanedText = cleanedText.slice(jobDescMatch.index);
      }

      // Truncate to 10,000 characters (approx. 3,000 tokens)
      if (cleanedText.length > 10000) {
        cleanedText = cleanedText.slice(0, 10000);
      }
      // Remove leading JSON blobs or boilerplate before the real job description
      // This will remove any leading lines that look like JSON objects or arrays
      cleanedText = cleanedText.replace(/^(\s*`?\{[\s\S]+?\}`?\s*)+/g, "");
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

import { fetchAndExtractJobDetails } from "./firecrawlJobExtract";

/**
 * Attempts to extract job details (companyName, roleTitle, companyUrl, jobDescription)
 * from a public job description URL using Firecrawl or fallback logic.
 */
export async function extractJobDetailsFromUrl(url: string): Promise<{
  companyName?: string;
  roleTitle?: string;
  companyUrl?: string;
  jobDescription?: string;
} | null> {
  try {
    console.log("[extractJobDetailsFromUrl] Starting extraction for URL:", url);
    const result = await fetchAndExtractJobDetails(url);
    if (!result) {
      console.log("[extractJobDetailsFromUrl] fetchAndExtractJobDetails returned null for URL:", url);
      return null;
    }
    console.log("[extractJobDetailsFromUrl] Extraction result:", result);
    return result;
  } catch (e) {
    console.error("[extractJobDetailsFromUrl] Exception during extraction for URL:", url, e);
    return null;
  }
}

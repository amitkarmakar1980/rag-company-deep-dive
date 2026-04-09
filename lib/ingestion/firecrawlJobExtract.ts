import { fetchPageWithFirecrawl } from "./firecrawl";
import { generateStructuredCompletion } from "@/lib/ai/openai";
import { cleanContent } from "./clean";

/**
 * Fetches a job posting URL and extracts company name, role title, and full
 * job description text. Uses Firecrawl with onlyMainContent=true, then strips
 * residual markdown syntax before sending to the LLM extractor.
 */
export async function fetchAndExtractJobDetails(
  url: string
): Promise<{
  companyName?: string;
  roleTitle?: string;
  companyUrl?: string;
  jobDescription?: string;
} | null> {
  const res = await fetchPageWithFirecrawl(url, { onlyMainContent: true, timeoutMs: 60000 });
  if (!res.success || !res.data) return null;

  const { markdown, html } = res.data;

  let rawText: string;

  if (markdown && markdown.length > 200) {
    rawText = stripMarkdown(markdown);
  } else if (html && html.length > 200) {
    rawText = cleanContent(html);
  } else {
    console.warn("[JD Extraction] Both markdown and html too short — cannot extract");
    return null;
  }

  rawText = rawText.trim();
  if (!rawText) return null;

  console.log(`[JD Extraction] Raw text length: ${rawText.length} chars`);

  // Remove obvious leading boilerplate (cookie banners, login walls, etc.)
  rawText = removeLeadingBoilerplate(rawText);

  // Cap at 25k chars — most JDs are well under this; LLM context allows it
  const textForLLM = rawText.length > 25000 ? rawText.slice(0, 25000) : rawText;

  try {
    const extracted = await generateStructuredCompletion(`You are extracting structured data from a job posting page.

Extract the following from the text below:
1. companyName — the name of the hiring company (not a job board like LinkedIn, Indeed, etc.)
2. roleTitle — the exact job title for this specific role
3. jobDescription — the FULL job description text: all responsibilities, requirements,
   qualifications, about-the-team sections, and any other role-specific content.
   Include everything that describes the role. Do NOT include company boilerplate,
   cookie notices, navigation menus, or repeated site-wide content.

Text:
${textForLLM}

Return ONLY valid JSON with this shape:
{
  "companyName": "...",
  "roleTitle": "...",
  "jobDescription": "..."
}

If you cannot determine a field, omit it. The jobDescription field should be comprehensive — do not truncate it.`
    );

    if (!extracted) return fallbackResult(url, rawText);

    const jobDescription: string =
      extracted.jobDescription?.trim() ||
      // If LLM didn't extract a JD, use the cleaned raw text as fallback
      rawText.slice(0, 15000);

    console.log(`[JD Extraction] Extracted JD length: ${jobDescription.length} chars`);

    return {
      companyName: extracted.companyName || undefined,
      roleTitle: extracted.roleTitle || undefined,
      jobDescription: jobDescription || undefined,
      companyUrl: safeOrigin(url),
    };
  } catch (e) {
    console.error("[JD Extraction] LLM call failed:", e);
    return fallbackResult(url, rawText);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip markdown syntax while preserving text and newlines. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")           // code fences
    .replace(/`[^`\n]*`/g, "")                // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")          // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → text
    .replace(/^#{1,6}\s+/gm, "")             // heading markers
    .replace(/(\*\*|__)(.*?)\1/g, "$2")      // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")         // italic
    .replace(/^>\s+/gm, "")                  // blockquotes
    .replace(/^[-*+]\s+/gm, "")             // unordered list markers
    .replace(/^\d+\.\s+/gm, "")             // ordered list markers
    .replace(/\n{3,}/g, "\n\n")             // collapse blank lines
    .trim();
}

/**
 * Remove leading boilerplate that appears before the actual job content.
 * Only removes if clearly nav/cookie/login content — stops at first substantive line.
 */
function removeLeadingBoilerplate(text: string): string {
  const boilerplatePatterns = [
    /^(accept|reject|manage)\s+(cookies?|preferences)/i,
    /^(sign in|log in|create account|register)/i,
    /^(skip to|jump to)\s+(main|content|navigation)/i,
    /^(menu|navigation|home|about|careers|jobs)\s*$/im,
  ];

  const lines = text.split("\n");
  let startIdx = 0;

  // Skip leading lines that look like boilerplate (max 20 lines)
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (boilerplatePatterns.some((p) => p.test(line))) {
      startIdx = i + 1;
    } else if (line.length > 60) {
      // Hit a substantive line — stop scanning
      break;
    }
  }

  return lines.slice(startIdx).join("\n").trim();
}

function fallbackResult(url: string, rawText: string) {
  return {
    companyUrl: safeOrigin(url),
    jobDescription: rawText.slice(0, 15000) || undefined,
  };
}

function safeOrigin(url: string): string | undefined {
  try { return new URL(url).origin; } catch { return undefined; }
}

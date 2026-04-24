import { fetchPageWithFirecrawl } from "./firecrawl";
import { generateStructuredCompletion } from "@/lib/ai/openai";
import { cleanContent } from "./clean";

interface ExtractedJobPostingSchema {
  companyName?: string;
  roleTitle?: string;
  companyUrl?: string;
  department?: string;
  employmentType?: string;
  locations: string[];
  applyUrl?: string;
  descriptionText?: string;
}

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
  extractionWarning?: string;
} | null> {
  const res = await fetchPageWithFirecrawl(url, { onlyMainContent: true, timeoutMs: 60000 });
  if (!res.success || !res.data) {
    return fallbackResult(url, undefined, "Could not reliably extract job details from this page. You can still review and edit the fields manually.");
  }

  const { markdown, html, metadata } = res.data;
  const structuredPosting = html ? extractJobPostingSchemaFromHtml(html, url) : null;

  let rawText: string;

  if (structuredPosting?.descriptionText) {
    rawText = structuredPosting.descriptionText;
  } else if (markdown && markdown.length > 200) {
    rawText = stripMarkdown(markdown);
  } else if (html && html.length > 200) {
    rawText = cleanContent(html);
  } else {
    console.warn("[JD Extraction] Both markdown and html too short — cannot extract");
    return fallbackResult(url, undefined, "The page did not expose enough readable content to extract structured job details.");
  }

  rawText = rawText.trim();
  if (!rawText) {
    return fallbackResult(url, undefined, "The page content was empty after cleaning, so job details could not be extracted automatically.");
  }

  console.log(`[JD Extraction] Raw text length: ${rawText.length} chars`);

  // Remove obvious leading boilerplate (cookie banners, login walls, etc.)
  rawText = removeLeadingBoilerplate(rawText);
  rawText = normalizeExtractedJobText(rawText);

  const canonicalJobDescription = buildCanonicalJobDescription({
    rawText,
    structuredPosting,
  }).slice(0, 20000);

  const needsMetadataExtraction = !structuredPosting?.companyName || !structuredPosting?.roleTitle;
  const textForLLM = canonicalJobDescription.length > 8000 ? canonicalJobDescription.slice(0, 8000) : canonicalJobDescription;
  const metadataContext = [
    structuredPosting?.roleTitle,
    metadata?.title,
    structuredPosting?.department,
    structuredPosting?.locations.length ? structuredPosting.locations.join(" | ") : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const extracted = needsMetadataExtraction
      ? await generateStructuredCompletion(`You are extracting job posting metadata from a job posting page.

Extract the following from the text below:
1. companyName — the name of the hiring company (not a job board like LinkedIn, Indeed, etc.)
2. roleTitle — the exact job title for this specific role

Candidate header context:
${metadataContext || "NONE"}

Page URL:
${url}

Text:
${textForLLM}

Return ONLY valid JSON with this shape:
{
  "companyName": "...",
  "roleTitle": "..."
}

If you cannot determine a field, omit it.`)
      : null;

    const companyName = structuredPosting?.companyName || extracted?.companyName || inferCompanyNameFromUrl(url);
    const roleTitle = structuredPosting?.roleTitle || extracted?.roleTitle || inferRoleTitleFromUrl(url) || inferRoleTitleFromMetadata(metadata?.title);
    const companyUrl = deriveCompanyHomepageUrl(url, structuredPosting?.companyUrl);

    console.log(`[JD Extraction] Extracted JD length: ${canonicalJobDescription.length} chars`);

    return {
      companyName: companyName || undefined,
      roleTitle: roleTitle || undefined,
      jobDescription: canonicalJobDescription || undefined,
      companyUrl,
      extractionWarning: undefined,
    };
  } catch (e) {
    console.error("[JD Extraction] LLM call failed:", e);
    const fallbackCompanyName = structuredPosting?.companyName || inferCompanyNameFromUrl(url);
    return {
      companyName: fallbackCompanyName,
      roleTitle: structuredPosting?.roleTitle || inferRoleTitleFromUrl(url) || inferRoleTitleFromMetadata(metadata?.title),
      companyUrl: deriveCompanyHomepageUrl(url, structuredPosting?.companyUrl),
      jobDescription: canonicalJobDescription || undefined,
      extractionWarning: "The page loaded, but structured extraction failed. Review the fallback details before generating the report.",
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip markdown syntax while preserving text and newlines. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")           // code fences
    .replace(/`[^`\n]*`/g, "")                // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")          // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → text
    .replace(/^#{1,6}\s+/gm, "")             // heading markers
    .replace(/(\*\*|__)(.*?)\1/g, "$2")      // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")         // italic
    .replace(/^>\s+/gm, "")                  // blockquotes
    .replace(/^[-*+]\s+/gm, "• ")            // unordered list markers
    .replace(/^(\d+)\.\s+/gm, "$1. ")       // ordered list markers
    .replace(/\n{3,}/g, "\n\n")             // collapse blank lines
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'");
}

function cleanJobPostingHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6])>/gi, "\n\n")
      .replace(/<\/(div|section|article|header|footer|ul|ol|table|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, "")
  );
}

export function normalizeExtractedJobText(text: string): string {
  const normalizedLines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => !(line && index > 0 && line === lines[index - 1]));

  return normalizedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry));
  }

  return [];
}

function stringifyAddress(address: Record<string, unknown> | undefined): string | undefined {
  if (!address) {
    return undefined;
  }

  const locality = typeof address.addressLocality === "string" ? address.addressLocality.trim() : "";
  const region = typeof address.addressRegion === "string" ? address.addressRegion.trim() : "";
  const country = typeof address.addressCountry === "string" ? address.addressCountry.trim() : "";
  const parts = [locality, region, country && country.length <= 3 ? "" : country].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function normalizeEmploymentType(value: unknown): string | undefined {
  const options = collectStringValues(value);
  return options.length ? options.join(" | ") : undefined;
}

function normalizeDepartment(jobPosting: Record<string, unknown>): string | undefined {
  const values = [
    ...collectStringValues(jobPosting.department),
    ...collectStringValues(jobPosting.occupationalCategory),
  ].filter((value, index, list) => list.indexOf(value) === index);

  return values.length ? values.join(", ") : undefined;
}

function extractLocations(jobLocation: unknown): string[] {
  if (Array.isArray(jobLocation)) {
    return jobLocation.flatMap((entry) => extractLocations(entry));
  }

  if (typeof jobLocation !== "object" || jobLocation === null) {
    return [];
  }

  const candidate = jobLocation as Record<string, unknown>;
  const directAddress = stringifyAddress(candidate.address as Record<string, unknown> | undefined);
  const nestedLocations = extractLocations(candidate.jobLocation);

  return [directAddress, ...nestedLocations]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, list) => list.indexOf(value) === index);
}

function findApplyUrl(html: string, pageUrl: string): string | undefined {
  const hrefMatch = html.match(/href=["']([^"']*apply[^"']*)["']/i);
  if (!hrefMatch?.[1]) {
    return undefined;
  }

  try {
    return new URL(hrefMatch[1], pageUrl).toString();
  } catch {
    return undefined;
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function hasJobPostingType(value: unknown): boolean {
  if (typeof value === "string") {
    return value === "JobPosting";
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasJobPostingType(entry));
  }

  return false;
}

function findJobPostingNode(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findJobPostingNode(entry);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  if (hasJobPostingType(candidate["@type"])) {
    return candidate;
  }

  if (candidate["@graph"]) {
    return findJobPostingNode(candidate["@graph"]);
  }

  for (const nestedValue of Object.values(candidate)) {
    const match = findJobPostingNode(nestedValue);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function extractJobPostingSchemaFromHtml(html: string, pageUrl = "https://example.com"): ExtractedJobPostingSchema | null {
  const scriptMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scriptMatches) {
    const parsed = safeParseJson(match[1]);
    const jobPosting = findJobPostingNode(parsed);
    if (!jobPosting) {
      continue;
    }

    const description = typeof jobPosting.description === "string" ? cleanJobPostingHtml(jobPosting.description) : undefined;
    const hiringOrganization = typeof jobPosting.hiringOrganization === "object" && jobPosting.hiringOrganization !== null
      ? jobPosting.hiringOrganization as Record<string, unknown>
      : undefined;

    return {
      companyName: typeof hiringOrganization?.name === "string" ? hiringOrganization.name.trim() : undefined,
      companyUrl: firstValidUrl([
        ...collectStringValues(hiringOrganization?.sameAs),
        ...collectStringValues(hiringOrganization?.url),
      ]),
      roleTitle: typeof jobPosting.title === "string" ? jobPosting.title.trim() : undefined,
      department: normalizeDepartment(jobPosting),
      employmentType: normalizeEmploymentType(jobPosting.employmentType),
      locations: extractLocations(jobPosting.jobLocation),
      applyUrl: findApplyUrl(html, pageUrl),
      descriptionText: description ? normalizeExtractedJobText(description) : undefined,
    };
  }

  return null;
}

function includesNormalizedLine(haystack: string, needle: string): boolean {
  const normalizedHaystack = haystack.toLowerCase();
  const normalizedNeedle = needle.trim().toLowerCase();
  return normalizedNeedle.length > 0 && normalizedHaystack.includes(normalizedNeedle);
}

export function buildCanonicalJobDescription(args: {
  rawText: string;
  structuredPosting?: ExtractedJobPostingSchema | null;
}): string {
  const body = normalizeExtractedJobText(args.rawText);
  const headerLines: string[] = [];
  const topOfBody = body.split("\n").slice(0, 12).join("\n");

  const pushHeaderLine = (line: string | undefined) => {
    if (!line) {
      return;
    }

    if (includesNormalizedLine(topOfBody, line)) {
      return;
    }

    headerLines.push(line);
  };

  pushHeaderLine(args.structuredPosting?.roleTitle);
  pushHeaderLine(args.structuredPosting?.department);
  pushHeaderLine(args.structuredPosting?.locations.length ? args.structuredPosting.locations.join("   |   ") : undefined);
  pushHeaderLine(args.structuredPosting?.employmentType);
  pushHeaderLine(args.structuredPosting?.applyUrl ? "Apply Now" : undefined);

  if (headerLines.length === 0) {
    return body;
  }

  return `${headerLines.join("\n")}\n\n${body}`.trim();
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

function fallbackResult(url: string, rawText?: string, extractionWarning?: string) {
  const companyName = inferCompanyNameFromUrl(url);
  return {
    companyName,
    roleTitle: inferRoleTitleFromUrl(url),
    companyUrl: deriveCompanyHomepageUrl(url, undefined),
    jobDescription: rawText?.slice(0, 20000) || undefined,
    extractionWarning,
  };
}

function firstValidUrl(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    try {
      return new URL(candidate).toString();
    } catch {
      continue;
    }
  }

  return undefined;
}

function deriveCompanyHomepageUrl(jobUrl: string, structuredCompanyUrl?: string): string | undefined {
  const normalizedStructured = firstValidUrl(structuredCompanyUrl ? [structuredCompanyUrl] : []);
  if (normalizedStructured && !isRecruitingHost(normalizedStructured)) {
    return normalizedStructured;
  }

  try {
    const parsed = new URL(jobUrl);
    const inferredHomepage = deriveHomepageFromJobHost(parsed);
    if (inferredHomepage) {
      return inferredHomepage;
    }
  } catch {
    return normalizedStructured ?? undefined;
  }

  return normalizedStructured ?? undefined;
}

function deriveHomepageFromJobHost(parsedJobUrl: URL): string | undefined {
  const hostname = parsedJobUrl.hostname.toLowerCase().replace(/^www\./, "");
  const labels = hostname.split(".").filter(Boolean);

  if (labels.length < 3) {
    return undefined;
  }

  const recruitingPrefixes = new Set(["careers", "career", "jobs", "job", "apply", "join", "talent", "work", "workwithus"]);
  if (!recruitingPrefixes.has(labels[0])) {
    return undefined;
  }

  const apexDomain = labels.slice(-2).join(".");
  const blockedApexDomains = new Set([
    "greenhouse.io",
    "greenhouse-job-boards.com",
    "lever.co",
    "myworkdayjobs.com",
    "ashbyhq.com",
    "smartrecruiters.com",
    "jobvite.com",
    "breezy.hr",
  ]);

  if (blockedApexDomains.has(apexDomain)) {
    return undefined;
  }

  return `https://${apexDomain}/`;
}

function isRecruitingHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname === "careers.microsoft.com" ||
      hostname.endsWith(".careers.microsoft.com") ||
      hostname.endsWith("greenhouse.io") ||
      hostname.endsWith("greenhouse-job-boards.com") ||
      hostname.endsWith("lever.co") ||
      hostname.endsWith("myworkdayjobs.com") ||
      hostname.endsWith("ashbyhq.com")
    );
  } catch {
    return false;
  }
}

function inferRoleTitleFromMetadata(title: string | undefined): string | undefined {
  if (!title) {
    return undefined;
  }

  const cleaned = title
    .replace(/\s*[|\-:]\s*(careers?|jobs?|job search).*$/i, "")
    .replace(/\s*[|\-:]\s*uber.*$/i, "")
    .trim();

  return cleaned.length >= 3 ? cleaned : undefined;
}

function inferCompanyNameFromUrl(url: string): string | undefined {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    const baseLabel = hostname.split(".")[0];
    if (!baseLabel || /^(jobs|boards|careers|greenhouse|lever)$/i.test(baseLabel)) {
      return undefined;
    }

    return baseLabel
      .split(/[-_]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  } catch {
    return undefined;
  }
}

function inferRoleTitleFromUrl(url: string): string | undefined {
  try {
    const pathname = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
    const segments = pathname.split("/").filter(Boolean).reverse();
    const candidate = segments.find((segment) => /[a-z]/i.test(segment) && !/^jobs?$|^job$|^careers?$|^positions?$|^openings?$|^en-us$/i.test(segment));
    if (!candidate) {
      return undefined;
    }

    const normalized = decodeURIComponent(candidate)
      .replace(/[-_]+/g, " ")
      .replace(/\b\d+\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized || normalized.length < 3) {
      return undefined;
    }

    return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
  } catch {
    return undefined;
  }
}


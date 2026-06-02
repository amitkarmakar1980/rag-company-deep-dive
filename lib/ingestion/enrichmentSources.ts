/**
 * enrichmentSources.ts
 *
 * Fetchers for high/medium-priority external enrichment platforms:
 *   - LinkedIn (company page, leadership, posts)
 *   - Glassdoor (reviews, salary bands)
 *   - Levels.fyi (comp benchmarks, leveling)
 *   - Built In (culture, benefits, tech stack)
 *   - Indeed (company reviews, recent job postings)
 *
 * Each fetcher uses Firecrawl /search and /scrape with a direct-URL-first
 * strategy and search fallback. Results are returned as raw page content;
 * caching and DB writes are handled by the caller (ingest.ts).
 */

import axios from "axios";
import type { EnrichmentSourceType } from "./sourceCache";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1";
const SCRAPE_TIMEOUT_MS = 30_000;
const SEARCH_TIMEOUT_MS = 45_000;

export interface EnrichmentResult {
  sourceType: EnrichmentSourceType;
  title: string;
  url: string;
  content: string; // cleaned markdown from Firecrawl
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Lowercase, hyphenated slug suitable for most platform URL patterns. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function firecrawlScrape(url: string): Promise<{ content: string; title: string }> {
  if (!FIRECRAWL_API_KEY) return { content: "", title: "" };
  try {
    const res = await axios.post(
      `${FIRECRAWL_BASE_URL}/scrape`,
      { url, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 },
      {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        timeout: SCRAPE_TIMEOUT_MS,
      }
    );
    const payload = res.data?.data ?? res.data ?? {};
    return {
      content: payload.markdown ?? payload.content ?? "",
      title: payload.metadata?.title ?? payload.title ?? "",
    };
  } catch (err) {
    console.warn("[Enrichment] scrape failed:", url, err instanceof Error ? err.message : "");
    return { content: "", title: "" };
  }
}

interface SearchHit {
  url: string;
  content: string;
  title: string;
}

async function firecrawlSearch(query: string, limit = 3): Promise<SearchHit[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const res = await axios.post(
      `${FIRECRAWL_BASE_URL}/search`,
      {
        query,
        limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      },
      {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        timeout: SEARCH_TIMEOUT_MS,
      }
    );
    const hits: any[] = res.data?.data ?? res.data?.results ?? [];
    return hits
      .map((h) => ({
        url: h.url ?? "",
        content: h.markdown ?? h.content ?? "",
        title: h.title ?? h.metadata?.title ?? h.url ?? "",
      }))
      .filter((h) => h.content.length > 150);
  } catch (err) {
    console.warn("[Enrichment] search failed:", query.slice(0, 60), err instanceof Error ? err.message : "");
    return [];
  }
}

function dedupeByUrl(hits: EnrichmentResult[]): EnrichmentResult[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });
}

// ── Per-platform fetchers ────────────────────────────────────────────────────

/**
 * LinkedIn: company about page + recent posts.
 * LinkedIn blocks most scrapers; we try the direct URL then fall back to
 * a Firecrawl search so at least the snippet/preview content is captured.
 */
export async function fetchLinkedIn(companyName: string): Promise<EnrichmentResult[]> {
  const slug = toSlug(companyName);
  const results: EnrichmentResult[] = [];

  // 1. Direct about page
  const aboutUrl = `https://www.linkedin.com/company/${slug}/about/`;
  const about = await firecrawlScrape(aboutUrl);
  if (about.content.length > 200) {
    results.push({
      sourceType: "linkedin_company",
      title: about.title || `LinkedIn: ${companyName} — About`,
      url: aboutUrl,
      content: about.content,
    });
  }

  // 2. Search fallback (also surfaces posts / news)
  const hits = await firecrawlSearch(
    `"${companyName}" company overview employees founded mission site:linkedin.com/company`,
    3
  );
  for (const h of hits) {
    if (!results.some((r) => r.url === h.url)) {
      results.push({
        sourceType: "linkedin_company",
        title: h.title || `LinkedIn: ${companyName}`,
        url: h.url,
        content: h.content,
      });
    }
  }

  return dedupeByUrl(results).slice(0, 3);
}

/**
 * Glassdoor: reviews (culture, leadership, pros/cons) + salary bands.
 * First page is accessible without a login; paywall kicks in after a few reviews.
 */
export async function fetchGlassdoor(companyName: string): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];

  // Reviews
  const reviewHits = await firecrawlSearch(
    `"${companyName}" employee reviews work culture pros cons CEO rating site:glassdoor.com`,
    3
  );
  for (const h of reviewHits) {
    results.push({
      sourceType: "glassdoor_company",
      title: h.title || `Glassdoor: ${companyName} Reviews`,
      url: h.url,
      content: h.content,
    });
  }

  // Salary data (separate search to surface comp signals)
  const salaryHits = await firecrawlSearch(
    `"${companyName}" salary compensation bonus equity total compensation site:glassdoor.com`,
    2
  );
  for (const h of salaryHits) {
    if (!results.some((r) => r.url === h.url)) {
      results.push({
        sourceType: "glassdoor_company",
        title: h.title || `Glassdoor: ${companyName} Salaries`,
        url: h.url,
        content: h.content,
      });
    }
  }

  return dedupeByUrl(results).slice(0, 4);
}

/**
 * Levels.fyi: TC benchmarks, leveling structure, equity data.
 * Useful for understanding comp competitiveness and org seniority distribution.
 */
export async function fetchLevelsFyi(companyName: string): Promise<EnrichmentResult[]> {
  const slug = toSlug(companyName);
  const directUrl = `https://www.levels.fyi/companies/${slug}/`;

  const direct = await firecrawlScrape(directUrl);
  if (direct.content.length > 200) {
    return [
      {
        sourceType: "levels_fyi",
        title: direct.title || `Levels.fyi: ${companyName} Compensation`,
        url: directUrl,
        content: direct.content,
      },
    ];
  }

  // Search fallback
  const hits = await firecrawlSearch(
    `"${companyName}" total compensation salary levels equity RSU site:levels.fyi`,
    2
  );
  return hits.slice(0, 2).map((h) => ({
    sourceType: "levels_fyi" as EnrichmentSourceType,
    title: h.title || `Levels.fyi: ${companyName}`,
    url: h.url,
    content: h.content,
  }));
}

/**
 * Built In: company profile including culture, benefits, tech stack, headcount.
 * Covers both national Built In and regional variants (builtinnyc, builtinseattle, etc.).
 */
export async function fetchBuiltIn(companyName: string): Promise<EnrichmentResult[]> {
  const slug = toSlug(companyName);
  const directUrl = `https://builtin.com/company/${slug}`;

  const direct = await firecrawlScrape(directUrl);
  if (direct.content.length > 200) {
    return [
      {
        sourceType: "built_in",
        title: direct.title || `Built In: ${companyName}`,
        url: directUrl,
        content: direct.content,
      },
    ];
  }

  const hits = await firecrawlSearch(
    `"${companyName}" company culture benefits tech stack perks engineering site:builtin.com`,
    3
  );
  return dedupeByUrl(
    hits.slice(0, 3).map((h) => ({
      sourceType: "built_in" as EnrichmentSourceType,
      title: h.title || `Built In: ${companyName}`,
      url: h.url,
      content: h.content,
    }))
  );
}

/**
 * Indeed: company reviews (culture, management, work-life balance) +
 * recent job postings (reveals active hiring priorities and role scope).
 */
export async function fetchIndeed(companyName: string): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];

  // Company reviews
  const reviewHits = await firecrawlSearch(
    `"${companyName}" company reviews work-life balance management culture site:indeed.com/cmp`,
    3
  );
  for (const h of reviewHits) {
    results.push({
      sourceType: "indeed_company",
      title: h.title || `Indeed: ${companyName} Reviews`,
      url: h.url,
      content: h.content,
    });
  }

  // Recent job postings (signals strategic hiring bets)
  const jobHits = await firecrawlSearch(
    `"${companyName}" jobs product manager engineer hiring 2024 2025 site:indeed.com`,
    2
  );
  for (const h of jobHits) {
    if (!results.some((r) => r.url === h.url)) {
      results.push({
        sourceType: "indeed_company",
        title: h.title || `Indeed: ${companyName} Jobs`,
        url: h.url,
        content: h.content,
      });
    }
  }

  return dedupeByUrl(results).slice(0, 4);
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface EnrichmentFetchPlan {
  sourceType: EnrichmentSourceType;
  label: string;
  fetch: (name: string) => Promise<EnrichmentResult[]>;
}

/** All enrichment sources in priority order. */
export const ENRICHMENT_FETCH_PLAN: EnrichmentFetchPlan[] = [
  { sourceType: "linkedin_company", label: "LinkedIn",   fetch: fetchLinkedIn },
  { sourceType: "glassdoor_company", label: "Glassdoor", fetch: fetchGlassdoor },
  { sourceType: "levels_fyi",        label: "Levels.fyi", fetch: fetchLevelsFyi },
  { sourceType: "built_in",          label: "Built In",  fetch: fetchBuiltIn },
  { sourceType: "indeed_company",    label: "Indeed",    fetch: fetchIndeed },
];

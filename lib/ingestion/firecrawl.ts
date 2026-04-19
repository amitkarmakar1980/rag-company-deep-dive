import axios from "axios";
import { generateStructuredCompletion } from "@/lib/ai/openai";
import { buildPersonaAwareRetrievalQueries, formatPersonaForPrompt, inferPremiumPersona } from "@/lib/report/premiumPersona";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1";
const MIN_EXTERNAL_SITES = 5;
const MAX_RESEARCH_SOURCES = 10;
const FIRECRAWL_BYPASS_WINDOW_MS = 5 * 60 * 1000;
const MAX_RESOLVED_SOURCE_DEPTH = 2;

let firecrawlBypassUntil = 0;

export interface FirecrawlResponse {
  success: boolean;
  data?: {
    content: string;
    markdown: string;
    html: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
    };
  };
  error?: string;
}

export type PlannedSourceType = "company_homepage" | "newsroom" | "blog" | "custom_url";

export interface PlannedSource {
  url: string;
  type: PlannedSourceType;
  priority: number;
  rationale?: string;
  sourceClasses?: string[];
}

interface PlannerCandidate extends PlannedSource {
  label: string;
  domain: string;
  signal: string;
}

export interface RagSourceStrategy {
  goal: string;
  requiredSourceClasses: string[];
  priorityOrder: string[];
  recommendedSources: PlannerCandidate[];
  notes: string[];
}

export interface ResearchPlan {
  strategySummary: string;
  selectedSources: PlannedSource[];
  retrievalQueries: string[];
  sourceStrategy: RagSourceStrategy;
}

export interface ResolvedPlannedSource {
  url: string;
  type: PlannedSourceType;
  priority: number;
  title: string;
  content: string;
}

interface AxiosResolvedPage {
  success: boolean;
  finalUrl: string;
  content?: string;
}

const canonicalResolutionCache = new Map<string, Promise<string>>();

interface FirstPartyDiscoveryRule {
  keywords: string[];
  type: PlannedSourceType;
  priority: number;
  label: string;
  signal: string;
}

const SOURCE_CLASS_TARGET_TERMS: Record<string, string[]> = {
  job_description: ["careers", "job description", "role-context search"],
  product_surfaces: ["product", "pricing", "platform", "blog", "launch", "competitive landscape search", "g2", "capterra"],
  leadership_strategy: ["investor", "leadership", "about", "strategy", "shareholder", "leadership interview"],
  leadership_commentary: ["leadership", "leadership interview", "about", "team", "the org search"],
  investor_materials: ["investor", "shareholder", "earnings", "finance", "crunchbase", "yahoo finance"],
  competitor_positioning: ["competitive", "competitor", "g2", "capterra", "competitive landscape search"],
  technical_context: ["engineering", "developer", "api", "platform", "blog"],
  engineering_docs: ["developer", "api", "docs", "platform"],
  governance_signals: ["leadership", "about", "team", "the org search"],
  external_validation: ["stratechery", "the information", "cb insights", "reuters", "glassdoor", "analysis", "validation"],
};

const FIRST_PARTY_DISCOVERY_RULES: FirstPartyDiscoveryRule[] = [
  {
    keywords: ["career", "careers", "jobs", "job-search", "join-us"],
    type: "custom_url",
    priority: 10,
    label: "Discovered careers page",
    signal: "Homepage-linked careers or job-search page for exact role-context discovery.",
  },
  {
    keywords: ["investor", "shareholder", "earnings", "financial", "annual-report"],
    type: "custom_url",
    priority: 10,
    label: "Discovered investor page",
    signal: "Homepage-linked investor or earnings page for strategy and business-model evidence.",
  },
  {
    keywords: ["press", "news", "newsroom", "media"],
    type: "newsroom",
    priority: 9,
    label: "Discovered newsroom",
    signal: "Homepage-linked newsroom or press page for launches and company updates.",
  },
  {
    keywords: ["blog", "stories", "insights"],
    type: "blog",
    priority: 8,
    label: "Discovered blog",
    signal: "Homepage-linked blog or stories page for product and operating context.",
  },
  {
    keywords: ["leadership", "leaders", "team", "management", "executives"],
    type: "custom_url",
    priority: 8,
    label: "Discovered leadership page",
    signal: "Homepage-linked leadership page for stakeholder and operating-style context.",
  },
  {
    keywords: ["about", "company", "mission", "values"],
    type: "custom_url",
    priority: 7,
    label: "Discovered about page",
    signal: "Homepage-linked about page for company narrative and cultural framing.",
  },
  {
    keywords: ["product", "platform", "pricing", "features", "solutions", "safety", "trust", "privacy"],
    type: "custom_url",
    priority: 8,
    label: "Discovered product surface",
    signal: "Homepage-linked product or domain page for role-adjacent product evidence.",
  },
  {
    keywords: ["developer", "docs", "api", "engineering"],
    type: "custom_url",
    priority: 7,
    label: "Discovered technical docs",
    signal: "Homepage-linked developer or documentation page for technical context.",
  },
];

const SEARCH_RESULT_HOSTS = new Set(["google.com", "news.google.com", "bing.com"]);
const SEARCH_INTERNAL_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "accounts.google.com",
  "support.google.com",
  "policies.google.com",
  "bing.com",
  "www.bing.com",
]);
const STATIC_ASSET_HOSTS = new Set(["fonts.googleapis.com"]);
const STATIC_ASSET_HOST_SUFFIXES = ["googleusercontent.com", "gstatic.com"];
const STATIC_ASSET_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".css", ".js", ".woff", ".woff2"];

export async function fetchPageWithFirecrawl(
  url: string,
  opts: { onlyMainContent?: boolean; timeoutMs?: number } = {}
): Promise<FirecrawlResponse> {
  const { onlyMainContent = true, timeoutMs = 60000 } = opts;

  console.log("[Firecrawl] Using API key:", FIRECRAWL_API_KEY ? FIRECRAWL_API_KEY.slice(0, 8) + "..." : "undefined");

  if (!FIRECRAWL_API_KEY || shouldBypassFirecrawl()) {
    return fetchPageWithAxios(url);
  }

  try {
    const response = await axios.post(
      `${FIRECRAWL_BASE_URL}/scrape`,
      {
        url,
        formats: ["markdown", "html"],
        onlyMainContent,
        waitFor: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: timeoutMs,
      }
    );

    const body = response.data;
    if (!body?.success) {
      console.error("[Firecrawl] Non-success response:", body);
      return fetchPageWithAxios(url);
    }

    const payload = body.data ?? body;
    const markdown: string = payload?.markdown ?? payload?.content ?? "";

    console.log(`[Firecrawl] Got ${markdown.length} chars of markdown for ${url}`);

    if (markdown.length < 200) {
      console.warn("[Firecrawl] Very short response — falling back to axios");
      return fetchPageWithAxios(url);
    }

    return {
      success: true,
      data: {
        markdown,
        html: payload?.html ?? "",
        content: markdown,
        metadata: payload?.metadata ?? {},
      },
    };
  } catch (error) {
    console.error("[Firecrawl] Error:", error instanceof Error ? error.message : error);
    if (isFirecrawlQuotaError(error)) {
      firecrawlBypassUntil = Date.now() + FIRECRAWL_BYPASS_WINDOW_MS;
      console.warn("[Firecrawl] Quota exhausted; bypassing Firecrawl temporarily and using direct fetch fallback.");
    }
    return fetchPageWithAxios(url);
  }
}

async function fetchPageWithAxios(url: string): Promise<FirecrawlResponse> {
  console.log("[Firecrawl] Falling back to direct axios fetch for:", url);
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    return {
      success: true,
      data: {
        content: response.data,
        html: response.data,
        markdown: "",
        metadata: { title: extractTitle(response.data) },
      },
    };
  } catch (error) {
    console.error("[Firecrawl] Axios fallback also failed:", url, error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function shouldBypassFirecrawl(now = Date.now()): boolean {
  return firecrawlBypassUntil > now;
}

export function isFirecrawlQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { response?: { status?: unknown }; status?: unknown; message?: unknown };
  const status = typeof candidate.response?.status === "number"
    ? candidate.response.status
    : typeof candidate.status === "number"
    ? candidate.status
    : undefined;
  const message = String(candidate.message ?? "").toLowerCase();

  return status === 402 || /status code 402|payment required|quota/i.test(message);
}

export function resetFirecrawlBypassForTest(): void {
  firecrawlBypassUntil = 0;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "Unknown";
}

function normalizeUrl(url: string): string | null {
  if (!url?.trim()) return null;

  try {
    return new URL(url).toString();
  } catch {
    try {
      return new URL(`https://${url}`).toString();
    } catch {
      return null;
    }
  }
}

function getHostname(url: string): string | null {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function slugifyCompanyName(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function dedupeStrings(values?: Array<string | null | undefined>): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is string => typeof value === "string").filter((value, index, array) => value.trim().length > 0 && array.indexOf(value) === index);
}

function normalizeResolvedUrl(url: string, baseUrl?: string): string | null {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();
  if (/^(mailto:|tel:|javascript:)/i.test(trimmed)) {
    return null;
  }

  try {
    const resolved = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    if (!/^https?:$/i.test(resolved.protocol)) {
      return null;
    }
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function collectLinkTargets(content: string): string[] {
  const matches: string[] = [];
  const htmlHrefPattern = /href\s*=\s*["']([^"'#>]+)["']/gi;
  const markdownLinkPattern = /\[[^\]]+\]\(([^)\s#]+)(?:\s+"[^"]*")?\)/g;

  for (const pattern of [htmlHrefPattern, markdownLinkPattern]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        matches.push(decodeHtmlEntities(match[1]));
      }
    }
  }

  return matches;
}

function getBaseHostname(url: string): string | null {
  const hostname = getHostname(url);
  if (!hostname) {
    return null;
  }

  const parts = hostname.split(".");
  if (parts.length <= 2) {
    return hostname;
  }

  return parts.slice(-2).join(".");
}

export function isSearchResultsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const baseHost = getBaseHostname(url);
    if (!baseHost || !SEARCH_RESULT_HOSTS.has(baseHost)) {
      return false;
    }

    return parsed.pathname === "/search" || parsed.pathname === "/news/search";
  } catch {
    return false;
  }
}

function isAllowedSearchResultTarget(searchUrl: string, candidateUrl: string): boolean {
  try {
    const parsedCandidate = new URL(candidateUrl);
    const parsedSearch = new URL(searchUrl);
    const candidateHost = parsedCandidate.hostname.toLowerCase();
    const searchBaseHost = getBaseHostname(searchUrl);

    if (!/^https?:$/i.test(parsedCandidate.protocol)) {
      return false;
    }

    if (STATIC_ASSET_HOSTS.has(candidateHost) || STATIC_ASSET_HOST_SUFFIXES.some((suffix) => candidateHost.endsWith(suffix))) {
      return false;
    }

    if (STATIC_ASSET_EXTENSIONS.some((extension) => parsedCandidate.pathname.toLowerCase().endsWith(extension))) {
      return false;
    }

    if (SEARCH_INTERNAL_HOSTS.has(candidateHost) && !(candidateHost === "news.google.com" && /\/(articles|read)\//.test(parsedCandidate.pathname))) {
      return false;
    }

    if (candidateHost === parsedSearch.hostname.toLowerCase() && !/\/(articles|read)\//.test(parsedCandidate.pathname)) {
      return false;
    }

    if (searchBaseHost === "google.com" && parsedCandidate.pathname === "/search") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function extractSearchResultLinks(args: {
  searchUrl: string;
  content: string;
  maxLinks?: number;
}): string[] {
  const maxLinks = args.maxLinks ?? 3;
  const results: string[] = [];
  const seen = new Set<string>();

  const pushUrl = (value: string | null) => {
    if (!value) {
      return;
    }

    if (!isAllowedSearchResultTarget(args.searchUrl, value) || seen.has(value)) {
      return;
    }

    seen.add(value);
    results.push(value);
  };

  const googleRedirectPattern = /\/url\?q=([^&"'>\s]+)/gi;
  let redirectMatch: RegExpExecArray | null;
  while ((redirectMatch = googleRedirectPattern.exec(args.content)) !== null) {
    pushUrl(normalizeResolvedUrl(decodeURIComponent(redirectMatch[1]), args.searchUrl));
    if (results.length >= maxLinks) {
      return results;
    }
  }

  for (const rawLink of collectLinkTargets(args.content)) {
    pushUrl(normalizeResolvedUrl(rawLink, args.searchUrl));
    if (results.length >= maxLinks) {
      break;
    }
  }

  return results;
}

async function fetchPageWithAxiosResolved(url: string): Promise<AxiosResolvedPage> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const finalUrl = normalizeUrl(String((response.request as any)?.res?.responseUrl || response.config.url || url)) || normalizeUrl(url) || url;
    return {
      success: true,
      finalUrl,
      content: typeof response.data === "string" ? response.data : undefined,
    };
  } catch {
    return {
      success: false,
      finalUrl: normalizeUrl(url) || url,
    };
  }
}

async function resolveCanonicalSourceUrlInBrowser(url: string): Promise<string | null> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      try {
        await page.waitForURL(
          currentUrl => {
            try {
              return new URL(currentUrl.toString()).hostname !== "news.google.com";
            } catch {
              return false;
            }
          },
          { timeout: 15000 },
        );
      } catch {
        try {
          await page.waitForLoadState("load", { timeout: 5000 });
        } catch {
          // Ignore load-state timeouts and inspect the current document as-is.
        }
      }

      const resolved = await page.evaluate(() => {
        const href = window.location.href;
        const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;
        const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute("content") || null;
        return canonical || ogUrl || href;
      });

      const normalized = normalizeUrl(resolved || url);
      if (!normalized) {
        return null;
      }

      const hostname = getHostname(normalized);
      if (hostname && hostname !== "news.google.com") {
        return normalized;
      }

      return null;
    } finally {
      await page.close();
      await browser.close();
    }
  } catch (error) {
    console.warn("[Firecrawl] Browser canonical resolution failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

function isGoogleNewsWrapperUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === "news.google.com" && /\/(read|articles)\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function resolveCanonicalSourceUrl(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return url;
  }

  if (canonicalResolutionCache.has(normalized)) {
    return canonicalResolutionCache.get(normalized)!;
  }

  const resolutionPromise = (async () => {
    if (!isGoogleNewsWrapperUrl(normalized)) {
      return normalized;
    }

    const resolved = await fetchPageWithAxiosResolved(normalized);
    if (resolved.success) {
      const finalHostname = getHostname(resolved.finalUrl);
      if (finalHostname && finalHostname !== "news.google.com") {
        return resolved.finalUrl;
      }

      const canonicalMatch = resolved.content?.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      const canonicalUrl = canonicalMatch?.[1] ? normalizeResolvedUrl(decodeHtmlEntities(canonicalMatch[1]), resolved.finalUrl) : null;
      if (canonicalUrl) {
        const canonicalHostname = getHostname(canonicalUrl);
        if (canonicalHostname && canonicalHostname !== "news.google.com") {
          return canonicalUrl;
        }
      }
    }

    const browserResolved = await resolveCanonicalSourceUrlInBrowser(normalized);
    return browserResolved ?? normalized;
  })();

  canonicalResolutionCache.set(normalized, resolutionPromise);
  return resolutionPromise;
}

function getSearchIntentTerm(url: string, paramNames: string[]): string | null {
  try {
    const parsed = new URL(url);
    for (const name of paramNames) {
      const value = parsed.searchParams.get(name)?.trim();
      if (value) {
        return decodeURIComponent(value).replace(/\s+/g, " ").trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isUberDomain(hostname: string): boolean {
  return hostname === "uber.com" || hostname.endsWith(".uber.com");
}

export function getDomainSpecificSourceFallbackUrls(url: string): string[] {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    return [];
  }

  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const uberDomain = isUberDomain(hostname);

  if (uberDomain && (hostname === "jobs.uber.com" || pathname.includes("/careers"))) {
    return [
      "https://www.uber.com/us/en/careers/list/",
      "https://www.uber.com/us/en/careers/",
      "https://www.uber.com/global/en/careers/",
    ];
  }

  if (uberDomain && (hostname === "investor.uber.com" || pathname.includes("/investors"))) {
    return [
      "https://www.uber.com/us/en/about/investors/",
      "https://www.uber.com/newsroom/",
      "https://www.uber.com/us/en/about/",
    ];
  }

  if (hostname.endsWith("crunchbase.com")) {
    const term = getSearchIntentTerm(normalizedUrl, ["q"]);
    if (term) {
      const encoded = encodeURIComponent(term);
      return [
        `https://www.google.com/search?q=${encodeURIComponent(`${term} funding valuation acquisition revenue strategy`)}`,
        `https://finance.yahoo.com/lookup?s=${encoded}`,
        `https://www.reuters.com/site-search/?query=${encoded}`,
      ];
    }
  }

  if (hostname.endsWith("g2.com")) {
    const term = getSearchIntentTerm(normalizedUrl, ["query", "q"]);
    if (term) {
      const encoded = encodeURIComponent(term);
      return [
        `https://www.google.com/search?q=${encodeURIComponent(`${term} reviews alternatives pricing`)}`,
        `https://www.capterra.com/search/?query=${encoded}`,
        `https://www.google.com/search?q=${encodeURIComponent(`${term} product offerings customer reviews`)}`,
      ];
    }
  }

  if (hostname.endsWith("glassdoor.com")) {
    const term = getSearchIntentTerm(normalizedUrl, ["keyword", "q"]);
    if (term) {
      return [
        `https://www.google.com/search?q=${encodeURIComponent(`${term} employee reviews culture management`)}`,
        `https://www.google.com/search?q=${encodeURIComponent(`${term} interview experience culture`)}`,
        `https://www.google.com/search?q=${encodeURIComponent(`${term} company culture leadership employees`)}`,
      ];
    }
  }

  return [];
}

function isSameCompanyHost(candidateUrl: string, companyUrl: string): boolean {
  try {
    const candidateHost = new URL(candidateUrl).hostname.toLowerCase().replace(/^www\./, "");
    const companyHost = new URL(companyUrl).hostname.toLowerCase().replace(/^www\./, "");
    return candidateHost === companyHost || candidateHost.endsWith(`.${companyHost}`);
  } catch {
    return false;
  }
}

function classifyFirstPartyLink(url: string): FirstPartyDiscoveryRule | null {
  const lowerUrl = url.toLowerCase();
  return FIRST_PARTY_DISCOVERY_RULES.find((rule) => rule.keywords.some((keyword) => lowerUrl.includes(keyword))) ?? null;
}

export function extractFirstPartyCandidatesFromHomepage(args: {
  companyUrl: string;
  content: string;
  maxCandidates?: number;
}): PlannerCandidate[] {
  const maxCandidates = args.maxCandidates ?? 8;
  const seenUrls = new Set<string>();
  const discovered: PlannerCandidate[] = [];

  for (const rawLink of collectLinkTargets(args.content)) {
    const normalizedUrl = normalizeResolvedUrl(rawLink, args.companyUrl);
    if (!normalizedUrl || seenUrls.has(normalizedUrl) || !isSameCompanyHost(normalizedUrl, args.companyUrl)) {
      continue;
    }

    const classification = classifyFirstPartyLink(normalizedUrl);
    if (!classification) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    discovered.push({
      url: normalizedUrl,
      type: classification.type,
      priority: classification.priority,
      label: classification.label,
      domain: getHostname(normalizedUrl) ?? "company-site",
      signal: classification.signal,
    });

    if (discovered.length >= maxCandidates) {
      break;
    }
  }

  return discovered;
}

async function fetchResolvedSourcesFromUrls(args: {
  urls: string[];
  type: PlannedSourceType;
  priority: number;
  visited: Set<string>;
  depth: number;
}): Promise<ResolvedPlannedSource[]> {
  const settled = await Promise.allSettled(
    args.urls.map((url) =>
      fetchResolvedPlannedSource(
        {
          url,
          type: args.type,
          priority: args.priority,
        },
        args.visited,
        args.depth
      )
    )
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function fetchResolvedPlannedSource(
  plannedSource: PlannedSource,
  visited = new Set<string>(),
  depth = 0
): Promise<ResolvedPlannedSource[]> {
  const normalizedUrl = await resolveCanonicalSourceUrl(plannedSource.url);
  if (!normalizedUrl || visited.has(normalizedUrl)) {
    return [];
  }

  visited.add(normalizedUrl);

  const response = await fetchPageWithFirecrawl(normalizedUrl);
  const pageContent = response.data?.markdown || response.data?.content || "";

  if (response.success && pageContent) {
    if (isSearchResultsUrl(normalizedUrl)) {
      const resultLinks = extractSearchResultLinks({
        searchUrl: normalizedUrl,
        content: response.data?.html || pageContent,
      });

      if (resultLinks.length > 0) {
        if (depth >= MAX_RESOLVED_SOURCE_DEPTH) {
          return [];
        }

        const resolvedSources = await fetchResolvedSourcesFromUrls({
          urls: resultLinks,
          type: plannedSource.type,
          priority: Math.max(1, plannedSource.priority - 1),
          visited,
          depth: depth + 1,
        });
        if (resolvedSources.length > 0) {
          return resolvedSources;
        }
      }

      return [];
    }

    return [
      {
        url: normalizedUrl,
        type: plannedSource.type,
        priority: plannedSource.priority,
        title: response.data?.metadata?.title || normalizedUrl,
        content: pageContent,
      },
    ];
  }

  const fallbackUrls = getDomainSpecificSourceFallbackUrls(normalizedUrl).filter((url) => !visited.has(url));
  if (fallbackUrls.length === 0 || depth >= MAX_RESOLVED_SOURCE_DEPTH) {
    return [];
  }

  return fetchResolvedSourcesFromUrls({
    urls: fallbackUrls,
    type: plannedSource.type,
    priority: Math.max(1, plannedSource.priority - 1),
    visited,
    depth: depth + 1,
  });
}

async function discoverFirstPartyCandidates(companyUrl?: string): Promise<PlannerCandidate[]> {
  if (!companyUrl) {
    return [];
  }

  const response = await fetchPageWithFirecrawl(companyUrl, {
    onlyMainContent: false,
    timeoutMs: 20000,
  });

  if (!response.success) {
    return [];
  }

  const content = response.data?.html || response.data?.markdown || response.data?.content || "";
  if (!content) {
    return [];
  }

  return extractFirstPartyCandidatesFromHomepage({
    companyUrl,
    content,
  });
}

function buildFallbackRetrievalQueries(
  companyName: string,
  roleTitle: string,
  jobDescription?: string,
  profileContext?: string
): string[] {
  const persona = inferPremiumPersona(roleTitle, jobDescription, profileContext);
  return buildPersonaAwareRetrievalQueries(companyName, roleTitle, jobDescription, persona);
}

function buildGenericStrategySeedCandidates(companyName: string, roleTitle: string, companyUrl?: string): PlannerCandidate[] {
  const companyHost = companyUrl ? getHostname(companyUrl) : null;
  const normalizedCompanyHost = companyHost?.replace(/^www\./, "") ?? null;

  const candidates: PlannerCandidate[] = [
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} investor relations annual report earnings shareholder letter`)}`,
      type: "custom_url",
      priority: 9,
      label: "Investor relations strategy search",
      domain: "google.com",
      signal: "Finds investor relations, annual reports, earnings decks, and shareholder framing before generic web summaries.",
      sourceClasses: ["leadership_strategy", "investor_materials"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:sec.gov ${companyName} 10-K annual report`)}`,
      type: "custom_url",
      priority: 9,
      label: "SEC filings search",
      domain: "google.com",
      signal: "Finds SEC filings or filing coverage when the company appears public or investor materials are discoverable.",
      sourceClasses: ["leadership_strategy", "investor_materials"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} leadership interview podcast keynote strategy`)}`,
      type: "custom_url",
      priority: 8,
      label: "Leadership commentary search",
      domain: "google.com",
      signal: "Finds leadership interviews, podcasts, and talks that expose operating style and strategic intent.",
      sourceClasses: ["leadership_commentary", "leadership_strategy"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} culture values operating principles`)}`,
      type: "custom_url",
      priority: 8,
      label: "Culture and values search",
      domain: "google.com",
      signal: "Looks for company-authored culture, values, norms, and operating-principles material.",
      sourceClasses: ["leadership_commentary", "governance_signals"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} engineering blog platform architecture`)}`,
      type: "custom_url",
      priority: 7,
      label: "Engineering and product surface search",
      domain: "google.com",
      signal: "Finds engineering blogs, platform writeups, and product surfaces that ground technical or operational complexity.",
      sourceClasses: ["product_surfaces", "technical_context", "engineering_docs"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} strategy analysis Stratechery Reuters \"The Information\" \"CB Insights\"`)}`,
      type: "custom_url",
      priority: 7,
      label: "Independent strategy analysis search",
      domain: "google.com",
      signal: "Adds independent strategy coverage from analysts and reporters after primary evidence is covered.",
      sourceClasses: ["leadership_strategy", "external_validation"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} capital allocation EBITDA free cash flow buybacks investor day`)}`,
      type: "custom_url",
      priority: 8,
      label: "Capital allocation and margin search",
      domain: "google.com",
      signal: "Finds capital allocation framing, EBITDA and FCF commentary, and investor-day style strategic finance material.",
      sourceClasses: ["leadership_strategy", "investor_materials", "external_validation"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} strategic priorities earnings call prepared remarks annual priorities`)}`,
      type: "custom_url",
      priority: 8,
      label: "Strategic priorities search",
      domain: "google.com",
      signal: "Finds explicit strategic priority frameworks from earnings calls, prepared remarks, and annual commentary.",
      sourceClasses: ["leadership_strategy", "investor_materials", "product_surfaces"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} segment revenue product portfolio membership advertising unit economics`)}`,
      type: "custom_url",
      priority: 7,
      label: "Portfolio and segment economics search",
      domain: "google.com",
      signal: "Finds segment scorecards, product portfolio detail, membership flywheels, advertising monetization, and unit-economics context.",
      sourceClasses: ["product_surfaces", "leadership_strategy", "external_validation"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} marketplace dynamics take rate network effects autonomous strategy`)}`,
      type: "custom_url",
      priority: 7,
      label: "Marketplace dynamics search",
      domain: "google.com",
      signal: "Finds network-effects, take-rate, marketplace, and autonomous-platform analysis for operating-model depth.",
      sourceClasses: ["leadership_strategy", "technical_context", "external_validation"],
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} Glassdoor interview culture employee reviews`)}`,
      type: "custom_url",
      priority: 6,
      label: "Employee and interview sentiment search",
      domain: "google.com",
      signal: "Pressure-tests company narrative with employee sentiment and interview experience sources.",
      sourceClasses: ["governance_signals", "external_validation"],
    },
  ];

  if (normalizedCompanyHost) {
    candidates.push({
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:${normalizedCompanyHost} ${companyName} newsroom launches announcements`)}`,
      type: "custom_url",
      priority: 8,
      label: "Official newsroom and launches search",
      domain: "google.com",
      signal: "Uses site-constrained search to find official newsroom, launch, and product announcement pages.",
      sourceClasses: ["product_surfaces", "leadership_strategy"],
    });
    candidates.push({
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:${normalizedCompanyHost} ${companyName} ${roleTitle} team leadership stakeholders`)}`,
      type: "custom_url",
      priority: 7,
      label: "Role-context stakeholder search",
      domain: "google.com",
      signal: "Uses the company domain to find role-adjacent teams, leaders, and stakeholder pages.",
      sourceClasses: ["job_description", "leadership_commentary"],
    });
  }

  return candidates;
}

function plannedSourceMatchesClass(source: PlannedSource, sourceClass: string): boolean {
  if (source.sourceClasses?.includes(sourceClass)) {
    return true;
  }

  const haystack = `${source.rationale ?? ""} ${source.url}`.toLowerCase();
  const targetTerms = SOURCE_CLASS_TARGET_TERMS[sourceClass] ?? [];
  return targetTerms.some((term) => haystack.includes(term));
}

export function buildPlannerCandidatePool(
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = [],
  discoveredCandidates: PlannerCandidate[] = []
): PlannerCandidate[] {
  const candidates: PlannerCandidate[] = [];
  const seenUrls = new Set<string>();
  const encodedCompany = encodeURIComponent(companyName);
  const encodedRole = encodeURIComponent(`${companyName} ${roleTitle}`.trim());
  const companySlug = slugifyCompanyName(companyName);

  const pushCandidate = (candidate: PlannerCandidate) => {
    const normalizedUrl = normalizeUrl(candidate.url);
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) return;
    seenUrls.add(normalizedUrl);
    candidates.push({ ...candidate, url: normalizedUrl });
  };

  if (companyUrl) {
    const normalizedCompanyUrl = normalizeUrl(companyUrl);
    const companyUri = normalizedCompanyUrl ? new URL(normalizedCompanyUrl) : null;
    const companyHost = companyUri?.hostname.replace(/^www\./, "") ?? null;
    const companyOrigin = companyUri?.origin ?? null;

    if (normalizedCompanyUrl) {
      pushCandidate({
        url: normalizedCompanyUrl,
        type: "company_homepage",
        priority: 10,
        label: "Company homepage",
        domain: companyHost ?? "company-site",
        signal: "Official messaging, product framing, and core positioning.",
      });

      if (companyHost && companyOrigin) {
        pushCandidate({
          url: `${companyOrigin}/careers`,
          type: "custom_url",
          priority: 10,
          label: "Company careers",
          domain: companyHost,
          signal: "Exact job description and role-context source discovery.",
        });
        pushCandidate({
          url: `${companyOrigin}/investors`,
          type: "custom_url",
          priority: 10,
          label: "Investor relations",
          domain: companyHost,
          signal: "Primary source for earnings, shareholder letters, and strategic priorities.",
        });
        pushCandidate({
          url: `${companyOrigin}/press`,
          type: "newsroom",
          priority: 8,
          label: "Company press",
          domain: companyHost,
          signal: "Official press releases and launch announcements.",
        });
        pushCandidate({
          url: `${companyOrigin}/blog`,
          type: "blog",
          priority: 8,
          label: "Company blog",
          domain: companyHost,
          signal: "Long-form product, engineering, and leadership content.",
        });
        pushCandidate({
          url: `${companyOrigin}/leadership`,
          type: "custom_url",
          priority: 8,
          label: "Leadership page",
          domain: companyHost,
          signal: "Leadership bios and executive context for stakeholder mapping.",
        });
        pushCandidate({
          url: `${companyOrigin}/team`,
          type: "custom_url",
          priority: 7,
          label: "Team page",
          domain: companyHost,
          signal: "Role-context and team topology evidence.",
        });
        pushCandidate({
          url: `${companyOrigin}/about`,
          type: "custom_url",
          priority: 6,
          label: "About page",
          domain: companyHost,
          signal: "Company narrative, leadership framing, and operating context.",
        });
      }
    }
  }

  for (const candidate of discoveredCandidates) {
    pushCandidate(candidate);
  }

  for (const candidate of buildGenericStrategySeedCandidates(companyName, roleTitle, companyUrl)) {
    pushCandidate(candidate);
  }

  for (const url of customUrls) {
    const domain = getHostname(url);
    if (!domain) continue;
    pushCandidate({
      url,
      type: "custom_url",
      priority: 9,
      label: `Custom URL: ${domain}`,
      domain,
      signal: "User-supplied URL considered highly relevant.",
    });
  }

  const externalCandidates: PlannerCandidate[] = [
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} investor relations earnings shareholder letter investor day`)}`,
      type: "custom_url",
      priority: 9,
      label: "Investor relations search",
      domain: "google.com",
      signal: "Primary-source discovery for filings, earnings, and investor day materials.",
    },
    {
      url: `https://news.google.com/search?q=${encodedRole}`,
      type: "custom_url",
      priority: 8,
      label: "Google News search",
      domain: "news.google.com",
      signal: "Recent press and independent reporting.",
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} leadership interview podcast keynote`)}`,
      type: "custom_url",
      priority: 8,
      label: "Leadership interview search",
      domain: "google.com",
      signal: "Leadership talks, podcasts, and interviews for executive intent and operating style.",
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} ${roleTitle} related roles team page leadership bios`)}`,
      type: "custom_url",
      priority: 7,
      label: "Role-context search",
      domain: "google.com",
      signal: "Related roles, team pages, and bios that clarify scope and stakeholder context.",
    },
    {
      url: `https://www.bing.com/news/search?q=${encodedRole}`,
      type: "custom_url",
      priority: 7,
      label: "Bing News search",
      domain: "bing.com",
      signal: "Alternative news ranking for diversity.",
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} investor relations earnings strategy`)}`,
      type: "custom_url",
      priority: 7,
      label: "Investor and strategy search",
      domain: "google.com",
      signal: "Investor relations, earnings, and strategic positioning sources.",
    },
    {
      url: `https://www.crunchbase.com/textsearch?q=${encodedCompany}`,
      type: "custom_url",
      priority: 6,
      label: "Crunchbase search",
      domain: "crunchbase.com",
      signal: "Funding, acquisitions, and company-stage context.",
    },
    {
      url: `https://www.theorg.com/search?query=${encodedCompany}`,
      type: "custom_url",
      priority: 6,
      label: "The Org search",
      domain: "theorg.com",
      signal: "Org-chart and leadership-structure context.",
    },
    {
      url: `https://www.g2.com/search?query=${encodedCompany}`,
      type: "custom_url",
      priority: 6,
      label: "G2 search",
      domain: "g2.com",
      signal: "Product sentiment and competitive alternatives.",
    },
    {
      url: `https://www.capterra.com/search/?query=${encodedCompany}`,
      type: "custom_url",
      priority: 5,
      label: "Capterra search",
      domain: "capterra.com",
      signal: "Category positioning and customer-review context.",
    },
    {
      url: `https://www.glassdoor.com/Search/results.htm?keyword=${encodedCompany}`,
      type: "custom_url",
      priority: 5,
      label: "Glassdoor search",
      domain: "glassdoor.com",
      signal: "Employee sentiment and hiring/culture checks.",
    },
    {
      url: `https://en.wikipedia.org/w/index.php?search=${encodedCompany}`,
      type: "custom_url",
      priority: 4,
      label: "Wikipedia search",
      domain: "wikipedia.org",
      signal: "High-level company timeline and history.",
    },
    {
      url: `https://techcrunch.com/search/${encodedCompany}`,
      type: "custom_url",
      priority: 5,
      label: "TechCrunch search",
      domain: "techcrunch.com",
      signal: "Startup, product, and financing coverage.",
    },
    {
      url: `https://finance.yahoo.com/lookup?s=${encodedCompany}`,
      type: "custom_url",
      priority: 5,
      label: "Yahoo Finance lookup",
      domain: "finance.yahoo.com",
      signal: "Public-market and ticker context.",
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companyName} ${roleTitle} org structure strategy`)}`,
      type: "custom_url",
      priority: 6,
      label: "Role-specific web search",
      domain: "google.com",
      signal: "Role-specific signals tied to organization changes or hiring urgency.",
    },
    {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${companySlug} competitors market share`)}`,
      type: "custom_url",
      priority: 5,
      label: "Competitive landscape search",
      domain: "google.com",
      signal: "Competitor and market-share coverage.",
    },
  ];

  for (const candidate of externalCandidates) {
    pushCandidate(candidate);
  }

  return candidates;
}

export function buildRagSourceStrategy(args: {
  companyName: string;
  roleTitle: string;
  companyUrl?: string;
  jobDescription?: string;
  profileContext?: string;
  candidatePool: PlannerCandidate[];
}): RagSourceStrategy {
  const persona = inferPremiumPersona(args.roleTitle, args.jobDescription, args.profileContext);
  const requiredSourceClasses = dedupeStrings([
    "job_description",
    ...persona.retrievalProfile.mandatorySourceClasses,
    ...persona.retrievalProfile.preferredSourceClasses,
    "leadership_strategy",
    "investor_materials",
    "leadership_commentary",
    "product_surfaces",
    "external_validation",
  ]);
  const priorityOrder = [
    "exact JD / careers evidence",
    "investor relations / filings / earnings / shareholder documents",
    "official launches / newsroom / product and engineering blogs",
    "leadership commentary / culture / operating principles",
    "role-context sources and stakeholder maps",
    "independent strategic validation and culture checks",
  ];
  const prioritizedCandidates = [...args.candidatePool].sort((left, right) => right.priority - left.priority);
  const selected: PlannerCandidate[] = [];
  const seenUrls = new Set<string>();

  const pushCandidate = (candidate: PlannerCandidate | undefined) => {
    if (!candidate || seenUrls.has(candidate.url)) {
      return;
    }

    seenUrls.add(candidate.url);
    selected.push(candidate);
  };

  for (const sourceClass of requiredSourceClasses) {
    const match = prioritizedCandidates.find((candidate) => candidateMatchesSourceClass(candidate, sourceClass));
    pushCandidate(match);
  }

  for (const candidate of prioritizedCandidates) {
    if (selected.length >= MAX_RESEARCH_SOURCES + 4) {
      break;
    }

    pushCandidate(candidate);
  }

  return {
    goal: `Create the strongest possible source list for a grounded company deep dive on ${args.companyName}, with enough primary strategy evidence to explain the company's operating model, capital engine, strategic priorities, product portfolio, and marketplace dynamics inside the company-context and company-role-strategy sections.`,
    requiredSourceClasses,
    priorityOrder,
    recommendedSources: selected,
    notes: [
      "Build the source strategy before synthesis so company-strategy depth is earned rather than patched after the report fails a quality bar.",
      "Prefer first-party strategy, investor, leadership, and culture sources before leaning on third-party explainers.",
      "Target the evidence needed to explain capital allocation, unit economics, segment and product portfolio tradeoffs, and explicit strategic priorities rather than stopping at brand or mission summaries.",
      "When possible, gather enough evidence to support interview-grade interpretation, not just company description: what management is optimizing for, what tradeoffs are live, and where the role plugs into that agenda.",
      "Do not stop at generic homepage/newsroom coverage when company-strategy evidence is weak.",
      "Expand into investor, leadership, culture, and external strategist sources before concluding the company strategy layer is shallow.",
    ],
  };
}

function candidateMatchesSourceClass(candidate: PlannerCandidate, sourceClass: string): boolean {
  if (candidate.sourceClasses?.includes(sourceClass)) {
    return true;
  }

  const targetTerms = SOURCE_CLASS_TARGET_TERMS[sourceClass] ?? [];
  if (targetTerms.length === 0) {
    return false;
  }

  const haystack = `${candidate.label} ${candidate.signal} ${candidate.url}`.toLowerCase();
  return targetTerms.some((term) => haystack.includes(term));
}

export async function buildTargetedSourceUrls(args: {
  companyName: string;
  roleTitle: string;
  companyUrl?: string;
  missingSourceClasses: string[];
  maxSources?: number;
  enableHomepageDiscovery?: boolean;
}): Promise<string[]> {
  const maxSources = args.maxSources ?? 6;
  const discoveredCandidates = args.enableHomepageDiscovery === false ? [] : await discoverFirstPartyCandidates(args.companyUrl);
  const candidatePool = buildPlannerCandidatePool(args.companyName, args.roleTitle, args.companyUrl, [], discoveredCandidates);
  const prioritized = [...candidatePool].sort((left, right) => {
    const rightTagged = right.sourceClasses?.length ? 1 : 0;
    const leftTagged = left.sourceClasses?.length ? 1 : 0;
    if (rightTagged !== leftTagged) {
      return rightTagged - leftTagged;
    }

    return right.priority - left.priority;
  });
  const selected: string[] = [];

  const pushUrl = (url: string | undefined) => {
    if (!url || selected.includes(url)) {
      return;
    }

    selected.push(url);
  };

  for (const sourceClass of dedupeStrings(args.missingSourceClasses)) {
    const preferredCandidate = prioritized.find((candidate) => candidateMatchesSourceClass(candidate, sourceClass) && !selected.includes(candidate.url));
    pushUrl(preferredCandidate?.url);
    if (selected.length >= maxSources) {
      return selected;
    }
  }

  for (const sourceClass of dedupeStrings(args.missingSourceClasses)) {
    for (const candidate of prioritized) {
      if (!candidateMatchesSourceClass(candidate, sourceClass) || selected.includes(candidate.url)) {
        continue;
      }

      pushUrl(candidate.url);
      if (selected.length >= maxSources) {
        return selected;
      }
    }
  }

  if (selected.length < maxSources) {
    for (const candidate of prioritized) {
      pushUrl(candidate.url);
      if (selected.length >= maxSources) {
        break;
      }
    }
  }

  return selected;
}

async function planResearchTargets(
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = [],
  jobDescription?: string,
  profileContext?: string
): Promise<ResearchPlan> {
  const discoveredCandidates = await discoverFirstPartyCandidates(companyUrl);
  const candidatePool = buildPlannerCandidatePool(companyName, roleTitle, companyUrl, customUrls, discoveredCandidates);
  const companyDomain = companyUrl ? getHostname(companyUrl) : null;
  const persona = inferPremiumPersona(roleTitle, jobDescription, profileContext);
  const sourceStrategy = buildRagSourceStrategy({
    companyName,
    roleTitle,
    companyUrl,
    jobDescription,
    profileContext,
    candidatePool,
  });
  const fallbackQueries = buildFallbackRetrievalQueries(companyName, roleTitle, jobDescription, profileContext);
  const fallbackSources = sourceStrategy.recommendedSources
    .slice(0, MAX_RESEARCH_SOURCES)
    .map(({ label: _label, domain: _domain, signal: _signal, ...source }) => source);

  try {
    const plannerPrompt = `You are planning a web research and RAG evidence strategy for a company deep-dive report.

Objectives:
- Select the best pages/sites to scrape for grounded evidence.
- Follow this source order unless the source class is clearly unavailable:
  1. exact JD / careers page
  2. investor relations / filings / earnings / shareholder letters / investor day
  3. official product launches / blogs / engineering blogs / product docs
  4. leadership interviews / talks / podcasts / videos
  5. role-context sources such as related roles, leadership bios, team pages
  6. reputable external validation
  7. low-confidence enrichment
- Use at least ${MIN_EXTERNAL_SITES} websites on domains other than the company website when possible.
- Keep total selected web sources to ${MAX_RESEARCH_SOURCES} or fewer.
- Produce exactly 6 focused retrieval queries for the downstream RAG stage.
- Treat strategic depth as mandatory: the final evidence set should try to support operating-model analysis, capital allocation, unit economics, product or segment portfolio logic, strategic priorities, and marketplace or industry dynamics when the company and role make those relevant.

Company: ${companyName}
Role: ${roleTitle}
Company URL: ${companyUrl ?? "UNKNOWN"}
Job description excerpt: ${(jobDescription ?? "").slice(0, 1200) || "NONE"}

${formatPersonaForPrompt(persona)}

Candidate source pool:
${candidatePool.map((candidate, index) => `${index + 1}. ${candidate.label}\n   url: ${candidate.url}\n   domain: ${candidate.domain}\n   type: ${candidate.type}\n   priority: ${candidate.priority}\n   signal: ${candidate.signal}`).join("\n")}

Precomputed RAG source strategy:
Goal: ${sourceStrategy.goal}
Required source classes: ${sourceStrategy.requiredSourceClasses.join(", ")}
Priority order:
${sourceStrategy.priorityOrder.map((step, index) => `${index + 1}. ${step}`).join("\n")}
Strategy notes:
${sourceStrategy.notes.map((note) => `- ${note}`).join("\n")}
Recommended strategy seeds:
${sourceStrategy.recommendedSources.slice(0, 14).map((candidate, index) => `${index + 1}. ${candidate.label}\n   url: ${candidate.url}\n   classes: ${(candidate.sourceClasses ?? []).join(", ") || "none"}\n   priority: ${candidate.priority}\n   signal: ${candidate.signal}`).join("\n")}

Rules:
- Include company_homepage if present.
- Treat the precomputed RAG source strategy as a required planning aid, not optional flavor.
- If the company appears public or investor material is discoverable, include at least one investor-relations-oriented source before external validation.
- Favor independent domains that add complementary evidence in the required order: investor context, official launches, leadership signal, role-context pages, then external validation.
- Prefer official company sources before third-party summaries for strategy or why-now sections.
- Prefer concrete pages over raw search-results pages. Search URLs are discovery seeds, not ideal final selected sources, unless you have no better concrete page for that evidence class.
- Use custom URLs if they are relevant.
- Selected source type must be one of: company_homepage, newsroom, blog, custom_url.
- Retrieval queries must be optimized for vector retrieval and cover: strategy/business model, role charter, investor or monetization context, leadership/operating style, role-context/stakeholders, and why-now.
- At least 3 of the 6 retrieval queries should aim at deeper strategy layers such as capital allocation, segment economics, strategic priorities, market structure, or management tradeoffs when evidence for those layers is plausibly available.
- Retrieval queries and source selection must adapt to the inferred persona. For engineering, design, data/ML, GTM, operations, and executive roles, do not default to product-style priorities.

Return only valid JSON in this shape:
{
  "strategySummary": "short paragraph",
  "selectedSources": [
    {
      "url": "https://...",
      "type": "company_homepage",
      "priority": 10,
      "rationale": "why this source helps"
    }
  ],
  "retrievalQueries": [
    "query 1",
    "query 2",
    "query 3",
    "query 4",
    "query 5",
    "query 6"
  ]
}`;

    const planned = await generateStructuredCompletion(plannerPrompt);
    const selectedSources = Array.isArray(planned?.selectedSources) ? planned.selectedSources : [];
    const chosen: PlannedSource[] = [];
    const seenUrls = new Set<string>();

    for (const source of selectedSources) {
      const normalizedUrl = normalizeUrl(source?.url);
      const type = source?.type;
      if (!normalizedUrl || seenUrls.has(normalizedUrl)) continue;
      if (!type || !["company_homepage", "newsroom", "blog", "custom_url"].includes(type)) continue;
      const matchedCandidate = candidatePool.find((candidate) => candidate.url === normalizedUrl);
      seenUrls.add(normalizedUrl);
      chosen.push({
        url: normalizedUrl,
        type,
        priority: Math.max(1, Math.min(10, Number(source?.priority) || 5)),
        rationale: typeof source?.rationale === "string" ? source.rationale : undefined,
        sourceClasses: matchedCandidate?.sourceClasses,
      });
    }

    for (const sourceClass of sourceStrategy.requiredSourceClasses) {
      if (chosen.some((source) => plannedSourceMatchesClass(source, sourceClass))) {
        continue;
      }

      const strategyCandidate = sourceStrategy.recommendedSources.find((candidate) => candidateMatchesSourceClass(candidate, sourceClass));
      if (!strategyCandidate || seenUrls.has(strategyCandidate.url)) {
        continue;
      }

      chosen.push({
        url: strategyCandidate.url,
        type: strategyCandidate.type,
        priority: strategyCandidate.priority,
        rationale: `Injected from precomputed RAG strategy to cover missing ${sourceClass} evidence.`,
        sourceClasses: strategyCandidate.sourceClasses,
      });
      seenUrls.add(strategyCandidate.url);

      if (chosen.length >= MAX_RESEARCH_SOURCES) {
        break;
      }
    }

    const externalDomains = new Set(
      chosen
        .map((source) => getHostname(source.url))
        .filter((host): host is string => Boolean(host) && host !== companyDomain)
    );

    if (externalDomains.size < MIN_EXTERNAL_SITES) {
      for (const candidate of candidatePool) {
        const host = getHostname(candidate.url);
        if (!host || host === companyDomain || seenUrls.has(candidate.url)) continue;
        chosen.push({
          url: candidate.url,
          type: candidate.type,
          priority: candidate.priority,
          rationale: `Fallback external source from ${candidate.domain} to increase independent evidence coverage.`,
          sourceClasses: candidate.sourceClasses,
        });
        seenUrls.add(candidate.url);
        externalDomains.add(host);
        if (externalDomains.size >= MIN_EXTERNAL_SITES || chosen.length >= MAX_RESEARCH_SOURCES) break;
      }
    }

    if (companyUrl) {
      const normalizedCompanyUrl = normalizeUrl(companyUrl);
      if (normalizedCompanyUrl && !seenUrls.has(normalizedCompanyUrl)) {
        chosen.unshift({
          url: normalizedCompanyUrl,
          type: "company_homepage",
          priority: 10,
          rationale: "Primary official source.",
          sourceClasses: ["leadership_strategy", "product_surfaces"],
        });
      }
    }

    const retrievalQueries = Array.isArray(planned?.retrievalQueries)
      ? planned.retrievalQueries
          .filter((query: unknown): query is string => typeof query === "string" && query.trim().length > 0)
          .slice(0, 6)
      : [];

    return {
      strategySummary:
        typeof planned?.strategySummary === "string" && planned.strategySummary.trim()
          ? planned.strategySummary.trim()
          : `Use the precomputed RAG source strategy plus independent external domains to build diversified evidence for ${companyName}.`,
      selectedSources: chosen.slice(0, MAX_RESEARCH_SOURCES),
      retrievalQueries: retrievalQueries.length === 6 ? retrievalQueries : fallbackQueries,
      sourceStrategy,
    };
  } catch (error) {
    console.error("[ResearchPlan] Planner failed:", error instanceof Error ? error.message : error);
    return {
      strategySummary: `Fallback research plan for ${companyName}: follow the precomputed RAG strategy, then add at least ${MIN_EXTERNAL_SITES} external websites when available.`,
      selectedSources: fallbackSources,
      retrievalQueries: fallbackQueries,
      sourceStrategy,
    };
  }
}

export async function buildSourceUrls(
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = [],
  jobDescription?: string,
  profileContext?: string
): Promise<ResearchPlan> {
  return planResearchTargets(companyName, roleTitle, companyUrl, customUrls, jobDescription, profileContext);
}

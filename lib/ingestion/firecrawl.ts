import axios from "axios";
import { generateStructuredCompletion } from "@/lib/ai/openai";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1";
const MIN_EXTERNAL_SITES = 5;
const MAX_RESEARCH_SOURCES = 10;

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
}

interface PlannerCandidate extends PlannedSource {
  label: string;
  domain: string;
  signal: string;
}

export interface ResearchPlan {
  strategySummary: string;
  selectedSources: PlannedSource[];
  retrievalQueries: string[];
}

export async function fetchPageWithFirecrawl(
  url: string,
  opts: { onlyMainContent?: boolean; timeoutMs?: number } = {}
): Promise<FirecrawlResponse> {
  const { onlyMainContent = true, timeoutMs = 60000 } = opts;

  console.log("[Firecrawl] Using API key:", FIRECRAWL_API_KEY ? FIRECRAWL_API_KEY.slice(0, 8) + "..." : "undefined");

  if (!FIRECRAWL_API_KEY) {
    return fetchPageWithAxios(url);
  }

  try {
    const response = await axios.post(
      `${FIRECRAWL_BASE_URL}/scrape`,
      {
        url,
        formats: ["markdown"],
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
    return fetchPageWithAxios(url);
  }
}

async function fetchPageWithAxios(url: string): Promise<FirecrawlResponse> {
  console.log("[Firecrawl] Falling back to direct axios fetch for:", url);
  try {
    const response = await axios.get(url, {
      timeout: 15000,
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

function buildFallbackRetrievalQueries(
  companyName: string,
  roleTitle: string,
  jobDescription?: string
): string[] {
  const jdHint = jobDescription?.trim()
    ? ` job description responsibilities requirements ${jobDescription.slice(0, 300)}`
    : "";

  return [
    `${companyName} strategy business model revenue growth market position competitive advantage core products${jdHint}`,
    `${companyName} ${roleTitle} responsibilities success metrics charter stakeholder scope hiring needs${jdHint}`,
    `${companyName} leadership team executives org structure culture values decision making`,
    `${companyName} recent launches partnerships acquisitions growth milestones quarterly results news`,
    `${companyName} risks challenges competition layoffs restructuring pressure points execution risk`,
    `${companyName} ${roleTitle} why now strategic inflection priority shift hiring urgency catalyst`,
  ];
}

function buildPlannerCandidatePool(
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = []
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
    const companyHost = normalizedCompanyUrl ? new URL(normalizedCompanyUrl).hostname.replace(/^www\./, "") : null;

    if (normalizedCompanyUrl) {
      pushCandidate({
        url: normalizedCompanyUrl,
        type: "company_homepage",
        priority: 10,
        label: "Company homepage",
        domain: companyHost ?? "company-site",
        signal: "Official messaging, product framing, and core positioning.",
      });

      if (companyHost) {
        pushCandidate({
          url: `https://${companyHost}/newsroom`,
          type: "newsroom",
          priority: 9,
          label: "Company newsroom",
          domain: companyHost,
          signal: "Official launches, partnerships, and strategic updates.",
        });
        pushCandidate({
          url: `https://${companyHost}/blog`,
          type: "blog",
          priority: 8,
          label: "Company blog",
          domain: companyHost,
          signal: "Long-form product, engineering, and leadership content.",
        });
      }
    }
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
      url: `https://news.google.com/search?q=${encodedRole}`,
      type: "custom_url",
      priority: 8,
      label: "Google News search",
      domain: "news.google.com",
      signal: "Recent press and independent reporting.",
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

async function planResearchTargets(
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = [],
  jobDescription?: string
): Promise<ResearchPlan> {
  const candidatePool = buildPlannerCandidatePool(companyName, roleTitle, companyUrl, customUrls);
  const companyDomain = companyUrl ? getHostname(companyUrl) : null;
  const fallbackQueries = buildFallbackRetrievalQueries(companyName, roleTitle, jobDescription);
  const fallbackSources = candidatePool
    .filter((candidate) => candidate.type !== "custom_url")
    .concat(candidatePool.filter((candidate) => candidate.type === "custom_url" && candidate.domain !== companyDomain).slice(0, MIN_EXTERNAL_SITES))
    .slice(0, MAX_RESEARCH_SOURCES)
    .map(({ label: _label, domain: _domain, signal: _signal, ...source }) => source);

  try {
    const plannerPrompt = `You are planning a web research and RAG evidence strategy for a company deep-dive report.

Objectives:
- Select the best pages/sites to scrape for grounded evidence.
- Use at least ${MIN_EXTERNAL_SITES} websites on domains other than the company website when possible.
- Keep total selected web sources to ${MAX_RESEARCH_SOURCES} or fewer.
- Produce exactly 6 focused retrieval queries for the downstream RAG stage.

Company: ${companyName}
Role: ${roleTitle}
Company URL: ${companyUrl ?? "UNKNOWN"}
Job description excerpt: ${(jobDescription ?? "").slice(0, 1200) || "NONE"}

Candidate source pool:
${candidatePool.map((candidate, index) => `${index + 1}. ${candidate.label}\n   url: ${candidate.url}\n   domain: ${candidate.domain}\n   type: ${candidate.type}\n   priority: ${candidate.priority}\n   signal: ${candidate.signal}`).join("\n")}

Rules:
- Include company_homepage if present.
- Favor independent domains that add complementary evidence: recent news, investor/market context, org structure, product/customer sentiment, and role-specific context.
- Use custom URLs if they are relevant.
- Selected source type must be one of: company_homepage, newsroom, blog, custom_url.
- Retrieval queries must be optimized for vector retrieval and cover strategy, role charter, leadership, momentum, risks, and why-now.

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
      seenUrls.add(normalizedUrl);
      chosen.push({
        url: normalizedUrl,
        type,
        priority: Math.max(1, Math.min(10, Number(source?.priority) || 5)),
        rationale: typeof source?.rationale === "string" ? source.rationale : undefined,
      });
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
          : `Use the company site plus independent external domains to build diversified evidence for ${companyName}.`,
      selectedSources: chosen.slice(0, MAX_RESEARCH_SOURCES),
      retrievalQueries: retrievalQueries.length === 6 ? retrievalQueries : fallbackQueries,
    };
  } catch (error) {
    console.error("[ResearchPlan] Planner failed:", error instanceof Error ? error.message : error);
    return {
      strategySummary: `Fallback research plan for ${companyName}: company pages plus at least ${MIN_EXTERNAL_SITES} external websites when available.`,
      selectedSources: fallbackSources,
      retrievalQueries: fallbackQueries,
    };
  }
}

export async function buildSourceUrls(
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = [],
  jobDescription?: string
): Promise<ResearchPlan> {
  return planResearchTargets(companyName, roleTitle, companyUrl, customUrls, jobDescription);
}

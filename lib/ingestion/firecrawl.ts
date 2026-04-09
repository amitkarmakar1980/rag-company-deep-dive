import axios from "axios";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1";

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
        waitFor: 2000, // allow JS-rendered pages to settle
      },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: timeoutMs,
      }
    );

    // Firecrawl v1 wraps result in response.data.data
    const body = response.data;
    if (!body?.success) {
      console.error("[Firecrawl] Non-success response:", body);
      return fetchPageWithAxios(url);
    }

    const payload = body.data ?? body; // handle both v0 and v1 shapes
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

// Standard sources to fetch for a company
export async function buildSourceUrls(
  _companyName: string,
  companyUrl?: string,
  customUrls: string[] = []
): Promise<Array<{ url: string; type: string; priority: number }>> {
  const sources: Array<{ url: string; type: string; priority: number }> = [];

  if (companyUrl) {
    sources.push({ url: companyUrl, type: "company_homepage", priority: 10 });

    const domain = new URL(companyUrl).hostname;
    sources.push(
      { url: `https://${domain}/blog`,     type: "blog",     priority: 8 },
      { url: `https://${domain}/newsroom`, type: "newsroom", priority: 9 },
      { url: `https://${domain}/press`,    type: "newsroom", priority: 9 },
      { url: `https://${domain}/news`,     type: "blog",     priority: 7 }
    );
  }

  for (const url of customUrls) {
    sources.push({ url, type: "custom_url", priority: 6 });
  }

  return sources;
}

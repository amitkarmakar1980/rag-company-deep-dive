import axios from "axios";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";

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
  url: string
): Promise<FirecrawlResponse> {
  // TEMP LOG: Print the Firecrawl API key (first 8 chars only for safety)
  console.log("[Firecrawl] Using API key:", FIRECRAWL_API_KEY ? FIRECRAWL_API_KEY.slice(0, 8) + "..." : "undefined");
  if (!FIRECRAWL_API_KEY) {
    // Fallback to simple axios fetch if API key not set
    return fetchPageWithAxios(url);
  }

  try {
    const response = await axios.post(
      `${FIRECRAWL_BASE_URL}/scrape`,
      {
        url,
        formats: ["markdown", "html"],
      },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return response.data;
  } catch (error) {
    console.error("Firecrawl error:", error);
    // Fallback
    return fetchPageWithAxios(url);
  }
}

async function fetchPageWithAxios(url: string): Promise<FirecrawlResponse> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    return {
      success: true,
      data: {
        content: response.data,
        html: response.data,
        markdown: response.data,
        metadata: {
          title: extractTitle(response.data),
        },
      },
    };
  } catch (error) {
    console.error("Page fetch failed:", url, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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
): Promise<
  Array<{
    url: string;
    type: string;
    priority: number;
  }>
> {
  const sources: Array<{
    url: string;
    type: string;
    priority: number;
  }> = [];

  if (companyUrl) {
    sources.push({
      url: companyUrl,
      type: "company_homepage",
      priority: 10,
    });

    // Likely newsroom/blog locations
    const domain = new URL(companyUrl).hostname;
    sources.push(
      {
        url: `https://${domain}/blog`,
        type: "blog",
        priority: 8,
      },
      {
        url: `https://${domain}/newsroom`,
        type: "newsroom",
        priority: 9,
      },
      {
        url: `https://${domain}/press`,
        type: "newsroom",
        priority: 9,
      },
      {
        url: `https://${domain}/news`,
        type: "blog",
        priority: 7,
      }
    );
  }

  // Add custom URLs with high priority
  for (const url of customUrls) {
    sources.push({
      url,
      type: "custom_url",
      priority: 6,
    });
  }

  return sources;
}

// Simple text cleaning for ingestion

export function sanitizeTextForStorage(value: string): string {
  return value.replace(/\u0000/g, "");
}

export function cleanContent(rawHtml: string): string {
  let text = sanitizeTextForStorage(rawHtml);

  // Remove script and style tags
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    ""
  );

  // Remove HTML tags but keep content
  text = text.replace(/<[^>]+>/g, " ");

  // Remove cookie consent text and common boilerplate
  text = text.replace(
    /cookie consent|accept cookies|privacy policy|terms of service|GDPR|cookie banner/gi,
    ""
  );

  // Remove common footer/nav boilerplate
  text = text.replace(
    /© \d+|all rights reserved|follow us|contact us|subscribe/gi,
    ""
  );

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Remove repeated lines (common in nav/footer)
  const lines = text.split(". ");
  const seen = new Set<string>();
  const unique = lines.filter((line) => {
    const clean = line.trim().toLowerCase();
    if (seen.has(clean)) return false;
    if (clean.length > 10) seen.add(clean);
    return true;
  });

  return unique.join(". ");
}

export function extractMetadataFromHtml(
  html: string
): { description?: string; title?: string; publishDate?: string } {
  const metadata: { description?: string; title?: string; publishDate?: string } = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1].trim();

  // Extract meta description
  const descMatch = html.match(
    /<meta\s+name="description"\s+content="([^"]+)"/i
  );
  if (descMatch) metadata.description = descMatch[1];

  // Extract publish date (common patterns)
  const dateMatch = html.match(
    /published["\s:]*(\d{4}-\d{2}-\d{2}|[A-Z][a-z]+\s+\d+,\s+\d{4})/i
  );
  if (dateMatch) metadata.publishDate = dateMatch[1];

  return metadata;
}

export function removeBoilerplate(text: string): string {
  // Remove very long repeated sections (typically nav/footer)
  const lines = text.split("\n");
  const lineFreq = new Map<string, number>();

  for (const line of lines) {
    const clean = line.trim().toLowerCase();
    if (clean.length < 5) continue;
    lineFreq.set(clean, (lineFreq.get(clean) || 0) + 1);
  }

  // Filter out lines that appear multiple times (boilerplate)
  const filtered = lines.filter((line) => {
    const clean = line.trim().toLowerCase();
    return lineFreq.get(clean) === 1 || (lineFreq.get(clean) ?? 0) < 3;
  });

  return filtered.join("\n");
}

export function calculateContentHash(content: string): string {
  // Simple hash for deduplication
  let hash = 0;
  const str = content.substring(0, 500).toLowerCase();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

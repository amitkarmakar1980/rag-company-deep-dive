export function normalizeHttpUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isRawUrlLikeText(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^(www\.)/i.test(trimmed);
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPathSegment(segment: string): string {
  return titleCaseWords(segment.replace(/[-_+]+/g, " ").trim());
}

function formatGoogleSearchLabel(parsed: URL): string | null {
  const query = parsed.searchParams.get("q")?.trim();
  if (!query) return null;

  const compactQuery = query.replace(/\s+/g, " ");
  return `Google search: ${compactQuery.length > 80 ? `${compactQuery.slice(0, 77)}...` : compactQuery}`;
}

export function getMeaningfulSourceLinkText(title: string | null | undefined, url: string | null | undefined): string {
  const trimmedTitle = title?.trim();
  if (trimmedTitle && !isRawUrlLikeText(trimmedTitle)) {
    return trimmedTitle;
  }

  const normalizedUrl = normalizeHttpUrl(url ?? title);
  if (!normalizedUrl) {
    return trimmedTitle || "Open source";
  }

  try {
    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname.includes("google.") && parsed.pathname === "/search") {
      return formatGoogleSearchLabel(parsed) ?? `Search results on ${hostname}`;
    }

    const pathSegments = parsed.pathname
      .split("/")
      .filter(Boolean);
    const finalSegment = pathSegments[pathSegments.length - 1];

    if (finalSegment && finalSegment.length > 2) {
      return `${formatPathSegment(finalSegment)} · ${hostname}`;
    }

    return hostname;
  } catch {
    return trimmedTitle || "Open source";
  }
}
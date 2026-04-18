export type CitationEvidenceTier = "primary" | "fallback_third_party";

export interface ReportCitation {
  source_id: string;
  url?: string;
  title: string;
  source_type?: string;
  evidence_tier?: CitationEvidenceTier;
  evidence_label?: string;
}

const PRIMARY_SOURCE_TYPES = new Set(["job_description", "company_homepage", "newsroom", "blog"]);

function getHostname(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isSameCompanyHost(sourceUrl: string | null | undefined, companyUrl: string | null | undefined): boolean {
  const sourceHost = getHostname(sourceUrl);
  const companyHost = getHostname(companyUrl);
  if (!sourceHost || !companyHost) {
    return false;
  }

  return sourceHost === companyHost || sourceHost.endsWith(`.${companyHost}`);
}

export function getCitationEvidenceTier(args: {
  sourceType?: string | null;
  sourceUrl?: string | null;
  companyUrl?: string | null;
}): CitationEvidenceTier {
  if (args.sourceType && PRIMARY_SOURCE_TYPES.has(args.sourceType)) {
    return "primary";
  }

  if (isSameCompanyHost(args.sourceUrl, args.companyUrl)) {
    return "primary";
  }

  return "fallback_third_party";
}

export function getCitationEvidenceLabel(evidenceTier: CitationEvidenceTier): string | undefined {
  return evidenceTier === "fallback_third_party" ? "Fallback third-party" : undefined;
}

export function buildReportCitations(
  chunks: Array<{ source_id: string; source_url?: string; source_title: string; source_type?: string }>,
  companyUrl?: string | null
): ReportCitation[] {
  return chunks.map((chunk) => {
    const evidenceTier = getCitationEvidenceTier({
      sourceType: chunk.source_type,
      sourceUrl: chunk.source_url,
      companyUrl,
    });

    return {
      source_id: chunk.source_id,
      url: chunk.source_url,
      title: chunk.source_title,
      source_type: chunk.source_type,
      evidence_tier: evidenceTier,
      evidence_label: getCitationEvidenceLabel(evidenceTier),
    };
  });
}

export function isFallbackThirdPartyCitation(citation: ReportCitation | undefined): boolean {
  return citation?.evidence_tier === "fallback_third_party";
}
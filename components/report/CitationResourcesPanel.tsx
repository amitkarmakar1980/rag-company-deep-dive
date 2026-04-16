"use client";

import { getHostnameFromUrl, normalizeHttpUrl } from "@/lib/report/sourceLinks";

interface CitationItem {
  source_id: string;
  url?: string;
  title: string;
}

interface SourceItem {
  id: string;
  type: string;
  title: string;
  url?: string;
  publishedAt?: string;
}

interface SectionItem {
  id: string;
  key: string;
  title: string;
  citations?: CitationItem[];
}

interface CitationResourcesPanelProps {
  sections: SectionItem[];
  sources: SourceItem[];
  onBackToTop?: () => void;
}

interface AggregatedCitation {
  key: string;
  title: string;
  url: string;
  hostname: string;
  sourceType: string;
  publishedAt?: string;
  sectionRefs: string[];
}

function formatSectionRef(section: SectionItem): string {
  return section.title.replace(/\s+/g, " ").trim();
}

export function CitationResourcesPanel({ sections, sources, onBackToTop }: CitationResourcesPanelProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const aggregated = new Map<string, AggregatedCitation>();

  for (const section of sections) {
    for (const citation of section.citations ?? []) {
      const source = sourceById.get(citation.source_id);
      const resolvedUrl = normalizeHttpUrl(citation.url) ?? normalizeHttpUrl(source?.url);
      if (!resolvedUrl) continue;

      const citationTitle = citation.title?.trim() || source?.title?.trim() || getHostnameFromUrl(resolvedUrl);
      if (!citationTitle) continue;

      const key = citation.source_id || resolvedUrl;
      const sectionRef = formatSectionRef(section);
      const existing = aggregated.get(key);

      if (existing) {
        if (!existing.sectionRefs.includes(sectionRef)) {
          existing.sectionRefs.push(sectionRef);
        }
        continue;
      }

      aggregated.set(key, {
        key,
        title: citationTitle,
        url: resolvedUrl,
        hostname: getHostnameFromUrl(resolvedUrl),
        sourceType: source?.type ?? "citation",
        publishedAt: source?.publishedAt,
        sectionRefs: [sectionRef],
      });
    }
  }

  const citations = Array.from(aggregated.values()).sort((left, right) => {
    const leftDate = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
    const rightDate = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    return rightDate - leftDate;
  });

  if (citations.length === 0) {
    return null;
  }

  return (
    <section
      id="citations"
      aria-labelledby="citations-heading"
      className="bg-white border border-[#e4ddd4] rounded-[26px] px-6 py-5 shadow-[0_12px_24px_rgba(28,23,19,0.05)]"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 id="citations-heading" className="text-sm font-semibold text-[#1c1713]">
            Citations & Referenced Resources
          </h2>
          <p className="mt-1 text-sm text-[#7a6d63]">
            Only resources actually cited by the retrieval pipeline are listed here. Invalid or non-openable links are omitted.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {onBackToTop && (
            <button
              type="button"
              onClick={onBackToTop}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#8a7b6d] hover:text-[#1a4a3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
            >
              Top
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7M12 3v18" />
              </svg>
            </button>
          )}
          <div className="rounded-full border border-[#e4ddd4] bg-[#faf8f3] px-3 py-1 text-xs font-medium text-[#7a6d63]">
            {citations.length} valid citation{citations.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <ol className="space-y-3" role="list">
        {citations.map((citation, index) => (
          <li
            key={citation.key}
            className="rounded-2xl border border-[#efe7dd] bg-[#fffdfa] px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex min-w-[2rem] justify-center rounded-full bg-[#f0ece4] px-2 py-1 text-xs font-semibold text-[#4a3f36]">
                [{index + 1}]
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#4a3f36] underline decoration-[#d4cdc4] underline-offset-2 hover:text-[#1c1713] hover:decoration-[#7a6d63] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 rounded transition-colors"
                >
                  {citation.title}
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9c8d81]">
                  <span>{citation.hostname}</span>
                  <span className="uppercase tracking-[0.18em]">{citation.sourceType.replace(/_/g, " ")}</span>
                  {citation.publishedAt && (
                    <span>
                      {new Date(citation.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#7a6d63]">
                  Cited in: {citation.sectionRefs.join("; ")}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
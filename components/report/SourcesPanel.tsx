"use client";

import { getMeaningfulSourceLinkText, normalizeHttpUrl } from "@/lib/report/sourceLinks";

interface SourceItem {
  id: string;
  type: string;
  title: string;
  url?: string;
  publishedAt?: string;
}

interface SourcesPanelProps {
  sources: SourceItem[];
}

const SOURCE_GROUP_CONFIG: Record<string, { label: string; types: string[]; color: string }> = {
  company: {
    label: "Company-owned",
    types: ["company_homepage", "blog"],
    color: "text-sky-700",
  },
  jd: {
    label: "Job Description / Careers",
    types: ["job_description"],
    color: "text-violet-700",
  },
  news: {
    label: "News & Interviews",
    types: ["newsroom"],
    color: "text-amber-700",
  },
  custom: {
    label: "Custom / Additional",
    types: ["custom_url", "profile_text"],
    color: "text-[#7a6d63]",
  },
};

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (!sources || sources.length === 0) {
    return <p className="text-sm text-[#9c8d81]">No sources available.</p>;
  }

  const grouped: Record<string, SourceItem[]> = {
    company: [],
    jd: [],
    news: [],
    custom: [],
  };

  for (const source of sources) {
    const groupKey = Object.keys(SOURCE_GROUP_CONFIG).find((k) =>
      SOURCE_GROUP_CONFIG[k].types.includes(source.type)
    );
    if (groupKey) {
      grouped[groupKey].push(source);
    } else {
      grouped.custom.push(source);
    }
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([key, items]) => {
        if (items.length === 0) return null;
        const cfg = SOURCE_GROUP_CONFIG[key];

        return (
          <div key={key}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${cfg.color} mb-2`}>
              {cfg.label}
            </h3>
            <ul className="space-y-1.5" role="list">
              {items.map((source) => {
                const normalizedUrl = normalizeHttpUrl(source.url);
                const linkText = getMeaningfulSourceLinkText(source.title, normalizedUrl ?? source.url);

                return (
                  <li key={source.id} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300" aria-hidden />
                    <div className="min-w-0">
                      {normalizedUrl ? (
                        <a
                          href={normalizedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4a3f36] hover:text-[#1c1713] underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 rounded transition-colors"
                          aria-label={`Source: ${linkText} (opens in new tab)`}
                        >
                          {linkText}
                        </a>
                      ) : (
                        <div>
                          <span className="text-[#7a6d63]">{linkText}</span>
                          {source.url && (
                            <p className="mt-0.5 text-xs text-[#b0a496]">Link unavailable</p>
                          )}
                        </div>
                      )}
                      {source.publishedAt && (
                        <span className="ml-2 text-xs text-[#9c8d81]">
                          {new Date(source.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

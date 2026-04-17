"use client";

import { Fragment } from "react";
import { normalizeHttpUrl } from "@/lib/report/sourceLinks";

interface CitationReference {
  source_id: string;
  url?: string;
  title: string;
}

const SOURCE_REFERENCE_PATTERN = /(\b[Ss]ource\s+)(\d+)(\b)/g;

export function renderCitationText(text: string, citations?: CitationReference[]): React.ReactNode {
  if (!citations?.length || !text) {
    return text;
  }

  const citationIndex = Array.from(
    new Map(citations.map((citation) => [citation.source_id || citation.url || citation.title, citation])).values()
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SOURCE_REFERENCE_PATTERN)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? "Source ";
    const rawNumber = match[2];
    const suffix = match[3] ?? "";
    const matchIndex = match.index ?? -1;
    if (matchIndex < 0 || !rawNumber) continue;

    const citationNumber = Number(rawNumber);
    const citation = citationIndex[citationNumber - 1];
    const normalizedUrl = normalizeHttpUrl(citation?.url);

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    if (normalizedUrl) {
      parts.push(
        <Fragment key={`${fullMatch}-${matchIndex}`}>
          {prefix}
          <a
            href={normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded underline decoration-[#cbbfb0] underline-offset-2 transition-colors hover:text-[#1c1713] hover:decoration-[#7a6d63] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
            aria-label={`${fullMatch} opens the cited source in a new tab`}
          >
            {rawNumber}
          </a>
          {suffix}
        </Fragment>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}
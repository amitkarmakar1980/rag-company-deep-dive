"use client";

import { Fragment } from "react";
import { normalizeHttpUrl } from "@/lib/report/sourceLinks";

interface CitationReference {
  source_id: string;
  url?: string;
  title: string;
}

const CITATION_REFERENCE_PATTERN = /(\[(\d+(?:\s*,\s*\d+)*)\])|(\b[Ss]ource\s+)(\d+)(\b)/g;

function renderCitationLink(citationNumber: number, citation: CitationReference | undefined, key: string) {
  const normalizedUrl = normalizeHttpUrl(citation?.url);
  const label = `[${citationNumber}]`;

  if (!normalizedUrl) {
    return label;
  }

  return (
    <a
      key={key}
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-0.5 inline-flex rounded text-[0.82em] font-semibold align-[0.08em] underline decoration-[#cbbfb0] underline-offset-2 transition-colors hover:text-[#1c1713] hover:decoration-[#7a6d63] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30"
      aria-label={`${label} opens the cited source in a new tab`}
    >
      {label}
    </a>
  );
}

export function renderCitationText(text: string, citations?: CitationReference[]): React.ReactNode {
  if (!citations?.length || !text) {
    return text;
  }

  const citationIndex = Array.from(
    new Map(citations.map((citation) => [citation.source_id || citation.url || citation.title, citation])).values()
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CITATION_REFERENCE_PATTERN)) {
    const fullMatch = match[0];
    const matchIndex = match.index ?? -1;
    if (matchIndex < 0) continue;

    const bracketNumbers = match[2];
    const sourceNumber = match[4];

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    if (bracketNumbers) {
      const numbers = bracketNumbers
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0);

      if (!numbers.length) {
        parts.push(fullMatch);
      } else {
        numbers.forEach((citationNumber, index) => {
          const citation = citationIndex[citationNumber - 1];
          parts.push(renderCitationLink(citationNumber, citation, `${fullMatch}-${matchIndex}-${citationNumber}`));
          if (index < numbers.length - 1) {
            parts.push(", ");
          }
        });
      }
    } else if (sourceNumber) {
      const citationNumber = Number(sourceNumber);
      const citation = citationIndex[citationNumber - 1];
      parts.push(
        <Fragment key={`${fullMatch}-${matchIndex}`}>{renderCitationLink(citationNumber, citation, `${fullMatch}-${matchIndex}-legacy`)}</Fragment>
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
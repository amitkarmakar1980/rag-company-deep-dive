"use client";

import { PremiumSectionContent } from "@/lib/report/premiumTypes";
import { normalizeHttpUrl } from "@/lib/report/sourceLinks";
import { BulletList, ProseBlock, SectionShell, type ProvenanceType } from "@/components/report/SectionShell";
import { renderCitationText } from "@/components/report/CitationText";

interface Citation {
  source_id: string;
  url?: string;
  title: string;
}

function getProvenance(data: PremiumSectionContent, citations?: Citation[]): ProvenanceType | undefined {
  if (data.group === "Operations") {
    return undefined;
  }

  if (data.group === "Candidate Fit") {
    return "resume";
  }

  if (data.evidence?.status === "met" && citations?.length) {
    return "cited";
  }

  if (data.evidence?.status === "partial") {
    return citations?.length ? "mixed" : "inferred";
  }

  return citations?.length ? "mixed" : "inferred";
}

function toneClasses(tone: string | undefined): string {
  switch (tone) {
    case "strong":
      return "border-[#cfe1d8] bg-[#edf6f0] text-[#1a4a3a]";
    case "caution":
      return "border-[#eadfbf] bg-[#fff6e7] text-[#8a5a14]";
    case "risk":
      return "border-[#ead7d2] bg-[#fbefeb] text-[#8a3d2f]";
    case "unknown":
      return "border-[#ddd4c8] bg-[#f5f1e8] text-[#6b5e52]";
    default:
      return "border-[#d8e5ea] bg-[#eef5f8] text-[#2d5c6a]";
  }
}

export function PremiumSectionCard({
  sectionKey,
  title,
  content,
  citations,
  feedback,
  onProvenanceClick,
}: {
  sectionKey: string;
  title: string;
  content: string;
  citations?: Citation[];
  feedback?: React.ReactNode;
  onProvenanceClick?: (type: ProvenanceType) => void;
}) {
  let data: PremiumSectionContent | null = null;

  try {
    data = JSON.parse(content) as PremiumSectionContent;
  } catch {
    data = null;
  }

  if (!data || data.schema !== "premium_section_v1") {
    return null;
  }

  const provenance = getProvenance(data, citations);
  const evidenceBacked = data.evidence?.status === "met" || data.evidence?.status === "partial";

  return (
    <SectionShell
      id={sectionKey}
      title={title}
      subtitle={data.question}
      provenance={provenance}
      onProvenanceClick={onProvenanceClick}
      evidenceBacked={evidenceBacked}
      feedback={feedback}
      collapsible={data.surface === "full"}
    >
      <div className="space-y-5">
        <ProseBlock value={renderCitationText(data.summary, citations)} />

        {data.callouts?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.callouts.map((callout, index) => (
              <div key={`${callout.label}-${index}`} className={`rounded-[20px] border px-4 py-4 ${toneClasses(callout.tone)}`}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] opacity-80">{callout.label}</p>
                <p className="mt-2 text-sm leading-6">{renderCitationText(callout.value, citations)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {data.facts?.length ? (
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.facts.map((fact, index) => (
              <div key={`${fact.label}-${index}`} className="rounded-[20px] border border-[#e5dbcf] bg-[#faf6ef] px-4 py-3">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">{fact.label}</dt>
                <dd className="mt-2 text-sm leading-6 text-[#4a3f36]">{renderCitationText(fact.value, citations)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {data.bullets?.length ? <BulletList items={data.bullets.map((item) => renderCitationText(item, citations))} /> : null}

        {data.blocks?.length ? (
          <div className="space-y-4">
            {data.blocks.map((block, index) => (
              <div key={`${block.title}-${index}`} className="rounded-[20px] border border-[#e5dbcf] bg-white px-4 py-4">
                <h3 className="text-sm font-semibold tracking-[-0.02em] text-[#1c1713]">{block.title}</h3>
                {block.body ? <p className="mt-2 text-sm leading-6 text-[#4a3f36]">{renderCitationText(block.body, citations)}</p> : null}
                {block.bullets?.length ? (
                  <div className="mt-3">
                    <BulletList items={block.bullets.map((item) => renderCitationText(item, citations))} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {data.evidence ? (
          <div className="rounded-[20px] border border-[#ddd4c8] bg-[#fffdfa] px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9c8d81]">Evidence state</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9c8d81]">Threshold</p>
                <p className="mt-1 text-sm text-[#4a3f36]">{renderCitationText(data.evidence.threshold, citations)}</p>
              </div>
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9c8d81]">Status</p>
                <p className="mt-1 text-sm text-[#4a3f36]">{data.evidence.status}</p>
              </div>
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9c8d81]">Confidence</p>
                <p className="mt-1 text-sm text-[#4a3f36]">{data.evidence.confidence}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6b5e52]">{renderCitationText(data.evidence.note, citations)}</p>
          </div>
        ) : null}

        {citations?.length ? <CitationList citations={citations} /> : null}
      </div>
    </SectionShell>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  const unique = Array.from(new Map(citations.map((citation) => [citation.source_id, citation])).values()).filter(
    (citation) => citation.title && normalizeHttpUrl(citation.url)
  );

  if (!unique.length) {
    return null;
  }

  return (
    <div className="pt-3 border-t border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Sources Used</h3>
      <ul className="space-y-1" role="list">
        {unique.map((citation, index) => (
          <li key={`${citation.source_id}-${index}`} className="text-xs">
            {normalizeHttpUrl(citation.url) ? (
              <a
                href={normalizeHttpUrl(citation.url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-800 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-900 rounded transition-colors"
              >
                {renderCitationText(citation.title, citations)}
              </a>
            ) : (
              <span className="text-gray-400">{citation.title}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

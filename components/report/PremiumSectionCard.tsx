"use client";

import { PremiumSectionContent } from "@/lib/report/premiumTypes";
import { normalizeHttpUrl } from "@/lib/report/sourceLinks";
import { BulletList, ProseBlock, SectionShell, type ProvenanceType } from "@/components/report/SectionShell";
import { renderCitationText } from "@/components/report/CitationText";
import { isFallbackThirdPartyCitation, type ReportCitation } from "@/lib/report/citationMetadata";

type Citation = ReportCitation;

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

function isCompanySection(sectionKey: string): boolean {
  return sectionKey === "company_context" || sectionKey === "company_role_strategy";
}

function blockAccentClasses(title: string): string {
  if (/vision|mission|culture/i.test(title)) {
    return "border-[#d8e5ea] bg-[#eef5f8]";
  }

  if (/current strategy|strategic tensions|role implications/i.test(title)) {
    return "border-[#cfe1d8] bg-[#edf6f0]";
  }

  if (/swot/i.test(title)) {
    return "border-[#eadfbf] bg-[#fff8eb]";
  }

  return "border-[#e5dbcf] bg-white";
}

function renderPremiumBlocks(sectionKey: string, data: PremiumSectionContent, citations?: Citation[]) {
  if (!data.blocks?.length) {
    return null;
  }

  if (!isCompanySection(sectionKey)) {
    return (
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
    );
  }

  const featuredBlocks = data.blocks.filter((block) => /vision|mission|culture|current strategy|strategic tensions|role implications/i.test(block.title));
  const swotBlocks = data.blocks.filter((block) => /swot/i.test(block.title));
  const remainingBlocks = data.blocks.filter((block) => !featuredBlocks.includes(block) && !swotBlocks.includes(block));

  return (
    <div className="space-y-5">
      {featuredBlocks.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {featuredBlocks.map((block, index) => (
            <div key={`${block.title}-${index}`} className={`rounded-[22px] border px-4 py-4 ${blockAccentClasses(block.title)}`}>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7f7266]">Subsection</p>
              <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-[#1c1713]">{block.title}</h3>
              {block.body ? <p className="mt-3 text-sm leading-6 text-[#4a3f36]">{renderCitationText(block.body, citations)}</p> : null}
              {block.bullets?.length ? (
                <div className="mt-3">
                  <BulletList items={block.bullets.map((item) => renderCitationText(item, citations))} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {swotBlocks.length ? (
        <div className="rounded-[24px] border border-[#eadfbf] bg-[#fffdfa] px-4 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9c8d81]">Strategic framing</p>
              <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-[#1c1713]">SWOT breakdown</h3>
            </div>
            <span className="rounded-full border border-[#eadfbf] bg-[#fff4db] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#8a5a14]">
              {swotBlocks.length} lenses
            </span>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {swotBlocks.map((block, index) => (
              <div key={`${block.title}-${index}`} className={`rounded-[20px] border px-4 py-4 ${blockAccentClasses(block.title)}`}>
                <h4 className="text-sm font-semibold tracking-[-0.02em] text-[#1c1713]">{block.title}</h4>
                {block.body ? <p className="mt-2 text-sm leading-6 text-[#4a3f36]">{renderCitationText(block.body, citations)}</p> : null}
                {block.bullets?.length ? (
                  <div className="mt-3">
                    <BulletList items={block.bullets.map((item) => renderCitationText(item, citations))} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {remainingBlocks.length ? (
        <div className="space-y-4">
          {remainingBlocks.map((block, index) => (
            <div key={`${block.title}-${index}`} className={`rounded-[20px] border px-4 py-4 ${blockAccentClasses(block.title)}`}>
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
    </div>
  );
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

  return (
    <SectionShell
      id={sectionKey}
      title={title}
      subtitle={data.question}
      provenance={provenance}
      onProvenanceClick={onProvenanceClick}
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

        {renderPremiumBlocks(sectionKey, data, citations)}


        {citations?.length ? <CitationList citations={citations} /> : null}
      </div>
    </SectionShell>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  const unique = Array.from(new Map(citations.map((citation) => [citation.source_id, citation])).values()).filter(
    (citation) => citation.title && normalizeHttpUrl(citation.url)
  );
  const fallbackCount = unique.filter((citation) => isFallbackThirdPartyCitation(citation)).length;

  if (!unique.length) {
    return null;
  }

  return (
    <div className="pt-3 border-t border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">References</h3>
      {fallbackCount ? (
        <p className="mb-3 rounded-[16px] border border-[#eadfbf] bg-[#fff8eb] px-3 py-2 text-xs leading-5 text-[#7a5b1f]">
          Fallback third-party sources are supporting evidence. Treat them as secondary to direct company and job-description evidence.
        </p>
      ) : null}
      <ul className="space-y-1" role="list">
        {unique.map((citation, index) => (
          <li key={`${citation.source_id}-${index}`} className="flex items-start gap-2 text-xs text-[#6b5e52]">
            <span className="mt-[1px] inline-flex min-w-[1.75rem] justify-center rounded-full border border-[#ddd4c8] bg-[#faf6ef] px-1.5 py-0.5 font-semibold text-[#5f554c]">
              [{index + 1}]
            </span>
            <div className="min-w-0 space-y-1">
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
              {citation.evidence_label ? (
                <div>
                  <span className="inline-flex rounded-full border border-[#eadfbf] bg-[#fff4db] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#8a5a14]">
                    {citation.evidence_label}
                  </span>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

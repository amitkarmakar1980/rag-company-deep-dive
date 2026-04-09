"use client";

import { EvidenceContract, ConfidenceLevel } from "@/lib/types";
import { ConfidencePill } from "./SectionShell";

type Props = { data: EvidenceContract };

export function EvidenceContractCard({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Next Best Actions — most actionable, put first */}
      {data.next_best_actions?.length > 0 && (
        <div>
          <SectionLabel
            label="Next Best Actions"
            description="Highest-priority steps before your interview"
          />
          <ol className="space-y-2 mt-2">
            {data.next_best_actions.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 leading-snug">{item.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.rationale}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Candidate Guidance */}
      {data.candidate_guidance?.length > 0 && (
        <div>
          <SectionLabel
            label="Candidate Guidance"
            description="Prep actions tied to verified evidence and identified gaps"
          />
          <ul className="space-y-2 mt-2">
            {data.candidate_guidance.map((item, i) => (
              <li key={i} className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-3 space-y-1">
                <p className="text-sm text-sky-900 leading-snug">{item.action}</p>
                <p className="text-xs text-sky-600 leading-relaxed">
                  <span className="font-semibold">Based on:</span> {item.basis}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified Facts + Key Inferences side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Verified Facts */}
        {data.verified_facts?.length > 0 && (
          <div>
            <SectionLabel
              label="Verified Facts"
              badge={
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  Directly evidenced
                </span>
              }
            />
            <ul className="space-y-2 mt-2">
              {data.verified_facts.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
                  <div>
                    <p className="text-sm text-gray-800 leading-snug">{item.claim}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.source_ref}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Inferences */}
        {data.key_inferences?.length > 0 && (
          <div>
            <SectionLabel
              label="Key Inferences"
              badge={
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  Interpreted
                </span>
              }
            />
            <ul className="space-y-3 mt-2">
              {data.key_inferences.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm text-gray-800 leading-snug">{item.inference}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      <span className="font-medium">Basis:</span> {item.basis}
                    </p>
                    <ConfidencePill level={item.confidence as ConfidenceLevel} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Evidence Gaps */}
      {data.evidence_gaps?.length > 0 && (
        <div>
          <SectionLabel
            label="Evidence Gaps"
            description="What the system cannot assess — validate these live"
            badge={
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
                Unknown
              </span>
            }
          />
          <ul className="space-y-2 mt-2">
            {data.evidence_gaps.map((item, i) => (
              <li key={i} className="bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-gray-700 leading-snug">{item.what_is_missing}</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-semibold">Matters because:</span> {item.why_it_matters}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  label,
  description,
  badge,
}: {
  label: string;
  description?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h3>
      {badge}
      {description && (
        <span className="text-xs text-gray-400">{description}</span>
      )}
    </div>
  );
}

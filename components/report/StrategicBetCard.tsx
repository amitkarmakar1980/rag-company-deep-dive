"use client";

import { StructuredReport, StrategicClassification } from "@/lib/types";
import { BulletList } from "./SectionShell";

type Data = StructuredReport["strategic_bet_analysis"];

const CLASSIFICATION_CONFIG: Record<
  StrategicClassification,
  { border: string; bg: string; text: string; badge: string; description: string }
> = {
  "Strategic Core Bet": {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    description: "This role is tied to a major company priority or platform shift.",
  },
  "Important Enabler": {
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-800",
    description: "Meaningful role — supports a key initiative but not the core thrust.",
  },
  "Opportunistic Build": {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    description: "Useful hire, but likely not on the critical path.",
  },
  "Tactical Fill": {
    border: "border-gray-200",
    bg: "bg-gray-50",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-700",
    description: "Operational gap-fill. Limited strategic leverage.",
  },
  Unclear: {
    border: "border-gray-200",
    bg: "bg-gray-50",
    text: "text-gray-500",
    badge: "bg-gray-100 text-gray-600",
    description: "Insufficient evidence to classify with confidence.",
  },
};

export function StrategicBetSection({ data }: { data: Data }) {
  const cfg = CLASSIFICATION_CONFIG[data.classification] ?? CLASSIFICATION_CONFIG.Unclear;
  const confidencePct = Math.round((data.confidence_score ?? 0) * 100);

  return (
    <div className="space-y-5">
      {/* Classification block */}
      <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span
              className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.badge} mb-2`}
            >
              {data.classification}
            </span>
            <p className={`text-sm ${cfg.text} leading-relaxed`}>{cfg.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className="text-2xl font-bold text-gray-900"
              aria-label={`Classification confidence: ${confidencePct}%`}
            >
              {confidencePct}%
            </div>
            <div className="text-xs text-gray-400">confidence</div>
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Rationale
        </h3>
        <BulletList items={data.rationale ?? []} />
      </div>

      {/* Risks / caveats */}
      {data.risks_caveats && data.risks_caveats.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Risks &amp; Caveats
          </h3>
          <BulletList items={data.risks_caveats} />
        </div>
      )}

      {/* Interview implication */}
      {data.interview_implication && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            What This Means in the Interview
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {data.interview_implication}
          </p>
        </div>
      )}
    </div>
  );
}

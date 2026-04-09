"use client";

import { StructuredReport, StrategicClassification, ConfidenceLevel } from "@/lib/types";

type Props = { data: StructuredReport["strategic_bet_analysis"] };

const CLASS_CONFIG: Record<StrategicClassification, { bg: string; border: string; text: string; badge: string; desc: string }> = {
  "Strategic Core Bet": {
    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900",
    badge: "bg-emerald-600 text-white",
    desc: "Central to company strategy — high visibility, high stakes, high upside",
  },
  "Important Enabler": {
    bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900",
    badge: "bg-sky-600 text-white",
    desc: "Supports a core bet — meaningful scope, moderate visibility",
  },
  "Opportunistic Build": {
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900",
    badge: "bg-amber-500 text-white",
    desc: "Exploratory or adjacency investment — upside if it works, but not yet proven",
  },
  "Tactical Fill": {
    bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700",
    badge: "bg-gray-600 text-white",
    desc: "Operational necessity — solid role, limited strategic upside",
  },
  "Unclear": {
    bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600",
    badge: "bg-gray-500 text-white",
    desc: "Insufficient signal to classify — validate this live",
  },
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — verify live",
  none: "Not assessed",
};

export function StrategicImportanceCard({ data }: Props) {
  // Defensive cast — reports generated before the type rewrite may have
  // the old shape: { confidence_score, rationale[], risks_caveats[], interview_implication }
  const raw = data as any;
  const cfg = CLASS_CONFIG[data.classification] ?? CLASS_CONFIG["Unclear"];

  // New shape: data.confidence (string). Old shape: data.confidence_score (number 0–1).
  const confidenceLabel =
    data.confidence
      ? CONFIDENCE_LABELS[data.confidence] ?? data.confidence
      : raw.confidence_score != null
        ? `${Math.round(raw.confidence_score * 100)}% confidence`
        : null;

  // New arrays
  const whyWeBelieve: string[] = data.why_we_believe_this ?? raw.rationale ?? [];
  const supportingEvidence: string[] = data.supporting_evidence ?? [];
  const whatCouldDisprove: string[] = data.what_could_disprove ?? raw.risks_caveats ?? [];

  // New nested object
  const implication = data.candidate_implication;

  return (
    <div className="space-y-5">
      {/* Classification header */}
      <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-5`}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${cfg.badge} mb-2`}>
              {data.classification}
            </span>
            <p className={`text-sm ${cfg.text} leading-relaxed`}>{cfg.desc}</p>
          </div>
          {confidenceLabel && (
            <span className="text-xs text-gray-400 font-medium">{confidenceLabel}</span>
          )}
        </div>
      </div>

      {/* Evidence grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BulletBlock label="Why We Believe This" items={whyWeBelieve} dotColor="bg-emerald-500" />
        <BulletBlock label="Supporting Evidence" items={supportingEvidence} dotColor="bg-sky-500" />
        <BulletBlock label="What Could Disprove This" items={whatCouldDisprove} dotColor="bg-red-400" />
      </div>

      {/* Candidate implication — only rendered when present (new schema reports) */}
      {implication && (
        <div className="bg-gray-900 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">What This Means for You</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Scope & Impact", value: implication.scope_impact },
              { label: "Visibility", value: implication.visibility },
              { label: "Career Upside", value: implication.career_upside },
              { label: "How to Adapt Your Pitch", value: implication.interview_adaptation },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm text-gray-100 leading-relaxed">{value}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Fallback for old-schema reports: show interview_implication if present */}
      {!implication && raw.interview_implication && (
        <div className="bg-gray-900 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">What This Means in the Interview</p>
          <p className="text-sm text-gray-100 leading-relaxed">{raw.interview_implication}</p>
        </div>
      )}
    </div>
  );
}

function BulletBlock({ label, items, dotColor }: { label: string; items: string[]; dotColor: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden />
            <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

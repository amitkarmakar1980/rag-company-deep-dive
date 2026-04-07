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
};

export function StrategicImportanceCard({ data }: Props) {
  const cfg = CLASS_CONFIG[data.classification] ?? CLASS_CONFIG["Unclear"];

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
          <span className="text-xs text-gray-400 font-medium">{CONFIDENCE_LABELS[data.confidence]}</span>
        </div>
      </div>

      {/* Evidence grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BulletBlock
          label="Why We Believe This"
          items={data.why_we_believe_this}
          dotColor="bg-emerald-500"
        />
        <BulletBlock
          label="Supporting Evidence"
          items={data.supporting_evidence}
          dotColor="bg-sky-500"
        />
        <BulletBlock
          label="What Could Disprove This"
          items={data.what_could_disprove}
          dotColor="bg-red-400"
        />
      </div>

      {/* Candidate implication */}
      <div className="bg-gray-900 rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">What This Means for You</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Scope & Impact", value: data.candidate_implication.scope_impact },
            { label: "Visibility", value: data.candidate_implication.visibility },
            { label: "Career Upside", value: data.candidate_implication.career_upside },
            { label: "How to Adapt Your Pitch", value: data.candidate_implication.interview_adaptation },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm text-gray-100 leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      </div>
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

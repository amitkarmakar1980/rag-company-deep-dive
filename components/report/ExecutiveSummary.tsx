"use client";

import { StructuredReport } from "@/lib/types";
import { BulletList } from "./SectionShell";

type Data = StructuredReport["executive_summary"];

const RECOMMENDATION_CONFIG = {
  pursue: {
    label: "Pursue",
    sublabel: "Strong signals — move forward",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    ),
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
  },
  pursue_cautiously: {
    label: "Pursue Cautiously",
    sublabel: "Mixed signals — proceed with eyes open",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
  },
  avoid: {
    label: "Avoid",
    sublabel: "Significant red flags detected",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
  },
  need_more_signal: {
    label: "Need More Signal",
    sublabel: "Insufficient evidence to recommend",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    border: "border-gray-200",
    bg: "bg-gray-50",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-700",
  },
};

export function ExecutiveSummarySection({ data }: { data: Data }) {
  const config = RECOMMENDATION_CONFIG[data.recommendation] ?? RECOMMENDATION_CONFIG.need_more_signal;

  return (
    <div className="space-y-5">
      {/* Recommendation block */}
      <div
        className={`${config.bg} border ${config.border} rounded-lg p-4 flex items-start gap-3`}
        role="status"
        aria-label={`Recommendation: ${config.label}`}
      >
        <span className={`${config.text} mt-0.5`}>{config.icon}</span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-base font-bold ${config.text}`}>{config.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
              {data.pursuit_stance}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">
            {data.recommendation_rationale}
          </p>
        </div>
      </div>

      {/* Key bullets */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Key Insights
        </h3>
        <BulletList items={data.key_bullets} />
      </div>
    </div>
  );
}

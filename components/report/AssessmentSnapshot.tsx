"use client";

import { StructuredReport, ScoreDetail, RiskScoreDetail } from "@/lib/types";

type Data = StructuredReport["assessment_snapshot"];

interface MetricCardProps {
  label: string;
  detail: ScoreDetail | RiskScoreDetail;
  inverse?: boolean;
}

const SIGNAL_ICONS = {
  Strong: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Mixed: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  ),
  Weak: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11l-7-7-7 7" />
    </svg>
  ),
  Low: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Medium: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  ),
  High: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
};

function getLabelStyle(label: string, inverse: boolean) {
  if (label === "NOT_ASSESSED") return "text-[#9c8d81] bg-[#f5f1e8] border-[#e4ddd4]";
  if (inverse) {
    if (label === "Low") return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (label === "Medium") return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  } else {
    if (label === "Strong") return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (label === "Mixed") return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-[#6b5e52] bg-[#f0ece4] border-[#e4ddd4]";
  }
}

function getBarColor(label: string, inverse: boolean) {
  if (inverse) {
    if (label === "Low") return "bg-emerald-500";
    if (label === "Medium") return "bg-amber-400";
    return "bg-red-400";
  } else {
    if (label === "Strong") return "bg-emerald-500";
    if (label === "Mixed") return "bg-amber-400";
    return "bg-gray-300";
  }
}

function MetricCard({ label, detail, inverse = false }: MetricCardProps) {
  const isNotAssessed = detail.label === "NOT_ASSESSED" || detail.score === null;
  const labelStyle = getLabelStyle(detail.label, inverse);
  const barColor = getBarColor(detail.label, inverse);
  const score = detail.score ?? 0;
  const barWidth = isNotAssessed
    ? "0%"
    : inverse
    ? `${((10 - score + 1) / 10) * 100}%`
    : `${(score / 10) * 100}%`;

  const icon = SIGNAL_ICONS[detail.label as keyof typeof SIGNAL_ICONS];

  if (isNotAssessed) {
    return (
      <div
        className="bg-[#f5f1e8] border border-dashed border-[#e4ddd4] rounded-lg p-4 space-y-2"
        role="group"
        aria-label={`${label}: not assessed`}
      >
        <div className="text-xs font-semibold text-[#9c8d81] leading-tight">{label}</div>
        <div className="text-sm font-medium text-[#9c8d81]">Not assessed</div>
        <p className="text-xs text-[#9c8d81] leading-relaxed">{detail.rationale}</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-[#e4ddd4] rounded-lg p-4 space-y-3"
      role="group"
      aria-label={`${label}: ${detail.label}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-[#7a6d63] leading-tight">{label}</div>
        <div
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${labelStyle}`}
          aria-label={`Signal strength: ${detail.label}`}
        >
          {icon}
          {detail.label}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[#1c1713] leading-none" aria-label={`Score: ${score} out of 10`}>
          {score}
        </span>
        <span className="text-xs text-[#9c8d81] mb-0.5">/ 10</span>
      </div>

      <div
        className="w-full bg-[#f0ece4] rounded-full h-1.5"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-label={`${label} score bar`}
      >
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: barWidth }}
        />
      </div>

      <p className="text-xs text-[#7a6d63] leading-relaxed">{detail.rationale}</p>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#9c8d81]">Confidence:</span>
        <span
          className={`text-xs font-medium ${
            detail.confidence === "high"
              ? "text-emerald-600"
              : detail.confidence === "medium"
              ? "text-amber-600"
              : "text-[#9c8d81]"
          }`}
        >
          {detail.confidence}
        </span>
      </div>
    </div>
  );
}

export function AssessmentSnapshotSection({ data }: { data: Data }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard label="Company Momentum" detail={data.company_momentum} />
      <MetricCard label="Org Clarity" detail={data.org_clarity} />
      <MetricCard label="Role Leverage" detail={data.role_leverage} />
      <MetricCard label="Execution Risk" detail={data.execution_risk} inverse />
      <MetricCard label="Candidate-Role Match" detail={data.candidate_role_match} />
      <MetricCard label="Evidence Strength" detail={data.evidence_strength} />
    </div>
  );
}

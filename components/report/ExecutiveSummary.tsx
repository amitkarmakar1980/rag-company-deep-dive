"use client";

import { StructuredReport } from "@/lib/types";
import { getCanonicalRecommendation } from "@/lib/report/recommendation";
import { BulletList } from "./SectionShell";

type Data = StructuredReport["executive_summary"];

export function ExecutiveSummarySection({ data }: { data: Data }) {
  const recommendation = getCanonicalRecommendation({
    executiveRecommendation: data.recommendation,
    pursuitStance: data.pursuit_stance,
  });
  const badgeTone =
    recommendation.level >= 4
      ? "bg-emerald-600 text-white"
      : recommendation.level === 3
      ? "bg-sky-600 text-white"
      : recommendation.level === 2
      ? "bg-amber-500 text-white"
      : "bg-red-600 text-white";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${badgeTone}`}>
          {recommendation.displayLabel}
        </span>
      </div>

      {/* Rationale — plain prose, no colored recommendation banner */}
      {data.recommendation_rationale && (
        <p className="text-sm text-[#6b5e52] leading-relaxed border-l-2 border-[#e4ddd4] pl-3">
          {data.recommendation_rationale}
        </p>
      )}

      {/* Key bullets */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-3">
          Key Insights
        </h3>
        <BulletList items={data.key_bullets} />
      </div>
    </div>
  );
}

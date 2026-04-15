"use client";

import { StructuredReport } from "@/lib/types";
import { BulletList } from "./SectionShell";

type Data = StructuredReport["executive_summary"];

export function ExecutiveSummarySection({ data }: { data: Data }) {
  return (
    <div className="space-y-5">
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

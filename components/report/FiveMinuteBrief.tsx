"use client";

import { StructuredReport } from "@/lib/types";

type Props = { data: StructuredReport["five_minute_brief"] };

export function FiveMinuteBrief({ data }: Props) {
  const rows: { label: string; value: string; accent?: string }[] = [
    { label: "What the company cares about", value: data.what_company_cares_about, accent: "border-l-sky-400" },
    { label: "Why this role exists", value: data.why_role_exists, accent: "border-l-sky-400" },
    { label: "Likely success metric", value: data.likely_success_metric, accent: "border-l-emerald-400" },
    { label: "Best candidate angle", value: data.best_candidate_angle, accent: "border-l-emerald-400" },
    { label: "Biggest concern to address", value: data.biggest_concern_to_address, accent: "border-l-amber-400" },
    { label: "Most important risk", value: data.most_important_risk, accent: "border-l-red-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map(({ label, value, accent }) => (
          <div
            key={label}
            className={`bg-white border border-[#e4ddd4] border-l-4 ${accent} rounded-lg px-4 py-3`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-1">{label}</p>
            <p className="text-sm text-[#1c1713] leading-relaxed">{value}</p>
          </div>
        ))}
      </div>

      {/* Top 3 smart questions */}
      <section aria-labelledby="five-minute-brief-smart-questions" className="bg-[#1a4a3a] rounded-xl px-5 py-4">
        <h3 id="five-minute-brief-smart-questions" className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#d8f3e7]">
          Top 3 Smart Questions
        </h3>
        <ol className="space-y-2">
          {(data.top_3_smart_questions ?? []).map((q, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/12 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-[#f6fbf8]">{q}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

"use client";

import { StructuredReport, PursueRecommendation } from "@/lib/types";

type Props = { data: StructuredReport["interview_decision_summary"] };

const PURSUE_CONFIG: Record<PursueRecommendation, { bg: string; border: string; text: string; badge: string; accentBg: string }> = {
  "Aggressive Pursue": {
    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900",
    badge: "bg-emerald-600 text-white", accentBg: "bg-emerald-100/60",
  },
  "Selective Pursue": {
    bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900",
    badge: "bg-sky-600 text-white", accentBg: "bg-sky-100/60",
  },
  "Cautious Pursue": {
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900",
    badge: "bg-amber-500 text-white", accentBg: "bg-amber-100/60",
  },
  "Pass": {
    bg: "bg-red-50", border: "border-red-200", text: "text-red-900",
    badge: "bg-red-600 text-white", accentBg: "bg-red-100/60",
  },
};

function isRequiresResume(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("REQUIRES_RESUME");
}

export function InterviewDecisionSummary({ data }: Props) {
  const cfg = PURSUE_CONFIG[data.pursue_recommendation] ?? PURSUE_CONFIG["Selective Pursue"];
  const hasPositioningAngle = !isRequiresResume(data.best_positioning_angle);

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl overflow-hidden`}>
      {/* Recommendation header */}
      <div className="px-5 py-4 border-b border-black/5 flex items-start gap-3 flex-wrap">
        <span className={`flex-shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${cfg.badge}`}>
          {data.pursue_recommendation}
        </span>
        <p className={`text-sm font-medium ${cfg.text} leading-relaxed`}>{data.why}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Positioning angle — primary card, full width */}
        {hasPositioningAngle ? (
          <div className={`${cfg.accentBg} border border-black/8 rounded-xl p-4 space-y-1.5`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Best Positioning Angle
            </div>
            <p className="text-[0.95rem] font-medium text-[#1c1713] leading-relaxed">{data.best_positioning_angle}</p>
          </div>
        ) : (
          <div className="bg-white/50 border border-dashed border-[#c8bfb4] rounded-xl p-4 flex items-center gap-3">
            <svg className="w-4 h-4 text-[#9c8d81] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm text-[#7a6d63]">
              <span className="font-medium text-[#4a3f36]">Best Positioning Angle</span>
              {" "}— upload your resume for a personalized positioning angle tailored to your background.
            </p>
          </div>
        )}

        {/* Secondary cards — concern, watchout, red flag */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SmallCard label="Biggest Concern" icon="⚠" color="text-amber-700">
            {data.biggest_interviewer_concern}
          </SmallCard>
          <SmallCard label="Interview Watchout" icon="✕" color="text-red-700">
            {data.interview_watchout}
          </SmallCard>
          <SmallCard label="Red Flag to Validate" icon="?" color="text-[#6b5e52]">
            {data.red_flag_to_validate}
          </SmallCard>
        </div>

        {/* Top 3 questions */}
        {(data.top_3_questions ?? []).length > 0 && (
          <div className="bg-white/60 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7a6d63]">Top Questions to Ask</p>
            <ol className="space-y-2">
              {(data.top_3_questions ?? []).map((q, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full ${cfg.badge} text-xs font-bold flex items-center justify-center mt-0.5`}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#1c1713] leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function SmallCard({ label, icon, color, children }: { label: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/70 rounded-lg p-3 space-y-1">
      <div className={`flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wider ${color}`}>
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <p className="text-xs text-[#4a3f36] leading-relaxed">{children}</p>
    </div>
  );
}

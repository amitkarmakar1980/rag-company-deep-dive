"use client";

import { StructuredReport, PursueRecommendation } from "@/lib/types";

type Props = { data: StructuredReport["interview_decision_summary"] };

const PURSUE_CONFIG: Record<PursueRecommendation, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  "Aggressive Pursue": {
    bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-900",
    badge: "bg-emerald-600 text-white", dot: "bg-emerald-500",
  },
  "Selective Pursue": {
    bg: "bg-sky-50", border: "border-sky-300", text: "text-sky-900",
    badge: "bg-sky-600 text-white", dot: "bg-sky-500",
  },
  "Cautious Pursue": {
    bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-900",
    badge: "bg-amber-500 text-white", dot: "bg-amber-400",
  },
  "Pass": {
    bg: "bg-red-50", border: "border-red-300", text: "text-red-900",
    badge: "bg-red-600 text-white", dot: "bg-red-500",
  },
};

export function InterviewDecisionSummary({ data }: Props) {
  const cfg = PURSUE_CONFIG[data.pursue_recommendation] ?? PURSUE_CONFIG["Selective Pursue"];

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 space-y-5`}>
      {/* Recommendation header */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${cfg.badge}`}>
          {data.pursue_recommendation}
        </span>
        <p className={`text-sm font-medium ${cfg.text} leading-relaxed`}>{data.why}</p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card label="Best Positioning Angle" icon="→" color="text-emerald-700">
          {data.best_positioning_angle}
        </Card>
        <Card label="Biggest Interviewer Concern" icon="⚠" color="text-amber-700">
          {data.biggest_interviewer_concern}
        </Card>
        <Card label="Interview Watchout" icon="✕" color="text-red-700">
          {data.interview_watchout}
        </Card>
        <Card label="Red Flag to Validate Live" icon="?" color="text-gray-600">
          {data.red_flag_to_validate}
        </Card>
      </div>

      {/* Top 3 questions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Top 3 Questions to Ask</p>
        <ol className="space-y-1.5">
          {data.top_3_questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full ${cfg.badge} text-xs font-bold flex items-center justify-center mt-0.5`}>
                {i + 1}
              </span>
              <span className="text-sm text-gray-800 leading-relaxed">{q}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Card({ label, icon, color, children }: { label: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/70 rounded-lg p-3.5 space-y-1">
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${color}`}>
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <p className="text-sm text-gray-800 leading-relaxed">{children}</p>
    </div>
  );
}

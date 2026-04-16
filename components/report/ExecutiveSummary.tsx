"use client";

import { StructuredReport } from "@/lib/types";
import { getCanonicalRecommendation } from "@/lib/report/recommendation";
import { BulletList } from "./SectionShell";

type Data = StructuredReport["executive_summary"] & {
  interview_decision_summary?: StructuredReport["interview_decision_summary"];
};

function isRequiresResume(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("REQUIRES_RESUME");
}

function buildSummaryParagraph(
  rationale: string | null | undefined,
  roleFocus: string | null | undefined
): string | null {
  const parts = [rationale?.trim(), roleFocus?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const [first, second] = parts;
  return first.toLowerCase() === second.toLowerCase() ? first : `${first} ${second}`;
}

function SmallCard({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#fffdfa] border border-[#e4ddd4] rounded-lg p-3 space-y-1">
      <p className={`text-[0.68rem] font-semibold uppercase tracking-wider ${color}`}>{label}</p>
      <p className="text-xs text-[#4a3f36] leading-relaxed">{children}</p>
    </div>
  );
}

export function ExecutiveSummarySection({ data }: { data: Data }) {
  const interviewDecision = data.interview_decision_summary;
  const recommendation = getCanonicalRecommendation({
    executiveRecommendation: data.recommendation,
    pursuitStance: data.pursuit_stance,
  });
  const summaryParagraph = buildSummaryParagraph(
    data.recommendation_rationale,
    interviewDecision?.why
  );
  const hasPositioningAngle = Boolean(
    interviewDecision?.best_positioning_angle &&
      !isRequiresResume(interviewDecision.best_positioning_angle)
  );
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
      {summaryParagraph && (
        <p className="text-sm text-[#6b5e52] leading-relaxed border-l-2 border-[#e4ddd4] pl-3">
          {summaryParagraph}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81]">
          Recommendation
        </span>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${badgeTone}`}>
          {recommendation.displayLabel}
        </span>
      </div>

      {data.key_bullets?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-3">
            Key Insights
          </h3>
          <BulletList items={data.key_bullets} />
        </div>
      )}

      {interviewDecision && (
        <>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81]">
              Best Positioning Angle
            </h3>
            {hasPositioningAngle ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-[#1c1713] leading-relaxed">
                  {interviewDecision.best_positioning_angle}
                </p>
              </div>
            ) : (
              <div className="bg-white/70 border border-dashed border-[#c8bfb4] rounded-xl px-4 py-3">
                <p className="text-sm text-[#7a6d63] leading-relaxed">
                  Upload your resume for a personalized positioning angle tailored to your background.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SmallCard label="Biggest Concern" color="text-amber-700">
              {interviewDecision.biggest_interviewer_concern}
            </SmallCard>
            <SmallCard label="Interview Watchout" color="text-red-700">
              {interviewDecision.interview_watchout}
            </SmallCard>
            <SmallCard label="Red Flag to Validate" color="text-[#6b5e52]">
              {interviewDecision.red_flag_to_validate}
            </SmallCard>
          </div>

          {(interviewDecision.top_3_questions ?? []).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-3">
                Top Questions to Ask
              </h3>
              <ol className="space-y-2">
                {(interviewDecision.top_3_questions ?? []).map((question, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeTone}`}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-[#1c1713] leading-relaxed">{question}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

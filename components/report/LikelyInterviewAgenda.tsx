"use client";

import { StructuredReport } from "@/lib/types";

type Props = { data: StructuredReport["likely_interview_agenda"] };

export function LikelyInterviewAgenda({ data }: Props) {
  if (!data.dimensions?.length) return null;

  return (
    <div className="space-y-2">
      {data.dimensions.map((dim, i) => {
        return (
          <div key={i} className="border border-[#e4ddd4] rounded-xl overflow-hidden">
            <div className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left bg-[#fcfaf6]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f0ece4] text-[#7a6d63] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-[#1c1713] truncate">{dim.dimension}</span>
              </div>
            </div>

            <div className="px-5 pb-4 pt-3 space-y-3 border-t border-[#f0ece4]">
              <Row label="What they're validating" value={dim.what_they_validate} color="text-sky-700" />
              <Row label="What they worry about" value={dim.what_they_worry_about} color="text-amber-700" />
              <Row label="Proof they need" value={dim.proof_needed} color="text-emerald-700" />
              <Row label="What to demonstrate" value={dim.what_to_demonstrate} color="text-[#4a3f36]" dot />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, color, dot }: { label: string; value: string; color: string; dot?: boolean }) {
  return (
    <div className={`pl-3 border-l-2 ${dot ? "border-[#d4cdc4]" : "border-[#e4ddd4]"}`}>
      <p className={`text-xs font-semibold mb-0.5 ${color}`}>{label}</p>
      <p className="text-sm text-[#4a3f36] leading-relaxed">{value}</p>
    </div>
  );
}

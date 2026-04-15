"use client";

import { useState } from "react";
import { StructuredReport } from "@/lib/types";

type Props = { data: StructuredReport["likely_interview_agenda"] };

export function LikelyInterviewAgenda({ data }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  if (!data.dimensions?.length) return null;

  return (
    <div className="space-y-2">
      {data.dimensions.map((dim, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="border border-[#e4ddd4] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-[#f5f1e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1a4a3a]/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f0ece4] text-[#7a6d63] text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-[#1c1713] truncate">{dim.dimension}</span>
              </div>
              <svg
                className={`w-4 h-4 text-[#9c8d81] flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-4 pt-1 space-y-3 border-t border-[#f0ece4]">
                <Row label="What they're validating" value={dim.what_they_validate} color="text-sky-700" />
                <Row label="What they worry about" value={dim.what_they_worry_about} color="text-amber-700" />
                <Row label="Proof they need" value={dim.proof_needed} color="text-emerald-700" />
                <Row label="What to demonstrate" value={dim.what_to_demonstrate} color="text-[#4a3f36]" dot />
              </div>
            )}
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

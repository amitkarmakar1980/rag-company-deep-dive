"use client";

import { useState } from "react";
import { CandidateOverlayData } from "@/lib/types";

type Props = { data: CandidateOverlayData["objection_handling"] };

export function ObjectionHandlingSection({ data }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  if (!data?.objections?.length) return null;

  return (
    <div className="space-y-2">
      {data.objections.map((obj, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="border border-red-200 rounded-xl overflow-hidden bg-red-50">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-start justify-between gap-3 px-5 py-3.5 text-left hover:bg-red-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm font-semibold text-red-900">{obj.objection}</p>
              </div>
              <svg
                className={`w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-4 pt-2 space-y-3 border-t border-red-200 bg-white">
                <Row label="Why they think this" value={obj.why_they_think_this} color="text-amber-700" />
                <Row label="How to respond honestly" value={obj.how_to_respond} color="text-emerald-700" />

                {obj.proof_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-sky-700 mb-1.5">Strongest proof points from your resume</p>
                    <ul className="space-y-1">
                      {obj.proof_points.map((p, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-[#4a3f36]">
                          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" aria-hidden />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-semibold text-red-700 mb-1">What not to say / not to overclaim</p>
                  <p className="text-xs text-[#4a3f36] leading-relaxed">{obj.what_not_to_say}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-xs font-semibold mb-0.5 ${color}`}>{label}</p>
      <p className="text-sm text-[#4a3f36] leading-relaxed">{value}</p>
    </div>
  );
}

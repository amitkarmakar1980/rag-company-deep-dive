"use client";

import { StructuredReport } from "@/lib/types";

type Props = { data: StructuredReport["unknowns_to_validate"] };

export function UnknownsToValidate({ data }: Props) {
  if (!data.unknowns?.length) return null;

  return (
    <div className="space-y-2">
      {data.unknowns.map((unknown, index) => (
        <div key={index} className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 text-left bg-amber-50">
            <div className="flex items-start gap-3 min-w-0">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">{unknown.what_is_unclear}</p>
                <p className="text-xs text-amber-700 mt-0.5">{unknown.why_it_matters}</p>
              </div>
            </div>
          </div>

          <div className="px-5 pb-4 pt-1 space-y-3 border-t border-amber-200">
            <Detail label="Why it matters" value={unknown.why_it_matters} />
            <div className="bg-white rounded-lg px-4 py-3 border border-amber-100">
              <p className="text-xs font-semibold text-[#7a6d63] mb-1">Ask this</p>
              <p className="text-sm text-[#1c1713] font-medium leading-relaxed italic">&ldquo;{unknown.question_to_ask}&rdquo;</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Reassuring answer</p>
                <p className="text-xs text-[#4a3f36] leading-relaxed">{unknown.reassuring_answer}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-red-700 mb-1">Concerning answer</p>
                <p className="text-xs text-[#4a3f36] leading-relaxed">{unknown.concerning_answer}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-amber-800 mb-0.5">{label}</p>
      <p className="text-sm text-[#4a3f36] leading-relaxed">{value}</p>
    </div>
  );
}

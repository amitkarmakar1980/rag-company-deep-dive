"use client";

import { useState } from "react";
import { StructuredReport, QuestionItem } from "@/lib/types";

type Data = StructuredReport["questions_to_ask"];

function QuestionRow({ item, rank }: { item: QuestionItem; rank?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border border-[#e4ddd4] rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-[#f5f1e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          {rank !== undefined && (
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a4a3a] text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {rank}
            </span>
          )}
          <span className="text-sm text-[#1c1713] leading-relaxed font-medium">{item.question}</span>
        </div>
        <svg
          className={`flex-shrink-0 w-4 h-4 text-[#9c8d81] mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#f0ece4]">
          <div>
            <p className="text-xs font-semibold text-[#9c8d81] uppercase tracking-wide mb-1">Why it matters</p>
            <p className="text-sm text-[#4a3f36] leading-relaxed">{item.why_it_matters}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Strong answer sounds like</p>
              <p className="text-xs text-[#4a3f36] leading-relaxed">{item.strong_answer}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Weak / concerning answer</p>
              <p className="text-xs text-[#4a3f36] leading-relaxed">{item.weak_answer}</p>
            </div>
          </div>
          {item.follow_up && (
            <div className="bg-[#f5f1e8] border border-[#e4ddd4] rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-[#7a6d63] mb-1">Follow-up if the answer is strong</p>
              <p className="text-xs text-[#4a3f36] italic leading-relaxed">&ldquo;{item.follow_up}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function QuestionsSection({ data }: { data: Data }) {
  const mustAsk: QuestionItem[] = data.must_ask ?? [];
  const good: QuestionItem[] = data.good_questions ?? [];

  // Backwards-compat: old format had strategy/role_scope/etc keys
  const legacyItems: QuestionItem[] = [
    ...((data as any).strategy ?? []),
    ...((data as any).role_scope ?? []),
    ...((data as any).team_execution ?? []),
    ...((data as any).success_metrics ?? []),
    ...((data as any).risks_constraints ?? []),
  ];

  if (mustAsk.length === 0 && good.length === 0 && legacyItems.length > 0) {
    return (
      <ul className="space-y-2" role="list">
        {legacyItems.map((item, i) => <QuestionRow key={i} item={item} />)}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      {mustAsk.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1c1713] bg-[#1a4a3a] text-white px-2.5 py-1 rounded-full">
              Must Ask
            </span>
            <span className="text-xs text-[#9c8d81]">Top {mustAsk.length} — ask these no matter what</span>
          </div>
          <ul className="space-y-2" role="list">
            {mustAsk.map((item, i) => <QuestionRow key={i} item={item} rank={i + 1} />)}
          </ul>
        </div>
      )}

      {good.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-3">Additional Good Questions</p>
          <ul className="space-y-2" role="list">
            {good.map((item, i) => <QuestionRow key={i} item={item} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

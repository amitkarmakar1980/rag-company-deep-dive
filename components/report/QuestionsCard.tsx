"use client";

import { useState } from "react";
import { StructuredReport, QuestionItem } from "@/lib/types";

type Data = StructuredReport["questions_to_ask"];

const CATEGORY_CONFIG = {
  strategy: { label: "Strategy", color: "text-sky-700", border: "border-sky-200" },
  role_scope: { label: "Role Scope", color: "text-violet-700", border: "border-violet-200" },
  team_execution: { label: "Team & Execution", color: "text-emerald-700", border: "border-emerald-200" },
  success_metrics: { label: "Success Metrics", color: "text-amber-700", border: "border-amber-200" },
  risks_constraints: { label: "Risks & Constraints", color: "text-red-700", border: "border-red-200" },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;

function QuestionRow({ item }: { item: QuestionItem }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 transition-colors"
      >
        <span className="text-sm text-gray-800 leading-relaxed font-medium">
          {item.question}
        </span>
        <svg
          className={`flex-shrink-0 w-4 h-4 text-gray-400 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Why it matters
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{item.why_it_matters}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Strong answer</p>
              <p className="text-xs text-gray-700 leading-relaxed">{item.strong_answer}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Weak / concerning answer</p>
              <p className="text-xs text-gray-700 leading-relaxed">{item.weak_answer}</p>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function QuestionsSection({ data }: { data: Data }) {
  const categories: CategoryKey[] = [
    "strategy",
    "role_scope",
    "team_execution",
    "success_metrics",
    "risks_constraints",
  ];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const items: QuestionItem[] = data[cat] ?? [];
        if (items.length === 0) return null;
        const cfg = CATEGORY_CONFIG[cat];

        return (
          <div key={cat}>
            <h3
              className={`text-xs font-semibold uppercase tracking-wider ${cfg.color} mb-3`}
            >
              {cfg.label}
            </h3>
            <ul className="space-y-2" role="list">
              {items.map((item, i) => (
                <QuestionRow key={i} item={item} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

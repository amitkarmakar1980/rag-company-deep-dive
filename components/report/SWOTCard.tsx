"use client";

import { SWOTSection } from "@/lib/types";

interface SWOTCardProps {
  data: SWOTSection;
}

const QUADRANT_CONFIG = {
  strengths: {
    label: "Strengths",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    heading: "text-emerald-700",
    dot: "bg-emerald-500",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  weaknesses: {
    label: "Weaknesses",
    border: "border-red-200",
    bg: "bg-red-50",
    heading: "text-red-700",
    dot: "bg-red-400",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
    ),
  },
  opportunities: {
    label: "Opportunities",
    border: "border-sky-200",
    bg: "bg-sky-50",
    heading: "text-sky-700",
    dot: "bg-sky-500",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    ),
  },
  threats: {
    label: "Threats",
    border: "border-amber-200",
    bg: "bg-amber-50",
    heading: "text-amber-700",
    dot: "bg-amber-500",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
} as const;

type QuadrantKey = keyof typeof QUADRANT_CONFIG;

export function SWOTCard({ data }: SWOTCardProps) {
  const quadrants: QuadrantKey[] = ["strengths", "weaknesses", "opportunities", "threats"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {quadrants.map((key) => {
        const cfg = QUADRANT_CONFIG[key];
        const items = data[key] ?? [];

        return (
          <div
            key={key}
            className={`${cfg.bg} border ${cfg.border} rounded-lg p-4`}
            role="region"
            aria-label={cfg.label}
          >
            <div className={`flex items-center gap-2 mb-3 ${cfg.heading}`}>
              {cfg.icon}
              <h3 className="text-xs font-semibold uppercase tracking-wide">
                {cfg.label}
              </h3>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-400">No items identified</p>
            ) : (
              <ul className="space-y-2.5" role="list">
                {items.map((item, i) => (
                  <li key={i} className="space-y-0.5">
                    <div className="flex gap-2">
                      <span
                        className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                        aria-hidden
                      />
                      <span className="text-sm text-gray-800 leading-relaxed">
                        {item.point}
                      </span>
                    </div>
                    {item.evidence && (
                      <p className="text-xs text-gray-500 pl-3.5 leading-relaxed">
                        {item.evidence}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

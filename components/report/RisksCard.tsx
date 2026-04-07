"use client";

import { RiskFlag } from "@/lib/types";

const SEVERITY_CONFIG = {
  high: {
    border: "border-red-200",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-800",
    icon: (
      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    icon: (
      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
    ),
  },
  low: {
    border: "border-gray-200",
    bg: "bg-gray-50",
    badge: "bg-gray-100 text-gray-700",
    icon: (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export function RisksSection({ data }: { data: RiskFlag[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400">No significant risk flags identified.</p>;
  }

  const sorted = [...data].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 1) - (order[b.severity] ?? 1);
  });

  return (
    <ul className="space-y-3" role="list">
      {sorted.map((risk, i) => {
        const cfg = SEVERITY_CONFIG[risk.severity] ?? SEVERITY_CONFIG.low;
        return (
          <li
            key={i}
            className={`${cfg.bg} border ${cfg.border} rounded-lg p-4`}
            role="article"
            aria-label={`Risk: ${risk.flag}, severity: ${risk.severity}`}
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {risk.flag}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                    {risk.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-800">Signal: </span>
                  {risk.signal}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-800">Impact: </span>
                  {risk.impact}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

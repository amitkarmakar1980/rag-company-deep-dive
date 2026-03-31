"use client";

import { ReportScore } from "@/lib/types";

interface ScoreCardsProps {
  scores: ReportScore;
}

export function ScoreCards({ scores }: ScoreCardsProps) {
  const scoreItems = [
    {
      label: "Company Momentum",
      value: scores.company_momentum,
      description: "Recent launches, hiring, product updates",
    },
    {
      label: "Org Clarity",
      value: scores.org_clarity,
      description: "Role clarity, strategic consistency",
    },
    {
      label: "Role Leverage",
      value: scores.role_leverage,
      description: "Role scope and impact potential",
    },
    {
      label: "Execution Risk",
      value: scores.execution_risk,
      description: "Restructuring, leadership changes, conflicts (lower is better)",
      inverse: true,
    },
    {
      label: "Candidate Fit",
      value: scores.candidate_fit,
      description: "JD overlap and profile alignment",
    },
  ];

  const getColor = (value: number, inverse = false) => {
    if (inverse) {
      // For risk, lower is better
      if (value <= 3) return "text-green-600 bg-green-50";
      if (value <= 6) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    } else {
      if (value >= 7) return "text-green-600 bg-green-50";
      if (value >= 5) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {scoreItems.map((item) => (
        <div
          key={item.label}
          className={`p-4 rounded-lg border ${getColor(item.value, item.inverse)}`}
        >
          <div className="text-xs font-medium text-gray-600 mb-2">
            {item.label}
          </div>
          <div className="text-3xl font-bold mb-2">{item.value.toFixed(1)}</div>
          <div className="text-xs text-gray-600">{item.description}</div>
          <div className="mt-2 text-xs">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className={`h-1 rounded-full ${
                  item.inverse
                    ? "bg-red-600"
                    : "bg-green-600"
                }`}
                style={{ width: `${(item.value / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

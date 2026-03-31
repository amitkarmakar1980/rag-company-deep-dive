"use client";

import { RecommendationType } from "@/lib/types";

interface RecommendationBannerProps {
  recommendation: RecommendationType;
}

export function RecommendationBanner({
  recommendation,
}: RecommendationBannerProps) {
  const config = {
    pursue: {
      bg: "bg-green-50",
      border: "border-green-300",
      text: "text-green-900",
      label: "Pursue",
      emoji: "🚀",
    },
    pursue_cautiously: {
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      text: "text-yellow-900",
      label: "Pursue Cautiously",
      emoji: "⚠️",
    },
    avoid: {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-900",
      label: "Avoid",
      emoji: "❌",
    },
    need_more_signal: {
      bg: "bg-gray-50",
      border: "border-gray-300",
      text: "text-gray-900",
      label: "Need More Signal",
      emoji: "❓",
    },
  };

  const style = config[recommendation];

  return (
    <div
      className={`${style.bg} border-l-4 ${style.border} p-6 mb-8 rounded`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{style.emoji}</span>
        <div>
          <h2 className={`text-2xl font-bold ${style.text} mb-1`}>
            {style.label}
          </h2>
          <p className={`${style.text} opacity-75`}>
            Based on AI analysis of public signals and provided context
          </p>
        </div>
      </div>
    </div>
  );
}

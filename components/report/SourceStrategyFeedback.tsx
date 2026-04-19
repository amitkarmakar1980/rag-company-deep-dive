"use client";

import { useState } from "react";

type SourceStrategyFeedbackValue = "too_little" | "just_right" | "too_much";

const OPTIONS: Array<{ value: SourceStrategyFeedbackValue; label: string; className: string }> = [
  {
    value: "too_little",
    label: "Too little",
    className: "hover:border-amber-300 hover:bg-amber-50 hover:text-[#8a5a14]",
  },
  {
    value: "just_right",
    label: "Just right",
    className: "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
  },
  {
    value: "too_much",
    label: "Too much",
    className: "hover:border-red-300 hover:bg-red-50 hover:text-red-700",
  },
];

export function SourceStrategyFeedback({
  reportId,
  sectionKey = "source_strategy_catalog",
}: {
  reportId: string;
  sectionKey?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<SourceStrategyFeedbackValue | null>(null);

  const handleFeedback = async (feedbackType: SourceStrategyFeedbackValue) => {
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, sectionKey, feedbackType }),
      });
      setSubmitted(feedbackType);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-[#4a3f36]">Did this source catalog feel too little, just right, or too much for company strategy?</p>
      {submitted ? (
        <p className="mt-3 text-sm text-[#9c8d81]" role="status" aria-live="polite">
          {submitted === "just_right"
            ? "Thanks. That helps calibrate the source-strategy depth."
            : submitted === "too_little"
            ? "Thanks. That signals the strategy should expand further before synthesis."
            : "Thanks. That signals the strategy can be tightened down."}
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Source strategy feedback">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFeedback(option.value)}
              disabled={loading}
              className={`rounded-full border border-[#d4cdc4] bg-white px-4 py-2 text-sm text-[#4a3f36] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/30 disabled:opacity-40 transition-colors ${option.className}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
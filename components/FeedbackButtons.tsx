"use client";

import { useState } from "react";

interface FeedbackButtonsProps {
  reportId: string;
  sectionKey: string;
  compact?: boolean;
}

export function FeedbackButtons({ reportId, sectionKey, compact = false }: FeedbackButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<"useful" | "not_useful" | null>(null);

  const handleFeedback = async (feedbackType: "useful" | "not_useful") => {
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

  if (submitted) {
    return (
      <p
        className="text-xs text-gray-400"
        role="status"
        aria-live="polite"
      >
        {submitted === "useful" ? "Marked as useful" : "Thanks for the feedback"}
      </p>
    );
  }

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Section feedback"
    >
      {!compact && (
        <span className="text-xs text-gray-400" aria-hidden>
          Helpful?
        </span>
      )}
      <button
        onClick={() => handleFeedback("useful")}
        disabled={loading}
        aria-label="Mark section as useful"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white text-gray-500 border border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:opacity-40 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        Useful
      </button>
      <button
        onClick={() => handleFeedback("not_useful")}
        disabled={loading}
        aria-label="Mark section as not useful"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white text-gray-500 border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:opacity-40 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Not useful
      </button>
    </div>
  );
}

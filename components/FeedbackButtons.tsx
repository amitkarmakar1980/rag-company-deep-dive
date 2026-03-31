"use client";

import { useState } from "react";

interface FeedbackButtonsProps {
  reportId: string;
  sectionKey: string;
}

export function FeedbackButtons({
  reportId,
  sectionKey,
}: FeedbackButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<"useful" | "not_useful" | null>(
    null
  );

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

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Was this helpful?</span>
      <button
        onClick={() => handleFeedback("useful")}
        disabled={loading || submitted !== null}
        className={`px-3 py-1 rounded ${
          submitted === "useful"
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } disabled:opacity-50`}
      >
        ✓ Useful
      </button>
      <button
        onClick={() => handleFeedback("not_useful")}
        disabled={loading || submitted !== null}
        className={`px-3 py-1 rounded ${
          submitted === "not_useful"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } disabled:opacity-50`}
      >
        ✗ Not useful
      </button>
    </div>
  );
}

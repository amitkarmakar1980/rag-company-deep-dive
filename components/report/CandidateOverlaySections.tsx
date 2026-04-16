"use client";

import { CandidateOverlayData, CandidateFitLevel } from "@/lib/types";

// ─── Shared primitives ───────────────────────────────────────────────────────

function OverlayLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
      {children}
    </span>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-[#f0ece4] rounded w-3/4" />
      <div className="h-3 bg-[#f0ece4] rounded w-full" />
      <div className="h-3 bg-[#f0ece4] rounded w-5/6" />
      <div className="h-3 bg-[#f0ece4] rounded w-2/3" />
    </div>
  );
}

// ─── Fit badge ───────────────────────────────────────────────────────────────

const FIT_CONFIG: Record<CandidateFitLevel, { bg: string; border: string; text: string; badge: string }> = {
  strong: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800",
  },
  moderate: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    badge: "bg-sky-100 text-sky-800",
  },
  stretch: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800",
  },
  mismatch: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800",
  },
};

function FitBadge({ fit, score }: { fit: CandidateFitLevel; score: number }) {
  const cfg = FIT_CONFIG[fit] ?? FIT_CONFIG.moderate;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <span className={`text-sm font-semibold capitalize ${cfg.text}`}>{fit}</span>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
        {score}/10
      </span>
    </div>
  );
}

// ─── 1. Candidate Role Match ─────────────────────────────────────────────────

export function CandidateRoleMatchSection({
  data,
}: {
  data: CandidateOverlayData["candidate_role_match"];
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 flex-wrap">
        <FitBadge fit={data.overall_fit} score={data.match_score} />
        <p className="text-sm text-[#4a3f36] leading-relaxed flex-1 min-w-[200px]">
          {data.rationale}
        </p>
      </div>

      {data.key_alignments.length > 0 && (
        <div>
          <OverlayLabel color="text-emerald-700">Key Alignments</OverlayLabel>
          <ul className="mt-2 space-y-2">
            {data.key_alignments.map((a, i) => (
              <li key={i} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-0.5">
                <p className="text-sm font-medium text-[#1c1713]">{a.alignment}</p>
                <p className="text-xs text-[#7a6d63]">{a.resume_evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.key_gaps.length > 0 && (
        <div>
          <OverlayLabel color="text-red-600">Gaps vs Role Requirements</OverlayLabel>
          <ul className="mt-2 space-y-1.5">
            {data.key_gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#4a3f36]">
                <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── 2. Strengths to Emphasize ───────────────────────────────────────────────

export function StrengthsToEmphasizeSection({
  data,
}: {
  data: CandidateOverlayData["strengths_to_emphasize"];
}) {
  return (
    <ul className="space-y-3">
      {data.strengths.map((s, i) => (
        <li
          key={i}
          className="bg-white border border-[#e4ddd4] rounded-lg p-4 space-y-2"
        >
          <p className="text-sm font-semibold text-[#1c1713]">{s.strength}</p>
          <div className="flex items-start gap-1.5">
            <span className="text-xs font-medium text-[#9c8d81] shrink-0 mt-0.5">Evidence:</span>
            <p className="text-xs text-[#6b5e52] leading-relaxed">{s.evidence_from_resume}</p>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-xs font-medium text-emerald-700 shrink-0 mt-0.5">Why it matters:</span>
            <p className="text-xs text-[#6b5e52] leading-relaxed">{s.why_it_matters_for_role}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── 3. Interviewer Concerns ─────────────────────────────────────────────────

const CONCERN_CONFIG = {
  high: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-800" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800" },
  low: { bg: "bg-[#f5f1e8]", border: "border-[#e4ddd4]", badge: "bg-[#f0ece4] text-[#4a3f36]" },
};

export function InterviewerConcernsSection({
  data,
}: {
  data: CandidateOverlayData["interviewer_concerns"];
}) {
  const sorted = [...data.concerns].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <ul className="space-y-3" role="list">
      {sorted.map((c, i) => {
        const cfg = CONCERN_CONFIG[c.severity];
        return (
          <li
            key={i}
            className={`${cfg.bg} border ${cfg.border} rounded-lg p-4 space-y-2`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#1c1713]">{c.concern}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                {c.severity}
              </span>
            </div>
            <p className="text-xs text-[#6b5e52]">
              <span className="font-medium text-[#4a3f36]">Likely question: </span>
              &ldquo;{c.likely_question}&rdquo;
            </p>
          </li>
        );
      })}
    </ul>
  );
}

// ─── 4. Gap Management ───────────────────────────────────────────────────────

export function GapManagementSection({
  data,
}: {
  data: CandidateOverlayData["gap_management"];
}) {
  return (
    <ul className="space-y-4" role="list">
      {data.gaps.map((g, i) => (
        <li key={i} className="border border-[#e4ddd4] rounded-lg overflow-hidden">
          <div className="bg-[#f5f1e8] border-b border-[#e4ddd4] px-4 py-2.5">
            <p className="text-sm font-semibold text-[#1c1713]">{g.gap}</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div>
              <p className="text-xs font-medium text-amber-700 mb-0.5">Honest framing</p>
              <p className="text-sm text-[#4a3f36] leading-relaxed">{g.reframe}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700 mb-0.5">What to say honestly</p>
              <p className="text-sm text-[#4a3f36] italic leading-relaxed">&ldquo;{g.talking_point}&rdquo;</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── 5. Story Recommendations ────────────────────────────────────────────────

export function StoryRecommendationsSection({
  data,
}: {
  data: CandidateOverlayData["story_recommendations"];
}) {
  return (
    <ul className="space-y-4" role="list">
      {data.stories.map((s, i) => (
        <li key={i} className="border border-[#e4ddd4] rounded-lg overflow-hidden">
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-sky-800">{s.theme}</p>
            <span className="text-xs text-[#7a6d63] bg-white border border-[#e4ddd4] rounded px-2 py-0.5">
              {s.maps_to_requirement}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-[#4a3f36] leading-relaxed">{s.suggested_story}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── 6. Positioning Strategy ─────────────────────────────────────────────────

export function PositioningStrategySection({
  data,
}: {
  data: CandidateOverlayData["positioning_strategy"];
}) {
  return (
    <div className="space-y-5">
      <div className="bg-[#1a4a3a] rounded-xl px-5 py-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#d8f3e7]">
          Your Headline
        </p>
        <p className="text-base font-semibold leading-snug text-[#f6fbf8]">{data.headline}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9c8d81] mb-2">
          Narrative Arc
        </p>
        <p className="text-sm text-[#4a3f36] leading-relaxed">{data.narrative_arc}</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
          Tell Me About Yourself
        </p>
        <p className="text-sm text-gray-800 leading-relaxed italic">&ldquo;{data.tell_me_about_yourself}&rdquo;</p>
      </div>

      {data.what_to_avoid.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">
            What to Avoid
          </p>
          <ul className="space-y-1.5">
            {data.what_to_avoid.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#4a3f36]">
                <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton placeholder (while generating) ────────────────────────────────

export { SectionSkeleton };

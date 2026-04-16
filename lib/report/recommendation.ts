import { PursueRecommendation, RecommendationType } from "@/lib/types";

export type RecommendationLevel = 0 | 1 | 2 | 3 | 4;

export interface CanonicalRecommendation {
  level: RecommendationLevel;
  reportRecommendation: RecommendationType;
  interviewRecommendation: PursueRecommendation;
  pursuitStance: string;
  displayLabel: string;
}

function normalizeCandidateFitScore(raw: number | null | undefined): number | null {
  if (typeof raw !== "number" || Number.isNaN(raw) || raw <= 0) {
    return null;
  }

  return Math.max(0, Math.min(10, raw));
}

function parseReportRecommendation(raw: string | null | undefined): RecommendationLevel | null {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "pursue":
      return 4;
    case "pursue_cautiously":
      return 2;
    case "need_more_signal":
      return 1;
    case "avoid":
      return 0;
    default:
      return null;
  }
}

function parsePursuitStance(raw: string | null | undefined): RecommendationLevel | null {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "pursue aggressively":
      return 4;
    case "pursue selectively":
      return 3;
    case "proceed cautiously":
      return 2;
    case "avoid":
      return 0;
    default:
      return null;
  }
}

function parseInterviewRecommendation(raw: string | null | undefined): RecommendationLevel | null {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "aggressive pursue":
      return 4;
    case "selective pursue":
      return 3;
    case "cautious pursue":
      return 2;
    case "pass":
      return 0;
    default:
      return null;
  }
}

export function getCanonicalRecommendation(input: {
  reportRecommendation?: string | null;
  executiveRecommendation?: string | null;
  pursuitStance?: string | null;
  interviewRecommendation?: string | null;
  candidateFitScore?: number | null;
}): CanonicalRecommendation {
  const candidateFitScore = normalizeCandidateFitScore(input.candidateFitScore);
  const levels = [
    parseReportRecommendation(input.reportRecommendation),
    parseReportRecommendation(input.executiveRecommendation),
    parsePursuitStance(input.pursuitStance),
    parseInterviewRecommendation(input.interviewRecommendation),
  ].filter((value): value is RecommendationLevel => value !== null);

  const derivedLevel = levels.length > 0 ? Math.min(...levels) as RecommendationLevel : 1;
  const level = candidateFitScore !== null && candidateFitScore < 5 ? 0 : derivedLevel;

  switch (level) {
    case 4:
      return {
        level,
        reportRecommendation: "pursue",
        interviewRecommendation: "Aggressive Pursue",
        pursuitStance: "pursue aggressively",
        displayLabel: "Aggressive Pursue",
      };
    case 3:
      return {
        level,
        reportRecommendation: "pursue_cautiously",
        interviewRecommendation: "Selective Pursue",
        pursuitStance: "pursue selectively",
        displayLabel: "Selective Pursue",
      };
    case 2:
      return {
        level,
        reportRecommendation: "pursue_cautiously",
        interviewRecommendation: "Cautious Pursue",
        pursuitStance: "proceed cautiously",
        displayLabel: "Cautious Pursue",
      };
    case 0:
      return {
        level,
        reportRecommendation: "avoid",
        interviewRecommendation: "Pass",
        pursuitStance: "avoid",
        displayLabel: "Do Not Pursue",
      };
    case 1:
    default:
      return {
        level: 1,
        reportRecommendation: "need_more_signal",
        interviewRecommendation: "Pass",
        pursuitStance: "avoid",
        displayLabel: "Do Not Pursue",
      };
  }
}
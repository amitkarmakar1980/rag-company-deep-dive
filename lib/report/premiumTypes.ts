import { RecommendationType } from "@/lib/types";

export type PremiumSectionKey =
  | "decision_memo"
  | "five_minute_brief"
  | "company_context"
  | "why_role_exists_now"
  | "how_to_win_this_process"
  | "company_role_strategy"
  | "candidate_fit"
  | "interview_prep"
  | "credibility_layer"
  | "operations_and_cost";

export type PremiumSectionGroup =
  | "Decision"
  | "Strategy"
  | "Candidate Fit"
  | "Interview Prep"
  | "Credibility"
  | "Operations";

export type PremiumSurface = "both" | "full";
export type PremiumTone = "neutral" | "strong" | "caution" | "risk" | "unknown";
export type PremiumEvidenceStatus = "met" | "partial" | "insufficient";
export type PremiumEvidenceConfidence = "high" | "medium" | "low" | "suppressed";

export interface PremiumCallout {
  label: string;
  value: string;
  tone?: PremiumTone;
}

export interface PremiumFact {
  label: string;
  value: string;
}

export interface PremiumBlock {
  title: string;
  body?: string;
  bullets?: string[];
}

export interface PremiumEvidenceState {
  threshold: string;
  status: PremiumEvidenceStatus;
  confidence: PremiumEvidenceConfidence;
  note: string;
}

export interface PremiumSectionContent {
  schema: "premium_section_v1";
  group: PremiumSectionGroup;
  surface: PremiumSurface;
  question: string;
  summary: string;
  callouts?: PremiumCallout[];
  facts?: PremiumFact[];
  bullets?: string[];
  blocks?: PremiumBlock[];
  evidence?: PremiumEvidenceState;
}

export interface PremiumGeneratedSection {
  summary: string;
  callouts?: PremiumCallout[];
  facts?: PremiumFact[];
  bullets?: string[];
  blocks?: PremiumBlock[];
  evidence?: Partial<PremiumEvidenceState>;
}

export interface PremiumReportModelOutput {
  report_recommendation: RecommendationType;
  scorecard?: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  };
  sections: Record<Exclude<PremiumSectionKey, "operations_and_cost">, PremiumGeneratedSection>;
}

export const PREMIUM_SECTION_DEFINITIONS: Array<{
  key: PremiumSectionKey;
  title: string;
  group: PremiumSectionGroup;
  surface: PremiumSurface;
  question: string;
}> = [
  {
    key: "decision_memo",
    title: "Final Recommendation",
    group: "Decision",
    surface: "both",
    question: "Should I pursue this role?",
  },
  {
    key: "five_minute_brief",
    title: "5-Minute Brief",
    group: "Decision",
    surface: "both",
    question: "What are the fastest high-signal takeaways from this report?",
  },
  {
    key: "company_context",
    title: "Company Overview",
    group: "Strategy",
    surface: "full",
    question: "What company context should shape how I prepare for this process?",
  },
  {
    key: "why_role_exists_now",
    title: "About the Role",
    group: "Decision",
    surface: "both",
    question: "What does this role likely own, and why does it exist now?",
  },
  {
    key: "how_to_win_this_process",
    title: "How To Position Yourself",
    group: "Interview Prep",
    surface: "both",
    question: "How should I position myself to win this interview process?",
  },
  {
    key: "company_role_strategy",
    title: "Products, Strategy, And Market",
    group: "Strategy",
    surface: "full",
    question: "What business, product, org, and stakeholder realities matter most?",
  },
  {
    key: "candidate_fit",
    title: "Candidate-Skill Match",
    group: "Candidate Fit",
    surface: "full",
    question: "What strengths, gaps, and stories will determine my candidacy?",
  },
  {
    key: "interview_prep",
    title: "Likely Interview Questions",
    group: "Interview Prep",
    surface: "full",
    question: "What should I say, avoid, and ask in the interview room?",
  },
  {
    key: "credibility_layer",
    title: "Credibility Layer",
    group: "Credibility",
    surface: "full",
    question: "What is grounded, inferred, conflicting, or unknown?",
  },
  {
    key: "operations_and_cost",
    title: "Operations And Cost Layer",
    group: "Operations",
    surface: "full",
    question: "What did the system do, and what did it cost to generate this report?",
  },
];

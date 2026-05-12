// Re-exports from schema.ts plus runtime-only types that aren't part of the JSON model.

export type {
  EvidenceState,
  Citation,
  Score,
  SwotItem,
  CompanyDeepDiveV3,
  CompanyDeepDiveEvaluation,
} from "./schema";

// ── Source-registry types ────────────────────────────────────────────────────

export type SourceTier = "primary" | "secondary" | "sentiment" | "supplemental";

export interface SourcePattern {
  pattern: RegExp;
  tier: SourceTier;
  label: string;
  trustWeight: number; // 0–1
}

export interface SectionSourcePolicy {
  /** Section key from CompanyDeepDiveV3 */
  sectionKey: string;
  /** Ordered list of preferred source tiers */
  preferredTiers: SourceTier[];
  /** Min chunks before marking insufficient evidence */
  minChunks: number;
  /** Per-query limit passed to semanticSearch */
  perQueryLimit: number;
  /** Similarity threshold */
  similarityThreshold: number;
}

// ── Retrieval runtime types ──────────────────────────────────────────────────

export interface SectionRetrievalBundle {
  sectionKey: string;
  queries: string[];
  perQueryLimit: number;
  similarityThreshold: number;
}

// ── Planner types ────────────────────────────────────────────────────────────

export interface ResearchPlanV3 {
  companyName: string;
  roleTitle?: string;
  prioritizedSections: string[];
  sectionBundles: SectionRetrievalBundle[];
  sourceStrategyNote: string;
}

// ── Quality-gate runtime types ───────────────────────────────────────────────

export interface EvaluationResult {
  verdict: "pass" | "partial" | "fail" | "retry_required";
  scores: Record<string, number>;
  sectionVerdicts: Array<{
    sectionKey: string;
    verdict: "strong" | "acceptable" | "weak" | "missing" | "hallucination_risk";
    reason: string;
    repairInstruction?: string;
  }>;
  hallucinationFlags: Array<{ claim: string; reason: string; severity: "high" | "medium" | "low" }>;
  genericLanguageFlags: string[];
  requiredRetries: Array<{
    sectionKey: string;
    retryType: "reretrieve" | "resynthesize" | "add_sources" | "suppress" | "manual_review";
    reason: string;
  }>;
}

// ── Retry policy types ───────────────────────────────────────────────────────

export type RetryAction =
  | { action: "pass" }
  | { action: "reretrieve"; sections: string[] }
  | { action: "resynthesize"; sections: string[] }
  | { action: "add_sources"; sections: string[]; sourceHint: string }
  | { action: "suppress"; sections: string[] };

// ── Module output ─────────────────────────────────────────────────────────────

export interface CompanyDeepDiveModuleResult {
  moduleJson: import("./schema").CompanyDeepDiveV3;
  markdownContent: string;
  evaluation: import("./schema").CompanyDeepDiveEvaluation;
  retryActions: RetryAction[];
  usages: import("@/lib/types").LLMCallUsage[];
  chunkCount: number;
}

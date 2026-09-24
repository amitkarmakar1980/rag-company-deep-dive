import type { Claim, Report, Section } from "@/lib/v2/contract/schema";

/**
 * Eval scorers.
 *
 * Every scorer here is a pure function with no model call. Two consequences
 * worth stating, because both are load-bearing:
 *
 * 1. They are free and instant, so they run on every claim of every run — not
 *    just during evals. The same scorer that grades the golden set also acts as
 *    a runtime guard inside the pipeline. One implementation, no drift between
 *    "what we measure" and "what we enforce".
 *
 * 2. They are deterministic, so a score that moves means the generation changed.
 *    An LLM judge cannot promise that.
 *
 * What they deliberately do NOT cover: whether a claim is *worth making*, read
 * in context, and useful to a candidate. That is judgment, and it belongs to the
 * human rubrics. These scorers catch mechanical failure so human attention goes
 * where it is irreplaceable.
 */

export type Severity =
  // Fails the run. Fabrication, or a rule the style contract calls checkable.
  | "fatal"
  // Counts against the score but does not fail the run.
  | "warn";

export interface Violation {
  severity: Severity;
  /** Which claim, where identifiable. Absent for document-level violations. */
  claimId?: string;
  /** Machine-readable violation kind, for aggregating across runs. */
  code: string;
  message: string;
}

export interface ScorerResult {
  scorer: string;
  /** False if any `fatal` violation is present. */
  pass: boolean;
  /** 0–1. Definition is scorer-specific and documented at each scorer. */
  score: number;
  violations: Violation[];
  /** Free-form counters surfaced in eval reports (e.g. claimsChecked). */
  stats?: Record<string, number>;
}

/** The evidence a grounding check needs: chunk text by chunk id. */
export type ChunkLookup = (chunkId: string) => string | undefined;

export interface SectionScorerInput {
  section: Section;
  /** Required by grounding; omit only for scorers that do not read evidence. */
  chunkText?: ChunkLookup;
}

export interface ReportScorerInput {
  report: Report;
  /** The rendered prose, when scoring the prose pass. */
  prose?: string;
  chunkText?: ChunkLookup;
}

export type SectionScorer = (input: SectionScorerInput) => ScorerResult;
export type ReportScorer = (input: ReportScorerInput) => ScorerResult;

/** Convenience for scorers that score a proportion of claims. */
export function ratio(passed: number, total: number): number {
  return total === 0 ? 1 : passed / total;
}

export function build(
  scorer: string,
  violations: Violation[],
  score: number,
  stats?: Record<string, number>,
): ScorerResult {
  return {
    scorer,
    pass: !violations.some((v) => v.severity === "fatal"),
    score,
    violations,
    stats,
  };
}

export function claimsOf(section: Section): Claim[] {
  return section.claims;
}

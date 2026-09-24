import type { Report, Section } from "@/lib/v2/contract/schema";
import { coverageScorer } from "./coverage";
import { fabricationScorer } from "./fabrication";
import { groundingScorer } from "./grounding";
import { labelScorer } from "./labels";
import { proseRatioScorer, redundancyScorer } from "./redundancy";
import { styleScorer } from "./style";
import type { ChunkLookup, ScorerResult } from "./types";

export * from "./types";
export { coverageScorer, COVERAGE_REQUIREMENTS } from "./coverage";
export { fabricationScorer } from "./fabrication";
export { groundingScorer } from "./grounding";
export { labelScorer } from "./labels";
export { proseRatioScorer, redundancyScorer } from "./redundancy";
export { styleScorer } from "./style";

/**
 * Absolute pass thresholds.
 *
 * V1 is being replaced, not competed with, so there is no baseline to beat and
 * these are set from the rubrics directly. A low bar inherited from an
 * inadequate system is worse than no bar — it lets work clear it and feel
 * validated.
 *
 * Grounding and fabrication are 1.0 with no tolerance: a single unverifiable
 * quote or invented number is a trust failure, and 95% trustworthy is not a
 * meaningful state for a research report.
 */
export const THRESHOLDS: Record<string, number> = {
  grounding: 1.0,
  fabrication: 1.0,
  labels: 0.9,
  coverage: 1.0,
  redundancy: 1.0,
  style: 0.95,
  prose_ratio: 0.75,
};

export interface SectionScoreReport {
  sectionId: string;
  results: ScorerResult[];
  pass: boolean;
  /** Scorers that ran but scored below threshold without a fatal violation. */
  belowThreshold: string[];
}

/** Every section-level scorer. Runs inside the pipeline as a pre-handoff gate,
 *  and in evals as the component layer. */
export function scoreSection(
  section: Section,
  chunkText: ChunkLookup,
): SectionScoreReport {
  const results = [
    groundingScorer({ section, chunkText }),
    labelScorer({ section }),
    coverageScorer({ section }),
  ];

  const belowThreshold = results
    .filter((r) => r.score < (THRESHOLDS[r.scorer] ?? 0))
    .map((r) => r.scorer);

  return {
    sectionId: section.id,
    results,
    pass: results.every((r) => r.pass) && belowThreshold.length === 0,
    belowThreshold,
  };
}

export interface ReportScoreReport {
  sections: SectionScoreReport[];
  documentResults: ScorerResult[];
  pass: boolean;
  belowThreshold: string[];
  summary: Record<string, number>;
}

/** Every layer: unit (claims), component (sections), integration (document). */
export function scoreReport(args: {
  report: Report;
  chunkText: ChunkLookup;
  prose?: string;
  perSectionWords?: Record<string, number>;
}): ReportScoreReport {
  const { report, chunkText, prose, perSectionWords } = args;

  const sections = report.sections.map((s) => scoreSection(s, chunkText));

  const expectedInferences = countByLabel(report, "inference");
  const expectedOpenQuestions = countByLabel(report, "open_question");

  const documentResults: ScorerResult[] = [redundancyScorer({ report })];

  // Prose scorers only run once prose exists. They are omitted rather than
  // passed empty input — a check that did not run must never look like one that
  // ran and passed.
  if (prose) {
    documentResults.push(
      styleScorer({ expectedInferences, expectedOpenQuestions })({
        report,
        prose,
      }),
      fabricationScorer({ report, prose }),
    );
  }
  if (perSectionWords) {
    documentResults.push(proseRatioScorer(perSectionWords)({ report }));
  }

  const belowThreshold = documentResults
    .filter((r) => r.score < (THRESHOLDS[r.scorer] ?? 0))
    .map((r) => r.scorer);

  const summary: Record<string, number> = {};
  for (const r of documentResults) summary[r.scorer] = round(r.score);
  for (const scorer of ["grounding", "labels", "coverage"]) {
    const scores = sections
      .flatMap((s) => s.results)
      .filter((r) => r.scorer === scorer)
      .map((r) => r.score);
    if (scores.length > 0) {
      summary[scorer] = round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }

  return {
    sections,
    documentResults,
    pass:
      sections.every((s) => s.pass) &&
      documentResults.every((r) => r.pass) &&
      belowThreshold.length === 0,
    belowThreshold,
    summary,
  };
}

function countByLabel(report: Report, label: string): number {
  return report.sections
    .flatMap((s) => s.claims)
    .filter((c) => c.label === label).length;
}

function round(n: number): number {
  return Number(n.toFixed(3));
}

/** Flattened violation list, most severe first — the shape a CI log wants. */
export function allViolations(r: ReportScoreReport) {
  const all = [
    ...r.sections.flatMap((s) =>
      s.results.flatMap((res) =>
        res.violations.map((v) => ({ ...v, scorer: res.scorer, section: s.sectionId })),
      ),
    ),
    ...r.documentResults.flatMap((res) =>
      res.violations.map((v) => ({ ...v, scorer: res.scorer, section: "—" })),
    ),
  ];
  return all.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "fatal" ? -1 : 1));
}

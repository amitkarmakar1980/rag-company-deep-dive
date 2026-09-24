import { Claim } from "@/lib/v2/contract/schema";
import { build, ratio, type SectionScorer, type Violation } from "./types";

/**
 * Label discipline — are the schema invariants actually held, and are there
 * mechanical signs of a mislabelled claim?
 *
 * The hard invariants (fact needs evidence, inference needs reasoning,
 * open_question cites nothing) are enforced by zod at parse time. They are
 * re-checked here because a scorer that assumes valid input reports a clean
 * pass on invalid input, which is the worst possible failure for an eval.
 *
 * The heuristics below catch the failure mode zod cannot: a claim that parses
 * but is labelled `fact` while doing the work of an inference. These are
 * necessarily imperfect — they are `warn`, and the human rubric is the
 * authority on label correctness.
 *
 * Score: proportion of claims with no violation of any severity.
 */

/**
 * Hedge and causal language inside a `fact`. A sourced fact states what a source
 * says; the moment it explains, predicts, or attributes motive, it is reasoning.
 */
/**
 * Word-bounded rather than substring, because substring matching produces false
 * positives that quietly erode trust in the scorer. The self-test caught
 * "down two points to 61%" — a plain fact — being flagged for the marker
 * "points to". Hence the guard on numeric and unit contexts below.
 */
const INFERENCE_MARKERS: RegExp[] = [
  /\bsuggests?\b/i,
  /\bindicates?\b/i,
  /\bimplies\b/i,
  /\blikely\b/i,
  /\bprobably\b/i,
  /\bappears to\b/i,
  /\bseems to\b/i,
  // "points to" only as a verb — not "fell two points to 61%".
  /(?<!\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|percentage|basis)\s)\bpoints to\b/i,
  /\bsignals that\b/i,
  /\bwhich means\b/i,
  /\bbecause of this\b/i,
  /\bas a result of\b/i,
  /\bdriven by\b/i,
  /\breflects a\b/i,
  /\bpositions the company\b/i,
  /\bwill need to\b/i,
  /\bis expected to\b/i,
  /\bcould lead to\b/i,
];

/** A `fact` whose statement is a forward-looking prediction is not a fact. */
const PREDICTION_MARKERS: RegExp[] = [
  /\bwill grow\b/i,
  /\bwill decline\b/i,
  /\bwill likely\b/i,
  /\bis going to\b/i,
  /\bover the next\b/i,
  /\bby 20[2-9]\d\b/i,
  /\bin the coming\b/i,
];

function hasAny(haystack: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = haystack.match(p);
    if (m) return m[0];
  }
  return undefined;
}

export const labelScorer: SectionScorer = ({ section }) => {
  const violations: Violation[] = [];
  const flagged = new Set<string>();

  const flag = (v: Violation) => {
    violations.push(v);
    if (v.claimId) flagged.add(v.claimId);
  };

  for (const claim of section.claims) {
    // Re-assert the hard invariants rather than trusting the caller parsed.
    const parsed = Claim.safeParse(claim);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        flag({
          severity: "fatal",
          claimId: claim.id,
          code: "labels.schema_invariant",
          message: `${issue.path.join(".") || "claim"}: ${issue.message}`,
        });
      }
      continue;
    }

    if (claim.label === "fact") {
      const marker = hasAny(claim.statement, INFERENCE_MARKERS);
      if (marker) {
        flag({
          severity: "warn",
          claimId: claim.id,
          code: "labels.fact_reads_as_inference",
          message:
            `Labelled 'fact' but contains inferential language ("${marker}"). ` +
            `A fact states what a source says; explaining or attributing is inference.`,
        });
      }

      const prediction = hasAny(claim.statement, PREDICTION_MARKERS);
      if (prediction) {
        flag({
          severity: "warn",
          claimId: claim.id,
          code: "labels.fact_is_prediction",
          message: `Labelled 'fact' but forward-looking ("${prediction}"). Predictions are inferences.`,
        });
      }

      // A fact quoting a source that is itself speculating is still inference.
      if (claim.evidence.some((e) => hasAny(e.quote, INFERENCE_MARKERS))) {
        flag({
          severity: "warn",
          claimId: claim.id,
          code: "labels.fact_from_speculative_quote",
          message:
            "Labelled 'fact' but the supporting quote is itself hedged. " +
            "A hedged source supports an inference, not a fact.",
        });
      }
    }

    if (claim.label === "inference" && claim.reasoning) {
      // Reasoning that merely restates the statement is not reasoning.
      const a = claim.reasoning.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const b = claim.statement.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      if (a.includes(b) || b.includes(a)) {
        flag({
          severity: "warn",
          claimId: claim.id,
          code: "labels.circular_reasoning",
          message:
            "Reasoning restates the statement instead of showing the step from " +
            "evidence to conclusion.",
        });
      }
    }

    if (claim.label === "open_question" && !claim.resolvesWith) {
      flag({
        severity: "warn",
        claimId: claim.id,
        code: "labels.unresolvable_open_question",
        message:
          "Open question does not say what would resolve it, which makes it a " +
          "shrug rather than a finding.",
      });
    }

    // Confidence must be consistent with coverage: a 'high' confidence claim in
    // a section the researcher marked thin is exactly the V1 failure mode.
    if (claim.confidence === "high" && section.coverage.sufficiency === "thin") {
      flag({
        severity: "warn",
        claimId: claim.id,
        code: "labels.overconfident_on_thin_coverage",
        message:
          "High confidence in a section whose coverage is 'thin'. Confidence must " +
          "track the evidence actually found.",
      });
    }
  }

  const clean = section.claims.length - flagged.size;
  return build("labels", violations, ratio(clean, section.claims.length), {
    claims: section.claims.length,
    claimsFlagged: flagged.size,
  });
};

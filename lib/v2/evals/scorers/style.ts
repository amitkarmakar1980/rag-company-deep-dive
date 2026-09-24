import { build, type ReportScorer, type Violation } from "./types";

/**
 * Style contract — the mechanically checkable rules from
 * `lib/v2/contract/style-contract.md`.
 *
 * Scores the rendered prose, so it runs after the prose pass. Its companion is
 * `fabrication.ts`, which checks that the prose invents nothing; this scorer
 * checks how the prose sounds.
 *
 * Score: 1 minus the violation rate per 1,000 words, floored at 0. Chosen so a
 * long report is not penalised for length — two banned phrases in 8,000 words is
 * a different situation from two in 400.
 */

/** §5 — banned language. The rule behind the list: no adjective a number could
 *  replace. */
const BANNED_PHRASES = [
  "leading provider",
  "world-class",
  "best-in-class",
  "cutting-edge",
  "state-of-the-art",
  "robust",
  "seamless",
  "innovative",
  "synergy",
  "game-changer",
  "rapidly growing",
  "strong growth",
  "significant growth",
  "well-positioned",
  "industry-leading",
  "passionate",
  "in today's fast-paced",
  "it's important to note",
  "it is important to note",
  "it's worth noting",
  "it is worth noting",
  "delve",
];

/** Banned only as a verb — "leverage" as a noun is legitimate in this domain
 *  ("operating leverage"), so a bare substring test would produce false
 *  positives on correct usage. */
const LEVERAGE_AS_VERB =
  /\b(to leverage|leverages|leveraging|leveraged|can leverage|will leverage)\b/gi;

/** §2 — impersonal address. */
const SECOND_PERSON = /\b(you|your|yours|you're|you'll|you've)\b/gi;

/** §3 — explicit epistemic markers. */
const INFERENCE_MARKER = /\*\*(Inference|The call)\s*[—-]\*\*|\*\*(Inference|The call)\s*[—-]/g;
const OPEN_QUESTION_MARKER = /\*\*Open question\s*[—-]\*\*|\*\*Open question\s*[—-]/g;

/** §4 — quantitative claims carry a period or as-of date. */
const HAS_NUMBER = /\b\d[\d,.]*\s*(%|m|bn|b|k|million|billion|thousand)?\b/i;
const HAS_DATE_CONTEXT =
  /\b(FY\s?\d{2,4}|Q[1-4]\s?(FY)?\s?\d{2,4}|as of\b|in \d{4}|since \d{4}|\b(19|20)\d{2}\b|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})/i;

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

export interface StyleScorerOptions {
  /** Expected inference-marker count, from the claim set. When supplied, the
   *  scorer verifies every marked claim actually got its marker in the prose. */
  expectedInferences?: number;
  expectedOpenQuestions?: number;
}

export function styleScorer(opts: StyleScorerOptions = {}): ReportScorer {
  return ({ prose }) => {
    const violations: Violation[] = [];

    if (!prose) {
      return build(
        "style",
        [
          {
            severity: "fatal",
            code: "style.no_prose",
            message:
              "No prose supplied. Refusing to report a pass on an unrunnable check.",
          },
        ],
        0,
      );
    }

    const words = prose.trim().split(/\s+/).length;

    // §5 — banned phrases.
    for (const phrase of BANNED_PHRASES) {
      const n = countMatches(prose, new RegExp(escape(phrase), "gi"));
      if (n > 0) {
        violations.push({
          severity: "fatal",
          code: "style.banned_phrase",
          message: `Banned phrase "${phrase}" appears ${n}×. Replace the adjective with the number it is standing in for.`,
        });
      }
    }

    const lev = countMatches(prose, LEVERAGE_AS_VERB);
    if (lev > 0) {
      violations.push({
        severity: "fatal",
        code: "style.banned_phrase",
        message: `"leverage" used as a verb ${lev}×. Say what is actually being done.`,
      });
    }

    // §2 — impersonal address.
    const secondPerson = countMatches(prose, SECOND_PERSON);
    if (secondPerson > 0) {
      violations.push({
        severity: "fatal",
        code: "style.second_person",
        message: `Second person appears ${secondPerson}×. The report addresses "the candidate" / "this role", never "you".`,
      });
    }

    // §3 — every inference and open question renders with its marker.
    if (opts.expectedInferences !== undefined) {
      const found = countMatches(prose, INFERENCE_MARKER);
      if (found < opts.expectedInferences) {
        violations.push({
          severity: "fatal",
          code: "style.unmarked_inference",
          message:
            `${opts.expectedInferences} inference claims but only ${found} markers ` +
            `in the prose. Unmarked inference is an automatic failure — the reader ` +
            `cannot tell it from a sourced fact.`,
        });
      }
    }

    if (opts.expectedOpenQuestions !== undefined) {
      const found = countMatches(prose, OPEN_QUESTION_MARKER);
      if (found < opts.expectedOpenQuestions) {
        violations.push({
          severity: "fatal",
          code: "style.unmarked_open_question",
          message: `${opts.expectedOpenQuestions} open questions but only ${found} markers in the prose.`,
        });
      }
    }

    // §4 — quantitative sentences carry a period or as-of date. Sentence-level
    // rather than document-level, since a date at the top does not date a number
    // nine paragraphs later.
    const sentences = prose
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    let undated = 0;
    for (const s of sentences) {
      // Markdown structure and marker lines are not prose sentences.
      if (/^\s*[|#>-]/.test(s)) continue;
      if (HAS_NUMBER.test(s) && !HAS_DATE_CONTEXT.test(s)) undated++;
    }
    if (undated > 0) {
      violations.push({
        severity: "warn",
        code: "style.undated_quantity",
        message: `${undated} sentence(s) state a quantity with no period or as-of date.`,
      });
    }

    const per1k = (violations.length / Math.max(words, 1)) * 1000;
    const score = Math.max(0, 1 - per1k);

    return build("style", violations, score, {
      words,
      violations: violations.length,
      violationsPer1kWords: Number(per1k.toFixed(2)),
    });
  };
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

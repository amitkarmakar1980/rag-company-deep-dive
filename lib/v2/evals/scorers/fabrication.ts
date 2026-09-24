import type { Report } from "@/lib/v2/contract/schema";
import { build, ratio, type ReportScorer, type Violation } from "./types";

/**
 * Fabrication — does the prose contain any number, date, or proper noun that is
 * not in the claim set it renders?
 *
 * This is what makes the constrained prose pass safe. Claims are verified before
 * prose is written, so the prose pass has exactly one way to introduce error:
 * adding something. Every quantity and name in the output must trace back to a
 * claim, its reasoning, or a cited quote.
 *
 * Score: proportion of extracted tokens that trace to the claim set.
 * Any untraceable quantity is fatal.
 */

/** Numbers with their units, since "22%" and "22" are different facts. */
const QUANTITY =
  /\$?\d[\d,]*(?:\.\d+)?\s*(?:%|bn|b|m|k|million|billion|thousand|percent)?/gi;

/**
 * Capitalised multi-word sequences: company, product, and person names.
 *
 * Applied per sentence, never across the whole document. The self-test caught
 * the naive version matching "FY23. As" and "Platform. A" — a capitalised run
 * spanning a sentence boundary is two fragments, not a name, and reporting
 * those as fabrication would train the reader to ignore the scorer.
 */
const PROPER_NOUN = /\b[A-Z][a-zA-Z0-9&'’-]*(?:\s+[A-Z][a-zA-Z0-9&'’-]*)*\b/g;

/** Sentence and line boundaries. Markdown structure counts as a boundary. */
function segments(text: string): string[] {
  return text
    .split(/[.!?;:]\s+|\n+|\s*\|\s*/)
    .map((s) => s.replace(/^[#>*\-\s]+/, "").trim())
    .filter((s) => s.length > 0);
}

/** Proper nouns in one segment, with the sentence-initial word dropped when it
 *  is capitalised only by position. */
function properNouns(segment: string): string[] {
  const out: string[] = [];
  for (const m of segment.match(PROPER_NOUN) ?? []) {
    const words = m.trim().split(/\s+/);
    // A single leading word that is ordinary vocabulary is sentence case, not a
    // name. A multi-word run starting with one ("The Platform organization") has
    // its leading word trimmed rather than the whole run discarded.
    while (words.length > 0 && NOT_NAMES.has(words[0].toLowerCase())) {
      words.shift();
    }
    while (words.length > 0 && NOT_NAMES.has(words[words.length - 1].toLowerCase())) {
      words.pop();
    }
    if (words.length > 0) out.push(words.join(" "));
  }
  return out;
}

/**
 * Words that are capitalised for position or convention rather than because they
 * name something. Without this list, every sentence-initial word is a false
 * positive and the scorer is useless.
 */
const NOT_NAMES = new Set(
  [
    // Sentence-initial and structural
    "the", "a", "an", "this", "that", "these", "those", "it", "its", "they",
    "their", "there", "then", "than", "and", "but", "or", "if", "when", "while",
    "however", "although", "because", "since", "despite", "given", "both",
    "each", "every", "no", "not", "none", "nothing", "neither", "either",
    "what", "which", "who", "whose", "where", "why", "how", "as", "at", "by",
    "for", "from", "in", "into", "of", "on", "to", "with", "without", "within",
    "across", "against", "between", "during", "over", "under", "after",
    "before", "above", "below", "per",
    // Report vocabulary
    "inference", "open", "question", "the call", "basis", "resolves", "fact",
    "company", "revenue", "growth", "margin", "headcount", "customers",
    "product", "products", "market", "markets", "segment", "segments",
    "strengths", "weaknesses", "opportunities", "threats", "swot", "summary",
    "candidate", "role", "leadership", "strategy", "risk", "risks",
    // Time words that are not dates
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ].map((w) => w.toLowerCase()),
);

/** Everything the prose is permitted to draw on. */
function permittedText(report: Report): string {
  const parts: string[] = [report.companyName];
  if (report.roleTitle) parts.push(report.roleTitle);

  for (const section of report.sections) {
    parts.push(section.title, section.summary);
    for (const claim of section.claims) {
      parts.push(claim.statement);
      if (claim.reasoning) parts.push(claim.reasoning);
      if (claim.resolvesWith) parts.push(claim.resolvesWith);
      if (claim.soWhat) parts.push(claim.soWhat);
      if (claim.repetitionRationale) parts.push(claim.repetitionRationale);
      for (const ref of claim.evidence) parts.push(ref.quote);
    }
  }

  return parts.join("\n").toLowerCase();
}

/** Normalise a quantity so "$340 million" and "$340M" compare equal. */
function normaliseQuantity(q: string): string {
  return q
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/billion|bn\b/g, "b")
    .replace(/million\b/g, "m")
    .replace(/thousand\b/g, "k")
    .replace(/percent/g, "%");
}

export const fabricationScorer: ReportScorer = ({ report, prose }) => {
  const violations: Violation[] = [];

  if (!prose) {
    return build(
      "fabrication",
      [
        {
          severity: "fatal",
          code: "fabrication.no_prose",
          message:
            "No prose supplied. Refusing to report a pass on an unrunnable check.",
        },
      ],
      0,
    );
  }

  const permitted = permittedText(report);
  const permittedQuantities = new Set(
    (permitted.match(QUANTITY) ?? []).map(normaliseQuantity),
  );

  let checked = 0;
  let traced = 0;

  for (const raw of prose.match(QUANTITY) ?? []) {
    const q = normaliseQuantity(raw);
    // Bare small integers are ordinary prose ("three segments"), not claims.
    if (/^\d{1,2}$/.test(q)) continue;
    checked++;
    if (permittedQuantities.has(q)) {
      traced++;
    } else {
      violations.push({
        severity: "fatal",
        code: "fabrication.untraceable_quantity",
        message:
          `Prose states "${raw.trim()}", which appears nowhere in the claim set. ` +
          `The prose pass may only restate claims, never add to them.`,
      });
    }
  }

  const seen = new Set<string>();
  for (const segment of segments(prose)) {
    for (const name of properNouns(segment)) {
      if (name.length < 3) continue;
      const key = name.toLowerCase();
      // Report each distinct name once; ten mentions of one invented person is
      // one defect, and repeating it would swamp the violation list.
      if (seen.has(key)) continue;
      seen.add(key);

      checked++;
      if (permitted.includes(key)) {
        traced++;
      } else {
        violations.push({
          severity: "fatal",
          code: "fabrication.untraceable_name",
          message: `Prose names "${name}", which appears nowhere in the claim set.`,
        });
      }
    }
  }

  return build("fabrication", violations, ratio(traced, checked), {
    tokensChecked: checked,
    tokensTraced: traced,
  });
};

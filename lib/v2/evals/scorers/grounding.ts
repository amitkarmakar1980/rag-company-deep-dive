import { build, ratio, type SectionScorer, type Violation } from "./types";

/**
 * Grounding — does every cited quote actually occur in the chunk it cites?
 *
 * The cheapest and highest-value check in the system: a substring test, no model
 * call, catching the failure mode that made V1 untrustworthy. An invented number
 * has no quote to find.
 *
 * Score: proportion of evidence refs whose quote verifies.
 * Any failure is fatal — a fabricated citation is not a partial credit situation.
 */

/**
 * Quotes are normalised before comparison because models reliably reformat
 * whitespace and punctuation while copying faithfully. Normalising these is not
 * a loophole: none of them can turn a false claim into a true one.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'") // curly → straight apostrophe
    .replace(/[“”]/g, '"') // curly → straight quote
    .replace(/[‐-―−]/g, "-") // dashes → hyphen
    .replace(/ /g, " ") // nbsp → space
    .replace(/\s+/g, " ")
    .trim();
}

export const groundingScorer: SectionScorer = ({ section, chunkText }) => {
  const violations: Violation[] = [];
  let checked = 0;
  let verified = 0;

  if (!chunkText) {
    return build(
      "grounding",
      [
        {
          severity: "fatal",
          code: "grounding.no_chunk_lookup",
          message:
            "Grounding cannot be scored without a chunk lookup. Refusing to " +
            "report a pass — an unrunnable check must never look like a clean one.",
        },
      ],
      0,
    );
  }

  for (const claim of section.claims) {
    for (const ref of claim.evidence) {
      checked++;
      const text = chunkText(ref.chunkId);

      if (text === undefined) {
        violations.push({
          severity: "fatal",
          claimId: claim.id,
          code: "grounding.missing_chunk",
          message: `Cites chunk '${ref.chunkId}', which does not exist in the evidence store.`,
        });
        continue;
      }

      if (!normalise(text).includes(normalise(ref.quote))) {
        violations.push({
          severity: "fatal",
          claimId: claim.id,
          code: "grounding.quote_not_found",
          message:
            `Quote does not occur in chunk '${ref.chunkId}'. ` +
            `Quote: "${ref.quote.slice(0, 120)}"`,
        });
        continue;
      }

      verified++;
    }
  }

  return build("grounding", violations, ratio(verified, checked), {
    refsChecked: checked,
    refsVerified: verified,
    claims: section.claims.length,
  });
};

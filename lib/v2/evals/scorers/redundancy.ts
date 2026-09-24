import { build, ratio, type ReportScorer, type Violation } from "./types";

/**
 * Redundancy — is each fact stated once, in its canonical section?
 *
 * Document-level by necessity: the same fact legitimately surfaces in several
 * sections, so no section-level check can see the problem. This is the
 * integration-layer scorer.
 *
 * Score: proportion of fact clusters that are correctly resolved.
 */
export const redundancyScorer: ReportScorer = ({ report }) => {
  const violations: Violation[] = [];
  const clusters = new Map<
    string,
    Array<{ claimId: string; role: string; section: string; hasRationale: boolean }>
  >();

  for (const section of report.sections) {
    for (const claim of section.claims) {
      if (!claim.factKey) continue;
      const entry = {
        claimId: claim.id,
        role: claim.role,
        section: section.id,
        hasRationale: Boolean(claim.repetitionRationale),
      };
      const existing = clusters.get(claim.factKey);
      if (existing) existing.push(entry);
      else clusters.set(claim.factKey, [entry]);
    }
  }

  let resolved = 0;

  for (const [factKey, members] of clusters) {
    const canonical = members.filter((m) => m.role === "canonical");

    if (canonical.length === 0) {
      violations.push({
        severity: "fatal",
        code: "redundancy.no_canonical_owner",
        message:
          `Fact cluster '${factKey}' has no canonical owner — every member is a ` +
          `reference or reinforcement of a statement that is never made.`,
      });
      continue;
    }

    if (canonical.length > 1) {
      violations.push({
        severity: "fatal",
        code: "redundancy.multiple_canonical_owners",
        message:
          `Fact cluster '${factKey}' is stated in full ${canonical.length}× ` +
          `(sections: ${canonical.map((c) => c.section).join(", ")}). ` +
          `Reconciliation should have demoted all but one.`,
      });
      continue;
    }

    const badReinforce = members.filter(
      (m) => m.role === "reinforce" && !m.hasRationale,
    );
    if (badReinforce.length > 0) {
      for (const m of badReinforce) {
        violations.push({
          severity: "fatal",
          claimId: m.claimId,
          code: "redundancy.unjustified_reinforcement",
          message:
            `Restates fact cluster '${factKey}' without a repetitionRationale. ` +
            `Repetition is permitted only where it adds an angle.`,
        });
      }
      continue;
    }

    resolved++;
  }

  // A fact repeated across many sections is legal if properly resolved, but a
  // cluster spanning most of the report is a signal that it should have been
  // framed once as a theme rather than threaded through everything.
  for (const [factKey, members] of clusters) {
    if (members.length >= 4) {
      violations.push({
        severity: "warn",
        code: "redundancy.cluster_too_wide",
        message:
          `Fact cluster '${factKey}' appears in ${members.length} sections. ` +
          `Even correctly resolved, this reads as threading one fact through the ` +
          `whole report.`,
      });
    }
  }

  return build("redundancy", violations, ratio(resolved, clusters.size), {
    clusters: clusters.size,
    clustersResolved: resolved,
  });
};

/**
 * Prose-to-claim ratio — the detector for two separate problems:
 * padding (BACKLOG B8) and a single long prose pass thinning out toward the end
 * (BACKLOG B5). Both show up as a ratio outside the band; the second shows up as
 * a *declining* ratio across sections in document order.
 *
 * Bands are provisional and will be set from the first scored golden-set runs.
 * They are deliberately wide until then — a tight band guessed in advance would
 * produce noise, not signal.
 */
export function proseRatioScorer(
  perSectionWords: Record<string, number>,
  opts: { min?: number; max?: number } = {},
): ReportScorer {
  const min = opts.min ?? 15;
  const max = opts.max ?? 120;

  return ({ report }) => {
    const violations: Violation[] = [];
    const ratios: number[] = [];
    let inBand = 0;

    for (const section of report.sections) {
      const words = perSectionWords[section.id];
      if (words === undefined) continue;
      const claims = section.claims.length;
      if (claims === 0) continue;

      const r = words / claims;
      ratios.push(r);

      if (r > max) {
        violations.push({
          severity: "warn",
          code: "prose_ratio.padded",
          message: `Section '${section.id}' uses ${r.toFixed(0)} words per claim (max ${max}). Length should come from more evidence, not more words per claim.`,
        });
      } else if (r < min) {
        violations.push({
          severity: "warn",
          code: "prose_ratio.underdeveloped",
          message: `Section '${section.id}' uses ${r.toFixed(0)} words per claim (min ${min}). Claims are being listed, not developed.`,
        });
      } else {
        inBand++;
      }
    }

    // Declining ratio in document order is the B5 signature: the prose pass
    // wrote early sections fully and ran out of steam.
    if (ratios.length >= 4) {
      const half = Math.floor(ratios.length / 2);
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const first = avg(ratios.slice(0, half));
      const last = avg(ratios.slice(-half));
      if (last < first * 0.6) {
        violations.push({
          severity: "warn",
          code: "prose_ratio.tapering",
          message:
            `Prose thins out across the document (${first.toFixed(0)} → ` +
            `${last.toFixed(0)} words per claim). See BACKLOG B5: the fix is a ` +
            `global outline pass before writing, not a shorter report.`,
        });
      }
    }

    return build("prose_ratio", violations, ratio(inBand, ratios.length), {
      sectionsScored: ratios.length,
      sectionsInBand: inBand,
    });
  };
}

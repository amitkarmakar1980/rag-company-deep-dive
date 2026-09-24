import * as fx from "./fixtures/companySnapshot";
import { allViolations, scoreReport } from "./scorers";

/**
 * Scorer self-test. Answers "who tests the tests".
 *
 * Two obligations, and the second matters more than it looks:
 *
 *   1. The clean fixture passes everything — no scorer flags correct work.
 *   2. Each broken fixture is caught by the *specific* scorer meant to catch it.
 *
 * Obligation 2 is checked by violation code, not just by "something failed". A
 * scorer suite where every defect trips every scorer is indistinguishable from
 * one that always fails, and would give false confidence exactly when relied on.
 *
 * Run: npm run eval:selftest
 */

interface Case {
  name: string;
  /** Violation code the case must produce. */
  expectCode: string;
  run: () => ReturnType<typeof scoreReport>;
}

const score = (
  report: Parameters<typeof scoreReport>[0]["report"],
  prose?: string,
  perSectionWords?: Record<string, number>,
) =>
  scoreReport({
    report,
    chunkText: fx.chunkLookup,
    prose,
    perSectionWords,
  });

const cases: Case[] = [
  {
    name: "fabricated quote is caught by grounding",
    expectCode: "grounding.quote_not_found",
    run: () => score(fx.broken_fabricatedQuote()),
  },
  {
    name: "citation to a nonexistent chunk is caught by grounding",
    expectCode: "grounding.missing_chunk",
    run: () => score(fx.broken_missingChunk()),
  },
  {
    name: "inference labelled as fact is caught by labels",
    expectCode: "labels.fact_reads_as_inference",
    run: () => score(fx.broken_mislabelledInference()),
  },
  {
    name: "missing required coverage element is caught by coverage",
    expectCode: "coverage.missing.C3",
    run: () => score(fx.broken_missingCoverage()),
  },
  {
    name: "high confidence on thin coverage is caught by labels",
    expectCode: "labels.overconfident_on_thin_coverage",
    run: () => score(fx.broken_overconfidentThinCoverage()),
  },
  {
    name: "same fact stated in full twice is caught by redundancy",
    expectCode: "redundancy.multiple_canonical_owners",
    run: () => score(fx.broken_duplicateCanonical()),
  },
  {
    name: "unjustified repetition is caught by redundancy",
    expectCode: "redundancy.unjustified_reinforcement",
    run: () => score(fx.broken_unjustifiedReinforce()),
  },
  {
    name: "prose inventing a number is caught by fabrication",
    expectCode: "fabrication.untraceable_quantity",
    run: () => score(fx.CLEAN_REPORT, fx.broken_proseInventsNumber()),
  },
  {
    name: "prose inventing a name is caught by fabrication",
    expectCode: "fabrication.untraceable_name",
    run: () => score(fx.CLEAN_REPORT, fx.broken_proseInventsName()),
  },
  {
    name: "banned phrase is caught by style",
    expectCode: "style.banned_phrase",
    run: () => score(fx.CLEAN_REPORT, fx.broken_proseBannedPhrase()),
  },
  {
    name: "second person is caught by style",
    expectCode: "style.second_person",
    run: () => score(fx.CLEAN_REPORT, fx.broken_proseSecondPerson()),
  },
  {
    name: "unmarked inference is caught by style",
    expectCode: "style.unmarked_inference",
    run: () => score(fx.CLEAN_REPORT, fx.broken_proseUnmarkedInference()),
  },
];

function main(): number {
  let failures = 0;
  const log = (s: string) => process.stdout.write(s + "\n");

  log("");
  log("Scorer self-test");
  log("");

  // ── Obligation 1: the clean fixture passes everything. ──
  const clean = score(fx.CLEAN_REPORT, fx.CLEAN_PROSE, fx.CLEAN_WORDS);
  if (clean.pass) {
    log(`  PASS  clean fixture scores clean`);
  } else {
    failures++;
    log(`  FAIL  clean fixture should pass but did not`);
    if (clean.belowThreshold.length > 0) {
      log(`        below threshold: ${clean.belowThreshold.join(", ")}`);
    }
    for (const v of allViolations(clean)) {
      log(`        [${v.severity}] ${v.scorer} ${v.code}: ${v.message}`);
    }
  }
  log(
    `        scores: ${Object.entries(clean.summary)
      .map(([k, v]) => `${k} ${v}`)
      .join("  ")}`,
  );
  log("");

  // ── Obligation 2: each defect trips its own scorer. ──
  for (const c of cases) {
    const result = c.run();
    const codes = allViolations(result).map((v) => v.code);
    const caught = codes.includes(c.expectCode);

    if (caught && !result.pass) {
      log(`  PASS  ${c.name}`);
    } else {
      failures++;
      log(`  FAIL  ${c.name}`);
      if (!caught) {
        log(`        expected code '${c.expectCode}', got: ${codes.join(", ") || "none"}`);
      }
      if (result.pass) {
        log(`        report scored as passing despite the injected defect`);
      }
    }
  }

  log("");
  log(failures === 0 ? `All ${cases.length + 1} checks passed.` : `${failures} check(s) failed.`);
  log("");
  return failures === 0 ? 0 : 1;
}

process.exit(main());

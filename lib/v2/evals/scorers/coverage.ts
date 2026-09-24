import type { FactType, SectionId } from "@/lib/v2/contract/schema";
import { build, ratio, type SectionScorer, type Violation } from "./types";

/**
 * Coverage — did the section establish the things its rubric requires?
 *
 * Mechanical because claims carry `factType`: "does this section establish the
 * company's scale" reduces to "is there a `scale` claim". That is the whole
 * reason `factType` is on the claim.
 *
 * It checks presence, not quality. A `scale` claim that is present but useless
 * passes here and fails the human rubric. Coverage is a floor, not a verdict.
 */

interface CoverageElement {
  /** Rubric id, e.g. C1 — kept so scores map onto the human scoring sheet. */
  id: string;
  label: string;
  /** Satisfied by at least one claim of any of these types. */
  satisfiedBy: FactType[];
  /** Absence fails the run rather than merely scoring low. */
  required: boolean;
}

/**
 * Per-section coverage requirements, mirroring the rubric markdown in
 * `../rubrics/`. Only `company_snapshot` is defined — remaining sections are
 * added as their rubrics are written, one at a time.
 *
 * A section with no entry here is not silently passed; see `coverageScorer`.
 */
export const COVERAGE_REQUIREMENTS: Partial<
  Record<SectionId, CoverageElement[]>
> = {
  company_snapshot: [
    {
      id: "C1",
      label: "Founding, ownership, current stage",
      satisfiedBy: ["ownership", "history"],
      required: true,
    },
    {
      id: "C2",
      label: "Scale — revenue or ARR, headcount, customers",
      satisfiedBy: ["scale", "financials"],
      required: true,
    },
    {
      id: "C3",
      label: "Business model — how money is actually made",
      satisfiedBy: ["product", "pricing"],
      required: true,
    },
    {
      id: "C4",
      label: "Trajectory — growing, flat, or contracting",
      satisfiedBy: ["financials", "market"],
      required: true,
    },
    {
      id: "C5",
      label: "Recent material events (last ~18 months)",
      satisfiedBy: ["event"],
      required: false,
    },
    {
      id: "C6",
      label: "Financial health signal",
      satisfiedBy: ["financials", "risk"],
      required: false,
    },
  ],
};

export const coverageScorer: SectionScorer = ({ section }) => {
  const violations: Violation[] = [];
  const elements = COVERAGE_REQUIREMENTS[section.id];

  if (!elements) {
    return build(
      "coverage",
      [
        {
          severity: "fatal",
          code: "coverage.no_requirements_defined",
          message:
            `No coverage requirements defined for section '${section.id}'. ` +
            `Add them to COVERAGE_REQUIREMENTS when its rubric is written. ` +
            `Refusing to pass an unscored section.`,
        },
      ],
      0,
    );
  }

  const present = new Set(section.claims.map((c) => c.factType));
  let satisfied = 0;

  for (const el of elements) {
    if (el.satisfiedBy.some((t) => present.has(t))) {
      satisfied++;
      continue;
    }
    violations.push({
      severity: el.required ? "fatal" : "warn",
      code: `coverage.missing.${el.id}`,
      message:
        `${el.id} (${el.label}) not established — no claim of type ` +
        `${el.satisfiedBy.join(" / ")}.`,
    });
  }

  // An empty section is a distinct failure from a partially covered one, and a
  // more alarming one: it means the researcher found nothing and nobody noticed.
  if (section.claims.length === 0) {
    violations.push({
      severity: "fatal",
      code: "coverage.empty_section",
      message: "Section contains no claims at all.",
    });
  }

  // Coverage and self-reported sufficiency must agree. A section claiming
  // 'strong' coverage while missing required elements is lying to downstream
  // sections, which use sufficiency to temper their own confidence.
  const missingRequired = violations.some((v) => v.severity === "fatal");
  if (missingRequired && section.coverage.sufficiency === "strong") {
    violations.push({
      severity: "fatal",
      code: "coverage.sufficiency_overstated",
      message:
        "Reports 'strong' sufficiency while required coverage elements are " +
        "missing. Downstream sections rely on this signal being honest.",
    });
  }

  return build("coverage", violations, ratio(satisfied, elements.length), {
    elementsRequired: elements.length,
    elementsSatisfied: satisfied,
  });
};

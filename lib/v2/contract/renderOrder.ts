import { SectionId } from "./schema";
import { SECTION_GRAPH } from "./sectionGraph";

/**
 * Reading order of the report.
 *
 * Deliberately independent of `sectionGraph.ts`. That file answers "what does
 * this section need in order to be written" — an analytical question with
 * correct and incorrect answers. This file answers "what order should a reader
 * meet these in" — an editorial question with no dependency implications at all.
 *
 * Conflating the two is a trap: it would mean improving the reading flow by
 * weakening a section's inputs. Keeping them separate means reading order is
 * free to change, with no regeneration, because rendering is deterministic code
 * over claims that already exist.
 */

/** Narrative blocks. The report establishes the company, reaches a verdict on
 *  it, then turns to the role — so a reader who stops early still gets a
 *  complete thought rather than half of one. */
export const NARRATIVE_BLOCKS = [
  {
    id: "company",
    title: "The Company",
    sections: [
      "business_fundamentals",
      "trajectory_and_health",
      "product_and_customers",
      "stated_direction",
      "operating_culture",
      "competitive_landscape",
      "product_teardown",
    ],
  },
  {
    // The company verdict closes the company block rather than opening the role
    // one. A reader deciding whether to read on has everything they need here.
    id: "company_verdict",
    title: "Company Assessment",
    sections: ["company_swot"],
  },
  {
    id: "role",
    title: "The Role",
    sections: ["role_origin", "role_scope", "role_swot"],
  },
  {
    id: "recommendation",
    title: "What to Do With It",
    sections: ["strategy_pov"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  sections: readonly SectionId[];
}>;

/** Flat reading order, derived from the blocks. */
export const SECTION_RENDER_ORDER: SectionId[] = NARRATIVE_BLOCKS.flatMap(
  (b) => b.sections as readonly SectionId[],
);

/**
 * Every section appears exactly once, and every section in the graph appears.
 *
 * Checked rather than assumed: adding a section to the graph without placing it
 * in the reading order would otherwise drop it from the rendered report
 * silently, which is the kind of bug that survives for months.
 */
export function assertRenderOrderComplete(): void {
  const ordered = SECTION_RENDER_ORDER;
  const inGraph = SECTION_GRAPH.map((n) => n.id);

  const duplicates = ordered.filter((id, i) => ordered.indexOf(id) !== i);
  if (duplicates.length > 0) {
    throw new Error(
      `Section(s) appear more than once in the reading order: ${duplicates.join(", ")}`,
    );
  }

  const missing = inGraph.filter((id) => !ordered.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `Section(s) in the graph but absent from the reading order, so they would ` +
        `never render: ${missing.join(", ")}`,
    );
  }

  const unknown = ordered.filter((id) => !inGraph.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `Section(s) in the reading order but not in the graph: ${unknown.join(", ")}`,
    );
  }
}

/** Sort key for a section, for use by the renderer and the prose pass. */
export function readingPosition(id: SectionId): number {
  const i = SECTION_RENDER_ORDER.indexOf(id);
  if (i < 0) throw new Error(`Section '${id}' has no reading position.`);
  return i;
}

/**
 * Derived views (BACKLOG B16) slot in around these blocks once they exist —
 * executive summary and 5-minute brief ahead of everything, unknowns to
 * validate and risks & red flags after the company verdict. They are not
 * sections, so they are not listed here; the renderer places them.
 */

import type { Claim, ClaimLabel, CoverageReport, SectionId } from "./schema";

/**
 * Section dependency graph.
 *
 * Sections are agents arranged as a DAG, not a flat parallel batch. The
 * ordering is analytical, not incidental: a SWOT written blind to the
 * competitive analysis is a worse SWOT, and a strategy module written blind to
 * the SWOT is much worse. Downstream sections consume upstream *conclusions*,
 * not just upstream evidence.
 *
 * Tiers exist so independence still buys parallelism. Everything in a tier runs
 * concurrently; a tier starts when every dependency has been written AND
 * verified (see `Handoff`).
 */

export interface SectionNode {
  id: SectionId;
  title: string;
  /** Sections whose verified conclusions this one receives as context. */
  dependsOn: SectionId[];
  /** What this section is expected to do with its upstream context. Goes into
   *  the agent's prompt — a dependency with no stated purpose is decoration. */
  usesUpstreamFor: string;
}

export const SECTION_GRAPH: SectionNode[] = [
  // ── Tier 1 — foundational. No dependencies; runs in parallel. ──
  {
    id: "company_snapshot",
    title: "Company Snapshot",
    dependsOn: [],
    usesUpstreamFor: "",
  },
  {
    id: "vision_and_values",
    title: "Vision, Values, and Leadership",
    dependsOn: [],
    usesUpstreamFor: "",
  },
  {
    id: "product_and_customers",
    title: "Product and Customer Map",
    dependsOn: [],
    usesUpstreamFor: "",
  },

  // ── Tier 2 — builds on the factual base. ──
  {
    id: "product_teardown",
    title: "Product Teardown",
    dependsOn: ["product_and_customers"],
    usesUpstreamFor:
      "Teardown targets the products and segments already mapped upstream. Do not re-establish what the product is; evaluate how well it works and where the gaps are.",
  },
  {
    id: "competitive_landscape",
    title: "Competitive Landscape",
    dependsOn: ["company_snapshot", "product_and_customers"],
    usesUpstreamFor:
      "Position the company against rivals using its established scale, business model, and segments. Do not restate the company's own financials; reference them.",
  },

  // ── Tier 3 — synthesis. ──
  {
    id: "swot",
    title: "Strengths, Weaknesses, Opportunities, Threats",
    dependsOn: [
      "company_snapshot",
      "product_and_customers",
      "product_teardown",
      "competitive_landscape",
    ],
    usesUpstreamFor:
      "Every SWOT entry must trace to an upstream conclusion, cited by claim id. A SWOT entry with no upstream basis is either a missed research gap or an invention.",
  },
  {
    id: "role_fit",
    title: "Role Fit",
    dependsOn: ["vision_and_values", "product_teardown", "company_snapshot"],
    usesUpstreamFor:
      "Assess what this role actually owns given the product gaps found upstream, the operating culture, and the company's stage.",
  },

  // ── Tier 4 — recommendation. Sees everything. ──
  {
    id: "strategy_module",
    title: "Strategy: Tactical to Moonshot",
    dependsOn: [
      "company_snapshot",
      "vision_and_values",
      "product_and_customers",
      "product_teardown",
      "competitive_landscape",
      "swot",
      "role_fit",
    ],
    usesUpstreamFor:
      "Propose moves that answer upstream weaknesses and threats and exploit upstream opportunities. Each proposal names the upstream claims it responds to.",
  },
];

/**
 * What a section hands to its dependents.
 *
 * Deliberately compact. Passing full evidence downstream would bloat context
 * and dilute attention by tier 4, which depends on everything. Downstream
 * sections get conclusions and pointers — they reference an upstream claim by
 * id rather than re-citing its chunks, which is what keeps the same fact from
 * being restated four times.
 */
export interface Handoff {
  sectionId: SectionId;
  title: string;
  /** The section's conclusion. The single most important field downstream. */
  summary: string;
  /** Canonical claims available for reference, stripped of evidence bodies. */
  establishedFacts: Array<{
    claimId: string;
    factKey?: string;
    statement: string;
    label: ClaimLabel;
    confidence: Claim["confidence"];
  }>;
  /** Unresolved questions. A dependent may answer one, and should not silently
   *  assume it away. */
  openQuestions: string[];
  /** Downstream must temper confidence when upstream coverage was thin. */
  sufficiency: CoverageReport["sufficiency"];
}

/** Execution tiers, derived from the graph. Each tier runs concurrently. */
export function resolveTiers(graph: SectionNode[] = SECTION_GRAPH): SectionId[][] {
  const remaining = new Map(graph.map((n) => [n.id, n]));
  const done = new Set<SectionId>();
  const tiers: SectionId[][] = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((n) => n.dependsOn.every((d) => done.has(d)))
      .map((n) => n.id);

    if (ready.length === 0) {
      throw new Error(
        `Cycle in section graph. Unresolvable: ${[...remaining.keys()].join(", ")}`,
      );
    }

    tiers.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      done.add(id);
    }
  }

  return tiers;
}

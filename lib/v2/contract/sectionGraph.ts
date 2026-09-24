import type { Claim, ClaimLabel, CoverageReport, SectionId } from "./schema";

/**
 * Section dependency graph — Layer A.
 *
 * Sections are agents arranged as a DAG, not a flat parallel batch. The
 * ordering is analytical, not incidental: a SWOT written blind to the
 * competitive analysis is a worse SWOT, and a strategy POV written blind to the
 * SWOT is much worse. Downstream sections consume upstream *conclusions*, not
 * just upstream evidence.
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
    id: "business_fundamentals",
    title: "Business Fundamentals",
    dependsOn: [],
    usesUpstreamFor: "",
  },
  {
    id: "trajectory_and_health",
    title: "Trajectory and Financial Health",
    dependsOn: [],
    usesUpstreamFor: "",
  },
  {
    id: "stated_direction",
    title: "Stated Direction and Leadership",
    dependsOn: [],
    usesUpstreamFor: "",
  },
  {
    // Split from stated_direction deliberately. Stated values and actual
    // operating culture are frequently in conflict, and that conflict is one of
    // the most useful findings in the report. One agent covering both buries it;
    // two agents surface it, and contradiction handling reports it.
    id: "operating_culture",
    title: "Operating Culture",
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
    id: "competitive_landscape",
    title: "Competitive Landscape",
    dependsOn: [
      "business_fundamentals",
      "product_and_customers",
      "trajectory_and_health",
    ],
    usesUpstreamFor:
      "Position the company against rivals using its established scale, business model, segments, and growth rate. Do not restate the company's own financials; reference them.",
  },
  {
    id: "product_teardown",
    title: "Product Teardown",
    dependsOn: ["product_and_customers"],
    usesUpstreamFor:
      "Teardown targets the products and segments already mapped upstream. Do not re-establish what the product is; evaluate how well it works and where the gaps are.",
  },
  {
    id: "role_origin",
    title: "Why This Role Exists Now",
    dependsOn: ["trajectory_and_health", "stated_direction"],
    usesUpstreamFor:
      "Explain what changed to create this hire — growth, a departure, a reorg, a new bet, a problem the company cannot currently solve. Anchor the explanation in upstream events and stated priorities rather than in the job description's own framing.",
  },

  // ── Tier 3 — synthesis. ──
  {
    id: "company_swot",
    title: "Company SWOT",
    dependsOn: [
      "business_fundamentals",
      "trajectory_and_health",
      "stated_direction",
      "operating_culture",
      "product_and_customers",
      "competitive_landscape",
      "product_teardown",
    ],
    usesUpstreamFor:
      "Every entry must trace to an upstream conclusion, cited by claim id. An entry with no upstream basis is either a missed research gap or an invention.",
  },
  {
    id: "role_scope",
    title: "What This Role Actually Owns",
    dependsOn: [
      "product_teardown",
      "role_origin",
      "operating_culture",
      "business_fundamentals",
    ],
    usesUpstreamFor:
      "Assess real scope and leverage given the product gaps found upstream, why the role was created, how decisions actually get made, and the company's stage. Where the job description's framing conflicts with upstream evidence, say so.",
  },

  // ── Tier 4 — role-level synthesis and recommendation. ──
  {
    id: "role_swot",
    title: "Role SWOT",
    dependsOn: ["role_scope", "role_origin", "company_swot"],
    usesUpstreamFor:
      "The second layer of the two-layer SWOT: strengths and risks of this seat specifically, distinct from the company's. Company-level entries belong upstream; do not repeat them.",
  },
  {
    id: "strategy_pov",
    title: "Strategy: Tactical to Moonshot",
    dependsOn: [
      "business_fundamentals",
      "trajectory_and_health",
      "stated_direction",
      "product_and_customers",
      "product_teardown",
      "competitive_landscape",
      "company_swot",
      "role_scope",
      "role_swot",
    ],
    usesUpstreamFor:
      "Propose moves a candidate in this seat could make, answering upstream weaknesses and threats and exploiting upstream opportunities. Each proposal names the upstream claims it responds to.",
  },
];

/**
 * What a section hands to its dependents.
 *
 * Deliberately compact. Passing full evidence downstream would bloat context
 * and dilute attention by tier 4, which depends on nine upstream sections.
 * Downstream sections get conclusions and pointers — they reference an upstream
 * claim by id rather than re-citing its chunks, which is what keeps the same
 * fact from being restated repeatedly.
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
   *  assume it away. Also the raw material for the derived
   *  "unknowns to validate" view. */
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

export function nodeFor(id: SectionId): SectionNode {
  const node = SECTION_GRAPH.find((n) => n.id === id);
  if (!node) throw new Error(`No section node for '${id}'.`);
  return node;
}

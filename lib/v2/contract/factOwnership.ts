import type { FactType, SectionId } from "./schema";

export type { FactType };

/**
 * Canonical ownership rules for facts asserted by more than one section.
 *
 * Fixed table, not a model call (see BACKLOG.md B3). The table starts thin on
 * purpose: when a cluster doesn't match a rule, we flag it rather than guess,
 * and each human ruling becomes a new rule here. The rule set grows from real
 * ambiguity instead of speculation about it.
 */

/**
 * Preference order per fact type: first section present in the report wins
 * canonical ownership. Later entries are fallbacks, not co-owners.
 *
 * An empty or exhausted list means "ambiguous" — flagged, never guessed.
 */
const OWNERSHIP_ORDER: Record<FactType, SectionId[]> = {
  financials: ["company_snapshot", "swot"],
  scale: ["company_snapshot"],
  ownership: ["company_snapshot"],
  history: ["company_snapshot", "vision_and_values"],
  leadership: ["vision_and_values", "company_snapshot"],
  culture: ["vision_and_values", "role_fit"],
  product: ["product_and_customers", "product_teardown"],
  pricing: ["product_and_customers", "competitive_landscape"],
  competitor: ["competitive_landscape", "swot"],
  market: ["competitive_landscape", "strategy_module"],
  strategy: ["strategy_module", "vision_and_values"],
  risk: ["swot", "company_snapshot"],
  event: ["company_snapshot", "swot"],
  role: ["role_fit", "product_teardown"],
};

export interface FactCluster {
  factKey: string;
  factType: FactType;
  /** Sections that independently asserted this fact. */
  claimedBy: SectionId[];
}

export type OwnershipRuling =
  | { kind: "resolved"; owner: SectionId; rule: FactType }
  | {
      kind: "ambiguous";
      /** Surfaced for a human ruling, which then becomes a rule above. */
      candidates: SectionId[];
      reason: string;
    };

export function resolveOwner(cluster: FactCluster): OwnershipRuling {
  const { factType, claimedBy } = cluster;

  if (claimedBy.length === 0) {
    return {
      kind: "ambiguous",
      candidates: [],
      reason: "Cluster has no claiming sections.",
    };
  }
  if (claimedBy.length === 1) {
    return { kind: "resolved", owner: claimedBy[0], rule: factType };
  }

  const order = OWNERSHIP_ORDER[factType] ?? [];
  const owner = order.find((s) => claimedBy.includes(s));

  if (!owner) {
    return {
      kind: "ambiguous",
      candidates: claimedBy,
      reason:
        `No ownership rule for factType '${factType}' covers any of the ` +
        `claiming sections (${claimedBy.join(", ")}). Needs a human ruling, ` +
        `which should then be added to OWNERSHIP_ORDER.`,
    };
  }

  return { kind: "resolved", owner, rule: factType };
}

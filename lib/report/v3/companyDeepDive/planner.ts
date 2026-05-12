import type { ResearchPlanV3, SectionRetrievalBundle } from "./types";
import { COMPANY_DEEP_DIVE_RETRIEVAL_QUERIES as SECTION_RETRIEVAL_QUERIES } from "./retrievalQueries";
import { SECTION_SOURCE_POLICY, REQUIRED_SECTIONS, SUPPRESSABLE_SECTIONS } from "./sectionPolicies";

interface PlannerInput {
  companyName: string;
  roleTitle?: string;
  jobDescription?: string;
  /** URLs already known to be fetchable for this request */
  availableUrls?: string[];
}

/**
 * Determines which sections to prioritize and builds retrieval bundles.
 *
 * The planner is intentionally simple — it does not call an LLM.
 * Its job is to configure retrieval so each section gets targeted queries
 * rather than competing in a single global embedding space.
 */
export function planCompanyDeepDiveResearch(input: PlannerInput): ResearchPlanV3 {
  const { companyName, roleTitle } = input;

  // All sections ordered by strategic importance for senior PM candidates
  const sectionPriority = [
    "company_snapshot",
    "business_model",
    "strategy",
    "competition",
    "risks",
    "ai_technology_platform_strategy",
    "culture_sentiment",
    "customer_sentiment",
    "recent_news",
  ];

  const sectionBundles: SectionRetrievalBundle[] = sectionPriority.map((sectionKey) => {
    const policy = SECTION_SOURCE_POLICY[sectionKey];
    const rawQueries = SECTION_RETRIEVAL_QUERIES[sectionKey] ?? [];
    const queries = rawQueries.map((q: string) =>
      q.replace(/\{company\}/g, companyName)
       .replace(/\{role\}/g, roleTitle ?? "")
    );
    return {
      sectionKey,
      queries,
      perQueryLimit: policy?.perQueryLimit ?? 6,
      similarityThreshold: policy?.similarityThreshold ?? 0.32,
    };
  });

  const requiredNote = Array.from(REQUIRED_SECTIONS).join(", ");
  const suppressableNote = Array.from(SUPPRESSABLE_SECTIONS).join(", ");

  return {
    companyName,
    roleTitle,
    prioritizedSections: sectionPriority,
    sectionBundles,
    sourceStrategyNote:
      `Required sections: ${requiredNote}. ` +
      `Suppressable if evidence insufficient: ${suppressableNote}. ` +
      `Investor/annual report sources boosted. Sentiment sources treated as directional only.`,
  };
}

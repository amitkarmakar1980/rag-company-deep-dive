import type { SectionSourcePolicy } from "./types";

/**
 * Maps each CompanyDeepDiveV3 section to its retrieval policy.
 * Controls which source tiers are prioritized, minimum evidence
 * required before marking insufficient, and retrieval tuning.
 */
export const SECTION_SOURCE_POLICY: Record<string, SectionSourcePolicy> = {
  company_snapshot: {
    sectionKey: "company_snapshot",
    preferredTiers: ["primary", "secondary"],
    minChunks: 2,
    perQueryLimit: 6,
    similarityThreshold: 0.35,
  },

  business_model: {
    sectionKey: "business_model",
    preferredTiers: ["primary", "secondary"],
    minChunks: 3,
    perQueryLimit: 8,
    similarityThreshold: 0.33,
  },

  strategy: {
    sectionKey: "strategy",
    preferredTiers: ["primary", "secondary"],
    minChunks: 3,
    perQueryLimit: 8,
    similarityThreshold: 0.33,
  },

  ai_technology_platform_strategy: {
    sectionKey: "ai_technology_platform_strategy",
    preferredTiers: ["primary", "secondary"],
    minChunks: 2,
    perQueryLimit: 6,
    similarityThreshold: 0.32,
  },

  competition: {
    sectionKey: "competition",
    preferredTiers: ["secondary", "primary"],
    minChunks: 2,
    perQueryLimit: 7,
    similarityThreshold: 0.32,
  },

  risks: {
    sectionKey: "risks",
    preferredTiers: ["primary", "secondary"],
    minChunks: 2,
    perQueryLimit: 6,
    similarityThreshold: 0.30,
  },

  culture_sentiment: {
    sectionKey: "culture_sentiment",
    preferredTiers: ["sentiment", "secondary"],
    minChunks: 1,
    perQueryLimit: 5,
    similarityThreshold: 0.28,
  },

  customer_sentiment: {
    sectionKey: "customer_sentiment",
    preferredTiers: ["secondary", "sentiment"],
    minChunks: 1,
    perQueryLimit: 5,
    similarityThreshold: 0.28,
  },

  recent_news: {
    sectionKey: "recent_news",
    preferredTiers: ["secondary", "primary"],
    minChunks: 1,
    perQueryLimit: 6,
    similarityThreshold: 0.30,
  },
};

/** Sections that can be gracefully suppressed if minChunks not met. */
export const SUPPRESSABLE_SECTIONS = new Set([
  "culture_sentiment",
  "customer_sentiment",
  "ai_technology_platform_strategy",
]);

/** Sections that must pass or trigger a retry. */
export const REQUIRED_SECTIONS = new Set([
  "company_snapshot",
  "business_model",
  "strategy",
  "competition",
  "risks",
]);

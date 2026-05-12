import type { SourcePattern, SourceTier } from "./types";

// ── Primary company sources ──────────────────────────────────────────────────
// Official company-controlled pages. Highest epistemic authority.

export const PRIMARY_SOURCE_PATTERNS: SourcePattern[] = [
  { pattern: /\/about/i,          tier: "primary", label: "About Page",          trustWeight: 0.95 },
  { pattern: /\/mission/i,         tier: "primary", label: "Mission Page",         trustWeight: 0.95 },
  { pattern: /\/leadership/i,      tier: "primary", label: "Leadership Page",      trustWeight: 0.90 },
  { pattern: /\/team/i,            tier: "primary", label: "Team Page",            trustWeight: 0.85 },
  { pattern: /\/blog/i,            tier: "primary", label: "Official Blog",         trustWeight: 0.80 },
  { pattern: /\/newsroom/i,        tier: "primary", label: "Newsroom",             trustWeight: 0.85 },
  { pattern: /\/press/i,           tier: "primary", label: "Press Page",           trustWeight: 0.80 },
  { pattern: /\/careers/i,         tier: "primary", label: "Careers Page",         trustWeight: 0.75 },
  { pattern: /\/jobs/i,            tier: "primary", label: "Jobs Page",            trustWeight: 0.75 },
  { pattern: /\/product/i,         tier: "primary", label: "Product Page",         trustWeight: 0.80 },
  { pattern: /\/platform/i,        tier: "primary", label: "Platform Page",        trustWeight: 0.80 },
  { pattern: /\/pricing/i,         tier: "primary", label: "Pricing Page",         trustWeight: 0.85 },
  { pattern: /\/enterprise/i,      tier: "primary", label: "Enterprise Page",      trustWeight: 0.80 },
  { pattern: /\/solutions/i,       tier: "primary", label: "Solutions Page",       trustWeight: 0.78 },
];

// ── Investor / financial sources ─────────────────────────────────────────────
// Highest analytical value for business model and financial signals.

export const INVESTOR_SOURCES: SourcePattern[] = [
  { pattern: /investor[\s.-]?relations/i, tier: "primary", label: "Investor Relations",  trustWeight: 0.98 },
  { pattern: /ir\./i,                     tier: "primary", label: "IR Subdomain",         trustWeight: 0.98 },
  { pattern: /10-k|10k/i,                 tier: "primary", label: "10-K Annual Report",   trustWeight: 1.00 },
  { pattern: /10-q|10q/i,                 tier: "primary", label: "10-Q Quarterly",       trustWeight: 0.95 },
  { pattern: /annual[\s-]report/i,        tier: "primary", label: "Annual Report",        trustWeight: 0.98 },
  { pattern: /shareholder[\s-]letter/i,   tier: "primary", label: "Shareholder Letter",   trustWeight: 0.97 },
  { pattern: /earnings[\s-]call/i,        tier: "secondary", label: "Earnings Call",      trustWeight: 0.92 },
  { pattern: /sec\.gov/i,                 tier: "primary", label: "SEC Filing",           trustWeight: 1.00 },
  { pattern: /edgar\.sec\.gov/i,          tier: "primary", label: "SEC EDGAR",            trustWeight: 1.00 },
];

// ── Business intelligence sources ────────────────────────────────────────────
// High-quality secondary — reputable press, analyst, and research.

export const BUSINESS_INTEL_SOURCES: SourcePattern[] = [
  { pattern: /techcrunch\.com/i,    tier: "secondary", label: "TechCrunch",       trustWeight: 0.78 },
  { pattern: /bloomberg\.com/i,     tier: "secondary", label: "Bloomberg",         trustWeight: 0.90 },
  { pattern: /wsj\.com/i,           tier: "secondary", label: "Wall Street Journal", trustWeight: 0.92 },
  { pattern: /ft\.com/i,            tier: "secondary", label: "Financial Times",   trustWeight: 0.92 },
  { pattern: /reuters\.com/i,       tier: "secondary", label: "Reuters",           trustWeight: 0.90 },
  { pattern: /fortune\.com/i,       tier: "secondary", label: "Fortune",           trustWeight: 0.82 },
  { pattern: /forbes\.com/i,        tier: "secondary", label: "Forbes",            trustWeight: 0.78 },
  { pattern: /businessinsider\.com/i, tier: "secondary", label: "Business Insider", trustWeight: 0.72 },
  { pattern: /crunchbase\.com/i,    tier: "secondary", label: "Crunchbase",        trustWeight: 0.80 },
  { pattern: /pitchbook\.com/i,     tier: "secondary", label: "PitchBook",         trustWeight: 0.85 },
  { pattern: /a16z\.com/i,          tier: "secondary", label: "a16z Blog",         trustWeight: 0.82 },
  { pattern: /sequoiacap\.com/i,    tier: "secondary", label: "Sequoia",           trustWeight: 0.82 },
  { pattern: /gartner\.com/i,       tier: "secondary", label: "Gartner",           trustWeight: 0.88 },
  { pattern: /forrester\.com/i,     tier: "secondary", label: "Forrester",         trustWeight: 0.88 },
  { pattern: /g2\.com/i,            tier: "secondary", label: "G2 Reviews",        trustWeight: 0.72 },
];

// ── Product / developer / ecosystem sources ──────────────────────────────────

export const PRODUCT_ECOSYSTEM_SOURCES: SourcePattern[] = [
  { pattern: /docs\./i,              tier: "primary", label: "Developer Docs",       trustWeight: 0.88 },
  { pattern: /developer\./i,         tier: "primary", label: "Developer Portal",     trustWeight: 0.88 },
  { pattern: /api\./i,               tier: "primary", label: "API Reference",        trustWeight: 0.85 },
  { pattern: /engineering\./i,       tier: "primary", label: "Engineering Blog",     trustWeight: 0.82 },
  { pattern: /github\.com/i,         tier: "secondary", label: "GitHub",             trustWeight: 0.80 },
  { pattern: /medium\.com/i,         tier: "secondary", label: "Medium Engineering", trustWeight: 0.70 },
  { pattern: /stackoverflow\.blog/i, tier: "secondary", label: "Stack Overflow Blog", trustWeight: 0.75 },
];

// ── Employee sentiment sources ────────────────────────────────────────────────
// Directional only — never treated as authoritative.

export const EMPLOYEE_SENTIMENT_SOURCES: SourcePattern[] = [
  { pattern: /glassdoor\.com/i,   tier: "sentiment", label: "Glassdoor",      trustWeight: 0.55 },
  { pattern: /blind\.com/i,       tier: "sentiment", label: "Blind",           trustWeight: 0.50 },
  { pattern: /levels\.fyi/i,      tier: "sentiment", label: "Levels.fyi",      trustWeight: 0.55 },
  { pattern: /comparably\.com/i,  tier: "sentiment", label: "Comparably",      trustWeight: 0.52 },
  { pattern: /reddit\.com/i,      tier: "sentiment", label: "Reddit",          trustWeight: 0.45 },
  { pattern: /teamblind\.com/i,   tier: "sentiment", label: "TeamBlind",       trustWeight: 0.48 },
  { pattern: /linkedin\.com/i,    tier: "sentiment", label: "LinkedIn",        trustWeight: 0.60 },
  { pattern: /indeed\.com/i,      tier: "sentiment", label: "Indeed Reviews",  trustWeight: 0.52 },
  { pattern: /builtin\.com/i,     tier: "sentiment", label: "Built In",        trustWeight: 0.55 },
];

// ── AI / technology signal sources ───────────────────────────────────────────

export const AI_TECH_SOURCES: SourcePattern[] = [
  { pattern: /ai\./i,             tier: "primary",   label: "AI Subdomain",       trustWeight: 0.85 },
  { pattern: /research\./i,       tier: "primary",   label: "Research Page",      trustWeight: 0.90 },
  { pattern: /arxiv\.org/i,       tier: "secondary", label: "arXiv Research",     trustWeight: 0.88 },
  { pattern: /openai\.com/i,      tier: "secondary", label: "OpenAI",             trustWeight: 0.82 },
  { pattern: /huggingface\.co/i,  tier: "secondary", label: "HuggingFace",        trustWeight: 0.80 },
  { pattern: /theverge\.com/i,    tier: "secondary", label: "The Verge",          trustWeight: 0.72 },
  { pattern: /wired\.com/i,       tier: "secondary", label: "Wired",              trustWeight: 0.75 },
  { pattern: /venturebeat\.com/i, tier: "secondary", label: "VentureBeat",        trustWeight: 0.72 },
];

// ── Career / labor market sources ────────────────────────────────────────────
// Supplemental — useful for salary, skill demand, labor market context.

export const CAREER_MARKET_SOURCES: SourcePattern[] = [
  { pattern: /onetonline\.org/i,     tier: "supplemental", label: "O*NET",              trustWeight: 0.70 },
  { pattern: /careeronestop\.org/i,  tier: "supplemental", label: "CareerOneStop",       trustWeight: 0.65 },
  { pattern: /bls\.gov/i,            tier: "supplemental", label: "BLS (Labor Stats)",   trustWeight: 0.82 },
  { pattern: /linkedin\.com\/jobs/i, tier: "supplemental", label: "LinkedIn Jobs",       trustWeight: 0.60 },
  { pattern: /hiringcafe\.com/i,     tier: "supplemental", label: "HiringCafe",          trustWeight: 0.58 },
];

// ── All registries merged ────────────────────────────────────────────────────

export const ALL_SOURCE_REGISTRIES: SourcePattern[][] = [
  PRIMARY_SOURCE_PATTERNS,
  INVESTOR_SOURCES,
  BUSINESS_INTEL_SOURCES,
  PRODUCT_ECOSYSTEM_SOURCES,
  EMPLOYEE_SENTIMENT_SOURCES,
  AI_TECH_SOURCES,
  CAREER_MARKET_SOURCES,
];

// ── Trust weight lookup ──────────────────────────────────────────────────────

/**
 * Returns the trust weight for a URL by matching against all registries.
 * Falls back to tier defaults if no pattern matches.
 */
export function getTrustWeight(url: string): number {
  for (const registry of ALL_SOURCE_REGISTRIES) {
    for (const entry of registry) {
      if (entry.pattern.test(url)) {
        return entry.trustWeight;
      }
    }
  }
  return 0.60; // unclassified default
}

/**
 * Classifies a URL into a source tier.
 */
export function classifySourceTier(url: string): SourceTier {
  for (const registry of ALL_SOURCE_REGISTRIES) {
    for (const entry of registry) {
      if (entry.pattern.test(url)) {
        return entry.tier;
      }
    }
  }
  return "secondary";
}

// ── Source type weights for retrieval reranking ──────────────────────────────
// Used to boost reranker scores by Supabase source_type column.

export const SOURCE_TYPE_TRUST_WEIGHTS: Record<string, number> = {
  job_description:  0.88,
  company_homepage: 0.80,
  newsroom:         0.85,
  blog:             0.78,
  custom_url:       0.92, // investor, earnings, annual reports typically land here
  profile_text:     0.40,
};

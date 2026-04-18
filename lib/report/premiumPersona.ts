import type { PremiumSectionKey } from "@/lib/report/premiumTypes";

export type PersonaRoleFamily =
  | "product"
  | "engineering"
  | "design"
  | "data_ml"
  | "marketing"
  | "sales_gtm"
  | "operations_program"
  | "executive";

export type PersonaSeniority =
  | "ic_junior_mid"
  | "senior_ic"
  | "staff_principal_architect"
  | "manager"
  | "senior_manager_group_manager"
  | "director"
  | "senior_director_vp"
  | "executive_gm_c_level";

export type PersonaConfidence = "high" | "medium" | "low";

export interface PremiumPersonaReadingExperienceProfile {
  sectionOrderingBasis: string;
  sectionsToExpand: string[];
  sectionsToCompress: string[];
  fiveMinuteBriefPriorities: string[];
}

export interface PremiumPersonaRetrievalProfile {
  mandatorySourceClasses: string[];
  preferredSourceClasses: string[];
  optionalSourceClasses: string[];
  secondaryBranchActivated: boolean;
  secondaryBranchReason: string | null;
}

export interface PremiumPersonaStrategyProfile {
  dominantLenses: string[];
  sectionsToExpand: string[];
  sectionsToCompress: string[];
}

export interface PremiumPersonaInterviewProfile {
  likelyInterviewerTypes: string[];
  dominantStoryRequirements: string[];
  dominantObjections: string[];
  dominantQuestionFamilies: string[];
}

export interface PremiumPersonaProfile {
  primaryRoleFamily: PersonaRoleFamily;
  primaryRoleFamilyLabel: string;
  secondaryRoleFamily: PersonaRoleFamily | null;
  secondaryRoleFamilyLabel: string | null;
  isBlendedPersona: boolean;
  roleFamily: PersonaRoleFamily;
  roleFamilyLabel: string;
  seniority: PersonaSeniority;
  seniorityLabel: string;
  subspecialization: string | null;
  confidence: PersonaConfidence;
  primaryWeight: number;
  secondaryWeight: number;
  personaEvidence: string[];
  personaReasoningTraceSummary: string;
  blendedModeJustification: string | null;
  suppressedSecondaryPersonaReason: string | null;
  mixedRole: boolean;
  blend: PersonaRoleFamily[];
  signals: string[];
  readingExperienceTemplate: string;
  readingExperienceProfile: PremiumPersonaReadingExperienceProfile;
  interviewFramework: string;
  retrievalProfile: PremiumPersonaRetrievalProfile;
  strategyProfile: PremiumPersonaStrategyProfile;
  interviewProfile: PremiumPersonaInterviewProfile;
  mandatorySourceClasses: string[];
  preferredSourceClasses: string[];
  optionalSourceClasses: string[];
}

export interface PremiumPresentationPlan {
  sectionOrder: PremiumSectionKey[];
  titleBySectionKey: Partial<Record<PremiumSectionKey, string>>;
}

type PersonaSignalSource = "resume" | "title" | "description" | "fallback";

type RankedRoleFamily = {
  family: PersonaRoleFamily;
  score: number;
};

type RoleFamilyConfig = {
  label: string;
  keywords: string[];
  titleKeywords: string[];
  mandatorySourceClasses: string[];
  preferredSourceClasses: string[];
  optionalSourceClasses: string[];
  readingExperienceTemplate: string;
  interviewFramework: string;
  subspecializations: Array<{ label: string; keywords: string[] }>;
};

type RoleFamilyRuntimeProfile = {
  strategyLenses: string[];
  sectionsToExpand: string[];
  sectionsToCompress: string[];
  fiveMinuteBriefPriorities: string[];
  likelyInterviewerTypes: string[];
  dominantStoryRequirements: string[];
  dominantObjections: string[];
  dominantQuestionFamilies: string[];
};

const ROLE_FAMILY_CONFIG: Record<PersonaRoleFamily, RoleFamilyConfig> = {
  product: {
    label: "Product",
    keywords: [
      "product strategy",
      "product sense",
      "roadmap",
      "prioritization",
      "go to market",
      "experimentation",
      "user needs",
      "product requirements",
      "metrics",
      "monetization",
      "growth",
      "platform",
      "consumer product",
      "product manager",
      "group product manager",
      "principal product manager",
    ],
    titleKeywords: ["product manager", "product lead", "group product", "principal product", "pm"],
    mandatorySourceClasses: ["job_description", "product_surfaces", "leadership_strategy"],
    preferredSourceClasses: ["investor_materials", "pricing_packaging", "competitor_positioning"],
    optionalSourceClasses: ["external_validation", "analyst_coverage"],
    readingExperienceTemplate: "strategy_first",
    interviewFramework: "product_strategy_metrics",
    subspecializations: [
      { label: "Platform", keywords: ["platform", "api", "developer platform", "infrastructure product"] },
      { label: "Consumer", keywords: ["consumer", "growth", "activation", "engagement", "retention"] },
      { label: "AI / ML", keywords: ["ai", "machine learning", "model", "llm", "genai"] },
      { label: "Monetization", keywords: ["monetization", "pricing", "packaging", "revenue"] },
      { label: "Enterprise", keywords: ["enterprise", "b2b", "admin", "workflow", "platform controls"] },
    ],
  },
  engineering: {
    label: "Engineering",
    keywords: [
      "software engineer",
      "system design",
      "architecture",
      "distributed systems",
      "backend",
      "frontend",
      "mobile",
      "infrastructure",
      "reliability",
      "security",
      "performance",
      "scalability",
      "api design",
      "developer productivity",
      "sre",
      "site reliability",
    ],
    titleKeywords: ["engineer", "developer", "architect", "sre", "tech lead", "engineering"],
    mandatorySourceClasses: ["job_description", "engineering_docs", "technical_context"],
    preferredSourceClasses: ["engineering_blog", "security_reliability", "oss_signals"],
    optionalSourceClasses: ["external_validation", "developer_community"],
    readingExperienceTemplate: "technical_first",
    interviewFramework: "systems_architecture_reliability",
    subspecializations: [
      { label: "Infrastructure", keywords: ["infra", "kubernetes", "cloud", "platform", "reliability"] },
      { label: "Backend", keywords: ["backend", "services", "microservices", "api", "distributed systems"] },
      { label: "Security", keywords: ["security", "identity", "threat", "compliance"] },
      { label: "Frontend", keywords: ["frontend", "web", "ui", "design systems"] },
      { label: "Mobile", keywords: ["mobile", "ios", "android", "react native"] },
      { label: "ML Platform", keywords: ["ml platform", "model serving", "feature store", "training"] },
    ],
  },
  design: {
    label: "Design",
    keywords: [
      "product design",
      "ux",
      "ui",
      "visual design",
      "interaction design",
      "design systems",
      "user research",
      "portfolio",
      "prototype",
      "craft",
      "experience design",
      "content design",
    ],
    titleKeywords: ["designer", "ux", "ui", "researcher", "design"],
    mandatorySourceClasses: ["job_description", "product_surfaces", "experience_signals"],
    preferredSourceClasses: ["design_system", "research_culture", "brand_experience"],
    optionalSourceClasses: ["external_validation", "portfolio_expectations"],
    readingExperienceTemplate: "experience_first",
    interviewFramework: "craft_critique_influence",
    subspecializations: [
      { label: "Product Design", keywords: ["product design", "interaction", "ux"] },
      { label: "Design Systems", keywords: ["design systems", "component library", "tokens"] },
      { label: "UX Research", keywords: ["user research", "qualitative", "quantitative", "research synthesis"] },
      { label: "Content Design", keywords: ["content design", "ux writing", "content strategy"] },
    ],
  },
  data_ml: {
    label: "Data / ML",
    keywords: [
      "machine learning",
      "machine learning engineer",
      "data science",
      "analytics",
      "applied scientist",
      "experimentation",
      "experimentation infrastructure",
      "causal inference",
      "statistics",
      "modeling",
      "model quality",
      "model serving",
      "prediction",
      "measurement",
      "production ml",
      "ml systems",
      "training infrastructure",
      "feature store",
      "sql",
      "economics",
      "a b testing",
      "recommendation",
    ],
    titleKeywords: ["data scientist", "ml engineer", "machine learning engineer", "applied scientist", "analytics", "economist"],
    mandatorySourceClasses: ["job_description", "data_ml_context", "measurement_signals"],
    preferredSourceClasses: ["ai_launches", "experimentation_materials", "platform_docs"],
    optionalSourceClasses: ["external_validation", "research_outputs"],
    readingExperienceTemplate: "analysis_first",
    interviewFramework: "modeling_experimentation_productionization",
    subspecializations: [
      { label: "Applied Scientist", keywords: ["applied scientist", "research scientist", "modeling"] },
      { label: "ML Engineer", keywords: ["ml engineer", "model serving", "training", "feature engineering"] },
      { label: "Data Scientist", keywords: ["data scientist", "analytics", "insights", "ab testing"] },
      { label: "Economics", keywords: ["economics", "econometric", "pricing science"] },
    ],
  },
  marketing: {
    label: "Marketing",
    keywords: [
      "product marketing",
      "positioning",
      "messaging",
      "segmentation",
      "launch",
      "go to market",
      "pricing",
      "packaging",
      "lifecycle",
      "brand",
      "developer marketing",
      "demand generation",
    ],
    titleKeywords: ["marketing", "pmm", "product marketing", "brand", "growth marketing"],
    mandatorySourceClasses: ["job_description", "messaging_signals", "launch_motion"],
    preferredSourceClasses: ["pricing_packaging", "customer_evidence", "analyst_narratives"],
    optionalSourceClasses: ["external_validation", "brand_assets"],
    readingExperienceTemplate: "gtm_first",
    interviewFramework: "segmentation_messaging_launch",
    subspecializations: [
      { label: "Product Marketing", keywords: ["product marketing", "positioning", "messaging", "launch"] },
      { label: "Growth Marketing", keywords: ["growth marketing", "lifecycle", "acquisition", "retention"] },
      { label: "Brand", keywords: ["brand", "creative", "campaign"] },
      { label: "Developer Marketing", keywords: ["developer marketing", "developer relations", "community"] },
    ],
  },
  sales_gtm: {
    label: "Sales / GTM",
    keywords: [
      "sales",
      "account executive",
      "account management",
      "quota",
      "pipeline",
      "territory",
      "forecast",
      "partnerships",
      "channel",
      "customer success",
      "solutions",
      "deal cycle",
      "revenue",
      "gtm",
    ],
    titleKeywords: ["sales", "account executive", "partnerships", "business development", "gtm"],
    mandatorySourceClasses: ["job_description", "revenue_motion", "customer_segments"],
    preferredSourceClasses: ["partner_ecosystem", "enablement_signals", "pricing_exposure"],
    optionalSourceClasses: ["external_validation", "buyer_journey"],
    readingExperienceTemplate: "revenue_first",
    interviewFramework: "revenue_customer_objections",
    subspecializations: [
      { label: "Enterprise", keywords: ["enterprise", "strategic accounts", "large customers"] },
      { label: "Mid-Market", keywords: ["mid market", "mid-market"] },
      { label: "Partnerships", keywords: ["partnerships", "alliances", "ecosystem", "channel"] },
      { label: "Solutions", keywords: ["solutions", "pre-sales", "sales engineering"] },
    ],
  },
  operations_program: {
    label: "Operations / Program",
    keywords: [
      "program management",
      "technical program manager",
      "tpm",
      "operations",
      "business operations",
      "bizops",
      "governance",
      "process improvement",
      "cadence",
      "enablement",
      "transformation",
      "dependencies",
      "risk management",
    ],
    titleKeywords: ["program manager", "technical program manager", "operations", "bizops", "business operations"],
    mandatorySourceClasses: ["job_description", "operating_model", "governance_signals"],
    preferredSourceClasses: ["transformation_context", "dependency_map", "execution_cadence"],
    optionalSourceClasses: ["external_validation", "process_maturity"],
    readingExperienceTemplate: "operating_model_first",
    interviewFramework: "governance_dependencies_execution",
    subspecializations: [
      { label: "TPM", keywords: ["technical program manager", "tpm"] },
      { label: "Business Operations", keywords: ["business operations", "bizops", "operational planning"] },
      { label: "Program Management", keywords: ["program management", "portfolio governance"] },
      { label: "Enablement", keywords: ["enablement", "rollout", "readiness"] },
    ],
  },
  executive: {
    label: "Executive",
    keywords: [
      "general manager",
      "gm",
      "chief",
      "c level",
      "vice president",
      "vp",
      "svp",
      "head of",
      "p and l",
      "p&l",
      "board",
      "portfolio",
      "org design",
      "business unit",
      "executive leadership",
    ],
    titleKeywords: ["chief", "ceo", "cto", "cpo", "coo", "vp", "svp", "head of", "general manager", "gm"],
    mandatorySourceClasses: ["job_description", "investor_materials", "leadership_commentary"],
    preferredSourceClasses: ["org_design_signals", "portfolio_strategy", "capital_allocation"],
    optionalSourceClasses: ["external_validation", "board_language"],
    readingExperienceTemplate: "mandate_first",
    interviewFramework: "business_org_portfolio",
    subspecializations: [
      { label: "GM", keywords: ["general manager", "gm", "business unit"] },
      { label: "VP Product", keywords: ["vp product", "head of product", "cpo"] },
      { label: "VP Engineering", keywords: ["vp engineering", "head of engineering", "cto"] },
      { label: "COO", keywords: ["coo", "operations executive"] },
    ],
  },
};

const FAMILY_ORDER: PersonaRoleFamily[] = [
  "executive",
  "engineering",
  "product",
  "design",
  "data_ml",
  "marketing",
  "sales_gtm",
  "operations_program",
];

const BLENDABLE_PAIRS = new Set([
  "product:design",
  "design:product",
  "product:sales_gtm",
  "sales_gtm:product",
  "product:marketing",
  "marketing:product",
  "product:data_ml",
  "data_ml:product",
  "engineering:data_ml",
  "data_ml:engineering",
  "marketing:sales_gtm",
  "sales_gtm:marketing",
  "operations_program:product",
  "product:operations_program",
  "executive:product",
  "product:executive",
  "executive:sales_gtm",
  "sales_gtm:executive",
]);

const SENIORITY_LABELS: Record<PersonaSeniority, string> = {
  ic_junior_mid: "IC Junior / Mid",
  senior_ic: "Senior IC",
  staff_principal_architect: "Staff / Principal / Architect",
  manager: "Manager",
  senior_manager_group_manager: "Senior Manager / Group Manager",
  director: "Director",
  senior_director_vp: "Senior Director / VP",
  executive_gm_c_level: "Executive / GM / C-Level",
};

const ROLE_FAMILY_RUNTIME_PROFILES: Record<PersonaRoleFamily, RoleFamilyRuntimeProfile> = {
  product: {
    strategyLenses: ["user value", "prioritization", "monetization", "leverage"],
    sectionsToExpand: ["company_role_strategy", "why_role_exists_now", "how_to_win_this_process"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["why now", "leverage", "metrics", "positioning"],
    likelyInterviewerTypes: ["hiring manager", "product leader", "engineering partner", "design partner"],
    dominantStoryRequirements: ["ambiguous product problem", "tradeoff judgment", "influence without authority"],
    dominantObjections: ["too tactical", "feature-centric", "weak strategic range"],
    dominantQuestionFamilies: ["prioritization", "strategy", "metrics", "stakeholder conflict"],
  },
  engineering: {
    strategyLenses: ["architecture", "reliability", "technical leverage", "delivery risk"],
    sectionsToExpand: ["company_role_strategy", "interview_prep", "why_role_exists_now"],
    sectionsToCompress: ["candidate_fit"],
    fiveMinuteBriefPriorities: ["architecture stakes", "technical mandate", "reliability risk", "proof expectations"],
    likelyInterviewerTypes: ["engineering manager", "tech lead", "architect", "peer engineer"],
    dominantStoryRequirements: ["system design", "scaling", "incident response", "technical leadership"],
    dominantObjections: ["too theoretical", "weak production realism", "limited leadership leverage"],
    dominantQuestionFamilies: ["system design", "architecture", "reliability", "tradeoffs"],
  },
  design: {
    strategyLenses: ["experience quality", "craft", "systems coherence", "influence"],
    sectionsToExpand: ["company_role_strategy", "interview_prep", "candidate_fit"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["experience mandate", "influence model", "critique themes", "collaboration"],
    likelyInterviewerTypes: ["design manager", "product partner", "engineering partner", "design peer"],
    dominantStoryRequirements: ["end-to-end design ownership", "critique evolution", "user insight application"],
    dominantObjections: ["strong craft but weak strategy", "polished portfolio but thin impact"],
    dominantQuestionFamilies: ["portfolio review", "critique", "design systems", "stakeholder conflict"],
  },
  data_ml: {
    strategyLenses: ["measurement quality", "experimentation", "model behavior", "productionization"],
    sectionsToExpand: ["company_role_strategy", "interview_prep", "why_role_exists_now"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["decision quality", "experimentation stakes", "model or analytics proof"],
    likelyInterviewerTypes: ["manager", "peer scientist", "product partner", "analytics lead"],
    dominantStoryRequirements: ["experiment design", "model deployment", "decision support", "data quality recovery"],
    dominantObjections: ["too academic", "weak productionization", "weak business interpretation"],
    dominantQuestionFamilies: ["experimentation", "causal inference", "measurement", "model tradeoffs"],
  },
  marketing: {
    strategyLenses: ["positioning", "segmentation", "launch mechanics", "adoption"],
    sectionsToExpand: ["company_role_strategy", "why_role_exists_now", "interview_prep"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["market context", "message-market fit", "launch stakes", "differentiation"],
    likelyInterviewerTypes: ["PMM leader", "product leader", "sales partner", "executive stakeholder"],
    dominantStoryRequirements: ["positioning reset", "launch leadership", "cross-functional GTM execution"],
    dominantObjections: ["too execution-heavy", "weak strategic range", "shallow product understanding"],
    dominantQuestionFamilies: ["positioning", "segmentation", "launch planning", "pricing"],
  },
  sales_gtm: {
    strategyLenses: ["revenue motion", "buyer journey", "partner leverage", "commercial execution"],
    sectionsToExpand: ["company_role_strategy", "interview_prep", "how_to_win_this_process"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["buyer problem", "revenue motion", "objections", "win narrative"],
    likelyInterviewerTypes: ["sales leader", "peer seller", "partnerships leader", "executive"],
    dominantStoryRequirements: ["deal navigation", "pipeline creation", "partnership leverage"],
    dominantObjections: ["too relationship-led", "weak strategic account thinking", "weak ecosystem logic"],
    dominantQuestionFamilies: ["territory strategy", "objection handling", "partnership scenarios", "pipeline recovery"],
  },
  operations_program: {
    strategyLenses: ["governance", "dependency management", "execution systems", "operating cadence"],
    sectionsToExpand: ["company_role_strategy", "why_role_exists_now", "interview_prep"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["execution stakes", "governance gaps", "cross-functional risk", "decision rights"],
    likelyInterviewerTypes: ["program leader", "operations leader", "functional stakeholder", "executive sponsor"],
    dominantStoryRequirements: ["cross-functional delivery", "transformation", "risk containment"],
    dominantObjections: ["process-heavy but not outcomes-driven", "weak influence under conflict"],
    dominantQuestionFamilies: ["dependency failure", "governance design", "transformation sequencing", "escalation"],
  },
  executive: {
    strategyLenses: ["business model", "portfolio", "org design", "leadership leverage"],
    sectionsToExpand: ["company_role_strategy", "why_role_exists_now", "how_to_win_this_process"],
    sectionsToCompress: ["operations_and_cost"],
    fiveMinuteBriefPriorities: ["business context", "mandate", "power map", "principal risks"],
    likelyInterviewerTypes: ["CEO", "executive peer", "finance", "board-adjacent stakeholder"],
    dominantStoryRequirements: ["business transformation", "org redesign", "portfolio prioritization"],
    dominantObjections: ["too functional", "not broad enough", "weak enterprise leadership narrative"],
    dominantQuestionFamilies: ["mandate diagnosis", "org design", "portfolio tradeoffs", "resourcing"],
  },
};

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value)).filter((value, index, list) => list.indexOf(value) === index);
}

function takeSecondarySourceClasses(primaryClasses: string[], secondaryClasses: string[], maxAdditional: number): string[] {
  return secondaryClasses.filter((sourceClass) => sourceClass !== "job_description" && !primaryClasses.includes(sourceClass)).slice(0, maxAdditional);
}

function getBlendKey(primaryFamily: PersonaRoleFamily, secondaryFamily: PersonaRoleFamily | null): string | null {
  return secondaryFamily ? `${primaryFamily}:${secondaryFamily}` : null;
}

type RoleFamilyInferenceResult = {
  primaryFamily: PersonaRoleFamily;
  secondaryFamily: PersonaRoleFamily | null;
  isBlendedPersona: boolean;
  confidence: PersonaConfidence;
  personaEvidence: string[];
  suppressedSecondaryPersonaReason: string | null;
  blendedModeJustification: string | null;
  primaryWeight: number;
  secondaryWeight: number;
};

function rankingToMap(ranked: RankedRoleFamily[]): Map<PersonaRoleFamily, number> {
  return new Map(ranked.map((entry) => [entry.family, entry.score]));
}

function combineRoleFamilyRankings(title: string, jobDescription: string): RankedRoleFamily[] {
  const titleMap = rankingToMap(rankRoleFamilies(title, "title"));
  const descriptionMap = rankingToMap(rankRoleFamilies(jobDescription, "description"));

  return FAMILY_ORDER
    .map((family) => ({
      family,
      score: (titleMap.get(family) ?? 0) * 2 + (descriptionMap.get(family) ?? 0) * 3,
    }))
    .sort((left, right) => right.score - left.score || FAMILY_ORDER.indexOf(left.family) - FAMILY_ORDER.indexOf(right.family));
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9+/#&\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function hasPhrase(text: string, phrase: string): boolean {
  const escaped = phrase
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

  if (!escaped) {
    return false;
  }

  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function countMatches(text: string, phrases: string[]): number {
  return phrases.reduce((count, phrase) => count + (hasPhrase(text, phrase) ? 1 : 0), 0);
}

function detectPeopleManagement(title: string, jobDescription: string): boolean {
  const explicitManagementPhrases = [
    "manage a team",
    "manage the team",
    "people manager",
    "people management",
    "direct reports",
    "performance reviews",
    "hire and develop",
    "hiring and coaching",
    "coach and mentor",
    "build and lead a team",
    "manager of managers",
    "team leadership",
    "lead a team of",
  ];

  const familyManagerTitle = /\b(engineering manager|design manager|sales manager|marketing manager|business operations manager|program manager|technical program manager)\b/.test(title);
  const productStyleManagerTitle = /\b(product manager|program manager|marketing manager)\b/.test(title);
  const explicitPeopleSignals = countMatches(jobDescription, explicitManagementPhrases) > 0;

  if (explicitPeopleSignals) {
    return true;
  }

  if (familyManagerTitle && !productStyleManagerTitle) {
    return true;
  }

  return false;
}

function detectExecutiveSignals(text: string): boolean {
  return /\b(board|p&l|p and l|org design|portfolio|capital allocation|business unit|general manager|chief|c-suite|executive leadership)\b/.test(text);
}

function hasExplicitExecutiveTitle(title: string): boolean {
  return /\b(chief|ceo|cto|cpo|coo|general manager|gm|vp|svp|vice president|head of|senior director)\b/.test(title);
}

function hasExplicitExecutiveScope(text: string): boolean {
  return /\b(p&l|p and l|business unit|capital allocation|org design|portfolio|board|headcount planning|manager of managers|multiple teams|executive leadership)\b/.test(text);
}

function hasDirectBusinessOwnershipSignals(text: string): boolean {
  return /\b(p&l|p and l|business unit|capital allocation|board|general manager|gm|chief|c-suite)\b/.test(text);
}

function hasAnchoredProductManagerTitle(title: string): boolean {
  return /\b(lead product manager|senior product manager|sr product manager|group product manager|principal product manager|product manager)\b/.test(title);
}

function shouldSuppressExecutiveFamily(title: string, jobDescription: string): boolean {
  return !hasExplicitExecutiveTitle(title) && !hasExplicitExecutiveScope(jobDescription);
}

function rankRoleFamilies(text: string, source: PersonaSignalSource): RankedRoleFamily[] {
  const scores = new Map<PersonaRoleFamily, number>();
  const weights = source === "resume"
    ? { title: 3, keyword: 3 }
    : source === "title"
    ? { title: 5, keyword: 1 }
    : source === "description"
    ? { title: 1, keyword: 3 }
    : { title: 4, keyword: 2 };

  for (const family of FAMILY_ORDER) {
    const config = ROLE_FAMILY_CONFIG[family];
    const titleHits = countMatches(text, config.titleKeywords);
    const keywordHits = countMatches(text, config.keywords);
    scores.set(family, titleHits * weights.title + keywordHits * weights.keyword);
  }

  if (detectExecutiveSignals(text)) {
    scores.set("executive", (scores.get("executive") ?? 0) + 5);
  }

  return FAMILY_ORDER
    .map((family) => ({ family, score: scores.get(family) ?? 0 }))
    .sort((left, right) => right.score - left.score || FAMILY_ORDER.indexOf(left.family) - FAMILY_ORDER.indexOf(right.family));
}

function isAmbiguousRoleFamilyRanking(ranked: RankedRoleFamily[], source: PersonaSignalSource): boolean {
  const [top, runnerUp] = ranked;
  if (!top || top.score <= 0) {
    return true;
  }

  if (!runnerUp) {
    return false;
  }

  const requiredDelta = source === "title" ? 3 : 2;
  const minimumTopScore = source === "title" ? 5 : 4;
  return top.score < minimumTopScore || top.score - runnerUp.score < requiredDelta;
}

function inferRoleFamily(
  title: string,
  jobDescription: string,
  _profileContext: string
): RoleFamilyInferenceResult {
  const titleRanked = rankRoleFamilies(title, "title");
  const descriptionRanked = rankRoleFamilies(jobDescription, "description");
  const combinedRanked = combineRoleFamilyRankings(title, jobDescription);
  const titleHasSignal = (titleRanked[0]?.score ?? 0) > 0;
  const descriptionHasSignal = (descriptionRanked[0]?.score ?? 0) > 0;
  let top = combinedRanked[0] ?? { family: "product" as PersonaRoleFamily, score: 0 };
  let runnerUp = combinedRanked[1] ?? { family: "product" as PersonaRoleFamily, score: 0 };

  if (
    titleHasSignal
    && titleRanked[0]
    && titleRanked[0].family !== top.family
    && BLENDABLE_PAIRS.has(`${titleRanked[0].family}:${top.family}`)
  ) {
    const titleAnchoredTop = combinedRanked.find((entry) => entry.family === titleRanked[0].family);
    if (titleAnchoredTop) {
      runnerUp = top;
      top = titleAnchoredTop;
    }
  }

  const combinedScoreMap = rankingToMap(combinedRanked);
  const productScore = combinedScoreMap.get("product") ?? 0;
  if (top.family === "executive" && shouldSuppressExecutiveFamily(title, jobDescription)) {
    const fallback = combinedRanked.find((entry) => entry.family !== "executive" && entry.score > 0);
    if (fallback) {
      runnerUp = combinedRanked.find((entry) => entry.family !== fallback.family) ?? runnerUp;
      top = fallback;
    }
  }

  if (hasAnchoredProductManagerTitle(title) && shouldSuppressExecutiveFamily(title, jobDescription) && productScore >= 8) {
    const productEntry = combinedRanked.find((entry) => entry.family === "product");
    if (productEntry) {
      runnerUp = top.family === "product"
        ? (combinedRanked.find((entry) => entry.family !== "product") ?? runnerUp)
        : top;
      top = productEntry;
    }
  }

  const scoreDelta = top.score - runnerUp.score;
  const blendKey = getBlendKey(top.family, runnerUp.family);
  const isBlendedPersona = Boolean(
    blendKey
    && BLENDABLE_PAIRS.has(blendKey)
    && top.score >= 12
    && runnerUp.score >= 10
    && scoreDelta <= 4
  );
  const confidence: PersonaConfidence = top.score >= 16 && scoreDelta >= 5 ? "high" : top.score >= 9 ? "medium" : "low";

  const personaEvidence: string[] = [];
  if (titleHasSignal && !isAmbiguousRoleFamilyRanking(titleRanked, "title")) {
    personaEvidence.push(`Role title points most strongly to ${ROLE_FAMILY_CONFIG[top.family].label}.`);
  } else if (titleHasSignal) {
    personaEvidence.push("Role title is ambiguous, so responsibility language in the JD carries more weight.");
  } else {
    personaEvidence.push("Role title is weak on persona signal, so the JD drives classification.");
  }

  if (descriptionHasSignal) {
    personaEvidence.push(`JD responsibilities align most strongly with ${ROLE_FAMILY_CONFIG[top.family].label}.`);
  } else {
    personaEvidence.push("JD signals are weak, so persona confidence is reduced.");
  }

  if (top.family !== "executive" && shouldSuppressExecutiveFamily(title, jobDescription) && (combinedScoreMap.get("executive") ?? 0) > 0) {
    personaEvidence.push("Executive-flavored language was treated as scope context, not enough on its own to classify the role as executive.");
  }

  if (top.family === "product" && hasAnchoredProductManagerTitle(title) && shouldSuppressExecutiveFamily(title, jobDescription)) {
    personaEvidence.push("Anchored product-manager title signals kept this role in Product because explicit business-unit or P&L ownership was not evidenced.");
  }

  let suppressedSecondaryPersonaReason: string | null = null;
  let blendedModeJustification: string | null = null;
  let secondaryFamily: PersonaRoleFamily | null = null;
  let primaryWeight = 1;
  let secondaryWeight = 0;

  if (isBlendedPersona) {
    secondaryFamily = runnerUp.family;
    primaryWeight = scoreDelta <= 2 ? 0.6 : 0.7;
    secondaryWeight = 1 - primaryWeight;
    blendedModeJustification = `Blended ${ROLE_FAMILY_CONFIG[top.family].label} + ${ROLE_FAMILY_CONFIG[runnerUp.family].label} mode is justified because both families have first-order mandate signals in the title and JD.`;
    personaEvidence.push(`The JD also contains materially distinct ${ROLE_FAMILY_CONFIG[runnerUp.family].label.toLowerCase()} responsibilities, so blended mode is activated.`);
  } else if (runnerUp.score >= 8) {
    suppressedSecondaryPersonaReason = BLENDABLE_PAIRS.has(blendKey ?? "")
      ? `${ROLE_FAMILY_CONFIG[runnerUp.family].label} signals were detected, but ${ROLE_FAMILY_CONFIG[top.family].label} is clearly dominant so the secondary persona was suppressed.`
      : `${ROLE_FAMILY_CONFIG[runnerUp.family].label} signals were detected, but that pairing is treated as a likely false positive for this role so the secondary persona was suppressed.`;
    personaEvidence.push(suppressedSecondaryPersonaReason);
  }

  if (!titleHasSignal && descriptionHasSignal) {
    personaEvidence.push("Persona inference used title plus JD, with the JD resolving the ambiguous title.");
  }

  return {
    primaryFamily: top.family,
    secondaryFamily,
    isBlendedPersona,
    confidence,
    personaEvidence,
    suppressedSecondaryPersonaReason,
    blendedModeJustification,
    primaryWeight,
    secondaryWeight,
  };
}

function inferSeniority(title: string, jobDescription: string, roleFamily: PersonaRoleFamily): { seniority: PersonaSeniority; label: string; signals: string[] } {
  const combined = `${title} ${jobDescription}`;
  const peopleManagement = detectPeopleManagement(title, jobDescription);
  const signals: string[] = [];

  if (/\b(chief|ceo|cto|coo|general manager|gm)\b/.test(title) || hasDirectBusinessOwnershipSignals(combined)) {
    signals.push("Executive business-ownership signals detected.");
    return { seniority: "executive_gm_c_level", label: SENIORITY_LABELS.executive_gm_c_level, signals };
  }

  if (/\b(svp|vp|vice president|senior director|head of)\b/.test(title)) {
    signals.push("VP, senior-director, or head-of title marker detected.");
    return { seniority: "senior_director_vp", label: SENIORITY_LABELS.senior_director_vp, signals };
  }

  if (/\bdirector\b/.test(title)) {
    signals.push("Director title marker detected.");
    return { seniority: "director", label: SENIORITY_LABELS.director, signals };
  }

  if (/\b(group manager|senior manager)\b/.test(title) || (/\bmanager\b/.test(title) && /manager of managers|multiple teams|org-wide delivery/.test(combined))) {
    signals.push("Senior-manager or manager-of-managers signals detected.");
    return { seniority: "senior_manager_group_manager", label: SENIORITY_LABELS.senior_manager_group_manager, signals };
  }

  if (/\b(staff|principal|architect)\b/.test(title)) {
    signals.push("Staff, principal, or architect title marker detected.");
    return { seniority: "staff_principal_architect", label: SENIORITY_LABELS.staff_principal_architect, signals };
  }

  if (peopleManagement) {
    signals.push("People-management signals detected in the JD.");
    return { seniority: "manager", label: SENIORITY_LABELS.manager, signals };
  }

  const familyManagerTitle = /\b(product manager|program manager|marketing manager|partnerships manager|operations manager|data science manager)\b/.test(title);
  if (/\bmanager\b/.test(title) && !familyManagerTitle && roleFamily !== "product") {
    signals.push("Manager title marker detected.");
    return { seniority: "manager", label: SENIORITY_LABELS.manager, signals };
  }

  if (/\b(senior|lead|sr\.)\b/.test(title) || /\bindependent judgment|cross-functional influence|own ambiguous problems\b/.test(combined)) {
    signals.push("Senior IC signals detected.");
    return { seniority: "senior_ic", label: SENIORITY_LABELS.senior_ic, signals };
  }

  signals.push("Defaulting to IC junior/mid because management and staff-plus signals are weak.");
  return { seniority: "ic_junior_mid", label: SENIORITY_LABELS.ic_junior_mid, signals };
}

function inferSubspecialization(roleFamily: PersonaRoleFamily, combinedText: string): string | null {
  const config = ROLE_FAMILY_CONFIG[roleFamily];
  for (const subspecialization of config.subspecializations) {
    if (countMatches(combinedText, subspecialization.keywords) > 0) {
      return subspecialization.label;
    }
  }

  return null;
}

export function inferPremiumPersona(roleTitle: string, jobDescription?: string, profileContext?: string): PremiumPersonaProfile {
  const normalizedTitle = normalizeText(roleTitle);
  const normalizedJobDescription = normalizeText(jobDescription);
  const normalizedProfileContext = normalizeText(profileContext);
  const familyResult = inferRoleFamily(normalizedTitle, normalizedJobDescription, normalizedProfileContext);
  const config = ROLE_FAMILY_CONFIG[familyResult.primaryFamily];
  const secondaryConfig = familyResult.secondaryFamily ? ROLE_FAMILY_CONFIG[familyResult.secondaryFamily] : null;
  const runtimeProfile = ROLE_FAMILY_RUNTIME_PROFILES[familyResult.primaryFamily];
  const secondaryRuntimeProfile = familyResult.secondaryFamily ? ROLE_FAMILY_RUNTIME_PROFILES[familyResult.secondaryFamily] : null;
  const seniorityResult = inferSeniority(normalizedTitle, normalizedJobDescription, familyResult.primaryFamily);
  const subspecialization = inferSubspecialization(
    familyResult.primaryFamily,
    `${normalizedTitle} ${normalizedJobDescription} ${normalizedProfileContext}`.trim()
  );

  const retrievalProfile: PremiumPersonaRetrievalProfile = {
    mandatorySourceClasses: uniqueStrings([
      ...config.mandatorySourceClasses,
      ...(familyResult.isBlendedPersona && secondaryConfig
        ? takeSecondarySourceClasses(config.mandatorySourceClasses, secondaryConfig.mandatorySourceClasses, 2)
        : []),
    ]),
    preferredSourceClasses: uniqueStrings([
      ...config.preferredSourceClasses,
      ...(familyResult.isBlendedPersona && secondaryConfig
        ? takeSecondarySourceClasses(config.preferredSourceClasses, secondaryConfig.preferredSourceClasses, 1)
        : []),
    ]),
    optionalSourceClasses: uniqueStrings(config.optionalSourceClasses),
    secondaryBranchActivated: familyResult.isBlendedPersona,
    secondaryBranchReason: familyResult.isBlendedPersona
      ? familyResult.blendedModeJustification
      : familyResult.suppressedSecondaryPersonaReason,
  };

  const readingExperienceProfile: PremiumPersonaReadingExperienceProfile = {
    sectionOrderingBasis: familyResult.isBlendedPersona && secondaryConfig
      ? `${config.label} primary spine with ${secondaryConfig.label} emphasis overlay`
      : `${config.label} primary spine`,
    sectionsToExpand: uniqueStrings([
      ...runtimeProfile.sectionsToExpand,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.sectionsToExpand.slice(0, 2) : []),
    ]),
    sectionsToCompress: uniqueStrings([
      ...runtimeProfile.sectionsToCompress,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.sectionsToCompress.slice(0, 1) : []),
    ]),
    fiveMinuteBriefPriorities: uniqueStrings([
      ...runtimeProfile.fiveMinuteBriefPriorities,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.fiveMinuteBriefPriorities.slice(0, 2) : []),
    ]),
  };

  const strategyProfile: PremiumPersonaStrategyProfile = {
    dominantLenses: uniqueStrings([
      ...runtimeProfile.strategyLenses,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.strategyLenses.slice(0, 2) : []),
    ]),
    sectionsToExpand: readingExperienceProfile.sectionsToExpand,
    sectionsToCompress: readingExperienceProfile.sectionsToCompress,
  };

  const interviewProfile: PremiumPersonaInterviewProfile = {
    likelyInterviewerTypes: uniqueStrings([
      ...runtimeProfile.likelyInterviewerTypes,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.likelyInterviewerTypes.slice(0, 2) : []),
    ]),
    dominantStoryRequirements: uniqueStrings([
      ...runtimeProfile.dominantStoryRequirements,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.dominantStoryRequirements.slice(0, 2) : []),
    ]),
    dominantObjections: uniqueStrings([
      ...runtimeProfile.dominantObjections,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.dominantObjections.slice(0, 2) : []),
    ]),
    dominantQuestionFamilies: uniqueStrings([
      ...runtimeProfile.dominantQuestionFamilies,
      ...(familyResult.isBlendedPersona && secondaryRuntimeProfile ? secondaryRuntimeProfile.dominantQuestionFamilies.slice(0, 2) : []),
    ]),
  };

  const personaEvidence = uniqueStrings([
    ...familyResult.personaEvidence,
    ...seniorityResult.signals,
  ]);
  const reasoningSummary = uniqueStrings([
    `Primary persona: ${config.label}`,
    familyResult.secondaryFamily ? `Secondary persona: ${secondaryConfig?.label ?? "Unknown"}` : null,
    `Seniority: ${seniorityResult.label}`,
    familyResult.isBlendedPersona ? `Weights: ${familyResult.primaryWeight.toFixed(2)} / ${familyResult.secondaryWeight.toFixed(2)}` : null,
    familyResult.blendedModeJustification,
    familyResult.suppressedSecondaryPersonaReason,
  ]).join(" | ");

  return {
    primaryRoleFamily: familyResult.primaryFamily,
    primaryRoleFamilyLabel: config.label,
    secondaryRoleFamily: familyResult.secondaryFamily,
    secondaryRoleFamilyLabel: secondaryConfig?.label ?? null,
    isBlendedPersona: familyResult.isBlendedPersona,
    roleFamily: familyResult.primaryFamily,
    roleFamilyLabel: config.label,
    seniority: seniorityResult.seniority,
    seniorityLabel: seniorityResult.label,
    subspecialization,
    confidence: familyResult.confidence,
    primaryWeight: familyResult.primaryWeight,
    secondaryWeight: familyResult.secondaryWeight,
    personaEvidence,
    personaReasoningTraceSummary: reasoningSummary,
    blendedModeJustification: familyResult.blendedModeJustification,
    suppressedSecondaryPersonaReason: familyResult.suppressedSecondaryPersonaReason,
    mixedRole: familyResult.isBlendedPersona,
    blend: familyResult.isBlendedPersona && familyResult.secondaryFamily
      ? [familyResult.primaryFamily, familyResult.secondaryFamily]
      : [familyResult.primaryFamily],
    signals: personaEvidence,
    readingExperienceTemplate: config.readingExperienceTemplate,
    readingExperienceProfile,
    interviewFramework: config.interviewFramework,
    retrievalProfile,
    strategyProfile,
    interviewProfile,
    mandatorySourceClasses: retrievalProfile.mandatorySourceClasses,
    preferredSourceClasses: retrievalProfile.preferredSourceClasses,
    optionalSourceClasses: retrievalProfile.optionalSourceClasses,
  };
}

export function buildPersonaAwareRetrievalQueries(
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  persona: PremiumPersonaProfile
): string[] {
  const jdHint = jobDescription?.trim() ? ` ${jobDescription.slice(0, 240)}` : "";
  const roleFamilyLabel = persona.primaryRoleFamilyLabel.toLowerCase();
  const secondaryLabel = persona.secondaryRoleFamilyLabel?.toLowerCase();
  const baseQueries = [
    `${companyName} strategy business model leadership priorities ${roleFamilyLabel} role ${roleTitle}${jdHint}`,
    `${companyName} ${roleTitle} mandate scope stakeholders success metrics hiring needs${jdHint}`,
    `${companyName} ${persona.seniorityLabel.toLowerCase()} expectations org structure leadership style decision making`,
    `${companyName} recent launches product changes partnerships acquisitions quarterly results why now ${roleTitle}`,
    `${companyName} mission vision values culture operating principles leadership principles ${roleTitle}`,
    `${companyName} investor relations earnings shareholder letter annual report strategic priorities moat competition ${roleTitle}`,
  ];

  const familySpecificQuery = (() => {
    const blendKey = getBlendKey(persona.primaryRoleFamily, persona.secondaryRoleFamily);
    if (blendKey === "product:sales_gtm" || blendKey === "product:marketing") {
      return `${companyName} product strategy monetization segmentation adoption go to market stakeholder alignment ${roleTitle}`;
    }
    if (blendKey === "engineering:data_ml") {
      return `${companyName} architecture model quality experimentation productionization infrastructure maturity ${roleTitle}`;
    }
    if (blendKey === "product:data_ml") {
      return `${companyName} product strategy experimentation measurement model behavior decision quality ${roleTitle}`;
    }
    if (blendKey === "executive:product") {
      return `${companyName} business model portfolio strategy org design product mandate stakeholder power ${roleTitle}`;
    }

    switch (persona.primaryRoleFamily) {
      case "engineering":
        return `${companyName} architecture engineering blog reliability security platform scale developer docs ${roleTitle}`;
      case "design":
        return `${companyName} product experience design systems ux research portfolio expectations ${roleTitle}`;
      case "data_ml":
        return `${companyName} ai launches experimentation data strategy model quality measurement ${roleTitle}`;
      case "marketing":
        return `${companyName} positioning messaging segmentation launches pricing packaging ${roleTitle}`;
      case "sales_gtm":
        return `${companyName} revenue motion customer segments pipeline partnerships channel strategy ${roleTitle}`;
      case "operations_program":
        return `${companyName} operating model governance program execution transformation dependencies ${roleTitle}`;
      case "executive":
        return `${companyName} investor relations portfolio strategy org design business model p&l leadership commentary ${roleTitle}`;
      case "product":
      default:
        return `${companyName} product surfaces monetization strategy roadmap experimentation metrics ${roleTitle}`;
    }
  })();

  const competitorQuery = (() => {
    const blendKey = getBlendKey(persona.primaryRoleFamily, persona.secondaryRoleFamily);
    if (blendKey === "product:sales_gtm" || blendKey === "product:marketing") {
      return `${companyName} competitors monetization positioning segmentation adoption channel narrative`;
    }
    if (blendKey === "engineering:data_ml") {
      return `${companyName} competitors ai capabilities platform architecture model quality infrastructure differentiation`;
    }
    if (blendKey === "executive:product") {
      return `${companyName} competitors investor narrative portfolio strategy org design product bets moat tradeoffs`;
    }

    switch (persona.primaryRoleFamily) {
      case "engineering":
        return `${companyName} competitors platform architecture developer ecosystem reliability differentiation`;
      case "design":
        return `${companyName} competitors product experience user workflow design differentiation`;
      case "data_ml":
        return `${companyName} competitors ai capabilities data strategy experimentation differentiation`;
      case "marketing":
        return `${companyName} competitors positioning messaging pricing packaging market narrative`;
      case "sales_gtm":
        return `${companyName} competitors sales motion customer segments partner ecosystem`;
      case "operations_program":
        return `${companyName} operating complexity transformation execution model governance risks`;
      case "executive":
        return `${companyName} competitors investor narrative portfolio strategy org design moat tradeoffs`;
      case "product":
      default:
        return `${companyName} competitors product strategy monetization market position tradeoffs`;
    }
  })();

  const blendedQuery = persona.isBlendedPersona && secondaryLabel
    ? `${companyName} ${roleTitle} blended ${roleFamilyLabel} ${secondaryLabel} mandate success metrics interview expectations`
    : null;

  return [...baseQueries, familySpecificQuery, competitorQuery, blendedQuery].filter(Boolean).slice(0, 8) as string[];
}

export function formatPersonaForPrompt(persona: PremiumPersonaProfile): string {
  const blend = persona.isBlendedPersona
    ? `\n- blended persona: ${persona.primaryRoleFamilyLabel} + ${persona.secondaryRoleFamilyLabel}\n- blend weights: ${persona.primaryWeight.toFixed(2)} / ${persona.secondaryWeight.toFixed(2)}`
    : "";
  const subspecialization = persona.subspecialization ? `\n- inferred sub-specialization: ${persona.subspecialization}` : "";
  const suppressedSecondary = persona.suppressedSecondaryPersonaReason ? `\n- suppressed secondary persona: ${persona.suppressedSecondaryPersonaReason}` : "";

  return `INFERRED PERSONA\n- primary role family: ${persona.primaryRoleFamilyLabel}\n- role family: ${persona.roleFamilyLabel}\n- seniority: ${persona.seniorityLabel}${subspecialization}\n- confidence: ${persona.confidence}${blend}${suppressedSecondary}\n- reasoning summary: ${persona.personaReasoningTraceSummary}\n- reading experience template: ${persona.readingExperienceTemplate}\n- interview framework: ${persona.interviewFramework}\n- mandatory retrieval priorities: ${persona.mandatorySourceClasses.join(", ")}\n- preferred retrieval priorities: ${persona.preferredSourceClasses.join(", ")}\n- five-minute brief priorities: ${persona.readingExperienceProfile.fiveMinuteBriefPriorities.join(", ")}\n- dominant strategy lenses: ${persona.strategyProfile.dominantLenses.join(", ")}\n- dominant question families: ${persona.interviewProfile.dominantQuestionFamilies.join(", ")}\n- persona evidence:\n${persona.personaEvidence.map((signal) => `  - ${signal}`).join("\n")}`;
}

export function getPremiumPresentationPlan(persona: PremiumPersonaProfile): PremiumPresentationPlan {
  const blendKey = getBlendKey(persona.primaryRoleFamily, persona.secondaryRoleFamily);

  if (blendKey === "product:sales_gtm" || blendKey === "product:marketing") {
    return {
      sectionOrder: [
        "decision_memo",
        "five_minute_brief",
        "company_context",
        "company_role_strategy",
        "why_role_exists_now",
        "candidate_fit",
        "how_to_win_this_process",
        "interview_prep",
        "credibility_layer",
        "operations_and_cost",
      ],
      titleBySectionKey: {
        company_role_strategy: "Strategy, GTM, And Role Context",
        how_to_win_this_process: "How To Win The Product And GTM Loop",
        interview_prep: "Product And GTM Interview Prep",
      },
    };
  }

  if (blendKey === "engineering:data_ml") {
    return {
      sectionOrder: [
        "decision_memo",
        "five_minute_brief",
        "company_context",
        "company_role_strategy",
        "why_role_exists_now",
        "how_to_win_this_process",
        "interview_prep",
        "candidate_fit",
        "credibility_layer",
        "operations_and_cost",
      ],
      titleBySectionKey: {
        company_role_strategy: "Technical, Data / ML, And Role Strategy",
        why_role_exists_now: "Why This Technical And Data Mandate Exists Now",
        how_to_win_this_process: "How To Win The Engineering And ML Loop",
        interview_prep: "Engineering And ML Interview Prep",
      },
    };
  }

  if (blendKey === "executive:product") {
    return {
      sectionOrder: [
        "decision_memo",
        "five_minute_brief",
        "company_context",
        "company_role_strategy",
        "why_role_exists_now",
        "candidate_fit",
        "how_to_win_this_process",
        "interview_prep",
        "credibility_layer",
        "operations_and_cost",
      ],
      titleBySectionKey: {
        company_role_strategy: "Business, Portfolio, And Product Strategy",
        why_role_exists_now: "Why This Leadership And Product Mandate Exists Now",
        how_to_win_this_process: "How To Win The Executive And Product Process",
        interview_prep: "Executive And Product Interview Prep",
        candidate_fit: "Leadership And Product Fit",
      },
    };
  }

  switch (persona.primaryRoleFamily) {
    case "engineering":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "company_role_strategy",
          "why_role_exists_now",
          "how_to_win_this_process",
          "interview_prep",
          "candidate_fit",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "Technical And Role Strategy",
          why_role_exists_now: "Why This Technical Mandate Exists Now",
          how_to_win_this_process: "How To Win The Technical Loop",
          interview_prep: "Technical Interview Prep",
          candidate_fit: persona.seniority === "director" || persona.seniority === "senior_director_vp" || persona.seniority === "executive_gm_c_level" ? "Technical Leadership Fit" : "Technical Fit",
        },
      };
    case "design":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "company_role_strategy",
          "candidate_fit",
          "why_role_exists_now",
          "how_to_win_this_process",
          "interview_prep",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "Design And Role Context",
          why_role_exists_now: "Why This Design Mandate Exists Now",
          how_to_win_this_process: "How To Win The Design Loop",
          interview_prep: "Design Interview Prep",
          candidate_fit: "Design Fit",
        },
      };
    case "data_ml":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "company_role_strategy",
          "why_role_exists_now",
          "candidate_fit",
          "how_to_win_this_process",
          "interview_prep",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "Data / ML And Role Strategy",
          why_role_exists_now: "Why This Data / ML Mandate Exists Now",
          how_to_win_this_process: "How To Win The Data / ML Loop",
          interview_prep: "Data / ML Interview Prep",
          candidate_fit: "Analytical Fit",
        },
      };
    case "marketing":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "why_role_exists_now",
          "company_role_strategy",
          "candidate_fit",
          "how_to_win_this_process",
          "interview_prep",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "GTM And Role Strategy",
          why_role_exists_now: "Why This GTM Mandate Exists Now",
          how_to_win_this_process: "How To Win The GTM Loop",
          interview_prep: "GTM Interview Prep",
          candidate_fit: "Market Fit",
        },
      };
    case "sales_gtm":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "company_role_strategy",
          "why_role_exists_now",
          "how_to_win_this_process",
          "interview_prep",
          "candidate_fit",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "Revenue Motion And Role Strategy",
          why_role_exists_now: "Why This Revenue Mandate Exists Now",
          how_to_win_this_process: "How To Win The Revenue Loop",
          interview_prep: "Revenue Interview Prep",
          candidate_fit: "Sales Fit",
        },
      };
    case "operations_program":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "company_role_strategy",
          "why_role_exists_now",
          "candidate_fit",
          "how_to_win_this_process",
          "interview_prep",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "Operating Model And Role Strategy",
          why_role_exists_now: "Why This Operating Mandate Exists Now",
          how_to_win_this_process: "How To Win The Operating Rhythm Loop",
          interview_prep: "Operating Rhythm Interview Prep",
          candidate_fit: "Execution Fit",
        },
      };
    case "executive":
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "company_role_strategy",
          "why_role_exists_now",
          "candidate_fit",
          "how_to_win_this_process",
          "interview_prep",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {
          company_role_strategy: "Business And Role Strategy",
          why_role_exists_now: "Why This Leadership Mandate Exists Now",
          how_to_win_this_process: "How To Win The Executive Process",
          interview_prep: "Executive Interview Prep",
          candidate_fit: "Leadership Fit",
        },
      };
    case "product":
    default:
      return {
        sectionOrder: [
          "decision_memo",
          "five_minute_brief",
          "company_context",
          "why_role_exists_now",
          "company_role_strategy",
          "candidate_fit",
          "how_to_win_this_process",
          "interview_prep",
          "credibility_layer",
          "operations_and_cost",
        ],
        titleBySectionKey: {},
      };
  }
}
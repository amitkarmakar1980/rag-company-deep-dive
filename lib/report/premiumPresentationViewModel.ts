import { PREMIUM_SECTION_DEFINITIONS, PremiumSectionContent } from "@/lib/report/premiumTypes";
import type { ReportCitation } from "@/lib/report/citationMetadata";

export type PremiumViewMode = "brief" | "full";

export type PremiumPresentationReportInput = {
  personaProfile?: {
    primaryRoleFamilyLabel?: string;
    secondaryRoleFamilyLabel?: string | null;
    isBlendedPersona?: boolean;
    roleFamilyLabel?: string;
    seniorityLabel?: string;
    subspecialization?: string | null;
    confidence?: "high" | "medium" | "low";
  } | null;
  sections: Array<{
    id: string;
    key: string;
    title: string;
    content: string;
    citations?: ReportCitation[];
  }>;
};

export type PremiumParsedViewSection = {
  id: string;
  key: string;
  title: string;
  content: string;
  citations?: ReportCitation[];
  parsed: PremiumSectionContent;
  group: string;
};

export type PremiumPresentationViewModel = {
  visibleSections: PremiumParsedViewSection[];
  personaBadges: string[];
};

type VisibleSectionKey = typeof VISIBLE_SECTION_ORDER[number];

const GROUP_BY_SECTION_KEY: Record<string, string> = {
  decision_memo: "Candidate-Skill Match",
  five_minute_brief: "Candidate-Skill Match",
  company_context: "Company Deep Dive",
  candidate_fit: "Candidate-Skill Match",
  how_to_win_this_process: "Interview Preparation",
  interview_prep: "Interview Preparation",
  company_role_strategy: "Company Deep Dive",
  why_role_exists_now: "About the Role",
  credibility_layer: "Appendix",
  operations_and_cost: "Appendix",
  company_deep_dive_v3: "Company Deep Dive",
};

const TITLE_BY_SECTION_KEY: Record<string, string> = {
  decision_memo: "Final Recommendation",
  five_minute_brief: "5-Minute Brief",
  company_context: "Company Overview",
  company_role_strategy: "Products, Strategy, And Market",
  why_role_exists_now: "About the Role",
  candidate_fit: "Candidate-Skill Match",
  how_to_win_this_process: "How To Position Yourself",
  interview_prep: "Likely Interview Questions",
  company_deep_dive_v3: "Company Deep Dive",
};

const VISIBLE_SECTION_ORDER = [
  "company_context",
  "company_role_strategy",
  "why_role_exists_now",
  "decision_memo",
  "candidate_fit",
  "five_minute_brief",
  "how_to_win_this_process",
  "interview_prep",
] as const;

const SECTION_ORDER_INDEX = new Map(VISIBLE_SECTION_ORDER.map((key, index) => [key, index]));

function isVisibleSectionKey(value: string): value is VisibleSectionKey {
  return SECTION_ORDER_INDEX.has(value as VisibleSectionKey);
}

const HIDDEN_SECTION_KEYS = new Set(["credibility_layer", "operations_and_cost"]);

export function parsePremiumSectionContent(content: string): PremiumSectionContent | null {
  try {
    const parsed = JSON.parse(content) as PremiumSectionContent;
    return parsed?.schema === "premium_section_v1" ? parsed : null;
  } catch {
    return null;
  }
}

export function buildPremiumPresentationViewModel(
  report: PremiumPresentationReportInput,
  viewMode: PremiumViewMode
): PremiumPresentationViewModel {
  const V3_MARKDOWN_SECTIONS = new Set(["company_deep_dive_v3"]);

  const sectionDefinitionByKey = new Map(PREMIUM_SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));
  const visibleSections = report.sections.flatMap((section) => {
    if (HIDDEN_SECTION_KEYS.has(section.key)) {
      return [];
    }

    // V3 markdown sections: passthrough without requiring a PREMIUM_SECTION_DEFINITIONS entry or JSON parse.
    if (V3_MARKDOWN_SECTIONS.has(section.key)) {
      return [{
        ...section,
        title: TITLE_BY_SECTION_KEY[section.key] ?? section.title,
        parsed: { schema: "premium_section_v1", surface: "both", content: section.content } as unknown as PremiumSectionContent,
        group: GROUP_BY_SECTION_KEY[section.key] ?? "Company Deep Dive",
      } satisfies PremiumParsedViewSection];
    }

    const definition = sectionDefinitionByKey.get(section.key as typeof PREMIUM_SECTION_DEFINITIONS[number]["key"]);
    const parsed = parsePremiumSectionContent(section.content);
    if (!definition || !parsed) {
      return [];
    }

    if (viewMode !== "full" && parsed.surface !== "both") {
      return [];
    }

    return [{
      ...section,
      title: TITLE_BY_SECTION_KEY[section.key] ?? section.title,
      parsed,
      group: GROUP_BY_SECTION_KEY[section.key] ?? definition.group,
    } satisfies PremiumParsedViewSection];
  }).sort((left, right) => {
    const leftIndex = isVisibleSectionKey(left.key) ? SECTION_ORDER_INDEX.get(left.key)! : Number.MAX_SAFE_INTEGER;
    const rightIndex = isVisibleSectionKey(right.key) ? SECTION_ORDER_INDEX.get(right.key)! : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });

  const roleFamilyBadge = report.personaProfile?.isBlendedPersona
    ? [report.personaProfile?.primaryRoleFamilyLabel ?? report.personaProfile?.roleFamilyLabel, report.personaProfile?.secondaryRoleFamilyLabel]
        .filter((value): value is string => Boolean(value))
        .join(" + ")
    : report.personaProfile?.primaryRoleFamilyLabel ?? report.personaProfile?.roleFamilyLabel;

  const personaBadges = [
    roleFamilyBadge,
    report.personaProfile?.seniorityLabel,
    report.personaProfile?.subspecialization,
  ].filter((value): value is string => Boolean(value));

  return {
    visibleSections,
    personaBadges,
  };
}
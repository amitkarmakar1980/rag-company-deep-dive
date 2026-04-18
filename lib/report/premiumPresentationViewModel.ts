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

const GROUP_BY_SECTION_KEY: Record<string, string> = {
  decision_memo: "Decision",
  five_minute_brief: "Decision",
  company_context: "Strategic Context",
  candidate_fit: "Candidate Positioning",
  how_to_win_this_process: "Interview Prep",
  interview_prep: "Interview Prep",
  company_role_strategy: "Strategic Context",
  why_role_exists_now: "Strategic Context",
  credibility_layer: "Credibility",
  operations_and_cost: "Credibility",
};

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
  const sectionDefinitionByKey = new Map(PREMIUM_SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));
  const visibleSections = report.sections.flatMap((section) => {
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
      parsed,
      group: GROUP_BY_SECTION_KEY[section.key] ?? definition.group,
    } satisfies PremiumParsedViewSection];
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
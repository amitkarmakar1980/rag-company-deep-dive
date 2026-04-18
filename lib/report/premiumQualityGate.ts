import { PremiumEvidenceQuality, PremiumPersonaQaSummary, PremiumSourceCoverageSummary } from "@/lib/report/premiumTelemetry";
import { PremiumPersonaProfile } from "@/lib/report/premiumPersona";
import { PremiumSectionContent, PremiumSectionKey } from "@/lib/report/premiumTypes";

export type PremiumSectionState = "approved" | "weak" | "suppress" | "rerun";
export type PremiumReleaseDecision =
  | "approved"
  | "approved_with_warnings"
  | "partial"
  | "suppress_and_release"
  | "reretrieve"
  | "resynthesize"
  | "depth_repair"
  | "prompt_improvement_recommended"
  | "blocked";

export interface PremiumPromptImprovementRecommendation {
  scope: "retrieval" | "synthesis" | "section_writing" | "evaluation" | "persona" | "company_context";
  reason: string;
  recommended_change: string;
  apply_mode?: "log_only" | "review_required";
}

export interface PremiumEvaluationSectionResult {
  section: PremiumSectionKey;
  state: PremiumSectionState;
  score: number;
  problems: string[];
  unsupported_claims: string[];
  shallow_patterns: string[];
  low_signal_filler: string[];
  repair_actions: string[];
}

export interface PremiumEvaluationModelOutput {
  scores: Record<string, number>;
  section_results: PremiumEvaluationSectionResult[];
  warning_flags: string[];
  blocked_release_reasons: string[];
  recommended_actions: string[];
  release_decision: PremiumReleaseDecision;
  prompt_improvement_recommendations?: PremiumPromptImprovementRecommendation[];
  reasoning_summary: string;
}

export interface PremiumQualityGateResult {
  overall_quality_score: number;
  depth_score: number;
  company_context_score: number;
  evidence_score: number;
  persona_score: number;
  interview_prep_score: number;
  readiness_to_release_score: number;
  release_decision: PremiumReleaseDecision;
  warning_flags: string[];
  blocked_release_reasons: string[];
  section_scores: Record<string, number>;
  section_states: Record<string, PremiumSectionState>;
  prompt_improvement_recommendations: PremiumPromptImprovementRecommendation[];
  reasoning_summary: string;
  repair_instructions: string[];
  suppressed_sections: PremiumSectionKey[];
}

const SECTION_KEYS: PremiumSectionKey[] = [
  "decision_memo",
  "five_minute_brief",
  "company_context",
  "why_role_exists_now",
  "company_role_strategy",
  "candidate_fit",
  "interview_prep",
  "how_to_win_this_process",
  "credibility_layer",
];

const CRITICAL_SECTIONS = new Set<PremiumSectionKey>([
  "decision_memo",
  "company_role_strategy",
  "interview_prep",
  "how_to_win_this_process",
  "credibility_layer",
]);

function clampScore(value: number | undefined, fallback = 0): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeSectionState(value: string | undefined): PremiumSectionState {
  if (value === "approved" || value === "weak" || value === "suppress" || value === "rerun") {
    return value;
  }

  return "weak";
}

function flattenSection(section: PremiumSectionContent | undefined): string {
  if (!section) {
    return "";
  }

  return [
    section.summary,
    ...(section.bullets ?? []),
    ...(section.facts?.map((fact) => `${fact.label} ${fact.value}`) ?? []),
    ...(section.callouts?.map((callout) => `${callout.label} ${callout.value}`) ?? []),
    ...(section.blocks?.flatMap((block) => [block.title, block.body ?? "", ...(block.bullets ?? [])]) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function findBlocks(section: PremiumSectionContent | undefined, titlePattern: RegExp) {
  return (section?.blocks ?? []).filter((block) => titlePattern.test(block.title));
}

function countBullets(section: PremiumSectionContent | undefined, titlePattern: RegExp): number {
  return findBlocks(section, titlePattern).reduce((count, block) => count + (block.bullets?.length ?? 0), 0);
}

function auditCompanyContextDepth(section: PremiumSectionContent | undefined): string[] {
  if (!section) {
    return ["Company context section is missing."];
  }

  const flattened = flattenSection(section);
  const issues: string[] = [];
  const wordCount = countWords(flattened);

  if (wordCount < 150) {
    issues.push("Company context stays below the 150-word premium minimum.");
  }

  if (!findBlocks(section, /vision\s+and\s+mission|mission|vision/i).length) {
    issues.push("Company context does not highlight vision and mission in a dedicated block.");
  }

  if (!findBlocks(section, /culture|values|operating principles|leadership principles/i).length) {
    issues.push("Company context does not highlight culture in a dedicated block.");
  }

  if (!/mission/.test(flattened) || !/vision/.test(flattened)) {
    issues.push("Company context does not interpret both mission and vision explicitly.");
  }

  if (!/culture|values|operating principles|leadership principles/.test(flattened)) {
    issues.push("Company context does not interpret culture or operating principles explicitly.");
  }

  return issues;
}

function auditCompanyRoleStrategyDepth(section: PremiumSectionContent | undefined): string[] {
  if (!section) {
    return ["Company strategy section is missing."];
  }

  const flattened = flattenSection(section);
  const issues: string[] = [];
  const wordCount = countWords(flattened);
  const swotThresholds: Array<{ label: string; pattern: RegExp }> = [
    { label: "strengths", pattern: /swot\s*-?\s*strengths|strengths/i },
    { label: "weaknesses", pattern: /swot\s*-?\s*weaknesses|weaknesses/i },
    { label: "opportunities", pattern: /swot\s*-?\s*opportunities|opportunities/i },
    { label: "threats", pattern: /swot\s*-?\s*threats|threats/i },
  ];

  if (wordCount < 300) {
    issues.push("Company strategy stays below the 300-word premium minimum.");
  }

  if (!findBlocks(section, /current strategy|strategic priorities|strategy posture|strategy/i).length) {
    issues.push("Company strategy does not include a clearly labeled current-strategy block.");
  }

  for (const threshold of swotThresholds) {
    const bulletCount = countBullets(section, threshold.pattern);
    if (bulletCount < 3) {
      issues.push(`Company strategy does not provide at least 3 substantive SWOT ${threshold.label} bullets.`);
    }
  }

  return issues;
}

function countLowSignalPatterns(text: string): number {
  const patterns = [
    /fast[- ]paced/g,
    /collaborative/g,
    /innovative/g,
    /dynamic environment/g,
    /cross-functional/g,
    /customer-centric/g,
    /best-in-class/g,
    /world-class/g,
  ];

  return patterns.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}

function hasUnsupportedPrecision(text: string): boolean {
  return /year-1|first year|first 12 months|90 days|12 months/.test(text) && !/insufficient evidence|hypothesis|inference/.test(text);
}

function countMatches(text: string, patterns: string[]): number {
  return patterns.filter((pattern) => text.includes(pattern)).length;
}

function detectExecutiveOverread(text: string, persona: PremiumPersonaProfile): boolean {
  if (persona.primaryRoleFamily !== "product") {
    return false;
  }

  if (persona.seniority === "senior_director_vp" || persona.seniority === "executive_gm_c_level") {
    return false;
  }

  return countMatches(text, ["p&l", "p and l", "capital allocation", "business unit", "board", "org design", "portfolio"]) >= 2;
}

function detectTechnicalPmDrift(interviewPrepText: string, persona: PremiumPersonaProfile): boolean {
  if (persona.primaryRoleFamily !== "product") {
    return false;
  }

  return countMatches(interviewPrepText, ["system design", "distributed systems", "architecture", "latency", "throughput", "api design", "reliability"]) >= 3;
}

function detectSectionCategoryIntegrityViolations(sections: Record<string, PremiumSectionContent>): string[] {
  const violations: string[] = [];
  const companyContextText = flattenSection(sections.company_context);
  const candidateFitText = flattenSection(sections.candidate_fit);

  if (companyContextText && countMatches(companyContextText, ["hiring manager", "what to say", "interview loop", "tell this story", "questions to ask"]) >= 2) {
    violations.push("company_context contains interview-prep guidance instead of company context.");
  }

  if (candidateFitText && countMatches(candidateFitText, ["business model", "competitor", "market context", "org structure", "why this role exists"]) >= 3) {
    violations.push("candidate_fit is drifting into company or role strategy instead of candidate transferability.");
  }

  return violations;
}

function dedupeStrings(values: string[]): string[] {
  return values.filter((value, index) => value.trim().length > 0 && values.indexOf(value) === index);
}

function defaultSectionScores(sections: Record<string, PremiumSectionContent>): Record<string, number> {
  return Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const section = sections[key];
      const text = flattenSection(section);
      let score = 72;

      if (!section) {
        score = key === "company_context" || key === "candidate_fit" ? 60 : 45;
      } else if (section.evidence?.status === "insufficient") {
        score -= 22;
      } else if (section.evidence?.status === "partial") {
        score -= 10;
      }

      score -= Math.min(12, countLowSignalPatterns(text) * 2);
      if (hasUnsupportedPrecision(text)) {
        score -= 12;
      }

      if (text.includes("insufficient_evidence")) {
        score -= 10;
      }

      if (key === "company_context") {
        score -= Math.min(28, auditCompanyContextDepth(section).length * 7);
      }

      if (key === "company_role_strategy") {
        score -= Math.min(36, auditCompanyRoleStrategyDepth(section).length * 8);
      }

      return [key, clampScore(score, 50)];
    })
  );
}

function toSectionState(score: number, existing: PremiumSectionState | undefined, critical: boolean): PremiumSectionState {
  if (existing) {
    return existing;
  }

  if (score >= 78) {
    return "approved";
  }

  if (score >= 65) {
    return "weak";
  }

  return critical ? "rerun" : "suppress";
}

export function finalizePremiumQualityGate(args: {
  evaluation: PremiumEvaluationModelOutput | null;
  sections: Record<string, PremiumSectionContent>;
  evidenceQuality: PremiumEvidenceQuality;
  coverage: PremiumSourceCoverageSummary;
  personaQa: PremiumPersonaQaSummary;
  persona: PremiumPersonaProfile;
  hasRetry: boolean;
}): PremiumQualityGateResult {
  const deterministicSectionScores = defaultSectionScores(args.sections);
  const evaluationScores = args.evaluation?.scores ?? {};
  const evaluationSectionResults = args.evaluation?.section_results ?? [];
  const companyContextAuditIssues = auditCompanyContextDepth(args.sections.company_context);
  const companyStrategyAuditIssues = auditCompanyRoleStrategyDepth(args.sections.company_role_strategy);
  const sectionScores = Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const evaluated = evaluationSectionResults.find((result) => result.section === key)?.score;
      return [key, Math.min(clampScore(evaluated, deterministicSectionScores[key]), deterministicSectionScores[key])];
    })
  );

  const sectionStates = Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const evaluatedState = evaluationSectionResults.find((result) => result.section === key)?.state;
      return [
        key,
        toSectionState(sectionScores[key], evaluatedState ? normalizeSectionState(evaluatedState) : undefined, CRITICAL_SECTIONS.has(key)),
      ];
    })
  ) as Record<string, PremiumSectionState>;

  const warningFlags = [...(args.evaluation?.warning_flags ?? [])];
  const blockedReasons = [...(args.evaluation?.blocked_release_reasons ?? [])];
  const allText = flattenSection(args.sections.company_role_strategy) + " " + flattenSection(args.sections.how_to_win_this_process) + " " + flattenSection(args.sections.interview_prep);
  const interviewPrepText = flattenSection(args.sections.interview_prep) + " " + flattenSection(args.sections.how_to_win_this_process);
  const sectionIntegrityViolations = detectSectionCategoryIntegrityViolations(args.sections);
  const hasCompanyDepthContractFailure = companyContextAuditIssues.length > 0 || companyStrategyAuditIssues.length > 0;
  const hasExecutiveScopeOverread = detectExecutiveOverread(allText, args.persona);
  const hasTechnicalPmInterviewDrift = detectTechnicalPmDrift(interviewPrepText, args.persona);

  if (args.coverage.persona_source_class_audit.missingMandatory.length > 0) {
    warningFlags.push(`Missing mandatory persona source classes: ${args.coverage.persona_source_class_audit.missingMandatory.join(", ")}.`);
  }

  if (args.personaQa.overallStatus === "warn") {
    warningFlags.push(...args.personaQa.warnings);
  }

  if (hasExecutiveScopeOverread) {
    blockedReasons.push("Report overreads executive scope relative to the inferred product persona.");
  }

  if (hasTechnicalPmInterviewDrift) {
    blockedReasons.push("Interview prep drifted into engineering architecture theater for a product role.");
  }

  if (sectionIntegrityViolations.length > 0) {
    warningFlags.push(...sectionIntegrityViolations);
  }

  if (companyContextAuditIssues.length > 0) {
    warningFlags.push(...companyContextAuditIssues);
    blockedReasons.push("Company context section did not meet the premium depth contract.");
  }

  if (companyStrategyAuditIssues.length > 0) {
    warningFlags.push(...companyStrategyAuditIssues);
    blockedReasons.push("Company strategy section did not meet the premium depth contract.");
  }

  if (args.evidenceQuality.rating === "insufficient") {
    blockedReasons.push("Evidence quality is insufficient for a premium release.");
  }

  const overallQualityScore = clampScore(
    evaluationScores.overall_quality,
    Math.round(Object.values(sectionScores).reduce((sum, score) => sum + score, 0) / Object.keys(sectionScores).length)
  );
  const evidenceScore = clampScore(
    evaluationScores.evidence_quality,
    args.evidenceQuality.rating === "strong" ? 85 : args.evidenceQuality.rating === "moderate" ? 72 : args.evidenceQuality.rating === "weak" ? 60 : 45
  );
  const personaScore = clampScore(evaluationScores.persona_accuracy, args.personaQa.overallStatus === "pass" ? 82 : 66);
  const interviewPrepScore = clampScore(evaluationScores.interview_prep, sectionScores.interview_prep);
  const companyContextScore = clampScore(evaluationScores.company_context, sectionScores.company_context);
  const depthScore = clampScore(
    evaluationScores.depth,
    Math.round((sectionScores.company_role_strategy + sectionScores.interview_prep + sectionScores.how_to_win_this_process + sectionScores.company_context) / 4)
  );
  const readinessToReleaseScore = clampScore(
    evaluationScores.readiness_to_release,
    Math.round((overallQualityScore + evidenceScore + depthScore) / 3)
  );

  const criticalFailures = SECTION_KEYS.filter((key) => CRITICAL_SECTIONS.has(key) && sectionScores[key] < 60);
  const suppressedSections = SECTION_KEYS.filter((key) => sectionStates[key] === "suppress");
  const rerunSections = SECTION_KEYS.filter((key) => sectionStates[key] === "rerun");

  if (criticalFailures.length > 0) {
    blockedReasons.push(`Critical sections remained below the premium threshold: ${criticalFailures.join(", ")}.`);
  }

  if (depthScore < 55) {
    blockedReasons.push("Depth remained below the premium minimum after evaluation.");
  }

  if (evidenceScore < 55) {
    blockedReasons.push("Evidence quality remained below the premium minimum after evaluation.");
  }

  let releaseDecision: PremiumReleaseDecision = args.evaluation?.release_decision ?? "approved_with_warnings";

  if (blockedReasons.length > 0 || criticalFailures.length > 0 || evidenceScore < 55 || depthScore < 55) {
    if (args.hasRetry) {
      releaseDecision = "blocked";
    } else if (hasExecutiveScopeOverread || hasTechnicalPmInterviewDrift) {
      releaseDecision = "resynthesize";
    } else {
      releaseDecision = depthScore < 60 || hasCompanyDepthContractFailure ? "depth_repair" : "resynthesize";
    }
  } else if (rerunSections.length > 0) {
    releaseDecision = args.hasRetry ? "partial" : "resynthesize";
  } else if (suppressedSections.length > 0) {
    releaseDecision = "suppress_and_release";
  } else if (warningFlags.length > 0 || readinessToReleaseScore < 80 || overallQualityScore < 82) {
    releaseDecision = overallQualityScore >= 70 ? "approved_with_warnings" : "partial";
  } else {
    releaseDecision = "approved";
  }

  const promptImprovementRecommendations = (args.evaluation?.prompt_improvement_recommendations ?? []).map((recommendation) => ({
    ...recommendation,
    apply_mode: "review_required" as const,
  }));

  const repairInstructions = dedupeStrings([
    ...evaluationSectionResults
      .filter((result) => result.state === "rerun" || result.state === "weak")
      .flatMap((result) => result.repair_actions),
    ...(criticalFailures.length > 0
      ? criticalFailures.map((section) => `Repair the ${section} section to remove unsupported claims, increase evidence clarity, and improve depth.`)
      : []),
    ...(companyContextScore < 70
      ? ["Improve company-context coverage with stronger interpretation of company insights, history, mission, values, culture, and employee-review caveats where evidence supports it."]
      : []),
    ...companyContextAuditIssues,
    ...companyStrategyAuditIssues,
    ...(interviewPrepScore < 74
      ? ["Rewrite interview-prep content so it becomes role-family-specific, seniority-specific, and interviewer-proof-oriented rather than generic."]
      : []),
    ...(companyStrategyAuditIssues.length > 0
      ? ["Deepen company strategy with a clearly labeled current-strategy block and SWOT blocks for strengths, weaknesses, opportunities, and threats, each with at least 3 substantive bullets."]
      : []),
    ...(hasExecutiveScopeOverread
      ? ["Correct the archetype: remove executive-scope assumptions unless the JD explicitly shows business-unit, portfolio, org-design, or P&L authority."]
      : []),
    ...(hasTechnicalPmInterviewDrift
      ? ["Rewrite technical PM interview prep around product tradeoffs, privacy or safety judgment, rollout strategy, and cross-functional proof instead of engineering architecture theater."]
      : []),
    ...(sectionIntegrityViolations.length > 0
      ? ["Repair section-category integrity so company context, candidate fit, and interview prep each answer the right question."]
      : []),
    ...(sectionScores.candidate_fit < 74
      ? ["Rescore candidate fit dimension by dimension and explain transferability explicitly instead of over-weighting narrow domain purity."]
      : []),
    ...(depthScore < 72
      ? ["Increase second-order insight density. Explain implications and tradeoffs instead of summarizing facts."]
      : []),
  ]).slice(0, 14);

  return {
    overall_quality_score: overallQualityScore,
    depth_score: depthScore,
    company_context_score: companyContextScore,
    evidence_score: evidenceScore,
    persona_score: personaScore,
    interview_prep_score: interviewPrepScore,
    readiness_to_release_score: readinessToReleaseScore,
    release_decision: releaseDecision,
    warning_flags: dedupeStrings(warningFlags),
    blocked_release_reasons: dedupeStrings(blockedReasons),
    section_scores: sectionScores,
    section_states: sectionStates,
    prompt_improvement_recommendations: promptImprovementRecommendations,
    reasoning_summary: args.evaluation?.reasoning_summary ?? "Quality gate result derived from deterministic audits plus evaluator review.",
    repair_instructions: repairInstructions,
    suppressed_sections: suppressedSections,
  };
}

export function applyQualityGateToSections(
  sections: Record<string, PremiumSectionContent>,
  qualityGate: PremiumQualityGateResult
): Record<string, PremiumSectionContent> {
  return Object.fromEntries(
    Object.entries(sections)
      .filter(([key]) => !qualityGate.suppressed_sections.includes(key as PremiumSectionKey))
      .map(([key, section]) => {
        const sectionState = qualityGate.section_states[key];
        if (sectionState === "weak" || sectionState === "rerun") {
          return [
            key,
            {
              ...section,
              evidence: {
                threshold: section.evidence?.threshold ?? section.question,
                status: section.evidence?.status ?? "partial",
                confidence: section.evidence?.confidence ?? "medium",
                note: `${section.evidence?.note ?? "This section is grounded but not fully premium-ready."} Quality gate note: released with caution because this section remained below the premium threshold.`,
              },
            } satisfies PremiumSectionContent,
          ];
        }

        return [key, section];
      })
  );
}
import { randomUUID } from "crypto";
import {
  createReport,
  createReportSection,
  getDeepDiveRequest,
  getRequestSources,
  updateDeepDiveStatus,
  updateReportSummaryJson,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import { generatePremiumEvaluation, generatePremiumReport } from "@/lib/ai/openai";
import { getPremiumEvaluationPrompt } from "@/lib/ai/premiumEvaluationPrompt";
import { getPremiumReportPromptV2 } from "@/lib/ai/premiumPromptsV2";
import { getPremiumReportPromptV3 } from "@/lib/ai/premiumPromptsV3";
import { buildTargetedSourceUrls, type ResearchPlan, type PlannedSource } from "@/lib/ingestion/firecrawl";
import { multiTopicSearch, rerank } from "@/lib/retrieval/search";
import { Report, ReportTokenUsage, RetrievalContext, RecommendationType } from "@/lib/types";
import {
  PREMIUM_SECTION_DEFINITIONS,
  PremiumGeneratedSection,
  PremiumReportModelOutput,
  PremiumSectionContent,
  PremiumSectionKey,
} from "@/lib/report/premiumTypes";
import {
  buildPersonaAwareRetrievalQueries,
  getPremiumPresentationPlan,
  inferPremiumPersona,
} from "@/lib/report/premiumPersona";
import { buildReportCitations } from "@/lib/report/citationMetadata";
import {
  assessPremiumEvidenceQuality,
  assessPremiumPersonaQa,
  buildPremiumCostLedger,
  buildPremiumOperationsSection,
  buildPremiumSourceCoverageSummary,
} from "@/lib/report/premiumTelemetry";
import {
  applyQualityGateToSections,
  finalizePremiumQualityGate,
  PremiumEvaluationModelOutput,
  PremiumQualityGateResult,
} from "@/lib/report/premiumQualityGate";

type PremiumRuntimeConfig = {
  reportFormat: "premium_v2" | "premium_v3";
  generatorVersion: "premium_v2_default" | "premium_v3_default";
  promptBuilder: typeof getPremiumReportPromptV2;
};

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toValidRecommendation(raw: string): RecommendationType {
  const valid: RecommendationType[] = ["pursue", "pursue_cautiously", "avoid", "need_more_signal"];
  return valid.includes(raw as RecommendationType)
    ? (raw as RecommendationType)
    : "need_more_signal";
}

function clampScore(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(10, value));
}

function fallbackGeneratedSection(question: string): PremiumGeneratedSection {
  return {
    summary: "INSUFFICIENT_EVIDENCE",
    blocks: [
      {
        title: "Evidence gap",
        body: "The system could not support a premium-quality answer for this section with the current evidence base.",
      },
    ],
    evidence: {
      threshold: question,
      status: "insufficient",
      confidence: "suppressed",
      note: "This section was intentionally constrained because the evidence threshold was not met.",
    },
  };
}

function normalizeCitationStyle(text: string | undefined): string | undefined {
  if (!text) {
    return text;
  }

  return text.replace(/\b[Ss]ource\s+(\d+)\b/g, "[$1]");
}

function normalizeGeneratedSectionCitations(generated: PremiumGeneratedSection): PremiumGeneratedSection {
  return {
    ...generated,
    summary: normalizeCitationStyle(generated.summary) || "INSUFFICIENT_EVIDENCE",
    callouts: generated.callouts?.map((callout) => ({
      ...callout,
      label: normalizeCitationStyle(callout.label) || callout.label,
      value: normalizeCitationStyle(callout.value) || callout.value,
    })),
    facts: generated.facts?.map((fact) => ({
      ...fact,
      label: normalizeCitationStyle(fact.label) || fact.label,
      value: normalizeCitationStyle(fact.value) || fact.value,
    })),
    bullets: generated.bullets?.map((bullet) => normalizeCitationStyle(bullet) || bullet),
    blocks: generated.blocks?.map((block) => ({
      ...block,
      title: normalizeCitationStyle(block.title) || block.title,
      body: normalizeCitationStyle(block.body),
      bullets: block.bullets?.map((bullet) => normalizeCitationStyle(bullet) || bullet),
    })),
    evidence: generated.evidence
      ? {
          ...generated.evidence,
          threshold: normalizeCitationStyle(generated.evidence.threshold),
          note: normalizeCitationStyle(generated.evidence.note),
        }
      : undefined,
  };
}

function wrapSection(
  _key: PremiumSectionKey,
  generated: PremiumGeneratedSection | undefined,
  fallbackQuestion: string,
  fallbackGroup: PremiumSectionContent["group"],
  fallbackSurface: PremiumSectionContent["surface"]
): PremiumSectionContent {
  const safe = normalizeGeneratedSectionCitations(generated ?? fallbackGeneratedSection(fallbackQuestion));

  return {
    schema: "premium_section_v1",
    group: fallbackGroup,
    surface: fallbackSurface,
    question: fallbackQuestion,
    summary: safe.summary || "INSUFFICIENT_EVIDENCE",
    callouts: safe.callouts,
    facts: safe.facts,
    bullets: safe.bullets,
    blocks: safe.blocks,
    evidence: safe.evidence
      ? {
          threshold: safe.evidence.threshold || "See report_generation_spec.md",
          status: safe.evidence.status || "partial",
          confidence: safe.evidence.confidence || "suppressed",
          note: safe.evidence.note || "Confidence is suppressed because the evidence bar was not explicitly met.",
        }
      : undefined,
  };
}

function buildWrappedSections(
  definitions: typeof PREMIUM_SECTION_DEFINITIONS,
  generatedSections: PremiumReportModelOutput["sections"]
): Record<string, PremiumSectionContent> {
  return Object.fromEntries(
    definitions
      .filter((definition) => definition.key !== "operations_and_cost")
      .map((definition) => [
        definition.key,
        wrapSection(
          definition.key,
          generatedSections[definition.key as Exclude<PremiumSectionKey, "operations_and_cost">],
          definition.question,
          definition.group,
          definition.surface
        ),
      ])
  );
}

export function buildOrderedDefinitions(
  presentationPlan: ReturnType<typeof getPremiumPresentationPlan>
): typeof PREMIUM_SECTION_DEFINITIONS {
  const sectionDefinitionsByKey = new Map(PREMIUM_SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));
  const planned = (presentationPlan.sectionOrder ?? [])
    .map((key) => sectionDefinitionsByKey.get(key))
    .filter((definition): definition is typeof PREMIUM_SECTION_DEFINITIONS[number] => Boolean(definition));
  const missing = PREMIUM_SECTION_DEFINITIONS.filter(
    (definition) => !planned.some((plannedDefinition) => plannedDefinition.key === definition.key)
  );

  return [...planned, ...missing];
}

function dedupeStrings(values: string[]): string[] {
  return values.filter((value, index) => value.trim().length > 0 && values.indexOf(value) === index);
}

function buildCoreReportQueries(args: {
  companyName: string;
  roleTitle: string;
  jobDescription?: string;
  hasCandidateProfile: boolean;
}): string[] {
  const baseQueries = [
    `${args.companyName} history mission vision values employee reviews culture`,
    `${args.companyName} product lines platform pricing customers strategic bets`,
    `${args.companyName} market position competitors strategic bets investor leadership`,
    `${args.companyName} ${args.roleTitle} responsibilities scope mandate team product line`,
    `${args.companyName} ${args.roleTitle} interview expectations hiring manager questions`,
  ];

  if (args.jobDescription?.trim()) {
    baseQueries.push(`${args.companyName} ${args.roleTitle} job description responsibilities requirements success metrics`);
  }

  if (args.hasCandidateProfile) {
    baseQueries.push(`${args.companyName} ${args.roleTitle} candidate strengths gaps transferability interview risks`);
  }

  return dedupeStrings(baseQueries);
}

function buildRetrievalContext(args: {
  reranked: ReturnType<typeof rerank>;
  sourceCount: number;
  evidenceQuality: ReturnType<typeof assessPremiumEvidenceQuality>;
}): RetrievalContext {
  return {
    chunks: args.reranked.map((result) => ({
      text: result.chunk.text,
      source_id: result.source.id,
      source_title: result.source.title,
      source_url: result.source.url,
      source_type: result.source.source_type,
    })),
    metadata: {
      total_chunks_available: args.sourceCount * 5,
      retrieval_confidence: Math.min(1, args.reranked.length / 15),
      evidence_quality: args.evidenceQuality,
    },
  };
}

export function buildTargetedReretrievalQueries(args: {
  companyName: string;
  roleTitle: string;
  persona: ReturnType<typeof inferPremiumPersona>;
  existingQueries: string[];
  qualityGate: PremiumQualityGateResult;
  personaQa: ReturnType<typeof assessPremiumPersonaQa>;
}): string[] {
  const targeted: string[] = [];
  const hasExecutiveOverread = args.personaQa.checks.some(
    (check) => check.check === "executive_scope_overread" && check.status === "warn"
  ) || args.qualityGate.blocked_release_reasons.some((reason) => /executive scope/i.test(reason));
  const hasTechnicalPmDrift = args.personaQa.checks.some(
    (check) => check.check === "technical_pm_interview_drift" && check.status === "warn"
  ) || args.qualityGate.blocked_release_reasons.some((reason) => /engineering architecture theater/i.test(reason));
  const fitRepairRequested = args.qualityGate.repair_instructions.some((instruction) => /candidate fit|transferability|fit score/i.test(instruction));
  const weakCompanyContext = args.qualityGate.repair_instructions.some(
    (instruction) => /company-context coverage|company insights|history|mission|values|culture/i.test(instruction)
  );
  const weakInterviewPrep = args.qualityGate.repair_instructions.some(
    (instruction) => /interview-prep content|interviewer-proof|rewrite interview-prep/i.test(instruction)
  );
  const weakDepthOrEvidence = args.qualityGate.repair_instructions.some(
    (instruction) => /second-order insight density|tradeoffs/i.test(instruction)
  ) || args.qualityGate.blocked_release_reasons.some((reason) => /depth|evidence quality/i.test(reason));

  if (args.persona.primaryRoleFamily === "product" && hasExecutiveOverread) {
    targeted.push(
      `${args.companyName} ${args.roleTitle} product manager responsibilities roadmap stakeholder alignment cross functional execution`,
      `${args.companyName} ${args.roleTitle} product leadership role charter decision making product strategy hiring expectations`
    );
  }

  if (args.persona.primaryRoleFamily === "product" && hasTechnicalPmDrift) {
    targeted.push(
      `${args.companyName} ${args.roleTitle} product interview strategy prioritization tradeoffs privacy safety rollout metrics`,
      `${args.companyName} safety trust privacy product launches policy rollout user experience ${args.roleTitle}`
    );
  }

  if (fitRepairRequested) {
    targeted.push(
      `${args.companyName} ${args.roleTitle} transferability adjacent product platform safety trust privacy cross functional leadership`,
      `${args.companyName} ${args.roleTitle} hiring bar strengths objections product strategy technical fluency`
    );
  }

  if (weakCompanyContext || weakDepthOrEvidence) {
    targeted.push(
      `${args.companyName} investor relations earnings shareholder letter strategy product priorities`,
      `${args.companyName} leadership interview strategy operating principles platform safety ${args.roleTitle}`,
      `${args.companyName} mission vision values culture operating principles leadership principles`,
      `${args.companyName} employee reviews culture leadership values Glassdoor Comparably`,
      `${args.companyName} annual report shareholder letter strategic priorities moat tradeoffs ${args.roleTitle}`,
      `${args.companyName} competitors market share Gartner Forrester alternatives customer segments`,
      `${args.companyName} industry report market size growth rate analyst strategy Reuters`
    );
  }

  if (weakInterviewPrep || weakDepthOrEvidence) {
    targeted.push(
      `${args.companyName} ${args.roleTitle} interview hiring manager expectations product judgment stakeholder management privacy safety`,
      `${args.companyName} ${args.roleTitle} role charter launches roadmap execution tradeoffs cross functional collaboration`
    );
  }

  const missingSourceClasses = args.qualityGate.warning_flags
    .filter((warning) => /mandatory persona source classes/i.test(warning))
    .join(" ");
  if (/leadership_strategy|investor_materials|product_surfaces|leadership_commentary/i.test(missingSourceClasses)) {
    targeted.push(
      `${args.companyName} leadership strategy business model priorities ${args.roleTitle}`,
      `${args.companyName} product surfaces launches roadmap platform workflow ${args.roleTitle}`
    );
  }

  return dedupeStrings([...args.existingQueries, ...targeted]).slice(0, 10);
}

function hasWeakEvidenceRecoveryRequest(qualityGate: PremiumQualityGateResult): boolean {
  const releaseStalled = ["partial", "resynthesize", "depth_repair", "blocked"].includes(qualityGate.release_decision);
  const weakEvidenceFlags = qualityGate.warning_flags.some((warning) => /generic company context|weak evidence/i.test(warning));
  const weakEvidenceReasons = qualityGate.blocked_release_reasons.some(
    (reason) => /insufficient depth|depth remained below|evidence quality|generic interview prep/i.test(reason)
  );
  const weakEvidenceRepairs = qualityGate.repair_instructions.some(
    (instruction) => /company-context coverage|rewrite interview-prep|second-order insight density/i.test(instruction)
  );

  return releaseStalled && (weakEvidenceFlags || weakEvidenceReasons || weakEvidenceRepairs);
}

function hasCriticalSectionRecoveryNeed(qualityGate: PremiumQualityGateResult): boolean {
  const criticalKeys = ["company_role_strategy", "interview_prep", "how_to_win_this_process", "company_context"];
  const weakCriticalSections = criticalKeys.some((key) => {
    const state = qualityGate.section_states[key];
    return state === "weak" || state === "rerun";
  });

  const repairRequested = qualityGate.repair_instructions.some(
    (instruction) => /company-context coverage|rewrite interview-prep|second-order insight density/i.test(instruction)
  );

  return weakCriticalSections || repairRequested;
}

export function shouldRunTargetedReretrieval(args: {
  qualityGate: PremiumQualityGateResult;
  coverage: ReturnType<typeof buildPremiumSourceCoverageSummary>;
  personaQa: ReturnType<typeof assessPremiumPersonaQa>;
  alreadyReranRetrieval: boolean;
}): boolean {
  if (args.alreadyReranRetrieval) {
    return false;
  }

  if (args.qualityGate.release_decision === "reretrieve") {
    return true;
  }

  const missingMandatory = args.coverage.persona_source_class_audit.missingMandatory.length > 0;
  const archetypeWarning = args.personaQa.checks.some(
    (check) => ["persona_domain_alignment", "executive_scope_overread", "technical_pm_interview_drift"].includes(check.check) && check.status === "warn"
  );
  const archetypeRepairRequested = args.qualityGate.repair_instructions.some(
    (instruction) => /correct the archetype|candidate fit|transferability|engineering architecture theater/i.test(instruction)
  );
  const weakEvidenceRecoveryRequested = hasWeakEvidenceRecoveryRequest(args.qualityGate);
  const criticalSectionRecoveryNeeded = hasCriticalSectionRecoveryNeed(args.qualityGate);

  return (missingMandatory && (archetypeWarning || archetypeRepairRequested)) || (weakEvidenceRecoveryRequested && criticalSectionRecoveryNeeded);
}

export async function buildTargetedReretrievalSourceUrls(args: {
  companyName: string;
  roleTitle: string;
  companyUrl?: string;
  qualityGate: PremiumQualityGateResult;
  coverage: ReturnType<typeof buildPremiumSourceCoverageSummary>;
  enableHomepageDiscovery?: boolean;
}): Promise<string[]> {
  const missingSourceClasses = dedupeStrings([
    ...args.coverage.persona_source_class_audit.missingMandatory,
    ...(args.qualityGate.blocked_release_reasons.some((reason) => /executive scope/i.test(reason))
      ? ["leadership_strategy", "leadership_commentary"]
      : []),
    ...(args.qualityGate.repair_instructions.some((instruction) => /candidate fit|transferability/i.test(instruction))
      ? ["product_surfaces", "competitor_positioning"]
      : []),
    ...(hasWeakEvidenceRecoveryRequest(args.qualityGate)
      ? ["leadership_strategy", "investor_materials", "product_surfaces", "leadership_commentary", "competitor_positioning", "external_validation"]
      : []),
  ]);

  return await buildTargetedSourceUrls({
    companyName: args.companyName,
    roleTitle: args.roleTitle,
    companyUrl: args.companyUrl,
    missingSourceClasses,
    enableHomepageDiscovery: args.enableHomepageDiscovery,
  });
}

async function buildPremiumRetrievalState(args: {
  requestId: string;
  queries: string[];
  companyName: string;
  roleTitle: string;
  persona: ReturnType<typeof inferPremiumPersona>;
}): Promise<{
  sources: Awaited<ReturnType<typeof getRequestSources>>;
  normalizedQueries: string[];
  rawResults: Awaited<ReturnType<typeof multiTopicSearch>>;
  reranked: ReturnType<typeof rerank>;
  evidenceQuality: ReturnType<typeof assessPremiumEvidenceQuality>;
  coverage: ReturnType<typeof buildPremiumSourceCoverageSummary>;
  context: RetrievalContext;
  retrievalDurationMs: number;
}> {
  const retrievalStartedAt = Date.now();
  const sources = await getRequestSources(args.requestId);
  const normalizedQueries = dedupeStrings(args.queries);
  const rawResults = await multiTopicSearch(args.requestId, 8, 0.35, normalizedQueries);
  const reranked = rerank(rawResults, {
    role_title: args.roleTitle,
    company_name: args.companyName,
  });
  const evidenceQuality = assessPremiumEvidenceQuality(rawResults, reranked);
  const coverage = buildPremiumSourceCoverageSummary(sources, reranked, normalizedQueries, args.persona);
  const context = buildRetrievalContext({
    reranked,
    sourceCount: sources.length,
    evidenceQuality,
  });

  return {
    sources,
    normalizedQueries,
    rawResults,
    reranked,
    evidenceQuality,
    coverage,
    context,
    retrievalDurationMs: Date.now() - retrievalStartedAt,
  };
}

export type PremiumRetrievalState = Awaited<ReturnType<typeof buildPremiumRetrievalState>>;

export { buildPremiumRetrievalState };

export function resolveQualityGateForPersistence(
  qualityGate: PremiumQualityGateResult,
  sections: Record<string, PremiumSectionContent>
): PremiumQualityGateResult {
  if (qualityGate.release_decision !== "blocked") {
    return qualityGate;
  }

  const fatalBlockedReasonPattern = /executive scope|engineering architecture theater|section-category integrity|wrong question|unsupported claims in critical sections|insufficient for a premium release/i;
  const hasFatalBlockedReason = qualityGate.blocked_release_reasons.some((reason) => fatalBlockedReasonPattern.test(reason));
  const decisionMemoState = qualityGate.section_states.decision_memo;
  const decisionMemoScore = qualityGate.section_scores.decision_memo ?? 0;
  const briefState = qualityGate.section_states.five_minute_brief;
  const briefScore = qualityGate.section_scores.five_minute_brief ?? 0;
  const hasUsableDecisionMemo = Boolean(
    sections.decision_memo
    && decisionMemoState !== "rerun"
    && decisionMemoState !== "suppress"
    && decisionMemoScore >= 65
  );
  const hasRecoverableDecisionMemo = Boolean(
    sections.decision_memo
    && decisionMemoState !== "suppress"
    && decisionMemoScore >= 55
  );
  const hasUsableBrief = Boolean(
    sections.five_minute_brief
    && briefState !== "rerun"
    && briefState !== "suppress"
    && briefScore >= 65
  );
  const viableSpineSections = ["why_role_exists_now", "company_role_strategy", "interview_prep", "how_to_win_this_process"] as const;
  const viableSpineCount = viableSpineSections.filter((key) => {
    const state = qualityGate.section_states[key];
    const score = qualityGate.section_scores[key] ?? 0;
    return sections[key] && state !== "suppress" && score >= 55;
  }).length;
  const recoverableBriefingSpineSections = ["why_role_exists_now", "interview_prep", "how_to_win_this_process"] as const;
  const recoverableBriefingSpineCount = recoverableBriefingSpineSections.filter((key) => {
    const state = qualityGate.section_states[key];
    const score = qualityGate.section_scores[key] ?? 0;
    return sections[key] && state !== "suppress" && score >= 55;
  }).length;
  const recoverableStrategicCoreSections = ["company_role_strategy", "credibility_layer"] as const;
  const recoverableStrategicCoreCount = recoverableStrategicCoreSections.filter((key) => {
    const state = qualityGate.section_states[key];
    const score = qualityGate.section_scores[key] ?? 0;
    return sections[key] && state !== "suppress" && score >= 55;
  }).length;
  const recoverableDecisionSupportSections = ["five_minute_brief", "why_role_exists_now"] as const;
  const recoverableDecisionSupportCount = recoverableDecisionSupportSections.filter((key) => {
    const state = qualityGate.section_states[key];
    const score = qualityGate.section_scores[key] ?? 0;
    return sections[key] && state !== "suppress" && score >= 55;
  }).length;
  const weakCriticalSections = ["company_role_strategy", "interview_prep", "how_to_win_this_process", "credibility_layer"] as const;
  const weakCriticalCount = weakCriticalSections.filter((key) => {
    const state = qualityGate.section_states[key];
    const score = qualityGate.section_scores[key] ?? 0;
    return sections[key] && (state === "rerun" || state === "suppress" || score < 55);
  }).length;
  const totalUsableSections = Object.keys(sections).filter((key) => {
    const state = qualityGate.section_states[key];
    const score = qualityGate.section_scores[key] ?? 0;
    return state !== "suppress" && score >= 55;
  }).length;
  const hasRecoverableBriefingSpine = recoverableBriefingSpineCount >= 2 && weakCriticalCount <= 1;
  const hasRecoverableStrategicCore = recoverableStrategicCoreCount >= 2
    && (recoverableDecisionSupportCount >= 1 || hasRecoverableDecisionMemo);

  if (
    hasFatalBlockedReason
    || !hasRecoverableDecisionMemo
      || totalUsableSections < 3
      || (viableSpineCount < 2 && !hasRecoverableBriefingSpine && !hasRecoverableStrategicCore)
  ) {
    return {
      ...qualityGate,
      release_decision: "suppress_and_release",
      warning_flags: dedupeStrings([
        ...qualityGate.warning_flags,
        "Premium quality bar was not met; the report was still released with explicit low-confidence qualifiers in affected sections.",
      ]),
      reasoning_summary: `${qualityGate.reasoning_summary} Persisted as a low-confidence draft instead of failing generation.`,
    };
  }

  return {
    ...qualityGate,
    release_decision: qualityGate.suppressed_sections.length > 0 || !hasUsableDecisionMemo || !hasUsableBrief ? "suppress_and_release" : "partial",
    warning_flags: dedupeStrings([
      ...qualityGate.warning_flags,
      "Premium quality bar was not fully met; the strongest available draft was persisted with degraded sections clearly labeled.",
    ]),
    reasoning_summary: `${qualityGate.reasoning_summary} Persisted as a degraded draft because the decision memo and briefing spine remained serviceable.`,
  };
}

export function ensureRequiredSectionsForPersistence(args: {
  sections: Record<string, PremiumSectionContent>;
  hasResumeOverlay: boolean;
  fallbackSections: Record<string, PremiumSectionContent>;
}): Record<string, PremiumSectionContent> {
  if (!args.hasResumeOverlay || args.sections.candidate_fit || !args.fallbackSections.candidate_fit) {
    return args.sections;
  }

  return {
    ...args.sections,
    candidate_fit: {
      ...args.fallbackSections.candidate_fit,
      evidence: {
        threshold: args.fallbackSections.candidate_fit.evidence?.threshold ?? "resume overlay",
        status: args.fallbackSections.candidate_fit.evidence?.status ?? "partial",
        confidence: args.fallbackSections.candidate_fit.evidence?.confidence ?? "medium",
        note: `${args.fallbackSections.candidate_fit.evidence?.note ?? "Candidate fit is being preserved for personalization."} Resume overlay refresh requires this section to remain persisted.`,
      },
    },
  };
}

async function evaluateDraft(args: {
  companyName: string;
  roleTitle: string;
  persona: ReturnType<typeof inferPremiumPersona>;
  evidenceQuality: ReturnType<typeof assessPremiumEvidenceQuality>;
  coverage: ReturnType<typeof buildPremiumSourceCoverageSummary>;
  personaQa: ReturnType<typeof assessPremiumPersonaQa>;
  sections: Record<string, PremiumSectionContent>;
  orderedDefinitions: typeof PREMIUM_SECTION_DEFINITIONS;
  hasRetry: boolean;
}): Promise<{ evaluation: PremiumEvaluationModelOutput; usage: ReportTokenUsage["calls"][number] }> {
  const prompt = getPremiumEvaluationPrompt({
    companyName: args.companyName,
    roleTitle: args.roleTitle,
    persona: args.persona,
    evidenceQuality: args.evidenceQuality,
    coverage: args.coverage,
    personaQa: args.personaQa,
    sections: args.orderedDefinitions
      .filter((definition) => definition.key !== "operations_and_cost")
      .map((definition) => ({
        key: definition.key,
        title: definition.title,
        content: args.sections[definition.key],
      }))
      .filter((section) => Boolean(section.content)),
    hasRetry: args.hasRetry,
  });

  const { data, usage } = await generatePremiumEvaluation(prompt);
  return { evaluation: data, usage };
}

export { evaluateDraft };

export async function buildPremiumDraft(args: {
  retrievalState: PremiumRetrievalState;
  companyName: string;
  roleTitle: string;
  jobDescription?: string;
  profileContext?: string;
  persona: ReturnType<typeof inferPremiumPersona>;
  qualityGate: PremiumQualityGateResult | null;
  promptBuilder?: PremiumRuntimeConfig["promptBuilder"];
}): Promise<{
  data: PremiumReportModelOutput;
  usage: ReportTokenUsage["calls"][number];
  wrappedSections: Record<string, PremiumSectionContent>;
  personaQa: ReturnType<typeof assessPremiumPersonaQa>;
}> {
  const prompt = await (args.promptBuilder ?? getPremiumReportPromptV2)(
    args.retrievalState.context,
    args.companyName,
    args.roleTitle,
    args.jobDescription,
    args.profileContext,
    args.retrievalState.evidenceQuality,
    args.retrievalState.coverage,
    args.persona,
    args.qualityGate?.repair_instructions
  );

  const { data, usage } = await generatePremiumReport(prompt);
  const wrappedSections = buildWrappedSections(PREMIUM_SECTION_DEFINITIONS, data.sections);
  const personaQa = assessPremiumPersonaQa(args.persona, wrappedSections);

  return {
    data,
    usage,
    wrappedSections,
    personaQa,
  };
}

export async function persistPremiumReportArtifacts(args: {
  requestId: string;
  request: Awaited<ReturnType<typeof getDeepDiveRequest>> extends infer RequestType
    ? Exclude<RequestType, null>
    : never;
  companyName: string;
  persona: ReturnType<typeof inferPremiumPersona>;
  presentationPlan: ReturnType<typeof getPremiumPresentationPlan>;
  orderedDefinitions: typeof PREMIUM_SECTION_DEFINITIONS;
  retrievalState: PremiumRetrievalState;
  latestResearchPlan: ResearchPlan | null;
  totalRetrievalDurationMs: number;
  totalSynthesisDurationMs: number;
  llmCalls: ReportTokenUsage["calls"];
  finalData: PremiumReportModelOutput;
  wrappedSections: Record<string, PremiumSectionContent>;
  personaQa: ReturnType<typeof assessPremiumPersonaQa>;
  qualityGate: PremiumQualityGateResult;
  targetedRetrievalLoops: number;
  assemblyStartedAt: number;
  runId?: string;
  runtime?: PremiumRuntimeConfig;
}): Promise<Report> {
  const runId = args.runId ?? randomUUID();
  const runtime: PremiumRuntimeConfig = args.runtime ?? {
    reportFormat: "premium_v2",
    generatorVersion: "premium_v2_default",
    promptBuilder: getPremiumReportPromptV2,
  };
  const resolvedQualityGate = resolveQualityGateForPersistence(args.qualityGate, args.wrappedSections);
  const gatedSections = ensureRequiredSectionsForPersistence({
    sections: applyQualityGateToSections(args.wrappedSections, resolvedQualityGate),
    hasResumeOverlay: Boolean(args.request.profile_context?.trim()),
    fallbackSections: args.wrappedSections,
  });
  const tokenUsage: ReportTokenUsage = {
    calls: args.llmCalls,
    total_tokens: args.llmCalls.reduce((sum, call) => sum + call.input_tokens + call.output_tokens, 0),
    total_cost_usd: args.llmCalls.reduce((sum, call) => sum + call.estimated_cost_usd, 0),
  };

  const scores = {
    company_momentum: clampScore(args.finalData.scorecard?.company_momentum, 6),
    org_clarity: clampScore(args.finalData.scorecard?.org_clarity, 5),
    role_leverage: clampScore(args.finalData.scorecard?.role_leverage, 6),
    execution_risk: clampScore(args.finalData.scorecard?.execution_risk, 5),
    candidate_fit: clampScore(args.finalData.scorecard?.candidate_fit, args.request.profile_context?.trim() ? 5 : 0),
  };

  const report = await createReport(
    args.requestId,
    toValidRecommendation(args.finalData.report_recommendation),
    scores,
    {
      token_usage: tokenUsage,
      report_format: runtime.reportFormat,
      report_family: "premium",
      generator_version: runtime.generatorVersion,
      evidence_quality: args.retrievalState.evidenceQuality,
      source_coverage: args.retrievalState.coverage,
      persona_qa: args.personaQa,
      quality_gate: resolvedQualityGate,
      persona_profile: args.persona,
      presentation_plan: args.presentationPlan,
      retrieval_queries: args.retrievalState.normalizedQueries,
      research_plan: args.latestResearchPlan
        ? {
            strategy_summary: args.latestResearchPlan.strategySummary,
            selected_sources: args.latestResearchPlan.selectedSources,
            retrieval_queries: args.latestResearchPlan.retrievalQueries,
            source_strategy: args.latestResearchPlan.sourceStrategy,
          }
        : null,
    },
    {
      ai_query_count: tokenUsage.calls.length,
      source_count: args.retrievalState.sources.length,
      source_host_count: new Set(
        args.retrievalState.sources.map((source) => getHostname(source.url)).filter((host): host is string => Boolean(host))
      ).size,
    },
    {
      report_format: runtime.reportFormat,
      report_family: "premium",
    }
  );

  const persistenceStartedAt = Date.now();
  const initialLedger = buildPremiumCostLedger({
    reportId: report.id,
    requestId: args.requestId,
    runId,
    companyName: args.companyName,
    roleTitle: args.request.role_title,
    persona: args.persona,
    tokenUsage,
    primaryUsage: args.llmCalls[0],
    sources: args.retrievalState.sources,
    retrievalQueries: args.retrievalState.normalizedQueries,
    evidenceQuality: args.retrievalState.evidenceQuality,
    coverage: args.retrievalState.coverage,
    personaQa: args.personaQa,
    qualityGate: resolvedQualityGate,
    hasResumeOverlay: Boolean(args.request.profile_context?.trim()),
    durations: {
      retrieval_ms: args.totalRetrievalDurationMs,
      synthesis_ms: args.totalSynthesisDurationMs,
      persistence_ms: 0,
      total_ms: Date.now() - args.assemblyStartedAt,
    },
    targetedRetrievalLoops: args.targetedRetrievalLoops,
  });

  const citations = buildReportCitations(args.retrievalState.context.chunks, args.request.company_url ?? undefined);

  for (const [index, sectionDefinition] of args.orderedDefinitions.entries()) {
    const displayTitle = args.presentationPlan.titleBySectionKey[sectionDefinition.key] ?? sectionDefinition.title;
    const content = sectionDefinition.key === "operations_and_cost"
      ? buildPremiumOperationsSection(tokenUsage, args.retrievalState.evidenceQuality, args.retrievalState.coverage, initialLedger)
      : gatedSections[sectionDefinition.key];

    if (!content) {
      continue;
    }

    await createReportSection(
      report.id,
      sectionDefinition.key,
      displayTitle,
      JSON.stringify(content),
      index,
      sectionDefinition.key === "operations_and_cost" ? undefined : citations
    );
  }

  const persistenceDurationMs = Date.now() - persistenceStartedAt;
  await updateReportSummaryJson(report.id, {
    token_usage: tokenUsage,
    report_format: runtime.reportFormat,
    report_family: "premium",
    generator_version: runtime.generatorVersion,
    evidence_quality: args.retrievalState.evidenceQuality,
    source_coverage: args.retrievalState.coverage,
    persona_qa: args.personaQa,
    quality_gate: resolvedQualityGate,
    persona_profile: args.persona,
    presentation_plan: args.presentationPlan,
    retrieval_queries: args.retrievalState.normalizedQueries,
    research_plan: args.latestResearchPlan
      ? {
          strategy_summary: args.latestResearchPlan.strategySummary,
          selected_sources: args.latestResearchPlan.selectedSources,
          retrieval_queries: args.latestResearchPlan.retrievalQueries,
          source_strategy: args.latestResearchPlan.sourceStrategy,
        }
      : null,
    cost_ledger: buildPremiumCostLedger({
      reportId: report.id,
      requestId: args.requestId,
      runId,
      companyName: args.companyName,
      roleTitle: args.request.role_title,
      persona: args.persona,
      tokenUsage,
      primaryUsage: args.llmCalls[0],
      sources: args.retrievalState.sources,
      retrievalQueries: args.retrievalState.normalizedQueries,
      evidenceQuality: args.retrievalState.evidenceQuality,
      coverage: args.retrievalState.coverage,
      personaQa: args.personaQa,
      qualityGate: resolvedQualityGate,
      hasResumeOverlay: Boolean(args.request.profile_context?.trim()),
      durations: {
        retrieval_ms: args.totalRetrievalDurationMs,
        synthesis_ms: args.totalSynthesisDurationMs,
        persistence_ms: persistenceDurationMs,
        total_ms: Date.now() - args.assemblyStartedAt,
      },
      targetedRetrievalLoops: args.targetedRetrievalLoops,
    }),
  });

  return report;
}

async function assemblePremiumReportVersioned(
  requestId: string,
  researchPlanOrQueries: ResearchPlan | string[] | undefined,
  runtime: PremiumRuntimeConfig
): Promise<Report | null> {
  const assemblyStartedAt = Date.now();
  const runId = randomUUID();
  const request = await getDeepDiveRequest(requestId);
  if (!request) {
    throw new Error("Request not found");
  }

  const persona = inferPremiumPersona(
    request.role_title,
    request.job_description ?? undefined,
    request.profile_context ?? undefined
  );
  const presentationPlan = getPremiumPresentationPlan(persona);

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", request.company_id)
    .single();
  const companyName = company?.name ?? "the company";

  let latestResearchPlan = Array.isArray(researchPlanOrQueries)
    ? null
    : researchPlanOrQueries ?? null;
  const initialQueryList = Array.isArray(researchPlanOrQueries)
    ? researchPlanOrQueries
    : researchPlanOrQueries?.retrievalQueries;
  let normalizedQueries = dedupeStrings([
    ...buildCoreReportQueries({
      companyName,
      roleTitle: request.role_title,
      jobDescription: request.job_description ?? undefined,
      hasCandidateProfile: Boolean(request.profile_context?.trim()),
    }),
    ...(initialQueryList && initialQueryList.length > 0
      ? initialQueryList
      : buildPersonaAwareRetrievalQueries(companyName, request.role_title, request.job_description ?? undefined, persona)),
  ]).slice(0, 10);

  let retrievalState = await buildPremiumRetrievalState({
    requestId,
    queries: normalizedQueries,
    companyName,
    roleTitle: request.role_title,
    persona,
  });
  let totalRetrievalDurationMs = retrievalState.retrievalDurationMs;
  let targetedRetrievalLoops = 0;
  let usedTargetedReretrieval = false;

  await updateDeepDiveStatus(requestId, "generating_report");
  const orderedDefinitions = buildOrderedDefinitions(presentationPlan);
  const llmCalls: ReportTokenUsage["calls"] = [];
  let finalData: PremiumReportModelOutput | null = null;
  let wrappedSections: Record<string, PremiumSectionContent> = {};
  let personaQa = assessPremiumPersonaQa(persona, wrappedSections);
  let qualityGate: PremiumQualityGateResult | null = null;
  let totalSynthesisDurationMs = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const synthesisStartedAt = Date.now();
    const draft = await buildPremiumDraft({
      retrievalState,
      companyName,
      roleTitle: request.role_title,
      jobDescription: request.job_description ?? undefined,
      profileContext: request.profile_context ?? undefined,
      persona,
      qualityGate,
      promptBuilder: runtime.promptBuilder,
    });
    llmCalls.push(draft.usage);
    totalSynthesisDurationMs += Date.now() - synthesisStartedAt;

    finalData = draft.data;
    wrappedSections = draft.wrappedSections;
    personaQa = draft.personaQa;

    const { evaluation, usage: evaluationUsage } = await evaluateDraft({
      companyName,
      roleTitle: request.role_title,
      persona,
      evidenceQuality: retrievalState.evidenceQuality,
      coverage: retrievalState.coverage,
      personaQa,
      sections: wrappedSections,
      orderedDefinitions,
      hasRetry: attempt > 0 || usedTargetedReretrieval,
    });
    llmCalls.push(evaluationUsage);

    qualityGate = finalizePremiumQualityGate({
      evaluation,
      sections: wrappedSections,
      evidenceQuality: retrievalState.evidenceQuality,
      coverage: retrievalState.coverage,
      personaQa,
      persona,
      hasRetry: attempt > 0 || usedTargetedReretrieval,
    });

    if (shouldRunTargetedReretrieval({
      qualityGate,
      coverage: retrievalState.coverage,
      personaQa,
      alreadyReranRetrieval: usedTargetedReretrieval,
    })) {
      const nextQueries = buildTargetedReretrievalQueries({
        companyName,
        roleTitle: request.role_title,
        persona,
        existingQueries: retrievalState.normalizedQueries,
        qualityGate,
        personaQa,
      });
      const nextSourceUrls = await buildTargetedReretrievalSourceUrls({
        companyName,
        roleTitle: request.role_title,
        companyUrl: request.company_url ?? undefined,
        qualityGate,
        coverage: retrievalState.coverage,
        enableHomepageDiscovery: true,
      });

      latestResearchPlan = latestResearchPlan
        ? {
            ...latestResearchPlan,
            retrievalQueries: dedupeStrings([...(latestResearchPlan.retrievalQueries ?? []), ...nextQueries]),
            selectedSources: [
              ...(latestResearchPlan.selectedSources ?? []),
              ...nextSourceUrls.map((url): PlannedSource => ({ url, type: "custom_url", priority: 5 })),
            ],
          }
        : null;
      normalizedQueries = nextQueries;
      retrievalState = await buildPremiumRetrievalState({
        requestId,
        queries: normalizedQueries,
        companyName,
        roleTitle: request.role_title,
        persona,
      });
      totalRetrievalDurationMs += retrievalState.retrievalDurationMs;
      targetedRetrievalLoops += 1;
      usedTargetedReretrieval = true;
      continue;
    }

    if (qualityGate.release_decision !== "resynthesize" && qualityGate.release_decision !== "depth_repair") {
      break;
    }
  }

  if (!finalData || !qualityGate) {
    throw new Error("Premium report generation did not produce a final draft.");
  }

  return await persistPremiumReportArtifacts({
    requestId,
    request,
    companyName,
    persona,
    presentationPlan,
    orderedDefinitions,
    retrievalState,
    latestResearchPlan,
    totalRetrievalDurationMs,
    totalSynthesisDurationMs,
    llmCalls,
    finalData,
    wrappedSections,
    personaQa,
    qualityGate,
    targetedRetrievalLoops,
    assemblyStartedAt,
    runId,
    runtime,
  });
}

export async function assemblePremiumReportV2(
  requestId: string,
  researchPlanOrQueries?: ResearchPlan | string[]
): Promise<Report | null> {
  return assemblePremiumReportVersioned(requestId, researchPlanOrQueries, {
    reportFormat: "premium_v2",
    generatorVersion: "premium_v2_default",
    promptBuilder: getPremiumReportPromptV2,
  });
}

export async function assemblePremiumReportV3(
  requestId: string,
  researchPlanOrQueries?: ResearchPlan | string[]
): Promise<Report | null> {
  return assemblePremiumReportVersioned(requestId, researchPlanOrQueries, {
    reportFormat: "premium_v3",
    generatorVersion: "premium_v3_default",
    promptBuilder: getPremiumReportPromptV3,
  });
}

import { PremiumSectionContent } from "@/lib/report/premiumTypes";
import { PremiumPersonaProfile } from "@/lib/report/premiumPersona";
import type { PremiumQualityGateResult } from "@/lib/report/premiumQualityGate";
import { RetrievalResult } from "@/lib/retrieval/search";
import { LLMCallUsage, ReportTokenUsage, Source } from "@/lib/types";

export interface PremiumEvidenceQuality {
  raw_chunk_count: number;
  final_chunk_count: number;
  distinct_source_count: number;
  distinct_source_types: number;
  rating: "strong" | "moderate" | "weak" | "insufficient";
  warnings: string[];
}

export interface PremiumSourceCoverageSummary {
  total_sources: number;
  distinct_hosts: number;
  distinct_source_types: number;
  primary_sources_used: number;
  recent_sources: number;
  reranked_chunks: number;
  retrieval_queries: string[];
  source_type_breakdown: Array<{ type: string; count: number }>;
  persona_source_class_audit: PremiumSourceClassAudit;
  notes: string[];
}

export interface PremiumSourceClassMatch {
  sourceId: string;
  title: string;
  sourceType: string;
}

export interface PremiumSourceClassAuditEntry {
  sourceClass: string;
  satisfied: boolean;
  matches: PremiumSourceClassMatch[];
}

export interface PremiumSourceClassAudit {
  mandatory: PremiumSourceClassAuditEntry[];
  preferred: PremiumSourceClassAuditEntry[];
  optional: PremiumSourceClassAuditEntry[];
  satisfiedMandatoryCount: number;
  satisfiedPreferredCount: number;
  missingMandatory: string[];
  missingPreferred: string[];
}

export interface PremiumPersonaQaCheck {
  check: string;
  status: "pass" | "warn";
  note: string;
}

export interface PremiumPersonaQaSummary {
  overallStatus: "pass" | "warn";
  checks: PremiumPersonaQaCheck[];
  warnings: string[];
}

interface PremiumCostLedgerArgs {
  reportId: string;
  requestId: string;
  runId: string;
  companyName: string;
  roleTitle: string;
  persona: PremiumPersonaProfile;
  tokenUsage: ReportTokenUsage;
  primaryUsage: LLMCallUsage;
  sources: Source[];
  retrievalQueries: string[];
  evidenceQuality: PremiumEvidenceQuality;
  coverage: PremiumSourceCoverageSummary;
  personaQa: PremiumPersonaQaSummary;
  qualityGate: PremiumQualityGateResult;
  hasResumeOverlay: boolean;
  durations: {
    retrieval_ms: number;
    synthesis_ms: number;
    persistence_ms: number;
    total_ms: number;
  };
  targetedRetrievalLoops?: number;
}

const PRIMARY_SOURCE_TYPES = new Set(["job_description", "company_homepage", "newsroom", "blog"]);

const SOURCE_CLASS_KEYWORDS: Record<string, string[]> = {
  job_description: ["responsibilities", "requirements", "qualifications", "job description", "what you'll do", "about the role"],
  product_surfaces: ["product", "platform", "pricing", "features", "workflow", "dashboard"],
  leadership_strategy: ["strategy", "leadership", "ceo", "executive", "vision", "roadmap", "business model"],
  investor_materials: ["investor", "earnings", "annual report", "shareholder", "revenue", "guidance"],
  pricing_packaging: ["pricing", "plans", "packaging", "subscription", "tier"],
  competitor_positioning: ["competitive", "comparison", "market", "competitor", "alternative"],
  engineering_docs: ["architecture", "system design", "distributed", "developer", "documentation", "sdk", "api"],
  technical_context: ["latency", "reliability", "performance", "scale", "infra", "security"],
  engineering_blog: ["engineering", "how we built", "technical blog", "dev blog", "postmortem"],
  security_reliability: ["security", "incident", "reliability", "sre", "compliance", "availability"],
  oss_signals: ["github", "open source", "repository", "oss"],
  experience_signals: ["experience", "ux", "ui", "research", "journey", "prototype"],
  design_system: ["design system", "component", "tokens", "accessibility", "patterns"],
  research_culture: ["research", "usability", "insight", "interviews", "participants"],
  brand_experience: ["brand", "creative", "campaign", "visual identity"],
  data_ml_context: ["machine learning", "data", "model", "analytics", "experimentation", "statistics"],
  measurement_signals: ["metric", "measurement", "ab test", "experiment", "causal", "forecast"],
  ai_launches: ["ai", "ml", "model", "copilot", "assistant", "genai"],
  experimentation_materials: ["experiment", "ab testing", "measurement", "hypothesis"],
  platform_docs: ["platform", "docs", "developer", "api", "sdk"],
  messaging_signals: ["messaging", "positioning", "narrative", "campaign", "story"],
  launch_motion: ["launch", "announcement", "rollout", "ga", "beta"],
  customer_evidence: ["customer", "case study", "testimonial", "adoption"],
  analyst_narratives: ["gartner", "forrester", "analyst", "mq"],
  brand_assets: ["brand", "logo", "style guide", "creative"],
  revenue_motion: ["sales", "pipeline", "quota", "revenue", "territory", "forecast"],
  customer_segments: ["enterprise", "mid-market", "smb", "customer segment", "buyer"],
  partner_ecosystem: ["partner", "alliances", "channel", "ecosystem"],
  enablement_signals: ["enablement", "playbook", "sales deck", "objection"],
  pricing_exposure: ["pricing", "deal", "discount", "package"],
  buyer_journey: ["buyer", "evaluation", "procurement", "decision process"],
  operating_model: ["operating model", "cadence", "governance", "ritual", "program"],
  governance_signals: ["governance", "risk", "controls", "audit", "policy"],
  transformation_context: ["transformation", "change management", "reorg", "operating model"],
  dependency_map: ["dependency", "cross-functional", "handoff", "critical path"],
  execution_cadence: ["cadence", "quarterly", "planning", "milestone", "operating rhythm"],
  leadership_commentary: ["leadership", "ceo", "executive", "mandate", "strategy"],
  org_design_signals: ["org design", "headcount", "team structure", "reorg"],
  portfolio_strategy: ["portfolio", "business unit", "category", "moat"],
  capital_allocation: ["capital allocation", "investment", "efficiency", "margin", "p&l"],
  analyst_coverage: ["analyst", "coverage", "industry report"],
  external_validation: ["press", "review", "coverage", "forum"],
  developer_community: ["community", "developer", "forum", "stack overflow"],
  portfolio_expectations: ["portfolio", "case study", "presentation", "artifact"],
  research_outputs: ["paper", "research", "publication", "benchmark"],
};

const PERSONA_QA_PATTERNS: Record<PremiumPersonaProfile["roleFamily"], string[]> = {
  product: ["product strategy", "roadmap", "prioritization", "metrics"],
  engineering: ["system design", "architecture", "reliability", "scalability"],
  design: ["design critique", "interaction", "ux", "visual craft"],
  data_ml: ["experiment", "model", "measurement", "causal"],
  marketing: ["positioning", "messaging", "launch", "segmentation"],
  sales_gtm: ["pipeline", "quota", "objection", "territory"],
  operations_program: ["governance", "cadence", "program", "operating model"],
  executive: ["mandate", "portfolio", "board", "capital allocation"],
};

const EXECUTIVE_OVERREAD_PATTERNS = [
  "p&l",
  "p and l",
  "capital allocation",
  "board",
  "business unit",
  "org design",
  "portfolio",
  "manager of managers",
];

const PRODUCT_INTERVIEW_DRIFT_PATTERNS = [
  "system design",
  "distributed systems",
  "architecture tradeoffs",
  "api design",
  "latency",
  "reliability",
  "throughput",
];

function getHostname(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function daysSince(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;

  const parsed = new Date(dateValue).getTime();
  if (Number.isNaN(parsed)) return null;

  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

function asUsdBand(totalCostUsd: number): "low" | "medium" | "high" {
  if (totalCostUsd < 0.03) return "low";
  if (totalCostUsd < 0.12) return "medium";
  return "high";
}

function sourceTypeBreakdown(sources: Source[]): Array<{ type: string; count: number }> {
  const counts = new Map<string, number>();

  for (const source of sources) {
    counts.set(source.source_type, (counts.get(source.source_type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
}

function getSourceSearchText(source: Source): string {
  return [source.title, source.url, source.cleaned_content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sourceMatchesClass(source: Source, sourceClass: string): boolean {
  if (sourceClass === "job_description") {
    return source.source_type === "job_description";
  }

  const keywords = SOURCE_CLASS_KEYWORDS[sourceClass] ?? [];
  if (!keywords.length) {
    return false;
  }

  const searchText = getSourceSearchText(source);
  return keywords.some((keyword) => searchText.includes(keyword));
}

export function auditPersonaSourceCoverage(
  sources: Source[],
  persona: PremiumPersonaProfile
): PremiumSourceClassAudit {
  const buildEntries = (sourceClasses: string[]): PremiumSourceClassAuditEntry[] =>
    sourceClasses.map((sourceClass) => {
      const matches = sources
        .filter((source) => sourceMatchesClass(source, sourceClass))
        .map((source) => ({
          sourceId: source.id,
          title: source.title,
          sourceType: source.source_type,
        }));

      return {
        sourceClass,
        satisfied: matches.length > 0,
        matches,
      };
    });

  const mandatory = buildEntries(persona.retrievalProfile.mandatorySourceClasses);
  const preferred = buildEntries(persona.retrievalProfile.preferredSourceClasses);
  const optional = buildEntries(persona.retrievalProfile.optionalSourceClasses);

  return {
    mandatory,
    preferred,
    optional,
    satisfiedMandatoryCount: mandatory.filter((entry) => entry.satisfied).length,
    satisfiedPreferredCount: preferred.filter((entry) => entry.satisfied).length,
    missingMandatory: mandatory.filter((entry) => !entry.satisfied).map((entry) => entry.sourceClass),
    missingPreferred: preferred.filter((entry) => !entry.satisfied).map((entry) => entry.sourceClass),
  };
}

function flattenSectionText(sections: Record<string, PremiumSectionContent>): string {
  return Object.values(sections)
    .flatMap((section) => [
      section.summary,
      ...(section.bullets ?? []),
      ...(section.callouts?.map((callout) => callout.value) ?? []),
      ...(section.facts?.map((fact) => fact.value) ?? []),
      ...(section.blocks?.flatMap((block) => [block.title, block.body ?? "", ...(block.bullets ?? [])]) ?? []),
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function assessPremiumPersonaQa(
  persona: PremiumPersonaProfile,
  sections: Record<string, PremiumSectionContent>
): PremiumPersonaQaSummary {
  const text = flattenSectionText(sections);
  const interviewPrepText = flattenSectionText(
    Object.fromEntries(
      Object.entries(sections).filter(([key]) => key === "interview_prep" || key === "how_to_win_this_process")
    )
  );
  const expectedPatterns = PERSONA_QA_PATTERNS[persona.primaryRoleFamily] ?? [];
  const checks: PremiumPersonaQaCheck[] = [];

  const expectedHit = expectedPatterns.some((pattern) => text.includes(pattern));
  checks.push({
    check: "persona_domain_alignment",
    status: expectedHit ? "pass" : "warn",
    note: expectedHit
      ? `Generated language includes ${persona.roleFamilyLabel.toLowerCase()}-specific proof signals.`
      : `Generated language lacks clear ${persona.roleFamilyLabel.toLowerCase()}-specific proof signals.`,
  });

  if (persona.primaryRoleFamily !== "product") {
    const productLeakage = PERSONA_QA_PATTERNS.product.filter((pattern) => text.includes(pattern));
    checks.push({
      check: "product_centric_leakage",
      status: productLeakage.length ? "warn" : "pass",
      note: productLeakage.length
        ? `Detected product-centric framing in a ${persona.roleFamilyLabel.toLowerCase()} report: ${productLeakage.join(", ")}.`
        : "No generic product-manager framing detected.",
    });
  }

  const leadershipSignals = ["team", "organization", "executive", "portfolio", "headcount", "stakeholder"];
  const executionSignals = ["hands-on", "implementation", "deliver", "system design", "artifact", "case study"];
  const seniorityNeedsLeadership = ["director", "senior_director_vp", "executive_gm_c_level"].includes(persona.seniority);
  const senioritySignalHit = (seniorityNeedsLeadership ? leadershipSignals : executionSignals).some((signal) => text.includes(signal));
  checks.push({
    check: "seniority_proof_alignment",
    status: senioritySignalHit ? "pass" : "warn",
    note: senioritySignalHit
      ? `Generated language reflects ${persona.seniorityLabel.toLowerCase()} proof expectations.`
      : `Generated language is light on ${persona.seniorityLabel.toLowerCase()} proof expectations.`,
  });

  if (persona.primaryRoleFamily === "product" && persona.seniority !== "senior_director_vp" && persona.seniority !== "executive_gm_c_level") {
    const executiveOverread = EXECUTIVE_OVERREAD_PATTERNS.filter((pattern) => text.includes(pattern));
    checks.push({
      check: "executive_scope_overread",
      status: executiveOverread.length ? "warn" : "pass",
      note: executiveOverread.length
        ? `Generated language overreads executive scope for a ${persona.seniorityLabel.toLowerCase()} ${persona.roleFamilyLabel.toLowerCase()} role: ${executiveOverread.join(", ")}.`
        : "No executive-scope overread detected for the inferred product persona.",
    });

    const technicalPmDrift = PRODUCT_INTERVIEW_DRIFT_PATTERNS.filter((pattern) => interviewPrepText.includes(pattern));
    checks.push({
      check: "technical_pm_interview_drift",
      status: technicalPmDrift.length >= 2 ? "warn" : "pass",
      note: technicalPmDrift.length >= 2
        ? `Interview prep drifts into engineering-specific theater for a product role: ${technicalPmDrift.join(", ")}.`
        : "Interview prep stays anchored to product-proof expectations rather than engineering theater.",
    });
  }

  if (persona.isBlendedPersona && persona.secondaryRoleFamily) {
    const blendHit = [persona.primaryRoleFamily, persona.secondaryRoleFamily]
      .some((family) => (PERSONA_QA_PATTERNS[family] ?? []).some((pattern) => text.includes(pattern)));
    checks.push({
      check: "mixed_role_handling",
      status: blendHit ? "pass" : "warn",
      note: blendHit
        ? "Generated language reflects the mixed-role blend signaled by the inferred persona."
        : "Mixed-role persona was inferred, but the report reads too single-track.",
    });

    const secondaryPatternHit = (PERSONA_QA_PATTERNS[persona.secondaryRoleFamily] ?? []).some((pattern) => text.includes(pattern));
    checks.push({
      check: "blended_persona_coherence",
      status: secondaryPatternHit ? "pass" : "warn",
      note: secondaryPatternHit
        ? `Generated language reflects the secondary ${persona.secondaryRoleFamilyLabel?.toLowerCase() ?? "secondary"} mandate without losing coherence.`
        : `The secondary ${persona.secondaryRoleFamilyLabel?.toLowerCase() ?? "secondary"} mandate is weak or missing in the final report language.`,
    });
  } else if (persona.secondaryRoleFamily) {
    checks.push({
      check: "secondary_persona_suppression",
      status: persona.suppressedSecondaryPersonaReason ? "pass" : "warn",
      note: persona.suppressedSecondaryPersonaReason
        ? persona.suppressedSecondaryPersonaReason
        : "A secondary persona was detected but suppression reasoning was not recorded.",
    });
  }

  const warnings = checks.filter((check) => check.status === "warn").map((check) => check.note);
  return {
    overallStatus: warnings.length ? "warn" : "pass",
    checks,
    warnings,
  };
}

export function assessPremiumEvidenceQuality(
  rawResults: RetrievalResult[],
  reranked: RetrievalResult[]
): PremiumEvidenceQuality {
  const distinctSources = new Set(reranked.map((result) => result.source.id));
  const distinctTypes = new Set(reranked.map((result) => result.source.source_type));

  const warnings: string[] = [];
  if (reranked.length < 6) warnings.push("Very few chunks available; strategic coverage may be thin.");
  if (distinctSources.size <= 1) warnings.push("All evidence comes from a single source; conclusions may be one-sided.");
  if (distinctSources.size <= 2) warnings.push("Source diversity is low; key claims may not be well corroborated.");
  if (!distinctTypes.has("job_description")) warnings.push("No exact job description was captured; role scope is partially inferred.");
  if (!distinctTypes.has("newsroom") && !distinctTypes.has("blog")) warnings.push("Recent official company signals are limited; freshness is weaker than ideal.");

  let rating: PremiumEvidenceQuality["rating"] = "insufficient";
  if (reranked.length >= 12 && distinctSources.size >= 3 && distinctTypes.size >= 2) {
    rating = "strong";
  } else if (reranked.length >= 6 && distinctSources.size >= 2) {
    rating = "moderate";
  } else if (reranked.length >= 3) {
    rating = "weak";
  }

  return {
    raw_chunk_count: rawResults.length,
    final_chunk_count: reranked.length,
    distinct_source_count: distinctSources.size,
    distinct_source_types: distinctTypes.size,
    rating,
    warnings,
  };
}

export function buildPremiumSourceCoverageSummary(
  sources: Source[],
  reranked: RetrievalResult[],
  retrievalQueries: string[],
  persona: PremiumPersonaProfile
): PremiumSourceCoverageSummary {
  const distinctHosts = new Set(
    sources.map((source) => getHostname(source.url)).filter((host): host is string => Boolean(host))
  );
  const recentSources = sources.filter((source) => {
    const publishedDays = daysSince(source.published_at);
    const fetchedDays = daysSince(source.fetched_at);
    const effectiveDays = publishedDays ?? fetchedDays;
    return effectiveDays !== null && effectiveDays <= 180;
  }).length;
  const sourceTypes = sourceTypeBreakdown(sources);
  const personaSourceAudit = auditPersonaSourceCoverage(sources, persona);

  const notes: string[] = [];
  if (!sources.length) notes.push("No persisted sources were attached to the request.");
  if (!sourceTypes.some((entry) => entry.type === "job_description")) notes.push("The premium path is missing a first-party job description source.");
  if (!sourceTypes.some((entry) => entry.type === "newsroom" || entry.type === "blog")) notes.push("Official freshness signals are weak; retrieval leaned on non-official sources or static pages.");
  if (distinctHosts.size < 3) notes.push("Domain diversity is limited for a premium report.");
  if (personaSourceAudit.missingMandatory.length) notes.push(`Persona-required source classes still missing: ${personaSourceAudit.missingMandatory.join(", ")}.`);

  return {
    total_sources: sources.length,
    distinct_hosts: distinctHosts.size,
    distinct_source_types: sourceTypes.length,
    primary_sources_used: sources.filter((source) => PRIMARY_SOURCE_TYPES.has(source.source_type)).length,
    recent_sources: recentSources,
    reranked_chunks: reranked.length,
    retrieval_queries: retrievalQueries,
    source_type_breakdown: sourceTypes,
    persona_source_class_audit: personaSourceAudit,
    notes,
  };
}

export function buildPremiumCostLedger({
  reportId,
  requestId,
  runId,
  companyName,
  roleTitle,
  persona,
  tokenUsage,
  primaryUsage,
  sources,
  retrievalQueries,
  evidenceQuality,
  coverage,
  personaQa,
  qualityGate,
  hasResumeOverlay,
  durations,
  targetedRetrievalLoops = 0,
}: PremiumCostLedgerArgs): Record<string, unknown> {
  const totalCostUsd = tokenUsage.total_cost_usd;
  const totalDurationMs = durations.total_ms;
  const visibleBand = asUsdBand(totalCostUsd);
  const evaluationCalls = tokenUsage.calls.filter((call) => call.purpose === "Premium Quality Evaluation");
  const evaluationCostUsd = evaluationCalls.reduce((sum, call) => sum + call.estimated_cost_usd, 0);
  const evaluationDurationMs = Math.max(0, durations.total_ms - durations.retrieval_ms - durations.synthesis_ms - durations.persistence_ms);
  const repairLoops = Math.max(0, tokenUsage.calls.filter((call) => call.purpose === primaryUsage.purpose).length - 1);
  const warningsCount = qualityGate.warning_flags.length;
  const blockedReasonCount = qualityGate.blocked_release_reasons.length;
  const promptImprovementCount = qualityGate.prompt_improvement_recommendations.length;
  const releasedReport = qualityGate.release_decision !== "blocked";
  const personaCorrectionTriggered = personaQa.checks.some(
    (check) => (check.check === "executive_scope_overread" || check.check === "technical_pm_interview_drift" || check.check === "persona_domain_alignment") && check.status === "warn"
  );
  const fitRescoringTriggered = qualityGate.repair_instructions.some((instruction) => /candidate fit|transferability|fit score/i.test(instruction));
  const contradictionRepairTriggered = qualityGate.repair_instructions.some((instruction) => /contradiction|consisten|unsupported claims/i.test(instruction));
  const personaCorrectionReruns = personaCorrectionTriggered ? repairLoops : 0;
  const fitRescoringReruns = fitRescoringTriggered ? repairLoops : 0;
  const contradictionRepairLoops = contradictionRepairTriggered ? repairLoops : 0;
  const repairLoopCostUsd = repairLoops > 0
    ? tokenUsage.calls
        .filter((call, index) => call.purpose === primaryUsage.purpose && index > 0)
        .reduce((sum, call) => sum + call.estimated_cost_usd, 0)
    : 0;

  return {
    report_id: reportId,
    run_id: runId,
    mode: "premium",
    user_id: "unknown",
    company: companyName,
    role_title: roleTitle,
    inferred_primary_role_family: persona.primaryRoleFamily,
    inferred_secondary_role_family: persona.secondaryRoleFamily,
    is_blended_persona: persona.isBlendedPersona,
    inferred_role_family: persona.roleFamily,
    inferred_role_family_confidence: persona.confidence,
    inferred_seniority: persona.seniority,
    inferred_seniority_confidence: persona.confidence,
    inferred_subspecialization: persona.subspecialization,
    inferred_subspecialization_confidence: persona.subspecialization ? persona.confidence : null,
    persona_confidence: persona.confidence,
    persona_reasoning_trace_summary: persona.personaReasoningTraceSummary,
    persona_evidence: persona.personaEvidence,
    mixed_role_flag: persona.mixedRole,
    persona_profile: {
      primary_role_family: persona.primaryRoleFamilyLabel,
      secondary_role_family: persona.secondaryRoleFamilyLabel,
      is_blended: persona.isBlendedPersona,
      role_family: persona.roleFamilyLabel,
      seniority: persona.seniorityLabel,
      subspecialization: persona.subspecialization,
      blend: persona.blend,
      proof_model: persona.interviewFramework,
      stakeholder_model: persona.readingExperienceTemplate,
      interview_model: persona.interviewFramework,
    },
    persona_reading_experience_template: persona.readingExperienceTemplate,
    persona_reading_experience_profile: {
      section_ordering_basis: persona.readingExperienceProfile.sectionOrderingBasis,
      sections_to_expand: persona.readingExperienceProfile.sectionsToExpand,
      sections_to_compress: persona.readingExperienceProfile.sectionsToCompress,
      five_minute_brief_priorities: persona.readingExperienceProfile.fiveMinuteBriefPriorities,
    },
    persona_retrieval_profile: {
      mandatory_source_classes: persona.retrievalProfile.mandatorySourceClasses,
      preferred_source_classes: persona.retrievalProfile.preferredSourceClasses,
      optional_source_classes: persona.retrievalProfile.optionalSourceClasses,
    },
    persona_strategy_profile: {
      dominant_lenses: persona.strategyProfile.dominantLenses,
      sections_to_expand: persona.strategyProfile.sectionsToExpand,
      sections_to_compress: persona.strategyProfile.sectionsToCompress,
    },
    persona_interview_framework: {
      dominant_themes: [persona.interviewFramework],
      dominant_proof_expectations: [persona.seniorityLabel],
      dominant_objections: persona.interviewProfile.dominantObjections,
      dominant_question_types: persona.interviewProfile.dominantQuestionFamilies,
    },
    persona_interview_profile: {
      likely_interviewer_types: persona.interviewProfile.likelyInterviewerTypes,
      dominant_story_requirements: persona.interviewProfile.dominantStoryRequirements,
      dominant_objections: persona.interviewProfile.dominantObjections,
      dominant_question_families: persona.interviewProfile.dominantQuestionFamilies,
    },
    persona_qa_summary: personaQa,
    resume_overlay_enabled: hasResumeOverlay,
    started_at: new Date(Date.now() - totalDurationMs).toISOString(),
    ended_at: new Date().toISOString(),
    currency: "USD",
    status: "success",
    summary: {
      total_cost_usd: totalCostUsd,
      total_duration_ms: totalDurationMs,
      cached_cost_avoided_usd: 0,
      llm_cost_usd: totalCostUsd,
      retrieval_cost_usd: 0,
      embedding_cost_usd: 0,
      rerank_cost_usd: 0,
      storage_cost_usd: 0,
      verification_cost_usd: 0,
      persona_inference_cost_usd: 0,
      persona_deepening_cost_usd: 0,
      blended_retrieval_incremental_cost_usd: 0,
      persona_specific_synthesis_incremental_cost_usd: 0,
      quality_evaluation_cost_usd: evaluationCostUsd,
      depth_evaluation_cost_usd: evaluationCostUsd,
      company_context_evaluation_cost_usd: evaluationCostUsd,
      repair_loop_cost_usd: repairLoopCostUsd,
      persona_correction_reruns: personaCorrectionReruns,
      fit_rescoring_reruns: fitRescoringReruns,
      contradiction_repair_loops: contradictionRepairLoops,
      re_retrieval_quality_gate_cost_usd: 0,
      re_synthesis_quality_gate_cost_usd: repairLoopCostUsd,
      depth_repair_loop_cost_usd: qualityGate.release_decision === "depth_repair" || repairLoops > 0 ? repairLoopCostUsd : 0,
      prompt_improvement_analysis_cost_usd: promptImprovementCount > 0 ? evaluationCostUsd : 0,
      personalization_cost_usd: 0,
      rendering_cost_usd: 0,
    },
    cost_events: tokenUsage.calls.map((call, index) => ({
      event_id: `${runId}:${index + 1}`,
      request_id: requestId,
      stage: "premium_report_generation",
      model: call.model,
      purpose: call.purpose,
      input_tokens: call.input_tokens,
      output_tokens: call.output_tokens,
      reasoning_tokens: call.reasoning_tokens ?? 0,
      estimated_cost_usd: call.estimated_cost_usd,
    })),
    stages: {
      persona_inference: {
        cost_usd: 0,
        duration_ms: 0,
        model: "heuristic_classifier",
        input_tokens: 0,
        output_tokens: 0,
        mixed_role_detected: persona.mixedRole,
        persona_recheck_triggered: false,
        persona_confidence: persona.confidence,
        secondary_persona_suppressed: Boolean(persona.secondaryRoleFamily && !persona.isBlendedPersona),
      },
      source_acquisition: {
        cost_usd: 0,
        duration_ms: durations.retrieval_ms,
        requests: retrievalQueries.length,
        pages_fetched: sources.length,
        pages_retained: coverage.total_sources,
        cache_hit_rate: 0,
        persona_branch: persona.primaryRoleFamily,
        mandatory_source_classes_satisfied: coverage.persona_source_class_audit.satisfiedMandatoryCount,
        preferred_source_classes_satisfied: coverage.persona_source_class_audit.satisfiedPreferredCount,
        missing_mandatory_source_classes: coverage.persona_source_class_audit.missingMandatory,
      },
      parsing_and_cleanup: {
        cost_usd: 0,
        duration_ms: 0,
        documents_parsed: coverage.total_sources,
        tokens_processed: 0,
      },
      embedding: {
        cost_usd: 0,
        duration_ms: 0,
        chunks_embedded: 0,
        tokens_embedded: 0,
        new_vectors: 0,
      },
      retrieval_and_rerank: {
        cost_usd: 0,
        duration_ms: durations.retrieval_ms,
        queries: retrievalQueries.length,
        candidates_scored: evidenceQuality.raw_chunk_count,
        top_k_selected: evidenceQuality.final_chunk_count,
        persona_conditioned_queries: retrievalQueries.length,
        persona_deepening_triggered: persona.isBlendedPersona,
        blended_retrieval_incremental_cost_usd: 0,
        secondary_branch_activated: persona.retrievalProfile.secondaryBranchActivated,
      },
      evidence_normalization: {
        cost_usd: 0,
        duration_ms: 0,
        claims_extracted: evidenceQuality.final_chunk_count,
        claims_retained: evidenceQuality.final_chunk_count,
        conflicts_found: 0,
        persona_conflicts_found: 0,
      },
      strategy_synthesis: {
        cost_usd: totalCostUsd,
        duration_ms: durations.synthesis_ms,
        model: primaryUsage.model,
        input_tokens: primaryUsage.input_tokens,
        output_tokens: primaryUsage.output_tokens,
        persona_template: persona.readingExperienceTemplate,
        persona_specific_synthesis_incremental_cost_usd: 0,
      },
      candidate_fit_synthesis: {
        cost_usd: 0,
        duration_ms: 0,
        model: hasResumeOverlay ? "separate_overlay_pipeline" : "bundled_in_premium_report_call",
        input_tokens: 0,
        output_tokens: 0,
      },
      interview_prep_synthesis: {
        cost_usd: 0,
        duration_ms: 0,
        model: "bundled_in_premium_report_call",
        input_tokens: 0,
        output_tokens: 0,
        persona_framework: persona.interviewFramework,
      },
      verification_and_qa: {
        cost_usd: 0,
        duration_ms: durations.persistence_ms,
        checks_run: personaQa.checks.map((check) => check.check),
        persona_passed: personaQa.overallStatus === "pass",
        persona_recheck_triggered: personaQa.overallStatus !== "pass",
        wrong_persona_detected: personaQa.checks.some(
          (check) => (check.check === "persona_domain_alignment" || check.check === "executive_scope_overread" || check.check === "technical_pm_interview_drift") && check.status === "warn"
        ),
        secondary_persona_suppressed: Boolean(persona.secondaryRoleFamily && !persona.isBlendedPersona),
        warnings: personaQa.warnings,
      },
      quality_evaluation: {
        cost_usd: evaluationCostUsd,
        duration_ms: evaluationDurationMs,
        model: evaluationCalls[0]?.model ?? null,
        input_tokens: evaluationCalls.reduce((sum, call) => sum + call.input_tokens, 0),
        output_tokens: evaluationCalls.reduce((sum, call) => sum + call.output_tokens, 0),
        overall_quality_score: qualityGate.overall_quality_score,
        evidence_quality_score: qualityGate.evidence_score,
        interview_prep_score: qualityGate.interview_prep_score,
        warnings_generated: warningsCount,
      },
      company_context_evaluation: {
        cost_usd: evaluationCostUsd,
        duration_ms: evaluationDurationMs,
        model: evaluationCalls[0]?.model ?? null,
        input_tokens: evaluationCalls.reduce((sum, call) => sum + call.input_tokens, 0),
        output_tokens: evaluationCalls.reduce((sum, call) => sum + call.output_tokens, 0),
        company_context_score: qualityGate.company_context_score,
        subsections_suppressed: qualityGate.suppressed_sections.includes("company_context") ? 1 : 0,
        employee_review_overreach_detected: qualityGate.warning_flags.some((warning) => /employee review/i.test(warning)),
      },
      depth_evaluation: {
        cost_usd: evaluationCostUsd,
        duration_ms: evaluationDurationMs,
        model: evaluationCalls[0]?.model ?? null,
        input_tokens: evaluationCalls.reduce((sum, call) => sum + call.input_tokens, 0),
        output_tokens: evaluationCalls.reduce((sum, call) => sum + call.output_tokens, 0),
        depth_score: qualityGate.depth_score,
        shallow_sections_detected: Object.values(qualityGate.section_states).filter((state) => state === "weak" || state === "rerun").length,
        depth_repair_triggered: qualityGate.release_decision === "depth_repair" || qualityGate.repair_instructions.some((instruction) => /depth/i.test(instruction)),
      },
      repair_loops: {
        cost_usd: repairLoopCostUsd,
        duration_ms: repairLoops > 0 ? durations.synthesis_ms : 0,
        targeted_retrieval_loops: targetedRetrievalLoops,
        synthesis_repair_loops: repairLoops,
        depth_repair_loops: qualityGate.release_decision === "depth_repair" || repairLoops > 0 ? repairLoops : 0,
        persona_correction_reruns: personaCorrectionReruns,
        fit_rescoring_reruns: fitRescoringReruns,
        contradiction_repair_loops: contradictionRepairLoops,
        sections_repaired: qualityGate.repair_instructions.length,
      },
      release_gate: {
        cost_usd: evaluationCostUsd,
        duration_ms: evaluationDurationMs,
        model: evaluationCalls[0]?.model ?? null,
        release_decision: qualityGate.release_decision,
        warnings_count: warningsCount,
        blocked_reason_count: blockedReasonCount,
      },
      prompt_improvement_analysis: {
        cost_usd: promptImprovementCount > 0 ? evaluationCostUsd : 0,
        duration_ms: promptImprovementCount > 0 ? evaluationDurationMs : 0,
        model: promptImprovementCount > 0 ? evaluationCalls[0]?.model ?? null : null,
        input_tokens: promptImprovementCount > 0 ? evaluationCalls.reduce((sum, call) => sum + call.input_tokens, 0) : 0,
        output_tokens: promptImprovementCount > 0 ? evaluationCalls.reduce((sum, call) => sum + call.output_tokens, 0) : 0,
        recommendations_produced: promptImprovementCount,
        systemic_failure_patterns_detected: promptImprovementCount,
      },
      resume_overlay: {
        cost_usd: 0,
        duration_ms: 0,
        enabled: hasResumeOverlay,
        incremental_cost_usd: 0,
      },
      rendering: {
        cost_usd: 0,
        duration_ms: durations.persistence_ms,
        report_format: "html|json",
      },
      storage_and_cache: {
        cost_usd: 0,
        duration_ms: durations.persistence_ms,
        objects_written: coverage.total_sources + 1,
        bytes_stored: 0,
        monthly_amortized_cost_usd: 0,
      },
    },
    derived_metrics: {
      cost_per_successful_report_usd: totalCostUsd,
      cost_per_abandoned_report_usd: 0,
      cost_per_refresh_usd: totalCostUsd,
      cost_per_released_report_usd: releasedReport ? totalCostUsd : 0,
      cost_per_failed_quality_gate_usd: qualityGate.release_decision === "blocked" ? totalCostUsd : 0,
      repair_loop_cost_per_released_report_usd: releasedReport ? repairLoopCostUsd : 0,
      quality_uplift_after_repairs: repairLoops > 0 ? Math.max(0, qualityGate.overall_quality_score - 70) : 0,
      depth_uplift_after_repairs: repairLoops > 0 ? Math.max(0, qualityGate.depth_score - 70) : 0,
      marginal_cost_resume_overlay_usd: 0,
      marginal_cost_verification_pass_usd: 0,
      marginal_cost_persona_inference_usd: 0,
      marginal_cost_persona_deepening_usd: 0,
      marginal_cost_blended_retrieval_usd: 0,
      marginal_cost_persona_specific_synthesis_usd: 0,
      premium_quality_multiplier_vs_standard: 1,
    },
    quality_gate_flags: {
      persona_correction_triggered: personaCorrectionTriggered,
      fit_rescoring_triggered: fitRescoringTriggered,
      contradiction_repair_triggered: contradictionRepairTriggered,
    },
    budget_controls: {
      soft_budget_usd: 0.15,
      hard_budget_usd: 0.5,
      alert_triggered: totalCostUsd > 0.15,
      degradation_policy: {
        allowed: false,
        rules: [
          "never skip contradiction pass in premium mode",
          "never skip primary-source retrieval for strategy sections",
          "may cap low-confidence enrichment depth",
          "may increase cache reuse before reducing reasoning quality",
        ],
      },
    },
    user_visible_summary: {
      compute_intensity: "premium",
      report_cost_band: visibleBand,
      sources_used: coverage.total_sources,
      primary_sources_used: coverage.primary_sources_used,
      verification_pass_ran: true,
      quality_gate_ran: true,
      depth_gate_ran: true,
      persona_qa_status: personaQa.overallStatus,
      resume_overlay_applied: hasResumeOverlay,
      persona_adaptation_applied: true,
      release_decision: qualityGate.release_decision,
      warning_flags: qualityGate.warning_flags,
      persona: {
        primary_role_family: persona.primaryRoleFamilyLabel,
        secondary_role_family: persona.secondaryRoleFamilyLabel,
        is_blended: persona.isBlendedPersona,
        role_family: persona.roleFamilyLabel,
        seniority: persona.seniorityLabel,
        subspecialization: persona.subspecialization,
        confidence: persona.confidence,
      },
    },
    allocation_notes: {
      llm_cost_allocation: "A single premium synthesis call currently generates multiple report layers. Total LLM cost is accurate, but section-level cost allocation remains intentionally conservative.",
      missing_cost_categories: [
        "retrieval vendor cost",
        "embedding cost",
        "rerank cost",
        "storage amortization",
        "cache-avoided savings",
      ],
    },
    quality_gate: {
      ...qualityGate,
      persona_correction_triggered: personaCorrectionTriggered,
      fit_rescoring_triggered: fitRescoringTriggered,
      contradiction_repair_triggered: contradictionRepairTriggered,
    },
  };
}

export function buildPremiumOperationsSection(
  tokenUsage: ReportTokenUsage,
  evidenceQuality: PremiumEvidenceQuality,
  coverage: PremiumSourceCoverageSummary,
  ledger: Record<string, any>
): PremiumSectionContent {
  const typeMix = coverage.source_type_breakdown
    .slice(0, 4)
    .map((entry) => `${entry.type}: ${entry.count}`);
  const alertTriggered = Boolean(ledger?.budget_controls?.alert_triggered);
  const personaAudit = coverage.persona_source_class_audit;
  const personaAuditNote = personaAudit.missingMandatory.length
    ? `Missing mandatory persona source classes: ${personaAudit.missingMandatory.join(", ")}.`
    : "All mandatory persona source classes were matched by at least one stored source.";
  const personaQaStatus = ledger?.persona_qa_summary?.overallStatus ?? "unknown";
  const personaQaWarnings = Array.isArray(ledger?.persona_qa_summary?.warnings)
    ? ledger.persona_qa_summary.warnings
    : [];
  const qualityGate = ledger?.quality_gate;
  const releaseDecision = qualityGate?.release_decision ?? "unknown";
  const releaseWarnings = Array.isArray(qualityGate?.warning_flags) ? qualityGate.warning_flags : [];

  return {
    schema: "premium_section_v1",
    group: "Operations",
    surface: "full",
    question: "What did the system do, and what did it cost to generate this report?",
    summary: "This operations layer follows the shape in cost_ledger_schema.json and exposes the honest boundary between tracked cost and still-untracked infrastructure cost. The visible LLM spend is real; retrieval, rerank, storage, and cache economics are still surfaced as gaps instead of being silently ignored.",
    callouts: [
      {
        label: "Tracked LLM cost",
        value: `$${tokenUsage.total_cost_usd.toFixed(3)}`,
        tone: alertTriggered ? "caution" : "neutral",
      },
      {
        label: "Source coverage",
        value: `${coverage.total_sources} sources across ${coverage.distinct_hosts} hosts`,
        tone: evidenceQuality.rating === "strong" ? "strong" : evidenceQuality.rating === "insufficient" ? "risk" : "caution",
      },
      {
        label: "Evidence quality",
        value: evidenceQuality.rating,
        tone: evidenceQuality.rating === "strong" ? "strong" : evidenceQuality.rating === "insufficient" ? "risk" : "caution",
      },
    ],
    facts: [
      { label: "Model calls", value: String(tokenUsage.calls.length) },
      { label: "Total tokens", value: String(tokenUsage.total_tokens) },
      { label: "Primary sources", value: String(coverage.primary_sources_used) },
      { label: "Recent sources", value: String(coverage.recent_sources) },
      { label: "Persona source coverage", value: `${personaAudit.satisfiedMandatoryCount}/${personaAudit.mandatory.length} mandatory` },
      { label: "Persona QA", value: String(personaQaStatus) },
      { label: "Release state", value: String(releaseDecision) },
      { label: "Persona", value: `${ledger?.persona_profile?.role_family ?? "Unknown"} | ${ledger?.persona_profile?.seniority ?? "Unknown"}` },
      { label: "Report cost band", value: String(ledger?.user_visible_summary?.report_cost_band ?? "unknown") },
      { label: "Budget alert", value: alertTriggered ? "soft budget exceeded" : "within soft budget" },
    ],
    blocks: [
      {
        title: "Retrieval coverage",
        body: "The retrieval plan stays anchored to pipeline_architecture.md: exact role context first, then official company signals, then broader validation. This section shows what coverage actually landed in the request.",
        bullets: [
          `Reranked evidence chunks: ${coverage.reranked_chunks}`,
          `Retrieval queries executed: ${coverage.retrieval_queries.length}`,
          `Persona branch: ${ledger?.inferred_primary_role_family ?? ledger?.inferred_role_family ?? "unknown"}`,
          `Mandatory persona classes satisfied: ${personaAudit.satisfiedMandatoryCount}/${personaAudit.mandatory.length}`,
          ...typeMix,
        ],
      },
      {
        title: "Cost-accounting gaps still visible",
        body: "The live system now persists a ledger object, but some categories remain uninstrumented upstream. Those categories are suppressed from totals rather than estimated with fake precision.",
        bullets: [
          "Still missing: retrieval vendor cost",
          "Still missing: embedding and rerank cost",
          "Still missing: storage amortization and cache-avoided savings",
          "Still missing: marginal refresh and verification-pass deltas",
        ],
      },
      {
        title: "Premium guardrails",
        bullets: [
          "Contradiction handling and evidence suppression remain mandatory.",
          `Persona QA status: ${personaQaStatus}.`,
          `Release state: ${releaseDecision}.`,
          ...releaseWarnings.slice(0, 2),
          ...personaQaWarnings.slice(0, 2),
          "Low-confidence enrichment can be capped before reasoning quality is reduced.",
          "Budget pressure does not justify skipping primary-source retrieval for strategy sections.",
        ],
      },
    ],
    evidence: {
      threshold: "Telemetry-derived only",
      status: "partial",
      confidence: "suppressed",
      note: `The ledger shape is now explicit, but several non-LLM cost categories still require upstream instrumentation to be complete. ${personaAuditNote}`,
    },
  };
}
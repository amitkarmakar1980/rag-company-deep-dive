import test from "node:test";
import assert from "node:assert/strict";
import { inferPremiumPersona } from "../lib/report/premiumPersona.ts";
import {
  assessPremiumPersonaQa,
  buildPremiumCostLedger,
  buildPremiumSourceCoverageSummary,
} from "../lib/report/premiumTelemetry.ts";
import type { PremiumQualityGateResult } from "../lib/report/premiumQualityGate.ts";
import type { LLMCallUsage, ReportTokenUsage } from "../lib/types/index.ts";
import type { PremiumSectionContent } from "../lib/report/premiumTypes.ts";
import type { Source } from "../lib/types/index.ts";

function makeSource(overrides: Partial<Source>): Source {
  return {
    id: overrides.id ?? "source-1",
    company_id: overrides.company_id ?? "company-1",
    request_id: overrides.request_id ?? "request-1",
    source_type: overrides.source_type ?? "blog",
    title: overrides.title ?? "Untitled source",
    url: overrides.url,
    raw_content: overrides.raw_content ?? "",
    cleaned_content: overrides.cleaned_content ?? "",
    published_at: overrides.published_at,
    fetched_at: overrides.fetched_at ?? new Date().toISOString(),
    trust_score: overrides.trust_score ?? 0.8,
    content_hash: overrides.content_hash ?? `hash-${overrides.id ?? "1"}`,
  };
}

function makeSection(summary: string, extras: Partial<PremiumSectionContent> = {}): PremiumSectionContent {
  return {
    schema: "premium_section_v1",
    group: "Strategy",
    surface: "full",
    question: "What matters?",
    summary,
    evidence: {
      threshold: "Evidence required",
      status: "met",
      confidence: "high",
      note: "Grounded in supplied fixture evidence.",
    },
    ...extras,
  };
}

function makeQualityGate(overrides: Partial<PremiumQualityGateResult> = {}): PremiumQualityGateResult {
  return {
    overall_quality_score: 84,
    depth_score: 81,
    company_context_score: 79,
    evidence_score: 82,
    persona_score: 86,
    interview_prep_score: 83,
    readiness_to_release_score: 82,
    release_decision: "approved_with_warnings",
    warning_flags: ["Company-context coverage is partial."],
    blocked_release_reasons: [],
    section_scores: {
      decision_memo: 86,
      five_minute_brief: 83,
      company_context: 79,
      why_role_exists_now: 82,
      company_role_strategy: 85,
      candidate_fit: 78,
      interview_prep: 83,
      how_to_win_this_process: 84,
      credibility_layer: 81,
    },
    section_states: {
      decision_memo: "approved",
      five_minute_brief: "approved",
      company_context: "weak",
      why_role_exists_now: "approved",
      company_role_strategy: "approved",
      candidate_fit: "approved",
      interview_prep: "approved",
      how_to_win_this_process: "approved",
      credibility_layer: "approved",
    },
    prompt_improvement_recommendations: [
      {
        scope: "company_context",
        reason: "Company-context interpretation stayed shallower than the rest of the report.",
        recommended_change: "Tighten company-context writing instructions to prefer implication-rich synthesis over summaries.",
        apply_mode: "review_required",
      },
    ],
    reasoning_summary: "Fixture quality gate result.",
    repair_instructions: ["Deepen the company-context interpretation before final release."],
    suppressed_sections: [],
    ...overrides,
  };
}

function makeUsage(purpose: string, model = "gpt-4o-mini", cost = 0.01): LLMCallUsage {
  return {
    model,
    purpose,
    input_tokens: 1000,
    output_tokens: 500,
    estimated_cost_usd: cost,
  };
}

function makeTokenUsage(calls: LLMCallUsage[]): ReportTokenUsage {
  return {
    calls,
    total_tokens: calls.reduce((sum, call) => sum + call.input_tokens + call.output_tokens, 0),
    total_cost_usd: calls.reduce((sum, call) => sum + call.estimated_cost_usd, 0),
  };
}

test("persona source coverage distinguishes required source classes from raw source types", () => {
  const persona = inferPremiumPersona(
    "Staff Software Engineer, Infrastructure",
    "Lead architecture, reliability, and distributed systems decisions across the platform."
  );

  const sources = [
    makeSource({
      id: "jd",
      source_type: "job_description",
      title: "Staff Software Engineer job description",
      cleaned_content: "Responsibilities include architecture ownership, reliability, and platform execution.",
    }),
    makeSource({
      id: "eng-blog",
      source_type: "blog",
      title: "Engineering blog: scaling reliability",
      cleaned_content: "Our engineering team improved reliability, latency, and distributed system performance.",
    }),
    makeSource({
      id: "docs",
      source_type: "custom_url",
      title: "Developer API architecture docs",
      cleaned_content: "API documentation for distributed services, system design, and platform architecture.",
    }),
  ];

  const coverage = buildPremiumSourceCoverageSummary(sources, [], ["engineering query"], persona);

  assert.equal(coverage.persona_source_class_audit.satisfiedMandatoryCount, 3);
  assert.equal(coverage.persona_source_class_audit.missingMandatory.length, 0);
  assert.ok(
    coverage.persona_source_class_audit.preferred.some(
      (entry) => entry.sourceClass === "engineering_blog" && entry.satisfied
    )
  );
});

test("persona QA passes when generated language matches engineering and staff-plus proof expectations", () => {
  const persona = inferPremiumPersona(
    "Staff Software Engineer",
    "Lead architecture, reliability, and cross-team technical direction."
  );

  const qa = assessPremiumPersonaQa(persona, {
    company_role_strategy: makeSection("This system design mandate centers on architecture, reliability, and scalability tradeoffs."),
    interview_prep: makeSection("Use hands-on implementation stories and system design case studies to prove staff-level judgment."),
  });

  assert.equal(qa.overallStatus, "pass");
  assert.equal(qa.warnings.length, 0);
});

test("persona QA warns when an executive report falls back to product-manager framing", () => {
  const persona = inferPremiumPersona(
    "VP Product",
    "Own portfolio strategy, org design, executive stakeholder communication, and business outcomes."
  );

  const qa = assessPremiumPersonaQa(persona, {
    decision_memo: makeSection("The core story is roadmap prioritization, metrics, and product strategy execution."),
    interview_prep: makeSection("Focus on prioritization tradeoffs instead of org design or portfolio mandate."),
  });

  assert.equal(qa.overallStatus, "warn");
  assert.ok(qa.warnings.some((warning) => /product-centric framing/i.test(warning)));
});

test("persona QA warns when product interview prep drifts into engineering theater", () => {
  const persona = inferPremiumPersona(
    "Lead Product Manager, In-App Recording (Safety)",
    "Lead product strategy, cross-functional delivery, and privacy-sensitive roadmap decisions for a recording surface."
  );

  const qa = assessPremiumPersonaQa(persona, {
    interview_prep: makeSection("Prepare for system design, distributed systems, latency, reliability, and architecture tradeoffs in every round.", { group: "Interview Prep" }),
    how_to_win_this_process: makeSection("Win by showing API design depth, throughput intuition, and backend reliability leadership.", { group: "Interview Prep", surface: "both" }),
  });

  assert.equal(qa.overallStatus, "warn");
  assert.ok(qa.checks.some((check) => check.check === "technical_pm_interview_drift" && check.status === "warn"));
});

test("persona QA checks blended coherence when a secondary persona is active", () => {
  const persona = inferPremiumPersona(
    "Staff Platform Engineer",
    "Lead architecture for model serving, experimentation infrastructure, model quality, and production ML systems across teams."
  );

  const qa = assessPremiumPersonaQa(persona, {
    company_role_strategy: makeSection("This architecture mandate depends on model quality, experimentation, and production ML reliability."),
    interview_prep: makeSection("Expect system design plus experimentation and model tradeoff questions in the loop."),
  });

  assert.equal(persona.isBlendedPersona, true);
  assert.ok(qa.checks.some((check) => check.check === "blended_persona_coherence"));
});

test("cost ledger embeds quality gate state and release-stage telemetry", () => {
  const persona = inferPremiumPersona(
    "Director of Product",
    "Lead product strategy, prioritization, and cross-functional leadership for a core platform area."
  );
  const coverage = buildPremiumSourceCoverageSummary(
    [
      makeSource({
        id: "jd",
        source_type: "job_description",
        title: "Director of Product job description",
        cleaned_content: "Lead product strategy, prioritization, platform roadmap, and executive stakeholder alignment.",
      }),
      makeSource({
        id: "news-1",
        source_type: "newsroom",
        title: "Leadership strategy update",
        cleaned_content: "Executive leadership outlined strategy, platform roadmap, and market priorities.",
      }),
      makeSource({
        id: "pricing-1",
        source_type: "custom_url",
        title: "Pricing and packaging page",
        cleaned_content: "Pricing tiers, packaging, product plans, and platform workflow details.",
      }),
    ],
    [],
    ["director product strategy query"],
    persona
  );
  const personaQa = assessPremiumPersonaQa(persona, {
    company_role_strategy: makeSection("This product strategy mandate centers on prioritization, metrics, and platform leverage."),
    interview_prep: makeSection("Expect prioritization, strategy, and cross-functional influence questions in the loop."),
  });
  const qualityGate = makeQualityGate();
  const tokenUsage = makeTokenUsage([
    makeUsage("Premium Interview Report", "o3", 0.08),
    makeUsage("Premium Quality Evaluation", "gpt-4o-mini", 0.01),
    makeUsage("Premium Interview Report", "o3", 0.06),
  ]);

  const ledger = buildPremiumCostLedger({
    reportId: "report-1",
    requestId: "request-1",
    runId: "run-1",
    companyName: "ExampleCo",
    roleTitle: "Director of Product",
    persona,
    tokenUsage,
    primaryUsage: tokenUsage.calls[0],
    sources: [],
    retrievalQueries: ["director product strategy query"],
    evidenceQuality: {
      raw_chunk_count: 10,
      final_chunk_count: 8,
      distinct_source_count: 3,
      distinct_source_types: 3,
      rating: "moderate",
      warnings: [],
    },
    coverage,
    personaQa,
    qualityGate,
    hasResumeOverlay: false,
    durations: {
      retrieval_ms: 120,
      synthesis_ms: 450,
      persistence_ms: 60,
      total_ms: 700,
    },
    targetedRetrievalLoops: 1,
  });

  assert.equal(ledger.quality_gate.release_decision, "approved_with_warnings");
  assert.equal(ledger.stages.release_gate.release_decision, "approved_with_warnings");
  assert.equal(ledger.stages.quality_evaluation.warnings_generated, 1);
  assert.equal(ledger.stages.prompt_improvement_analysis.recommendations_produced, 1);
  assert.equal(ledger.user_visible_summary.release_decision, "approved_with_warnings");
  assert.equal(ledger.summary.quality_evaluation_cost_usd, 0.01);
  assert.equal(ledger.stages.repair_loops.targeted_retrieval_loops, 1);
  assert.equal(ledger.summary.persona_correction_reruns, 0);
  assert.equal(ledger.quality_gate.persona_correction_triggered, false);
});
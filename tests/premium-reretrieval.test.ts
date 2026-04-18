import test from "node:test";
import assert from "node:assert/strict";
import { inferPremiumPersona } from "../lib/report/premiumPersona.ts";
import type { PremiumQualityGateResult } from "../lib/report/premiumQualityGate.ts";
import type { PremiumPersonaQaSummary, PremiumSourceCoverageSummary } from "../lib/report/premiumTelemetry.ts";
import { buildTargetedReretrievalQueries, buildTargetedReretrievalSourceUrls, shouldRunTargetedReretrieval } from "../lib/report/assemblePremiumReportV2.ts";

function makeCoverage(): PremiumSourceCoverageSummary {
  return {
    total_sources: 3,
    distinct_hosts: 2,
    distinct_source_types: 2,
    primary_sources_used: 2,
    recent_sources: 2,
    reranked_chunks: 4,
    retrieval_queries: ["base query"],
    source_type_breakdown: [
      { type: "job_description", count: 1 },
      { type: "newsroom", count: 2 },
    ],
    persona_source_class_audit: {
      mandatory: [],
      preferred: [],
      optional: [],
      satisfiedMandatoryCount: 1,
      satisfiedPreferredCount: 1,
      missingMandatory: ["product_surfaces", "leadership_strategy"],
      missingPreferred: [],
    },
    notes: [],
  };
}

function makePersonaQa(): PremiumPersonaQaSummary {
  return {
    overallStatus: "warn",
    checks: [
      { check: "executive_scope_overread", status: "warn", note: "Generated language overreads executive scope." },
      { check: "technical_pm_interview_drift", status: "warn", note: "Interview prep drifted into engineering theater." },
    ],
    warnings: ["Generated language overreads executive scope.", "Interview prep drifted into engineering theater."],
  };
}

function makeQualityGate(): PremiumQualityGateResult {
  return {
    overall_quality_score: 61,
    depth_score: 60,
    company_context_score: 66,
    evidence_score: 58,
    persona_score: 55,
    interview_prep_score: 54,
    readiness_to_release_score: 57,
    release_decision: "resynthesize",
    warning_flags: ["Missing mandatory persona source classes: product_surfaces, leadership_strategy."],
    blocked_release_reasons: [
      "Report overreads executive scope relative to the inferred product persona.",
      "Interview prep drifted into engineering architecture theater for a product role.",
    ],
    section_scores: {},
    section_states: {
      company_role_strategy: "rerun",
      interview_prep: "rerun",
    },
    prompt_improvement_recommendations: [],
    reasoning_summary: "fixture",
    repair_instructions: [
      "Correct the archetype: remove executive-scope assumptions unless the JD explicitly shows business-unit, portfolio, org-design, or P&L authority.",
      "Rewrite technical PM interview prep around product tradeoffs, privacy or safety judgment, rollout strategy, and cross-functional proof instead of engineering architecture theater.",
      "Rescore candidate fit dimension by dimension and explain transferability explicitly instead of over-weighting narrow domain purity.",
    ],
    suppressed_sections: [],
  };
}

function makeWeakEvidenceQualityGate(): PremiumQualityGateResult {
  return {
    overall_quality_score: 64,
    depth_score: 54,
    company_context_score: 58,
    evidence_score: 52,
    persona_score: 82,
    interview_prep_score: 56,
    readiness_to_release_score: 55,
    release_decision: "partial",
    warning_flags: ["Generic company context", "Weak evidence in candidate fit"],
    blocked_release_reasons: [
      "Insufficient depth in critical sections",
      "Generic interview prep lacking actionable insights",
      "Evidence quality remained below the premium minimum after evaluation.",
    ],
    section_scores: {},
    section_states: {
      company_role_strategy: "weak",
      interview_prep: "rerun",
      how_to_win_this_process: "weak",
      company_context: "weak",
    },
    prompt_improvement_recommendations: [],
    reasoning_summary: "weak-evidence fixture",
    repair_instructions: [
      "Improve company-context coverage with stronger interpretation of company insights, history, mission, values, culture, and employee-review caveats where evidence supports it.",
      "Rewrite interview-prep content so it becomes role-family-specific, seniority-specific, and interviewer-proof-oriented rather than generic.",
      "Increase second-order insight density. Explain implications and tradeoffs instead of summarizing facts.",
    ],
    suppressed_sections: [],
  };
}

test("targeted reretrieval triggers for archetype mismatch when mandatory source classes are missing", () => {
  const shouldReretrieve = shouldRunTargetedReretrieval({
    qualityGate: makeQualityGate(),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    alreadyReranRetrieval: false,
  });

  assert.equal(shouldReretrieve, true);
});

test("targeted reretrieval also triggers for weak-evidence partial releases in critical sections", () => {
  const coverage = makeCoverage();
  coverage.total_sources = 8;
  coverage.distinct_hosts = 4;
  coverage.primary_sources_used = 4;
  coverage.persona_source_class_audit.missingMandatory = [];

  const shouldReretrieve = shouldRunTargetedReretrieval({
    qualityGate: makeWeakEvidenceQualityGate(),
    coverage,
    personaQa: {
      overallStatus: "pass",
      checks: [],
      warnings: [],
    },
    alreadyReranRetrieval: false,
  });

  assert.equal(shouldReretrieve, true);
});

test("targeted reretrieval queries add archetype-correction and transferability probes for senior technical PM cases", () => {
  const persona = inferPremiumPersona(
    "Lead Product Manager, In-App Recording (Safety)",
    "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience."
  );

  const queries = buildTargetedReretrievalQueries({
    companyName: "Uber",
    roleTitle: "Lead Product Manager, In-App Recording (Safety)",
    persona,
    existingQueries: ["Uber base query"],
    qualityGate: makeQualityGate(),
    personaQa: makePersonaQa(),
  });

  assert.ok(queries.some((query) => /product manager responsibilities|roadmap|stakeholder alignment/i.test(query)));
  assert.ok(queries.some((query) => /privacy|safety|rollout|metrics/i.test(query)));
  assert.ok(queries.some((query) => /transferability|adjacent product|technical fluency/i.test(query)));
});

test("targeted reretrieval source urls prioritize source classes needed for archetype correction", async () => {
  const urls = await buildTargetedReretrievalSourceUrls({
    companyName: "Uber",
    roleTitle: "Lead Product Manager, In-App Recording (Safety)",
    companyUrl: "https://www.uber.com",
    qualityGate: makeQualityGate(),
    coverage: makeCoverage(),
    enableHomepageDiscovery: false,
  });

  assert.ok(urls.length > 0);
  assert.ok(urls.some((url) => /uber\.com\/investors|google\.com\/search\?q=.*investor|google\.com\/search\?q=.*leadership/i.test(url)));
  assert.ok(urls.some((url) => /uber\.com\/blog|uber\.com\/pricing|google\.com\/search\?q=.*product/i.test(url)));
});

test("targeted reretrieval queries add company-strategy and interview-specific probes for weak-evidence partial releases", () => {
  const persona = inferPremiumPersona(
    "Lead Product Manager, In-App Recording (Safety)",
    "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience."
  );

  const queries = buildTargetedReretrievalQueries({
    companyName: "Uber",
    roleTitle: "Lead Product Manager, In-App Recording (Safety)",
    persona,
    existingQueries: ["Uber base query"],
    qualityGate: makeWeakEvidenceQualityGate(),
    personaQa: {
      overallStatus: "pass",
      checks: [],
      warnings: [],
    },
  });

  assert.ok(queries.some((query) => /investor relations|shareholder letter|strategy product priorities/i.test(query)));
  assert.ok(queries.some((query) => /interview hiring manager expectations|product judgment|stakeholder management/i.test(query)));
});
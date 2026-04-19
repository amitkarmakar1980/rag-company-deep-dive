import test from "node:test";
import assert from "node:assert/strict";
import { inferPremiumPersona } from "../lib/report/premiumPersona.ts";
import { applyQualityGateToSections, finalizePremiumQualityGate, type PremiumEvaluationModelOutput } from "../lib/report/premiumQualityGate.ts";
import { ensureRequiredSectionsForPersistence, resolveQualityGateForPersistence } from "../lib/report/assemblePremiumReportV2.ts";
import type { PremiumEvidenceQuality, PremiumPersonaQaSummary, PremiumSourceCoverageSummary } from "../lib/report/premiumTelemetry.ts";
import type { PremiumSectionContent } from "../lib/report/premiumTypes.ts";

function makeSection(summary: string, overrides: Partial<PremiumSectionContent> = {}): PremiumSectionContent {
  return {
    schema: "premium_section_v1",
    group: "Strategy",
    surface: "full",
    question: "What matters?",
    summary,
    evidence: {
      threshold: "fixture evidence threshold",
      status: "met",
      confidence: "high",
      note: "fixture evidence note",
    },
    ...overrides,
  };
}

function makeCoverage(): PremiumSourceCoverageSummary {
  return {
    total_sources: 6,
    distinct_hosts: 4,
    distinct_source_types: 3,
    primary_sources_used: 4,
    recent_sources: 4,
    reranked_chunks: 10,
    retrieval_queries: ["fixture query"],
    source_type_breakdown: [
      { type: "job_description", count: 1 },
      { type: "newsroom", count: 3 },
      { type: "blog", count: 2 },
    ],
    persona_source_class_audit: {
      mandatory: [],
      preferred: [],
      optional: [],
      satisfiedMandatoryCount: 3,
      satisfiedPreferredCount: 2,
      missingMandatory: [],
      missingPreferred: [],
    },
    notes: [],
  };
}

function makeEvidenceQuality(rating: PremiumEvidenceQuality["rating"] = "strong"): PremiumEvidenceQuality {
  return {
    raw_chunk_count: 14,
    final_chunk_count: 10,
    distinct_source_count: 5,
    distinct_source_types: 3,
    rating,
    warnings: [],
  };
}

function makePersonaQa(overrides?: Partial<PremiumPersonaQaSummary>): PremiumPersonaQaSummary {
  return {
    overallStatus: "pass",
    checks: [],
    warnings: [],
    ...overrides,
  };
}

function makeSections(): Record<string, PremiumSectionContent> {
  return {
    decision_memo: makeSection("Clear evidence-backed recommendation with upside, downside, and decision pivots."),
    five_minute_brief: makeSection("Fast briefing tailored to the role and level.", { surface: "both", group: "Decision" }),
    company_context: makeSection(
      "The company context connects the firm's history, operating model, and leadership priorities to the candidate's preparation burden. It explains how the company frames its mission, how leadership describes the long-term vision, and what day-to-day culture signals imply about decision velocity, accountability, collaboration norms, hiring standards, and tolerance for strategic risk across teams. A premium version of this section should help the candidate infer how leaders want people to think, collaborate, and escalate rather than just describing employer-brand language.",
      {
        blocks: [
          {
            title: "Company Snapshot",
            body: "The company appears to be operating through a mix of platform leverage, ecosystem coordination, and leadership-priority concentration rather than through a single narrow product line. That matters because the candidate will likely be interviewed for judgment about tradeoffs, not just execution mechanics. A strong candidate should be able to explain how the business is trying to compound strategic advantage while still controlling operating complexity and coordination cost.",
          },
          {
            title: "Vision And Mission",
            body: "The mission and vision language matter because they indicate whether leadership is optimizing for platform scale, category expansion, operational discipline, or customer trust. Premium prep should translate those statements into likely strategic priorities rather than repeating branded slogans. The useful interpretation is which promises leadership is making to the market and what operating behavior the interview loop will expect a senior hire to reinforce over time.",
          },
          {
            title: "Culture Signals",
            body: "Culture should be read through leadership principles, operating principles, hiring signals, and execution habits. The useful interpretation is whether the company rewards speed, debate, rigor, ownership, or controlled experimentation, because those norms change how the candidate should position stories and decision-making style. This section should help the candidate infer whether the company prizes independent judgment, stakeholder diplomacy, customer obsession, or disciplined execution under ambiguity.",
          },
        ],
      }
    ),
    why_role_exists_now: makeSection("Explains the current company and role inflection clearly.", { surface: "both", group: "Decision" }),
    company_role_strategy: makeSection(
      "The company and role strategy section interprets the current business model, current strategic posture, market pressures, and execution constraints in a way that helps the candidate sound like an operator rather than a summarizer. It should explain what the company is trying to win, what tensions leadership is balancing, how those tensions shape the real mandate for this role, and why the interview loop is likely to reward certain kinds of strategic judgment more than generic enthusiasm. It should also connect the strategy to stakeholder expectations, execution risk, and mandate credibility.",
      {
        blocks: [
          {
            title: "Current Strategy",
            body: "The current strategy should identify the operating bets leadership seems to be prioritizing now, why those bets exist, and how they create demand for this role. It should also explain whether the strategy is about expansion, monetization, efficiency, trust, platform leverage, or portfolio defense and what that means for interview positioning. Premium strategy content should tell the candidate where management is likely optimistic, where management is likely constrained, and how the role is expected to convert strategy into operating progress.",
          },
          {
            title: "Strategic Tensions",
            body: "A useful company strategy read has to name tensions explicitly: growth versus discipline, platform standardization versus local optimization, customer experience versus operational complexity, and innovation speed versus governance. Those tensions matter because they are often the subtext behind why the role exists and what interviewers are actually testing when they probe judgment, prioritization, and cross-functional influence.",
          },
          {
            title: "Role Implications",
            body: "The strategy section should connect the business posture back to the role. A strong candidate should be able to say which strategic bets need better execution, where stakeholder friction is likely to show up, and why this mandate requires a specific kind of product, technical, or operating judgment rather than generic leadership language.",
          },
          {
            title: "SWOT - Strengths",
            bullets: [
              "The company has visible strategic assets that create leverage for this role.",
              "Leadership appears to have a coherent priority stack rather than a scattered narrative.",
              "The product or platform footprint provides enough surface area for differentiated execution.",
            ],
          },
          {
            title: "SWOT - Weaknesses",
            bullets: [
              "Execution complexity may slow coordination across product, engineering, and go-to-market groups.",
              "Some strategic claims may rely on narrative strength more than fully proven operating evidence.",
              "The role may inherit ambiguity because ownership boundaries are not perfectly explicit.",
            ],
          },
          {
            title: "SWOT - Opportunities",
            bullets: [
              "There is room to convert strategic ambition into sharper operating leverage.",
              "The company may have underexploited platform, workflow, or monetization advantages.",
              "A strong hire could increase decision quality where multiple stakeholder agendas currently collide.",
            ],
          },
          {
            title: "SWOT - Threats",
            bullets: [
              "Competitive narratives may challenge differentiation if execution lags ambition.",
              "Macro or category shifts could narrow tolerance for slow strategic experiments.",
              "Organizational complexity can turn a good mandate into a slow-moving one if not handled well.",
            ],
          },
        ],
      }
    ),
    candidate_fit: makeSection("Candidate strengths and objections are mapped honestly to the hiring bar.", { group: "Candidate Fit" }),
    interview_prep: makeSection("Interview prep is interviewer-specific, role-specific, and clear about proof expectations.", { group: "Interview Prep" }),
    how_to_win_this_process: makeSection("How to win guidance is specific, tactical, and tied to likely interviewer validation.", { surface: "both", group: "Interview Prep" }),
    credibility_layer: makeSection("Separates facts, inferences, unknowns, and conflicts cleanly.", { group: "Credibility" }),
  };
}

function baseEvaluation(): PremiumEvaluationModelOutput {
  return {
    scores: {
      overall_quality: 86,
      source_quality: 84,
      evidence_quality: 84,
      strategy_depth: 85,
      company_context: 82,
      persona_accuracy: 84,
      interview_prep: 85,
      coherence: 84,
      actionability: 86,
      premium_polish: 83,
      depth: 84,
      readiness_to_release: 84,
    },
    section_results: [
      { section: "decision_memo", state: "approved", score: 88, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "five_minute_brief", state: "approved", score: 84, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "company_context", state: "approved", score: 82, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "why_role_exists_now", state: "approved", score: 84, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "company_role_strategy", state: "approved", score: 87, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "candidate_fit", state: "approved", score: 80, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "interview_prep", state: "approved", score: 86, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "how_to_win_this_process", state: "approved", score: 85, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
      { section: "credibility_layer", state: "approved", score: 84, problems: [], unsupported_claims: [], shallow_patterns: [], low_signal_filler: [], repair_actions: [] },
    ],
    warning_flags: [],
    blocked_release_reasons: [],
    recommended_actions: [],
    release_decision: "approved",
    reasoning_summary: "Fixture evaluation summary.",
  };
}

test("quality gate approves a strong premium draft", () => {
  const persona = inferPremiumPersona("Director of Product", "Lead product strategy, prioritization, and cross-functional leadership.");
  const result = finalizePremiumQualityGate({
    evaluation: baseEvaluation(),
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("strong"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona,
    hasRetry: false,
  });

  assert.equal(result.release_decision, "approved");
  assert.equal(result.suppressed_sections.length, 0);
  assert.ok(result.overall_quality_score >= 80);
});

test("quality gate suppresses weak company context and releases with warnings", () => {
  const persona = inferPremiumPersona("Director of Product", "Lead product strategy, prioritization, and cross-functional leadership.");
  const evaluation = baseEvaluation();
  evaluation.scores.company_context = 61;
  evaluation.scores.overall_quality = 79;
  evaluation.scores.readiness_to_release = 77;
  evaluation.section_results = evaluation.section_results.map((section) =>
    section.section === "company_context"
      ? {
          ...section,
          state: "suppress",
          score: 58,
          problems: ["Company context stayed too generic."],
        }
      : section
  );
  evaluation.warning_flags = ["Company-context coverage is partial."];
  evaluation.release_decision = "suppress_and_release";

  const result = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("moderate"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona,
    hasRetry: false,
  });

  assert.equal(result.release_decision, "suppress_and_release");
  assert.deepEqual(result.suppressed_sections, ["company_context"]);
  assert.ok(result.warning_flags.some((warning) => /company-context/i.test(warning)));
});

test("quality gate forces depth repair when company sections miss minimum depth and SWOT structure", () => {
  const persona = inferPremiumPersona("Director of Product", "Lead product strategy, prioritization, and cross-functional leadership.");
  const sections = makeSections();
  sections.company_context = makeSection("Brief context only.");
  sections.company_role_strategy = makeSection("Short strategy summary.", {
    blocks: [
      {
        title: "Current Strategy",
        body: "This only gestures at strategy without sufficient depth.",
      },
      {
        title: "SWOT - Strengths",
        bullets: ["One strength only."],
      },
    ],
  });

  const result = finalizePremiumQualityGate({
    evaluation: baseEvaluation(),
    sections,
    evidenceQuality: makeEvidenceQuality("strong"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona,
    hasRetry: false,
  });

  assert.equal(result.release_decision, "depth_repair");
  assert.ok(result.warning_flags.some((warning) => /150-word premium minimum/i.test(warning)));
  assert.ok(result.warning_flags.some((warning) => /300-word premium minimum/i.test(warning)));
  assert.ok(result.warning_flags.some((warning) => /swot weaknesses bullets/i.test(warning)));
  assert.ok(result.repair_instructions.some((instruction) => /current-strategy block/i.test(instruction)));
});

test("quality gate requests repair on a shallow first pass and blocks after retry if critical sections stay weak", () => {
  const persona = inferPremiumPersona("Staff Software Engineer", "Lead architecture, reliability, and platform technical direction.");
  const evaluation = baseEvaluation();
  evaluation.scores.depth = 49;
  evaluation.scores.overall_quality = 58;
  evaluation.scores.readiness_to_release = 52;
  evaluation.section_results = evaluation.section_results.map((section) =>
    section.section === "company_role_strategy" || section.section === "interview_prep"
      ? {
          ...section,
          state: "rerun",
          score: 52,
          shallow_patterns: ["Mostly descriptive summary without second-order reasoning."],
          repair_actions: ["Increase depth and tradeoff analysis."],
        }
      : section
  );
  evaluation.release_decision = "depth_repair";

  const firstPass = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("strong"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona,
    hasRetry: false,
  });

  assert.equal(firstPass.release_decision, "depth_repair");
  assert.ok(firstPass.repair_instructions.some((instruction) => /depth/i.test(instruction)));

  const secondPass = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("strong"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona,
    hasRetry: true,
  });

  assert.equal(secondPass.release_decision, "blocked");
  assert.ok(secondPass.blocked_release_reasons.length > 0);
});

test("quality gate downgrades readiness when persona QA and source-class warnings are present", () => {
  const persona = inferPremiumPersona("VP Product", "Own portfolio strategy, org design, and executive business outcomes.");
  const coverage = makeCoverage();
  coverage.persona_source_class_audit.missingMandatory = ["investor_materials"];
  const result = finalizePremiumQualityGate({
    evaluation: baseEvaluation(),
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("moderate"),
    coverage,
    personaQa: makePersonaQa({
      overallStatus: "warn",
      checks: [],
      warnings: ["Detected product-centric framing in an executive report."],
    }),
    persona,
    hasRetry: false,
  });

  assert.equal(result.release_decision, "approved_with_warnings");
  assert.ok(result.warning_flags.some((warning) => /mandatory persona source classes/i.test(warning)));
  assert.ok(result.warning_flags.some((warning) => /product-centric framing/i.test(warning)));
});

test("quality gate forces repair when product reports overread executive scope or drift into engineering theater", () => {
  const persona = inferPremiumPersona(
    "Lead Product Manager, In-App Recording (Safety)",
    "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience."
  );
  const sections = makeSections();
  sections.company_role_strategy = makeSection("This role owns portfolio choices, org design, capital allocation, and business-unit priorities at the board-facing level.");
  sections.interview_prep = makeSection("Expect heavy system design, distributed systems, architecture, reliability, and API design evaluation in most rounds.", { group: "Interview Prep" });
  sections.how_to_win_this_process = makeSection("Win by showing architecture depth, latency instincts, and throughput judgment.", { group: "Interview Prep", surface: "both" });

  const result = finalizePremiumQualityGate({
    evaluation: baseEvaluation(),
    sections,
    evidenceQuality: makeEvidenceQuality("strong"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa({
      overallStatus: "warn",
      checks: [
        { check: "executive_scope_overread", status: "warn", note: "Generated language overreads executive scope." },
        { check: "technical_pm_interview_drift", status: "warn", note: "Interview prep drifted into engineering theater." },
      ],
      warnings: ["Generated language overreads executive scope.", "Interview prep drifted into engineering theater."],
    }),
    persona,
    hasRetry: false,
  });

  assert.equal(result.release_decision, "resynthesize");
  assert.ok(result.blocked_release_reasons.some((reason) => /executive scope/i.test(reason)));
  assert.ok(result.blocked_release_reasons.some((reason) => /engineering architecture theater/i.test(reason)));
  assert.ok(result.repair_instructions.some((instruction) => /Correct the archetype/i.test(instruction)));
});

test("blocked quality-gate results stay blocked for premium persistence", () => {
  const blockedResult = finalizePremiumQualityGate({
    evaluation: {
      ...baseEvaluation(),
      scores: {
        ...baseEvaluation().scores,
        overall_quality: 58,
        depth: 49,
        readiness_to_release: 50,
        evidence_quality: 50,
      },
      section_results: baseEvaluation().section_results.map((section) =>
        section.section === "decision_memo"
          ? {
              ...section,
              state: "rerun",
              score: 50,
              problems: ["Decision memo stayed too weak to approve."],
              repair_actions: ["Strengthen the decision memo using only supported evidence."],
            }
          : section
      ),
      release_decision: "blocked",
    },
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("weak"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona: inferPremiumPersona("Staff Software Engineer", "Lead architecture, reliability, and platform technical direction."),
    hasRetry: true,
  });

  assert.equal(blockedResult.release_decision, "blocked");

  const resolved = resolveQualityGateForPersistence(blockedResult, makeSections());

  assert.equal(resolved.release_decision, "suppress_and_release");
  assert.ok(resolved.blocked_release_reasons.length > 0);
  assert.ok(resolved.warning_flags.some((warning) => /still released with explicit low-confidence qualifiers/i.test(warning)));
});

test("blocked quality-gate results downgrade to a persisted partial draft when the briefing spine is still usable", () => {
  const evaluation: PremiumEvaluationModelOutput = {
    ...baseEvaluation(),
    scores: {
      ...baseEvaluation().scores,
      overall_quality: 62,
      depth: 53,
      readiness_to_release: 56,
      evidence_quality: 52,
    },
    section_results: baseEvaluation().section_results.map((section) =>
      section.section === "company_role_strategy" || section.section === "interview_prep"
        ? {
            ...section,
            state: "rerun",
            score: 58,
            problems: ["Section remained below the premium bar after repair attempts."],
            repair_actions: ["Deepen the section using stronger interpretation and clearer evidence."],
          }
        : section
    ),
    blocked_release_reasons: [
      "Company strategy section did not meet the premium depth contract.",
      "Depth remained below the premium minimum after evaluation.",
      "Evidence quality remained below the premium minimum after evaluation.",
    ],
    release_decision: "blocked" as const,
  };

  const blockedResult = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("weak"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona: inferPremiumPersona("Staff Software Engineer", "Lead architecture, reliability, and platform technical direction."),
    hasRetry: true,
  });

  assert.equal(blockedResult.release_decision, "blocked");

  const resolved = resolveQualityGateForPersistence(blockedResult, makeSections());

  assert.equal(resolved.release_decision, "partial");
  assert.ok(resolved.warning_flags.some((warning) => /strongest available draft was persisted/i.test(warning)));
});

test("blocked quality-gate results downgrade to suppress-and-release when one briefing section remains usable", () => {
  const evaluation: PremiumEvaluationModelOutput = {
    ...baseEvaluation(),
    scores: {
      ...baseEvaluation().scores,
      overall_quality: 60,
      depth: 54,
      readiness_to_release: 55,
      evidence_quality: 52,
    },
    section_results: baseEvaluation().section_results.map((section) => {
      if (section.section === "five_minute_brief") {
        return {
          ...section,
          state: "rerun" as const,
          score: 58,
          problems: ["Brief stayed too weak for premium approval."],
          repair_actions: ["Tighten the five-minute brief around supported evidence only."],
        };
      }

      if (section.section === "company_role_strategy") {
        return {
          ...section,
          state: "rerun" as const,
          score: 57,
          problems: ["Company strategy remained under the premium bar after repair attempts."],
          repair_actions: ["Deepen company strategy with stronger evidence and clearer tradeoffs."],
        };
      }

      return section;
    }),
    blocked_release_reasons: [
      "Company strategy section did not meet the premium depth contract.",
      "Depth remained below the premium minimum after evaluation.",
      "Evidence quality remained below the premium minimum after evaluation.",
    ],
    release_decision: "blocked" as const,
  };

  const blockedResult = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("weak"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona: inferPremiumPersona("Staff Software Engineer", "Lead architecture, reliability, and platform technical direction."),
    hasRetry: true,
  });

  assert.equal(blockedResult.release_decision, "blocked");

  const resolved = resolveQualityGateForPersistence(blockedResult, makeSections());

  assert.equal(resolved.release_decision, "suppress_and_release");
  assert.ok(resolved.warning_flags.some((warning) => /strongest available draft was persisted/i.test(warning)));
});

test("blocked quality-gate results downgrade when only one critical strategy section stays weak but the briefing spine remains usable", () => {
  const evaluation: PremiumEvaluationModelOutput = {
    ...baseEvaluation(),
    scores: {
      ...baseEvaluation().scores,
      overall_quality: 61,
      depth: 54,
      readiness_to_release: 56,
      evidence_quality: 52,
      company_context: 58,
    },
    section_results: baseEvaluation().section_results.map((section) => {
      if (section.section === "company_role_strategy") {
        return {
          ...section,
          state: "rerun" as const,
          score: 54,
          problems: ["Company strategy remained thin under degraded source conditions."],
          repair_actions: ["Deepen company strategy with stronger interpretation and clearer tradeoffs."],
        };
      }

      if (section.section === "company_context" || section.section === "candidate_fit") {
        return {
          ...section,
          state: "suppress" as const,
          score: 58,
          problems: ["Section stayed generic under degraded evidence conditions."],
          repair_actions: ["Suppress the section if stronger evidence is unavailable."],
        };
      }

      return section;
    }),
    blocked_release_reasons: [
      "Generic company context and candidate fit sections.",
      "Critical sections remained below the premium threshold: company_role_strategy.",
      "Depth remained below the premium minimum after evaluation.",
      "Evidence quality remained below the premium minimum after evaluation.",
    ],
    release_decision: "blocked" as const,
  };

  const blockedResult = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("weak"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona: inferPremiumPersona("Lead Product Manager, In-App Recording (Safety)", "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience."),
    hasRetry: true,
  });

  assert.equal(blockedResult.release_decision, "blocked");

  const resolved = resolveQualityGateForPersistence(blockedResult, makeSections());

  assert.equal(resolved.release_decision, "suppress_and_release");
  assert.ok(resolved.warning_flags.some((warning) => /strongest available draft was persisted/i.test(warning)));
});

test("blocked quality-gate results downgrade when the decision memo is only serviceable under degraded evidence", () => {
  const evaluation: PremiumEvaluationModelOutput = {
    ...baseEvaluation(),
    scores: {
      ...baseEvaluation().scores,
      overall_quality: 60,
      depth: 54,
      readiness_to_release: 55,
      evidence_quality: 52,
    },
    section_results: baseEvaluation().section_results.map((section) => {
      if (section.section === "decision_memo") {
        return {
          ...section,
          state: "rerun" as const,
          score: 58,
          problems: ["Decision memo stayed below the premium threshold under degraded evidence conditions."],
          repair_actions: ["Tighten the decision memo around supported evidence only."],
        };
      }

      if (section.section === "candidate_fit") {
        return {
          ...section,
          state: "suppress" as const,
          score: 58,
          problems: ["Candidate fit stayed generic under degraded evidence conditions."],
          repair_actions: ["Suppress candidate fit if stronger evidence is unavailable."],
        };
      }

      return section;
    }),
    blocked_release_reasons: [
      "Weak evidence in candidate fit section.",
      "Critical sections remained below the premium threshold: decision_memo.",
      "Depth remained below the premium minimum after evaluation.",
      "Evidence quality remained below the premium minimum after evaluation.",
    ],
    release_decision: "blocked" as const,
  };

  const blockedResult = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("weak"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona: inferPremiumPersona("Lead Product Manager, In-App Recording (Safety)", "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience."),
    hasRetry: true,
  });

  assert.equal(blockedResult.release_decision, "blocked");

  const resolved = resolveQualityGateForPersistence(blockedResult, makeSections());

  assert.equal(resolved.release_decision, "suppress_and_release");
  assert.ok(resolved.warning_flags.some((warning) => /strongest available draft was persisted/i.test(warning)));
});

test("blocked quality-gate results downgrade when only the decision memo and strategic core remain usable", () => {
  const evaluation: PremiumEvaluationModelOutput = {
    ...baseEvaluation(),
    scores: {
      ...baseEvaluation().scores,
      overall_quality: 58,
      depth: 52,
      readiness_to_release: 54,
      evidence_quality: 52,
      company_context: 58,
      interview_prep: 54,
    },
    section_results: baseEvaluation().section_results.map((section) => {
      if (section.section === "five_minute_brief") {
        return {
          ...section,
          state: "rerun" as const,
          score: 54,
          problems: ["Brief stayed too weak under degraded evidence conditions."],
          repair_actions: ["Tighten the brief around supported evidence only."],
        };
      }

      if (section.section === "company_context") {
        return {
          ...section,
          state: "suppress" as const,
          score: 58,
          problems: ["Company context stayed generic under degraded evidence conditions."],
          repair_actions: ["Suppress company context if stronger evidence is unavailable."],
        };
      }

      if (section.section === "why_role_exists_now") {
        return {
          ...section,
          state: "weak" as const,
          score: 54,
          problems: ["Role timing stayed thin under degraded evidence conditions."],
          repair_actions: ["Sharpen why-now reasoning with clearer role evidence."],
        };
      }

      if (section.section === "candidate_fit") {
        return {
          ...section,
          state: "suppress" as const,
          score: 58,
          problems: ["Candidate fit stayed generic under degraded evidence conditions."],
          repair_actions: ["Suppress candidate fit if stronger evidence is unavailable."],
        };
      }

      if (section.section === "interview_prep" || section.section === "how_to_win_this_process") {
        return {
          ...section,
          state: "rerun" as const,
          score: 54,
          problems: ["Interview guidance remained below the premium threshold after repairs."],
          repair_actions: ["Rewrite interview guidance around supported evidence only."],
        };
      }

      if (section.section === "decision_memo" || section.section === "company_role_strategy" || section.section === "credibility_layer") {
        return {
          ...section,
          state: "approved" as const,
          score: 60,
        };
      }

      return section;
    }),
    blocked_release_reasons: [
      "Company_context lacks depth and critical analysis.",
      "Critical sections remained below the premium threshold: interview_prep, how_to_win_this_process.",
      "Depth remained below the premium minimum after evaluation.",
      "Evidence quality remained below the premium minimum after evaluation.",
    ],
    release_decision: "blocked" as const,
  };

  const blockedResult = finalizePremiumQualityGate({
    evaluation,
    sections: makeSections(),
    evidenceQuality: makeEvidenceQuality("weak"),
    coverage: makeCoverage(),
    personaQa: makePersonaQa(),
    persona: inferPremiumPersona("Lead Product Manager, In-App Recording (Safety)", "Lead product strategy and cross-functional delivery for a safety-sensitive recording experience."),
    hasRetry: true,
  });

  assert.equal(blockedResult.release_decision, "blocked");

  const resolved = resolveQualityGateForPersistence(blockedResult, makeSections());

  assert.equal(resolved.release_decision, "suppress_and_release");
  assert.ok(resolved.warning_flags.some((warning) => /strongest available draft was persisted/i.test(warning)));
});

test("candidate fit is preserved for persistence when resume overlay is expected", () => {
  const sections = makeSections();
  delete sections.candidate_fit;

  const resolved = ensureRequiredSectionsForPersistence({
    sections,
    hasResumeOverlay: true,
    fallbackSections: makeSections(),
  });

  assert.ok(resolved.candidate_fit);
  assert.match(resolved.candidate_fit.evidence?.note ?? "", /Resume overlay refresh requires this section to remain persisted\./);
});

test("suppressed sections stay visible with low-confidence qualifiers after persistence resolution", () => {
  const resolvedGate = resolveQualityGateForPersistence(
    {
      overall_quality_score: 54,
      depth_score: 50,
      company_context_score: 51,
      evidence_score: 49,
      persona_score: 72,
      interview_prep_score: 52,
      readiness_to_release_score: 51,
      release_decision: "blocked",
      warning_flags: ["Generic company context is a failure."],
      blocked_release_reasons: ["Weak evidence cannot be hidden by good writing."],
      section_scores: {
        decision_memo: 62,
        five_minute_brief: 60,
        company_context: 48,
        why_role_exists_now: 57,
        company_role_strategy: 58,
        candidate_fit: 56,
        interview_prep: 52,
        how_to_win_this_process: 54,
        credibility_layer: 60,
      },
      section_states: {
        decision_memo: "weak",
        five_minute_brief: "weak",
        company_context: "suppress",
        why_role_exists_now: "weak",
        company_role_strategy: "weak",
        candidate_fit: "suppress",
        interview_prep: "rerun",
        how_to_win_this_process: "rerun",
        credibility_layer: "approved",
      },
      prompt_improvement_recommendations: [],
      reasoning_summary: "fixture",
      repair_instructions: [],
      suppressed_sections: ["company_context", "candidate_fit"],
    },
    makeSections(),
  );

  const gatedSections = applyQualityGateToSections(makeSections(), resolvedGate);

  assert.equal(resolvedGate.release_decision, "suppress_and_release");
  assert.ok(gatedSections.company_context);
  assert.equal(gatedSections.company_context.evidence?.status, "insufficient");
  assert.equal(gatedSections.company_context.evidence?.confidence, "suppressed");
  assert.match(gatedSections.company_context.evidence?.note ?? "", /exploratory and low-confidence/i);
  assert.ok(gatedSections.company_context.callouts?.some((callout) => /Confidence qualifier/i.test(callout.label)));
});
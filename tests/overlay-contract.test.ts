import test from "node:test";
import assert from "node:assert/strict";
import { getCandidateOverlayPrompt } from "../lib/ai/overlayPrompt.ts";
import { buildPremiumCandidateFitSection } from "../lib/report/generateOverlay.ts";
import type { CandidateOverlayData } from "../lib/types/index.ts";

test("overlay prompt requires score dimensions and final decision", () => {
  const prompt = getCandidateOverlayPrompt(
    "Candidate led B2B platform strategy and cross-functional launches.",
    "ExampleCo",
    "Director of Product",
    "Own product strategy for a core business line.",
    undefined,
    undefined
  );

  assert.match(prompt, /Score candidate fit using these exact dimensions/i);
  assert.match(prompt, /relevant domain experience/i);
  assert.match(prompt, /scope and seniority match/i);
  assert.match(prompt, /functional skill match/i);
  assert.match(prompt, /strategic context match/i);
  assert.match(prompt, /risks and gaps/i);
  assert.match(prompt, /The final decision must be exactly one of: Pursue Aggressively, Pursue Cautiously, Borderline, Do Not Pursue\./i);
});

test("overlay candidate fit section persists the simplified scoring contract", () => {
  const overlayData: CandidateOverlayData = {
    candidate_role_match: {
      overall_fit: "moderate",
      match_score: 7,
      rationale: "The candidate has strong product and leadership evidence, but some domain-specific gaps remain.",
      score_dimensions: {
        relevant_domain_experience: { score: 6, rationale: "Adjacent domain experience is present, but not direct category depth." },
        scope_and_seniority_match: { score: 8, rationale: "The candidate has operated at comparable scope and seniority." },
        functional_skill_match: { score: 8, rationale: "Core product strategy and cross-functional execution skills are well evidenced." },
        strategic_context_match: { score: 7, rationale: "The candidate appears able to operate in this company context, though some adaptation is required." },
        risks_and_gaps: { score: 5, rationale: "Some category and stakeholder-specific gaps could be probed in interviews." },
      },
      final_decision: "Pursue Cautiously",
      key_alignments: [
        { alignment: "Product strategy leadership", resume_evidence: "Led roadmap and platform strategy across a B2B SaaS portfolio." },
      ],
      key_gaps: ["Direct category depth is limited."],
    },
    strengths_to_emphasize: {
      strengths: [
        {
          strength: "Cross-functional product leadership",
          evidence_from_resume: "Owned roadmap and launches across product, design, and engineering.",
          why_it_matters_for_role: "The role requires alignment and execution across multiple functions.",
        },
      ],
    },
    interviewer_concerns: {
      concerns: [
        {
          concern: "Limited direct category depth",
          likely_question: "How quickly can you get up to speed in this domain?",
          severity: "medium",
        },
      ],
    },
    gap_management: {
      gaps: [
        {
          gap: "Direct category depth is limited.",
          reframe: "The candidate has adjacent strategic and product experience in similar buyer and platform contexts.",
          talking_point: "I have not worked in this exact category, but I have led similar platform and monetization problems with comparable stakeholders.",
        },
      ],
    },
    story_recommendations: {
      stories: [
        {
          theme: "Strategic prioritization",
          suggested_story: "Describe how you reset roadmap priorities around a high-value platform bet.",
          maps_to_requirement: "Own product strategy for a core business line.",
        },
      ],
    },
    positioning_strategy: {
      headline: "Product leader who translates ambiguity into cross-functional execution.",
      narrative_arc: "Built from platform product strategy into broader business-facing product leadership.",
      tell_me_about_yourself: "I have spent the last several years leading platform and product strategy work in B2B SaaS, with a focus on turning ambiguous opportunities into shipped outcomes.",
      what_to_avoid: ["Overclaiming direct category expertise."],
    },
    objection_handling: {
      objections: [
        {
          objection: "They have not worked directly in this category before.",
          why_they_think_this: "The resume shows adjacent rather than direct domain experience.",
          how_to_respond: "Acknowledge the gap, then point to similar strategic and execution problems solved in adjacent markets.",
          proof_points: ["Led adjacent platform strategy with similar stakeholders and complexity."],
          what_not_to_say: "Domain is easy, so I will learn it quickly.",
        },
      ],
    },
  };

  const section = buildPremiumCandidateFitSection(overlayData);

  assert.ok(section.facts?.some((fact) => fact.label === "Relevant Domain Experience" && fact.value === "6/10"));
  assert.ok(section.facts?.some((fact) => fact.label === "Scope And Seniority Match" && fact.value === "8/10"));
  assert.ok(section.facts?.some((fact) => fact.label === "Functional Skill Match" && fact.value === "8/10"));
  assert.ok(section.facts?.some((fact) => fact.label === "Strategic Context Match" && fact.value === "7/10"));
  assert.ok(section.facts?.some((fact) => fact.label === "Risks And Gaps" && fact.value === "5/10"));
  assert.ok(section.facts?.some((fact) => fact.label === "Final Decision" && fact.value === "Pursue Cautiously"));
  assert.ok(section.blocks?.some((block) => block.title === "Score Breakdown"));
  assert.ok(section.blocks?.some((block) => block.title === "Gap Management"));
});

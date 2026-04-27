import test from "node:test";
import assert from "node:assert/strict";
import { getPremiumPresentationPlan, inferPremiumPersona } from "../lib/report/premiumPersona.ts";
import { buildPremiumPresentationViewModel } from "../lib/report/premiumPresentationViewModel.ts";
import { PREMIUM_SECTION_DEFINITIONS } from "../lib/report/premiumTypes.ts";

function makeSectionContent(surface: "both" | "full") {
  return JSON.stringify({
    schema: "premium_section_v1",
    group: "Strategy",
    surface,
    question: "What matters?",
    summary: "Fixture summary",
    evidence: {
      threshold: "Fixture threshold",
      status: "met",
      confidence: "high",
      note: "Fixture note",
    },
  });
}

function buildFixtureReport(roleTitle: string, jobDescription: string) {
  const persona = inferPremiumPersona(roleTitle, jobDescription);
  const plan = getPremiumPresentationPlan(persona);
  const definitionsByKey = new Map(PREMIUM_SECTION_DEFINITIONS.map((definition) => [definition.key, definition]));

  return {
    persona,
    plan,
    report: {
      personaProfile: {
        roleFamilyLabel: persona.roleFamilyLabel,
        seniorityLabel: persona.seniorityLabel,
        subspecialization: persona.subspecialization,
        confidence: persona.confidence,
      },
      sections: plan.sectionOrder.map((key, index) => {
        const definition = definitionsByKey.get(key);
        if (!definition) {
          throw new Error(`Missing section definition for ${key}`);
        }

        return {
          id: `${key}-${index}`,
          key,
          title: plan.titleBySectionKey[key] ?? definition.title,
          content: makeSectionContent(definition.surface),
          citations: [],
        };
      }),
    },
  };
}

test("presentation plan keeps company and role context ahead of candidate and interview sections", () => {
  const { report } = buildFixtureReport(
    "Staff Software Engineer, Infrastructure",
    "Lead architecture, reliability, and platform execution across multiple teams."
  );

  const viewModel = buildPremiumPresentationViewModel(report, "full");

  assert.deepEqual(
    viewModel.visibleSections.slice(0, 4).map((section) => section.title),
    [
      "Company Overview",
      "Products, Strategy, And Market",
      "About the Role",
      "Final Recommendation",
    ]
  );
  assert.deepEqual(viewModel.personaBadges, ["Engineering", "Staff / Principal / Architect", "Infrastructure"]);
});

test("different personas keep the same simplified visible structure", () => {
  const engineering = buildFixtureReport(
    "Staff Software Engineer, Infrastructure",
    "Lead architecture, reliability, and platform execution across multiple teams."
  );
  const executive = buildFixtureReport(
    "VP Product",
    "Own portfolio strategy, org design, and executive decision making across the business."
  );

  const engineeringView = buildPremiumPresentationViewModel(engineering.report, "full");
  const executiveView = buildPremiumPresentationViewModel(executive.report, "full");

  assert.deepEqual(
    executiveView.visibleSections.slice(0, 5).map((section) => section.title),
    [
      "Company Overview",
      "Products, Strategy, And Market",
      "About the Role",
      "Final Recommendation",
      "Candidate-Skill Match",
    ]
  );
  assert.deepEqual(
    executiveView.visibleSections.map((section) => section.title),
    engineeringView.visibleSections.map((section) => section.title)
  );
});

test("brief mode keeps only both-surface sections while preserving persisted persona order", () => {
  const { report } = buildFixtureReport(
    "VP Product",
    "Own portfolio strategy, org design, and executive decision making across the business."
  );

  const viewModel = buildPremiumPresentationViewModel(report, "brief");

  assert.deepEqual(
    viewModel.visibleSections.map((section) => section.key),
    [
      "why_role_exists_now",
      "decision_memo",
      "five_minute_brief",
      "how_to_win_this_process",
    ]
  );
});

test("full mode groups visible sections into the four main product categories", () => {
  const { report } = buildFixtureReport(
    "VP Product",
    "Own portfolio strategy, org design, and executive decision making across the business."
  );

  const viewModel = buildPremiumPresentationViewModel(report, "full");

  assert.ok(!viewModel.visibleSections.some((section) => section.key === "credibility_layer"));
  assert.ok(!viewModel.visibleSections.some((section) => section.key === "operations_and_cost"));
  assert.deepEqual(
    Array.from(new Set(viewModel.visibleSections.map((section) => section.group))),
    [
      "Company Deep Dive",
      "About the Role",
      "Candidate-Skill Match",
      "Interview Preparation",
    ]
  );
});
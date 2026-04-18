import test from "node:test";
import assert from "node:assert/strict";
import { getPremiumPresentationPlan, inferPremiumPersona } from "../lib/report/premiumPersona.ts";

test("engineering persona gets technical-first section ordering and labels", () => {
  const persona = inferPremiumPersona(
    "Staff Software Engineer",
    "Lead architecture, reliability, and cross-team technical direction."
  );
  const plan = getPremiumPresentationPlan(persona);

  assert.deepEqual(plan.sectionOrder.slice(0, 4), [
    "decision_memo",
    "five_minute_brief",
    "company_context",
    "company_role_strategy",
  ]);
  assert.equal(plan.titleBySectionKey.company_role_strategy, "Technical And Role Strategy");
  assert.equal(plan.titleBySectionKey.interview_prep, "Technical Interview Prep");
});

test("executive persona gets mandate-first relabeling", () => {
  const persona = inferPremiumPersona(
    "VP Product",
    "Own portfolio strategy, org design, and executive decision making across the business."
  );
  const plan = getPremiumPresentationPlan(persona);

  assert.equal(plan.titleBySectionKey.company_role_strategy, "Business And Role Strategy");
  assert.equal(plan.titleBySectionKey.how_to_win_this_process, "How To Win The Executive Process");
  assert.equal(plan.titleBySectionKey.candidate_fit, "Leadership Fit");
  assert.equal(plan.sectionOrder[2], "company_context");
});
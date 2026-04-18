import test from "node:test";
import assert from "node:assert/strict";
import { buildPersonaAwareRetrievalQueries, inferPremiumPersona } from "../lib/report/premiumPersona.ts";

test("persona inference classifies product director roles without collapsing into executive", () => {
  const persona = inferPremiumPersona(
    "Director of Product",
    "Own product strategy, prioritization, experimentation, and cross-functional leadership for a core platform area."
  );

  assert.equal(persona.roleFamily, "product");
  assert.equal(persona.primaryRoleFamily, "product");
  assert.equal(persona.seniority, "director");
  assert.equal(persona.roleFamilyLabel, "Product");
});

test("persona inference classifies engineering staff-plus roles and technical sub-specialization", () => {
  const persona = inferPremiumPersona(
    "Staff Software Engineer, Infrastructure",
    "Lead architecture decisions for distributed systems, reliability, and platform infrastructure across teams."
  );

  assert.equal(persona.roleFamily, "engineering");
  assert.equal(persona.primaryRoleFamily, "engineering");
  assert.equal(persona.seniority, "staff_principal_architect");
  assert.equal(persona.subspecialization, "Infrastructure");
});

test("persona inference promotes VP scope into executive family", () => {
  const persona = inferPremiumPersona(
    "VP Product",
    "Own product portfolio strategy, org design, business outcomes, and executive stakeholder communication."
  );

  assert.equal(persona.roleFamily, "executive");
  assert.equal(persona.seniority, "senior_director_vp");
  assert.equal(persona.subspecialization, "VP Product");
});

test("persona inference activates blended mode for engineering plus data ml roles", () => {
  const persona = inferPremiumPersona(
    "Staff Platform Engineer",
    "Lead architecture for model serving, experimentation infrastructure, model quality, and production ML systems across teams."
  );

  assert.equal(persona.primaryRoleFamily, "engineering");
  assert.equal(persona.secondaryRoleFamily, "data_ml");
  assert.equal(persona.isBlendedPersona, true);
  assert.ok(persona.retrievalProfile.secondaryBranchActivated);
});

test("persona-aware retrieval queries change by role family", () => {
  const engineeringPersona = inferPremiumPersona(
    "Senior Software Engineer",
    "Own reliability, API design, and distributed systems execution."
  );
  const queries = buildPersonaAwareRetrievalQueries(
    "ExampleInfra",
    "Senior Software Engineer",
    "Own reliability, API design, and distributed systems execution.",
    engineeringPersona
  );

  assert.equal(queries.length, 8);
  assert.ok(queries.some((query) => /architecture|engineering blog|reliability|developer docs/i.test(query)));
  assert.ok(queries.some((query) => /mission|vision|culture|operating principles/i.test(query)));
  assert.ok(queries.some((query) => /investor relations|shareholder letter|annual report|strategic priorities/i.test(query)));
});

test("persona inference stays anchored to title and job description instead of resume context", () => {
  const persona = inferPremiumPersona(
    "Solutions Architect",
    "Drive technical discovery and architect partner integrations for enterprise customers.",
    "Senior Product Manager with 8 years owning roadmap, prioritization, experimentation, and platform strategy across B2B SaaS products."
  );

  assert.equal(persona.roleFamily, "engineering");
  assert.equal(persona.roleFamilyLabel, "Engineering");
});

test("persona inference keeps lead product manager roles out of executive without explicit business ownership", () => {
  const persona = inferPremiumPersona(
    "Lead Product Manager, In-App Recording (Safety)",
    "Lead product strategy for recording safety experiences, partner with engineering and legal, define roadmap, and drive cross-functional execution for a high-stakes user surface."
  );

  assert.equal(persona.roleFamily, "product");
  assert.equal(persona.primaryRoleFamily, "product");
  assert.equal(persona.seniority, "senior_ic");
  assert.match(persona.personaEvidence.join(" "), /product-manager title signals kept this role in Product/i);
});

test("persona inference falls back to job description when title is ambiguous", () => {
  const persona = inferPremiumPersona(
    "Lead",
    "Own product strategy, prioritization, user research synthesis, and roadmap execution for the core platform area."
  );

  assert.equal(persona.roleFamily, "product");
  assert.match(persona.personaEvidence.join(" "), /JD|job description/i);
});
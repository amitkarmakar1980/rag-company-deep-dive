import test from "node:test";
import assert from "node:assert/strict";
import { getPremiumReportPromptV2 } from "../lib/ai/premiumPromptsV2.ts";
import { inferPremiumPersona } from "../lib/report/premiumPersona.ts";
import type { RetrievalContext } from "../lib/types/index.ts";
import type { PremiumEvidenceQuality, PremiumSourceCoverageSummary } from "../lib/report/premiumTelemetry.ts";

function emptySourceAudit() {
  return {
    mandatory: [],
    preferred: [],
    optional: [],
    satisfiedMandatoryCount: 0,
    satisfiedPreferredCount: 0,
    missingMandatory: [],
    missingPreferred: [],
  };
}

test("premium prompt assembly embeds runtime artifacts and core evidence blocks", async () => {
  const context: RetrievalContext = {
    chunks: [
      {
        text: "Leadership commentary indicates AI platform unification is a current priority.",
        source_id: "src-1",
        source_title: "Q1 shareholder letter",
        source_url: "https://example.com/shareholder-letter",
        source_type: "newsroom",
      },
    ],
    metadata: {
      total_chunks_available: 1,
      retrieval_confidence: 0.8,
      evidence_quality: undefined,
    },
  };

  const evidenceQuality: PremiumEvidenceQuality = {
    raw_chunk_count: 4,
    final_chunk_count: 1,
    distinct_source_count: 1,
    distinct_source_types: 1,
    rating: "weak",
    warnings: ["Very few chunks available; strategic coverage may be thin."],
  };

  const coverage: PremiumSourceCoverageSummary = {
    total_sources: 3,
    distinct_hosts: 2,
    distinct_source_types: 2,
    primary_sources_used: 2,
    recent_sources: 2,
    reranked_chunks: 1,
    retrieval_queries: ["example strategy query"],
    source_type_breakdown: [
      { type: "newsroom", count: 2 },
      { type: "job_description", count: 1 },
    ],
    persona_source_class_audit: emptySourceAudit(),
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleCo",
    "Director of Product",
    "Lead strategy for a cross-functional AI product area.",
    "Candidate has marketplace and AI platform experience.",
    evidenceQuality,
    coverage,
    inferPremiumPersona("Director of Product", "Lead strategy for a cross-functional AI product area.")
  );

  assert.match(prompt, /REPORT GENERATION SPEC ARTIFACT/);
  assert.match(prompt, /PIPELINE ARCHITECTURE ARTIFACT/);
  assert.match(prompt, /COST LEDGER SCHEMA ARTIFACT/);
  assert.match(prompt, /MASTER PROMPT ARTIFACT/);
  assert.match(prompt, /Premium Interview Intelligence Report — Generation Spec/);
  assert.match(prompt, /Premium Interview Intelligence Report — Pipeline Architecture/);
  assert.match(prompt, /Premium Interview Intelligence Report — Master Copilot Prompt/);
  assert.match(prompt, /"report_id": "uuid"/);
  assert.match(prompt, /Available evidence \(1 chunks total, showing up to 1 highest-ranked chunks within prompt budget\):/);
  assert.match(prompt, /Leadership commentary indicates AI platform unification is a current priority\./);
});

test("premium prompt assembly includes anti-generic quality guardrails", async () => {
  const context: RetrievalContext = {
    chunks: [
      {
        text: "The role spans monetization, platform controls, and AI product decisions.",
        source_id: "src-2",
        source_title: "Role description",
        source_url: "https://example.com/role",
        source_type: "job_description",
      },
    ],
    metadata: {
      total_chunks_available: 1,
      retrieval_confidence: 0.7,
      evidence_quality: undefined,
    },
  };

  const evidenceQuality: PremiumEvidenceQuality = {
    raw_chunk_count: 6,
    final_chunk_count: 1,
    distinct_source_count: 1,
    distinct_source_types: 1,
    rating: "weak",
    warnings: [],
  };

  const coverage: PremiumSourceCoverageSummary = {
    total_sources: 2,
    distinct_hosts: 1,
    distinct_source_types: 1,
    primary_sources_used: 2,
    recent_sources: 1,
    reranked_chunks: 1,
    retrieval_queries: ["example role strategy query"],
    source_type_breakdown: [{ type: "job_description", count: 2 }],
    persona_source_class_audit: emptySourceAudit(),
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleCo",
    "Senior Director, AI Product",
    "Lead AI platform and monetization strategy.",
    undefined,
    evidenceQuality,
    coverage,
    inferPremiumPersona("Senior Director, AI Product", "Lead AI platform and monetization strategy.")
  );

  assert.match(prompt, /The product has exactly 4 broad categories:/);
  assert.match(prompt, /generic writing/i);
  assert.match(prompt, /Do not invent facts\./);
  assert.match(prompt, /If the role is ambiguous, separate what is known from what is inferred\./);
  assert.match(prompt, /Do not write generic interview advice that could apply to another company or role\./);
  assert.match(prompt, /Do not write employee sentiment unless there is actual evidence for it\./);
  assert.match(prompt, /Company Snapshot, Mission And Values, and Employee Sentiment/i);
  assert.match(prompt, /Product Lines, Strategic Bets, Market Position, SWOT - Strengths, SWOT - Weaknesses, SWOT - Opportunities, and SWOT - Threats/i);
  assert.match(prompt, /Final Decision must be one of: Pursue Aggressively, Pursue Cautiously, Borderline, Do Not Pursue\./);
  assert.match(prompt, /For each likely question include why this question is likely, what resume evidence is relevant, what story to prepare, and what weak point may get probed\./i);
});

test("premium prompt assembly hardens repair passes for weak company depth", async () => {
  const context: RetrievalContext = {
    chunks: [
      {
        text: "Leadership commentary emphasizes trust, safety, and platform discipline while the newsroom highlights rider-safety tooling and operating tradeoffs.",
        source_id: "src-repair-1",
        source_title: "Leadership and newsroom bundle",
        source_url: "https://example.com/leadership-and-news",
        source_type: "newsroom",
      },
    ],
    metadata: {
      total_chunks_available: 1,
      retrieval_confidence: 0.7,
      evidence_quality: undefined,
    },
  };

  const evidenceQuality: PremiumEvidenceQuality = {
    raw_chunk_count: 9,
    final_chunk_count: 1,
    distinct_source_count: 1,
    distinct_source_types: 1,
    rating: "moderate",
    warnings: [],
  };

  const coverage: PremiumSourceCoverageSummary = {
    total_sources: 4,
    distinct_hosts: 2,
    distinct_source_types: 2,
    primary_sources_used: 3,
    recent_sources: 3,
    reranked_chunks: 1,
    retrieval_queries: ["repair depth query"],
    source_type_breakdown: [
      { type: "newsroom", count: 2 },
      { type: "job_description", count: 2 },
    ],
    persona_source_class_audit: emptySourceAudit(),
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleCo",
    "Lead Product Manager",
    "Lead product strategy for a safety-sensitive platform surface.",
    undefined,
    evidenceQuality,
    coverage,
    inferPremiumPersona("Lead Product Manager", "Lead product strategy for a safety-sensitive platform surface."),
    [
      "Company strategy stays below the 300-word premium minimum.",
      "Rewrite interview-prep content so it becomes role-family-specific, seniority-specific, and interviewer-proof-oriented rather than generic.",
    ]
  );

  assert.match(prompt, /REPAIR PRIORITIES/);
  assert.match(prompt, /Rewrite weak sections from scratch instead of padding or lightly editing them\./i);
});

test("premium prompt assembly injects inferred persona guidance", async () => {
  const context: RetrievalContext = {
    chunks: [
      {
        text: "The role requires architecture tradeoffs, reliability judgment, and cross-team technical leadership.",
        source_id: "src-3",
        source_title: "Engineering role description",
        source_url: "https://example.com/eng-role",
        source_type: "job_description",
      },
    ],
    metadata: {
      total_chunks_available: 1,
      retrieval_confidence: 0.7,
      evidence_quality: undefined,
    },
  };

  const evidenceQuality: PremiumEvidenceQuality = {
    raw_chunk_count: 8,
    final_chunk_count: 1,
    distinct_source_count: 1,
    distinct_source_types: 1,
    rating: "weak",
    warnings: [],
  };

  const coverage: PremiumSourceCoverageSummary = {
    total_sources: 3,
    distinct_hosts: 2,
    distinct_source_types: 2,
    primary_sources_used: 2,
    recent_sources: 2,
    reranked_chunks: 1,
    retrieval_queries: ["engineering architecture role query"],
    source_type_breakdown: [{ type: "job_description", count: 2 }],
    persona_source_class_audit: emptySourceAudit(),
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleInfra",
    "Staff Software Engineer",
    "Lead architecture decisions, reliability work, and platform-wide technical direction.",
    undefined,
    evidenceQuality,
    coverage,
    inferPremiumPersona("Staff Software Engineer", "Lead architecture decisions, reliability work, and platform-wide technical direction.")
  );

  assert.match(prompt, /INFERRED PERSONA/);
  assert.match(prompt, /primary role family: Engineering/);
  assert.match(prompt, /role family: Engineering/);
  assert.match(prompt, /seniority: Staff \/ Principal \/ Architect/);
  assert.match(prompt, /What bad output looks like:/);
});

test("premium prompt assembly caps evidence and artifact payloads to stay within prompt budget", async () => {
  const oversizedChunk = "architecture ".repeat(500);
  const context: RetrievalContext = {
    chunks: Array.from({ length: 14 }, (_, index) => ({
      text: `${oversizedChunk}${index}`,
      source_id: `src-${index}`,
      source_title: `Source ${index}`,
      source_url: `https://example.com/${index}`,
      source_type: "custom_url",
    })),
    metadata: {
      total_chunks_available: 14,
      retrieval_confidence: 0.9,
      evidence_quality: undefined,
    },
  };

  const evidenceQuality: PremiumEvidenceQuality = {
    raw_chunk_count: 20,
    final_chunk_count: 14,
    distinct_source_count: 10,
    distinct_source_types: 3,
    rating: "strong",
    warnings: [],
  };

  const coverage: PremiumSourceCoverageSummary = {
    total_sources: 10,
    distinct_hosts: 5,
    distinct_source_types: 3,
    primary_sources_used: 4,
    recent_sources: 4,
    reranked_chunks: 14,
    retrieval_queries: ["oversized prompt budget query"],
    source_type_breakdown: [{ type: "custom_url", count: 10 }],
    persona_source_class_audit: emptySourceAudit(),
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleInfra",
    "Staff Software Engineer",
    "Lead architecture decisions, reliability work, and platform-wide technical direction.",
    undefined,
    evidenceQuality,
    coverage,
    inferPremiumPersona("Staff Software Engineer", "Lead architecture decisions, reliability work, and platform-wide technical direction.")
  );

  assert.match(prompt, /showing up to 12 highest-ranked chunks within prompt budget/i);
  assert.match(prompt, /SOURCE 12 - UNTRUSTED EVIDENCE/);
  assert.doesNotMatch(prompt, /SOURCE 13 - UNTRUSTED EVIDENCE/);
  assert.match(prompt, /TRUNCATED FOR PROMPT BUDGET/);
});
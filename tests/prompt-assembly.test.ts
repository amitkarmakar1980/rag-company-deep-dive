import test from "node:test";
import assert from "node:assert/strict";
import { getPremiumReportPromptV2 } from "../lib/ai/premiumPromptsV2.ts";
import type { RetrievalContext } from "../lib/types/index.ts";
import type { PremiumEvidenceQuality, PremiumSourceCoverageSummary } from "../lib/report/premiumTelemetry.ts";

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
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleCo",
    "Director of Product",
    "Lead strategy for a cross-functional AI product area.",
    "Candidate has marketplace and AI platform experience.",
    evidenceQuality,
    coverage
  );

  assert.match(prompt, /REPORT GENERATION SPEC ARTIFACT/);
  assert.match(prompt, /PIPELINE ARCHITECTURE ARTIFACT/);
  assert.match(prompt, /COST LEDGER SCHEMA ARTIFACT/);
  assert.match(prompt, /MASTER PROMPT ARTIFACT/);
  assert.match(prompt, /Premium Interview Intelligence Report — Generation Spec/);
  assert.match(prompt, /Premium Interview Intelligence Report — Pipeline Architecture/);
  assert.match(prompt, /Premium Interview Intelligence Report — Master Copilot Prompt/);
  assert.match(prompt, /"report_id": "uuid"/);
  assert.match(prompt, /Available evidence \(1 chunks\):/);
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
    notes: [],
  };

  const prompt = await getPremiumReportPromptV2(
    context,
    "ExampleCo",
    "Senior Director, AI Product",
    "Lead AI platform and monetization strategy.",
    undefined,
    evidenceQuality,
    coverage
  );

  assert.match(prompt, /Generic PM coaching is a failure\./);
  assert.match(prompt, /Generic competitor bullets are a failure\./);
  assert.match(prompt, /Restating the JD as role strategy is a failure\./);
  assert.match(prompt, /Reject any output that could apply to any PM interview\./);
  assert.match(prompt, /If this section reads like summary bullets, it has failed\./);
  assert.match(prompt, /Do not flatten interview prep into generic PM advice\./);
  assert.match(prompt, /Do not produce competitor bullets without strategic implications\./);
  assert.match(prompt, /Do not produce story guidance without mapping story to theme, proof, and likely follow-up\./);
});
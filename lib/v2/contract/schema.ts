import { z } from "zod";

/**
 * V2 report contract.
 *
 * A report is structured data, not prose. Generation produces Claims;
 * rendering is deterministic code over those Claims. This separation is
 * what makes the output evaluable — a claim can be checked against the
 * chunk it cites, a paragraph cannot.
 */

/** How much epistemic weight a claim carries. Mislabeling is an eval failure. */
export const ClaimLabel = z.enum([
  // Directly supported by cited evidence. Requires >= 1 evidenceId.
  "fact",
  // Reasoned from evidence but not stated in it. Requires >= 1 evidenceId
  // plus `reasoning` making the inferential step explicit.
  "inference",
  // A material unknown. Carries no evidence; states what would resolve it.
  "open_question",
]);
export type ClaimLabel = z.infer<typeof ClaimLabel>;

/** Pointer into the evidence store. `chunkId` is the unit a verifier checks. */
export const EvidenceRef = z.object({
  chunkId: z.string(),
  sourceId: z.string(),
  url: z.string().optional(),
  /** Verbatim span from the chunk that supports the claim. Verifier checks
   *  this substring actually occurs in the chunk — cheap anti-hallucination. */
  quote: z.string().min(1).max(600),
  publishedAt: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRef>;

/**
 * How a claim participates in the document when the same underlying fact is
 * asserted by more than one section.
 *
 * Assigned by the reconciliation step, which sees every section's claims at
 * once — not by the writers themselves. A writer cannot know whether its fact
 * matters more here than in some other section, and a sequential ledger would
 * just hand ownership to whichever section happened to run first.
 */
export const ClaimRole = z.enum([
  // The section where this fact carries the most analytical weight. Stated
  // in full, with evidence. Exactly one per fact cluster.
  "canonical",
  // Same fact, needed here for continuity, but not restated — rendered as a
  // short callback to the canonical statement.
  "reference",
  // Deliberately restated because it carries different meaning here.
  // Requires `repetitionRationale`; downgraded to `reference` without one.
  "reinforce",
]);
export type ClaimRole = z.infer<typeof ClaimRole>;

export const Claim = z
  .object({
    id: z.string(),
    /**
     * Canonical identity of the underlying fact, shared by every claim that
     * asserts it. Claims with the same factKey form one cluster.
     */
    factKey: z.string().optional(),
    role: ClaimRole.default("canonical"),
    /** Required for `reinforce`: what this restatement adds that the
     *  canonical statement does not. Enforces "repeat only when it earns it." */
    repetitionRationale: z.string().max(400).optional(),
    /** One assertion. Not a paragraph — if it has an "and", it is two claims. */
    statement: z.string().min(1).max(500),
    label: ClaimLabel,
    evidence: z.array(EvidenceRef).default([]),
    /** Required for `inference`: the step from evidence to statement. */
    reasoning: z.string().max(800).optional(),
    /** Model's own confidence. Calibration is itself an eval metric. */
    confidence: z.enum(["high", "medium", "low"]),
    /** For open_question: what source or answer would close it. */
    resolvesWith: z.string().max(300).optional(),
    /** Why a senior PM candidate should care. Drives ranking at render time. */
    soWhat: z.string().max(400).optional(),
  })
  .superRefine((c, ctx) => {
    if (c.label !== "open_question" && c.evidence.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["evidence"],
        message: `A '${c.label}' claim requires at least one EvidenceRef.`,
      });
    }
    if (c.label === "inference" && !c.reasoning) {
      ctx.addIssue({
        code: "custom",
        path: ["reasoning"],
        message: "An 'inference' claim requires explicit reasoning.",
      });
    }
    if (c.label === "open_question" && c.evidence.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "An 'open_question' must not cite evidence.",
      });
    }
    if (c.role === "reinforce" && !c.repetitionRationale) {
      ctx.addIssue({
        code: "custom",
        path: ["repetitionRationale"],
        message:
          "A 'reinforce' claim must justify the repetition, or be demoted to 'reference'.",
      });
    }
    if (c.role !== "canonical" && !c.factKey) {
      ctx.addIssue({
        code: "custom",
        path: ["factKey"],
        message: "A non-canonical claim must name the fact cluster it belongs to.",
      });
    }
  });
export type Claim = z.infer<typeof Claim>;

/** Analytical dimensions. Each maps to one writer agent and one rubric. */
export const SectionId = z.enum([
  "company_snapshot",
  "vision_and_values",
  "product_and_customers",
  "product_teardown",
  "competitive_landscape",
  "swot",
  "role_fit",
  "strategy_module",
]);
export type SectionId = z.infer<typeof SectionId>;

/** Emitted by the retrieval layer, before any writing happens. A section
 *  with thin coverage is reported as thin rather than padded with fabrication. */
export const CoverageReport = z.object({
  questionsAsked: z.number().int().nonnegative(),
  questionsAnswered: z.number().int().nonnegative(),
  chunksRetrieved: z.number().int().nonnegative(),
  /** Questions the researcher loop could not satisfy within budget. */
  unresolvedQuestions: z.array(z.string()).default([]),
  sufficiency: z.enum(["strong", "partial", "thin"]),
});
export type CoverageReport = z.infer<typeof CoverageReport>;

export const Section = z.object({
  id: SectionId,
  title: z.string(),
  /** 2-4 sentences. The only free prose the writer produces, and it must be
   *  derivable from the claims below it. */
  summary: z.string().max(1200),
  claims: z.array(Claim),
  coverage: CoverageReport,
  /** Set by the verifier agent after grounding checks. */
  verification: z
    .object({
      rounds: z.number().int().nonnegative(),
      claimsChecked: z.number().int().nonnegative(),
      claimsRejected: z.number().int().nonnegative(),
      passed: z.boolean(),
    })
    .optional(),
});
export type Section = z.infer<typeof Section>;

export const Report = z.object({
  requestId: z.string(),
  companyName: z.string(),
  roleTitle: z.string().optional(),
  generatedAt: z.string(),
  sections: z.array(Section),
  /** Run-level telemetry the orchestrator fills in. */
  run: z
    .object({
      costUsd: z.number().nonnegative(),
      durationMs: z.number().nonnegative(),
      modelCalls: z.number().int().nonnegative(),
    })
    .optional(),
});
export type Report = z.infer<typeof Report>;

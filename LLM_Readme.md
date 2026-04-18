# LLM / RAG Decision Log

This document records how the AI stack in this repository evolved from the original deep-dive pipeline to the current premium, persona-aware, quality-gated system. It is intended to explain what changed, why it changed, and where the main logic now lives.

## 1. Product Goal

The product is not a generic company-summary tool. The goal is to generate an interview-intelligence report that helps a candidate understand:

- what the company is doing now
- why the role exists now
- what a strong candidate should emphasize
- what the likely interview loop will test
- how much confidence the system should have in its own conclusions

That product goal drove nearly every LLM and retrieval decision. The system moved steadily away from "one-shot polished summary generation" and toward "retrieval-backed, role-aware, self-auditing report generation."

## 2. Current Architecture Snapshot

As of the current codebase, the main AI stack is split across these areas:

- Model routing and provider failover: `lib/ai/openai.ts`, `lib/ai/openaiClient.ts`
- Embeddings: `lib/ai/embeddings.ts`
- Premium prompt assembly: `lib/ai/premiumPromptsV2.ts`
- Premium evaluation prompt: `lib/ai/premiumEvaluationPrompt.ts`
- Retrieval and reranking: `lib/retrieval/search.ts`
- Source planning and ingestion: `lib/ingestion/firecrawl.ts`, `lib/ingestion/ingest.ts`
- Premium orchestration: `lib/report/assemblePremiumReportV2.ts`
- Persona inference and presentation shaping: `lib/report/premiumPersona.ts`
- Quality gate and release policy: `lib/report/premiumQualityGate.ts`
- Telemetry and source-coverage accounting: `lib/report/premiumTelemetry.ts`

Current default model roles:

- Deep analysis: `o4-mini`
- Standard synthesis: `gpt-4o-mini`
- Overlay / candidate personalization: `gpt-4o`
- Premium synthesis: `o3`
- Embeddings: `text-embedding-3-small`

## 3. Phase 1: Original Deep-Dive Pipeline

The initial architecture was a multi-stage, retrieval-backed report pipeline rather than a single prompt.

### 3.1 Initial design choice

The original decision was to separate the work into distinct reasoning layers:

- a deeper strategy / analysis layer
- a lighter interview-oriented synthesis layer
- a candidate overlay layer when resume context exists

Reasoning:

- deeper business and role reasoning benefits from a stronger reasoning model
- cheaper synthesis is sufficient for shorter structured sections
- candidate overlay should be isolated so personalization can be added later or regenerated independently

### 3.2 Original model split

The repo README and current routing logic reflect the original model philosophy:

- `o4-mini` for deeper reasoning-intensive analysis
- `gpt-4o-mini` for faster synthesis-oriented report sections
- `gpt-4o` for overlay / personalization quality

Why this split existed:

- cost control: not every stage needed the most expensive model
- latency control: only the highest-value reasoning stage used the heavier model
- composability: each layer could evolve independently

### 3.3 Original RAG strategy

The first retrieval architecture already avoided naive single-query search. It used:

- source planning
- web fetch / scrape
- content cleaning
- chunking
- embeddings
- vector retrieval
- reranking

This was the right early decision because the product requires grounded company and role context, not broad world knowledge from the model alone.

## 4. Phase 2: Embedding and Retrieval Stabilization

The next major set of decisions focused on making retrieval durable and cheap enough to run repeatedly.

### 4.1 Embedding model choice

Embeddings standardized on `text-embedding-3-small`.

Why:

- lower cost than larger embedding models
- strong enough semantic recall for company, role, and market-context retrieval
- acceptable tradeoff for a pipeline that may embed many chunks per request

### 4.2 Embedding hygiene decisions

The embedding pipeline added:

- normalization of input text
- truncation for overlong inputs
- batch embedding generation
- retry-aware behavior

Why:

- ingestion content is messy and can exceed model or provider limits
- batching materially improves throughput and cost efficiency
- normalization reduces avoidable embedding noise from raw scraped text

### 4.3 Topic-decomposed retrieval

Retrieval evolved into multi-query search rather than one generic prompt-derived query.

The system began issuing topic-specific searches covering areas like:

- company strategy and business model
- role mandate and success metrics
- investor / monetization context
- leadership and operating style
- launches and company updates

Why:

- a single query under-retrieves across heterogeneous evidence types
- premium output quality depends on coverage across multiple source classes, not just nearest-neighbor semantic similarity

### 4.4 Reranking and deduplication

Reranking in `lib/retrieval/search.ts` added freshness, source-type, and keyword-aware ordering, followed by deduplication and source diversity controls.

Why:

- raw vector similarity overweights repetitive or semantically similar chunks
- premium reports need breadth across sources, not repeated near-duplicate evidence
- freshness matters for interview prep and company momentum analysis

## 5. Phase 3: Premium Report Generation

The product later moved beyond the original baseline report into a premium report format with stronger structure and richer expectations.

### 5.1 Why premium existed

The original layered output was useful, but still vulnerable to genericity:

- company analysis could become polished but shallow
- interview prep could become generic coaching
- role strategy could drift into JD restatement

The premium path was introduced to raise the bar on:

- depth
- structure
- evidence discipline
- user-perceived differentiation

### 5.2 Premium synthesis model choice

Premium synthesis now uses `o3`.

Why:

- the premium prompt carries a larger instruction surface
- the premium report has more internal constraints and deeper strategic synthesis requirements
- the model must reason across multiple evidence types while maintaining a structured output contract

### 5.3 Structured premium sections

Premium reports were organized into explicit sections such as:

- decision memo
- five-minute brief
- company context
- why this role exists now
- company / role strategy
- candidate fit
- interview prep
- how to win this process
- credibility layer
- operations and cost

Why:

- the product needs consistent information architecture
- later QA and suppression logic requires section-level evaluation, not one monolithic blob
- the UI can present brief vs full surfaces cleanly when sections are explicit

## 6. Phase 4: Provider Abstraction and OpenAI-Compatible Failover

Once the report became more production-critical, model selection alone was not enough. Provider reliability became part of the architecture.

### 6.1 Problem

The system initially assumed one OpenAI endpoint and one model route. That created a single operational failure domain.

### 6.2 Decision

`lib/ai/openaiClient.ts` introduced provider abstraction with:

- primary provider
- optional fallback provider
- per-role model resolution for each provider
- retriable error detection
- execution retry across provider and model combinations

Why:

- premium generation should not fail solely because one endpoint has a transient issue
- some providers use OpenAI-compatible APIs but different model naming
- fallback behavior needed to be shared across premium, legacy, and embedding calls

### 6.3 Scope of failover

Failover was deliberately routed through the shared client layer so it now applies to:

- premium report generation
- premium evaluation
- legacy structured completions
- legacy text completions
- embeddings

This was a root-cause fix. It avoided scattered retry logic inside individual business flows.

## 7. Phase 5: Persona-Aware Premium Architecture

One of the most important product-quality changes was the move away from treating all roles as if they were product-manager variants.

### 7.1 Problem

Without explicit role-family logic, premium reports tended to drift toward generic PM framing:

- engineering roles could get product language
- executive roles could get flattened into strategy clichés
- technical PM roles could get over-read as executives or drift into engineering-system theater

### 7.2 Decision: infer a persona before synthesis

`lib/report/premiumPersona.ts` now infers a persona using:

- role title
- job description
- optional profile context

It classifies:

- primary role family
- possible secondary role family
- whether blended persona mode is justified
- seniority band
- subspecialization

Supported families include:

- product
- engineering
- design
- data / ML
- marketing
- sales / GTM
- operations / program
- executive

Why:

- retrieval should depend on what kind of role this is
- section ordering and presentation should depend on the reading needs of that audience
- interview prep should reflect actual interviewer expectations for the role family and seniority

### 7.3 Persona-aware retrieval

Retrieval queries are now generated using persona-aware logic rather than a static set of PM-oriented prompts.

Examples of what changed:

- engineering retrieval emphasizes architecture, reliability, docs, and technical context
- marketing retrieval emphasizes messaging, launches, and packaging
- sales / GTM retrieval emphasizes buyer motion, segments, and partner context
- executive retrieval emphasizes investor material, leadership commentary, portfolio strategy, and org design

Why:

- high-quality report depth depends on pulling the right source classes before synthesis begins
- this reduces hallucinated framing caused by weak or irrelevant evidence

### 7.4 Persona-aware presentation

The system also uses persona to shape section order and labels.

Why:

- a staff engineer and a VP Product should not receive the same report ordering and naming by default
- the reading experience should reflect the role’s proof model, not a fixed UI assumption

## 8. Phase 6: Premium Evaluation and Quality Gate

Premium generation later gained an explicit evaluator and release gate. This was a major architectural shift.

### 8.1 Problem

A strong synthesis prompt alone did not reliably prevent:

- generic company context
- shallow strategy sections
- weak interview prep
- wrong-role framing
- unsupported precision
- polished but low-signal prose

### 8.2 Decision: separate synthesis from evaluation

The system now performs:

1. premium synthesis
2. premium evaluation
3. quality-gate finalization
4. optional repair loops or targeted reretrieval
5. persistence only if the result is releasable

Evaluation is generated through `generatePremiumEvaluation(...)` using the prompt in `lib/ai/premiumEvaluationPrompt.ts`.

Why:

- synthesis and critique are different tasks
- a separate evaluation step makes quality failures inspectable and enforceable
- release policy should be driven by explicit scores, warnings, and blocked reasons, not implicit judgment in the synthesis prompt alone

### 8.3 Quality gate design goals

The gate in `lib/report/premiumQualityGate.ts` is intended to catch:

- shallow sections
- weak evidence
- missing company-context depth
- missing SWOT depth in strategy
- executive-scope overread for non-exec product roles
- technical-PM interview drift into engineering theater
- section-category integrity failures

Why:

- these were observed failure modes that directly hurt premium usefulness

### 8.4 Fail-open to fail-closed change

One of the most important recent decisions was to stop silently downgrading blocked premium runs into persisted partial output.

Current behavior:

- `resolveQualityGateForPersistence(...)` no longer weakens a blocked gate
- blocked premium releases now throw
- `app/api/deep-dive/create/route.ts` catches the thrown error and marks the request as `failed`

Why:

- a premium report that fails the quality bar should not be silently shipped as if it merely degraded
- fail-closed behavior makes production quality constraints real
- this prevents low-quality premium output from appearing valid in the product

## 9. Phase 7: Repair Loops and Targeted Reretrieval

Once evaluation existed, the next question was how to recover from failures.

### 9.1 First repair strategy: resynthesis

The simplest recovery path is to resynthesize with repair instructions.

Why:

- some issues are prompt-following failures rather than evidence failures
- this is cheaper than re-ingesting sources

### 9.2 Second repair strategy: targeted reretrieval

If the gate indicates weak evidence or missing persona-critical source classes, the pipeline can rerun retrieval with more targeted queries and optionally ingest more sources.

This logic now includes:

- archetype-correction queries
- company-depth recovery queries
- interview-prep recovery queries
- source-class-targeted URL planning

Why:

- some failures are caused by missing or weak source coverage, not by the synthesis model itself
- reretrieval is more expensive, so it is reserved for cases where it is likely to improve quality materially

### 9.3 Source-class reasoning

The premium telemetry layer audits whether persona-required source classes are present, for example:

- investor material
- product surfaces
- leadership commentary
- engineering docs
- pricing / packaging

Why:

- premium depth depends on source-class coverage, not just raw source count
- this creates a more precise trigger for retrieval repair than generic "more sources" heuristics

## 10. Phase 8: Firecrawl Resilience and Source Planning Hardening

The source acquisition layer also evolved significantly.

### 10.1 Problem

Early ingestion assumptions were too optimistic:

- quota or provider failures could degrade the pipeline badly
- guessed URLs were often low quality
- search result pages and wrapper URLs polluted the source set

### 10.2 Decisions in source planning

`lib/ingestion/firecrawl.ts` now includes:

- homepage-based first-party discovery
- canonical URL resolution
- search-result extraction logic
- domain-specific fallbacks for blocked or weak sources
- targeted source URL building for reretrieval

Why:

- official first-party sources are usually more valuable than guessed paths
- retrieval quality improves when planning is source-class-aware
- canonical resolution avoids wasting slots on wrappers and redirects

### 10.3 Firecrawl quota degradation handling

The pipeline now detects Firecrawl quota exhaustion and temporarily bypasses Firecrawl in favor of direct fetch fallback.

Why:

- quota failures should not look like unexplained hangs
- the pipeline should degrade predictably instead of collapsing mid-run

This was a production resilience fix, not just a scraper improvement.

## 11. Phase 9: Extraction and Ingestion Safety Fixes

The ingestion stack received several small but important hardening changes.

### 11.1 Text sanitization before storage

Null bytes are stripped before persistence via `sanitizeTextForStorage(...)`.

Why:

- scraped content can contain invalid characters that break downstream storage or processing

### 11.2 Better JD extraction fallback behavior

Job-description extraction now returns structured fallback output with warnings instead of simply failing null.

Why:

- users still need a recoverable create flow when extraction quality is weak
- partial structured fallback is better than a hard stop when the page is fetchable but not cleanly parseable

## 12. Phase 10: Citation and Evidence Labeling

The report pipeline also became more explicit about evidence provenance.

### 12.1 Citation metadata

`lib/report/citationMetadata.ts` adds:

- source type
- evidence tier
- fallback-third-party labeling

Why:

- not all sources should carry equal trust in a premium report
- company-hosted or clearly first-party sources should be distinguished from fallback third-party coverage
- this improves UI clarity and future quality analysis

### 12.2 Citation-style normalization

Premium assembly normalizes ad hoc `Source 1`-style references toward bracketed citation style.

Why:

- citation formatting inconsistency is a premium-polish defect
- the evaluator explicitly penalizes weak citation discipline

## 13. Phase 11: Candidate Overlay and Candidate-Fit Refresh

The system kept candidate personalization as a distinct capability rather than mixing it into the base company/role synthesis.

### 13.1 Decision

Resume-based overlay remains a separate pass and can refresh the `candidate_fit` section after personalization completes.

Why:

- company / role inference should stay anchored to the title and JD, not be hijacked by resume history
- candidate-fit should still benefit from the resume once personalization exists
- separating these concerns prevents persona inference from collapsing into résumé-shaped bias

This separation is important to the product’s logic:

- persona inference is role-first
- candidate-fit refresh is candidate-first

## 14. Current Release Philosophy

The current system is built around these principles:

### 14.1 Grounding over fluency

If evidence is weak, the system should say so or fail, not invent confidence.

### 14.2 Role-family specificity over generic coaching

A premium report should read differently for engineering, product, design, GTM, operations, and executive roles.

### 14.3 Explicit quality enforcement over hopeful prompting

Prompt quality matters, but the final guarantee comes from evaluation and release gating.

### 14.4 Fail closed for premium quality

If the premium bar is not met after recovery paths, the report should not be treated as releasable premium output.

### 14.5 Retrieval quality is part of model quality

Many synthesis failures are actually evidence failures. The architecture treats retrieval and source planning as first-class quality levers.

## 15. Major Changes Summary

In order, the major AI-stack changes were:

1. Start with a retrieval-backed, multi-stage deep-dive pipeline instead of one-shot generation.
2. Split model responsibilities by task: deep analysis, synthesis, overlay.
3. Standardize embeddings on `text-embedding-3-small` with batching and hygiene.
4. Expand retrieval into topic-decomposed search with reranking and deduplication.
5. Introduce a premium report path with stronger section contracts and deeper synthesis.
6. Add provider-level OpenAI-compatible failover and per-role model overrides.
7. Infer role persona and use it to shape retrieval, prompts, and presentation.
8. Add premium evaluation and a formal quality gate.
9. Add repair loops and targeted reretrieval instead of assuming one-pass synthesis is enough.
10. Harden Firecrawl and source planning for quota failures, canonical resolution, and first-party discovery.
11. Add explicit citation metadata and first-party vs fallback-third-party evidence labeling.
12. Move premium persistence from fail-open behavior toward fail-closed behavior when the gate blocks release.

## 16. Important Files to Read Next

For someone trying to understand or extend the current system, these files are the best starting points:

- `lib/ai/openai.ts`
- `lib/ai/openaiClient.ts`
- `lib/ai/embeddings.ts`
- `lib/ai/premiumEvaluationPrompt.ts`
- `lib/ingestion/firecrawl.ts`
- `lib/retrieval/search.ts`
- `lib/report/assemblePremiumReportV2.ts`
- `lib/report/premiumPersona.ts`
- `lib/report/premiumQualityGate.ts`
- `lib/report/premiumTelemetry.ts`

## 17. What This Document Should Be Updated For

Update this file when any of the following changes:

- model defaults change
- provider failover behavior changes
- prompt architecture changes materially
- retrieval query strategy changes materially
- source-class requirements change
- premium gate thresholds or release policy change
- the role-persona taxonomy changes
- candidate overlay begins influencing more than candidate-fit

If those changes are not recorded here, future prompt and architecture work will lose the reasoning trail that justified the current system.
# Company Deep Dive Engine

Research tooling for senior product leaders evaluating a specific company and
role. Given a company, a role, and a job description, it produces a grounded
intelligence brief: what the company actually is, where it is going, what the
role really owns, and whether it is worth pursuing.

> **Status.** Under rearchitecture. V1 produced reports of inadequate quality
> and is being replaced outright, not kept as a fallback — its generation
> pipeline will be deleted once V2 works end to end (see §9 for what is reused).
> V2 is currently at the contract layer with no model code written. V1 remains
> in history, tagged `v1-legacy`, documented at
> [docs/v1-README.md](docs/v1-README.md).

---

# Summary

## Why V2 exists

V1 produced reports of poor and unpredictable quality. Extended debugging did
not fix it, because the problems were architectural rather than defects:

| Problem | Root cause |
|---|---|
| Shallow, generic analysis | One mega-prompt wrote the entire report in a single pass |
| Missing or wrong facts | Retrieval was 8 hardcoded queries, one pass, embeddings only, no gap detection |
| Confident fabrication | Nothing distinguished a sourced fact from a model guess |
| Fixes that didn't stick | No evals — every change was a guess, every regression invisible |
| Hard to change safely | 25k LOC with generation, analysis, and rendering entangled |

The through-line: **V1 could not be measured, so it could not be improved.**

## What changes in V2

**1. Reports are structured data, not prose.**
The model emits `Claim` objects — one assertion each, with a label
(`fact` / `inference` / `open_question`), cited evidence, a verbatim supporting
quote, and confidence. Prose is generated from claims at the end. A claim can be
checked against the chunk it cites; a paragraph cannot.

**2. One agent, one task — and sections are the agents.**
Each of the twelve sections is an agent owning one analytical responsibility. It
runs its own research loop, writes claims, verifies them, and hands its verified
conclusions to the sections that depend on it. They are arranged as a dependency
DAG ([`sectionGraph.ts`](lib/v2/contract/sectionGraph.ts)), so the report builds
an argument instead of producing twelve independent essays.

**3. Agentic retrieval instead of one static pass.**
The researcher runs a real loop: search the evidence store, judge whether the
question is actually answered, and if not, fetch new sources, index them, and
try again — budget-capped. V1's fixed queries capped report quality at whatever
those eight embeddings happened to return.

**4. Evals first, and they gate merges.**
Promptfoo plus custom scorers, layered as unit (claim), component (section), and
integration (whole document). A golden set of 12–15 companies, human-scored
against per-section rubrics. No prompt change ships unless the suite holds.

**5. Enforcement in the type system, not the prompt.**
A `fact` with no evidence does not parse. An `inference` with no stated
reasoning does not parse. An `open_question` that cites a source does not parse.
These are schema invariants, not instructions a model can drift away from.

**6. Redundancy handled where it arises.**
Because upstream conclusions flow downstream, a section *knows* what has already
been established and references it instead of restating it. A reconciliation
pass remains as a safety net for same-tier collisions, assigning one canonical
owner per fact and demoting the rest to cross-references — or to deliberate
restatements that must justify themselves.

## Architecture at a glance

Twelve sections are agents arranged as a dependency DAG. Each runs its own
research → write → verify loop, then hands its verified conclusions down to the
sections that build on it. This is Layer A — company intelligence and role
analysis; interview prep and candidate positioning are later phases (BACKLOG
B14/B15).

```
   TIER 1 (parallel)          TIER 2              TIER 3         T4        T5
 ┌──────────────────────┐
 │ business_fundamentals│──┬──►┌──────────────┐
 │ trajectory_and_health│──┤   │ competitive_ │──┐
 │ stated_direction     │──┤   │ landscape    │  │
 │ operating_culture    │──┤   └──────────────┘  ├─►┌─────────────┐
 │ product_and_customers│──┤   ┌──────────────┐  │  │ company_swot│─┬──►┌──────────┐
 └──────────────────────┘  ├──►│product_tear- │──┤  └─────────────┘ │   │role_swot │──┐
                           │   │down          │──┤                  │   └──────────┘  │
                           │   └──────────────┘  │  ┌─────────────┐ │        ▲        ▼
                           └──►┌──────────────┐──┼─►│ role_scope  │─┼────────┘   ┌──────────┐
                               │ role_origin  │──┘  └─────────────┘ │            │strategy_ │
                               └──────────────┘                     └───────────►│pov       │
                                                                                 └──────────┘

   each node:  research loop ──► write claims ──► verify ──► handoff
                    ▲   │                          │  │
                    └───┘                          └──┘
              (agentic, budget-capped)        (bounded, max 2 rounds)

   then once:  reconcile ──► prose (1 call, whole doc) ──► check ──► render
                (safety net)                              (audit)   (code)
               plus 6 derived views, computed from claims — no agent, no prompt

   all of it under a deterministic state machine: persisted, resumable, costed
```

## Stack decisions

| Layer | Choice | Rejected |
|---|---|---|
| Framework | None — plain TypeScript | LangChain, LlamaIndex |
| Reasoning models | Claude (Opus 5 / Sonnet 5) | — |
| Cheap-path models | Haiku 4.5 / `gpt-4o-mini` | — |
| Evals | Promptfoo + custom TS scorers | LangSmith, Braintrust, Ragas, DeepEval |
| Tracing | Langfuse | — |
| Reranking | Claude Haiku listwise (MVP) | Cohere Rerank v3 (deferred to measure) |
| Store | Existing Supabase + pgvector | — |
| Validation | zod 4 | — |

## Built so far

| File | Purpose |
|---|---|
| [`lib/v2/contract/schema.ts`](lib/v2/contract/schema.ts) | Claim / Section / Report contract and invariants |
| [`lib/v2/contract/sectionGraph.ts`](lib/v2/contract/sectionGraph.ts) | Section dependency DAG, tiers, handoff contract |
| [`lib/v2/contract/renderOrder.ts`](lib/v2/contract/renderOrder.ts) | Reading order and narrative blocks, independent of the DAG |
| [`lib/v2/contract/factOwnership.ts`](lib/v2/contract/factOwnership.ts) | Canonical fact ownership rules, ambiguity flagging |
| [`lib/v2/contract/style-contract.md`](lib/v2/contract/style-contract.md) | Binding prose constraints, checkable vs judgment |
| [`lib/v2/config/devTarget.ts`](lib/v2/config/devTarget.ts) | Pinned dev target (Microsoft) and its caveats |
| [`lib/v2/evals/scorers/`](lib/v2/evals/scorers/) | Seven deterministic scorers, absolute thresholds |
| [`lib/v2/evals/selftest.ts`](lib/v2/evals/selftest.ts) | Proves each scorer catches its own defect |
| [`lib/v2/evals/rubrics/`](lib/v2/evals/rubrics/) | Human scoring rubrics, one per section |
| [`BACKLOG.md`](BACKLOG.md) | Deferred decisions, each with its decision criterion |

---

# Details

## 1. Where the agency actually is

"Agentic" is worth being precise about, because most of this pipeline is
deliberately **not** agentic.

### Genuinely agentic

**The researcher loop** — the one component with real autonomy, and the highest-
value addition in V2. Per research question:

```
search evidence store
   │
   ├── judge: is this question actually answered?
   │      │
   │      ├── yes ──► record answer + coverage, stop
   │      │
   │      └── no ──► decide what is missing
   │                 choose a tool (web search / crawl / filings / job boards)
   │                 fetch, chunk, embed, index
   │                 └──► loop (budget-capped: N iterations, $ ceiling)
   │
   └── exhausted ──► record as unresolved, mark coverage thin
```

This is an agent by any reasonable definition: it selects tools, decides its own
trajectory, evaluates its own progress, and chooses when to stop. Crucially it
can also **fail honestly** — an unresolved question becomes `thin` coverage
rather than an invitation to fabricate.

V1 had no equivalent. It retrieved once against fixed queries and wrote whatever
those chunks supported. If the eight queries missed something, the report simply
did not know it, and nothing in the system noticed.

**Two bounded revision loops** — the verifier returns rejected claims to their
writer, and the prose checker returns violations to the prose writer. Max two
rounds each. Genuine feedback loops, deliberately small: the failure modes are
known and enumerable, so unbounded exploration buys nothing.

### Deliberately not agentic

| Step | Why fixed |
|---|---|
| Orchestration | A state machine is resumable, traceable, and costable. An agent deciding its own pipeline order is unobservable and unrepeatable. |
| Fact reconciliation | A rules table (`factOwnership.ts`) — the same inputs must always produce the same ownership, or eval numbers stop meaning anything. |
| Rendering | Plain code. Verified claims are known-good; handing them back to a model to "write up nicely" reintroduces fabrication at the last step. |
| Schema validation | zod. Not a judgment call. |

### The principle

**Agency where judgment is required; determinism everywhere else.**

Part of what went wrong in V1 was the inverse — non-deterministic where it
should have been fixed (report structure varied run to run), and rigid where
judgment was needed (retrieval could not adapt to what it found). V2 inverts
both.

### One agent, one task

| Agent | Single job | Sees |
|---|---|---|
| Planner | Research questions per dimension | company, role, JD |
| Researcher | Answer one question, or declare it unanswerable | one question, the store, fetch tools |
| Section agent ×8 | Own one analytical dimension end to end | its own evidence + upstream handoffs |
| Verifier | Does this claim's quote support it? Is the label right? | one claim, one chunk |
| Prose writer | Render verified claims as prose | all claims, style contract |
| Prose checker | Does the prose add anything not in the claims? | prose + claims |

No agent holds two responsibilities, and no agent sees more context than its job
requires.

### Sections as agents, arranged as a DAG

A section agent is the unit of responsibility. It owns one dimension and runs
its own loop: research → write claims → verify → revise → hand off.

Ordering is **analytical, not incidental** — see
[`sectionGraph.ts`](lib/v2/contract/sectionGraph.ts):

| Tier | Sections | Depends on |
|---|---|---|
| 1 | `business_fundamentals`, `trajectory_and_health`, `stated_direction`, `operating_culture`, `product_and_customers` | — |
| 2 | `competitive_landscape`, `product_teardown`, `role_origin` | tier 1 |
| 3 | `company_swot`, `role_scope` | tiers 1–2 |
| 4 | `role_swot` | tier 3 |
| 5 | `strategy_pov` | everything |

An earlier draft had all eight writers run in parallel, blind to each other,
with redundancy cleaned up afterwards. That was wrong. The dependencies are not
about duplicated facts — they are about **analytical build-up**. A SWOT written
blind to the competitive analysis is a worse SWOT. A strategy module written
blind to the SWOT is much worse. Eight blind writers structurally cannot produce
a report that builds an argument; they produce eight essays that happen to share
a subject.

It also answers the objection that sank the earlier sequential proposal. "Whichever
section runs first owns the fact is arbitrary" holds only when the order is
incidental. When the order is a deliberate dependency graph, foundational
sections own foundational facts *because they are foundational*. That is correct,
not arbitrary.

**Handoffs are deliberately compact.** A dependent receives the upstream
section's summary, its canonical claim statements with ids, its open questions,
and its coverage sufficiency — not its evidence bodies. Tier 4 depends on all
seven upstream sections; passing full evidence would bloat context and dilute
attention exactly where synthesis matters most. Downstream sections reference an
upstream claim by id rather than re-citing its chunks, which is what stops the
same fact being stated four times.

Each dependency edge carries a `usesUpstreamFor` string that goes into the
agent's prompt. A dependency with no stated purpose is decoration, and would just
be context bloat.

**Tradeoffs accepted:**

- *Latency — accepted by design.* The critical path is four tiers deep instead of
  one parallel batch. This is not a real-time system and does not need to be: a
  more accurate report is worth the wait, and slowness is handled as a UI
  expectation rather than by trimming the architecture. The corollary is that
  defaults lean generous throughout — research iterations, verification rounds,
  retrieval depth are set by sufficiency and recall, not by speed. Cost per run
  remains a hard ceiling; an unterminated loop is still a bug.
- *Error propagation.* A wrong tier-1 conclusion poisons everything downstream —
  a risk V1's single pass did not have. Mitigated by verifying **before**
  handoff: a section's claims are ground-checked and its labels audited before
  any dependent sees them. This is why verification sits inside each section's
  loop rather than running once globally after all writing.
- *Upstream thinness compounds.* A dependent receives `sufficiency` and must
  temper its confidence when upstream coverage was thin, rather than treating a
  weakly-supported upstream conclusion as settled fact.

### Reading order is not execution order

Two separate files, deliberately:

| File | Question it answers | Kind of question |
|---|---|---|
| `sectionGraph.ts` | what does this section need in order to be written? | analytical — has right and wrong answers |
| `renderOrder.ts` | what order should a reader meet these in? | editorial — has no dependency implications |

Conflating them is a trap: it would mean improving the reading flow by weakening
a section's inputs. Kept apart, reading order is free to change with no
regeneration, because rendering is deterministic code over claims that already
exist.

The report reads in four narrative blocks — the company, the company verdict,
the role, the recommendation — so a reader who stops early still gets a complete
thought. Reading position and dependency depth are unrelated: `role_origin`
reads ninth but executes at tier 2, and `company_swot` reads eighth but executes
at tier 3.

## 2. The claim contract

The central decision, from which everything else follows.

V1 emitted prose:

> Acme has grown rapidly, driven by strong enterprise adoption and a successful
> pivot to AI-first products, though margin pressure remains a concern.

Four fused assertions, two unfalsifiable adjectives, no way to tell sourced from
invented. When a report like this is wrong, you cannot locate *where*.

V2 emits claims, each independently checkable. Three properties follow:

**Fabrication becomes mechanically detectable.** Every `EvidenceRef` carries a
verbatim `quote`. The verifier checks that exact string occurs in the cited
chunk — a substring test, no model call, near-zero cost. An invented number has
no quote to find.

**Epistemic honesty becomes a schema constraint.** See
[`schema.ts`](lib/v2/contract/schema.ts) `superRefine`: an unsourced `fact` fails
validation, an `inference` without explicit reasoning fails validation, an
`open_question` citing evidence fails validation. Not prompt instructions — the
data does not parse.

**Quality becomes a number.** "Is the report good?" is unanswerable. "Of 47
claims, 44 quotes verify, 3 facts should have been inferences, 2 of 8 dimensions
have no coverage" moves when a prompt changes.

### What this does not catch

A claim can be perfectly grounded in a real quote and still be the wrong thing
to tell a candidate, or a correct quote read out of context. The schema handles
mechanical failure; the human rubrics handle judgment. This boundary is
deliberate — automation covers what it can verify, and human attention goes
where it is irreplaceable.

## 3. Structure vs voice

A false start worth recording. The first proposal was to choose per section
between deterministic rendering and LLM prose. That was wrong: a report where
one section is terse bullets and the next is flowing narrative reads like two
documents stapled together, which is worse than either mode used consistently.

The correct axis is two independent decisions:

- **Structure** — tables, timelines, ranked lists, comparison grids. *Varies by
  section.* Deterministic code, always.
- **Voice** — who writes the sentences. *Never varies.* One pass, one style
  contract, whole document.

This is how analyst reports already work: an equity research note mixes tables,
charts, and narrative on one page in a single voice, and nobody reads it as
inconsistent.

## 4. One prose pass for the whole document

The prose pass is **one call over all sections**, not one per section.

The obvious reason is voice consistency. The stronger reason is **cross-section
redundancy**, which per-section calls cannot fix even in principle:

> A layoff appears in `trajectory_and_health` as a recent event, in
> `company_swot` as a weakness, in `role_origin` as the reason the seat exists,
> and in `strategy_pov` as context. Four sections, all legitimately citing it.

Isolated calls each write it fresh, and the reader meets the same fact four
times. No section is wrong; the document is repetitive and feels padded. That is
invisible at section level by construction.

Only a document-level pass can avoid restating what the reader just read, thread
forward references, and build an arc rather than eight independent essays. It is
also 1 call instead of 8.

**Tradeoffs accepted:**

- *Uneven treatment.* A single long pass tends to write early sections fully and
  thin out toward the end. Detected by prose-to-claim ratio per section, which
  should be flat. Fallback is a lightweight global outline pass first
  ([`BACKLOG.md`](BACKLOG.md) B5).
- *Blast radius.* One bad number should not force regenerating the document. The
  checker reports per passage and triggers a targeted revision.

**The testing analogy that settled it:** claim-level checks are unit tests,
section rubrics are component tests, and the properties that actually make a
long report readable — no redundancy, consistent voice, coherent flow, no
internal contradictions — are only observable at integration level. Per-section
prose would have left that layer permanently unmeasurable, which is the V1
failure mode relocated rather than fixed.

## 5. Redundancy: resolved in data, not prose

First proposal: catch redundancy in the prose pass. Rejected as too late — by
then eight sections have each committed structure around a fact they may not
keep.

Second proposal: writers stay parallel and blind, with a global reconciliation
pass afterwards. Also rejected — parallel blind writers cannot build an argument
(see §1).

Chosen: the **dependency DAG handles most of it structurally.** A downstream
section receives upstream conclusions in its handoff, so it already knows what
has been established and can reference rather than restate. This is redundancy
prevented at the point it would arise, not cleaned up afterwards.

Reconciliation remains, reduced to a **safety net** for what the DAG cannot
catch: two sections in the *same tier* independently asserting the same fact,
with no edge between them to inform either one. It runs over all claims before
prose.

1. Cluster claims asserting the same fact — cheap, because claims are structured:
   shared evidence chunk plus semantic match.
2. Assign the **canonical owner**: the section where the fact carries most weight.
3. Demote the rest.

| Role | Renders as |
|---|---|
| `canonical` | stated in full, with evidence |
| `reference` | short callback — "the FY24 layoffs noted above" |
| `reinforce` | restated from a *different angle*, with required justification |

`reinforce` encodes the standing rule: **repetition is acceptable only where it
serves continuity, otherwise drop it.** Mirroring how an `inference` must state
its reasoning, a `reinforce` must state what the restatement adds — and without
that justification the schema rejects it. The rule is enforced, not merely
documented.

### Ownership: fixed rules, grown from real cases

[`factOwnership.ts`](lib/v2/contract/factOwnership.ts) maps 14 fact types to a
section preference order. Deliberately thin. When no rule covers a cluster,
`resolveOwner` returns `ambiguous` with candidates and a reason — **it never
guesses.** Those surface for a human ruling, and each ruling becomes a new rule.

A complete table written up front would encode invented ambiguity. Growing it
from flagged cases means every rule traces to a case that actually occurred. A
model-based assignment is deferred ([`BACKLOG.md`](BACKLOG.md) B3) until the
fixed table is shown to be visibly wrong often enough to justify it.

## 6. Voice: the four choices and one real tension

Settled in [`style-contract.md`](lib/v2/contract/style-contract.md):

| Decision | Choice | Rationale |
|---|---|---|
| Register | **Opinionated advisor** | A report that lists facts and leaves the reader to assemble meaning has failed. Willing to say the uncomfortable thing. |
| Epistemic markers | **Explicit** | Inferences visually tagged with their basis. Costs some flow; buys auditability and makes the label taxonomy visible to the reader, not just the eval. |
| Reader address | **Impersonal** | Opinionated about the company, never presumptuous about the reader's circumstances. |
| Length | **Comprehensive, 6,000+** | A reference document across an interview process, not a single-sitting read. |

### The tension

**Opinionated writing draws its force from selectivity. 6,000+ words dilutes
it.** A long document buries its positions in analysis — close to how V1 reads.

Resolved by constraint rather than by shortening:

- Every section leads with its conclusion, so the document works for a reader
  who reads only the openings.
- Load-bearing inferences are marked **The call —**, so positions are findable by
  scanning.
- Prose-to-claim ratio is capped, so length can only come from *more evidence*,
  never more words per claim.

Tracked as [`BACKLOG.md`](BACKLOG.md) B8 with a falsifiable test: can a
golden-set reader state the report's top three positions after skimming? If not,
the fix is a front-matter verdict block, not a shorter report.

### Checkable vs judgment

The style contract separates rules enforced mechanically (no second person,
every inference marked, every number traceable to a claim, every quantitative
claim dated, banned phrases absent, prose-to-claim ratio in band) from rules
scored by rubric (sentence variation, paragraph discipline, conclusion-first
ordering). Without that split, "good writing" stays an aspiration.

The banned-phrase list has one rule behind it: **no adjective a number could
replace.** "Rapidly growing" is banned not for being a cliché but because it is
a number the report failed to find.

## 7. Evals

Built **before** the agents, not after. This is the single biggest process
change from V1, where prompts were tuned against impressions.

### Tooling

**Promptfoo** for the harness and CI gate — MIT, Node-native, config-driven,
with built-in RAG assertions (`llm-rubric`, `context-faithfulness`,
`context-recall`). **Langfuse** for tracing, because the researcher loop is
useless if its trajectory is invisible.

Domain-specific scorers Promptfoo has no opinion about — per-claim grounding,
fact/inference label accuracy, dimension coverage — are plain TS functions
invoked as `javascript:` assertions. Standard harness, custom metrics, no
homegrown runner.

Rejected: **LangSmith** (hosted, free only on a small personal tier — and
LangChain is not an eval framework, a point worth stating since it is commonly
assumed); **Braintrust** (excellent, paid); **Ragas** and **DeepEval**
(Python-only, would split the stack for no gain).

### Layers

| Layer | Unit | Catches |
|---|---|---|
| Unit | one claim | ungrounded quote, wrong label, fabricated number |
| Component | one section | missing coverage, thin evidence, weak so-what |
| Integration | whole report | redundancy, voice drift, broken flow, contradictions |

### The golden set

12–15 companies, spanning failure modes rather than sampled for convenience:

- 3 large public — dense filings; tests synthesis, not retrieval
- 3 mid-size private — thin coverage; tests honesty about gaps
- 3 recently distressed — tests whether it says the hard thing
- 3 low-profile / non-US — sparse web presence; tests the researcher's floor
- 2–3 known firsthand — the only bucket where a plausible-but-wrong answer is
  reliably caught

Scored by hand, one section at a time, against per-section rubrics: coverage
booleans, quality scores 1–5, automatic failures, plus free-text notes on the
single best and single worst claim. **The free-text notes are the highest-signal
input for prompt iteration** — more useful in practice than the scores.

### Honest constraint

Human scoring is the bottleneck of this plan, and it cannot be delegated to the
model being evaluated. If it does not happen, V2 drifts exactly as V1 did. The
architecture makes quality measurable; it does not make it automatic.

## 8. Build order

Each step ships only when it clears its **absolute rubric thresholds**. V1 is
not a baseline to beat — it is being replaced, not competed with (see §10).

1. **Contract + rubrics** ← current
2. **Eval harness with absolute thresholds** — Promptfoo plus custom scorers,
   scoring against the rubrics directly. No V1 comparison run.
3. **Retrieval layer** — hybrid BM25 + vector, Haiku rerank, coverage index;
   evaluated in isolation on recall@k. Retrieval caps everything downstream, so
   it precedes every agent.
4. **Researcher loop** — highest-value new component
5. **Section agents, in tier order** — tier 1 first, since everything downstream
   consumes its handoffs. One section at a time, each with its own verifier loop.
6. **Reconciliation + orchestrator + renderer** — deterministic
7. **Prose pass + checker**
8. **Cut over** — V2 becomes the only pipeline; V1 generation is deleted

## 9. Reuse vs replacement

V1's report generation is being discarded, not maintained behind a flag. Its
application shell is not — that part works, and rebuilding it would be waste.

| Reused as-is | Discarded |
|---|---|
| Next.js app, routing, auth | `lib/report/*` — assemblers, personas, quality gate |
| Supabase schema, pgvector store | `lib/ai/prompts.ts` — the mega-prompts |
| Firecrawl ingestion and crawling | `lib/retrieval/search.ts` — fixed-query retrieval |
| Admin, history, diagnostics surfaces | V1 report page rendering |

V1 stays in git history, tagged `v1-legacy` on `master`, and is deleted from
this branch once V2 produces a report end to end. Keeping it runnable in
parallel was considered and rejected: a fallback nobody should use is
maintenance cost with no upside, and it distorts the eval plan into a
comparison against something already known to be inadequate.

**Consequence for evals.** With no baseline to beat, thresholds are absolute
and set by the rubrics: coverage elements present, quality dimensions at or
above 3, zero automatic failures. Regression testing compares V2 against *its
own* previous scored run, not against V1.

## 10. Contributing to this rearchitecture
- Deferred decisions belong in [`BACKLOG.md`](BACKLOG.md) with a decision
  criterion, not in comments. An item without a way to settle it is an argument,
  not a backlog entry.
- No prompt change merges on a quality argument. Run the evals.

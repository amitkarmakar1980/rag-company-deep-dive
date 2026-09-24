# V2 Backlog

Deferred decisions and follow-up iterations. Each item records what we chose
for now, what the alternative was, and how we'd know the alternative is better.
Items graduate out of here by being measured, not by being argued.

## Deferred — post-MVP experiments

### B1. Reranker: Cohere Rerank v3 vs Claude Haiku listwise
**Now:** Haiku listwise rerank, no new vendor.
**Alternative:** Cohere Rerank v3 (~$1/1k queries).
**Decide by:** retrieval recall@k on the golden set, plus latency and cost per run.
Good first follow-up — self-contained, and a clean demonstration of the eval
harness paying for itself.

### B2. Reconciliation feedback to section writers
**Now:** a claim demoted to `reference` renders as a callback; the section keeps
its original structure.
**Alternative:** tell the writer it lost the fact and have it rewrite around
what remains.
**Decide by:** whether demoted sections visibly read as gap-toothed on the
golden set. Cost: another round of calls per section, and thrash risk.

### B3. Model-assigned canonical ownership
**Now:** fixed rules table, `lib/v2/contract/factOwnership.ts`. Ambiguous
clusters are flagged for Amit, and each ruling becomes a new rule.
**Alternative:** one cheap model call over the cluster list.
**Decide by:** how often the fixed table is visibly wrong, and whether the
flagged-ambiguity queue stays small enough to handle by hand.

### B4. Deterministic rendering vs constrained prose, per section
**Now:** one document-level constrained prose pass for the whole report;
deterministic scaffolds vary by section, voice does not.
**Open part:** whether the factual sections (`company_snapshot`) actually read
better as pure deterministic structure with no prose pass.
**Decide by:** reader preference on the golden set, against prose-pass cost.

### B5. Uneven treatment across a single long prose pass
**Risk:** one pass over eight sections tends to write the early ones fully and
thin out toward the end.
**Watch:** prose-to-claim ratio per section — should be roughly flat.
**Fallback if it sags:** a lightweight global outline pass first (structure and
voice decisions only), then one write pass against it. Still document-level.

### B8. Tension: opinionated voice at 6,000+ words
**Chosen:** opinionated-advisor register, comprehensive length.
**Tension:** opinionated writing gets its force from selectivity; a long
document dilutes positions into a wall of analysis. The two pull against each
other.
**Mitigations in the style contract:** every section leads with its conclusion;
load-bearing inferences are marked **The call —**; prose-to-claim ratio is
capped so length can only come from more evidence, never from more words per
claim.
**Decide by:** whether golden-set readers can state the report's top three
positions after skimming. If not, the fix is a front-matter verdict block
rather than a shorter report.

### B9. DAG latency — accepted, not a problem to solve
**Decided:** this is not a real-time system and does not need to be. A more
accurate report is worth the wait. Latency is handled as a UI expectation
(progress, resumability, notify-on-done), not by trimming the architecture.

**Consequence — spend the time budget on accuracy.** Defaults lean generous
rather than fast:
- researcher loop iteration caps set by evidence sufficiency, not speed
- verification rounds not trimmed to save a call
- retrieval depth and rerank breadth set by recall, not latency
- dependency edges kept when analytically useful, even when they deepen the path

**Still bounded by cost, not time.** A $-per-run ceiling remains the real
constraint, and an unterminated loop is still a bug. "Slow is fine" is not
"unbounded is fine."

**Revisit only if:** run time crosses the point where users abandon mid-run —
a UI/product signal, not an engineering one.

### B10. Error propagation through the DAG
**Risk:** a wrong tier-1 conclusion poisons every downstream section. V1's
single pass did not have this failure mode.
**Now mitigated by:** verification runs inside each section's loop, before
handoff — dependents only ever see ground-checked claims.
**Residual risk:** a claim can be correctly grounded and still be the wrong
conclusion. Nothing catches that before it propagates.
**Watch:** on the golden set, whether low-scoring tier-3/4 sections trace back to
a specific bad upstream conclusion. If they do, consider a cheap plausibility
gate on tier-1 summaries before handoff.

### B11. Handoff payload size at tier 4
**Now:** compact handoffs — summary, canonical claim statements with ids, open
questions, sufficiency. No evidence bodies.
**Risk:** the strategy module depends on all seven upstream sections; even
compact handoffs may crowd out its own retrieved evidence.
**Watch:** strategy-module quality against handoff token count. Fix if needed is
a relevance filter on inherited claims, not a smaller graph.

## Deferred — later phases

### B17. Iteration 1 is accuracy-first — an intentional trade
**Decided.** For the first working version, correctness beats speed and beats
call count. Every knob below is set the expensive way on purpose.

| Knob | Iteration 1 | The cheap alternative, deferred |
|---|---|---|
| Verifier batching | **unbatched** — one call per claim | batch ~10 claims per call, ~10× cheaper |
| Verifier model | **strong** (Sonnet 5) | Haiku 4.5 |
| Claim writer model | **Opus 5** | Sonnet 5 |
| Planner model | **Sonnet 5** | Haiku 4.5 |
| Researcher iterations | capped by evidence sufficiency | capped by a fixed low number |
| Revision rounds | 2 | 1, or none |
| Retrieval candidate set | wide, deep rerank | narrow top-k |

**The ordering principle: start expensive, downgrade with evidence.** The
reverse cannot work. If a cheap configuration produces a bad section, nothing
distinguishes a model that was too weak from a prompt that was wrong, and the
usual response is to rewrite a prompt that was fine. Starting strong makes a
failure attributable to the prompt or the design, which is the only kind of
failure worth debugging. Each downgrade then becomes its own measured
experiment against a known-good result.

Unbatched verification has a second reason beyond model strength: ten claims in
one call are graded in each other's context, which is exactly how a weak claim
gets carried by a strong neighbour. One claim, one chunk, no cross-contamination.

**Still bounded.** Speed is relaxed; cost is not unbounded and loops must
terminate. A per-run ceiling stays, and an unterminated researcher loop is a
bug, not thoroughness. See B9.

**Revisit when:** Layer A holds its rubric thresholds on the golden set. Then
each downgrade is tried one at a time, and kept only if scores hold.

### B14. Layer B — interview preparation
**Deferred.** Layer A (company intelligence + role analysis) is a complete
product on its own; shipping it before adding surface area is the whole reason
the section count came down from V1's 19.

Two agents when built, both tier 5, both downstream of the full Layer A DAG:

| Section | Depends on |
|---|---|
| `interview_agenda` — what interviewers will validate, worry about, need to see | `role_scope`, `role_origin`, `company_swot` |
| `questions_to_ask` — must-ask and good questions, with strong/weak answer signals | `interview_agenda`, open questions, both SWOTs |

V1's "Unknowns to Validate Live" is **not** an agent here — it is a derived view
over `open_question` claims, which the schema already makes first-class.

**Prerequisite:** Layer A scored on the golden set and holding its thresholds.
Starting Layer B earlier means tuning prompts against an unstable foundation.

### B15. Layer C — candidate positioning
**Deferred, and deliberately last.** Requires a resume, which makes it the only
part of the system handling PII.

Four agents when built, consolidating V1's seven:

| Section | Depends on | Consolidates from V1 |
|---|---|---|
| `candidate_match` — fit level, alignments, gaps | `role_scope`, `role_origin` | Candidate–Role Match |
| `positioning_evidence` — strengths and stories mapped to role needs | `candidate_match`, `role_scope`, `interview_agenda` | Strengths to Emphasize + Story Recommendations |
| `objections_and_gaps` — hardest objections, interviewer concerns, how to handle | `candidate_match`, `interview_agenda` | Objections + Interviewer Concerns + Gap Management |
| `positioning_narrative` — headline, arc, "tell me about yourself" | all of Layer C | Positioning Strategy |

Each V1 trio was one research problem split three ways, which guaranteed
overlap and contradiction between them.

**Open decisions, to settle when this phase starts:**
- **Separate artifact or one document?** V1 bolted positioning onto the same
  report. It is a different reader moment, and it is the only part containing
  PII — which argues for a separate document with its own retention rules.
- **Resume as a source.** The `Claim` contract works unchanged (a resume is a
  source like any other), but grounding shifts from web evidence to the
  candidate's own document, and the rubrics differ accordingly.
- **PII handling.** Retention, store location, and whether resume chunks share
  the pgvector store with public evidence. Needs deciding before any resume text
  is persisted, not after.

### B16. Derived views
**Not agents.** Six of V1's sections discovered nothing — they were views over
findings established elsewhere: executive summary, decision summary, assessment
snapshot, 5-minute brief, unknowns to validate, risks & red flags.

V1 generated each with its own model call, which is the direct cause of a bug it
had to paper over: `getCanonicalRecommendation()` exists to reconcile
"conflicting signals from report, executive summary, pursuit stance, and
interview recommendation." Four independently generated summaries of the same
evidence disagreed, and V1 needed a tiebreaker.

In V2 these are computed from claims, so they cannot disagree. Built after the
Layer A sections exist, since a view needs something to be a view of.

| View | Derived from |
|---|---|
| Executive summary | section summaries, ranked by claim confidence and `soWhat` |
| Decision summary | `company_swot` + `role_swot` + `role_scope` |
| Assessment snapshot | claim counts, confidence distribution, coverage sufficiency per dimension |
| 5-minute brief | highest-`soWhat` canonical claims, capped |
| Unknowns to validate | every `open_question` claim, ranked, with `resolvesWith` |
| Risks & red flags | `company_swot` weaknesses + threats, `risk` and `event` claims, severity-ranked |

## Open scope

### B6. Rubrics for the remaining Layer A sections
Written and scored one section at a time, by Amit. Done:
`business_fundamentals`, `trajectory_and_health`. Remaining: `stated_direction`,
`operating_culture`, `product_and_customers`, `competitive_landscape`,
`product_teardown`, `role_origin`, `company_swot`, `role_scope`, `role_swot`,
`strategy_pov`.

Each section ships only when it holds its absolute rubric thresholds. Ten
rubrics is the real cost of Layer A, and human scoring is the bottleneck — see
the note in README §7.

### B7. Cross-section contradiction handling
Decided in principle: the prose pass must not paper over conflicting facts by
silently picking one. A contradiction that exists *in the evidence* is a
finding a candidate wants. Still to build: the checker distinguishing
writer-introduced contradictions from evidence-level ones.

### B12. Delete V1 residue
**Timing:** after the first section is built end to end and produces a report
for the dev target. Not before — V1 is the only runnable pipeline until then,
and deleting it early means debugging V2 with no reference point for what the
app expects.

**Delete:**
- `lib/report/` — `assemblePremiumReport{,V2,V3}.ts`, `assembleReport.ts`,
  `premiumPersona.ts`, `premiumQualityGate.ts`, `premiumTelemetry.ts`,
  `premiumPresentationViewModel.ts`, `premiumTypes.ts`, `recommendation.ts`,
  `generateOverlay.ts`, `citationMetadata.ts`, `sourceLinks.ts`, `v3/`
- `lib/ai/prompts.ts` — the mega-prompts
- `lib/retrieval/search.ts` — fixed-query retrieval
- V1-only report page rendering in `app/deep-dive/[id]/page.tsx` (2,358 lines)
- `app/api/overlay/`, and V1-only branches in `app/api/deep-dive/*`
- Root-level schema scripts superseded by `supabase/`: `check-schema.*`,
  `create-schema.mjs`, `execute-schema.mjs`, `setup-schema.mjs`,
  `show-schema.mjs`, `schema-ready-to-copy.sql`

**Keep:** Next.js app and routing, auth, Supabase schema and pgvector store,
Firecrawl ingestion, admin/history/diagnostics surfaces, `lib/db/`.

**Also delete at cutover:** `lib/v2/config/devTarget.ts` and any hardcoded
target it is wired into.

**Method:** one commit that only deletes, after a green `npm run build`, so the
removal is trivially revertible and separable from feature work. V1 remains
recoverable at tag `v1-legacy` regardless.

### B13. Dev target is the easy case
**Now:** Microsoft, hardcoded, for the whole build-out
(`lib/v2/config/devTarget.ts`).
**Why it is not sufficient:** dense filings and an enormous web footprint mean
almost any query returns something usable. It never exercises the researcher
loop's failure branch, and as a conglomerate it invites holding-company
altitude — competent-reading output that is useless for one specific role,
which is the exact failure V1 shipped.
**Decide by:** running the sparse-footprint and mid-size-private golden-set
buckets before declaring any section done.

## Graduated

_(empty — nothing measured yet)_

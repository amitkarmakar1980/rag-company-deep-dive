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

## Open scope

### B6. Sections beyond `company_snapshot`
Golden set and rubric are being defined one section at a time, by Amit.
Order after snapshot: TBD. Each section ships only when its rubric eval beats
v1 on the golden set.

### B7. Cross-section contradiction handling
Decided in principle: the prose pass must not paper over conflicting facts by
silently picking one. A contradiction that exists *in the evidence* is a
finding a candidate wants. Still to build: the checker distinguishing
writer-introduced contradictions from evidence-level ones.

## Graduated

_(empty — nothing measured yet)_

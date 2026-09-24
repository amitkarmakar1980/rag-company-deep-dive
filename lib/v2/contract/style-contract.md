# Style Contract

Binding constraints on the document-level prose pass. One contract for the
whole report — section scaffolds vary, voice never does.

Two kinds of rules below. **Checkable** rules are enforced mechanically and a
violation fails the run. **Judgment** rules go in the prose prompt and are
scored by rubric, not by code.

---

## 1. Register — opinionated advisor

The report takes positions. It is not a neutral summary.

- Conclude. Where the evidence supports a view, state the view. A report that
  lists facts and leaves the reader to assemble the meaning has failed.
- Say the uncomfortable thing. Deteriorating financials, a harvested org, a
  role that is smaller than its title — these are the highest-value content in
  the document, and hedging them to sound balanced destroys the point.
- Every position traces to evidence. Opinionated is not unsourced. The voice is
  confident because the work is done, not in place of it.
- No false balance. Do not append a reassuring counterpoint to a well-supported
  negative finding merely for symmetry. If a genuine counterpoint exists in the
  evidence, it is a claim in its own right and stands on its own.

## 2. Reader address — impersonal

**Checkable:** the words `you`, `your`, `yours` do not appear in the report body.

Refer to `the candidate`, `this role`, `a PM in this seat`. Analytical distance
is maintained even while taking positions — the report is opinionated about the
*company*, not presumptuous about the reader's circumstances.

Stating what a finding means for the role is in scope. Assuming the reader's
motivations, finances, risk tolerance, or family situation is not.

## 3. Epistemic markers — explicit

**Checkable:** every claim with `label: inference` or `label: open_question`
renders with its marker. Unmarked inference is an automatic run failure.

Facts are stated flatly, with an as-of date. No marker.

> Revenue reached $340M in FY24, up 22% year over year.

Inferences carry a bolded marker and an explicit basis:

> **Inference —** Platform is being harvested rather than funded. Basis: 340 of
> the 500 roles cut in FY24 were Platform, against 64% growth in the AI segment.

Open questions carry a marker and what would resolve them:

> **Open question —** whether AI gross margins hold as the segment scales.
> Resolves with segment-level disclosure in the FY25 10-K.

Where an inference is load-bearing for a section's conclusion, it may be
marked **The call —** instead of **Inference —**. Same requirements; signals
that the section's argument rests on it.

## 4. Numbers and dates

**Checkable:**
- Every number, date, proper noun, and named person in the prose appears in the
  claim set it renders. Anything else is fabrication and fails the run.
- Every quantitative claim carries a period or as-of date (`FY24`,
  `as of Q2 2025`, `March 2026`).

Data older than 18 months is marked stale at point of use, not silently
carried: `headcount 4,200 (last disclosed FY23 — likely stale)`.

## 5. Banned language

**Checkable — these strings do not appear:**

`leading provider`, `world-class`, `best-in-class`, `cutting-edge`,
`state-of-the-art`, `robust`, `seamless`, `innovative`, `synergy`,
`game-changer`, `rapidly growing`, `strong growth`, `significant growth`,
`well-positioned`, `industry-leading`, `passionate`, `journey`,
`in today's fast-paced`, `it's important to note`, `it's worth noting`,
`delve`, `leverage` (as a verb), `landscape` (except in the section title).

The rule behind the list: **no adjective that a number could replace.** Not
"rapid growth" but "22% YoY." Not "well-positioned" but the position.

## 6. Sentence and paragraph form

Judgment rules, rubric-scored:

- Vary sentence length. A short declarative after two long ones is how a
  position lands. Uniform 25-word sentences read as machine output.
- One idea per paragraph, 2–5 sentences. No single-sentence paragraphs except
  for deliberate emphasis, at most once per section.
- Lead with the conclusion, then the evidence. Never build to a reveal.
- No section preamble. Do not open with what the section will cover.
- No summary of what was just said. The renderer handles recap structurally.

## 7. Redundancy

**Checkable:** a claim with `role: reference` must not restate its fact. It
renders as a callback naming where the fact was established.

A claim with `role: reinforce` restates deliberately and must add the angle
given in its `repetitionRationale`. Restating without the new angle is a
violation even though the role permits repetition.

## 8. Contradictions

Where sources genuinely conflict, the report surfaces the conflict. It does not
silently pick a side.

> Headcount is reported as 4,200 (company FY24 filing) and ~3,600 (LinkedIn,
> March 2026). The gap likely reflects post-layoff attrition not yet in filings.

This applies only to conflicts present in the evidence. A contradiction the
prose pass introduces between two sections is a defect and fails the run.

## 9. Length

Target 6,000+ words. Comprehensive: a reference document across an interview
process, not a single-sitting read.

**The constraint that makes length safe:** words come from evidence depth, never
from restatement, preamble, or hedging. A section is long because it has more
grounded claims — not because each claim is described at greater length.

**Checkable:** prose-to-claim ratio per section stays within a band. A section
far above the band is padding; far below is under-developed. Flat ratio across
all sections is also the guard against a single long pass thinning out toward
the end (see BACKLOG B5).

Navigability is load-bearing at this length. Every section carries its
conclusion at the top, so the document is usable by a reader who reads only
the openings.

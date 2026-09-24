# Rubric — `trajectory_and_health`

Second section. Split from `business_fundamentals`, which owns the static
picture of the business; this one owns **motion over time** and whether the
motion is sustainable.

**Scored by:** Amit (human), on the golden set.

## What this section must answer

Which way is this company moving, how fast, and can it keep paying for it?

## Required coverage

Enforced mechanically via claim `factType` in `scorers/coverage.ts`.

| # | Element | Satisfied by | Required |
|---|---|---|---|
| TH1 | Revenue scale and direction | `financials` | yes |
| TH2 | Trajectory — growing, flat, or contracting, with the evidence for it | `financials`, `market` | yes |
| TH3 | Recent material events, last ~18 months — funding, M&A, layoffs, leadership change | `event` | yes |
| TH4 | Financial health signal — burn, profitability, runway, margin pressure | `financials`, `risk` | yes |

All four required. Unlike `business_fundamentals`, there is no optional element
here: a trajectory section missing any of these is not a thin section, it is a
wrong one.

## Quality dimensions

Q1–Q7 are shared with [`business-fundamentals.md`](business-fundamentals.md)
(grounding, label accuracy, recency, specificity, non-obviousness, so-what,
honesty about gaps). Three are specific to this section:

| # | Dimension | 1 | 5 |
|---|---|---|---|
| Q9 | **Composition over headline** — is growth decomposed, or reported as one number? | "revenue grew 22%" | "22% overall; one segment +64%, the rest +4%" |
| Q10 | **Says the hard thing** — deterioration stated plainly | hedges a bad trend into neutrality | names contraction, margin compression, or harvest without softening |
| Q11 | **Causal honesty** — growth attribution labelled as inference, not asserted | asserts a cause no source states | attribution marked `inference` with the step shown |

Q9 and Q10 carry the most weight in this section. A consolidated growth number
is the single most misleading thing a report can tell a senior candidate — it is
exactly how a flat business with one hot segment looks healthy. If a report
gets nothing else right here, decomposing growth is the thing that matters.

## Automatic failures

Shared with `business_fundamentals`, plus:

- Reporting a headline growth rate when segment-level data exists and was
  retrieved but not used.
- Describing a company that cut staff or missed guidance in the period as
  growing, without stating the countervailing evidence.
- Any financial figure without a period label.

## Scoring sheet

4 coverage booleans + 10 scores (Q1–Q7, Q9–Q11) + best/worst claim notes.

## Interaction with downstream sections

This is a tier-1 section and `role_origin`, `competitive_landscape`, and
`company_swot` all consume its handoff. A wrong conclusion here propagates
through three hops to `strategy_pov` (BACKLOG B10). Two consequences for
scoring:

- Score `sufficiency` honesty strictly. Downstream sections temper their own
  confidence from this field, so an overstated `strong` is worse here than a
  merely weak section.
- When a downstream section scores badly on the golden set, check this section's
  claims first before assuming the downstream prompt is at fault.

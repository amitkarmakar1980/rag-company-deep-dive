# Rubric — `company_snapshot`

First section to be built and scored. Chosen because it is the most factual
dimension: grounding and label-accuracy failures show up unambiguously, so it
is the cleanest calibration target for the eval harness.

**Scored by:** Amit (human), on the golden set. LLM judge is calibrated
against these human scores, not the other way round.

## What this section must answer

What is this company, materially, right now — such that a senior PM candidate
can decide whether it is worth their next 3 years?

## Required coverage

Each is a coverage check (present / absent), scored before quality.

| # | Element | Notes |
|---|---|---|
| C1 | Founding, ownership, current stage | public / PE / VC-backed / bootstrapped, and since when |
| C2 | Scale | revenue or ARR, headcount, customers — with as-of dates |
| C3 | Business model | how money is actually made, not the marketing description |
| C4 | Trajectory | growth, flat, or contracting, with the evidence for it |
| C5 | Recent material events | last ~18 months: funding, M&A, layoffs, leadership change |
| C6 | Financial health signal | burn, profitability, runway, or margin pressure |

## Quality dimensions

Score each 1–5. 3 = acceptable, 5 = better than what a candidate could
assemble themselves in an hour.

| # | Dimension | 1 | 5 |
|---|---|---|---|
| Q1 | **Grounding** — every `fact` claim traceable to its quote | quotes don't support claims | every quote verbatim and on-point |
| Q2 | **Label accuracy** — fact vs inference vs open question | inferences dressed as facts | labels survive adversarial reading |
| Q3 | **Recency** — dated claims, stale data flagged | undated or silently stale | as-of dates throughout; staleness called out |
| Q4 | **Specificity** — numbers over adjectives | "rapid growth", "leading player" | "ARR $340M, up 22% YoY (FY24)" |
| Q5 | **Non-obviousness** — beyond the About page | reads like the company website | surfaces what the company doesn't advertise |
| Q6 | **So-what** — decision-relevance for the candidate | facts with no consequence | each claim connects to the candidate's decision |
| Q7 | **Honesty about gaps** — thin evidence stated as thin | pads to look complete | names what it couldn't establish |

## Automatic failures

Override the score to 1 regardless of other dimensions:

- A quote that does not appear verbatim in the cited chunk.
- A fabricated number, date, or named person.
- A `fact` label on something no cited source states.
- A confident claim on a dimension the coverage report marked `thin`.

## Scoring sheet

Per company: 6 coverage booleans + 7 scores (1–5) + free-text notes on the
single worst claim and the single best claim. The worst/best notes are the
highest-signal input for prompt iteration — more useful than the numbers.

## Golden set

12–15 companies, deliberately spanning the hard cases:

- 3 large public (dense filings — tests synthesis, not retrieval)
- 3 mid-size private (thin coverage — tests honesty about gaps)
- 3 recently distressed (layoffs/down-round — tests whether it says the hard thing)
- 3 low-profile / non-US (sparse web presence — tests the researcher loop's floor)
- 2–3 companies Amit knows firsthand (ground truth the model cannot reach)

The last group matters most: it is the only place where a plausible-sounding
wrong answer is reliably detectable.

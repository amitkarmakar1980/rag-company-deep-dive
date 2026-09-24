# Rubric — `business_fundamentals`

First section to be built and scored. Chosen because it is the most factual
dimension: grounding and label-accuracy failures show up unambiguously, so it
is the cleanest calibration target for the eval harness.

**Scored by:** Amit (human), on the golden set. LLM judge is calibrated
against these human scores, not the other way round.

Companion rubric: [`trajectory-and-health.md`](trajectory-and-health.md). The
two were one `company_snapshot` section until the split; this one owns the
static picture of the business, that one owns motion over time.

## What this section must answer

What kind of business is this, structurally — who owns it, how big it is, and
how it actually makes money?

## Required coverage

Coverage checks (present / absent), scored before quality. Enforced
mechanically via claim `factType` in `scorers/coverage.ts`.

| # | Element | Satisfied by | Required |
|---|---|---|---|
| BF1 | Founding, ownership, current stage — public / PE / VC-backed / bootstrapped, and since when | `ownership`, `history` | yes |
| BF2 | Scale — headcount, customers, geography, with as-of dates | `scale` | yes |
| BF3 | Business model — how money is actually made, not the marketing description | `product`, `pricing` | yes |
| BF4 | Named leadership and tenure | `leadership` | no |

## Quality dimensions

Score each 1–5. 3 = acceptable, 5 = better than what a candidate could
assemble themselves in an hour.

| # | Dimension | 1 | 5 |
|---|---|---|---|
| Q1 | **Grounding** — every `fact` claim traceable to its quote | quotes don't support claims | every quote verbatim and on-point |
| Q2 | **Label accuracy** — fact vs inference vs open question | inferences dressed as facts | labels survive adversarial reading |
| Q3 | **Recency** — dated claims, stale data flagged | undated or silently stale | as-of dates throughout; staleness called out |
| Q4 | **Specificity** — numbers over adjectives | "sizeable", "enterprise-focused" | "2,150 staff across nine countries (FY24)" |
| Q5 | **Non-obviousness** — beyond the About page | reads like the company website | surfaces what the company doesn't advertise |
| Q6 | **So-what** — decision-relevance for the candidate | facts with no consequence | each claim connects to the candidate's decision |
| Q7 | **Honesty about gaps** — thin evidence stated as thin | pads to look complete | names what it couldn't establish |
| Q8 | **Model clarity** — revenue mechanics, not positioning | repeats how the company describes itself | explains what actually gets billed, and on what basis |

## Automatic failures

Override the score to 1 regardless of other dimensions:

- A quote that does not appear verbatim in the cited chunk.
- A fabricated number, date, or named person.
- A `fact` label on something no cited source states.
- A confident claim on a dimension the coverage report marked `thin`.

## Scoring sheet

Per company: 4 coverage booleans + 8 scores (1–5) + free-text notes on the
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

Microsoft is the pinned dev target (`lib/v2/config/devTarget.ts`) but sits in
the *easiest* bucket. For this section specifically, a conglomerate makes BF3
harder than usual — "how money is made" has several answers, and a report that
gives only the consolidated view has failed the candidate.

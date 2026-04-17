# pipeline_architecture.md

## Premium Interview Intelligence Report — Pipeline Architecture

### 1. System goals
The pipeline must produce a grounded, premium interview-prep report with:
- strong source coverage
- honest evidence labeling
- high-value candidate-specific synthesis
- low hallucination risk
- holistic cost and telemetry visibility

### 2. Architectural principles
1. Primary-source-first retrieval
2. Evidence before prose
3. Strong-model reasoning for high-stakes sections
4. Explicit contradiction handling
5. Redundancy elimination before final composition
6. Cost visibility at every stage
7. Cache aggressively, but never at the expense of stale strategic insight
8. In premium mode, do not degrade reasoning quality to save small amounts of cost

### 3. End-to-end pipeline
#### Stage 0 — Input normalization
Inputs:
- company name
- role title
- job description URL or pasted JD
- candidate resume / profile
- optional company URL
- report mode: premium

Outputs:
- normalized job object
- retrieval plan seed
- report id / run id

#### Stage 1 — Source acquisition planner
Purpose:
Generate a source plan before fetching content.

Tasks:
- identify whether company is public or private
- infer likely source classes needed for company strategy, role strategy, candidate-fit, and interview prep
- enumerate target domains
- prioritize primary sources first
- define retrieval depth per source class
- create section-to-source dependency map
- decide whether competitor retrieval is mandatory
- identify target product surfaces named in the JD or implied by the role
- identify likely leadership-commentary sources
- identify whether filings extraction is mandatory

Outputs:
- source plan
- fetch queue
- evidence requirements by section
- section dependency graph
- targeted re-retrieval triggers

#### Stage 2 — Fetch, crawl, connector reads
Source priority:
1. Careers / exact JD
2. Investor relations / filings / earnings / investor day
3. Official launches / blogs / engineering / product docs
4. Leadership interviews / talks
5. Role-context sources
6. External validation
7. Low-confidence enrichment

Required retrieval families:
- business model / filings extraction
- leadership commentary retrieval
- product-surface retrieval
- competitor landscape retrieval
- role-context retrieval
- market / industry context retrieval when the role obviously depends on it

Outputs:
- raw HTML / text / PDFs
- source metadata
- freshness metadata
- fetch logs
- retrieval cost events

Competitor retrieval is mandatory when:
- the company operates in a clearly contested category
- the role is strategy, growth, platform, monetization, AI, marketplace, or ecosystem adjacent
- competitor moves are plausibly part of the why-now thesis

Do not bloat the report with low-value external noise:
- reject broad press aggregation without role relevance
- reject listicles and SEO summaries
- reject external content that adds no incremental strategic signal

#### Stage 3 — Cleanup and parsing
Purpose:
Turn messy pages into reliable text units.

Tasks:
- remove boilerplate
- isolate content blocks
- detect repeated nav/footer text
- extract dates, titles, authors, source type
- classify primary vs secondary vs low-confidence

Outputs:
- clean source documents
- structured metadata
- normalized citations
- source-class labels usable by evidence gating

Recommended model tier:
- small/cheap model or deterministic parser acceptable

#### Stage 4 — Evidence extraction
Purpose:
Convert source text into atomic evidence objects before synthesis.

Rules:
- extract only materially useful claims
- prefer structured evidence over verbose summaries
- retain precise citations
- tag speculative language explicitly
- extract section-oriented evidence, not just generic summaries

Required extraction products:
- business model claims
- monetization and demand-driver claims
- product-surface claims
- leadership priority claims
- competitor and substitute claims
- strategic tension claims
- role mandate and ownership clues
- stakeholder / dependency clues
- interviewer-pattern clues when available

Recommended model tier:
- strong reasoning model

#### Stage 5 — Evidence normalization and dedupe
Purpose:
Merge equivalent claims and reduce noise.

Tasks:
- canonicalize similar claims
- group by theme
- dedupe near-identical launches / reports
- identify stale vs fresh evidence
- merge evidence clusters for later synthesis
- build strategy evidence clusters
- build competitor evidence clusters
- build role-mandate clusters
- build interviewer-agenda and interview-theme clusters

Outputs:
- normalized evidence graph
- evidence clusters
- source coverage report

Recommended model tier:
- strong reasoning model

#### Stage 6 — Contradiction and evidence-gap pass
Purpose:
Find disagreements, weak areas, and unsupported sections before writing.

Tasks:
- detect claim conflicts
- flag freshness conflicts
- mark sections under evidence threshold
- identify where additional retrieval is needed
- force “unknown” or “insufficient evidence” states where necessary
- detect contradictions across company strategy, role strategy, and interview-prep layers
- block final composition when strategy sections are unsupported or internally inconsistent

Recommended model tier:
- strong reasoning model

Decision rule:
- if company strategy, competitor analysis, role strategy, or interview-prep sections fail evidence threshold, run targeted re-retrieval once before suppression

#### Stage 7 — Company strategy synthesis
Required outputs:
- business model deep dive
- strategic priorities
- product / platform strategy context
- market / industry context
- competitor analysis
- strategic tensions and tradeoffs
- why the company needs this role now

Rules:
- separate fact from synthesis
- no invented precision
- no generic SWOT filler
- no generic competitor bullets
- no product-name lists without strategic implications

Recommended model tier:
- strongest reasoning model in premium mode

#### Stage 8 — Role-mandate reconstruction and role strategy synthesis
Required outputs:
- role mandate reconstruction
- role leverage analysis
- scope and power analysis
- stakeholder / org map
- success metrics / metric tree
- first-90-days / year-1 thesis
- role risks and hidden constraints
- what would impress the hiring team

Recommended model tier:
- strongest reasoning model in premium mode

#### Stage 9 — Candidate-fit synthesis
Questions:
- where does candidate align strongly
- where are the gaps
- what objections will arise
- what is the honest positioning angle
- what story map best supports this role

Recommended model tier:
- strongest reasoning model

#### Stage 10 — Interview-prep synthesis
Questions:
- what interview loop is likely
- what interviewer types likely care about
- what must be demonstrated
- what questions should the candidate ask
- what should the candidate avoid
- how does the candidate win this process

Required synthesis products:
- interviewer agenda map
- strategic themes to master
- story-to-theme mapping
- objection handling by interviewer type
- role-specific mock questions
- questions to ask with signaling logic
- what not to say
- answer-quality scaffolding
- loop-wide how-to-win synthesis

Recommended model tier:
- strongest reasoning model

#### Stage 11 — Final report composition
Purpose:
Compose skimmable and deep-prep layers without repetition.

Composition rules:
- company strategy and role strategy must stay central, not buried
- interview prep must feel like a premium suite, not an appendix
- style compression is allowed only after strategic depth is locked in

Recommended model tier:
- strongest reasoning model or executive writing model

#### Stage 12 — QA, contradiction, and anti-redundancy pass
Checks:
- unsupported claims
- invented metrics
- confidence/evidence mismatch
- repeated claims across sections
- generic filler
- candidate-specific contradictions
- citation density too low for assertion level
- shallow strategy
- shallow competitor analysis
- shallow role thesis
- shallow interviewer-specific prep

Recommended model tier:
- strong reasoning model

#### Stage 13 — Rendering and telemetry
Outputs:
- HTML / PDF / JSON
- section-level citations
- evidence legend
- cost summary
- stage timings
- user-visible compute intensity
- internal true cost ledger

### 4. Section dependency matrix
Company strategy depends on:
- filings / earnings / shareholder materials when public
- official launches and product docs
- leadership commentary
- competitor evidence

Role strategy depends on:
- JD
- company strategy evidence clusters
- related roles, team pages, leadership bios, or product-surface docs when available

Interview prep depends on:
- company strategy
- role strategy
- candidate profile for personalization
- interviewer-agenda synthesis and story mapping

### 5. Model routing
#### Acceptable for small/cheap models
- HTML cleanup
- schema coercion
- source classification if simple
- chunking support
- formatting transforms
- non-semantic rendering utilities

Use the strongest reasoning model for:
- company strategy synthesis
- competitor analysis synthesis
- role strategy synthesis
- interview-prep synthesis
- final executive-quality composition

Use a second-pass strongest reasoning check for:
- contradiction-sensitive company strategy
- competitor analysis if the first pass is shallow
- role strategy if it reads like a restated JD
- interview prep if interviewer agendas or story maps are generic

#### Not acceptable for mini models in premium mode
- SWOT generation
- why this role exists now
- strategic importance / leverage
- org-risk analysis
- year-1 expectations
- hiring-manager hypothesis
- candidate-specific positioning
- objections and rebuttals
- how to win synthesis
- contradiction pass
- final QA
- competitor analysis synthesis
- interviewer agenda map
- story-to-theme mapping
- answer-quality scaffolding

### 6. Retrieval re-run logic
Trigger a second retrieval pass when:
- primary-source coverage is insufficient
- critical sections depend on only generic news search
- conflicting signals exist across fresher authoritative sources
- exact product surfaces named in the JD have not been covered
- strategic sections fail evidence threshold
- competitor analysis lacks direct competitor or substitute evidence
- role strategy lacks adjacent-role or org-context evidence
- interview prep lacks enough context to produce interviewer-specific output

Maximum:
- 1 targeted re-retrieval pass for premium mode by default

### 7. Caching strategy
Aggressively cache:
- exact JD
- investor relations pages
- filings
- earnings transcripts
- leadership bios
- official product launches
- company blogs
- parsed source documents
- normalized evidence objects

Never trust stale cache blindly for:
- latest earnings / quarter changes
- org changes
- very recent product launches
- role-specific active strategic themes

### 8. Cost observability
Every stage emits:
- stage name
- provider
- model/service
- units consumed
- estimated cost
- duration
- cache hit/miss
- downstream sections unlocked

### 9. Failure modes to prevent
1. Strategy prose generated from thin evidence
2. Repetition disguised as multiple sections
3. Fake precision in metrics or year-1 goals
4. Generic interview advice dressed up as personalization
5. High confidence with low source depth
6. Candidate fit detached from actual hiring bar
7. Cost accounting that ignores retrieval, embedding, and cache dynamics
8. Competitor analysis that ignores substitutes, platform threats, or real tradeoffs
9. Role strategy that confuses title with authority
10. Interview prep that lacks interviewer-specific validation logic

### 10. Premium release recommendation
Minimum premium pipeline:
- primary-source-first retrieval
- evidence extraction before synthesis
- contradiction pass
- separate company strategy / role strategy / candidate / prep syntheses
- anti-redundancy pass
- holistic cost ledger
- user-visible transparency layer
- competitor retrieval and product-surface retrieval
- interviewer-agenda and story-mapping synthesis

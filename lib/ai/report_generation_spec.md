# report_generation_spec.md

## Premium Interview Intelligence Report — Generation Spec

### 1. Product objective
Generate a premium, decision-grade interview preparation report for senior PM, Director+, and VP-track candidates. The report must optimize for:
- grounded insight
- trust and traceability
- candidate decision quality
- interview readiness
- cumulative, non-redundant content

The report must help a candidate answer:
- Should I pursue this role?
- Why does this role exist now?
- What is the business, org, and product context?
- What is the likely hiring bar?
- What concerns will interviewers have about me?
- Which stories should I tell?
- What should I ask?
- How do I position to win?

### 2. Quality bar
The system must prefer omission over unsupported specificity.

Hard rules:
- Do not fabricate metrics, timelines, org structures, reporting lines, stakeholder maps, or year-1 goals.
- Do not generate strategy-heavy sections from generic news search alone.
- Do not show confidence scores when evidence thresholds are not met.
- Do not fill empty sections with generic PM advice.
- Mark unknowns explicitly.
- Hide sections that fail the minimum evidence bar.

### 3. Report modes
#### 3.1 5-minute brief
For interview-day skim. Must fit quick consumption and focus on:
- decision memo
- why this role exists now
- what the hiring team likely cares about
- top candidate positioning angle
- top interviewer concerns
- top risks / unknowns
- top questions to ask
- how to win this process

#### 3.2 Full report
For deep prep. Includes:
- company strategy
- role strategy
- business model and product context
- org / stakeholder map
- candidate-role fit analysis
- objections and rebuttals
- interview loop forecast
- story map
- metric tree
- first 90 days / year-1 operating thesis
- credibility and evidence layer
- report operations and cost layer

### 4. Information architecture
This product is still underpowered in three places if left at the current default depth:
- company strategy is too thin when it stops at summary bullets, weak SWOT, or launch recaps
- role strategy is too thin when it reads like an expanded JD instead of an operating thesis
- interview prep is too weak when it collapses into generic PM coaching, generic objections, or generic mock questions

Reject outputs that exhibit any of the following failure modes:
- company strategy that does not explain business model, control points, competitor pressure, and strategic tradeoffs
- role strategy that does not reconstruct mandate, leverage, power, dependencies, and hidden constraints
- interview prep that does not explain how different interviewers think, what they are trying to disprove, and what proof they need
- story guidance that does not map candidate stories to likely interview themes and follow-up traps
- “how to win” guidance that does not explain how to think like the hiring manager

## Layer A — Decision layer
### A1. Decision memo
Purpose: concise pursue / cautious pursue / pass recommendation.
Output:
- recommendation
- rationale
- what must be true for this to be a strong bet
- what would change the recommendation

### A2. Why this role exists now
Purpose: explain the business, product, market, or org change that created the role.
Requirements:
- at least 2 independent sources
- at least 1 primary source when available
- no generic filler
- must explain timing pressure, not just role relevance

### A3. How to win this process
Purpose: compress the report into a premium interview strategy.
Output:
- what to lead with
- what to prove repeatedly
- what not to overclaim
- how to tailor stories by interviewer type
- how to signal director+ judgment, strategic range, and operating depth

## Layer B — Company strategy layer
Company strategy is a core differentiator, not background context. It must be one of the deepest parts of the report.

### B1. Business model deep dive
Objective:
- explain how the company actually makes money and where the role intersects revenue, retention, engagement, cost, or platform power

Required sources:
- filings when public
- earnings / shareholder materials when available
- official pricing, product, or monetization pages
- official launch pages and product docs
- external evidence only to validate or pressure-test official framing

Evidence threshold:
- minimum 2 sources
- minimum 1 primary source
- suppress margin, revenue mix, or monetization precision if not supportable

Good output looks like:
- specific monetization model
- real demand drivers
- real supply-side dependencies when relevant
- explicit strategic constraints
- role-to-business linkage stated clearly

Weak output looks like:
- “the company is SaaS”
- “AI is a growth opportunity”
- generic TAM language with no mechanism

Hide if evidence is weak:
- detailed revenue mix
- margin commentary
- exact unit-economic logic

### B2. Company strategic priorities
Objective:
- distinguish what leadership says from what company actions imply

Required sources:
- earnings calls
- shareholder letters
- investor day or board-facing materials
- official launch pages
- leadership commentary
- capital allocation signals

Evidence threshold:
- 3 sources preferred
- 2 primary sources preferred

Good output looks like:
- explicit priorities from leadership
- implied priorities from launches, acquisitions, hiring, and resourcing
- durable priorities separated from tactical campaigns

Weak output looks like:
- laundry lists of initiatives
- undifferentiated “focus areas” with no ranking or tension

Hide if evidence is weak:
- priority ordering
- claims about durability

### B3. Product / platform strategy context
Objective:
- explain the product surfaces relevant to the role, how they fit the broader strategy, and where the control points sit

Required sources:
- product docs
- launch pages
- developer docs when platform dynamics matter
- help center and workflow docs when actual product mechanics matter

Evidence threshold:
- 2 product-surface sources minimum

Good output looks like:
- named product surfaces
- role-relevant platform or ecosystem dynamics
- workflow lock-in or distribution leverage where real
- control points and dependency edges called out

Weak output looks like:
- product-name lists
- generic platform claims with no mechanism

Hide if evidence is weak:
- claims about platform moat
- claims about ecosystem power

### B4. Market / industry context
Objective:
- explain the external strategic context the candidate must understand before interviewing

Required sources:
- filings or investor materials when available
- reputable trade press
- competitor evidence
- regulatory or industry sources where material

Evidence threshold:
- 2 sources minimum
- at least 1 source outside company-controlled narrative when possible

Good output looks like:
- market structure
- macro shifts affecting the company
- AI/ML, regulatory, distribution, monetization, or behavior changes that matter to this role

Weak output looks like:
- generic sector trends
- broad “AI is changing everything” language

Hide if evidence is weak:
- market-share assertions
- maturity-stage conclusions

### B5. Competitor analysis
Objective:
- provide a serious competitive map, not generic bullets

Required sources:
- official competitor launches and product pages
- reputable external competitor evidence
- analyst or strong trade reporting when needed
- product docs or pricing pages where useful

Evidence threshold:
- direct competitors required when identifiable
- adjacent competitors and substitutes required when relevant
- hyperscaler or platform threat analysis required when applicable

Good output looks like:
- direct competitors
- adjacent competitors
- substitute behaviors
- hyperscaler / platform threats
- real differentiation
- honest moat assessment: real vs overstated
- where competitors are ahead
- what competitor tradeoffs reveal
- what this means for the role

Weak output looks like:
- “competition is intense”
- random brand-name lists
- no explanation of strategic implications

Hide if evidence is weak:
- ranking claims
- moat durability claims

### B6. Strategic tensions and tradeoffs
Objective:
- surface the real decisions leadership is balancing

Required sources:
- leadership commentary
- product launches
- policy, trust, monetization, or platform materials
- external competitor evidence if it reveals tradeoffs

Evidence threshold:
- 2 signals minimum for each major tradeoff

Good output looks like:
- growth vs trust
- monetization vs UX
- automation vs control
- openness vs quality
- privacy vs personalization
- speed vs reliability
- multi-sided platform tensions
- centralized AI strategy vs product autonomy

Weak output looks like:
- generic “there are tradeoffs” language

Hide if evidence is weak:
- claims that a specific tradeoff is dominant

### B7. Why the company needs this role now
Objective:
- connect company strategy and role strategy into a timing thesis

Required sources:
- JD
- primary company strategy materials
- official launches or leadership commentary
- role-context evidence

Evidence threshold:
- at least 2 sources
- 1 primary source required unless impossible

Good output looks like:
- what changed
- why timing matters now
- what pressure leadership is under
- why the role is funded now rather than later

Weak output looks like:
- “AI is important”
- “the company is growing”

Hide if evidence is weak:
- exact timing claims
- org-backstory specifics

## Layer C — Role strategy layer
Role strategy must read like an operating thesis, not a role summary.

### C1. Role mandate reconstruction
Objective:
- infer what the role likely exists to solve

Inputs:
- JD
- company strategy layer
- related roles
- leadership commentary

Evidence threshold:
- JD required
- at least 1 adjacent source preferred

Output format:
- explicit mandate
- inferred mandate
- likely hiring-team priorities

Risk of hallucination:
- high if driven by JD alone

Suppress specificity when:
- reporting line, charter, or org placement is unclear

### C2. Role leverage analysis
Objective:
- identify business levers, product surfaces, and internal capabilities this role likely influences

Inputs:
- JD
- product / platform context
- strategy evidence clusters

Evidence threshold:
- 2 evidence points minimum

Output format:
- leverage points
- dependencies
- role type: central, enabling, incubation, platform, or execution-heavy

Risk of hallucination:
- medium-high

Suppress specificity when:
- actual ownership surface is unclear

### C3. Scope and power analysis
Objective:
- separate ownership from influence and identify where alignment is required

Inputs:
- JD
- related roles
- leadership bios
- company operating context

Evidence threshold:
- 2 sources preferred

Output format:
- likely owned decisions
- likely influenced decisions
- likely approval gates
- political friction zones
- execution-risk sources

Risk of hallucination:
- high

Suppress specificity when:
- authority level is not supportable

### C4. Stakeholder / org map
Objective:
- map core partners, adjacent teams, executive stakeholders, conflict zones, and operational dependencies

Inputs:
- JD
- related roles
- team pages
- leadership bios
- product docs when they reveal dependencies

Evidence threshold:
- JD plus at least 1 org-context source preferred

Output format:
- core partners
- adjacent teams
- conflict zones
- executive stakeholders
- operational dependencies

Risk of hallucination:
- high

Suppress specificity when:
- team topology is weakly evidenced

### C5. Success metrics / metric tree
Objective:
- identify likely outcome classes, primary metrics, guardrails, and balancing metrics without inventing numbers

Inputs:
- JD
- business model
- product surface context
- monetization or retention evidence

Evidence threshold:
- 2 evidence points minimum

Output format:
- likely north-star outcome classes
- likely primary metrics
- likely guardrails
- likely balancing metrics

Risk of hallucination:
- medium-high

Suppress specificity when:
- metrics cannot be inferred from business model and role context

### C6. First 90 days / year-1 thesis
Objective:
- describe how a smart leader would approach the role before acting

Inputs:
- role mandate
- stakeholder map
- business / product context
- risks and constraints

Evidence threshold:
- direct year-1 evidence preferred; otherwise frame as plausible thesis only

Output format:
- first-90-day priorities
- diagnostic questions
- what must be learned first
- likely quick wins vs false quick wins
- failure modes
- overreach risks

Risk of hallucination:
- very high

Suppress specificity when:
- deliverables are not directly supported

### C7. Role risks and hidden constraints
Objective:
- surface execution reality, not sanitized role framing

Inputs:
- JD
- org context
- product / platform evidence
- market and trust constraints

Evidence threshold:
- 2 signals minimum where possible

Output format:
- ambiguity risks
- instrumentation limits
- platform limits
- dependency risks
- GTM or monetization complexity
- compliance / trust / privacy issues
- quality / relevance / latency tradeoffs
- internal political risk
- title inflation vs real authority

Risk of hallucination:
- medium-high

Suppress specificity when:
- the mechanism is not evidence-backed

### C8. What would impress the hiring team
Objective:
- define what senior-level thinking looks like in this process

Inputs:
- role mandate
- company strategy
- interviewer agenda hypotheses
- candidate background when available

Evidence threshold:
- may include reasoned synthesis, but must stay tied to role and company context

Output format:
- signals of seniority
- examples that feel directly relevant
- strategic depth that would stand out
- weak answers other candidates give
- stronger answers and why they win

Risk of hallucination:
- medium

Suppress specificity when:
- interviewer expectations are generic or weakly grounded

## Layer D — Candidate-fit layer
### D1. Candidate-role fit assessment
### D2. Story-to-requirement map
### D3. Strengths to emphasize
### D4. Likely objections
### D5. Honest rebuttal frames
### D6. What would impress this hiring team

## Layer E — Interview prep layer
Interview prep is a premium capability, not an appendix.

### E1. Interview loop forecast
Objective:
- forecast likely stages, interviewer types, and what each stage screens for

Evidence / inputs:
- JD
- company hiring patterns when available
- role seniority norms
- source-backed signals vs hypothesis clearly separated

Output format:
- likely stages
- likely interviewer types
- what each stage validates
- what is evidenced vs hypothesized

Strong output looks like:
- stage-by-stage screening logic specific to role type

Generic output to reject:
- recruiter, manager, panel, exec with no nuance

### E2. Interviewer agenda map
Objective:
- explain how each interviewer type thinks, what they worry about, and what proof they need

Evidence / inputs:
- role strategy
- stakeholder map
- seniority level

Output format:
- hiring manager
- peer PM
- engineering leader
- design / UX
- data science / ML
- cross-functional executive
- recruiter / coordinator screen when relevant

For each:
- what they validate
- what they worry about
- what proof they need
- what bad answers look like
- what good answers look like

Strong output looks like:
- interviewer-specific proof standards

Generic output to reject:
- vague “show leadership” advice

### E3. Strategic themes the candidate must master
Objective:
- define role-specific themes, not generic PM themes

Evidence / inputs:
- company strategy
- role strategy
- product / market context

Output format:
- named themes
- why they matter
- what mastery sounds like

Strong output looks like:
- themes such as AI platform strategy, monetization measurement, marketplace dynamics, trust-quality tradeoffs, platform governance, experimentation rigor, org leadership under ambiguity when role-relevant

Generic output to reject:
- roadmap prioritization, stakeholder management, execution, communication

### E4. Story-to-interview map
Objective:
- map candidate stories against likely interview themes and follow-up traps

Evidence / inputs:
- candidate background
- interviewer agenda map
- strategic themes

Output format:
- best story per theme
- why it works
- what it proves
- what to emphasize
- what to leave out
- likely follow-ups

Strong output looks like:
- clear story-theme matching with proof logic

Generic output to reject:
- “have a leadership story ready”

### E5. Objection handling by interviewer type
Objective:
- prepare for likely objections with honest, evidence-linked response frames

Evidence / inputs:
- candidate profile
- role strategy
- interviewer agenda map

Output format:
- likely objection
- why they have it
- honest response frame
- strongest supporting evidence from candidate background
- what not to overclaim

Strong output looks like:
- interviewer-specific concerns and response strategy

Generic output to reject:
- “address gaps confidently”

### E6. Role-specific mock questions
Objective:
- generate serious role-specific questions and answer criteria

Evidence / inputs:
- company strategy
- role mandate
- interviewer agenda map

Output format:
- product sense
- strategy
- execution
- leadership
- cross-functional influence
- AI / ML judgment
- metrics / experimentation
- domain-specific questions

For each:
- why they might ask it
- what a strong answer must include
- what a weak answer misses

Strong output looks like:
- role- and company-specific pressure tests

Generic output to reject:
- generic PM interview bank

### E7. Questions to ask the interviewer
Objective:
- give the candidate high-signal diagnostic questions that change positioning

Evidence / inputs:
- role risks
- scope ambiguity
- strategy tensions
- stakeholder map

Output format:
- role scope clarification
- strategy diagnosis
- org and stakeholder alignment
- metrics and success
- hiring manager expectations
- hidden risk detection
- culture / ways of working
- resourcing and prioritization
- what would make someone exceptional

For each question:
- why it is high signal
- what a reassuring answer sounds like
- what a concerning answer sounds like
- how the answer should change candidate positioning

Strong output looks like:
- questions that are hard to deflect and change the candidate's live strategy

Generic output to reject:
- “what does success look like?” without role-specific framing

### E8. What not to say
Objective:
- identify tactical mistakes that signal shallow thinking or low seniority

Evidence / inputs:
- company strategy
- role strategy
- interviewer agenda map

Output format:
- overclaims
- low-seniority signals
- shallow AI understanding
- generic PM thinking
- poor strategic judgment
- weak business-model awareness
- weak executive presence

### E9. How to win this interview
Objective:
- synthesize the whole report into a premium “how to win” playbook

Evidence / inputs:
- all major layers

Output format:
- what to lead with
- what capabilities to prove repeatedly
- loop-wide narrative arc
- tailoring by interviewer type
- how to address likely gaps without sounding defensive
- how to signal director-level judgment
- how to signal strategic range plus operating depth

Strong output looks like:
- a coherent win strategy with interviewer-aware adaptation

Generic output to reject:
- reheated summary bullets

## Layer F — Credibility layer
### F1. Verified facts
### F2. Cited synthesis
### F3. Key inferences
### F4. Unknowns that materially change the recommendation
### F5. Source coverage and freshness
### F6. Conflicts / contradictions

## Layer G — Operations layer
### G1. Generation summary
### G2. Holistic cost summary
### G3. Refresh / personalization deltas
### G4. Cache / reuse notes

### 5. Evidence framework
#### 5.1 Verified Fact
A claim directly supported by a specific source with traceable citation and no meaningful interpretive leap.

#### 5.2 Cited Synthesis
A conclusion formed by combining multiple cited facts.

Requirements:
- at least 2 supporting sources
- must identify it as synthesis, not raw fact

#### 5.3 Informed Inference
A reasoned conclusion where direct proof is incomplete.

Requirements:
- must be labeled inference
- must not contain invented precision
- must not drive decision-critical sections by itself

#### 5.4 Speculation
A claim with insufficient grounding.
Rule:
- exclude from report

#### 5.5 Unknown / insufficient evidence
A section state, not a failure.
Use when evidence cannot support a confident conclusion.

### 6. Evidence thresholds by section
| Section | Minimum evidence requirement |
|---|---|
| Decision memo | 3+ relevant sources, 1+ primary if available |
| Why this role exists now | 2+ sources, 1+ primary |
| Business model deep dive | 2+ sources, 1+ primary, filings / earnings required when public |
| Company strategic priorities | 3+ sources, 2+ primary-preferred |
| Product / platform strategy context | 2+ relevant product-surface sources |
| Market / industry context | 2+ sources, 1 outside company narrative when possible |
| Competitor analysis | 3+ sources across company, competitor, and external validation when possible |
| Strategic tensions / tradeoffs | 2+ signals per major tradeoff |
| Role mandate reconstruction | JD + 1 adjacent source preferred |
| Role leverage / scope / power | 2+ sources preferred |
| Stakeholder / org map | 2+ sources, JD + adjacent evidence |
| Success metrics / metric tree | 2+ evidence points tied to business model and role context |
| First-90-days / year-1 thesis | direct role evidence preferred; otherwise suppress specificity |
| Role risks / hidden constraints | 2+ signals where possible |
| What would impress the hiring team | role- and company-specific synthesis only |
| Candidate-fit | JD + resume + company context |
| Interview loop forecast | must be explicitly labeled as hypothesis unless sourced |
| Interviewer agenda map | role strategy + stakeholder map required |
| Story-to-interview map | resume required for specific story mapping |
| Objection handling | resume required for personalized rebuttal frames |
| Mock questions | company and role strategy layers must already exist |
| Questions to ask | must be tied to named unknowns, tensions, or risks |
| Cost layer | derived from telemetry, not model prose |

Suppress or hide sections if thresholds fail.

### 7. Retrieval strategy
Priority order:
1. primary company sources
2. role-context sources
3. reputable external validation
4. low-confidence enrichment

Mandatory source-class rules:
- filings are mandatory for public-company business model and strategy claims
- earnings / shareholder materials are mandatory for public-company priority and capital-allocation claims
- official launch pages are mandatory for product-surface and announced-priority claims
- official leadership commentary is mandatory for CEO / executive priority framing when available
- product docs are mandatory for product-mechanics or platform-control-point claims
- external competitor evidence is mandatory for competitor analysis beyond direct company framing

#### 7.1 Primary company sources
- exact careers page / JD
- investor relations
- annual and quarterly filings
- earnings call transcripts
- shareholder letters
- investor day decks
- official product launch pages
- official blogs / engineering blogs
- official leadership talks and interviews
- relevant developer docs / API docs
- pricing pages and packaging pages when monetization matters
- help center, workflow docs, or onboarding docs when actual product mechanics matter

#### 7.2 Role-context sources
- leadership bios
- team pages
- related job descriptions
- product-surface docs
- advertiser / merchant / creator docs
- help center pages showing actual product mechanics

#### 7.3 Reputable external validation
- major business press
- strong trade press
- transcript providers
- credible product analyses
- competitor announcements
- competitor docs / pricing / launch material
- regulatory or industry sources when they affect role context

#### 7.4 Low-confidence enrichment
- candidate interview anecdotes
- community discussion
- crowd-sourced summaries

These cannot determine core recommendation without corroboration.

Section-to-source dependency rules:
- company strategy cannot rely on generic news search alone
- competitor analysis cannot rely on company-controlled narrative alone
- role strategy cannot rely on JD paraphrase alone
- interview prep cannot rely on generic senior-PM priors alone

### 8. Model routing summary
- cheap model: cleanup, boilerplate stripping, schema coercion
- strong reasoning model: extraction, normalization, contradiction checks, evidence clustering
- strongest reasoning model: company strategy synthesis, competitor analysis synthesis, role strategy synthesis, interview-prep synthesis, and final executive-quality composition
- second-pass strongest reasoning model: contradiction-sensitive re-check for strategy and interview-prep sections when first pass is shallow
- style/compression pass: allowed only after insight-dense content already exists

Never generate these sections with mini models in premium mode:
- company strategy
- competitor analysis
- strategic tensions and tradeoffs
- why this role exists now
- role mandate / leverage / scope / power
- stakeholder / org map synthesis
- interviewer agenda map
- story-to-interview map
- objection handling
- how to win this interview

Automatic shallow-output detection:
- repeated generic language across sections
- missing named competitors or substitutes when competition obviously exists
- no tradeoffs, no tensions, or no control points in strategy sections
- role strategy that reads like a restated JD
- interview prep that could apply to any PM interview
- no interviewer-specific proof standards
- no story mapping, no follow-up traps, or no answer scaffolding

Escalation rule:
- if any shallow-output detector triggers on a premium section, rerun that section on the strongest reasoning model before final composition

### 9. Section-writing rules
Every section must:
- add net-new value
- explicitly avoid repeating prior sections
- separate fact from synthesis
- state what is known vs unknown
- be role-specific
- be useful for director+ candidates
- explain why the point matters in the interview room
- reject generic PM language even if technically correct
- prefer honest omission over shallow filler

### 10. Redundancy controls
Before final composition, run a pass that:
- detects repeated claims across sections
- merges overlapping sections
- forces each section to answer a distinct question
- removes generic restatements

### 11. Output structure
Required final top-level order:
1. Decision memo
2. 5-minute brief
3. Why this role exists now
4. Company strategy
5. Role strategy
6. Candidate fit
7. Interview prep
8. How to win this process
9. Credibility layer
10. Operations and cost layer

### 12. Failure handling
When evidence is weak:
- show “insufficient evidence”
- suppress confidence
- continue with grounded sections only

When sources conflict:
- show both sides
- note which source is fresher / more authoritative
- lower confidence
- do not force a false conclusion

### 13. Premium product decisions
Mandatory in premium mode:
- broader retrieval
- strongest reasoning model for strategy synthesis
- contradiction pass
- anti-redundancy pass
- candidate-specific synthesis
- holistic cost accounting
- citation density and freshness reporting
- premium-grade company strategy, role strategy, and interview prep depth
- suppression of shallow strategy and shallow interview coaching

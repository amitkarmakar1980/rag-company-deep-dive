# pipeline_architecture.md

## Premium Interview Intelligence Report — Pipeline Architecture

### 1. System goals
The pipeline must produce a grounded, premium interview-prep report with:
- strong source coverage
- honest evidence labeling
- high-value candidate-specific synthesis
- low hallucination risk
- holistic cost and telemetry visibility
- persona-adaptive retrieval, synthesis, and composition

### 2. Architectural principles
1. Primary-source-first retrieval
2. Evidence before prose
3. Strong-model reasoning for high-stakes sections
4. Explicit contradiction handling
5. Redundancy elimination before final composition
6. Cost visibility at every stage
7. Cache aggressively, but never at the expense of stale strategic insight
8. In premium mode, do not degrade reasoning quality to save small amounts of cost
9. Infer persona before retrieval, not after composition
10. Adapt proof models, source plans, and reading experience by role family and seniority
11. Preserve one canonical report structure and adapt it through persona-conditioned ordering, emphasis, and analysis depth
12. Allow one primary persona and at most one secondary persona; do not permit uncontrolled multi-persona sprawl

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

#### Stage 0.5 — Persona inference and routing
Purpose:
Infer the working persona before source planning.

Tasks:
- classify role family from title, JD, and responsibility language
- choose one primary role family
- detect whether one optional secondary role family is justified
- classify seniority from title, scope, reporting expectations, and business ownership signals
- infer sub-specialization when supportable
- detect ambiguous or mixed roles
- define persona-specific proof model
- define persona-specific reading experience template seed
- define persona-specific retrieval profile seed
- summarize persona reasoning for QA and telemetry

Outputs:
- inferred_primary_role_family
- inferred_secondary_role_family
- is_blended_persona
- inferred_seniority
- inferred_subspecialization
- persona_confidence
- persona_reasoning_trace_summary
- persona_evidence
- mixed_role_flag
- persona_profile
- persona_retrieval_profile
- persona_strategy_profile
- persona_interview_profile
- persona_reading_experience_profile

Decision rules:
- never ask the user to select persona first in premium mode
- use JD signals to override weak or inflated title signals
- mark mixed_role_flag when two role families have credible first-order claims on the mandate
- downgrade confidence when title and JD disagree materially
- suppress the secondary persona when it adds noise, weakens retrieval precision, or comes only from collaboration language
- keep one seniority interpretation even when persona is blended

#### Stage 0.6 — Blended persona resolution
Purpose:
Convert raw mixed-role signals into one controlled canonical persona package.

Tasks:
- decide whether blended mode is justified or should be suppressed
- assign primary and secondary persona weights
- merge mandatory, preferred, and optional source classes conservatively
- define one reading-experience spine anchored to the primary persona
- define where the secondary persona may alter ordering, emphasis, interview themes, and objections
- record suppression reasons when a candidate secondary persona is rejected

Outputs:
- persona_weighting: primary_weight, secondary_weight
- blended_mode_justification
- suppressed_secondary_persona_reason
- canonical_persona_package

Hard rules:
- never blend more than two role families at once
- never create separate report modes for the blended persona
- never widen retrieval breadth unless the secondary persona materially changes strategy or interview synthesis

#### Stage 1 — Source acquisition planner
Purpose:
Generate a source plan before fetching content.

Tasks:
- identify whether company is public or private
- infer likely source classes needed for company strategy, role strategy, candidate-fit, and interview prep
- condition source plan on persona_profile and persona_retrieval_profile
- enumerate target domains
- prioritize primary sources first
- define retrieval depth per source class
- create section-to-source dependency map
- decide whether competitor retrieval is mandatory
- identify target product surfaces named in the JD or implied by the role
- identify likely leadership-commentary sources
- identify whether filings extraction is mandatory
- identify persona-specific product surfaces, technical surfaces, operating surfaces, or go-to-market surfaces
- identify persona-specific interviewer-context sources
- identify whether a secondary persona branch should widen retrieval or remain suppressed

Outputs:
- source plan
- fetch queue
- evidence requirements by section
- section dependency graph
- targeted re-retrieval triggers
- persona-conditioned section dependency graph
- persona branch decision log

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
- persona-specific retrieval branches:
	- engineering / technical branch
	- product / strategy branch
	- design / experience branch
	- data / ML / experimentation branch
	- GTM / marketing / revenue branch
	- operations / program / governance branch
	- executive / portfolio / org-design branch
	- secondary persona branch only when blended_mode_justification passes threshold

Outputs:
- raw HTML / text / PDFs
- source metadata
- freshness metadata
- fetch logs
- retrieval cost events
- persona retrieval branch logs

Competitor retrieval is mandatory when:
- the company operates in a clearly contested category
- the role is strategy, growth, platform, monetization, AI, marketplace, or ecosystem adjacent
- competitor moves are plausibly part of the why-now thesis

Do not bloat the report with low-value external noise:
- reject broad press aggregation without role relevance
- reject listicles and SEO summaries
- reject external content that adds no incremental strategic signal

Persona-specific source priorities:
- Product: investor materials, launches, product surfaces, monetization, strategy commentary, competitor positioning
- Engineering: engineering blogs, architecture docs, developer docs, reliability and security materials, OSS, scale clues
- Design: product surfaces, design system clues, UX and research signals, experience-quality evidence
- Data / ML: experimentation materials, model or platform docs, AI launches, data strategy and measurement maturity signals
- Product Marketing / Marketing: messaging, segmentation, launches, pricing, customer evidence, analyst narratives
- Sales / GTM / Partnerships: customer segments, sales motion, partner ecosystem, enablement, buyer-journey signals
- Operations / Program / BizOps: governance, execution model, operating cadence, transformation scope, process maturity signals
- Executive / GM / VP / C-level: business model, portfolio strategy, leadership commentary, investor materials, org-design clues

Seniority overlays:
- IC and senior IC: prioritize direct execution context and domain depth
- staff / principal / architect: prioritize architecture, cross-system, and leverage evidence
- manager: prioritize team leadership, delivery cadence, and hiring signals
- director and above: prioritize leadership commentary, stakeholder power, strategy tradeoffs, and org design
- executive / GM / C-level: investor materials and leadership interviews become mandatory

Blended retrieval rules:
- inherit the full mandatory set from the primary persona
- add only the strategy-critical mandatory classes from the secondary persona
- do not expand preferred or optional classes for the secondary persona unless the primary mandatory set is already satisfied
- cap secondary-branch retrieval when persona_confidence is low or the secondary persona only changes vocabulary, not mandate

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
- persona-relevant source tags usable by later synthesis

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
- persona clues:
	- role-family evidence
	- seniority evidence
	- sub-specialization evidence
	- proof-expectation evidence
	- stakeholder-power evidence
	- loop-shape evidence

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
- build persona evidence clusters
- build persona-specific proof-model clusters
- build blended-persona contradiction clusters

Outputs:
- normalized evidence graph
- evidence clusters
- source coverage report
- persona coverage report
- blended coherence report

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
- detect likely wrong-persona selection from conflicting evidence
- detect role-family mismatch between source mix and inferred persona
- detect seniority mismatch between title, scope language, and generated proof expectations
- detect when the secondary persona is adding noise instead of explanatory power
- detect when blended retrieval breadth is out of proportion to the evidence

Recommended model tier:
- strong reasoning model

Decision rule:
- if company strategy, competitor analysis, role strategy, or interview-prep sections fail evidence threshold, run targeted re-retrieval once before suppression
- if persona confidence is low or contradictory evidence emerges, run one persona re-check before downstream synthesis
- if the secondary persona remains weak after re-check, suppress it before final synthesis and revert to single-persona composition

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
- adapt interpretation to persona and seniority
- never force Product-centric framing onto non-Product roles
- in blended mode, keep one strategic thesis and let the secondary persona alter only the sections where it materially changes leverage, timing, or proof expectations

Persona interpretation examples:
- Product: emphasize value creation, prioritization, leverage, experimentation, monetization, and roadmap power
- Engineering: emphasize constraints, architecture, quality, reliability, platform leverage, and execution realism
- Design: emphasize experience quality, craft standards, systems thinking, user empathy, and influence
- Data / ML: emphasize data flywheel, experimentation, model quality, decision loops, and measurement trust
- Marketing: emphasize segmentation, messaging, launch mechanics, differentiation, and packaging
- Sales / GTM: emphasize revenue motion, buyer pain, channel dynamics, and partner leverage
- Operations / Program: emphasize orchestration, governance, dependency risk, and operating leverage
- Executive: emphasize business model, portfolio choices, org design, capability building, and P&L context

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

Persona-conditioned synthesis requirements:
- stakeholder maps must change by function
- proof expectations must change by function and level
- success metrics must change by function and level
- what would impress the hiring team must map to persona-specific proof, not generic leadership language
- blended roles must not receive two disconnected role theses; produce one role thesis with merged leverage and merged failure modes

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

Persona-conditioned framework requirements:
- Engineering: system design, architecture, reliability, and technical-leadership frameworks
- Product: product sense, strategy, prioritization, metrics, and business-judgment frameworks
- Design: portfolio, critique, systems thinking, collaboration, and craft frameworks
- Data / ML: modeling judgment, experimentation, productionization, and business-interpretation frameworks
- Product Marketing / Marketing: segmentation, messaging, launch, adoption, and packaging frameworks
- Sales / GTM / Partnerships: revenue motion, customer strategy, objections, partnerships, and execution frameworks
- Operations / Program / BizOps: governance, dependency management, operating cadence, and risk frameworks
- Executive / GM / VP / C-level: portfolio, org design, leadership narrative, business model, and executive-communication frameworks

Seniority overlays:
- IC roles: depth and execution proof dominate
- manager roles: delivery-through-others and coaching proof dominate
- director roles: prioritization, strategy-to-execution, and stakeholder-power proof dominate
- executive roles: business outcomes, org design, and enterprise judgment dominate

Blended interview rules:
- primary persona determines the default interviewer agenda and question families
- secondary persona may add objections, proof expectations, and question categories only when likely to appear in the actual loop
- mock questions must remain coherent and role-relevant; do not alternate randomly across functions

Recommended model tier:
- strongest reasoning model

#### Stage 11 — Final report composition
Purpose:
Compose skimmable and deep-prep layers without repetition.

Composition rules:
- company strategy and role strategy must stay central, not buried
- interview prep must feel like a premium suite, not an appendix
- style compression is allowed only after strategic depth is locked in
- section order, labels, depth, and summaries must adapt to persona_profile
- 5-minute brief composition must adapt to role family and seniority
- low-value sections for a persona must be compressed or suppressed
- the report remains one canonical report even when persona is blended
- primary persona controls the report spine; secondary persona changes emphasis, not product identity
- composition must honor release_mode and section showability instead of assuming a single rendering path
- in inference-visible mode, every shown section must render evidence, quality, and confidence labeling plus any warning or missing-evidence note
- weak but showable sections must separate what is known from what is inferred
- critical weak sections must prepend a stronger warning banner and a short explanation of what evidence is missing

Recommended model tier:
- strongest reasoning model or executive writing model

#### Stage 11.5 — Section transparency composition
Purpose:
Convert audit outputs into user-visible labels, warnings, and explanation blocks.

Tasks:
- assign evidence_state, quality_state, confidence_state, and release_note for every section
- generate section_warning_note for weak or inferred sections
- generate section_missing_evidence_note describing what evidence would materially strengthen the section
- decide whether a section is shown, collapsed, de-emphasized, or suppressed in inference-visible mode
- decide which sections require strong warning banners

Outputs:
- section transparency objects
- section warning notes
- section missing-evidence notes
- section showability map for inference-visible mode

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
- wrong-persona symptoms
- Product-centric framing leakage into non-Product reports
- seniority-proof mismatch
- mixed-role handling correctness
- secondary-persona suppression correctness
- blended-persona coherence across ordering, strategy, and interview prep
- inference-visible showability correctness
- weak-but-useful versus too-weak-to-show classification
- warning-strength correctness for critical sections

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
- persona profile to determine strategic lens and required detail

Role strategy depends on:
- JD
- company strategy evidence clusters
- related roles, team pages, leadership bios, or product-surface docs when available
- persona-specific stakeholder and proof models

Interview prep depends on:
- company strategy
- role strategy
- candidate profile for personalization
- interviewer-agenda synthesis and story mapping
- persona_interview_framework and persona_reading_experience_template

### 4.1 Persona-conditioned section unlocking
Mandatory source classes by persona:
- Engineering staff-plus: exact JD, engineering/architecture sources, platform docs, role-context sources, leadership commentary
- Product director-plus: exact JD, investor or leadership materials, launches, product surfaces, competitor context
- Design roles: exact JD, product surfaces, design-system or experience evidence, collaboration-context sources
- Data / ML roles: exact JD, model/data/platform evidence, experimentation materials, business-context sources
- PMM / Marketing roles: exact JD, messaging and launch sources, pricing or packaging, customer evidence
- Sales / GTM roles: exact JD, customer segment and sales-motion sources, partner ecosystem, revenue-context sources
- Operations / Program roles: exact JD, governance and execution-model sources, operating-context sources, stakeholder evidence
- Executive / GM roles: exact JD, investor materials, leadership commentary, portfolio and org-design signals

Sections unlocked by stronger persona retrieval:
- technical context and system leverage
- design influence and craft expectations
- data/ML decision loops and measurement quality
- GTM motion and segmentation insight
- operating cadence and governance analysis
- portfolio mandate and org-design interpretation

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
- persona-specific mandatory source classes are missing
- generated proof expectations do not match inferred seniority
- mixed-role handling requires a secondary retrieval branch

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
- persona inference results keyed by normalized title plus JD hash
- persona-specific retrieval profiles
- persona-specific source-plan templates

Never trust stale cache blindly for:
- latest earnings / quarter changes
- org changes
- very recent product launches
- role-specific active strategic themes
- persona classification when the JD changed materially

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
- persona branch used
- persona-conditioned deepening cost
- persona QA outcomes

Persona telemetry to capture:
- inferred_primary_role_family
- inferred_secondary_role_family
- is_blended_persona
- inferred_seniority
- inferred_subspecialization
- persona_confidence
- persona_reasoning_trace_summary
- persona_retrieval_profile
- persona_strategy_profile
- persona_interview_profile
- persona_reading_experience_profile
- persona_inference_cost
- blended_retrieval_incremental_cost
- persona_specific_synthesis_incremental_cost
- release_mode
- report_override_available
- report_override_used
- inference_visible_sections_count
- suppressed_sections_count
- critical_sections_with_strong_warnings

### 8.1 Release-mode decision policy
The release gate now decides among four user-facing outcomes:
- premium_full: strongest state; full report is premium-approved
- inference_visible_full: full report is shown with explicit labels and warnings; not premium-approved
- partial: only approved sections are shown
- blocked: nothing user-facing is shown beyond the failure state

Prefer inference_visible_full over partial when:
- the report is broadly coherent
- the main risk is evidence weakness, missing depth, or incomplete support
- the user still benefits from seeing the full analytical structure
- uncertainty can be communicated clearly section by section

Prefer partial when:
- several sections are too weak to be useful even with warnings
- too much of the full report would become low-value speculation
- suppression produces a meaningfully stronger experience than warning-heavy full display

Block when:
- persona inference is too unreliable
- blended-persona coherence fails badly
- contradictions are severe and unresolved
- critical sections contain too many unsupported claims

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
11. Persona inference that misclassifies function or level and poisons all downstream sections
12. Reports that preserve one Product-centric section order or proof model across personas
13. Inference-visible mode used as a loophole for polished nonsense
14. Weak sections shown without saying what is known, inferred, and missing
15. Critical sections missing strong warning banners despite weak evidence

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
- persona inference and persona-conditioned retrieval branches

### 11. Persona QA and wrong-persona detection
Tests:
- title plus JD benchmark set across all supported role families and seniority bands
- adversarial cases with inflated titles, mixed roles, and ambiguous scope
- regression set ensuring Product-centric framing does not leak into other families
- section-order regression tests by persona
- proof-expectation regression tests by level

Wrong-persona indicators:
- generated sections emphasize metrics and roadmap power for a clearly engineering or design role
- generated interviewer loops omit system design for engineering or critique for design
- generated stakeholder maps omit core function-specific partners
- generated proof standards mismatch authority level
- the secondary persona creates extra breadth without changing the report's actual judgments

Validation rules for persona quality:
- validate the inferred_primary_role_family against owned responsibilities, not just nouns in the title
- validate inferred_seniority against scope, stakeholder power, and proof expectations
- validate inferred_secondary_role_family only when it changes retrieval, strategy synthesis, and interview synthesis in a defensible way
- reject blended mode when it produces generic mush, duplicate sections, or diluted interview prep

Fallback handling:
- blend two personas only when both are evidenced and strategically material
- otherwise pick the dominant persona, lower confidence, and show uncertainty in metadata and unknowns
- if the secondary persona adds noise, suppress it before final composition and record the reason in telemetry and QA

### 12. Quality, depth, and release-control pipeline patch
The premium pipeline must include a distinct audit and release-control plane after synthesis and before rendering. Generation alone is not release.

#### 12.1 Audit stages and placement
Added stages:
- Stage 2.5 source quality assessment
- Stage 5.5 evidence coverage audit
- Stage 6.1 company-context audit
- Stage 6.2 strategy-depth audit
- Stage 6.3 persona-correctness audit
- Stage 6.4 interview-prep usefulness audit
- Stage 6.5 depth and insight-density audit
- Stage 6.6 coherence and redundancy audit
- Stage 6.7 section-state and labeling consolidation
- Stage 6.75 weak-section explanation and missing-evidence generation
- Stage 6.8 final release gate
- Stage 6.9 prompt-improvement feedback capture

Audit placement matrix:
- source quality assessment runs immediately after fetch, parse, and source classification
- evidence coverage audit runs after evidence extraction and normalization
- company-context, strategy-depth, persona, interview-prep, depth, and coherence audits run after the first synthesis pass and again after any targeted repair loop
- section-state and labeling consolidation runs before release decision
- weak-section explanation and missing-evidence generation runs after labeling and before composition
- final release gate runs before rendering and persistence to user-visible surfaces
- prompt-improvement feedback capture runs after release decision so it can see first-pass quality, repair actions, and final outcome together

#### 12.2 Inputs, outputs, and remediation by audit
Stage 2.5 source quality assessment:
- inputs: source metadata, source classification, freshness metadata, source plan, persona profile
- outputs: source_quality_score, primary_source_coverage, freshness_summary, role_relevance_summary, weak_source_flags
- remediation: targeted re-retrieval, source-plan adjustment, primary-source requirement escalation

Stage 5.5 evidence coverage audit:
- inputs: normalized evidence objects, section dependency graph, contradiction set, evidence thresholds
- outputs: evidence_quality_score, section_evidence_coverage, unsupported_claim_risk, contradiction_summary, section evidence states
- remediation: targeted retrieval, section suppression recommendation, contradiction-sensitive re-synthesis

Stage 6.1 company-context audit:
- inputs: company-context draft blocks, source bundle, section evidence states, persona profile
- outputs: company_context_score, subsection scores for insights, history, mission, values, culture, employee reviews, suppression recommendations
- remediation: company-context re-retrieval, subsection suppression, stronger interpretation pass

Stage 6.2 strategy-depth audit:
- inputs: company strategy, competitor analysis, role strategy, role-context evidence, persona profile
- outputs: strategy_depth_score, per-block depth scores, shallow-pattern flags, tradeoff-coverage summary
- remediation: stronger reasoning pass, competitor retrieval, mandate-focused resynthesis

Stage 6.3 persona-correctness audit:
- inputs: persona inference package, report ordering, section emphasis, interview-prep blocks
- outputs: persona_accuracy_score, blended_coherence_score, wrong_persona_flags, seniority_alignment_flags
- remediation: persona recheck, blended-persona suppression, persona-conditioned resynthesis

Stage 6.4 interview-prep usefulness audit:
- inputs: interviewer agenda map, objections, mock questions, story mapping, how-to-win section, persona package
- outputs: interview_prep_score, interviewer-specificity_score, proof-clarity_score, genericity_flags
- remediation: interview-prep repair loop on stronger model

Stage 6.5 depth and insight-density audit:
- inputs: all major sections, evidence states, prior audit outputs
- outputs: depth_score, insight_density_score, second_order_reasoning_flags, checklist_output_flags
- remediation: depth repair loop, suppression of shallow blocks, partial-release recommendation

Stage 6.6 coherence and redundancy audit:
- inputs: full draft, section summaries, claim graph, blended-persona package
- outputs: coherence_score, redundancy_score, contradiction_crosscheck, repeated-claim map
- remediation: redundancy compression pass, claim dedupe pass, blended-thesis rewrite

Stage 6.7 section-state and labeling consolidation:
- inputs: all audit outputs
- outputs: section_state objects with approved, weak, suppress, rerun plus evidence_state, quality_state, confidence_state, and show_in_inference_visible_mode
- remediation: targeted suppression and release-plan update

Stage 6.75 weak-section explanation and missing-evidence generation:
- inputs: labeled section states, unsupported-claim summaries, contradiction summaries, missing-source summaries
- outputs: section_warning_note, section_missing_evidence_note, strong_warning_required
- remediation: tighten warning copy, suppress non-useful weak sections, downgrade release mode

Stage 6.8 final release gate:
- inputs: all scores, labeled section states, warning flags, repair history, budget posture, strong-warning map
- outputs: approved, approved_with_warnings, inference_visible_full, partial, reretrieve, resynthesize, depth_repair, prompt_improvement_recommended, blocked
- remediation: render, render with warnings, partial render, repair loop, or hard block

Stage 6.9 prompt-improvement feedback capture:
- inputs: first-pass audits, final audits, release decision, cost deltas, repeated-failure history
- outputs: prompt_improvement_recommendations, systemic_failure_tags, one_off_failure_tags
- remediation: logged recommendation, human-review trigger, or controlled prompt backlog item

### 13. Structured score objects and audit contracts
Every audit stage must emit structured objects rather than prose-only judgments.

Core audit bundle:
```json
{
	"run_id": "uuid",
	"scores": {
		"overall_quality": 0,
		"source_quality": 0,
		"evidence_quality": 0,
		"strategy_depth": 0,
		"company_context": 0,
		"persona_accuracy": 0,
		"interview_prep": 0,
		"coherence": 0,
		"actionability": 0,
		"premium_polish": 0,
		"depth": 0,
		"readiness_to_release": 0
	},
	"section_states": {
		"decision_memo": "approved|weak|suppress|rerun",
		"five_minute_brief": "approved|weak|suppress|rerun",
		"company_context": "approved|weak|suppress|rerun",
		"company_role_strategy": "approved|weak|suppress|rerun",
		"candidate_fit": "approved|weak|suppress|rerun",
		"interview_prep": "approved|weak|suppress|rerun",
		"how_to_win_this_process": "approved|weak|suppress|rerun",
		"credibility_layer": "approved|weak|suppress|rerun"
	},
	"section_labels": {
		"decision_memo": {
			"evidence_state": "VERIFIED_FACT|CITED_SYNTHESIS|MIXED|INFERRED|LOW_EVIDENCE|SUPPRESSED|NOT_SHOWN_DUE_TO_BLOCK",
			"quality_state": "premium_ready|usable_with_caution|below_premium_threshold|exploratory_only",
			"confidence_state": "high|medium|low",
			"show_in_inference_visible_mode": true,
			"strong_warning_required": false
		}
	},
	"release_mode": "premium_full|inference_visible_full|partial|blocked",
	"report_override_available": false,
	"warning_flags": ["string"],
	"blocked_release_reasons": ["string"],
	"recommended_actions": ["suppress_section|reretrieve|resynthesize|depth_repair|block_release"],
	"prompt_improvement_candidates": ["string"]
}
```

Requirements:
- deterministic checks must emit machine-readable flags
- model-based audits must emit scores plus evidence-linked explanations
- release gate consumes objects, not free-form evaluator praise

### 14. Deterministic, model-based, and hybrid checks
Deterministic checks:
- source freshness
- primary-source presence by section
- citation density and citation presence
- section coverage against required schema
- repeated n-gram and repeated-claim detection
- unresolved unsupported-claim markers
- release-state transition count and repair-loop count

Model-based checks:
- company-context usefulness and interpretation quality
- strategic tradeoff depth
- persona fit in narrative and interview logic
- interviewer agenda usefulness
- insight density and second-order reasoning
- prompt-improvement diagnosis

Hybrid checks:
- contradiction handling, where deterministic detection hands contested claims to a model for resolution quality scoring
- section redundancy, where claim overlap is detected deterministically and judged for severity by a model
- employee-review synthesis quality, where deterministic source labeling combines with model-based overreach detection

### 15. Repair loops and stop rules
Targeted repair loops are preferred over full reruns.

Allowed by default in premium mode:
- one targeted re-retrieval loop for missing evidence classes
- one stronger synthesis re-run for shallow but evidence-backed sections
- one depth-repair loop for sections that are accurate but not insightful enough

Stop rules:
- stop when a repair loop is unlikely to lift the affected dimension above threshold
- stop when incremental repair cost exceeds expected quality uplift
- stop and release partial when trustworthy sections remain useful and weak sections can be honestly suppressed
- stop and block when critical sections remain unreliable or shallow after allowed repair loops

Expected uplift heuristic:
- retrieval repair is worth the cost when a missing mandatory evidence class is the clear bottleneck
- synthesis repair is worth the cost when evidence already exists and the first pass was generic
- depth repair is worth the cost when the report is accurate but not yet premium
- prompt-improvement analysis is worth the cost when the same failure mode appears repeatedly across runs or personas

### 16. Prompt-improvement feedback loop
Repeated audit failures must update prompt guidance over time through a controlled mechanism.

Prompt-improvement trigger conditions:
- same failure mode appears across multiple runs for the same role family or seniority cluster
- repair loops repeatedly rescue the same section type
- blocked or partial releases cluster around the same prompt weakness
- high spend repeatedly produces low-quality first passes

Prompt-improvement output classes:
- retrieval-instruction weakness
- synthesis-instruction weakness
- section-writing weakness
- evaluation-instruction weakness
- persona-instruction weakness
- company-context-instruction weakness

Governance rules:
- log recommendations by prompt component and failure pattern
- do not auto-apply prompt changes directly from one run
- require benchmark validation before promotion into the master prompt
- cap prompt complexity growth unless measured quality uplift is positive

### 17. Quality testing and continuous upgrade operations
The pipeline must support continuous quality testing beyond single-run audits.

Testing framework requirements:
- content-quality benchmark set across role families, seniority levels, and blended personas
- company-context benchmark set with known history, mission, values, and culture signal richness
- persona-specific interview-prep tests
- blended-persona coherence tests
- regression tests for prompt changes

Human review triggers:
- release blocks on benchmark runs
- repeated evaluator disagreement on the same report family
- rising partial-release rate for a persona cluster
- employee-review synthesis becoming noisy or over-weighted

The pipeline must be able to answer over time:
- are reports improving
- which personas or sections underperform
- whether company-context quality is improving
- whether repair-loop spend is producing quality uplift
- whether prompt changes help or hurt

### 18. Premium narrative brief retrieval and composition correction
This correction restores company depth, modular richness, and editorial reading flow without weakening evidence hygiene or release gating.

#### 18.1 Experience direction lock
Hard requirements for the pipeline:
- the report remains one canonical premium report
- the output must feel like a premium narrative research brief, not a compliance artifact or dashboard-first surface
- modules must increase information density and interpretability, not act as decoration
- official and high-confidence sources remain primary
- lower-confidence public sentiment sources are allowed only as clearly labeled supporting texture
- the gate must preserve useful richness when honestly labeled instead of flattening the report into thin prose

#### 18.2 Retrieval expansion for richer company intelligence
The retrieval planner must explicitly support the following source classes.

| Source class | Trust level | Freshness importance | Status | Sections unlocked | Noise-control rule | Contradiction handling |
|---|---|---|---|---|---|---|
| About / company overview pages | High | Medium | Primary | Company snapshot, mission context, company basics | Prefer first-party overview pages, avoid SEO mirrors | Prefer official framing for company basics |
| Mission / values / leadership-principles pages | High for stated values, medium for lived reality | Medium | Primary | Mission, values, culture, candidate implications | Ignore empty employer-brand pages with no operating language | Compare with careers, leadership commentary, and sentiment before implying lived reality |
| Leadership team / exec bios | High | Medium | Primary | Leadership context, strategic priorities, stakeholder implications | Prefer current company-hosted bios and recent interviews | Reconcile biography claims with current business moves |
| Culture pages / careers pages | Medium-high | Medium | Preferred | Work culture, ways of working, candidate implications | Retain only concrete operating-language pages | Merge with leadership commentary and sentiment carefully |
| Investor relations / annual reports / shareholder letters | High | High when public | Primary when available | Business model, priorities, momentum, market context | Prioritize recent filings and shareholder materials over commentary about them | Treat these as primary evidence on business priorities |
| Official history pages or timeline sources | High when official, medium when reputable external | Low-medium | Preferred | History / evolution timeline | Keep only milestone-oriented sources with dates or inflection points | Resolve date/order conflicts conservatively |
| Newsroom / launches / recent announcements | High when official | High | Primary | Momentum signals, recent moves, product context | Filter for role-relevant launches or strategic moves | Cross-check hype claims against broader context |
| Product docs / platform docs / solution pages | High | Medium-high | Primary | Product/platform/portfolio context, role relevance | Prefer workflow or architecture pages over marketing copy | Use docs for mechanics, not broad strategy claims alone |
| Engineering / design / product blogs | Medium-high | Medium | Preferred | Culture, quality bar, technical/design maturity, operating clues | Keep only posts with enduring operating signal | Separate aspirational storytelling from implemented practice |
| Leadership interviews / talks / podcasts | Medium-high | Medium-high | Preferred | Leadership context, priorities, tensions, hiring rationale | Prefer current interviews tied to strategic priorities | Distinguish quotable framing from confirmed operating change |
| Employee review and sentiment sources | Low-medium | Medium | Optional lower-confidence supplement | Employee sentiment synthesis, candidate-prep texture, interview texture | Require multiple patterns across multiple platforms before synthesis | Never override official evidence on strategic truths; label disagreement explicitly |
| Competitor pages and competitor announcements | Medium-high | Medium-high | Preferred or primary when competitor analysis is required | Competitor matrix, market pressure, differentiation | Keep only category-relevant competitors and substitutes | Compare company claims against competitor evidence directly |
| Reputable third-party company explainers | Medium | Medium | Optional | Snapshot, history, market context | Use only when they add context not already available in stronger sources | Downgrade claims that cannot be traced to stronger sources |

Additional retrieval rules:
- about, mission, values, leadership, careers, newsroom, and product-surface retrieval should be explicit planner targets rather than opportunistic finds
- history retrieval is worth doing when company evolution, recent pivots, acquisitions, or platform transitions plausibly affect role context
- leadership-interview retrieval is worth doing when strategic priorities, cultural signals, or mandate timing remain unclear after official page retrieval
- competitor retrieval should populate both prose synthesis and a structured matrix payload when competition is materially relevant

#### 18.3 Sentiment retrieval policy
Sentiment retrieval is worth it when:
- official sources are polished but the candidate would benefit from clues about operating reality, work cadence, interview tone, or management texture
- multiple low-confidence sources exist and can be synthesized into recurring patterns
- the role is senior enough that culture, leadership, and operating style materially affect the pursuit decision

Sentiment retrieval should be skipped when:
- the role or company has too little public sentiment to synthesize meaningfully
- only one platform or one anecdotal thread is available
- the retrieval budget is tight and stronger primary source classes are still unsatisfied
- the company is so small or so noisy that sentiment would mostly amplify random anecdotes

Too little sentiment evidence exists to say anything useful when:
- fewer than two distinct platforms or source clusters are available
- themes are highly contradictory and cannot be bounded honestly
- the only available content is stale, extremely location-specific, or interview-rant-heavy without recurring patterns

Responsible merge rules for official and unofficial cultural evidence:
- official sources define stated values, explicit principles, and formal culture claims
- unofficial sources can pressure-test whether recurring operating themes appear consistent, overstated, or contested
- if official and unofficial signals diverge, the synthesis must present the gap as a tension or question to validate, not a settled contradiction
- employee sentiment may enrich the candidate-prep layer even when it is too weak to materially influence the core recommendation

#### 18.4 Structured data products for module-aware rendering
The pipeline should emit structured intermediate objects that support rich modules, not prose alone.

Required structured payloads when evidence permits:
- company_snapshot_cards
- company_timeline_events
- leadership_context_cards
- values_culture_signals
- employee_sentiment_patterns
- competitor_matrix_rows
- strategic_tension_pairs
- momentum_signal_cards
- role_leverage_map
- stakeholder_map_nodes
- risks_unknowns_grid
- interviewer_agenda_cards
- story_map_cards
- question_bank_groups

Rules:
- each payload must include citations or source references at the item level when practical
- structured payloads may be partially populated; absence of one module must not collapse the whole report
- do not fabricate row completeness just to satisfy a visual layout

#### 18.5 Module-aware composition stage
Add a composition concern between synthesis and final rendering.

Module planning tasks:
- choose the narrative spine for the inferred persona and seniority
- decide which modules support skim reading versus deep reading
- convert evidence clusters into the smallest useful set of modules rather than long monolithic prose sections
- ensure each major company-intelligence subsection ends in a candidate implication
- attach warning banners, evidence chips, and show-evidence drawers to mixed or low-evidence modules

Composition outputs:
- narrative_brief_outline
- module_plan
- section_to_module_map
- module_density_summary
- skim_layer_summary
- deep_layer_summary

Stage behavior:
- 5-minute brief should favor decision memo, hero strip, key insight chips, top tensions, agenda cards, and the shortest viable evidence legend
- full report should retain the same narrative spine but expand company modules, stakeholder modules, competitor matrix, story maps, and evidence drawers
- credibility and quality context should remain attached to modules instead of being isolated in one distant appendix

#### 18.6 Richness-aware audit and release logic
The quality gate must distinguish useful richness from decorative noise.

Audit guidance:
- reward editorial modules that sharpen interpretation and increase information density
- do not penalize company history, values, culture, or sentiment modules merely because they are mixed-confidence if they are honest and helpful
- penalize modules that look polished but add no consequence, no decision value, or no real evidence boundary
- require that lower-confidence sentiment remain subordinate to official and high-confidence company evidence

Release logic:
- premium_full may retain company history, culture, leadership, tension, timeline, and momentum modules when evidence is strong enough and the interpretation is sharp
- inference_visible_full may retain mixed-confidence culture and sentiment modules when they are clearly labeled, bounded, and still useful
- downgrade modules that are informative but uncertain instead of automatically suppressing them
- suppress only modules that are anecdotal, generic, misleading, repetitive, or too thin to improve candidate judgment

#### 18.7 Retrieval and telemetry implications
The pipeline should record enough telemetry to understand whether the richness patch is working.

Track at minimum:
- how many company-context source classes were satisfied
- whether history, values, culture, leadership, momentum, and sentiment retrieval each produced usable evidence
- whether competitor matrix and timeline payloads were generated
- which module types were rendered in the 5-minute brief versus full report
- whether sentiment remained supporting texture or improperly dominated cultural synthesis

### 19. Wrong-archetype prevention corrective patch
This patch addresses a high-severity failure class: a wrong role archetype is inferred early, then used to pick the wrong evaluation bar, wrong fit logic, wrong section logic, and wrong interview-prep logic.

#### 19.1 New pre-synthesis sanity stages
Add the following mandatory stages before final synthesis release:

Stage 0.55 — Persona plausibility audit
- inputs: role title, JD, resume, initial persona package
- task: test whether the inferred persona is actually plausible for the JD
- required checks:
	- does Product versus Engineering versus Executive mapping fit the owned decisions in the JD
	- is leadership language being over-read as executive scope
	- is people-management evidence actually present
	- is the role better explained as senior technical PM than executive or engineering
- outputs:
	- persona_plausibility_score
	- persona_misclassification_flags
	- executive_scope_overread_flag
	- engineering_conversion_flag
	- corrected_persona_candidate
- remediation:
	- trigger persona correction before retrieval deepens

Stage 0.65 — Evaluation-bar selection
- inputs: corrected persona candidate, JD, resume
- task: choose the comparison bar used for fit scoring
- hard rules:
	- do not compare against a hypothetical domain-native specialist unless the JD requires that bar
	- separate direct domain fit from transferable PM leadership fit
	- treat preferred experience as a softener, not an automatic hard gate, unless the JD makes it central and non-transferable
- outputs:
	- evaluation_bar_profile
	- transferable_fit_allowed
	- domain_specialist_bar_active
	- fit_dimension_weights

#### 19.2 Fit-rescoring pipeline
Add a dedicated candidate-fit scoring stage that runs after persona correction and evaluation-bar selection.

Stage 8.5 — Fit scoring and rescoring
- required dimensions:
	- core_pm_leadership_fit
	- technical_fluency_fit
	- domain_adjacency_fit
	- scale_complexity_fit
	- cross_functional_fit
	- people_leadership_fit
	- trust_privacy_compliance_adjacency_fit
	- direct_domain_specialist_fit
- required outputs:
	- fit_dimension_scores
	- fit_weight_profile
	- overall_fit_score
	- hard_gaps
	- bridgeable_gaps
	- overblown_gaps
	- transferability_summary

Rescoring rule:
- if overall_fit_score is low but transferability_summary remains strong, run one fit rescoring pass before release
- if the system cannot explain why adjacent strengths do not transfer, it must not keep a harsh low-fit score

#### 19.3 Section-category integrity audit
Add Stage 6.35 — Section-category integrity audit
- inputs: generated section rationales, section keys, evidence states
- task: verify that each rationale answers the right question
- required checks:
	- company_momentum is company trajectory, not product-area commentary
	- org_clarity is structural clarity, not role mandate
	- role_leverage is leverage and decision-rights logic, not vague positioning filler
	- execution_risk is execution risk, not guessed interview structure
- outputs:
	- section_category_confusion_flags
	- required_section_regenerations

#### 19.4 Invented-specificity audit
Add Stage 6.45 — Invented-specificity audit
- task: detect unsupported precision in budgets, executive visibility, first-90-day plans, interview-loop structure, policy flow, and architecture claims
- outputs:
	- unsupported_precision_flags
	- inferred_but_unbounded_claims
	- confidence_cap_required
- remediation:
	- strip or relabel the claim
	- regenerate the affected section if the claim is central

#### 19.5 Interview-prep role-family alignment audit
Add Stage 6.55 — Interview-prep alignment audit
- task: verify that interview prep matches the actual job family
- required checks for senior technical PM roles:
	- prep emphasizes PM tradeoffs, privacy/trust judgment, rollout logic, adoption logic, experimentation, and cross-functional influence
	- prep does not over-convert into engineering architecture theater
	- prep does not require fake domain-native mastery
	- how_to_win emphasizes credible bridging rather than domain cosplay
- outputs:
	- interview_prep_role_alignment_score
	- engineering_drift_flag
	- fake_domain_mastery_flag
	- regeneration_required

#### 19.6 Contradiction repair loop
Add Stage 6.85 — Contradiction repair loop
- inputs: persona audit, fit scoring, evidence labels, quality labels, confidence labels, release decision
- required checks:
	- persona QA pass is impossible when persona_misclassification_flags remain active
	- strong evidence labels are impossible when evidence quality is below threshold
	- high confidence is impossible when the inference ratio is too high
	- low fit is impossible when rationale still supports broad transferability
- outputs:
	- contradiction_set
	- contradiction_severity
	- contradiction_repair_actions

Repair order:
1. persona correction
2. evaluation-bar correction
3. fit rescoring
4. section regeneration
5. interview-prep regeneration
6. label reconciliation

Hard rule:
- unresolved contradictions block release

#### 19.7 Release-gate additions
The report sanity audit must run before any release decision.

Required sanity questions:
1. Is the inferred persona plausible from the JD?
2. Is the inferred seniority plausible from the JD?
3. Are section rationales answering the correct question?
4. Is the fit score consistent with the resume and JD evidence?
5. Is interview prep aligned to the actual job family?
6. Are invented specifics leaking into the report?
7. Are evidence, confidence, and quality labels internally consistent?

If any fail, trigger:
- persona correction
- section regeneration
- fit rescoring
- interview-prep regeneration
- contradiction repair

#### 19.8 Telemetry additions
Track only the minimum telemetry needed to monitor this failure class:
- persona_correction_reruns
- fit_rescoring_reruns
- contradiction_repair_loops
- executive_scope_overread_flag
- engineering_drift_flag
- domain_specialist_bar_active

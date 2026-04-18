# report_generation_spec.md

## Premium Interview Intelligence Report — Generation Spec

### 1. Product objective
Generate a premium, decision-grade interview preparation report that is persona-adaptive across role family and seniority. The report must optimize for:
- grounded insight
- trust and traceability
- candidate decision quality
- interview readiness
- cumulative, non-redundant content
- persona-specific usefulness

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
- Do not fill empty sections with generic product, engineering, design, marketing, sales, operations, or executive advice.
- Mark unknowns explicitly.
- Hide sections that fail the minimum evidence bar.

### 2.1 Persona-adaptive requirement
Persona adaptation is mandatory for premium mode.

Hard system constraints:
- one canonical report, not separate named report modes or persona SKUs
- persona-specific ordering, emphasis, and analysis depth must happen inside that canonical report
- persona must be inferred automatically from the title plus JD, never manually selected
- persona must include a primary role family, an optional secondary role family when blended, inferred seniority, and optional sub-specialization
- mixed roles must produce blended analysis, blended retrieval, blended interview prep, and a blended reading experience
- company-type adaptation is out of scope for this phase
- persona adaptation must make the report feel materially different across roles without fragmenting the product into separate products

The report must infer, store, and use:
- inferred role family
- inferred seniority band
- inferred sub-specialization when supportable
- persona-specific retrieval profile
- persona-specific interview framework
- persona-specific reading experience template

Premium outputs fail if they behave like a single Product-centric report with renamed section headers.

Reject outputs that exhibit any of the following:
- one shared interview-prep model reused across functions
- one shared section order reused across functions
- one shared proof model reused across IC, manager, director, and executive roles
- stakeholder maps that ignore function-specific partners and power centers
- interview loops that ignore function-specific interviewer types
- objections that could apply to any candidate in any function
- mock questions that ignore functional craft and level-specific proof

Why one canonical report remains the right product choice:
- it preserves one premium product identity instead of forcing users to choose between artificial modes they cannot confidently distinguish upfront
- it lets company strategy, role strategy, competitor analysis, and interview prep remain shared premium pillars while changing their ordering and weight by persona
- it reduces UX fragmentation, prompt fragmentation, QA fragmentation, and telemetry fragmentation

Why persona-specific emphasis is sufficient to create differentiated experience:
- the same core report can feel materially different when the first five minutes, section order, proof model, stakeholder framing, objections, and mock questions change by function and level
- candidates do not need different report brands; they need different analysis depth, different sequencing, and different interview logic
- premium value comes from better interpretation and prioritization, not from multiplying report shells

What goes wrong if the system forces one dominant persona on a blended role:
- retrieval narrows too early and misses core evidence from the secondary function
- role strategy over-explains one mandate and under-explains the actual hiring bar
- objections and mock questions tilt toward the wrong interview loop
- the final reading experience feels incoherent because the JD clearly asks for two kinds of judgment but the report only prepares one

### 2.2 Persona taxonomy
Supported role families in v1:
- Product
- Engineering
- Design
- Data / ML / Applied Science / Analytics
- Product Marketing / Marketing
- Sales / GTM / Partnerships
- Operations / Program / BizOps
- Executive / GM / VP / C-level

Supported seniority bands:
- IC junior / mid
- senior IC
- staff / principal / architect
- manager
- senior manager / group manager
- director
- senior director / VP
- executive / GM / C-level

### 3. Report modes
#### 3.1 5-minute brief
For interview-day skim. Must fit quick consumption and focus on:
- decision memo
- why this role exists now
- what this function and level must prove
- top candidate positioning angle for this persona
- top interviewer concerns for this persona
- top risks / unknowns
- top questions to ask for this function and level
- how to win this specific process

The brief composition must change by persona.
Examples:
- Product: lead with strategy, leverage, metrics, and narrative positioning
- Engineering: lead with architecture, technical mandate, systems leverage, and technical proof expectations
- Design: lead with product experience, design influence, portfolio/craft expectations, and critique themes
- Executive: lead with company strategy, portfolio context, org mandate, stakeholder map, and business leadership proof

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

The full report must not preserve one fixed sequence for every persona. Section ordering, naming, and emphasis must adapt to role family and level.

#### 3.3 Approved premium full release
This is the strongest release state.

Requirements:
- the full report passed premium quality and depth requirements
- critical sections are evidence-backed and internally coherent
- uncertainty is still shown, but the report is broadly premium-ready without special override framing

#### 3.4 Partial release
This is a constrained release state.

Requirements:
- only approved sections are shown
- weak, shallow, or under-supported sections are suppressed
- the user sees the highest-trust subset, not the entire analytical structure

Use partial release when:
- suppressed sections would add more speculation than value
- several weak sections are not useful even with warnings
- preserving trust is more important than preserving coverage

#### 3.5 FULL REPORT (INFERENCE-VISIBLE)
This is a user-facing override viewing mode, not a premium pass state.

Requirements:
- all showable sections are rendered, including weak or inference-heavy sections
- every section must visibly disclose its evidence state, quality state, and confidence state
- weak sections must explain what is known, what is inferred, why the system is uncertain, and what evidence is missing
- the report must not imply premium approval or quietly hide quality weaknesses behind polished prose

Use FULL REPORT (INFERENCE-VISIBLE) when:
- the report is coherent enough to read end to end
- the main failure is evidence weakness, incompleteness, or shallow depth rather than dangerous unreliability
- critical sections remain interpretable if clearly labeled and warned
- the user would still benefit from seeing the full analytical structure

Do not allow FULL REPORT (INFERENCE-VISIBLE) when:
- persona inference is too unreliable
- blended-persona coherence fails badly
- contradictions are severe and unresolved
- critical sections contain unsupported or unsafe claims
- the report is too broken to make warnings sufficient

#### 3.6 Blocked release
Blocked release remains mandatory when the report is too broken or unsafe to show, even with warnings.

Block when:
- critical sections are dominated by unsupported claims
- persona or seniority inference collapses credibility for the rest of the report
- contradictions materially change the likely recommendation or strategy
- the warning system would still leave the user exposed to misleading guidance

### 3.7 Section transparency and labeling contract
Every major section must carry four user-visible fields:
- evidence_state
- quality_state
- confidence_state
- release_note when relevant

Evidence states:
- VERIFIED FACT: directly grounded in primary or highly authoritative source material and presented as fact
- CITED SYNTHESIS: interpretation that combines cited evidence without inventing unsupported specifics
- MIXED: contains both grounded evidence and inference; the boundary must be explicit
- INFERRED: mostly analytic reconstruction from indirect signals rather than direct proof
- LOW EVIDENCE: thin support, weak source quality, or insufficient corroboration
- SUPPRESSED: withheld from the shown report because it failed showability requirements
- NOT SHOWN DUE TO BLOCK: withheld because the overall report is blocked from user display

Quality states:
- Premium-ready: passed premium quality expectations for user-facing release
- Usable with caution: still useful, but requires visible warnings and narrower trust
- Below premium threshold: readable but not premium grade; do not present as validated strategy
- Exploratory only: hypothesis-oriented and low-confidence; show only in inference-visible mode when still useful

Confidence states:
- High confidence: evidence is dense, specific, and internally consistent
- Medium confidence: synthesis is directionally useful but some precision is unsupported
- Low confidence: substantial ambiguity, weak corroboration, or thin direct evidence

Release-note rules:
- include a short release note whenever a section is mixed, inferred, low-evidence, shallow, incomplete, or downgraded below premium threshold
- critical sections must receive stronger release notes than peripheral sections
- release notes must state what is missing, not just that confidence is lower

Critical-section warning requirement:
- decision memo
- role strategy
- company strategy
- interview prep
- how to win

For those critical sections, the visible warning must say:
- what is evidence-backed
- what is inferred
- why the section is weak or uncertain
- what evidence would materially strengthen it

### 3.8 Showability rules in FULL REPORT (INFERENCE-VISIBLE)
For each section, the system must decide:
- whether the section is showable at all
- whether it needs a strong warning banner
- whether it should be visually de-emphasized
- whether it should be collapsed by default
- whether it needs a why-this-is-weak note
- whether it needs a missing-evidence note

Showable weak sections must remain useful. Every weak or inferred section must explicitly contain:
- what is known
- what is inferred
- why the system is uncertain
- what evidence would strengthen the section

Examples of acceptable weak-section copy:
- This role strategy is inferred from JD language and adjacent company context; no direct evidence on org structure or ownership was found.
- These interview-prep themes are plausible but under-supported by company-specific evidence.

Weak sections should usually be:
- shown with labels
- preceded by warning copy
- visually de-emphasized relative to premium-ready sections
- collapsed by default when they are long and low-confidence

Do not show even in inference-visible mode when:
- the section is mainly unsupported assertion
- contradictions are unresolved inside the section
- the section would predict org structure, decision rights, or success metrics without adequate support

### 4. Information architecture
This product is still underpowered in three places if left at the current default depth:
- company strategy is too thin when it stops at summary bullets, weak SWOT, or launch recaps
- role strategy is too thin when it reads like an expanded JD instead of an operating thesis
- interview prep is too weak when it collapses into generic coaching, generic objections, or generic mock questions

Minimum premium depth contract for company-facing strategy sections:
- company_context must usually contain at least 150 words of net-new interpretation when evidence quality is at least partial
- company_role_strategy must usually contain at least 300 words of net-new strategic analysis when evidence quality is at least partial
- company_context must explicitly address vision, mission, and culture when evidence supports them; do not bury them inside generic prose
- company_context should surface culture as operating signals, not as generic employer-brand adjectives
- company_role_strategy must include a current strategy read, not just company background
- company_role_strategy must include SWOT depth with 3 to 5 substantive points each for strengths, weaknesses, opportunities, and threats when evidence supports that level of specificity
- if evidence is too weak to support this depth, the report must say so explicitly and trigger reretrieval, repair, downgrade, or suppression rather than filling space with generic language

Required block expectations for premium full reports:
- company_context should usually contain explicit blocks for Vision And Mission and Culture Signals when evidence exists
- company_role_strategy should usually contain explicit blocks for Current Strategy, SWOT - Strengths, SWOT - Weaknesses, SWOT - Opportunities, and SWOT - Threats
- SWOT bullets must be analytic and role-relevant; avoid generic market platitudes or repeated variants of the same point
- company strategy must explain why the company is prioritizing what it is prioritizing now, what tensions management is balancing, and how that changes the role context for the candidate

It is also underpowered when it stays Product-centric and generic across job families.

Reject outputs that exhibit any of the following persona failures:
- assuming one common interview-prep model across functions
- not tailoring retrieval priorities by role family
- not tailoring company and role strategy interpretation by function
- not tailoring how to win by role family and level
- not changing section ordering based on persona
- not changing proof expectations by role family and level
- not adapting stakeholder maps by function
- not adapting interview loops by function
- not adapting objections by role family
- not adapting mock questions by role family and level

Reject outputs that exhibit any of the following failure modes:
- company strategy that does not explain business model, control points, competitor pressure, and strategic tradeoffs
- role strategy that does not reconstruct mandate, leverage, power, dependencies, and hidden constraints
- interview prep that does not explain how different interviewers think, what they are trying to disprove, and what proof they need
- story guidance that does not map candidate stories to likely interview themes and follow-up traps
- “how to win” guidance that does not explain how to think like the hiring manager

## Layer P — Persona inference and adaptive orchestration
### P1. Persona inference package
Purpose:
- classify role family, seniority, and sub-specialization before retrieval and synthesis

Inputs:
- role title
- full JD text
- required and preferred skills
- reporting expectations
- scope clues
- stakeholder clues
- architecture, design, GTM, research, operational, or business-ownership language
- management vs IC signals
- business ownership signals

Output format:
- inferred_primary_role_family
- inferred_secondary_role_family
- is_blended_persona
- inferred_seniority
- inferred_subspecialization
- persona_confidence
- persona_evidence
- reading_experience_profile
- retrieval_profile
- strategy_profile
- interview_profile
- persona_profile
- persona_reasoning_trace_summary
- ambiguous_persona_reasons

### P2. Role-family taxonomy
Role-family inference must use the following top-level taxonomy:
- Product
- Engineering
- Design
- Data / ML / Applied Science / Analytics
- Product Marketing / Marketing
- Sales / GTM / Partnerships
- Operations / Program / BizOps
- Executive / GM / VP / C-level

Sub-specialization examples:
- Product: platform, consumer, AI/ML, growth, monetization, commerce, enterprise, marketplace
- Engineering: backend, infra, ML platform, application, distributed systems, security, frontend, mobile
- Design: product design, systems design, UX research, content design, design systems
- Data / ML: applied scientist, ML engineer, data scientist, analytics, experimentation, economics
- Product Marketing / Marketing: product marketing, growth marketing, brand, lifecycle, developer marketing
- Sales / GTM / Partnerships: enterprise, mid-market, partnerships, solutions, strategy and ops
- Operations / Program / BizOps: TPM, program management, business operations, strategy, enablement
- Executive / GM / VP / C-level: GM, BU leader, VP Product, VP Eng, CPO, CTO, COO

### P3. Seniority taxonomy
Seniority inference must map roles into one of:
- IC junior / mid
- senior IC
- staff / principal / architect
- manager
- senior manager / group manager
- director
- senior director / VP
- executive / GM / C-level

Inference signals include:
- explicit title markers: senior, staff, principal, head, director, VP, chief, general manager
- management obligations: hiring, coaching, performance, team leadership, succession, org design
- scope markers: company-wide, org-wide, platform-wide, portfolio-wide, P&L, board, multi-region
- proof markers: hands-on craft, independent execution, cross-org leverage, executive communication

### P4. Inference rules and fallback behavior
Rules:
- title alone may seed but never fully determine persona
- JD responsibility language can override ambiguous titles
- reporting and ownership language outweigh cosmetic title inflation
- executive titles require business ownership, org design, or portfolio signals; otherwise downgrade confidence
- staff/principal requires cross-team leverage or architecture/technical-leadership language, not just years of experience
- director and above require prioritization power, organizational leverage, or resource-allocation signals

Confidence model:
- high: title, JD responsibilities, scope, and stakeholder clues align
- medium: title and JD mostly align but scope or authority is weakly evidenced
- low: title and JD conflict, or the role spans multiple families with weak evidence

Blended-persona activation rules:
- default to one primary persona and one seniority interpretation
- allow one optional secondary persona only when the JD contains materially distinct first-order responsibilities from a second role family
- never blend more than two role families at once
- require both strategic-materiality and evidence-density thresholds before activating blended mode
- suppress secondary persona if it only appears in tool keywords, generic collaboration language, or aspirational phrasing

Single-persona conditions:
- one family clearly owns the mandate, proof model, stakeholder map, and likely interview loop
- the second family appears only as collaboration context, not as owned judgment or deliverable responsibility
- seniority signals align cleanly with one functional archetype

Blended-persona conditions:
- the role requires repeated functional judgment from two families, not merely partnership with the second
- retrieval needs two source branches to explain why the role exists now and how to win the process
- interview prep would be materially wrong if one family were dropped

Contradictory-signal resolution:
- ownership verbs outweigh background nouns
- recurring JD responsibilities outweigh title decoration
- stakeholder power and success-metric language outweigh tool-stack mentions
- reporting, hiring, org-design, or P&L signals outweigh inflated strategy adjectives
- when contradictions persist, keep the dominant primary persona, lower persona_confidence, and suppress the secondary persona unless it adds clear explanatory value

Fallbacks:
- if one persona dominates but confidence is medium or low, render the dominant persona and label secondary uncertainty inside unknowns and QA metadata
- if two families both have strong signals and neither clearly dominates, set is_blended_persona true and blend retrieval, interview prep, and reading experience intentionally
- say mixed role when the role genuinely combines mandates, such as Product plus Design, Engineering plus Data/ML, PMM plus Sales strategy, or Executive plus GM
- never ask the user to select persona first in premium mode

### P5. Persona storage in report object
Store persona inference in the report object under:
- inferred_primary_role_family
- inferred_secondary_role_family
- is_blended_persona
- inferred_seniority
- inferred_subspecialization
- persona_confidence
- persona_evidence
- reading_experience_profile
- retrieval_profile
- strategy_profile
- interview_profile
- persona_reasoning_trace_summary

Persona object shape:
- inferred_primary_role_family: required canonical functional anchor
- inferred_secondary_role_family: optional and null unless blended mode is justified
- is_blended_persona: boolean guardrail for mixed-role behavior
- inferred_seniority: one resolved level interpretation only
- inferred_subspecialization: optional specialization overlay, not a second persona
- persona_confidence: high, medium, or low based on signal agreement and mandate clarity
- persona_evidence: concise evidence bullets tying persona to title, JD, scope, stakeholders, and proof expectations
- reading_experience_profile: section ordering, expansion rules, compression rules, wording rules, five-minute brief priorities
- retrieval_profile: mandatory, preferred, and optional source classes plus blend-specific expansion logic
- strategy_profile: which strategic lenses dominate, what to expand, what to suppress, and how to interpret leverage
- interview_profile: dominant interview dimensions, interviewer types, proof expectations, objections, question families, and story-map priorities
- persona_reasoning_trace_summary: compact audit trail for QA and telemetry, not user-facing chain-of-thought

Release and transparency metadata to store in the report object:
- release_mode: premium_full | inference_visible_full | partial | blocked
- report_override_available: boolean
- section_evidence_state
- section_quality_state
- section_confidence_state
- section_warning_note
- section_missing_evidence_note
- section_show_in_inference_visible_mode
- section_release_note

Population rules:
- evaluator outputs populate section-level evidence, quality, confidence, and showability fields
- composition consumes those fields to decide labeling, warning placement, suppression, and collapse behavior
- UI reads those fields directly; it must not infer trust state from prose tone alone

Role-family taxonomy:
- Product
- Engineering
- Design
- Data / ML / Applied Science / Analytics
- Product Marketing / Marketing
- Sales / GTM / Partnerships
- Operations / Program / BizOps
- Executive / GM / VP / C-level

Seniority taxonomy:
- IC junior / mid
- senior IC
- staff / principal
- manager
- senior manager
- director
- VP / executive

Sub-specialization taxonomy examples:
- Product: platform, growth, monetization, consumer, enterprise, AI product
- Engineering: backend, infra, platform, frontend, mobile, security, ML platform
- Design: product design, design systems, content design, UX research
- Data / ML: applied science, ML engineering, data science, analytics, experimentation
- Marketing: PMM, growth marketing, lifecycle, brand, developer marketing
- Sales / GTM: enterprise, mid-market, partnerships, solutions, rev ops adjacent
- Operations / Program: TPM, business operations, program management, transformation, enablement
- Executive: GM, BU leader, functional VP, C-level

Confidence computation:
- start from title plus JD agreement
- increase confidence when scope, stakeholder power, success metrics, and interviewer-proof expectations align with the same family and level
- lower confidence when the title says one thing but the owned responsibilities, stakeholders, or success metrics say another
- lower confidence when blended evidence is weak, sparse, or mostly cosmetic

Coherence guardrails for blended reports:
- one primary persona weight, one optional secondary persona weight, one seniority interpretation, one reading_experience_profile
- blend retrieval, strategy, and prep selectively; do not duplicate every section for each persona
- use the primary persona to anchor the report spine and let the secondary persona change emphasis, objections, mock questions, and evidence depth where necessary

### P6. Blended persona patterns and weighting
Primary and secondary weighting:
- default primary weight: 0.65 to 0.75
- default secondary weight: 0.25 to 0.35
- use 0.70 and 0.30 when both personas are real but one is still clearly dominant
- use 0.60 and 0.40 only when the JD genuinely alternates mandate language across both families

Tie-breaking rules:
- choose the persona tied to explicit ownership and success metrics as primary
- if ownership is shared, choose the persona tied to likely hiring-manager judgment as primary
- if still tied, choose the persona that drives the first-pass retrieval spine and lower persona_confidence

High-value blended patterns likely in real JDs:
- Product + GTM
- Product + Data / ML
- Engineering + ML
- Program + Operations
- Executive + Product
- Executive + GTM
- Design + Content Design
- PMM + Partnerships

False-positive patterns to resist:
- Product + Engineering when the JD merely says “work closely with engineering”
- Design + Product when the JD is standard product design collaboration language
- PMM + Sales when the role just supports sales enablement
- Operations + Executive when the role touches leadership cadence but does not own org-level operating design

Detailed blended behavior:
- Product + GTM: elevate strategy, monetization, segmentation, adoption, launch leverage, and stakeholder alignment; do not let feature prioritization swallow distribution reality
- Product + Data / ML: elevate experimentation, measurement quality, model behavior, decision loops, and productization of technical capability
- Engineering + ML: elevate architecture, model quality, platform maturity, evaluation, productionization, reliability, and technical leverage
- Program + Operations: elevate cross-functional orchestration, governance, dependency risk, operating cadence, and business outcome discipline
- Executive + Product: elevate business model, portfolio strategy, org design, role mandate, and stakeholder power before detailed craft discussion
- Executive + GTM: elevate revenue model, market motion, channel design, customer segmentation, and cross-company leverage
- Design + Content Design: elevate experience quality, language systems, accessibility, design systems, and collaboration mechanics
- PMM + Partnerships: elevate ecosystem narrative, co-sell or co-market leverage, joint positioning, buyer segmentation, and external influence

Blended merge rules:
- retrieval should merge mandatory source classes from the primary persona plus only the high-signal mandatory classes from the secondary persona
- strategy interpretation should keep one thesis but use both lenses where they materially change leverage, timing, or success metrics
- interview-prep themes should merge only the proof dimensions likely to appear in the actual loop
- section ordering should follow the primary reading spine while elevating the secondary persona's critical sections, not cloning the report
- how-to-win guidance should state the single narrative arc that reconciles both mandates
- objections should merge honestly, including the risk that the candidate is stronger in one function than the other
- mock questions should reflect the dominant proof families rather than alternate randomly across functions
- the system must not over-index on the wrong function because of vocabulary collisions or generic collaboration language

### P7. Persona-conditioned ordering and emphasis
The canonical structure remains fixed in its core sections, but section order, emphasis, depth, and wording must change by persona.

Role-family ordering and emphasis rules:

Product:
- ideal ordering: five-minute brief, why this role exists now, company and role strategy, candidate positioning, interview prep, credibility
- expand: business model, product strategy, leverage, metrics, stakeholder alignment, competitor analysis
- compress: low-value technical implementation detail unless platform-heavy
- five-minute brief first: why now, leverage, metrics, top positioning angle
- deep-prep emphasis: strategy, prioritization, monetization, cross-functional influence

Engineering:
- ideal ordering: five-minute brief, technical and platform context, why this mandate exists now, technical leverage and stakeholder risk, interview prep, credibility
- expand: architecture, system constraints, technical leverage, delivery risk, technical leadership, platform context
- compress: generic roadmap prose that lacks technical implications
- five-minute brief first: architecture stakes, reliability or scale stakes, proof expectations
- deep-prep emphasis: system design, technical judgment, production realism, execution risk

Design:
- ideal ordering: five-minute brief, product experience and design context, mandate and influence model, collaboration map, interview prep, credibility
- expand: experience quality, craft standards, design influence, critique expectations, collaboration dynamics
- compress: overly abstract market commentary that does not affect experience or design leverage
- five-minute brief first: experience mandate, influence model, critique themes
- deep-prep emphasis: craft, rationale, systems coherence, research integration, stakeholder persuasion

Data / ML / Applied Science / Analytics:
- ideal ordering: five-minute brief, data and AI context, mandate and measurement model, product and technical dependencies, interview prep, credibility
- expand: experimentation, modeling judgment, measurement quality, productionization, data strategy, business interpretation
- compress: generic company narrative that does not affect decision loops or modeling leverage
- five-minute brief first: decision-quality mandate, experimentation stakes, model or analytics proof
- deep-prep emphasis: rigor, production realism, metrics trust, causal reasoning

Product Marketing / Marketing:
- ideal ordering: five-minute brief, market and messaging context, GTM mandate, segmentation and launch mechanics, interview prep, credibility
- expand: positioning, messaging, pricing, launches, segmentation, adoption, differentiation
- compress: low-value technical depth unless the role is developer or technical marketing
- five-minute brief first: message-market fit, launch stakes, differentiation angle
- deep-prep emphasis: customer narrative, market framing, pricing and packaging, adoption mechanics

Sales / GTM / Partnerships:
- ideal ordering: five-minute brief, revenue motion context, mandate and commercial leverage, stakeholder and execution dependencies, interview prep, credibility
- expand: buyer journey, objections, partner ecosystem, revenue logic, territory or channel complexity
- compress: product detail that does not change revenue motion
- five-minute brief first: buyer problem, revenue motion, likely objections, win narrative
- deep-prep emphasis: commercial judgment, customer empathy, execution discipline, negotiation credibility

Operations / Program / BizOps:
- ideal ordering: five-minute brief, execution and governance context, operating mandate, risk network and stakeholder map, interview prep, credibility
- expand: operating cadence, governance, transformation, dependency management, execution risk, decision rights
- compress: generic company storytelling that does not change operating model
- five-minute brief first: execution stakes, governance gaps, cross-functional risk
- deep-prep emphasis: orchestration, risk control, systems of execution, business outcomes

Executive / GM / VP / C-level:
- ideal ordering: five-minute brief, company strategy and portfolio context, why this leadership mandate exists now, org design and stakeholder power, interview prep, credibility
- expand: business model, portfolio bets, org design, role mandate, capability building, leadership leverage, competitor pressure
- compress: detailed tactical drill-downs unless they reveal leadership judgment
- five-minute brief first: business context, mandate, power map, principal risks, win narrative
- deep-prep emphasis: portfolio thinking, business judgment, org design, executive communication, strategic tradeoffs

Seniority modifiers inside every role family:
- IC junior / mid: emphasize craft, execution depth, learning curve, direct problem solving, and clear reasoning
- senior IC: emphasize independent judgment, domain depth, tradeoff quality, and consistent ownership
- staff / principal: emphasize systems leverage, cross-team influence, architecture or domain leadership, and multiplier behavior
- manager: emphasize team leadership, delivery through others, hiring, coaching, and operating cadence
- senior manager: emphasize multi-team coordination, management systems, prioritization, and organizational communication
- director: emphasize strategic range, prioritization under ambiguity, stakeholder power, business judgment, and strategy-to-execution translation
- VP / executive: emphasize portfolio, org design, business model, capability building, resourcing, and enterprise-level judgment

Blended-ordering overrides:
- Product + GTM should elevate strategy, monetization, segmentation, adoption, and stakeholder alignment early
- Engineering + ML should elevate architecture, model quality, infra maturity, experimentation, and productionization early
- Executive + Product should elevate business model, portfolio, org design, mandate, and stakeholder power early

### P8. Persona-conditioned interview prep
Interview prep must remain inside the canonical report, but its meaning must materially shift by role family and seniority.

Role-family interview-prep rules:

Product:
- dominant interview dimensions: product judgment, strategy, prioritization, metrics, experimentation, influence, business reasoning
- likely interviewer types: hiring manager, product leader, engineering partner, design partner, analytics partner, executive
- strong-answer pattern: structured tradeoffs, clear leverage logic, metric accountability, business context
- weak-answer pattern: feature talk without prioritization logic, metrics without mechanism, vague stakeholder claims
- dominant story requirements: ambiguous problem solving, prioritization tradeoffs, influence without authority, product outcomes
- dominant objections: not strategic enough, too tactical, too feature-centric, weak cross-functional influence
- dominant mock questions: prioritization, product strategy, metrics, experimentation, stakeholder conflict, product judgment
- dominant questions to ask: mandate clarity, decision rights, strategic priorities, metric ownership
- dominant how-to-win: show you can connect user value, business value, and execution leverage

Engineering:
- dominant interview dimensions: system design, technical judgment, architecture tradeoffs, reliability, delivery, technical leadership
- likely interviewer types: engineering manager, tech lead, architect, peer engineer, product partner
- strong-answer pattern: realistic tradeoffs, failure modes, design rationale, operational awareness, technical depth
- weak-answer pattern: abstract architecture talk, no production constraints, hero narratives without systems leverage
- dominant story requirements: scaling, reliability, incident response, technical leadership, ambiguous implementation choices
- dominant objections: too theoretical, not enough scale depth, weak leadership leverage, unclear execution realism
- dominant mock questions: system design, debugging tradeoffs, architecture decisions, reliability, stakeholder negotiation
- dominant questions to ask: architecture constraints, technical debt, platform maturity, ownership boundaries
- dominant how-to-win: prove deep technical judgment and pragmatic execution credibility

Design:
- dominant interview dimensions: craft, critique, systems thinking, user reasoning, collaboration, influence
- likely interviewer types: design manager, product partner, engineering partner, design peer, executive sponsor
- strong-answer pattern: clear rationale, user evidence, system coherence, collaboration quality, tasteful tradeoffs
- weak-answer pattern: aesthetics without reasoning, process recitation, vague impact claims, weak collaboration stories
- dominant story requirements: end-to-end design ownership, critique evolution, collaboration under constraint, user insight application
- dominant objections: strong craft but weak strategy, good collaborator but weak point of view, polished portfolio but thin impact
- dominant mock questions: portfolio walkthrough, critique, design systems, stakeholder disagreement, user research tradeoffs
- dominant questions to ask: design influence, product partnership, research maturity, design-system expectations
- dominant how-to-win: prove taste, reasoning, and influence under product and engineering constraints

Data / ML / Applied Science / Analytics:
- dominant interview dimensions: modeling judgment, experimentation, measurement, causal reasoning, productionization, business interpretation
- likely interviewer types: manager, peer scientist or engineer, analytics lead, product partner, leadership stakeholder
- strong-answer pattern: rigor with business relevance, measurement discipline, production realism, decision impact
- weak-answer pattern: technique name-dropping, no causal discipline, no production constraints, no business translation
- dominant story requirements: model deployment, experimentation, decision support, data-quality recovery, ambiguity reduction
- dominant objections: too academic, too narrow technically, not enough product or business interpretation, weak productionization
- dominant mock questions: experiment design, causal inference, measurement traps, model tradeoffs, stakeholder interpretation
- dominant questions to ask: data maturity, decision loop ownership, experimentation culture, production constraints
- dominant how-to-win: show rigor that changes decisions, not just analysis that sounds smart

Product Marketing / Marketing:
- dominant interview dimensions: positioning, messaging, GTM strategy, launch execution, segmentation, adoption, pricing and packaging
- likely interviewer types: PMM leader, product leader, sales partner, lifecycle or growth partner, executive
- strong-answer pattern: crisp customer narrative, differentiated positioning, launch orchestration, measurable adoption logic
- weak-answer pattern: campaign jargon, vague messaging, no customer insight, no market tradeoff logic
- dominant story requirements: positioning reset, launch leadership, cross-functional GTM execution, messaging under ambiguity
- dominant objections: too brand-heavy, too execution-heavy, weak strategic range, shallow product understanding
- dominant mock questions: repositioning, launch planning, segmentation tradeoffs, pricing and packaging, competitive narrative
- dominant questions to ask: target segments, adoption goals, product-marketing decision rights, GTM operating model
- dominant how-to-win: prove you can turn product truth into market traction

Sales / GTM / Partnerships:
- dominant interview dimensions: customer strategy, commercial judgment, deal-cycle navigation, partner leverage, objections, execution discipline
- likely interviewer types: sales leader, peer seller, partnerships leader, solutions lead, executive
- strong-answer pattern: customer pain clarity, revenue logic, disciplined execution, credible negotiation or partner judgment
- weak-answer pattern: charisma without commercial logic, generic relationship talk, no process discipline, no measurable outcomes
- dominant story requirements: deal navigation, pipeline creation, partnership leverage, objection recovery, commercial execution
- dominant objections: too relationship-led, too transactional, weak strategic account thinking, weak ecosystem logic
- dominant mock questions: territory strategy, objection handling, partnership scenario, pipeline recovery, buyer influence
- dominant questions to ask: buyer segments, sales cycle complexity, partner model, commercial blockers, success metrics
- dominant how-to-win: show disciplined commercial judgment with customer empathy

Operations / Program / BizOps:
- dominant interview dimensions: governance, dependency management, execution systems, transformation, risk handling, operating rigor
- likely interviewer types: program leader, operations leader, functional stakeholder, finance or legal partner, executive sponsor
- strong-answer pattern: structured orchestration, risk anticipation, decision-right clarity, outcome ownership
- weak-answer pattern: project-tracking talk without leverage, vague coordination claims, no governance logic, no tradeoff clarity
- dominant story requirements: cross-functional delivery, transformation, operating rhythm design, risk containment, escalation judgment
- dominant objections: process-heavy but not outcomes-driven, good organizer but weak strategic judgment, weak influence under conflict
- dominant mock questions: dependency failure, governance design, transformation sequencing, stakeholder escalation, prioritization under constraints
- dominant questions to ask: decision rights, planning cadence, execution bottlenecks, cross-functional friction, success measures
- dominant how-to-win: prove you can create execution leverage, not just track work

Executive / GM / VP / C-level:
- dominant interview dimensions: business model, portfolio thinking, org design, leadership leverage, executive communication, enterprise judgment
- likely interviewer types: CEO, executive peer, board-adjacent stakeholder, finance, HR or assessment partner
- strong-answer pattern: mandate clarity, business judgment, org leverage, portfolio logic, crisp executive communication
- weak-answer pattern: functional detail without enterprise relevance, generic leadership platitudes, no org design logic, weak financial reasoning
- dominant story requirements: business transformation, portfolio prioritization, org redesign, capability building, executive-level tradeoffs
- dominant objections: too functional, not broad enough, strong operator but weak strategic range, weak enterprise leadership narrative
- dominant mock questions: mandate diagnosis, org design, portfolio tradeoffs, executive conflict, business model decisions, resourcing
- dominant questions to ask: CEO mandate, success horizon, power map, organizational friction, business-model pressure points
- dominant how-to-win: show you can lead the business, not just lead a function

Seniority adaptation for interview prep:
- IC prep should emphasize craft, execution depth, problem solving, and judgment
- manager prep should emphasize team leadership, delivery through others, hiring, coaching, and execution systems
- director prep should emphasize strategic range, prioritization under ambiguity, org influence, stakeholder power, and business judgment
- executive prep should emphasize portfolio thinking, business model, org design, leadership leverage, and cross-company judgment

Blended interview-prep rules:
- combine interview themes only where both personas materially affect the likely loop
- let the primary persona determine the dominant question families unless the secondary persona is required to explain the hiring bar
- combine objections honestly by naming the tension between the two mandates, not by watering both down
- combine story maps by selecting stories that prove both mandates through one coherent narrative where possible
- combine questions-to-ask guidance by prioritizing the decision-rights, mandate, and success-metric questions that reveal how the two functions meet in practice
- never collapse blended prep into generic leadership or cross-functional language

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
- how to signal the right level of judgment, range, and operating depth for this persona

The meaning of how to win must change by persona:
- Product: user judgment, prioritization, leverage, metrics, and business reasoning
- Engineering: architecture judgment, reliability thinking, technical depth, and execution realism
- Design: craft, systems thinking, critique quality, user empathy, and influence
- Data / ML: modeling judgment, measurement discipline, experiment design, and production realism
- Marketing: segmentation, messaging, launch mechanics, differentiation, and adoption reasoning
- Sales / GTM: customer strategy, revenue motion, partnership leverage, and execution against targets
- Operations / Program: orchestration, governance, risk control, and operating rigor
- Executive: business model fluency, org design, leadership leverage, and portfolio judgment

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

Persona interpretation rules:
- Product: explain why strategy, prioritization, metrics, monetization, or platform leverage now require stronger product leadership
- Engineering: explain why architecture, scalability, reliability, security, or platform change now require stronger engineering leverage
- Design: explain why product experience, systems cohesion, research quality, or design influence now matter more
- Data / ML: explain why experimentation, model quality, data strategy, AI capability, or measurement maturity now matters
- Marketing: explain why positioning, messaging, launch coordination, pricing, or market education now matters
- Sales / GTM: explain why revenue motion, channel change, buyer complexity, or partner leverage now matters
- Operations / Program: explain why cross-functional execution, transformation, governance, or process scale now matters
- Executive: explain why portfolio choices, org redesign, P&L pressure, or leadership capability building now matters

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

Persona-specific stakeholder expectations:
- Product: engineering, design, data, GTM, support, leadership, and platform dependencies
- Engineering: product, design, security, infra, data, developer platform, SRE, and architecture governance
- Design: product, engineering, research, content, brand, accessibility, and executive design sponsors
- Data / ML: product, engineering, platform, research, analytics, experimentation, legal/privacy, and domain stakeholders
- Marketing: product, sales, lifecycle, brand, analytics, regional GTM, and leadership
- Sales / GTM: sales leadership, sales engineering, partnerships, marketing, product, customer success, finance, and operations
- Operations / Program: functional leads, finance, legal, operations, program sponsors, and executive steering groups
- Executive: board, CEO, peer executives, finance, business-unit leaders, and external stakeholders when relevant

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
 - interview proof standards are under-evidenced

Proof expectations must adapt by role family and seniority:
- junior IC: craft, learning velocity, structured execution, clear reasoning
- senior IC: independent judgment, tradeoff quality, domain depth, reliable execution
- staff / principal / architect: systems thinking, cross-team leverage, architecture or domain leadership, multiplier behavior
- manager: hiring, coaching, delivery through others, operating cadence, decision quality
- director: prioritization under ambiguity, stakeholder power, org influence, strategy-to-execution translation
- senior director / VP: portfolio judgment, resourcing, cross-org leadership, executive communication
- executive / GM / C-level: business model fluency, org design, leadership leverage, enterprise decision-making, P&L logic

## Layer D — Persona-specific retrieval strategy
Retrieval must change by role family and seniority. One generic source plan is not acceptable in premium mode.

### D1. Role-family retrieval priorities
Mandatory retrieval emphasis by role family:
- Product: investor materials, launch history, product surfaces, pricing and packaging, strategy commentary, metrics language, competitor positioning
- Engineering: engineering blogs, architecture docs, developer docs, platform docs, reliability and security materials, OSS footprints, performance and scale clues
- Design: product surfaces, help flows, design system clues, brand and product experience materials, research culture clues, portfolio expectations
- Data / ML: AI launches, experimentation materials, model or platform docs, measurement maturity signals, data strategy evidence, decisioning or recommendation-system clues
- Product Marketing / Marketing: messaging, segmentation, launch motions, pricing and packaging, customer stories, analyst narratives, positioning pages
- Sales / GTM / Partnerships: customer segments, sales motion, partner ecosystem, enablement signals, buyer journeys, pricing exposure, channel language
- Operations / Program / BizOps: program governance signals, transformation materials, execution cadence, operating models, process maturity, org complexity clues
- Executive / GM / VP / C-level: business model, portfolio strategy, investor and board language, leadership commentary, org design clues, M&A or capital-allocation signals

### D2. Seniority retrieval adaptation
Mandatory seniority overlays:
- IC junior / mid: prioritize team-level expectations, craft examples, tool or workflow surfaces, immediate execution context
- senior IC: prioritize role-specific depth signals, domain complexity, cross-functional dependencies, proof of ownership depth
- staff / principal / architect: prioritize architecture, cross-system dependencies, org interfaces, design or technical standards, strategic constraint evidence
- manager: prioritize org interactions, delivery cadence, hiring and leadership expectations, team-scope signals
- director: prioritize leadership commentary, strategic priorities, stakeholder power centers, organizational tradeoffs, mandate-shaping evidence
- senior director / VP: make investor materials, executive commentary, org design clues, capital or portfolio tradeoffs mandatory
- executive / GM / C-level: make investor materials, leadership interviews, board-facing language, portfolio strategy, and business-model evidence mandatory

### D3. Mandatory, preferred, optional source classes
For every persona, define:
- mandatory source classes: required before strategy and prep can be composed credibly
- preferred source classes: retrieved unless blocked by availability or budget guardrails
- optional source classes: enrichment only after mandatory evidence is satisfied

Sections unlocked by stronger persona retrieval:
- engineering architecture context unlocks stronger technical leverage, interviewer agenda, and system-design prep
- product monetization and investor context unlocks stronger company strategy, role strategy, and product-sense prep
- design surface and design-system evidence unlocks stronger craft critique, collaboration, and portfolio expectations
- data and experimentation evidence unlocks stronger model/product interaction, measurement quality, and analytical proof sections
- executive leadership and investor evidence unlocks stronger mandate, stakeholder map, org-risk, and business-judgment sections

## Layer E — Persona-specific interview-prep frameworks
Interview prep must generate different frameworks by role family and seniority, not a lightly customized generic structure.

### E1. Role-family interview frameworks
Product:
- dimensions: product sense, strategy, prioritization, metrics, experimentation, influence, business judgment
- interviewer types: hiring manager, cross-functional partner, exec/product leader, analytics, design, engineering
- proof expectations: product judgment, clarity of tradeoffs, leverage, metrics fluency, story structure

Engineering:
- dimensions: system design, architecture tradeoffs, reliability, scale, technical judgment, delivery, technical leadership
- interviewer types: tech lead, engineering manager, architect, peer engineer, product partner
- proof expectations: depth, realism, tradeoff reasoning, failure handling, leverage through systems and people

Design:
- dimensions: craft, critique, systems thinking, user-centered reasoning, collaboration, vision, portfolio presentation
- interviewer types: design manager, product partner, engineering partner, research/design peer, executive sponsor
- proof expectations: rationale, taste, system coherence, user evidence, collaboration, influence

Data / ML:
- dimensions: modeling judgment, experimentation, causal reasoning, productionization, data quality, business interpretation
- interviewer types: hiring manager, scientist/engineer peer, product partner, analytics lead, leadership stakeholder
- proof expectations: analytical rigor, measurement discipline, production tradeoffs, decision impact

Product Marketing / Marketing:
- dimensions: segmentation, messaging, GTM strategy, launches, adoption, pricing and packaging, influence
- interviewer types: PMM leader, product leader, sales partner, demand/gen or lifecycle partner, executive stakeholder
- proof expectations: positioning clarity, market understanding, launch orchestration, customer empathy, business impact

Sales / GTM / Partnerships:
- dimensions: customer strategy, revenue thinking, deal-cycle navigation, objections, partner leverage, execution discipline
- interviewer types: sales leader, peer seller, solutions/partnerships leader, cross-functional partner, executive
- proof expectations: quota or revenue logic, customer pain mapping, negotiation judgment, execution credibility

Operations / Program / BizOps:
- dimensions: operating cadence, dependency management, governance, transformation, risk handling, execution rigor
- interviewer types: program leader, functional stakeholder, operations leader, finance/legal partner, executive sponsor
- proof expectations: structure, risk anticipation, cross-functional orchestration, operating discipline, outcome ownership

Executive / GM / VP / C-level:
- dimensions: portfolio choices, business model, org design, leadership narrative, enterprise judgment, board/executive communication
- interviewer types: CEO, board-level or exec peer, functional leader, finance, HR or leadership-assessment stakeholders
- proof expectations: business outcomes, capability building, resourcing judgment, leadership range, external and internal influence

### E2. Seniority overlays for interview prep
Dominant emphasis by level:
- IC: depth, craft, execution proof, direct judgment
- manager: leadership, delivery through others, coaching, hiring, operating rhythm
- director: strategic range, prioritization, organizational leverage, ambiguity handling
- senior director / VP: portfolio choices, cross-org leadership, executive communication, resourcing
- executive: business outcomes, org design, enterprise leadership, capital and risk judgment

### E3. Required persona-conditioned interview outputs
For each role family plus seniority combination, the report must generate:
- dominant interview themes
- dominant proof expectations
- dominant objections
- dominant question types
- dominant story requirements
- dominant failure patterns
- dominant categories for questions to ask the interviewer

Weak-answer and strong-answer standards must change by persona. A strong engineering answer is not a strong product answer. A strong director answer is not a strong senior IC answer.

## Layer F — Persona-specific reading experience
The report must feel different by persona.

### F1. Default section order by role family
Product:
- 5-minute brief
- why this role exists now
- company strategy
- role strategy
- candidate positioning
- interview prep

Engineering:
- 5-minute brief
- technical and platform context
- why this role exists now
- role mandate and technical leverage
- stakeholder map and delivery risks
- interview prep

Design:
- 5-minute brief
- product experience and design context
- role mandate and influence model
- collaboration and stakeholder map
- portfolio and critique expectations
- interview prep

Data / ML:
- 5-minute brief
- data and AI context
- role mandate and measurement model
- technical and product dependencies
- decision risk and proof requirements
- interview prep

Product Marketing / Marketing:
- 5-minute brief
- market and messaging context
- role mandate and GTM leverage
- segmentation and launch mechanics
- stakeholder map
- interview prep

Sales / GTM / Partnerships:
- 5-minute brief
- revenue and customer-motion context
- role mandate and territory or partnership leverage
- stakeholder map and execution dependencies
- objections and interviewer agenda
- interview prep

Operations / Program / BizOps:
- 5-minute brief
- execution and governance context
- role mandate and operating leverage
- stakeholder map and risk network
- transformation constraints
- interview prep

Executive / GM / VP / C-level:
- 5-minute brief
- company strategy and portfolio context
- why this role exists now
- mandate, org design, and stakeholder power map
- business risks and capability gaps
- interview prep

### F2. Reading-experience adaptation rules
The reading experience must change through:
- section ordering by role family
- section emphasis by role family
- depth allocation by role family and seniority
- different 5-minute brief composition by role family
- different how-to-win summaries by role family and seniority
- persona-specific labels where helpful, such as technical mandate, design influence, revenue motion, or portfolio mandate
- compression of low-value sections for a persona and expansion of high-value ones

Examples:
- compress metric-tree detail for executive roles when portfolio and org design matter more
- expand architecture and dependency detail for engineering staff-plus roles
- expand critique and collaboration proof for design roles
- expand pricing, positioning, and launch-motion sections for PMM roles
- expand buyer journey, objections, and partnership leverage for sales and GTM roles

### F3. Suppression and renaming rules
Suppress or compress sections when they are low-value for the persona.
Examples:
- do not lead executive reports with generic mock questions
- do not bury engineering technical leverage under generic company-summary prose
- do not use product-sense framing for design, operations, sales, or executive roles
- do not preserve generic PM labels when technical mandate, design influence, revenue motion, or org mandate are more accurate
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

### 8. Premium narrative research brief correction
This correction sharpens the premium product direction without removing existing rigor, persona adaptation, inference visibility, or release gating.

#### 8.1 Hard product requirements
The report must satisfy all of the following:
- the report is one canonical premium report
- the reading experience should feel like a premium narrative research brief
- the report should use rich modules, not just long text sections
- visuals and modules should increase information density, not act as decoration
- the product should remain evidence-aware and quality-gated
- lower-confidence public sentiment sources are allowed when clearly labeled
- official and high-confidence sources remain primary
- sentiment and employee-review sources should provide texture, not dominate conclusions

Why narrative research brief is the correct format:
- candidates are making a high-stakes decision under time pressure and need an interpretable story, not disconnected facts
- company context, role context, candidate fit, and interview strategy only become useful when connected into one decision narrative
- a premium brief can carry strategic interpretation, warnings, and evidence boundaries without collapsing into compliance prose

Why dashboard-first would weaken the product:
- dashboards over-index on static score display and under-explain the logic behind the recommendation
- a dashboard-first surface encourages shallow scanning, false precision, and fragmented interpretation
- the product's advantage is judgment, synthesis, and interview leverage, not metric ornamentation

Why rich modules still matter inside a narrative product:
- modules create skim layers and deep layers without flattening the story
- modules let the report surface timelines, tensions, stakeholders, competitors, and interview actions at higher density than prose alone
- modular blocks create visual anchors that help the user return to the report as a working prep document

Why public sentiment sources are useful when treated as supporting evidence:
- they can expose recurring patterns about operating reality, interview tone, management behavior, or work cadence that official sources rarely state directly
- they help convert company research into candidate-prep texture when labeled as lower-confidence and bias-prone
- they are useful only when synthesized across patterns and bounded by stronger official evidence

Hard failure condition:
- the report fails if it reads like a dry compliance artifact, a dashboard-first product, a dumped database, or a flattened AI summary

#### 8.2 Narrative reading model
The full report must behave like one narrative with modular checkpoints.

Required reading flow:
1. opening summary / top decision
2. company intelligence story
3. role strategy story
4. candidate fit story
5. interview preparation story
6. credibility / evidence story
7. release / quality context

Reading-experience rules:
- the first screen must orient the user to the top decision, why now, and what matters most
- every major layer must include a skim surface and a deeper interpretive surface
- each later section must feel like a consequence of the earlier sections rather than a reset
- credibility and release context must remain visible but should not dominate the editorial flow

#### 8.3 Rich module types inside the narrative spine
| Module type | Purpose | When to use | Narrative placement | Surface | Conceptual look | Failure mode to avoid |
|---|---|---|---|---|---|---|
| Executive summary cards | Compress the top decision, why now, best positioning angle, and biggest risk | Always | Opening summary | Both | High-signal card strip with strong labels and short takeaways | Generic KPI tiles with no interpretation |
| Key insight callouts | Surface non-obvious conclusions worth slowing down for | When a section has a strong second-order takeaway | Across company, role, fit, and prep layers | Both | Editorial pull-quote or sidecar callout | Decorative quotes or repeated summary text |
| Visual timeline modules | Show company evolution, inflection points, launches, or leadership-era changes | When history materially informs the role or current strategy | Company intelligence story | Full report primarily | Horizontal or stacked milestone narrative | Fake precision or empty chronology |
| Competitor matrix modules | Compare company position, substitutes, and strategic tradeoffs | When category competition is role-relevant | Company intelligence story | Full report primarily | Dense comparison grid with implications column | Brand-name list with no strategic read |
| Leadership and culture panels | Explain leadership posture, stated principles, and operational implications | When leadership/culture evidence is sufficient | Company intelligence story | Both | Framed panels with evidence tags and implications | Corporate-values wallpaper |
| Strategy tension panels | Make tradeoffs explicit | When evidence reveals real balancing acts | Company and role strategy stories | Both | Two-sided tension module with consequence line | Generic “tradeoffs exist” filler |
| Stakeholder map modules | Show power centers, dependencies, and likely collaboration friction | When role-context evidence supports it | Role strategy story | Full report primarily | Compact network or ranked stakeholder block | Invented org chart precision |
| Decision memo block | State the recommendation and key reasons in memo form | Always | Opening summary | Both | Memo-style decision panel | Vague recommendation language |
| What this means for you blocks | Translate company or role facts into candidate implications | Whenever company context or uncertainty needs interpretation | Company, role, fit, and prep layers | Both | Distinct implication box with direct advice | Leaving interpretation implicit |
| Question bank cards | Organize questions by interviewer type or uncertainty | Always when interview-prep is shown | Interview preparation story | Both | Card stack grouped by theme | Long undifferentiated bullet dumps |
| Interviewer agenda modules | Show what each interviewer is likely validating | Always when interview-prep is shown | Interview preparation story | Both | Agenda cards with proof standard and traps | Generic loop speculation |
| Story map modules | Map candidate stories to proof needs and follow-up traps | When resume overlay exists; otherwise generic proof stories only | Candidate fit and interview preparation stories | Full report primarily | Story-to-proof cards | Resume-free fake personalization |
| Warning / uncertainty banners | Preserve honesty without flattening usefulness | When a section is mixed, inferred, or low evidence | Any layer as needed | Both | Clear banner plus short note | Tiny disclaimers that hide real weakness |
| Evidence legend modules | Explain evidence-state labels and confidence meaning | Always | Credibility / evidence story | Both | Compact legend with chips and short definitions | Overlong methodology lecture |

#### 8.4 Expanded company intelligence layer
The company intelligence layer must become materially richer and more editorial. When evidence is sufficient, it should include the following subsections.

| Subsection | Objective | Source priority | Evidence threshold | Preferred module format | Narrative placement | Premium output | Shallow output | Show as inferred when | Suppress when |
|---|---|---|---|---|---|---|---|---|---|
| Company Snapshot | Orient the reader fast to what the company is, what it sells, who it serves, and why it matters now | Official about pages, investor materials, product pages | 2 sources, 1 primary | Company snapshot card group | Opening of company intelligence story | Sharp identity, business model, category, buyer, and scale posture in one view | Generic one-paragraph company description | only minor scope details are missing but the basics are grounded | company identity or business model remains too vague |
| History / Evolution Timeline | Explain how the company got here and what changed | Official history pages, investor materials, credible timeline coverage | 2 sources preferred | Visual timeline module | Early company intelligence story | Inflection points tied to current strategy or hiring context | Chronology without consequences | exact dates or sequence precision are incomplete but inflection pattern is still useful | there is no reliable change story |
| Mission / Vision / Values / Leadership Principles | Separate stated ideals from meaningful operating signals | Mission pages, values pages, leadership principles, shareholder letters, leadership talks | 2 primary-preferred | Values / culture panel | Early-mid company intelligence story | Stated principles interpreted through operating implications | Copied slogans | interpretation is useful but direct evidence on lived reality is thin | only slogans exist and no implication can be drawn |
| Leadership Context | Explain who appears to shape company direction and how they think | Leadership team pages, exec bios, investor materials, interviews, podcasts | 2 sources preferred | Leadership panel | Mid company intelligence story | Named leadership context plus strategic posture and relevant implications | Bio recap | strategic posture is partially reconstructed from actions and commentary | leadership context is too sparse to support role-relevant interpretation |
| Business Model | Explain revenue logic, value capture, and role relevance | Filings, pricing, product pages, investor materials | Existing business-model threshold applies | Snapshot cards plus insight callout | Early company intelligence story | Real monetization logic and constraints | “the company is SaaS” | some revenue detail is missing but core model is clear | core monetization logic is not supportable |
| Product / Platform / Portfolio Context | Explain the surfaces, products, platform edges, and portfolio logic relevant to the role | Product pages, docs, launch pages, help docs, developer docs | 2 relevant product-surface sources | Snapshot cards or product-surface panel | Mid company intelligence story | Named surfaces, control points, dependencies, and role relevance | feature list | some integration or moat claims require inference but surfaces are real | no role-relevant product context exists |
| Market / Competitor Landscape | Explain who else matters and what strategic pressure exists | Competitor pages, launches, pricing, trade press, investor materials | Existing competitor threshold applies | Competitor matrix module | Mid company intelligence story | Direct competitors, substitutes, pressure points, and what they mean for the role | competitor name dump | ranking precision is weak but directional pressure is clear | the company is not in a legible contested context |
| Momentum Signals / Recent Moves | Show what the company has done recently that changes the interview context | Newsroom, official announcements, launches, filings, leadership talks | 2 sources preferred and one recent signal when possible | Momentum / recent moves module | Late company intelligence story | Recent launches, partnerships, acquisitions, hiring moves, or strategic pivots tied to implications | recent-news list | causal importance is inferred but the move itself is grounded | recent activity is too thin or stale |
| Work Culture | Explain likely ways of working and operating expectations | Careers pages, values pages, operating principles, leadership commentary, engineering/design/product blogs | 2 sources preferred, 1 official | Values / culture panel | Late company intelligence story | Concrete operating clues about speed, rigor, autonomy, collaboration, and quality bar | generic “fast-paced collaborative culture” | lived reality is only partially supported but recurring official clues exist | only empty employer-brand language exists |
| Employee Sentiment Synthesis | Add cautious texture about lived experience, interview tone, and management or culture patterns | Employee-review platforms, discussion forums, interview-review sources, community threads, plus official culture evidence for contrast | 3 lower-confidence signals preferred across 2+ platforms | Employee sentiment panel with warning banner | Late company intelligence story | Pattern synthesis with bias note, recurring themes, and candidate implications | cherry-picked anecdotes | repeated themes exist but corroboration is mixed and clearly disclosed | one platform dominates or only one-off anecdotes exist |
| What This Means for the Candidate | Translate company context into candidate decisions and prep actions | Derived from the whole company intelligence layer | Must be supported by earlier subsections | What this means for you block | Close of company intelligence story | Direct implications for whether to pursue, how to position, and what to validate in interviews | recap with no consequences | the implication is directionally useful but one link in the chain is still inferred | upstream company context is too thin to support useful implications |

Employee Sentiment Synthesis rules:
- acceptable public sentiment sources include Glassdoor-style review platforms, Blind-style discussion forums, Reddit or role-relevant community discussions, interview-review platforms, and credible employee-discussion aggregations
- every sentiment-derived claim must be labeled lower-confidence, bias-prone, anecdotal, or pattern-based rather than factual certainty
- never treat one platform as representative of company truth
- prefer recurring patterns seen across multiple sources or echoed indirectly by official signals
- do not infer strategic priorities, org design, or business-critical truths from sentiment alone
- use sentiment to enrich candidate preparation around work style, management texture, pace, interview tone, or potential friction points
- explicitly note likely bias sources such as disgruntled skew, positivity skew, survivorship bias, timing effects, and role-location concentration
- synthesize recurring patterns without claiming certainty; acceptable phrasing includes “recurring lower-confidence theme,” “pattern worth pressure-testing,” and “candidate-prep signal rather than established fact”
- connect cultural themes to likely interview realities only when the bridge is plausible, useful, and clearly labeled

Hard rules for sentiment:
- never use sentiment as primary evidence for strategic or role-critical claims
- never let one review platform dominate the culture analysis
- always label sentiment as lower-confidence and bias-prone
- use sentiment to enrich candidate preparation, not to make definitive claims

#### 8.5 Persona-specific company-context emphasis
The report remains one canonical report, but the company intelligence and role context must shift emphasis by role family.

Role-family emphasis rules:
- Product: emphasize business model, product surfaces, monetization, experimentation, cross-functional culture, and strategic tradeoffs
- Engineering: emphasize architecture context, engineering culture, quality bar, technical leadership, reliability posture, and system maturity
- Design: emphasize design culture, product quality, user experience philosophy, design influence, critique norms, and collaboration patterns
- Data / ML: emphasize experimentation maturity, data culture, AI investment, model/product loop, governance, and measurement quality
- Product Marketing / Marketing: emphasize messaging, segmentation, launch culture, differentiation, product-to-market fit, and adoption mechanics
- Sales / GTM / Partnerships: emphasize customer model, selling motion, partnership leverage, enablement culture, and revenue priorities
- Operations / Program / BizOps: emphasize governance, cross-functional complexity, decision-making patterns, operating model, and execution friction
- Executive / GM / VP / C-level: emphasize business model, portfolio, org design, leadership team dynamics, operating cadence, and strategic priorities

Seniority emphasis rules:
- IC: emphasize environment, craft bar, team context, and execution realities
- manager: emphasize org collaboration, team context, delivery environment, and leadership expectations
- director: emphasize strategy, stakeholder power, org influence, and leadership principles in action
- executive: emphasize business context, leadership dynamics, portfolio logic, and organizational leverage

#### 8.6 Premium module and visual system
The UI and rendered report must support a premium narrative brief with embedded intelligence modules.

| Module | Purpose | Information density | Ideal placement | Reading mode | Form |
|---|---|---|---|---|---|
| Hero summary strip | Establish top-line decision and why-now | High | Top of report | Skim-first | Compact visual-first |
| Key insight chips | Surface core takeaways and tensions | Medium | Opening and section headers | Skim-first | Compact |
| Evidence / confidence chips | Show evidence state without long prose | Medium | Every major module | Both | Compact |
| Company timeline module | Show company evolution and inflection points | High | Company intelligence | Deep | Visual-first |
| Company snapshot card group | Orient company model, category, buyer, and scale | High | Company intelligence opening | Skim-first | Compact |
| Leadership panel | Show who appears to drive direction | Medium | Company intelligence | Both | Expandable |
| Values / culture panel | Translate stated principles into operating implications | Medium | Company intelligence | Both | Text-first |
| Employee sentiment panel | Provide cautious lived-experience texture | Medium | Company intelligence | Deep | Expandable |
| Competitor matrix | Compare pressures and implications | High | Company intelligence | Deep | Visual-first |
| Strategic tensions module | Make tradeoffs explicit | High | Company and role strategy | Both | Visual-first |
| Momentum / recent moves module | Show what changed lately | Medium | Company intelligence | Both | Compact |
| Role leverage module | Show what levers the role touches | High | Role strategy | Both | Visual-first |
| Stakeholder map | Show power centers and dependency risk | High | Role strategy | Deep | Expandable |
| Risks / unknowns grid | Show what is risky, missing, or worth validating | High | Role strategy and credibility | Both | Compact |
| Interviewer agenda card set | Show likely validator logic | High | Interview prep | Both | Card-based |
| Story map card set | Map stories to proof needs | High | Candidate fit and prep | Deep | Expandable |
| Question bank module | Provide grouped interview questions | High | Interview prep | Both | Expandable |
| How to win feature block | Turn analysis into execution guidance | High | End of interview prep | Both | Text-first with callouts |
| Release mode / quality banner | Explain release state honestly | Medium | Opening and credibility layer | Skim-first | Compact |
| Inference / evidence legend | Explain labels and boundaries | Medium | Credibility layer | Deep | Compact |
| Expandable show evidence drawer | Let users inspect citations and support | High | Attached to major modules | Deep | Expandable |

Visual-system rules:
- modules must organize information, not decorate text
- dense modules should pair a short interpretive headline with compact supporting detail
- expandable modules should default open only when they are decision-critical or short enough to scan
- visual modules should be used to reduce prose burden, not to hide thin evidence

#### 8.7 Composition style patch
Composition must optimize for:
- premium narrative flow
- layered insight
- stronger company storytelling
- richer role-relevant interpretation
- better transitions across modules
- clearer what-this-means-for-you implications
- vivid but disciplined language
- non-boring presentation
- strategic usefulness

Writer requirements:
- synthesize company information into an interview-relevant story
- preserve nuance and uncertainty
- include more what-this-means-for-the-candidate interpretation at the end of major company and role modules
- avoid dry encyclopedia summaries
- avoid flat compliance wording
- avoid generic corporate boilerplate
- preserve useful richness even when certainty is imperfect
- use modules to break up density and create editorial pacing

Style rules by content type:
- summaries should read like an investment-quality briefing note, not a recap of sections
- insight callouts should sound decisive, specific, and consequence-oriented
- culture and sentiment should be phrased as operating signals or candidate-prep texture, not verdicts
- low-confidence texture should be disclosed plainly without stripping out why it may still matter

#### 8.8 Quality-gate correction for richness
The gate must distinguish carefully between unsupported fluff and honest, useful richness.

Definitions:
- unsupported fluff: polished language with no meaningful evidence, no real implication, or invented precision
- weak but useful inference: directionally helpful synthesis built from partial evidence, explicitly labeled and bounded
- lower-confidence but decision-useful texture: bias-prone or anecdotal pattern synthesis that helps candidate prep when clearly labeled and subordinated to stronger evidence
- rich company context: grounded narrative depth about company history, strategy, culture, and operating implications that materially improves candidate understanding
- shallow generic filler: broad, transferable company or interview language with low role relevance and no sharp consequence
- premium narrative section with explicit uncertainty: a section that is strategically useful, clearly labeled, and honest about what is inferred or missing

Gate rules:
- company history, culture, values, and sentiment sections may survive when they are useful, clearly labeled, and role-relevant
- visual modules may remain when based on mixed-confidence content if the uncertainty is visible and the module remains informative
- richness should be rewarded when it is honest, relevant, and helpful
- the gate must not flatten sections merely because they are not deeply quantitative
- suppress only low-value, low-signal, misleading, or faux-precise content

Release-survival rules:
- premium_full may keep rich company history, values, leadership, culture, and momentum sections when official evidence is sufficient and implications are sharp
- inference_visible_full may keep mixed-confidence culture, employee sentiment, and interpretive timeline or tension modules when labels and warning notes are explicit
- downgrade sections that are useful but materially uncertain from premium_ready to usable_with_caution or below_premium_threshold rather than suppressing them automatically
- suppress sections when they are anecdote-led, generic, platform-skewed, misleading, or too thin to help a candidate make a better decision

What this means for the candidate requirement:
- every major company-intelligence subsection that survives must either contain or roll up into an explicit candidate implication block
- candidate implications must explain why the detail matters for pursuit decision, narrative positioning, likely interview themes, or questions to ask

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

### 18. Wrong-archetype corrective patch
This corrective patch addresses a specific failure class: the system can misclassify a senior technical product role as executive or quasi-engineering, then compound the error through fit scoring, section logic, evidence labeling, and interview-prep generation.

#### 18.1 Failure diagnosis in system terms
Treat the following as first-class system failures, not cosmetic misses:

1. Persona inference failure
- If a role like `Lead Product Manager, In-App Recording (Safety)` is labeled `Product · Platform + Executive / GM / C-Level`, the system is materially wrong.
- This JD describes a senior technical product role, not a GM or C-level mandate.

2. Seniority and job-family interpretation failure
- Leadership language in a JD must not be over-read as executive business ownership.
- The system must distinguish lead PM, senior PM, and manager-level PM expectations from executive mandate, P&L, or org-design authority.

3. Candidate-fit scoring failure
- A weak fit score is not credible when the resume shows strong technical product leadership, scale, experimentation rigor, cross-functional leadership, PM leadership, trust-sensitive product context, or global rollout experience.
- The system must not let missing direct media or recording experience dominate the overall score unless the JD makes that experience central and non-transferable.

4. Evaluation-criteria failure
- The system must not compare the candidate to an imagined domain-native specialist archetype when the JD does not require that bar.
- Fit must be scored against the actual JD plus realistic transferability, not against a hypothetical perfect incumbent.

5. Section-logic failure
- Each section must answer its own question.
- Company Momentum must not become product-area commentary.
- Org Clarity must not become role-mandate commentary.
- Execution Risk must not become guessed interview-loop structure.

6. Invented-specificity failure
- Unsupported specifics such as exact budget levels, named executive visibility, exact first-90-day deliverables, guessed interview-loop structure, or policy buy-in mechanics must not appear as confident output.

7. Interview-prep generation failure
- Senior technical PM roles must not be converted into engineering interviews.
- The system must prioritize tradeoff framing, privacy/trust/product judgment, rollout logic, adoption strategy, regional or legal variation, experimentation, cross-functional leadership, and product requirements under constraints.

8. Internal consistency failure
- Contradictions such as weak evidence but strong evidence labels, wrong persona but passing persona QA, or high confidence on mostly inferred sections must be impossible in a released artifact.

Hard conclusion:
- The failure is not that some sections were thin.
- The failure is that the system reasoned from the wrong role archetype and then reinforced that mistake downstream.

#### 18.2 Correct persona and seniority interpretation rules
Add the following hard rules for role interpretation:
- `Lead Product Manager` does not imply executive, GM, VP, or business-unit leadership by default.
- Leadership language in a PM JD does not imply P&L ownership, executive mandate, org design authority, or CEO-level visibility.
- Strong technical-partnership language does not convert a PM role into an engineering archetype.
- A PM role with trust, safety, privacy, platform, or regulatory depth is still a PM role unless the JD assigns architecture ownership or engineering deliverable authority directly.
- Preferred domain experience must not dominate persona or fit inference unless the JD treats it as central and non-transferable.

Persona correction heuristics for senior technical PM roles:
- classify as Product when the JD centers prioritization, tradeoffs, product requirements, cross-functional leadership, adoption, experimentation, roadmap judgment, launch judgment, or user and business outcomes
- classify as Engineering only when the JD centers architecture ownership, implementation authority, deep system design evaluation, direct technical execution, or explicit engineering-manager expectations
- classify as Executive only when the JD shows business-unit ownership, portfolio authority, org-design authority, P&L logic, resourcing authority, or executive-level enterprise mandate
- treat safety, trust, privacy, compliance, or regional-variation context as domain modifiers, not job-family switches

Seniority correction rules:
- lead PM language should usually map to senior IC, staff-plus PM, or manager-adjacent PM rather than executive
- require people-management evidence before assigning manager-or-above leadership proof expectations
- require business ownership or organizational authority evidence before assigning executive proof expectations
- if the JD emphasizes influence, ambiguity handling, and cross-functional leadership without people management or business-unit ownership, prefer senior IC / lead PM interpretation

#### 18.3 Correct evaluation-bar selection and fit model
Candidate fit must be scored on a multi-factor model instead of a single vague specialist bar.

Required fit dimensions:
1. core PM leadership fit
2. technical fluency fit
3. domain adjacency fit
4. scale and complexity fit
5. cross-functional and organizational fit
6. people-leadership fit
7. risk, trust, privacy, or compliance adjacency fit
8. direct domain-specialist fit

Default weighting for senior technical PM roles:
- core PM leadership fit: 0.24
- technical fluency fit: 0.16
- domain adjacency fit: 0.10
- scale and complexity fit: 0.14
- cross-functional and organizational fit: 0.12
- people-leadership fit: 0.06
- risk, trust, privacy, or compliance adjacency fit: 0.10
- direct domain-specialist fit: 0.08

Weighting rules:
- direct domain-specialist fit matters more only when the JD makes domain-native pattern recognition central, repeated, and non-transferable
- transferable strengths should outweigh missing direct domain experience when the role is still fundamentally a PM leadership role with learnable domain specifics
- people-leadership fit should stay low unless the JD explicitly requires direct reports, hiring, coaching, or management-system ownership
- risk, trust, privacy, legal, or compliance adjacency should increase when the product area is safety, trust, identity, health, finance, or regulated workflow

Low-fit guardrail:
- if the final fit score is low, the system must explain why strong adjacent experience does not transfer
- if it cannot explain non-transferability convincingly, the score must be revisited before release

#### 18.4 Section-category integrity rules
Each scored section must answer only its own question.

Hard rules:
- Company Momentum must reflect company, business, or product-portfolio trajectory, not just one local feature area
- Org Clarity must describe reporting clarity, structural ambiguity, ownership clarity, or stakeholder-map reliability
- Role Leverage must explain actual leverage points, decision rights, and influence paths, not vague possibility language
- Execution Risk must focus on product, organizational, operational, regulatory, or rollout risk, not guessed interview mechanics

Every strategy section must explicitly separate:
- directly supported facts
- reasonable role inferences
- unresolved unknowns
- why the uncertainty matters for candidate decision-making

#### 18.5 Invented-specificity suppression rules
The system must not present the following as confident output unless directly supported:
- exact budget numbers or cost bands for the role area
- named executive visibility beyond what the JD or sources indicate
- exact first-90-day or year-1 deliverables
- exact interview-loop count or composition
- specific policy or legal approval flows
- specific architecture choices or infra constraints

Allowed behavior:
- the system may state bounded hypotheses only when clearly labeled as inference and accompanied by what evidence is missing

Disallowed behavior:
- using polished prose to turn weak inference into apparent fact

#### 18.6 Candidate-fit reasoning patch
The candidate-fit layer must look explicitly for:
- high-scale consumer or platform product leadership
- technical product fluency
- experimentation and measurement rigor
- platform or systems thinking
- cross-functional leadership in complex organizations
- trust, privacy, safety, risk, or compliance-adjacent work
- global or multi-region rollout experience
- PM team leadership where relevant
- executive communication and operating cadence

The system must distinguish:
- true hard gaps
- bridgeable gaps
- overblown gaps
- adjacent strengths that map strongly

Hard rule:
- lack of direct media or recording experience must not collapse fit to weak when adjacent scale, technical PM, experimentation, rollout, trust, and cross-functional leadership evidence is strong

Required candidate-fit outputs:
- strengths that materially matter to the hiring bar
- gaps that truly matter
- honest bridge narratives
- likely interviewer objections
- rebuttals that do not rely on pretending to be a domain-native specialist

#### 18.7 Technical PM interview-prep rules
For senior technical PM roles, interview prep must distinguish:
- technical fluency expected of a PM
- product judgment expected of a PM
- cross-functional leadership expected of a PM
- trust, privacy, safety, or regulatory judgment
- experimentation, rollout, adoption, and regional-variation strategy
- honest domain-learning plans versus fake subject-matter mastery

The interview-prep generator must emphasize:
- tradeoff framing
- product requirements under constraints
- privacy, trust, and user-experience judgment
- rollout strategy under legal or regional complexity
- adoption, measurement, and product value
- cross-functional influence under ambiguity
- honest bridging into an unfamiliar technical subdomain

Hard rules:
- do not invent an interview-loop structure unless explicitly supported
- do not assume codec, deep media-architecture, or engineering-specialist mastery is required unless the JD strongly signals it
- do not over-index on architecture whiteboarding for PM roles
- do not tell the candidate to fake mastery of a domain they do not have
- `how to win` must emphasize credible bridging, not domain cosplay

#### 18.8 Internal consistency requirements
The following contradictions must be impossible at release:
- evidence quality below premium minimum plus strong evidence labels
- persona QA pass plus clearly wrong persona classification
- high confidence on mostly inferred sections
- low fit score with rationale that still shows broad strong transferability
- partial or downgraded release with section labels that imply premium certainty

Required consistency checks:
- persona versus JD alignment
- fit score versus supporting rationale
- evidence strength versus quality gate
- confidence versus inference ratio
- section label versus evidence type
- release state versus section quality states

Required reactions:
- if persona QA fails, release must reflect it
- if a critical section is mostly inference, confidence must be capped
- if fit is low, rationale must explicitly show non-transferability
- if evidence is weak, language must soften accordingly

### 14. Why premium still needs a quality, depth, and prompt-improvement control plane
Premium cost buys more retrieval and stronger reasoning. It does not automatically buy a premium outcome.

The report must earn release. A report is not done when text exists. It is done when the text is credible, deep enough, persona-correct, interview-useful, and honest about what it does not know.

Three additional layers are mandatory:
- quality evaluation layer: determines whether the report is good enough to show
- depth evaluation layer: determines whether the report contains real insight rather than polished summary
- prompt-improvement layer: determines whether recurring weak patterns are a one-off execution miss or evidence that the prompt system is under-specifying the desired behavior

Failure modes that still occur in a strong premium pipeline:
- enough sources but the wrong sources, such as broad press and SEO summaries instead of role-relevant primary material
- good sources but shallow synthesis, where the report restates facts without extracting implications
- correct persona inference but generic interview prep that could transfer unchanged to another role family
- deep company strategy but weak role strategy, so the candidate still does not know what this hiring team needs
- deep role strategy but weak how-to-win guidance, so the analysis does not convert into interview advantage
- evidence-rich sections mixed with unsupported sections, creating a false sense of consistency
- blended persona reports that become incoherent, duplicative, or overly broad
- overconfident wording despite thin evidence or unresolved contradictions
- repetitive sections despite good source depth, which wastes premium attention and premium cost
- high spend on a mediocre report because the system never checks whether the expensive output was actually useful
- structurally complete report with insufficient insight depth, meaning every section exists but too many sections remain first-order summaries
- weak company-context coverage even when company data is available
- missing mission, values, culture, history, or employee-sentiment analysis even when those signals could materially improve candidate preparation
- evaluator detects repeated weakness patterns but the prompt system never improves, so the same expensive mistakes recur

Hard rule:
- premium cost alone never justifies premium release
- polished nonsense must not ship
- structurally complete but shallow output is still a failed premium report

### 15. Required premium company-context layer
The report must include a Company Context layer near the front of the report, immediately after the 5-minute brief or folded into the earliest strategy segment if the presentation plan renames sections by persona.

The Company Context layer exists to answer: what kind of company is this really, what operating reality is the candidate stepping into, and what does that reality imply for the role and interview process.

Hard rules:
- company context must be role-relevant, not generic background filler
- official sources outrank commentary sources
- employee reviews are supporting texture only and must never dominate conclusions
- when evidence is weak, suppress the subsection instead of padding with generic company-description prose

#### 15.1 Source priority for company context
Priority order:
1. official company site, about pages, newsroom, product pages, career pages
2. leadership pages, founder letters, shareholder letters, investor materials, earnings calls, annual letters
3. official values pages, leadership-principles pages, culture pages, handbooks, engineering or design or product blogs
4. credible leadership interviews, conference talks, long-form podcasts, reputable profiles
5. lower-confidence supporting texture from employee-review platforms such as Glassdoor, Comparably, Blind, and similar sources

Employee-review handling rules:
- use only as a synthesis input for recurring themes and tradeoffs
- label as lower-confidence and bias-prone
- never treat employee sentiment as ground truth
- never let employee reviews override strong primary evidence

#### 15.2 Key Company Insights
Objective:
- identify what matters most about the company for a candidate entering interviews now
- explain business reality, current momentum, pressure points, strategic interest, and what the candidate must understand quickly

Priority source types:
- investor materials, leadership commentary, official launches, product pages, pricing pages, recent company announcements

Evidence threshold:
- at least 3 relevant sources
- at least 2 primary sources when available
- at least 1 recent source when the company is changing quickly

Good output:
- crisp interpretation of the company’s current strategic reality and why that matters for the target role
- identifies the few truths the candidate should carry into every interview round

Shallow output:
- generic company overview, funding recap, or market cliché with no role implication

Suppress if weak:
- strategic momentum claims without fresh evidence
- pressure-point claims that rely only on crowd sentiment or undated press

#### 15.3 Company History / Evolution
Objective:
- explain the company’s evolution, major shifts, pivots, product or business changes, and why the current shape matters for the role

Priority source types:
- founder letters, investor decks, official timeline pages, leadership interviews, reputable historical profiles

Evidence threshold:
- at least 2 sources
- at least 1 primary or near-primary source

Good output:
- brief but consequential history tied to why the company operates the way it does now

Shallow output:
- founding year plus funding milestones plus acquisitions with no interpretation

Suppress if weak:
- pivot narratives that cannot be supported by credible sources
- false causality about why one historical shift created the current role unless the link is defensible

#### 15.4 Mission / Vision / Stated Purpose
Objective:
- explain what the company says it values and how that stated mission connects to the role
- distinguish rhetoric from operationally relevant signal when evidence allows

Priority source types:
- official mission pages, annual letters, leadership interviews, values pages, earnings or investor commentary

Evidence threshold:
- at least 2 supporting sources
- at least 1 official source

Good output:
- interprets mission language in operational terms and shows how it may appear in interviews

Shallow output:
- copying the mission statement with no interpretation

Suppress if weak:
- claims that the mission is truly lived when there is no credible operating evidence
- cynical dismissal of mission statements without evidence

#### 15.5 Leadership Principles / Values / Operating Principles
Objective:
- identify official principles, infer which ones are operationally real, and explain how they may surface in interviews

Priority source types:
- values pages, leadership-principles pages, company handbooks, leadership talks, public management writing

Evidence threshold:
- at least 2 sources
- at least 1 official source

Good output:
- names the principles, interprets how they shape hiring signals, and distinguishes decorative values from operative ones where evidence supports that distinction

Shallow output:
- list of values with no behavioral interpretation

Suppress if weak:
- claims that a value is decorative or fully operational without corroborating signal

#### 15.6 Work Culture
Objective:
- describe work style, decision cadence, speed versus rigor, autonomy versus centralization, collaboration expectations, and quality bar

Priority source types:
- leadership commentary, team blogs, engineering or design writing, handbooks, operating-principle pages, lower-confidence employee-review texture

Evidence threshold:
- at least 3 signals
- at least 1 primary source
- employee-review themes must be corroborative, not dominant

Good output:
- surfaces plausible cultural tradeoffs that would matter in interviews and in day-to-day work

Shallow output:
- vague statements such as fast-paced, collaborative, innovative, high-bar, customer-focused

Suppress if weak:
- culture claims based only on employee-review platforms
- sweeping claims about management quality or burnout risk without cross-source support

#### 15.7 Employee Review Synthesis
Objective:
- synthesize recurring positive and negative themes, likely tradeoffs, source bias, and how a candidate should use this information intelligently without over-trusting it

Priority source types:
- Glassdoor, Comparably, Blind, Reddit, and similar sources only as low-confidence supporting material

Evidence threshold:
- recurring theme across multiple review sources or repeated pattern over time
- never sufficient on its own for a high-confidence section

Good output:
- cautious synthesis of recurring themes, clear note on bias, and clear advice on how to use the signal in prep

Shallow output:
- cherry-picked anecdotes or sensational complaints

Suppress if weak:
- low-volume anecdotes
- emotionally charged claims with no recurrence
- claims that employee sentiment proves strategic or managerial truth

### 16. Quality framework
The report must be scored across the following dimensions. Each dimension is scored 0 to 100, where 50 means marginally usable, 70 means premium minimum for that dimension, 85 means strong premium quality, and 90+ means unusually strong.

#### 16.1 Source Quality
What it means:
- authority, freshness, primary-source coverage, source diversity, and role relevance

How to score:
- start from source authority and freshness
- raise the score when primary sources and role-relevant sources dominate
- lower the score when source mix is broad but low-authority or not role-relevant

High quality looks like:
- primary-source-first evidence with fresh, role-relevant coverage and adequate diversity

Failure looks like:
- enough sources but wrong sources, stale sources, or source diversity without authority

#### 16.2 Evidence Quality
What it means:
- citation density, section coverage, contradiction handling, fact versus inference hygiene, and absence of unsupported claims

How to score:
- score per section first, then aggregate
- penalize unsupported claims, unlabeled inference, and contradiction blindness heavily

High quality looks like:
- clear evidence states, healthy citation density, and honest handling of ambiguity

Failure looks like:
- overconfident synthesis, evidence-poor sections, or unsupported claims hidden in polished prose

#### 16.3 Strategy Depth
What it means:
- quality of company strategy, business model interpretation, competitor analysis, role strategy, and strategic tension analysis

How to score:
- reward second-order reasoning, tradeoff identification, and role-linked interpretation
- penalize summary-only analysis and JD restatement

High quality looks like:
- explains what matters, why it matters, and how it changes the candidate’s read on the role

Failure looks like:
- generic SWOT, superficial competitor lists, or role strategy that reads like expanded requirements bullets

#### 16.4 Company Context Quality
What it means:
- usefulness and depth of company insights, history, mission or vision interpretation, values analysis, culture analysis, employee-review synthesis, and role relevance

How to score:
- reward interpretive usefulness and role linkage
- penalize filler, copied mission language, fluffy culture prose, or employee-review overreach

High quality looks like:
- gives the candidate a usable mental model of the company they are walking into

Failure looks like:
- generic background section that could appear in any company report

#### 16.5 Persona Accuracy
What it means:
- correctness of role family, seniority, blended-persona handling, and persona-specific emphasis

How to score:
- score the inferred persona package and then score whether the report actually behaves like that persona

High quality looks like:
- the reading order, proof model, objections, and interview logic all fit the role family and level

Failure looks like:
- correct label but wrong substance, or blended-persona mush

#### 16.6 Interview Prep Quality
What it means:
- usefulness of interviewer agenda map, story mapping, objections, mock questions, how-to-win guidance, and specificity by role family and seniority

How to score:
- reward interviewer-specific proof logic and candidate-usable scaffolding
- penalize generic coaching and abstract advice

High quality looks like:
- a real candidate could rehearse from it and materially improve performance

Failure looks like:
- generic interview questions, weak answer criteria, or evidence-free how-to-win advice

#### 16.7 Coherence and Non-Redundancy
What it means:
- section differentiation, narrative coherence, and absence of filler repetition or contradiction

How to score:
- reward clean section boundaries and cumulative narrative logic
- penalize repeated claims, contradictory claims, and blended-role incoherence

High quality looks like:
- each section answers a distinct question and builds on earlier sections

Failure looks like:
- multiple sections saying the same thing in different words

#### 16.8 Actionability
What it means:
- whether the report improves candidate decision quality and interview readiness

How to score:
- reward concrete implications, priority signals, and usable next moves
- penalize analysis that is technically correct but not decision-useful

High quality looks like:
- the candidate can change preparation behavior immediately after reading it

Failure looks like:
- informational but inert analysis

#### 16.9 Premium Polish
What it means:
- executive-quality writing, concise high-signal presentation, proper suppression of weak sections, and premium reading experience by persona

How to score:
- reward compression after insight exists
- penalize filler, awkward tone, or cosmetic polish hiding weak analysis

High quality looks like:
- polished, sharp, and restrained

Failure looks like:
- polished but empty

#### 16.10 Depth Quality
What it means:
- whether major sections go beyond surface summary, contain second-order insight, convert evidence into implications, and avoid template feel

How to score:
- reward implication density, tradeoff reasoning, and interview advantage creation
- penalize checklist output and description without interpretation

High quality looks like:
- premium rather than template-generated

Failure looks like:
- content that describes but does not interpret, or summarizes but does not create interview advantage

### 17. Quality scoring model
The system must score:
- overall report quality
- section quality
- persona quality
- interview-prep quality
- evidence quality
- company-context quality
- depth quality
- readiness to release

#### 17.1 Weighted dimensions
Default premium weighting:
- Source Quality: 10
- Evidence Quality: 14
- Strategy Depth: 16
- Company Context Quality: 10
- Persona Accuracy: 10
- Interview Prep Quality: 14
- Coherence and Non-Redundancy: 8
- Actionability: 8
- Premium Polish: 4
- Depth Quality: 6

Overall quality score:
- weighted sum on a 0 to 100 scale

Readiness-to-release score:
- overall score adjusted downward by unresolved critical weaknesses, hard-fail flags, and section suppressions

#### 17.2 Mandatory minimums and floors
Full premium release requires:
- overall quality score at or above 82
- readiness-to-release score at or above 80
- Evidence Quality at or above 72
- Strategy Depth at or above 74
- Interview Prep Quality at or above 74
- Persona Accuracy at or above 75
- Company Context Quality at or above 70 when company-context evidence is available
- Depth Quality at or above 72

Full release with warnings requires:
- overall quality score at or above 78
- no hard-fail condition
- no more than one critical dimension in the 68 to 71 range
- all weak sections explicitly labeled or suppressed

Partial release requires:
- overall quality score at or above 68
- no hard-fail condition that makes the report misleading
- weak sections suppressed or downgraded
- explicit user-facing warnings and partial-state labeling

Blocked release:
- any hard-fail condition that makes the report unreliable, misleading, or too shallow for premium presentation

#### 17.3 Hard-fail conditions
Hard fail if any of the following are true:
- unsupported claims remain in decision-critical sections
- persona confidence is low and the report still uses high-precision persona-specific guidance
- company strategy, role strategy, or interview prep falls below 60
- depth quality falls below 60
- blended persona output is incoherent or contradictory
- the report contains polished filler instead of honest suppression in evidence-poor critical sections

#### 17.4 Soft-fail conditions
Soft fail if any of the following are true:
- competitor analysis is thin but not misleading
- company context is useful but incomplete
- redundancy is noticeable but not confusing
- one repair loop would likely raise a weak section above threshold

#### 17.5 Critical section dependencies
Critical dependency rules:
- excellent prose cannot compensate for weak evidence
- excellent company strategy cannot compensate for weak interview prep
- high source count cannot compensate for poor persona fit
- broad company context cannot compensate for shallow role strategy
- complete section coverage cannot compensate for weak depth

#### 17.6 Persona and seniority weighting adjustments
Role family emphasis adjustments:
- Engineering, Data / ML, and Design increase the weight of role strategy and interview-prep craft checks
- Executive and director-plus roles increase the weight of company strategy, company context, and stakeholder-power interpretation
- GTM and Marketing increase the weight of competitor, messaging, and buyer-motion interpretation

Seniority adjustments:
- IC roles increase weight on craft, execution realism, and interviewer proof clarity
- manager roles increase weight on delivery-through-others and leadership credibility
- director and above increase weight on mandate reconstruction, stakeholder map quality, strategic tensions, and decision quality

Blended-persona scoring:
- primary persona controls the score spine
- secondary persona contributes only if it materially changes strategy, interview prep, or role interpretation
- blended reports receive a coherence penalty if the secondary persona expands breadth without increasing candidate usefulness

### 18. Release gating logic
Release states:
- approved
- approved_with_warnings
- partial
- suppress_and_release
- reretrieve
- resynthesize
- depth_repair
- prompt_improvement_recommended
- blocked

Failure mode actions:
- weak primary-source coverage: targeted re-retrieval before release; suppress strategy claims that depend on missing primary evidence
- thin competitor analysis: targeted competitor retrieval or suppress the weak competitor block
- poor company context: targeted company-context retrieval; if unavailable, suppress weak subsections and label the context as partial
- poor role strategy: stronger synthesis re-run using mandate, leverage, and stakeholder evidence only
- generic interview prep: interview-prep re-synthesis on stronger reasoning model with persona and interviewer-proof constraints
- low persona confidence: persona recheck; if still low, lower precision and mark persona ambiguity explicitly
- incoherent blended persona output: suppress the secondary persona or rebuild the blended synthesis once; block if coherence does not recover
- excessive redundancy: redundancy repair loop; if repeated, lower release score and log prompt weakness
- unsupported claims: remove or suppress; block if they remain in critical sections
- strategy sections below threshold: stronger synthesis re-run, then suppress if still weak
- interview-prep sections below threshold: repair loop mandatory before premium release
- company-context sections below threshold: suppress the weak company-context subsection unless it is necessary for the role thesis, in which case targeted retrieval is mandatory
- depth below premium threshold: trigger depth-repair loop; release partial only if the report is still honest and useful

When to suppress sections:
- evidence threshold missed and repair is unlikely to fix quickly
- section is not required for minimum trust and can be omitted without misleading the candidate

When to re-run retrieval:
- missing primary sources for strategy, company-context, or values or culture claims
- missing competitor evidence in a contested category
- missing company-history or leadership-principles evidence when those claims are central to the role thesis

When to re-run synthesis:
- evidence exists but the section is shallow, generic, repetitive, or not persona-specific

When to escalate to a stronger model:
- first synthesis pass fails depth, company-context interpretation, interviewer-proof specificity, or blended-persona coherence

When to mark partial:
- enough trustworthy material exists to help the candidate, but one or more important sections remain incomplete after allowed repair loops

When to show user-facing warnings:
- evidence gaps remain in important but non-fatal sections
- persona ambiguity remains after recheck
- employee-review synthesis is included with low confidence
- company-context layer is partial or suppressed

When to block release entirely:
- polished nonsense risk remains
- critical sections remain unsupported or too shallow after repair attempts
- persona fit remains too uncertain to trust the prep guidance

Hard rule:
- do not release polished nonsense
- if the report is incomplete, shallow, or partially untrustworthy, say so explicitly

### 19. Quality testing and continuous prompt-upgrade framework
The system must improve over time rather than repeating expensive mistakes.

#### 19.1 Content-quality and depth testing
Maintain a golden set of benchmark jobs across:
- all supported role families
- all seniority bands
- blended personas
- public and private companies
- strong-company-context and weak-company-context cases

Each benchmark run must score:
- content depth
- specificity
- usefulness
- interview advantage
- evidence hygiene
- persona fit
- section distinctness

#### 19.2 Regression and governance
Every prompt change must be tested against:
- golden set score deltas
- blocked-release rate
- partial-release rate
- repair-loop rate
- cost versus quality uplift
- persona-specific regressions
- company-context regressions

Human review triggers:
- repeated blocked releases for the same persona cluster
- repeated company-context weakness where evidence was available
- rising repair-loop cost without score improvement
- evaluator disagreement across runs on the same benchmark

Prompt-upgrade governance rules:
- modify master prompt when failures are broad and cross-sectional
- modify retrieval prompting when evidence classes are repeatedly missing
- modify synthesis prompting when evidence exists but interpretation stays generic
- modify evaluator prompts when weak reports are passing or strong reports are being over-penalized
- avoid prompt drift by versioning prompt changes, running regressions, and capping prompt complexity growth unless quality uplift is clear

#### 19.3 Aggregation and prioritization
Aggregate evaluator outputs across runs by:
- role family
- seniority
- blended persona pair
- company-context subsection
- failure mode
- repair action taken
- cost spent before release outcome

Use this to answer:
- are reports getting better over time
- which personas still underperform
- which sections remain shallow
- whether company history, mission, values, culture, and employee-review synthesis are improving or staying generic
- whether prompt changes reduce cost waste and improve release quality

### 20. Final priorities
Highest-leverage improvements:
1. make release contingent on evidence and depth, not text completion
2. add a required company-context layer near the front of the report
3. score company context separately from company strategy
4. require section-level suppression instead of filler
5. require a dedicated depth score with hard floors
6. force persona accuracy to affect release, not just metadata
7. make interview-prep quality a critical release dimension
8. add targeted repair loops instead of unconditional full reruns
9. separate evaluator prompts from generator prompts
10. add strict anti-pattern detection for generic output
11. log blocked-release reasons and warning flags
12. track repair-loop cost separately from first-pass generation cost
13. log prompt-improvement recommendations when failure patterns recur
14. benchmark company-context quality across companies and personas
15. require prompt-governance discipline so the system learns without drifting into prompt sprawl

Trust failures that would still break the product:
1. polished unsupported claims in critical sections
2. wrong persona with confident interview guidance
3. shallow how-to-win advice presented as premium insight
4. generic company context presented as role-relevant analysis
5. repeated expensive low-quality runs with no prompt-system response

Most important hard-fail conditions:
1. unsupported claims in decision-critical sections
2. critical depth score below premium minimum
3. persona mismatch that changes interview-prep logic
4. incoherent blended-persona report
5. unresolved evidence weakness in company strategy, role strategy, or interview prep

Most important company-context quality failures:
1. generic company background with no role implication
2. mission or values copied without interpretation
3. culture summary built from fluff or stereotype
4. employee-review overreach
5. missing company history, mission, values, or culture despite available evidence

Most important audit loops:
1. evidence coverage plus unsupported-claims audit
2. strategy-depth plus company-context depth audit
3. release-gate plus prompt-improvement feedback audit

Most important prompt-system changes:
1. distinct evaluator prompts with strict internal-review behavior
2. explicit company-context writing and suppression instructions
3. explicit prompt-improvement recommender for recurring failures

Most important telemetry additions:
1. quality, depth, and company-context scores by run and by section
2. release decision, warning flags, and blocked-release reasons
3. repair-loop and prompt-improvement-analysis cost tracking

Most important continuous-improvement mechanisms:
1. golden-set regression testing across personas and blended roles
2. aggregated evaluator failure-pattern analysis across runs
3. controlled prompt-upgrade governance with cost-versus-quality review

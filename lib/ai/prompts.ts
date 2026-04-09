import { RetrievalContext } from "@/lib/types";

function formatChunks(context: RetrievalContext): string {
  return context.chunks
    .map(
      (c, i) =>
        `[SOURCE ${i + 1}] ${c.source_title} (${c.source_type})\n${c.text}`
    )
    .join("\n\n---\n\n");
}

/**
 * Single comprehensive prompt that generates the full structured report
 * in one LLM call. This gives the model full cross-section awareness
 * and avoids contradictions between sections.
 */
export function getFullReportPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  profileContext: string | undefined
): string {
  const jdSection = jobDescription
    ? `\n\nJOB DESCRIPTION (full text):\n${jobDescription}`
    : "";

  const profileSection = profileContext
    ? `\n\nCANDIDATE PROFILE / CONTEXT:\n${profileContext}`
    : "";

  return `You are an elite interview-prep analyst for senior product, strategy, and general management candidates at Director+ and VP level. Your job is to synthesize company intelligence, role context, and strategic signals into a high-quality prep brief that a sharp candidate can use to enter the interview room confident and well-positioned.

COMPANY: ${companyName}
ROLE: ${roleTitle}${jdSection}${profileSection}

EVIDENCE FROM PUBLIC SOURCES (${context.chunks.length} chunks):
${formatChunks(context)}

---

YOUR TASK: Produce a complete structured intelligence brief. You must:

1. Ground every claim in evidence. Distinguish FACT (directly evidenced), INFERENCE (reasonably derived), and HYPOTHESIS (speculative but plausible).
2. Optimize for interview decision-making, not generic completeness. Every section must answer "so what for the candidate?"
3. Be decisive. State your judgment. Do not hedge behind disclaimers.
4. Avoid repeating the same insight across sections. Each section must add unique value.
5. Use crisp, specific language. No filler phrases. No boilerplate.
6. SWOT quadrants must contain a minimum of 5 distinct, non-obvious points each.
7. Questions must be executive-caliber — specific, diagnostic, and difficult to deflect.
8. The interview_decision_summary and five_minute_brief must be written last, synthesizing everything above. They must be concise, decisive, and immediately actionable.

---

RETURN A SINGLE VALID JSON OBJECT matching this exact schema. Do not include any text outside the JSON.

{
  "executive_summary": {
    "recommendation": "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal",
    "recommendation_rationale": "<2-3 sentences — the decisive core reason. State your actual view.>",
    "key_bullets": ["<5-7 highest-signal insights — specific, non-obvious, candidate-relevant>"],
    "pursuit_stance": "<pursue aggressively | pursue selectively | proceed cautiously | avoid>"
  },

  "assessment_snapshot": {
    "company_momentum": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence — what specific signal drives this score?>",
      "confidence": "high" | "medium" | "low"
    },
    "org_clarity": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence>",
      "confidence": "high" | "medium" | "low"
    },
    "role_leverage": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence — what makes this role high or low leverage?>",
      "confidence": "high" | "medium" | "low"
    },
    "execution_risk": {
      "score": <1-10, where 10 = highest risk>,
      "label": "Low" | "Medium" | "High",
      "rationale": "<1 sentence — what is the specific risk?>",
      "confidence": "high" | "medium" | "low"
    },
    "candidate_role_match": {
      "score": <1-10> | null,
      "label": "Strong" | "Mixed" | "Weak" | "NOT_ASSESSED",
      "rationale": "<1 sentence — if no profile, use: 'No resume provided. Upload your resume for a real fit assessment.'>",
      "confidence": "high" | "medium" | "low" | "none"
    },
    "evidence_strength": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence on evidence quality and what is missing>",
      "confidence": "high" | "medium" | "low"
    }
  },

  "strategic_bet_analysis": {
    "classification": "Strategic Core Bet" | "Important Enabler" | "Opportunistic Build" | "Tactical Fill" | "Unclear",
    "confidence": "high" | "medium" | "low",
    "why_we_believe_this": ["<3-5 evidence-backed reasons for this classification — be specific>"],
    "supporting_evidence": ["<2-4 concrete signals from the evidence that support this>"],
    "what_could_disprove": ["<2-3 things that would change or weaken this classification>"],
    "candidate_implication": {
      "scope_impact": "<what this classification means for the scope of the role — honest assessment>",
      "visibility": "<expected visibility with senior leadership — will this person be seen?>",
      "career_upside": "<realistic career upside if successful — be specific, not generic>",
      "interview_adaptation": "<how the candidate should adapt their pitch given this classification>"
    }
  },

  "likely_interview_agenda": {
    "dimensions": [
      {
        "dimension": "<e.g. Domain Credibility | Strategic Judgment | Scale & Execution | Cross-functional Influence | AI/Platform Relevance | Ambiguity Handling>",
        "what_they_validate": "<what the interviewer is trying to confirm — specific to this role>",
        "what_they_worry_about": "<the specific concern they likely hold — be honest>",
        "proof_needed": "<what evidence or story would satisfy them>",
        "what_to_demonstrate": "<concrete behavior or framing the candidate should show>"
      }
    ]
  },

  "questions_to_ask": {
    "must_ask": [
      {
        "question": "<executive-quality question — specific, not generic>",
        "why_it_matters": "<what this reveals about the role, company, or team>",
        "strong_answer": "<what a confident, clear answer sounds like>",
        "weak_answer": "<what a vague, defensive, or concerning answer sounds like>",
        "follow_up": "<optional — a follow-up that goes deeper if the first answer is strong>"
      },
      {
        "question": "<must-ask question 2>",
        "why_it_matters": "",
        "strong_answer": "",
        "weak_answer": "",
        "follow_up": "<optional>"
      },
      {
        "question": "<must-ask question 3>",
        "why_it_matters": "",
        "strong_answer": "",
        "weak_answer": "",
        "follow_up": "<optional>"
      }
    ],
    "good_questions": [
      {
        "question": "<good additional question 1>",
        "why_it_matters": "",
        "strong_answer": "",
        "weak_answer": ""
      },
      { "question": "<good question 2>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 3>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 4>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 5>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" }
    ]
  },

  "risks_red_flags": [
    {
      "flag": "<concise risk name>",
      "signal": "<specific evidence or pattern that triggered this — not generic>",
      "severity": "high" | "medium" | "low",
      "impact": "<what this concretely means for someone taking this role>"
    }
  ],

  "unknowns_to_validate": {
    "unknowns": [
      {
        "what_is_unclear": "<specific thing that is unknown or ambiguous>",
        "why_it_matters": "<what depends on this — what could change if it's bad?>",
        "question_to_ask": "<precise question to ask in the interview to validate this>",
        "reassuring_answer": "<what a good answer sounds like — specific>",
        "concerning_answer": "<what a bad or evasive answer sounds like>"
      }
    ]
  },

  "company_snapshot": {
    "business_model": "<1-2 sentences on how the company makes money and competes>",
    "strategic_priorities": ["<3-5 current inferred priorities — specific and evidence-linked>"],
    "momentum_signals": ["<2-4 concrete signals of forward momentum or recent progress>"],
    "pressure_points": ["<2-4 real headwinds, constraints, or tensions the company faces>"],
    "competitive_context": "<1-2 sentences on market position and competitive dynamics>",
    "evidence_basis": "strong" | "partial" | "inferred"
  },

  "company_swot": {
    "strengths": [
      { "point": "<strength — min 5, non-obvious, evidence-linked>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" }
    ],
    "weaknesses": [
      { "point": "<weakness — min 5>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" }
    ],
    "opportunities": [
      { "point": "<opportunity — min 5>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" }
    ],
    "threats": [
      { "point": "<threat — min 5>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" }
    ]
  },

  "role_snapshot": {
    "likely_charter": "<2-3 sentences on what this role is actually being hired to do — what problem it solves>",
    "success_metrics": ["<3-5 concrete measurable outcomes that define success in 12 months>"],
    "key_stakeholders": ["<3-5 specific stakeholder relationships — function, level, dynamic>"],
    "likely_challenges": ["<3-5 real execution challenges — not generic, tied to company/role context>"],
    "first_year_expectations": ["<3-5 specific deliverables or milestones expected in Y1>"]
  },

  "role_swot": {
    "strengths": [
      { "point": "<role charter strength — min 5>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" }
    ],
    "weaknesses": [
      { "point": "<role charter weakness or ambiguity — min 5>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" }
    ],
    "opportunities": [
      { "point": "<impact opportunity in this role — min 5>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" }
    ],
    "threats": [
      { "point": "<execution risk to this role — min 5>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" }
    ]
  },

  "why_role_exists_now": {
    "primary_driver": "<1-2 sentences — what changed in the company, market, or org that triggered this hire>",
    "supporting_signals": ["<2-4 specific signals from the evidence that support this hypothesis>"],
    "confidence": "high" | "medium" | "low"
  },

  "interview_decision_summary": {
    "pursue_recommendation": "Aggressive Pursue" | "Selective Pursue" | "Cautious Pursue" | "Pass",
    "why": "<2-3 sentences — decisive reasoning behind the recommendation. State your actual view.>",
    "best_positioning_angle": "<1-2 sentences — the single strongest angle this candidate should lead with>",
    "biggest_interviewer_concern": "<1 sentence — the most likely objection or concern from the interviewer's side>",
    "top_3_questions": ["<question 1 — most important to ask>", "<question 2>", "<question 3>"],
    "interview_watchout": "<1 sentence — the one thing the candidate must avoid doing or saying>",
    "red_flag_to_validate": "<1 sentence — the single most important uncertainty to validate live>"
  },

  "five_minute_brief": {
    "what_company_cares_about": "<1-2 sentences — what is driving company priorities right now>",
    "why_role_exists": "<1 sentence — the core hiring thesis for this role>",
    "likely_success_metric": "<1 sentence — the clearest signal of success in 12 months>",
    "best_candidate_angle": "<1 sentence — strongest positioning angle for any candidate>",
    "biggest_concern_to_address": "<1 sentence — the thing the interviewer will probe hardest>",
    "top_3_smart_questions": ["<question 1>", "<question 2>", "<question 3>"],
    "most_important_risk": "<1 sentence — the most material risk for a person taking this role>"
  }
}

Produce only the JSON. No preamble, no explanation, no markdown fences.`;
}

// ─── Tiered prompts ──────────────────────────────────────────────────────────

/**
 * Deep analysis prompt — sent to o3.
 * Produces only the 5 sections that require multi-step strategic reasoning:
 * company_swot, role_swot, strategic_bet_analysis, why_role_exists_now, risks_red_flags.
 */
export function getDeepAnalysisPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  profileContext: string | undefined
): string {
  const jdSection = jobDescription
    ? `\n\nJOB DESCRIPTION:\n${jobDescription}`
    : "";
  const profileSection = profileContext
    ? `\n\nCANDIDATE PROFILE / CONTEXT:\n${profileContext}`
    : "";

  const eq = context.metadata.evidence_quality;
  const evidenceHeader = eq
    ? `\nEVIDENCE QUALITY: ${eq.rating.toUpperCase()} — ${eq.distinct_source_count} distinct source(s), ${eq.distinct_source_types} source type(s)` +
      (eq.warnings.length ? `\nEVIDENCE WARNINGS:\n${eq.warnings.map((w) => `- ${w}`).join("\n")}` : "")
    : "";

  return `You are an evidence-grounded strategic analyst. Your job is NOT to summarize documents. Your job is to synthesize across sources to build a rigorous, gap-aware, contradiction-aware strategic deep-dive.

COMPANY: ${companyName}
ROLE: ${roleTitle}${jdSection}${profileSection}
${evidenceHeader}

EVIDENCE FROM PUBLIC SOURCES (${context.chunks.length} chunks):
${formatChunks(context)}

---

REASONING WORKFLOW — complete these steps before writing the JSON:

STEP 1 — Classify each source by reliability:
- Job description: high confidence for stated requirements
- News / earnings / press releases: high confidence for factual signals
- Blog posts / thought leadership: medium confidence
- Prior generated analyses: low confidence unless corroborated

STEP 2 — Build a coverage map. For each area, mark: sufficient / partial / missing:
- Company strategic priorities
- Competitive position and market dynamics
- Org structure and role scope
- Recent business momentum or inflection (12–18 months)
- Pressure points, headwinds, or constraints
- Why this specific role exists now

STEP 3 — Retrieve for missingness, not just similarity. Ask:
- What important strategic dimension is not yet evidenced?
- What claims are I making that are unsupported?
- What contradictions exist between sources?
- What could disprove my current hypothesis?

STEP 4 — For each major conclusion, trace:
- Claim → supporting evidence → source → FACT / INFERENCE / HYPOTHESIS
- FACT: directly stated in a source
- INFERENCE: reasonable synthesis across sources
- HYPOTHESIS: plausible but unverified — must be validated live

STEP 5 — Stress-test before writing:
- Am I overfitting to generic company facts (e.g. "growing fast", "competitive market")?
- Am I inventing specifics not supported by evidence?
- Is my SWOT full of non-obvious, evidence-backed points — or generic filler?
- Would my why_role_exists_now thesis hold up to a skeptic asking "but why NOW?"
- Are my risks tied to specific signals, or are they category-level guesses?

---

RULES:
1. Ground every claim in specific evidence. Use FACT / INFERENCE / HYPOTHESIS labels in evidence fields.
2. CRITICAL — PREFER OMISSION OVER FABRICATION: Never invent SWOT items, risks, or signals to fill a schema. Produce only as many items as you have genuine evidence for. 3 well-evidenced items beats 5 padded ones.
3. ESCAPE HATCH: If you do not have enough evidence to populate a field meaningfully, set the string value to "INSUFFICIENT_EVIDENCE" and set any score or confidence to the lowest available option. Never guess.
4. SWOT items must be non-obvious, evidence-linked, and specific to this company at this moment. Generic filler (e.g. "strong brand", "competitive market", "macro uncertainty") is not acceptable and must be replaced with "INSUFFICIENT_EVIDENCE" if nothing specific is available.
5. strategic_bet_analysis must reach a clear, defensible classification. If evidence is insufficient, use "Unclear" and explain what would be needed to determine the true classification.
6. risks_red_flags must name real, specific risks tied to a named signal from the evidence. Do not produce category risks (e.g. "execution risk", "market risk") without a specific signal.
7. why_role_exists_now requires an original thesis on what changed in the last 12–18 months. If the evidence does not support a thesis, set primary_driver to "INSUFFICIENT_EVIDENCE" and confidence to "low".
8. When sources conflict, state which is more reliable and what should be validated live.
9. Never invent org structure, reporting lines, success metrics, or role scope without evidence.
10. Role SWOT evidence is harder to source than company SWOT. For role_swot, prefix each evidence field with "INFERRED:" if derived from context, "FACT:" if directly stated, or "INSUFFICIENT_EVIDENCE" if not evidenced.

RETURN A SINGLE VALID JSON OBJECT with exactly these 5 keys. No other text.

{
  "company_swot": {
    "strengths": [
      { "point": "<specific strength — non-obvious, evidence-linked>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" }
    ],
    "weaknesses": [
      { "point": "<specific weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" }
    ],
    "opportunities": [
      { "point": "<specific opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" }
    ],
    "threats": [
      { "point": "<specific threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" }
    ]
  },

  "role_swot": {
    "strengths": [
      { "point": "<role charter strength — only include if evidenced>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" },
      { "point": "<strength or omit this item>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" }
    ],
    "weaknesses": [
      { "point": "<role ambiguity or structural weakness — only include if evidenced>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" },
      { "point": "<weakness or omit>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" }
    ],
    "opportunities": [
      { "point": "<impact opportunity from this role — only include if evidenced>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" },
      { "point": "<opportunity or omit>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" }
    ],
    "threats": [
      { "point": "<execution risk to this role — only include if evidenced>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" },
      { "point": "<threat or omit>", "evidence": "FACT: <source> | INFERRED: <reasoning> | INSUFFICIENT_EVIDENCE" }
    ]
  },

  "strategic_bet_analysis": {
    "classification": "Strategic Core Bet" | "Important Enabler" | "Opportunistic Build" | "Tactical Fill" | "Unclear",
    "confidence": "high" | "medium" | "low",
    "why_we_believe_this": ["<3-5 evidence-backed reasons — be specific and non-obvious>"],
    "supporting_evidence": ["<2-4 concrete signals from the evidence>"],
    "what_could_disprove": ["<2-3 things that would change or weaken this classification>"],
    "candidate_implication": {
      "scope_impact": "<honest assessment of scope given this classification>",
      "visibility": "<expected senior leadership visibility — will this person be seen?>",
      "career_upside": "<realistic career upside if successful — specific, not generic>",
      "interview_adaptation": "<how the candidate should adapt their pitch>"
    }
  },

  "why_role_exists_now": {
    "primary_driver": "<1-2 sentences — original thesis on what changed in the last 12-18 months that created this specific need>",
    "supporting_signals": ["<2-4 concrete signals from evidence that support this thesis>"],
    "confidence": "high" | "medium" | "low"
  },

  "risks_red_flags": [
    {
      "flag": "<concise risk name>",
      "signal": "<specific evidence or pattern that triggered this — not generic>",
      "severity": "high" | "medium" | "low",
      "impact": "<what this concretely means for someone taking this role>"
    }
  ]
}

Produce only the JSON. No preamble, no explanation, no markdown fences.`;
}

/**
 * Interview layer prompt — sent to gpt-4o-mini.
 * Produces the 9 interview-prep and synthesis sections.
 * Runs in parallel with the deep analysis prompt — does NOT depend on it.
 */
export function getInterviewLayerPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  profileContext: string | undefined
): string {
  const jdSection = jobDescription
    ? `\n\nJOB DESCRIPTION:\n${jobDescription}`
    : "";
  const profileSection = profileContext
    ? `\n\nCANDIDATE PROFILE / CONTEXT:\n${profileContext}`
    : "";

  const hasProfile = !!(profileContext?.trim());

  const eq = context.metadata.evidence_quality;
  const evidenceHeader = eq
    ? `\nEVIDENCE QUALITY: ${eq.rating.toUpperCase()} — ${eq.distinct_source_count} distinct source(s), ${eq.distinct_source_types} source type(s)` +
      (eq.warnings.length ? `\nEVIDENCE WARNINGS:\n${eq.warnings.map((w) => `- ${w}`).join("\n")}` : "")
    : "";

  return `You are an evidence-grounded interview-prep analyst for senior product, strategy, and GM candidates at Director+ and VP level. Your job is NOT to summarize documents. Your job is to use retrieval to build a prep brief that is evidence-backed, gap-aware, contradiction-aware, and tailored to this specific role.

COMPANY: ${companyName}
ROLE: ${roleTitle}${jdSection}${profileSection}
${evidenceHeader}
CANDIDATE PROFILE PROVIDED: ${hasProfile ? "YES — use it for fit-related fields" : "NO — do NOT assess candidate fit or produce positioning angles. See rules 5 and 6."}

EVIDENCE FROM PUBLIC SOURCES (${context.chunks.length} chunks):
${formatChunks(context)}

---

REASONING WORKFLOW — complete these steps before writing the JSON:

STEP 1 — Classify inputs:
- Job description: high confidence for stated requirements and role scope
- News / earnings / press releases: high confidence for business signals
- Candidate profile (if provided): high confidence for background; medium for behavioral signal without stories
- Blog posts / thought leadership: medium confidence

STEP 2 — Build a coverage map. Mark each: sufficient / partial / missing:
- Role scope and charter
- Success metrics (what does "winning" look like in 12 months?)
- Stakeholder complexity and political landscape
- Technical / domain depth required
- Candidate strengths relative to role (if profile provided)
- Candidate gaps and likely objections
- Likely interviewer concerns and validation agenda
- Unknowns that must be validated live

STEP 3 — Retrieve for missingness:
- What dimensions are not evidenced at all?
- What likely interviewer concerns are not yet covered?
- What candidate evidence exists outside the resume (if any stories or context provided)?
- What would a skeptical interviewer ask that I haven't addressed?

STEP 4 — Separate fact, inference, and hypothesis:
- FACT: directly supported by a source
- INFERENCE: reasonable synthesis across sources
- HYPOTHESIS: plausible but unverified — flag for live validation

STEP 5 — Stress-test before writing:
- Am I overfitting to generic company facts instead of role-specific insights?
- Am I underusing candidate evidence (stories, context) if provided?
- Am I inventing specifics (org structure, reporting lines, metrics) not in evidence?
- Am I confusing company context with role charter?
- Are my questions truly executive-caliber and specific — or generic filler?
- Would my interview_decision_summary be immediately usable by the candidate?

---

RULES:
1. Every insight must answer "so what for the candidate?" — no generic observations.
2. Be decisive. State your judgment. Do not hedge behind disclaimers.
3. Avoid repeating insights across sections. Each section adds unique value.
4. Questions must be executive-caliber — specific, diagnostic, difficult to deflect.
5. CANDIDATE FIT — NO PROFILE: If CANDIDATE PROFILE PROVIDED is NO, set candidate_role_match to { "score": null, "label": "NOT_ASSESSED", "rationale": "No resume or profile provided. Upload your resume for a real fit assessment.", "confidence": "none" }. Do NOT invent a score. Do NOT use 5 as a default.
6. CANDIDATE FIT — WITH PROFILE: If CANDIDATE PROFILE PROVIDED is YES, candidate_role_match must be grounded in actual evidence from the profile — reference specific roles, results, and experiences. Do not produce generic fit language.
7. POSITIONING ANGLE — NO PROFILE: If CANDIDATE PROFILE PROVIDED is NO, set best_positioning_angle in interview_decision_summary to "REQUIRES_RESUME — upload your resume for a personalized positioning angle."
8. ESCAPE HATCH: If you do not have sufficient evidence to make a meaningful claim, set that string field to "INSUFFICIENT_EVIDENCE" rather than guessing. Prefer omission or honest admission over fabrication.
9. interview_decision_summary and five_minute_brief must synthesize everything — write them last, make them concise and immediately actionable.
10. Never invent specifics (org structure, success metrics, reporting lines) not supported by evidence.
11. Evidence quality warnings in the header must inform your confidence levels. If evidence quality is WEAK or INSUFFICIENT, lower all confidence ratings and mark claims accordingly.

RETURN A SINGLE VALID JSON OBJECT with exactly these 11 keys. No other text.

{
  "company_overview": {
    "founded": "<year — omit if unknown>",
    "headquarters": "<city, country>",
    "employees": "<approximate headcount or range, e.g. '2,000–3,000'>",
    "stage": "<public | private | pre-IPO | subsidiary | non-profit>",
    "funding": "<total raised or market cap if public — omit if unknown>",
    "products_services": ["<key product or service — be specific, not generic>"],
    "key_markets": ["<primary customer segment or vertical>"],
    "notable_customers": ["<named customer or customer type if confidential>"],
    "recent_milestones": ["<notable event in the last 12–24 months — launch, acquisition, partnership, financial result>"]
  },

  "mission_vision_leadership": {
    "mission": "<company's stated mission or the clearest inferred equivalent — quote directly if available>",
    "vision": "<long-term aspiration or strategic north star — quote directly if available>",
    "leadership_principles": ["<named operating principle or value — quote if stated, infer if implicit>"],
    "ceo": "<name + 1-sentence context on tenure, background, or recent signal>",
    "key_executives": [
      { "name": "<name>", "role": "<title>", "context": "<1 sentence on relevance to this role or recent signal>" }
    ],
    "culture_signals": ["<observable signal about how the company actually operates — pace, decision-making, values in action>"]
  },

  "executive_summary": {
    "recommendation": "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal",
    "recommendation_rationale": "<2-3 sentences — decisive core reason. State your actual view.>",
    "key_bullets": ["<5-7 highest-signal insights — specific, non-obvious, candidate-relevant>"],
    "pursuit_stance": "<pursue aggressively | pursue selectively | proceed cautiously | avoid>"
  },

  "assessment_snapshot": {
    "company_momentum": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence — what specific signal drives this score?>",
      "confidence": "high" | "medium" | "low"
    },
    "org_clarity": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence>",
      "confidence": "high" | "medium" | "low"
    },
    "role_leverage": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence — what makes this role high or low leverage?>",
      "confidence": "high" | "medium" | "low"
    },
    "execution_risk": {
      "score": <1-10, where 10 = highest risk>,
      "label": "Low" | "Medium" | "High",
      "rationale": "<1 sentence — what is the specific risk?>",
      "confidence": "high" | "medium" | "low"
    },
    "candidate_role_match": {
      "score": <1-10> | null,
      "label": "Strong" | "Mixed" | "Weak" | "NOT_ASSESSED",
      "rationale": "<1 sentence — if no profile, use: 'No resume provided. Upload your resume for a real fit assessment.'>",
      "confidence": "high" | "medium" | "low" | "none"
    },
    "evidence_strength": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence on evidence quality and what is missing>",
      "confidence": "high" | "medium" | "low"
    }
  },

  "likely_interview_agenda": {
    "dimensions": [
      {
        "dimension": "<e.g. Domain Credibility | Strategic Judgment | Scale & Execution | Cross-functional Influence>",
        "what_they_validate": "<what the interviewer is trying to confirm — specific to this role>",
        "what_they_worry_about": "<the specific concern they likely hold>",
        "proof_needed": "<what evidence or story would satisfy them>",
        "what_to_demonstrate": "<concrete behavior or framing the candidate should show>"
      }
    ]
  },

  "questions_to_ask": {
    "must_ask": [
      {
        "question": "<executive-quality question — specific, not generic>",
        "why_it_matters": "<what this reveals about the role, company, or team>",
        "strong_answer": "<what a confident, clear answer sounds like>",
        "weak_answer": "<what a vague, defensive, or concerning answer sounds like>",
        "follow_up": "<optional deeper follow-up>"
      },
      { "question": "<must-ask 2>", "why_it_matters": "", "strong_answer": "", "weak_answer": "", "follow_up": "<optional>" },
      { "question": "<must-ask 3>", "why_it_matters": "", "strong_answer": "", "weak_answer": "", "follow_up": "<optional>" }
    ],
    "good_questions": [
      { "question": "<good question 1>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 2>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 3>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 4>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" },
      { "question": "<good question 5>", "why_it_matters": "", "strong_answer": "", "weak_answer": "" }
    ]
  },

  "unknowns_to_validate": {
    "unknowns": [
      {
        "what_is_unclear": "<specific ambiguity>",
        "why_it_matters": "<what depends on this>",
        "question_to_ask": "<precise interview question>",
        "reassuring_answer": "<what a good answer sounds like>",
        "concerning_answer": "<what a bad or evasive answer sounds like>"
      }
    ]
  },

  "company_snapshot": {
    "business_model": "<1-2 sentences on how the company makes money and competes>",
    "strategic_priorities": ["<3-5 current inferred priorities — evidence-linked>"],
    "momentum_signals": ["<2-4 concrete forward momentum signals>"],
    "pressure_points": ["<2-4 real headwinds or tensions>"],
    "competitive_context": "<1-2 sentences on market position>",
    "evidence_basis": "strong" | "partial" | "inferred"
  },

  "role_snapshot": {
    "likely_charter": "<2-3 sentences on what this role is actually hired to do>",
    "success_metrics": ["<3-5 concrete measurable outcomes in 12 months>"],
    "key_stakeholders": ["<3-5 specific stakeholder relationships>"],
    "likely_challenges": ["<3-5 real execution challenges tied to context>"],
    "first_year_expectations": ["<3-5 specific Y1 deliverables or milestones>"]
  },

  "interview_decision_summary": {
    "pursue_recommendation": "Aggressive Pursue" | "Selective Pursue" | "Cautious Pursue" | "Pass",
    "why": "<2-3 sentences — decisive reasoning. State your actual view.>",
    "best_positioning_angle": "<1-2 sentences — strongest angle the candidate should lead with>",
    "biggest_interviewer_concern": "<1 sentence — most likely objection from interviewer's side>",
    "top_3_questions": ["<most important question to ask>", "<question 2>", "<question 3>"],
    "interview_watchout": "<1 sentence — the one thing the candidate must avoid>",
    "red_flag_to_validate": "<1 sentence — most important uncertainty to validate live>"
  },

  "five_minute_brief": {
    "what_company_cares_about": "<1-2 sentences — what is driving company priorities right now>",
    "why_role_exists": "<1 sentence — the core hiring thesis>",
    "likely_success_metric": "<1 sentence — clearest signal of 12-month success>",
    "best_candidate_angle": "<1 sentence — strongest positioning angle for any candidate>",
    "biggest_concern_to_address": "<1 sentence — what the interviewer will probe hardest>",
    "top_3_smart_questions": ["<question 1>", "<question 2>", "<question 3>"],
    "most_important_risk": "<1 sentence — most material risk for someone taking this role>"
  }
}

Produce only the JSON. No preamble, no explanation, no markdown fences.`;
}

// ─── Legacy section prompts (kept for reference, no longer called) ──────────

export function getCompanySnapshotPrompt(
  context: RetrievalContext,
  companyName: string,
  userContext: string
) {
  return `You are a business analyst helping a job candidate understand a company.

Company: ${companyName}
User Role Context: ${userContext}

Evidence from public sources:
${context.chunks
  .map((chunk) => `[${chunk.source_id}] ${chunk.source_title}: ${chunk.text}`)
  .join("\n\n")}

Based only on the evidence above, write a concise "Company Snapshot" that answers:
- What is the company doing right now?
- What is their apparent strategic focus?
- What is their growth posture?

Return as JSON:
{
  "snapshot": "...",
  "confidence": 0.0-1.0,
  "evidence_gaps": ["..."]
}`;
}

export function getRoleMandatePrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription?: string
) {
  const jdText = jobDescription ? `\n\nJob Description: ${jobDescription}` : "";
  return `You are analyzing why a specific role exists at a company.

Company: ${companyName}
Role: ${roleTitle}${jdText}

Evidence from public sources:
${context.chunks
  .map((chunk) => `[${chunk.source_id}] ${chunk.source_title}: ${chunk.text}`)
  .join("\n\n")}

Return as JSON:
{
  "mandate": "...",
  "likely_priorities": ["...", "..."],
  "confidence": 0.0-1.0
}`;
}

export function getRiskFlagsPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  return `Company: ${companyName}, Role: ${roleTitle}
Evidence:
${context.chunks.map((c) => c.text).join("\n\n")}

Return as JSON: { "risks": [{"flag":"","signal":"","impact":""}], "overall_execution_risk": "low"|"medium"|"high", "confidence": 0.0 }`;
}

export function getOpportunitiesPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  return `Company: ${companyName}, Role: ${roleTitle}
Evidence:
${context.chunks.map((c) => c.text).join("\n\n")}

Return as JSON: { "opportunities": [{"opportunity":"","leverage":"","timeframe":""}], "overall_role_leverage": "low"|"medium"|"high", "confidence": 0.0 }`;
}

export function getPositioningPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  candidateProfile?: string
) {
  return `Company: ${companyName}, Role: ${roleTitle}, Profile: ${candidateProfile || "not provided"}
Evidence:
${context.chunks.map((c) => c.text).join("\n\n")}

Return as JSON: { "positioning_strategy": "...", "key_strengths_to_emphasize": [], "gaps_to_address": [], "unspoken_priorities": [], "candidate_fit_signal": "low"|"medium"|"high" }`;
}

export function getSmartQuestionsPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  return `Company: ${companyName}, Role: ${roleTitle}
Evidence:
${context.chunks.map((c) => c.text).join("\n\n")}

Return as JSON: { "questions": [{"question":"","why_ask":"","red_flags_in_answer":[]}] }`;
}

export function getRecommendationPrompt(
  scores: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  },
  evidenceDensity: number,
  _context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  return `Company: ${companyName}, Role: ${roleTitle}, Scores: ${JSON.stringify(scores)}, Evidence density: ${evidenceDensity}
Return as JSON: { "recommendation": "pursue"|"pursue_cautiously"|"avoid"|"need_more_signal", "reasoning": "...", "key_decision_factors": [], "signal_quality": "low"|"medium"|"high" }`;
}

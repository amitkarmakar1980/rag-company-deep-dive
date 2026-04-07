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

1. Ground every claim in the evidence. Distinguish clearly between FACT (directly evidenced), INFERENCE (reasonably derived), and HYPOTHESIS (speculative but plausible).
2. Avoid generic filler. Do not repeat standard LLM boilerplate like "it appears that" or "based on available information."
3. Optimize for interview usefulness. Every section should make the candidate smarter about what matters in this specific situation.
4. Be direct and calibrated. If evidence is thin, say what you can infer and flag the gap — do not invent.
5. Write like a strategy analyst, not a chat assistant. Crisp bullets, executive prose where prose is appropriate.
6. SWOT sections (company_swot and role_swot) MUST have a minimum of 5 distinct, specific points in EACH quadrant (strengths, weaknesses, opportunities, threats). Do not stop at 2-3. Push for depth — surface non-obvious signals.

---

RETURN A SINGLE VALID JSON OBJECT matching this exact schema. Do not include any text outside the JSON.

{
  "executive_summary": {
    "recommendation": "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal",
    "recommendation_rationale": "<1-2 sentences — the core reason for the recommendation>",
    "key_bullets": ["<5-7 highest-signal insights — be specific, not generic>"],
    "pursuit_stance": "<one of: pursue aggressively | pursue selectively | proceed cautiously | avoid>"
  },

  "assessment_snapshot": {
    "company_momentum": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence grounded in evidence>",
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
      "rationale": "<1 sentence>",
      "confidence": "high" | "medium" | "low"
    },
    "execution_risk": {
      "score": <1-10, where 10 = highest risk>,
      "label": "Low" | "Medium" | "High",
      "rationale": "<1 sentence>",
      "confidence": "high" | "medium" | "low"
    },
    "candidate_fit": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence — if no profile, score 5 and note>",
      "confidence": "high" | "medium" | "low"
    },
    "evidence_strength": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence on overall evidence quality>",
      "confidence": "high" | "medium" | "low"
    }
  },

  "company_snapshot": {
    "business_model": "<1-2 sentences on how the company makes money and competes>",
    "strategic_priorities": ["<3-5 current inferred priorities, each specific and evidence-linked>"],
    "momentum_signals": ["<2-4 concrete signals of forward momentum or recent progress>"],
    "pressure_points": ["<2-4 real headwinds, constraints, or tensions the company faces>"],
    "competitive_context": "<1-2 sentences on market position and competitive environment>",
    "evidence_basis": "strong" | "partial" | "inferred"
  },

  "company_swot": {
    "strengths": [
      { "point": "<strength — min 5 required>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" },
      { "point": "<strength>", "evidence": "<source or signal>" }
    ],
    "weaknesses": [
      { "point": "<weakness — min 5 required>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" },
      { "point": "<weakness>", "evidence": "<source or signal>" }
    ],
    "opportunities": [
      { "point": "<opportunity — min 5 required>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" },
      { "point": "<opportunity>", "evidence": "<source or signal>" }
    ],
    "threats": [
      { "point": "<threat — min 5 required>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" },
      { "point": "<threat>", "evidence": "<source or signal>" }
    ]
  },

  "role_snapshot": {
    "likely_charter": "<2-3 sentences on what this role is actually being hired to do>",
    "success_metrics": ["<3-5 concrete metrics or outcomes that would define success in 12 months>"],
    "key_stakeholders": ["<3-5 likely stakeholder relationships — be specific about function/level>"],
    "likely_challenges": ["<3-5 real execution challenges this person will face>"],
    "first_year_expectations": ["<3-5 specific things this person will likely need to deliver in Y1>"]
  },

  "role_swot": {
    "strengths": [
      { "point": "<strength of this role/charter — min 5 required>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" },
      { "point": "<strength>", "evidence": "<optional>" }
    ],
    "weaknesses": [
      { "point": "<weakness or ambiguity in charter — min 5 required>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" },
      { "point": "<weakness>", "evidence": "<optional>" }
    ],
    "opportunities": [
      { "point": "<opportunity for impact in this role — min 5 required>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" },
      { "point": "<opportunity>", "evidence": "<optional>" }
    ],
    "threats": [
      { "point": "<execution risk or threat to this role — min 5 required>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" },
      { "point": "<threat>", "evidence": "<optional>" }
    ]
  },

  "why_role_exists_now": {
    "primary_driver": "<1-2 sentences on the core reason this role is being created/filled now>",
    "supporting_signals": ["<2-4 specific signals from the evidence that support this hypothesis>"],
    "confidence": "high" | "medium" | "low"
  },

  "strategic_bet_analysis": {
    "classification": "Strategic Core Bet" | "Important Enabler" | "Opportunistic Build" | "Tactical Fill" | "Unclear",
    "confidence_score": <0.0-1.0>,
    "rationale": ["<3-5 evidence-backed reasons for this classification>"],
    "risks_caveats": ["<2-3 risks or caveats to this classification>"],
    "interview_implication": "<1-2 sentences on what this classification means for how the candidate should position themselves>"
  },

  "candidate_positioning": {
    "framing_strategy": "<2-3 sentences on the overall narrative arc the candidate should present>",
    "strengths_to_emphasize": ["<3-5 specific strengths to lead with, tied to company/role context>"],
    "potential_gaps": ["<2-4 gaps interviewers may probe — be honest>"],
    "gap_reframes": ["<matching reframes or honest responses to each gap>"],
    "what_not_to_overclaim": ["<2-3 things a candidate might be tempted to overclaim that could backfire>"]
  },

  "questions_to_ask": {
    "strategy": [
      {
        "question": "<the question>",
        "why_it_matters": "<why this reveals useful information>",
        "strong_answer": "<what a good answer sounds like>",
        "weak_answer": "<what a weak or concerning answer sounds like>"
      }
    ],
    "role_scope": [
      { "question": "", "why_it_matters": "", "strong_answer": "", "weak_answer": "" }
    ],
    "team_execution": [
      { "question": "", "why_it_matters": "", "strong_answer": "", "weak_answer": "" }
    ],
    "success_metrics": [
      { "question": "", "why_it_matters": "", "strong_answer": "", "weak_answer": "" }
    ],
    "risks_constraints": [
      { "question": "", "why_it_matters": "", "strong_answer": "", "weak_answer": "" }
    ]
  },

  "risks_red_flags": [
    {
      "flag": "<name of the risk>",
      "signal": "<what evidence or pattern triggered this>",
      "severity": "high" | "medium" | "low",
      "impact": "<what this means for a person taking this role>"
    }
  ],

  "evidence_gaps": {
    "gaps": ["<specific things that would improve confidence if known>"],
    "additional_sources_needed": ["<types of sources that would fill these gaps>"],
    "overall_evidence_quality": "strong" | "partial" | "weak"
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

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
    "candidate_fit": {
      "score": <1-10>,
      "label": "Strong" | "Mixed" | "Weak",
      "rationale": "<1 sentence — if no profile provided, score 5 and note that>",
      "confidence": "high" | "medium" | "low"
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

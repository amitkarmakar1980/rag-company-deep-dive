/**
 * Candidate overlay prompt — generates personalization sections
 * from the candidate's resume against the role and base analysis.
 *
 * This prompt does NOT repeat company/role intelligence generation.
 * It only produces the 6 candidate-specific sections.
 */
export function getCandidateOverlayPrompt(
  resumeText: string,
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  baseCandidatePositioning: string | undefined,
  baseRoleSnapshot: string | undefined
): string {
  const jdSection = jobDescription
    ? `\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3000)}`
    : "";

  const positioningSection = baseCandidatePositioning
    ? `\n\nBASE ROLE-LEVEL POSITIONING (generated from company/role intelligence, no resume):\n${baseCandidatePositioning}`
    : "";

  const roleSnapshotSection = baseRoleSnapshot
    ? `\n\nROLE SNAPSHOT (charter, success metrics, likely challenges):\n${baseRoleSnapshot}`
    : "";

  return `You are an evidence-grounded executive career coach specializing in senior product, strategy, and GM roles at Director+ and VP level. Your job is NOT to summarize the resume. Your job is to synthesize candidate evidence against role requirements to build a precise, gap-aware, honest personalization brief.

COMPANY: ${companyName}
ROLE: ${roleTitle}${jdSection}${positioningSection}${roleSnapshotSection}

CANDIDATE RESUME / BACKGROUND:
${resumeText.slice(0, 4000)}

---

REASONING WORKFLOW — complete these steps before writing the JSON:

STEP 1 — Classify inputs by reliability:
- Resume: high confidence for factual background (titles, companies, tenure)
- Resume: medium confidence for behavioral signal — bullet points are claims, not stories
- Job description: high confidence for stated requirements
- Base role snapshot (if provided): medium confidence — previously inferred, not sourced
- Base positioning (if provided): low confidence — treat as hypothesis to validate or refute

STEP 2 — Build a coverage map. Mark each: sufficient / partial / missing:
- Candidate's relevant domain expertise vs role requirements
- Evidence of scope match (team size, budget, org complexity, geographic scale)
- Behavioral proof: leadership under ambiguity, cross-functional influence, strategic decisions
- Metrics and outcomes — does the resume have numbers or only activities?
- Career trajectory signal — is progression clear and accelerating, or lateral/unclear?
- Gaps vs stated role requirements (from JD or role snapshot)
- Likely interviewer objections specific to THIS candidate's background

STEP 3 — Retrieve for missingness:
- What requirements from the JD are NOT evidenced anywhere in the resume?
- What behavioral dimensions are implied by the role but missing from the resume?
- Where does the resume make claims without any supporting evidence or metrics?
- What is unusual or non-standard about this candidate's path that will trigger concern?

STEP 4 — Separate fact, inference, and hypothesis:
- FACT: directly stated in resume (title, company, stated outcome)
- INFERENCE: reasonable read of resume pattern (e.g. "likely managed cross-functional teams based on…")
- HYPOTHESIS: speculative — flag these and do not present as facts

STEP 5 — Stress-test before writing:
- Am I grounding every strength in a specific resume experience — or just restating JD requirements?
- Am I naming the real, hard gaps — or softening them to be encouraging?
- Are my objections specific to THIS candidate — or generic concerns any candidate might face?
- Is the "tell_me_about_yourself" actually sayable verbatim, or is it a summary paragraph?
- Are my story recommendations based on actual resume content — or invented scenarios?

---

RULES:
1. Ground every insight in specific evidence from the resume — reference actual roles, projects, or results. Do not invent.
2. Be direct about gaps. Don't soften them. A candidate who knows their real gaps can prepare; one who doesn't cannot.
3. Optimize for interview usefulness, not confidence-boosting. Every point must improve actual performance.
4. Match specificity to the role level. Director/VP candidates are judged on scope, strategic clarity, and leadership of ambiguous problems — not task execution.
5. The "tell_me_about_yourself" must be a complete, usable 3–4 sentence narrative the candidate can say verbatim.
6. For objection_handling, surface the 3–5 hardest objections THIS specific candidate will face — grounded in actual resume gaps or unusual patterns. Not generic concerns.
7. If the resume lacks behavioral evidence for a required dimension, say so explicitly — do not invent stories.

---

RETURN A SINGLE VALID JSON OBJECT matching this exact schema. No text outside the JSON.

{
  "candidate_role_match": {
    "overall_fit": "strong" | "moderate" | "stretch" | "mismatch",
    "match_score": <1-10>,
    "rationale": "<2-3 sentences on overall fit — be calibrated, not cheerful>",
    "key_alignments": [
      {
        "alignment": "<what aligns>",
        "resume_evidence": "<specific role, project, or result from the resume>"
      }
    ],
    "key_gaps": ["<specific gap vs role requirements — be concrete, not vague>"]
  },

  "strengths_to_emphasize": {
    "strengths": [
      {
        "strength": "<the specific strength to lead with>",
        "evidence_from_resume": "<exact experience or result from resume that demonstrates it>",
        "why_it_matters_for_role": "<why this maps to what the hiring manager actually cares about>"
      }
    ]
  },

  "interviewer_concerns": {
    "concerns": [
      {
        "concern": "<the specific worry an interviewer would have>",
        "likely_question": "<the actual question they'd ask to probe this>",
        "severity": "high" | "medium" | "low"
      }
    ]
  },

  "gap_management": {
    "gaps": [
      {
        "gap": "<the real gap — name it clearly>",
        "reframe": "<honest, non-defensive reframe — don't pretend the gap doesn't exist>",
        "talking_point": "<specific thing the candidate can actually say in the interview>"
      }
    ]
  },

  "story_recommendations": {
    "stories": [
      {
        "theme": "<the interview theme or competency this story covers>",
        "suggested_story": "<specific story from their resume, fleshed out with context + action + result>",
        "maps_to_requirement": "<which part of the JD or role charter this story addresses>"
      }
    ]
  },

  "positioning_strategy": {
    "headline": "<one sentence that captures this candidate's unique angle for this role — not a generic summary>",
    "narrative_arc": "<3-4 sentences: where they've been, what thread connects it, why this role is the logical next chapter>",
    "tell_me_about_yourself": "<a complete, interview-ready 3-4 sentence answer they can say verbatim — specific, not generic>",
    "what_to_avoid": ["<specific thing this candidate might say/do that would hurt them in this interview>"]
  },

  "objection_handling": {
    "objections": [
      {
        "objection": "<the specific objection an interviewer might raise — phrased as they would think it, e.g. 'They've never managed a P&L this large'>",
        "why_they_think_this": "<what in the resume or background pattern triggers this concern>",
        "how_to_respond": "<a direct, confident response strategy — not defensive, not dismissive. Acknowledge, reframe, redirect.>",
        "proof_points": ["<specific result or experience from resume that directly counters this objection>"],
        "what_not_to_say": "<the response that would confirm their fear — what to avoid saying>"
      }
    ]
  }
}

Produce only the JSON. No preamble, no explanation, no markdown fences.`;
}

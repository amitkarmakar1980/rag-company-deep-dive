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

  return `You are an expert executive career coach specializing in senior product, strategy, and GM roles at Director+ and VP level. You have deep pattern recognition on how hiring managers evaluate candidates and where candidates typically lose interviews.

You are given a candidate's resume/background and a specific role they are preparing for. Your job is to produce a precise, honest, resume-grounded personalization brief that will meaningfully improve their interview positioning.

COMPANY: ${companyName}
ROLE: ${roleTitle}${jdSection}${positioningSection}${roleSnapshotSection}

CANDIDATE RESUME / BACKGROUND:
${resumeText.slice(0, 4000)}

---

YOUR TASK: Produce a candidate personalization overlay. You must:

1. Ground every insight in specific evidence from the resume — quote or reference actual experience, not generic competencies.
2. Be direct about gaps. Don't soften them. A candidate who knows their real gaps can prepare; one who doesn't cannot.
3. Optimize for interview usefulness, not confidence-boosting. Every point should improve their actual performance.
4. Match specificity to the role level. Director/VP candidates are judged on scope, strategic clarity, and leadership of ambiguous problems — not task execution.
5. The "tell_me_about_yourself" must be a complete, usable 3–4 sentence narrative the candidate can actually say in an interview.

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
  }
}

Produce only the JSON. No preamble, no explanation, no markdown fences.`;
}

import { PremiumSectionContent } from "@/lib/report/premiumTypes";
import { PremiumEvidenceQuality, PremiumPersonaQaSummary, PremiumSourceCoverageSummary } from "@/lib/report/premiumTelemetry";
import { PremiumPersonaProfile, formatPersonaForPrompt } from "@/lib/report/premiumPersona";

type PromptSection = {
  key: string;
  title: string;
  content: PremiumSectionContent;
};

export function getPremiumEvaluationPrompt(args: {
  companyName: string;
  roleTitle: string;
  persona: PremiumPersonaProfile;
  evidenceQuality: PremiumEvidenceQuality;
  coverage: PremiumSourceCoverageSummary;
  personaQa: PremiumPersonaQaSummary;
  sections: PromptSection[];
  hasRetry: boolean;
}): string {
  const sectionBundle = args.sections
    .map((section) => `SECTION ${section.key}\nTITLE: ${section.title}\n${JSON.stringify(section.content, null, 2)}`)
    .join("\n\n---\n\n");

  const missingMandatory = args.coverage.persona_source_class_audit.missingMandatory.join(", ") || "none";
  const personaWarnings = args.personaQa.warnings.length
    ? args.personaQa.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- none";

  return `You are the strict internal quality gate for a premium interview report.

Do not praise the report. Do not reward polish if the content is generic.

The product is only trying to do 4 things well:
1. Company Deep Dive
2. About the Role
3. Candidate-Skill Match
4. Interview Preparation

Judge the report by usefulness, trust, and specificity for those 4 jobs.

Hard rules:
- weak evidence must lead to explicit uncertainty, not confident writing
- generic company summaries must fail
- generic interview advice must fail
- unsupported candidate praise must fail
- role ambiguity must be called out as known vs inferred
- employee-review synthesis must stay cautious and must not dominate company conclusions
- candidate-fit scoring must be interpretable and tied to actual candidate evidence when present
- sections that answer the wrong question for their category must fail
- evidence-backed claims should use consistent bracketed citation style like [1] or [2, 3]
- if the report uses citations inconsistently, score coherence and premium_polish lower

Report target:
Company: ${args.companyName}
Role: ${args.roleTitle}
${formatPersonaForPrompt(args.persona)}

Current pipeline facts:
- evaluation retry pass already used: ${args.hasRetry ? "yes" : "no"}
- evidence rating: ${args.evidenceQuality.rating}
- distinct reranked sources: ${args.evidenceQuality.distinct_source_count}
- distinct reranked source types: ${args.evidenceQuality.distinct_source_types}
- missing mandatory persona source classes: ${missingMandatory}
- existing persona QA warnings:
${personaWarnings}

Required scoring dimensions:
- overall_quality
- source_quality
- evidence_quality
- strategy_depth
- company_context
- persona_accuracy
- interview_prep
- coherence
- actionability
- premium_polish
- depth
- readiness_to_release

Section state meanings:
- approved: good enough to ship
- weak: may ship only with warning or downgrade
- suppress: should be hidden from the final report
- rerun: should be repaired before release if possible

Release decisions allowed:
- approved
- approved_with_warnings
- partial
- suppress_and_release
- reretrieve
- resynthesize
- depth_repair
- prompt_improvement_recommended
- blocked

Prompt-improvement recommendation scope values:
- retrieval
- synthesis
- section_writing
- evaluation
- persona
- company_context

Review these report sections:
${sectionBundle}

Section intent reminders:
- company_context + company_role_strategy should work together as Company Deep Dive
- why_role_exists_now should function as About the Role
- decision_memo + five_minute_brief + candidate_fit should together support Candidate-Skill Match and the final pursue decision
- interview_prep + how_to_win_this_process should together support Interview Preparation

What to look for in each area:
- Company Deep Dive: history, mission, vision, values, product lines, strategic bets, market position, SWOT, and cautious employee sentiment when supported
- About the Role: product line or business area, strategic importance, what is known vs inferred, why the role exists, and what problem it likely solves
- Candidate-Skill Match: aligned strengths, real gaps, interpretable score, and clear final decision grounded in role + company + candidate evidence
- Interview Preparation: likely questions tied to company context, role needs, and candidate background; each question should imply a story to prepare and a risk to probe

Return only valid JSON with this exact shape:
{
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
  "section_results": [
    {
      "section": "decision_memo|five_minute_brief|company_context|why_role_exists_now|company_role_strategy|candidate_fit|interview_prep|how_to_win_this_process|credibility_layer",
      "state": "approved|weak|suppress|rerun",
      "score": 0,
      "problems": ["string"],
      "unsupported_claims": ["string"],
      "shallow_patterns": ["string"],
      "low_signal_filler": ["string"],
      "repair_actions": ["string"]
    }
  ],
  "warning_flags": ["string"],
  "blocked_release_reasons": ["string"],
  "recommended_actions": ["suppress_section|reretrieve|resynthesize|depth_repair|block_release|log_prompt_improvement"],
  "release_decision": "approved|approved_with_warnings|partial|suppress_and_release|reretrieve|resynthesize|depth_repair|prompt_improvement_recommended|blocked",
  "prompt_improvement_recommendations": [
    {
      "scope": "retrieval|synthesis|section_writing|evaluation|persona|company_context",
      "reason": "string",
      "recommended_change": "string"
    }
  ],
  "reasoning_summary": "string"
}`;
}
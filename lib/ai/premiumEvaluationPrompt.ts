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

Do not praise the report. Do not be generous. Do not confuse polish with quality.

You must judge whether this report is good enough to show a paying premium user.

Hard rules:
- polished nonsense must fail
- weak evidence cannot be hidden by good writing
- generic interview prep is a failure
- generic company context is a failure
- unsupported claims in critical sections are a failure
- blended-role mush is a failure
- employee reviews must never dominate company-context conclusions
- content that describes but does not interpret should score poorly on depth
- company_context and company_role_strategy must be judged as enhanced-RAG synthesis products, not as company-site extraction summaries
- company-facing sections that simply restate first-party copy without integrating external validation, competitive context, market context, economic logic, or management tradeoffs should score poorly on depth and company_context
- company-facing sections should feel pressure-tested through multiple lenses such as product leadership, economics, strategy, competition, and market research; if they read like an unrevised first-pass summary, score them down
- wrong-archetype reports must fail even if the writing is polished
- lead or senior product-manager roles must not be judged against an executive or GM bar without explicit business-ownership evidence
- technical PM interview prep that drifts into engineering architecture theater must score poorly on interview_prep and persona_accuracy
- candidate-fit scoring that ignores transferability and overweights narrow domain purity must score poorly on coherence and actionability
- sections that answer the wrong question for their category must fail coherence
- evidence-backed claims should use consistent bracketed citation style like [1] or [2, 3], not ad hoc "Source 1" references
- if the report presents cited evidence but uses inconsistent or missing citation formatting, score coherence and premium_polish lower

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
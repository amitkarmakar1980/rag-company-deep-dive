import { RetrievalContext } from "@/lib/types";
import { formatUntrustedTextBlock } from "@/lib/ai/untrustedInput";

function formatChunks(context: RetrievalContext): string {
  return context.chunks
    .map(
      (chunk, index) =>
        `[SOURCE ${index + 1} - UNTRUSTED EVIDENCE] ${chunk.source_title} (${chunk.source_type})\n${chunk.text}`
    )
    .join("\n\n---\n\n");
}

export function getPremiumReportPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  jobDescription: string | undefined,
  profileContext: string | undefined
): string {
  const jdSection = formatUntrustedTextBlock("JOB DESCRIPTION", jobDescription);
  const profileSection = formatUntrustedTextBlock("CANDIDATE PROFILE / CONTEXT", profileContext);
  const eq = context.metadata.evidence_quality;
  const evidenceHeader = eq
    ? `EVIDENCE QUALITY: ${eq.rating.toUpperCase()} | ${eq.distinct_source_count} distinct source(s) | ${eq.distinct_source_types} source type(s)\nEVIDENCE WARNINGS:\n${eq.warnings.map((warning) => `- ${warning}`).join("\n") || "- none"}`
    : "EVIDENCE QUALITY: UNKNOWN";

  return `You are generating a premium, decision-grade interview preparation report for a senior PM / Director+ / VP-track candidate.

You must follow these product rules:
- Optimize for trust, evidence quality, specificity, candidate outcomes, and premium insight density.
- Do not fabricate metrics, org structures, reporting lines, stakeholder maps, timelines, or year-1 goals.
- Do not generate why-this-role-exists-now, strategy, role leverage, or year-1 expectations from generic news search alone.
- Use "INSUFFICIENT_EVIDENCE" explicitly when the source base is not good enough.
- Hide weak specificity inside the prose. Do not fake certainty.
- Each section must add net-new value and not repeat previous sections.
- Candidate-fit sections must stay generic if no candidate profile is provided.

Company: ${companyName}
Role: ${roleTitle}
${jdSection}
${profileSection}

${evidenceHeader}

Available evidence (${context.chunks.length} chunks):
${formatChunks(context)}

Return exactly one valid JSON object with this schema and no extra text:
{
  "report_recommendation": "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal",
  "scorecard": {
    "company_momentum": number,
    "org_clarity": number,
    "role_leverage": number,
    "execution_risk": number,
    "candidate_fit": number
  },
  "sections": {
    "decision_memo": {
      "summary": string,
      "callouts": [{ "label": string, "value": string, "tone": "neutral" | "strong" | "caution" | "risk" | "unknown" }],
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "five_minute_brief": {
      "summary": string,
      "bullets": [string],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "why_role_exists_now": {
      "summary": string,
      "callouts": [{ "label": string, "value": string, "tone": "neutral" | "strong" | "caution" | "risk" | "unknown" }],
      "bullets": [string],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "how_to_win_this_process": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "company_role_strategy": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "facts": [{ "label": string, "value": string }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "candidate_fit": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "callouts": [{ "label": string, "value": string, "tone": "neutral" | "strong" | "caution" | "risk" | "unknown" }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "interview_prep": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    },
    "credibility_layer": {
      "summary": string,
      "blocks": [{ "title": string, "body": string, "bullets": [string] }],
      "facts": [{ "label": string, "value": string }],
      "evidence": { "threshold": string, "status": "met" | "partial" | "insufficient", "confidence": "high" | "medium" | "low" | "suppressed", "note": string }
    }
  }
}

Section content requirements:
- decision_memo: make the recommendation decisive, name the strongest upside, the strongest downside, what must be true, and what would change the call.
- five_minute_brief: 5 to 8 bullets max; each bullet should be interview-day usable.
- why_role_exists_now: explain why now, not why ever.
- how_to_win_this_process: tell the candidate what to lead with, prove, avoid, and ask.
- company_role_strategy: cover business model, strategic priorities, product surface, leverage, stakeholders, politics, KPI logic, and first-year constraints without inventing specifics.
- candidate_fit: if no profile exists, say so directly and avoid fake personalization.
- interview_prep: include interviewer hypotheses, diagnostic questions, what not to say, and last-minute prep.
- credibility_layer: separate verified or well-grounded facts from synthesis, inference, conflicts, and unknowns.

Tone rules:
- Director+ quality bar.
- No generic PM filler.
- No repeated claims across sections.
- Prefer omission over unsupported specificity.
`;
}

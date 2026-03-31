import { RetrievalContext } from "@/lib/types";

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

Based only on the evidence above, write a concise "Company Snapshot" (2-3 paragraphs) that answers:
- What is the company doing right now?
- What is their apparent strategic focus?
- What is their growth posture?

Write in plain language. Only state what the evidence shows. If evidence is limited, say so.
Do not fabricate details.

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

Based on company strategy, recent changes, and the role level, hypothesize:
- Why does this role likely exist right now?
- What problem or opportunity is it solving?
- What does success look like for this role?

Be specific. Cite evidence. Avoid generic framing.

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
  return `You are identifying execution and organizational risks for a job candidate.

Company: ${companyName}
Role: ${roleTitle}

Evidence from public sources:
${context.chunks
  .map((chunk) => `[${chunk.source_id}] ${chunk.source_title}: ${chunk.text}`)
  .join("\n\n")}

Identify 3-5 concrete risk flags. Each should:
- Be grounded in evidence (or explicitly stated as pattern/rumor if applicable)
- Show what signal triggered the flag
- Explain impact on role performance

Red flags to watch for: restructuring, leadership churn, vague org clarity, conflicting signals, hiring freezes, margin pressure, market headwinds.

Return as JSON:
{
  "risks": [
    {
      "flag": "...",
      "signal": "...",
      "impact": "..."
    }
  ],
  "overall_execution_risk": "low" | "medium" | "high",
  "confidence": 0.0-1.0
}`;
}

export function getOpportunitiesPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  return `You are identifying opportunities and leverage points for a job candidate.

Company: ${companyName}
Role: ${roleTitle}

Evidence from public sources:
${context.chunks
  .map((chunk) => `[${chunk.source_id}] ${chunk.source_title}: ${chunk.text}`)
  .join("\n\n")}

Identify 3-5 substantive opportunities. Each should:
- Be grounded in company strategy or market conditions
- Show how the role can drive measurable impact
- Align with company momentum signals

Opportunities to explore: market expansion, new product launches, efficiency gains, tech debt paydown, team growth, international expansion.

Return as JSON:
{
  "opportunities": [
    {
      "opportunity": "...",
      "leverage": "...",
      "timeframe": "..."
    }
  ],
  "overall_role_leverage": "low" | "medium" | "high",
  "confidence": 0.0-1.0
}`;
}

export function getPositioningPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string,
  candidateProfile?: string
) {
  const profileText = candidateProfile
    ? `\n\nCandidate Background: ${candidateProfile}`
    : "";

  return `You are coaching a job candidate on how to position themselves in interviews.

Company: ${companyName}
Role: ${roleTitle}${profileText}

Evidence from public sources:
${context.chunks
  .map((chunk) => `[${chunk.source_id}] ${chunk.source_title}: ${chunk.text}`)
  .join("\n\n")}

Based on company strategy, recent announcements, and role context, advise how to position:
- What 2-3 strengths should you emphasize?
- What gaps should you acknowledge or reframe?
- What are the unspoken priorities?
- What about your background is uniquely relevant?

Be specific and actionable. Avoid generic interview advice.

Return as JSON:
{
  "positioning_strategy": "...",
  "key_strengths_to_emphasize": ["...", "..."],
  "gaps_to_address": ["..."],
  "unspoken_priorities": ["..."],
  "candidate_fit_signal": "low" | "medium" | "high"
}`;
}

export function getSmartQuestionsPrompt(
  context: RetrievalContext,
  companyName: string,
  roleTitle: string
) {
  return `You are generating smart, informed questions for a candidate to ask interviewers.

Company: ${companyName}
Role: ${roleTitle}

Evidence from public sources:
${context.chunks
  .map((chunk) => `[${chunk.source_id}] ${chunk.source_title}: ${chunk.text}`)
  .join("\n\n")}

Generate 5-7 questions that:
- Show you've done your research (without being aggressive)
- Probe the risk flags and opportunities you identified
- Test alignment between interview narrative and public signals
- Are open-ended and reveal real information

Avoid generic questions. Focus on clarity, strategy alignment, and execution feasibility.

Return as JSON:
{
  "questions": [
    {
      "question": "...",
      "why_ask": "...",
      "red_flags_in_answer": ["..."]
    }
  ]
}`;
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
  const avgScore =
    (scores.company_momentum +
      scores.org_clarity +
      scores.role_leverage +
      (10 - scores.execution_risk) +
      scores.candidate_fit) /
    5;

  return `You are making a recommendation for a job candidate based on available signals.

Company: ${companyName}
Role: ${roleTitle}

Scoring Overview:
- Company Momentum: ${scores.company_momentum}/10
- Org Clarity: ${scores.org_clarity}/10
- Role Leverage: ${scores.role_leverage}/10
- Execution Risk: ${scores.execution_risk}/10 (lower is better)
- Candidate Fit: ${scores.candidate_fit}/10
- Average Score: ${avgScore.toFixed(1)}/10
- Evidence Density: ${(evidenceDensity * 100).toFixed(0)}%

Your task: Based on these scores and evidence quality, recommend one of:
- "pursue": Strong signals, good fit, go for it
- "pursue_cautiously": Mixed signals or moderate risk, but worth exploring
- "avoid": Major red flags, weak signals, or poor fit
- "need_more_signal": Insufficient public information to recommend

Reasoning must be:
- Tied to specific scores and what they mean
- Honest about evidence gaps
- Calibrated to the candidate's risk tolerance (assume moderate)

Return as JSON:
{
  "recommendation": "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal",
  "reasoning": "...",
  "key_decision_factors": ["..."],
  "signal_quality": "low" | "medium" | "high"
}`;
}

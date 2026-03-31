import { Source } from "@/lib/types";

export function calculateScores(sources: Source[]): {
  company_momentum: number;
  org_clarity: number;
  role_leverage: number;
  execution_risk: number;
  candidate_fit: number;
} {
  let momentum = 5;
  let clarity = 5;
  let leverage = 5;
  let risk = 5;
  let fit = 3; // Default low unless profile provided

  if (sources.length === 0) {
    return {
      company_momentum: 3,
      org_clarity: 3,
      role_leverage: 3,
      execution_risk: 7,
      candidate_fit: 2,
    };
  }

  // Analyze source signals
  for (const source of sources) {
    const content = source.cleaned_content.toLowerCase();
    const age = Math.floor(
      (Date.now() - new Date(source.fetched_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Company Momentum signals
    if (
      content.includes("launch") ||
      content.includes("announcement") ||
      content.includes("debut")
    )
      momentum += 1;
    if (
      content.includes("growth") ||
      content.includes("expansion") ||
      content.includes("scaling")
    )
      momentum += 0.5;
    if (
      content.includes("layoff") ||
      content.includes("restructur") ||
      content.includes("contraction")
    )
      momentum -= 1;

    // org Clarity signals
    if (
      content.includes("leadership") ||
      content.includes("org chart") ||
      content.includes("team")
    )
      clarity += 0.5;
    if (
      content.includes("vague") ||
      content.includes("unclear") ||
      content.includes("to be determined")
    )
      clarity -= 0.5;
    if (
      content.includes("chaos") ||
      content.includes("confusion") ||
      content.includes("realignment")
    )
      clarity -= 1;

    // Role Leverage signals
    if (
      content.includes("platform") ||
      content.includes("infrastructure") ||
      content.includes("scale leverage")
    )
      leverage += 0.5;
    if (
      content.includes("specialist") ||
      content.includes("support role")
    )
      leverage -= 0.5;

    // Execution Risk signals
    if (source.source_type === "newsroom" && age < 30) risk -= 0.5;
    if (
      content.includes("deficit") ||
      content.includes("loss") ||
      content.includes("debt")
    )
      risk += 0.5;
    if (
      content.includes("profitable") ||
      content.includes("efficiency")
    )
      risk -= 0.5;
  }

  // Bound scores to 1-10 range
  const bound = (score: number) => Math.max(1, Math.min(10, score));

  return {
    company_momentum: bound(momentum),
    org_clarity: bound(clarity),
    role_leverage: bound(leverage),
    execution_risk: bound(risk),
    candidate_fit: bound(fit),
  };
}

export function recommendationFromScores(
  scores: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  },
  evidenceDensity: number
): "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal" {
  // If evidence is too sparse, say so
  if (evidenceDensity < 0.3) return "need_more_signal";

  // Calculate composite score (higher is better)
  const composite =
    (scores.company_momentum +
      scores.org_clarity +
      scores.role_leverage +
      (10 - scores.execution_risk) +
      scores.candidate_fit) /
    5;

  // Simple heuristic recommendation
  if (composite >= 7 && scores.execution_risk <= 4) {
    return "pursue";
  } else if (composite >= 6 || scores.execution_risk <= 3) {
    return "pursue_cautiously";
  } else if (scores.execution_risk >= 8 || composite <= 3.5) {
    return "avoid";
  } else {
    return "pursue_cautiously";
  }
}

export function calculateEvidenceDensity(
  chunkCount: number,
  sourceCount: number,
  requestAge: number
): number {
  // Simple heuristic: more chunks and sources = higher density
  // Penalize old requests slightly

  let density = 0;

  // Chunks contribute up to 0.5
  if (chunkCount > 50) density += 0.5;
  else density += (Math.min(chunkCount, 50) / 50) * 0.5;

  // Sources contribute up to 0.3
  if (sourceCount > 5) density += 0.3;
  else density += (Math.min(sourceCount, 5) / 5) * 0.3;

  // Recency contributes up to 0.2
  const maxAge = 365; // days
  const recencyBonus = Math.max(0, 1 - requestAge / maxAge);
  density += recencyBonus * 0.2;

  return Math.min(1, density);
}

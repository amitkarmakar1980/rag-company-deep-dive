import type { CompanyDeepDiveV3, SwotItem } from "./schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function conf(c: "high" | "medium" | "low"): string {
  return `*(confidence: ${c})*`;
}

function evState(e: string): string {
  return `*(${e.replace(/_/g, " ")})*`;
}

function gfmTable(headers: string[], rows: string[][]): string {
  const sep = headers.map(() => "---").join(" | ");
  const head = headers.join(" | ");
  return `| ${head} |\n| ${sep} |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}`;
}

function swotSection(items: SwotItem[], label: string): string {
  if (!items?.length) return "";
  const rows = items.map((s) => [
    `**${s.item}**`,
    s.evidence,
    s.implication_for_candidate,
    s.confidence,
  ]);
  return `### ${label}\n\n${gfmTable(["Item", "Evidence", "Strategic Implication", "Confidence"], rows)}\n`;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderCompanyDeepDiveMarkdown(d: CompanyDeepDiveV3): string {
  const sections: string[] = [];

  // ── 1. Executive Company Thesis ─────────────────────────────────────────────
  sections.push(`## Executive Company Thesis

${d.executive_company_thesis.thesis}

**Strategic significance for senior PM candidates:** ${d.executive_company_thesis.why_it_matters_for_senior_pm_candidate}

${conf(d.executive_company_thesis.confidence)}`);

  // ── 2. Company Snapshot ─────────────────────────────────────────────────────
  const snap = d.company_snapshot;
  const isUsable = (v: string | undefined | null) =>
    v && v !== "insufficient_evidence" && v !== "insufficient evidence" && v.trim().length > 0;

  const snapshotRows: string[][] = [
    isUsable(snap.founding_year) ? ["Founded", snap.founding_year!] : null,
    isUsable(snap.headquarters) ? ["Headquarters", snap.headquarters!] : null,
    isUsable(snap.public_or_private) ? ["Ownership", `${snap.public_or_private}${snap.ticker ? ` · ${snap.ticker}` : ""}`] : null,
    isUsable(snap.ceo) ? ["CEO", snap.ceo!] : null,
    isUsable(snap.employee_count) ? ["Employees", snap.employee_count!] : null,
    ["Category", snap.business_category],
    ["Stage", snap.current_stage.replace(/_/g, " ")],
  ].filter((r): r is string[] => r !== null);

  const primaryCustomers = snap.primary_customers?.length
    ? snap.primary_customers.map((c) => `- ${c}`).join("\n")
    : "Not specified";

  const coreProducts = snap.core_products?.length
    ? snap.core_products.map((p) => `- ${p}`).join("\n")
    : "Not specified";

  sections.push(`## Company Snapshot

${gfmTable(["Field", "Value"], snapshotRows)}

**Primary Customers**

${primaryCustomers}

**Core Products**

${coreProducts}`);

  // ── 3. Business Model & Revenue Engine ──────────────────────────────────────
  const bm = d.business_model;
  const streamRows = (bm.revenue_streams ?? []).map((s) => [
    `**${s.stream}**`,
    s.description,
    s.importance,
    s.evidence_state.replace(/_/g, " "),
  ]);

  sections.push(`## Business Model & Revenue Engine

${bm.monetization_logic}
${streamRows.length ? `\n${gfmTable(["Revenue Stream", "Description", "Importance", "Evidence Basis"], streamRows)}` : ""}
${bm.margin_structure_inference ? `\n**Margin & Unit Economics Signal:** ${bm.margin_structure_inference.insight} ${conf(bm.margin_structure_inference.confidence)}` : ""}`);

  // ── 4. Product / Platform / Ecosystem Overview ───────────────────────────────
  const pp = d.product_platform_ecosystem;
  const productBlocks = (pp.product_descriptions ?? []).map((p) =>
    `### ${p.name} *(${p.maturity})*\n\n${p.what_it_does}\n\n**Target Customer:** ${p.target_customer}\n\n**Strategic Importance:** ${p.strategic_importance}`
  ).join("\n\n");

  sections.push(`## Product / Platform / Ecosystem Overview

${productBlocks || (pp.platform_or_ecosystem_dynamics)}

**Platform & Ecosystem Dynamics**

${pp.platform_or_ecosystem_dynamics}

**Customer Segments:** ${(pp.customer_segments ?? []).join(" · ")}
${pp.developer_or_partner_ecosystem ? `\n**Developer / Partner Ecosystem:** ${pp.developer_or_partner_ecosystem}` : ""}

**Product Maturity:** ${pp.product_maturity_assessment.assessment} ${conf(pp.product_maturity_assessment.confidence)} ${evState(pp.product_maturity_assessment.evidence_state)}`);

  // ── 5. Company History & Strategic Evolution ─────────────────────────────────
  if (d.history_and_evolution?.length) {
    const histRows = d.history_and_evolution.map((h) => [
      `**${h.period}**`,
      h.what_changed,
      h.strategic_significance,
    ]);
    sections.push(`## Company History & Strategic Evolution

${gfmTable(["Period", "What Changed", "Strategic Significance"], histRows)}`);
  }

  // ── 6. Mission, Vision, Values & Leadership Principles ──────────────────────
  const mvv = d.mission_vision_values;
  const mvvLines = [
    mvv.mission && `**Mission:** ${mvv.mission}`,
    mvv.vision && `**Vision:** ${mvv.vision}`,
    mvv.stated_values?.length && `**Values:** ${mvv.stated_values.join(" · ")}`,
    mvv.leadership_principles?.length && `**Leadership Principles:** ${mvv.leadership_principles.join(", ")}`,
  ].filter(Boolean).join("\n\n");

  sections.push(`## Mission, Vision & Values

${mvvLines}

**How to Read This Culture:** ${mvv.candidate_interpretation}`);

  // ── 7. Current Strategic Direction ──────────────────────────────────────────
  const cs = d.current_strategy;
  const priorityBlocks = (cs.top_strategic_priorities ?? []).map((p) =>
    `### ${p.priority}\n\n${p.evidence}\n\n**Strategic Implication:** ${p.strategic_implication} ${conf(p.confidence)} ${evState(p.evidence_state)}`
  ).join("\n\n");

  const inflections = (cs.strategic_inflection_points ?? []).map((ip) =>
    `- **${ip.inflection}** — ${ip.why_now} ${evState(ip.evidence_state)}`
  ).join("\n");

  sections.push(`## Current Strategic Direction

${priorityBlocks}
${inflections ? `\n### Inflection Points (Last 12–18 Months)\n\n${inflections}` : ""}`);

  // ── 8. AI / Technology / Platform Strategy ───────────────────────────────────
  const ai = d.ai_technology_platform_strategy;
  const moats = ai.technical_moats?.length
    ? ai.technical_moats.map((m) => `- ${m}`).join("\n")
    : "";
  const aiRisks = ai.adoption_risks?.length
    ? ai.adoption_risks.map((r) => `- ${r}`).join("\n")
    : "";

  sections.push(`## AI / Technology / Platform Strategy

**AI Relevance:** ${ai.ai_relevance.toUpperCase()}

${ai.ai_strategy_summary}
${ai.platform_strategy_summary ? `\n**Platform Strategy:** ${ai.platform_strategy_summary}` : ""}
${moats ? `\n**Technical Moats**\n\n${moats}` : ""}
${aiRisks ? `\n**Adoption & Execution Risks**\n\n${aiRisks}` : ""}`);

  // ── 9. Market & Competitive Landscape ───────────────────────────────────────
  const mc = d.market_competitive_landscape;
  const competitorRows = (mc.major_competitors ?? []).map((c) => [
    `**${c.competitor}**`,
    c.basis_of_competition,
    c.company_advantage_or_gap,
  ]);

  const growthSignals = (mc.market_growth_signals ?? []).map((s) => `- ${s}`).join("\n");

  sections.push(`## Market & Competitive Landscape

**Market Category:** ${mc.market_category}

**Market Growth Signals**

${growthSignals}

### Competitor Map

${competitorRows.length ? gfmTable(["Competitor", "Basis of Competition", "Company Advantage / Gap"], competitorRows) : "Insufficient evidence"}`);

  // ── 10. Competitive Analysis ─────────────────────────────────────────────────
  const ca = d.competitive_analysis;
  const diffList = (ca.differentiation ?? []).map((d) => `- ${d}`).join("\n");
  const vulnList = (ca.vulnerabilities ?? []).map((v) => `- ${v}`).join("\n");
  const moveList = (ca.likely_competitive_moves ?? []).map((m) =>
    `- **${m.move}** — ${m.rationale} ${conf(m.confidence)} ${evState(m.evidence_state)}`
  ).join("\n");

  sections.push(`## Competitive Analysis

${ca.positioning_summary}

**Differentiators**

${diffList}

**Vulnerabilities**

${vulnList}
${moveList ? `\n**Likely Competitive Moves**\n\n${moveList}` : ""}`);

  // ── 11. SWOT Analysis ────────────────────────────────────────────────────────
  sections.push(`## SWOT Analysis

${swotSection(d.swot?.strengths, "Strengths")}
${swotSection(d.swot?.weaknesses, "Weaknesses")}
${swotSection(d.swot?.opportunities, "Opportunities")}
${swotSection(d.swot?.threats, "Threats")}`);

  // ── 12. Risks, Threats & Strategic Tensions ──────────────────────────────────
  const riskRows = (d.risks_and_threats ?? []).map((r) => [
    `**${r.risk}**`,
    r.category,
    r.severity,
    r.likelihood,
    r.why_it_matters,
    r.strategic_implication,
  ]);

  sections.push(`## Risks, Threats & Strategic Tensions

${riskRows.length ? gfmTable(["Risk", "Category", "Severity", "Likelihood", "Why It Matters", "Strategic Implication"], riskRows) : "Insufficient evidence"}`);

  // ── 13. Leadership & Operating Culture ──────────────────────────────────────
  const lc = d.leadership_and_operating_culture;
  sections.push(`## Leadership & Operating Culture

${lc.leadership_team_summary}

**Operating Model:** ${lc.operating_model_assessment}
${lc.pm_culture_inference ? `\n**PM Culture Signal:** ${lc.pm_culture_inference.assessment} ${conf(lc.pm_culture_inference.confidence)} ${evState(lc.pm_culture_inference.evidence_state)}` : ""}`);

  // ── 14. Employee Satisfaction & Sentiment ────────────────────────────────────
  const es = d.employee_sentiment;
  const themes = (es.themes ?? []).map((t) =>
    `- **${t.theme}** *(${t.sentiment})* — ${t.evidence} | Source: ${t.source_type} ${conf(t.confidence)}`
  ).join("\n");

  sections.push(`## Employee Satisfaction & Sentiment

**Overall Sentiment:** ${es.overall_sentiment.replace(/_/g, " ")}

${themes}

> ${es.caveat}`);

  // ── 15. Customer / Developer / Partner Sentiment ─────────────────────────────
  const cps = d.customer_partner_sentiment;
  const posThemes = (cps.positive_themes ?? []).map((t) => `- ${t}`).join("\n");
  const negThemes = (cps.negative_themes ?? []).map((t) => `- ${t}`).join("\n");

  sections.push(`## Customer / Developer / Partner Sentiment

${cps.summary} ${evState(cps.evidence_state)}

**Positive Themes**

${posThemes || "Insufficient evidence"}

**Negative Themes**

${negThemes || "Insufficient evidence"}`);

  // ── 16. Recent News, Inflection Points & Watch Items ─────────────────────────
  if (d.recent_news_and_watch_items?.length) {
    const news = d.recent_news_and_watch_items.map((n) =>
      `- **${n.item}**${n.date ? ` *(${n.date})*` : ""} — ${n.why_it_matters}\n  *Strategic Implication: ${n.strategic_implication}*`
    ).join("\n");
    sections.push(`## Recent News, Inflection Points & Watch Items\n\n${news}`);
  }

  // ── 17. What a Senior PM Candidate Must Understand ───────────────────────────
  const intel = (d.pm_candidate_intelligence ?? []).map((t, i) =>
    `### ${i + 1}. ${t.insight}\n\n${t.strategic_significance} ${conf(t.confidence)}`
  ).join("\n\n");

  sections.push(`## What a Senior PM Candidate Must Understand About This Company

${intel}`);

  // ── 18. Company Scorecard ────────────────────────────────────────────────────
  const sc = d.scorecard;
  if (sc) {
    const scorecardRows = Object.entries(sc).map(([key, val]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return [`**${label}**`, `${val.score}/10`, val.rationale, val.confidence];
    });
    sections.push(`## Company Scorecard

${gfmTable(["Dimension", "Score", "Rationale", "Confidence"], scorecardRows)}`);
  }

  // ── 19. Evidence Quality & Open Questions ────────────────────────────────────
  const eq = d.evidence_quality;
  if (eq) {
    const openQs = (eq.unresolved_questions ?? []).map((q) => `- ${q}`).join("\n");
    const weakAreas = (eq.weakest_areas ?? []).map((a) => `- ${a}`).join("\n");
    sections.push(`## Evidence Quality & Open Questions

${gfmTable(["Metric", "Count"], [
  ["Total Sources", String(eq.source_count ?? 0)],
  ["Primary Sources", String(eq.primary_source_count ?? 0)],
  ["Secondary Sources", String(eq.secondary_source_count ?? 0)],
  ["Sentiment Sources", String(eq.sentiment_source_count ?? 0)],
])}
${weakAreas ? `\n**Weakest Evidence Areas**\n\n${weakAreas}` : ""}
${openQs ? `\n**Unresolved Questions**\n\n${openQs}` : ""}`);
  }

  return `# Company Deep Dive: ${d.company_name}\n\n` + sections.join("\n\n---\n\n");
}

export type EvidenceState =
  | "verified_fact"
  | "cited_synthesis"
  | "reasoned_inference"
  | "low_confidence_hypothesis"
  | "conflicting_evidence"
  | "insufficient_evidence";

export interface Citation {
  source_id: string;
  url: string;
  title?: string;
  source_type: string;
  published_at?: string;
  accessed_at?: string;
}

export interface Score {
  score: number; // 1-10
  rationale: string;
  confidence: "high" | "medium" | "low";
}

export interface SwotItem {
  item: string;
  evidence: string;
  implication_for_candidate: string;
  confidence: "high" | "medium" | "low";
  citations: Citation[];
}

export interface CompanyDeepDiveV3 {
  module_key: "company_deep_dive_v3";
  company_name: string;
  generated_at: string;

  executive_company_thesis: {
    thesis: string;
    why_it_matters_for_senior_pm_candidate: string;
    confidence: "high" | "medium" | "low";
    citations: Citation[];
  };

  company_snapshot: {
    founding_year?: string;
    headquarters?: string;
    public_or_private?: string;
    ticker?: string;
    ceo?: string;
    employee_count?: string;
    business_category: string;
    primary_customers: string[];
    core_products: string[];
    current_stage: "startup" | "growth" | "scaled_public" | "mature_enterprise" | "turnaround" | "unknown";
    citations: Citation[];
  };

  business_model: {
    revenue_streams: Array<{
      stream: string;
      description: string;
      importance: "primary" | "secondary" | "emerging" | "unknown";
      evidence_state: EvidenceState;
      citations: Citation[];
    }>;
    monetization_logic: string;
    margin_structure_inference?: {
      insight: string;
      confidence: "high" | "medium" | "low";
      citations: Citation[];
    };
  };

  product_platform_ecosystem: {
    /** Rich per-product descriptions — required, ≥3 entries for multi-product companies */
    product_descriptions: Array<{
      name: string;
      what_it_does: string;
      target_customer: string;
      strategic_importance: string;
      maturity: "early" | "growth" | "scaled" | "declining" | "unknown";
    }>;
    platform_or_ecosystem_dynamics: string;
    customer_segments: string[];
    developer_or_partner_ecosystem?: string;
    product_maturity_assessment: {
      assessment: string;
      confidence: "high" | "medium" | "low";
      evidence_state: EvidenceState;
    };
    citations: Citation[];
  };

  history_and_evolution: Array<{
    period: string;
    what_changed: string;
    strategic_significance: string;
    citations: Citation[];
  }>;

  mission_vision_values: {
    mission?: string;
    vision?: string;
    stated_values: string[];
    leadership_principles?: string[];
    candidate_interpretation: string;
    citations: Citation[];
  };

  current_strategy: {
    top_strategic_priorities: Array<{
      priority: string;
      evidence: string;
      strategic_implication: string;
      evidence_state: EvidenceState;
      confidence: "high" | "medium" | "low";
      citations: Citation[];
    }>;
    strategic_inflection_points: Array<{
      inflection: string;
      why_now: string;
      evidence_state: EvidenceState;
      citations: Citation[];
    }>;
  };

  ai_technology_platform_strategy: {
    ai_relevance: "high" | "medium" | "low" | "unknown";
    ai_strategy_summary: string;
    platform_strategy_summary?: string;
    technical_moats?: string[];
    adoption_risks?: string[];
    citations: Citation[];
  };

  market_competitive_landscape: {
    market_category: string;
    market_growth_signals: string[];
    major_competitors: Array<{
      competitor: string;
      basis_of_competition: string;
      company_advantage_or_gap: string;
      citations: Citation[];
    }>;
  };

  competitive_analysis: {
    positioning_summary: string;
    differentiation: string[];
    vulnerabilities: string[];
    likely_competitive_moves: Array<{
      move: string;
      rationale: string;
      evidence_state: EvidenceState;
      confidence: "high" | "medium" | "low";
    }>;
  };

  swot: {
    strengths: SwotItem[];
    weaknesses: SwotItem[];
    opportunities: SwotItem[];
    threats: SwotItem[];
  };

  risks_and_threats: Array<{
    risk: string;
    category:
      | "market"
      | "competitive"
      | "execution"
      | "financial"
      | "regulatory"
      | "technology"
      | "talent"
      | "culture"
      | "customer";
    severity: "high" | "medium" | "low";
    likelihood: "high" | "medium" | "low";
    why_it_matters: string;
    strategic_implication: string;
    evidence_state: EvidenceState;
    citations: Citation[];
  }>;

  leadership_and_operating_culture: {
    leadership_team_summary: string;
    operating_model_assessment: string;
    pm_culture_inference?: {
      assessment: string;
      confidence: "high" | "medium" | "low";
      evidence_state: EvidenceState;
      citations: Citation[];
    };
  };

  employee_sentiment: {
    overall_sentiment: "positive" | "mixed" | "negative" | "insufficient_evidence";
    themes: Array<{
      theme: string;
      sentiment: "positive" | "mixed" | "negative";
      evidence: string;
      confidence: "high" | "medium" | "low";
      source_type: "glassdoor" | "blind" | "levels" | "reddit" | "linkedin" | "other";
      citations: Citation[];
    }>;
    caveat: string;
  };

  customer_partner_sentiment: {
    summary: string;
    positive_themes: string[];
    negative_themes: string[];
    evidence_state: EvidenceState;
    citations: Citation[];
  };

  recent_news_and_watch_items: Array<{
    item: string;
    date?: string;
    why_it_matters: string;
    strategic_implication: string;
    citations: Citation[];
  }>;

  /** Pure company intelligence for PM candidates evaluating the opportunity — no interview coaching. */
  pm_candidate_intelligence: Array<{
    insight: string;
    strategic_significance: string;
    confidence: "high" | "medium" | "low";
  }>;

  scorecard: {
    company_quality: Score;
    business_momentum: Score;
    strategic_clarity: Score;
    competitive_position: Score;
    ai_platform_relevance: Score;
    leadership_quality_signal: Score;
    employee_sentiment_signal: Score;
    senior_pm_opportunity_quality: Score;
    overall_company_attractiveness: Score;
  };

  evidence_quality: {
    source_count: number;
    primary_source_count: number;
    secondary_source_count: number;
    sentiment_source_count: number;
    strongest_sources: Citation[];
    weakest_areas: string[];
    unresolved_questions: string[];
  };
}

// ─── Quality gate evaluation ─────────────────────────────────────────────────

export interface CompanyDeepDiveEvaluation {
  overall_verdict: "pass" | "partial" | "fail" | "retry_required";

  scores: {
    evidence_grounding: number;
    company_specificity: number;
    strategic_depth: number;
    competitive_analysis_quality: number;
    employee_sentiment_quality: number;
    company_intelligence_value: number;
    inference_discipline: number;
    citation_quality: number;
    anti_generic_quality: number;
  };

  section_verdicts: Array<{
    section_key: string;
    verdict: "strong" | "acceptable" | "weak" | "missing" | "hallucination_risk";
    reason: string;
    repair_instruction?: string;
  }>;

  hallucination_flags: Array<{
    claim: string;
    reason: string;
    severity: "high" | "medium" | "low";
  }>;

  generic_language_flags: string[];

  required_retries: Array<{
    section_key: string;
    retry_type:
      | "reretrieve"
      | "resynthesize"
      | "add_sources"
      | "suppress"
      | "manual_review";
    reason: string;
  }>;
}

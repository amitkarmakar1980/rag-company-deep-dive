// User types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Company types
export interface Company {
  id: string;
  name: string;
  normalized_name: string;
  website_url?: string;
  created_at: string;
}

// Deep Dive Request types
export type DeepDiveStatus =
  | "pending"
  | "fetching_sources"
  | "indexing"
  | "generating_report"
  | "generating_deep_analysis"
  | "generating_interview_layer"
  | "completed"
  | "failed";

export interface DeepDiveRequest {
  id: string;
  user_id: string;
  company_id: string;
  role_title: string;
  job_description?: string;
  company_url?: string;
  profile_context?: string;
  status: DeepDiveStatus;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
}

// Source types
export type SourceType =
  | "job_description"
  | "company_homepage"
  | "newsroom"
  | "blog"
  | "custom_url"
  | "profile_text";

export interface Source {
  id: string;
  company_id: string;
  request_id: string;
  source_type: SourceType;
  title: string;
  url?: string;
  raw_content: string;
  cleaned_content: string;
  published_at?: string;
  fetched_at: string;
  trust_score: number;
  content_hash: string;
}

// Chunk types
export interface Chunk {
  id: string;
  source_id: string;
  chunk_index: number;
  text: string;
  token_count: number;
  metadata_json?: Record<string, any>;
}

// Embedding type
export interface Embedding {
  id: string;
  chunk_id: string;
  embedding: number[];
}

// Report types
export type RecommendationType =
  | "pursue"
  | "pursue_cautiously"
  | "avoid"
  | "need_more_signal";

export interface ReportScore {
  company_momentum: number;
  org_clarity: number;
  role_leverage: number;
  execution_risk: number;
  candidate_fit: number;
}

export interface Report {
  id: string;
  request_id: string;
  report_format?: string;
  report_family?: string;
  recommendation: RecommendationType;
  company_momentum_score: number;
  org_clarity_score: number;
  role_leverage_score: number;
  execution_risk_score: number;
  candidate_fit_score: number;
  ai_query_count?: number;
  source_count?: number;
  source_host_count?: number;
  summary_json?: Record<string, any>;
  created_at: string;
}

export interface ReportSection {
  id: string;
  report_id: string;
  display_order?: number;
  section_key: string;
  section_title: string;
  content_markdown: string;
  citations_json?: Array<{
    source_id: string;
    url?: string;
    title: string;
  }>;
}

// ─── Token Usage Types ──────────────────────────────────────────────────────

export interface LLMCallUsage {
  model: string;
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  /** Reasoning tokens (o3/o-series only — billed as output) */
  reasoning_tokens?: number;
  /** Estimated cost in USD */
  estimated_cost_usd: number;
}

export interface ReportTokenUsage {
  calls: LLMCallUsage[];
  total_tokens: number;
  total_cost_usd: number;
}

// Feedback types
export type FeedbackType = "useful" | "not_useful";

export interface FeedbackEvent {
  id: string;
  report_id: string;
  section_key: string;
  feedback_type: FeedbackType;
  feedback_value: boolean;
  created_at: string;
}

// Generation context types
export interface RetrievalContext {
  chunks: Array<{
    text: string;
    source_id: string;
    source_title: string;
    source_url?: string;
    source_type: SourceType;
  }>;
  metadata: {
    total_chunks_available: number;
    retrieval_confidence: number;
    evidence_quality?: {
      rating: "strong" | "moderate" | "weak" | "insufficient";
      distinct_source_count: number;
      distinct_source_types: number;
      warnings: string[];
    };
  };
}

export interface SectionGenerationInput {
  section_key: string;
  context: RetrievalContext;
  userContext: {
    role_title: string;
    company_name: string;
    job_description?: string;
    profile_context?: string;
  };
}

// ─── Candidate Overlay Types ────────────────────────────────────────────────

export type CandidateFitLevel = "strong" | "moderate" | "stretch" | "mismatch";
export type OverlayStatus = "pending" | "generating" | "completed" | "failed";

export interface CandidateAlignment {
  alignment: string;
  resume_evidence: string;
}

export interface CandidateConcern {
  concern: string;
  likely_question: string;
  severity: "high" | "medium" | "low";
}

export interface CandidateGap {
  gap: string;
  reframe: string;
  talking_point: string;
}

export interface StoryRecommendation {
  theme: string;
  suggested_story: string;
  maps_to_requirement: string;
}

export interface CandidateOverlayData {
  candidate_role_match: {
    overall_fit: CandidateFitLevel;
    match_score: number; // 1–10
    rationale: string;
    key_alignments: CandidateAlignment[];
    key_gaps: string[];
  };
  strengths_to_emphasize: {
    strengths: Array<{
      strength: string;
      evidence_from_resume: string;
      why_it_matters_for_role: string;
    }>;
  };
  interviewer_concerns: {
    concerns: CandidateConcern[];
  };
  gap_management: {
    gaps: CandidateGap[];
  };
  story_recommendations: {
    stories: StoryRecommendation[];
  };
  positioning_strategy: {
    headline: string;
    narrative_arc: string;
    tell_me_about_yourself: string;
    what_to_avoid: string[];
  };
  objection_handling: {
    objections: Array<{
      objection: string;
      why_they_think_this: string;
      how_to_respond: string;
      proof_points: string[];
      what_not_to_say: string;
    }>;
  };
}

export interface CandidateOverlay {
  id: string;
  request_id: string;
  resume_id: string;
  overlay_json: CandidateOverlayData | null;
  status: OverlayStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// ─── Structured Report Section Types ───────────────────────────────────────

export interface SWOTItem {
  point: string;
  evidence?: string;
}

export interface SWOTSection {
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
}

export type SignalLabel = "Strong" | "Mixed" | "Weak" | "NOT_ASSESSED";
export type RiskLabel = "Low" | "Medium" | "High";
export type ConfidenceLevel = "high" | "medium" | "low" | "none";
export type EvidenceBasis = "strong" | "partial" | "inferred";
export type EvidenceQuality = "strong" | "partial" | "weak";

// ─── Evidence Contract (Phase 2 — System Contract layers) ──────────────────

export interface VerifiedFact {
  claim: string;
  source_ref: string; // e.g. "Job description", "TechCrunch 2024-11", "Company blog"
}

export interface KeyInference {
  inference: string;
  basis: string; // what evidence supports this
  confidence: ConfidenceLevel;
}

export interface EvidenceGap {
  what_is_missing: string;
  why_it_matters: string;
}

export interface CandidateGuidanceItem {
  action: string;
  basis: string; // which verified fact or gap drives this
}

export interface NextBestAction {
  action: string;
  rationale: string;
}

export interface EvidenceContract {
  verified_facts: VerifiedFact[];
  key_inferences: KeyInference[];
  evidence_gaps: EvidenceGap[];
  candidate_guidance: CandidateGuidanceItem[];
  next_best_actions: NextBestAction[];
}

export interface ScoreDetail {
  score: number | null; // 1–10, or null when NOT_ASSESSED
  label: SignalLabel;
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface RiskScoreDetail {
  score: number; // 1–10 (lower is better)
  label: RiskLabel;
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface QuestionItem {
  question: string;
  why_it_matters: string;
  strong_answer: string;
  weak_answer: string;
  follow_up?: string;
}

export interface RiskFlag {
  flag: string;
  signal: string;
  severity: "high" | "medium" | "low";
  impact: string;
}

export type StrategicClassification =
  | "Strategic Core Bet"
  | "Important Enabler"
  | "Opportunistic Build"
  | "Tactical Fill"
  | "Unclear";

export type PursueRecommendation =
  | "Aggressive Pursue"
  | "Selective Pursue"
  | "Cautious Pursue"
  | "Pass";

export interface InterviewAgendaDimension {
  dimension: string;
  what_they_validate: string;
  what_they_worry_about: string;
  proof_needed: string;
  what_to_demonstrate: string;
}

export interface UnknownToValidate {
  what_is_unclear: string;
  why_it_matters: string;
  question_to_ask: string;
  reassuring_answer: string;
  concerning_answer: string;
}

export interface StructuredReport {
  // ── Company foundation ──────────────────────────────────────────────────
  company_overview: {
    founded?: string;
    headquarters?: string;
    employees?: string;
    stage: string; // public | private | pre-IPO | etc.
    funding?: string;
    products_services: string[];
    key_markets: string[];
    notable_customers: string[];
    recent_milestones: string[];
  };
  mission_vision_leadership: {
    mission: string;
    vision: string;
    leadership_principles: string[];
    ceo: string;
    key_executives: Array<{ name: string; role: string; context: string }>;
    culture_signals: string[];
  };
  // ── Decision layer (top of page) ───────────────────────────────────────
  interview_decision_summary: {
    pursue_recommendation: PursueRecommendation;
    why: string;
    best_positioning_angle: string;
    biggest_interviewer_concern: string;
    top_3_questions: string[];
    interview_watchout: string;
    red_flag_to_validate: string;
  };
  five_minute_brief: {
    what_company_cares_about: string;
    why_role_exists: string;
    likely_success_metric: string;
    best_candidate_angle: string;
    biggest_concern_to_address: string;
    top_3_smart_questions: string[];
    most_important_risk: string;
  };
  // ── Core analysis ───────────────────────────────────────────────────────
  executive_summary: {
    recommendation: RecommendationType;
    recommendation_rationale: string;
    key_bullets: string[];
    pursuit_stance: string;
  };
  assessment_snapshot: {
    company_momentum: ScoreDetail;
    org_clarity: ScoreDetail;
    role_leverage: ScoreDetail;
    execution_risk: RiskScoreDetail;
    candidate_role_match: ScoreDetail;
    evidence_strength: ScoreDetail;
  };
  strategic_bet_analysis: {
    classification: StrategicClassification;
    confidence: ConfidenceLevel;
    why_we_believe_this: string[];
    supporting_evidence: string[];
    what_could_disprove: string[];
    candidate_implication: {
      scope_impact: string;
      visibility: string;
      career_upside: string;
      interview_adaptation: string;
    };
  };
  likely_interview_agenda: {
    dimensions: InterviewAgendaDimension[];
  };
  questions_to_ask: {
    must_ask: QuestionItem[];
    good_questions: QuestionItem[];
  };
  risks_red_flags: RiskFlag[];
  unknowns_to_validate: {
    unknowns: UnknownToValidate[];
  };
  // ── Deep context (collapsible) ──────────────────────────────────────────
  company_snapshot: {
    business_model: string;
    strategic_priorities: string[];
    momentum_signals: string[];
    pressure_points: string[];
    competitive_context: string;
    evidence_basis: EvidenceBasis;
  };
  company_swot: SWOTSection;
  role_snapshot: {
    likely_charter: string;
    success_metrics: string[];
    key_stakeholders: string[];
    likely_challenges: string[];
    first_year_expectations: string[];
  };
  role_swot: SWOTSection;
  why_role_exists_now: {
    primary_driver: string;
    supporting_signals: string[];
    confidence: ConfidenceLevel;
  };
  // ── System Contract (explicit fact/inference/gap layers) ─────────────────
  evidence_contract: EvidenceContract;
}

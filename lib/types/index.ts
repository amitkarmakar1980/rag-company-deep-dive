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
  created_at: string;
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
  recommendation: RecommendationType;
  company_momentum_score: number;
  org_clarity_score: number;
  role_leverage_score: number;
  execution_risk_score: number;
  candidate_fit_score: number;
  summary_json?: Record<string, any>;
  created_at: string;
}

export interface ReportSection {
  id: string;
  report_id: string;
  section_key: string;
  section_title: string;
  content_markdown: string;
  citations_json?: Array<{
    source_id: string;
    url?: string;
    title: string;
  }>;
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

export type SignalLabel = "Strong" | "Mixed" | "Weak";
export type RiskLabel = "Low" | "Medium" | "High";
export type ConfidenceLevel = "high" | "medium" | "low";
export type EvidenceBasis = "strong" | "partial" | "inferred";
export type EvidenceQuality = "strong" | "partial" | "weak";

export interface ScoreDetail {
  score: number; // 1–10
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

export interface StructuredReport {
  executive_summary: {
    recommendation: RecommendationType;
    recommendation_rationale: string;
    key_bullets: string[]; // 5–7 max
    pursuit_stance: string;
  };
  assessment_snapshot: {
    company_momentum: ScoreDetail;
    org_clarity: ScoreDetail;
    role_leverage: ScoreDetail;
    execution_risk: RiskScoreDetail;
    candidate_fit: ScoreDetail;
    evidence_strength: ScoreDetail;
  };
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
  strategic_bet_analysis: {
    classification: StrategicClassification;
    confidence_score: number; // 0–1
    rationale: string[];
    risks_caveats: string[];
    interview_implication: string;
  };
  candidate_positioning: {
    framing_strategy: string;
    strengths_to_emphasize: string[];
    potential_gaps: string[];
    gap_reframes: string[];
    what_not_to_overclaim: string[];
  };
  questions_to_ask: {
    strategy: QuestionItem[];
    role_scope: QuestionItem[];
    team_execution: QuestionItem[];
    success_metrics: QuestionItem[];
    risks_constraints: QuestionItem[];
  };
  risks_red_flags: RiskFlag[];
  evidence_gaps: {
    gaps: string[];
    additional_sources_needed: string[];
    overall_evidence_quality: EvidenceQuality;
  };
}

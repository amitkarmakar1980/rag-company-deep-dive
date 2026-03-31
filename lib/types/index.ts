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
export type RecommendationType = "pursue" | "pursue_cautiously" | "avoid" | "need_more_signal";

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

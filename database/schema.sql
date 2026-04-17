-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) UNIQUE NOT NULL,
  website_url VARCHAR(512),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deep dive requests
CREATE TABLE IF NOT EXISTS deep_dive_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  role_title VARCHAR(255) NOT NULL,
  job_description TEXT,
  company_url VARCHAR(512),
  profile_context TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deep_dive_requests ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE deep_dive_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  request_id UUID NOT NULL REFERENCES deep_dive_requests(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  title VARCHAR(511),
  url VARCHAR(512),
  raw_content TEXT,
  cleaned_content TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  trust_score FLOAT DEFAULT 0.8,
  content_hash VARCHAR(100)
);

-- Chunks
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  text TEXT NOT NULL,
  token_count INTEGER
);

-- Embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  embedding vector(1536)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES deep_dive_requests(id),
  report_format VARCHAR(50) NOT NULL DEFAULT 'legacy_v1',
  report_family VARCHAR(50) NOT NULL DEFAULT 'legacy',
  recommendation VARCHAR(50),
  company_momentum_score FLOAT,
  org_clarity_score FLOAT,
  role_leverage_score FLOAT,
  execution_risk_score FLOAT,
  candidate_fit_score FLOAT,
  ai_query_count INTEGER DEFAULT 0,
  source_count INTEGER DEFAULT 0,
  source_host_count INTEGER DEFAULT 0,
  summary_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_request_id_key;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_format VARCHAR(50) NOT NULL DEFAULT 'legacy_v1';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_family VARCHAR(50) NOT NULL DEFAULT 'legacy';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_query_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_host_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_reports_request_id_created_at ON reports(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_request_id_format_created_at ON reports(request_id, report_format, created_at DESC);

-- Report sections
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  section_key VARCHAR(100),
  section_title VARCHAR(255),
  content_markdown TEXT,
  citations_json JSONB
);

ALTER TABLE report_sections ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Feedback events
CREATE TABLE IF NOT EXISTS feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  section_key VARCHAR(100),
  feedback_type VARCHAR(50),
  feedback_value BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Normalize legacy timestamp-without-time-zone columns to timestamptz.
-- Existing values were written in UTC by the app, so cast them as UTC to preserve meaning.
ALTER TABLE users
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE companies
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE deep_dive_requests
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE updated_at AT TIME ZONE 'UTC' END,
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE sources
  ALTER COLUMN published_at TYPE TIMESTAMPTZ USING CASE WHEN published_at IS NULL THEN NULL ELSE published_at AT TIME ZONE 'UTC' END,
  ALTER COLUMN fetched_at TYPE TIMESTAMPTZ USING fetched_at AT TIME ZONE 'UTC',
  ALTER COLUMN fetched_at SET DEFAULT NOW();

ALTER TABLE reports
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE feedback_events
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT NOW();

-- Candidate resumes (uploaded per user; reusable across multiple deep dives)
CREATE TABLE IF NOT EXISTS candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- pending | parsed | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate overlay — personalization layer generated from resume + base report
CREATE TABLE IF NOT EXISTS candidate_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES deep_dive_requests(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES candidate_resumes(id),
  overlay_json JSONB,
  ai_query_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',  -- pending | generating | completed | failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, resume_id)
);

ALTER TABLE candidate_overlays ADD COLUMN IF NOT EXISTS ai_query_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_candidate_resumes_user_id ON candidate_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_overlays_request_id ON candidate_overlays(request_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON companies(normalized_name);
CREATE INDEX IF NOT EXISTS idx_deep_dive_requests_user_id ON deep_dive_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_company_id ON sources(company_id);
CREATE INDEX IF NOT EXISTS idx_sources_request_id ON sources(request_id);
CREATE INDEX IF NOT EXISTS idx_chunks_source_id ON chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Vector search function
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector,
  request_id UUID,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  similarity FLOAT
) AS $$
  SELECT 
    e.chunk_id,
    (e.embedding <=> query_embedding) as similarity
  FROM embeddings e
  JOIN chunks c ON e.chunk_id = c.id
  JOIN sources s ON c.source_id = s.id
  WHERE s.request_id = search_embeddings.request_id
  AND (e.embedding <=> query_embedding) < (1 - similarity_threshold)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL;

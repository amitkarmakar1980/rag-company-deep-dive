-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) UNIQUE NOT NULL,
  website_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT NOW()
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
  created_at TIMESTAMP DEFAULT NOW()
);

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
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW(),
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
  request_id UUID NOT NULL UNIQUE REFERENCES deep_dive_requests(id),
  recommendation VARCHAR(50),
  company_momentum_score FLOAT,
  org_clarity_score FLOAT,
  role_leverage_score FLOAT,
  execution_risk_score FLOAT,
  candidate_fit_score FLOAT,
  summary_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Report sections
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_key VARCHAR(100),
  section_title VARCHAR(255),
  content_markdown TEXT,
  citations_json JSONB
);

-- Feedback events
CREATE TABLE IF NOT EXISTS feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  section_key VARCHAR(100),
  feedback_type VARCHAR(50),
  feedback_value BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

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

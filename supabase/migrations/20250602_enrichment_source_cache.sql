-- Enrichment source cache: stores fetched content from LinkedIn, Glassdoor,
-- Levels.fyi, Built In, and Indeed with a 7-day TTL per company + source type.
-- On a cache hit the ingestion pipeline reuses stored content, skipping the
-- Firecrawl HTTP fetch entirely.

CREATE TABLE IF NOT EXISTS enrichment_source_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_type   TEXT        NOT NULL,
  url           TEXT,
  title         TEXT        NOT NULL DEFAULT '',
  raw_content   TEXT        NOT NULL DEFAULT '',
  cleaned_content TEXT      NOT NULL,
  content_hash  TEXT        NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  metadata_json JSONB,

  -- One cached entry per (company, source_type, url).
  -- NULL url uses a separate constraint path so multiple null-url rows
  -- (e.g. composite scraped pages) don't collide.
  CONSTRAINT enrichment_cache_unique_url
    UNIQUE NULLS NOT DISTINCT (company_id, source_type, url)
);

CREATE INDEX IF NOT EXISTS idx_enrichment_cache_lookup
  ON enrichment_source_cache (company_id, source_type, expires_at);

-- Auto-purge expired rows (run via pg_cron or manually):
-- DELETE FROM enrichment_source_cache WHERE expires_at < now();

-- Row-Level Security Policies
-- Run this against your Supabase database after the main schema.sql
-- These policies ensure users can only access their own data.
-- Note: API routes use the service role key (bypasses RLS).
-- RLS protects against direct anon-key access (e.g. accidental client-side queries).

-- Enable RLS on all user-data tables
ALTER TABLE deep_dive_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_events     ENABLE ROW LEVEL SECURITY;

-- companies: publicly readable, only service role can write
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_read_all"
  ON companies FOR SELECT
  USING (true);

-- deep_dive_requests: users see only their own rows
CREATE POLICY "requests_owner_select"
  ON deep_dive_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "requests_owner_insert"
  ON deep_dive_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "requests_owner_update"
  ON deep_dive_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "requests_owner_delete"
  ON deep_dive_requests FOR DELETE
  USING (auth.uid() = user_id);

-- sources: accessible if the parent request belongs to the current user
CREATE POLICY "sources_owner_select"
  ON sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deep_dive_requests r
      WHERE r.id = sources.request_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "sources_owner_delete"
  ON sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM deep_dive_requests r
      WHERE r.id = sources.request_id AND r.user_id = auth.uid()
    )
  );

-- chunks: accessible if parent source belongs to the current user
CREATE POLICY "chunks_owner_select"
  ON chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sources s
      JOIN deep_dive_requests r ON r.id = s.request_id
      WHERE s.id = chunks.source_id AND r.user_id = auth.uid()
    )
  );

-- embeddings: accessible if parent chunk belongs to the current user
CREATE POLICY "embeddings_owner_select"
  ON embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chunks c
      JOIN sources s ON s.id = c.source_id
      JOIN deep_dive_requests r ON r.id = s.request_id
      WHERE c.id = embeddings.chunk_id AND r.user_id = auth.uid()
    )
  );

-- reports: accessible if parent request belongs to the current user
CREATE POLICY "reports_owner_select"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deep_dive_requests r
      WHERE r.id = reports.request_id AND r.user_id = auth.uid()
    )
  );

-- report_sections: accessible if parent report belongs to the current user
CREATE POLICY "report_sections_owner_select"
  ON report_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports rp
      JOIN deep_dive_requests r ON r.id = rp.request_id
      WHERE rp.id = report_sections.report_id AND r.user_id = auth.uid()
    )
  );

-- feedback_events: users can insert/read their own feedback
-- (no user_id column on feedback — scoped via report ownership)
CREATE POLICY "feedback_owner_select"
  ON feedback_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports rp
      JOIN deep_dive_requests r ON r.id = rp.request_id
      WHERE rp.id = feedback_events.report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "feedback_owner_insert"
  ON feedback_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports rp
      JOIN deep_dive_requests r ON r.id = rp.request_id
      WHERE rp.id = feedback_events.report_id AND r.user_id = auth.uid()
    )
  );

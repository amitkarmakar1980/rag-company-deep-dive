import { supabaseAdmin } from "./supabase";
import {
  Company,
  DeepDiveRequest,
  Source,
  Chunk,
  Report,
  ReportSection,
  FeedbackEvent,
} from "@/lib/types";

// Companies
export async function getOrCreateCompany(
  name: string,
  website_url?: string
): Promise<Company> {
  const normalized_name = name.toLowerCase().trim();

  const { data: existing } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("normalized_name", normalized_name)
    .single();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabaseAdmin
    .from("companies")
    .insert([
      {
        name,
        normalized_name,
        website_url,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return created;
}

// Deep Dive Requests
export async function createDeepDiveRequest(
  userId: string,
  companyId: string,
  roleTitle: string,
  jobDescription?: string,
  companyUrl?: string,
  profileContext?: string
): Promise<DeepDiveRequest> {
  const { data, error } = await supabaseAdmin
    .from("deep_dive_requests")
    .insert([
      {
        user_id: userId,
        company_id: companyId,
        role_title: roleTitle,
        job_description: jobDescription,
        company_url: companyUrl,
        profile_context: profileContext,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDeepDiveRequest(
  requestId: string
): Promise<DeepDiveRequest | null> {
  const { data, error } = await supabaseAdmin
    .from("deep_dive_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function updateDeepDiveStatus(
  requestId: string,
  status: string,
  errorMessage?: string | null
): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload = {
    status,
    updated_at: timestamp,
    error_message: status === "failed" ? (errorMessage ?? null) : null,
  };

  let { error } = await supabaseAdmin
    .from("deep_dive_requests")
    .update(payload)
    .eq("id", requestId);

  if (error && /updated_at|error_message/i.test(error.message)) {
    const fallbackPayload = status === "failed"
      ? { status, error_message: errorMessage ?? null }
      : { status };

    ({ error } = await supabaseAdmin
      .from("deep_dive_requests")
      .update(fallbackPayload)
      .eq("id", requestId));
  }

  if (error && /error_message/i.test(error.message)) {
    ({ error } = await supabaseAdmin
      .from("deep_dive_requests")
      .update({ status, updated_at: timestamp })
      .eq("id", requestId));
  }

  if (error && /updated_at/i.test(error.message)) {
    ({ error } = await supabaseAdmin
      .from("deep_dive_requests")
      .update({ status })
      .eq("id", requestId));
  }

  if (error) throw error;
}

export async function getRequestHistory(
  userId: string,
  limit = 10
): Promise<
  Array<{
    request: DeepDiveRequest;
    company: Company;
    report: Report | null;
  }>
> {
  const { data: requests, error: requestError } = await supabaseAdmin
    .from("deep_dive_requests")
    .select(
      `
      *,
      companies(*),
      reports(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (requestError) throw requestError;

  return (requests || []).map((req: any) => ({
    request: req,
    company: req.companies,
    report: pickLatestReport(req.reports ?? [], "premium_v2"),
  }));
}

// Sources
export async function createSource(
  companyId: string,
  requestId: string,
  sourceType: string,
  title: string,
  rawContent: string,
  cleanedContent: string,
  contentHash: string,
  url?: string,
  publishedAt?: string,
  trustScore = 0.8
): Promise<Source> {
  const { data, error } = await supabaseAdmin
    .from("sources")
    .insert([
      {
        company_id: companyId,
        request_id: requestId,
        source_type: sourceType,
        title,
        url,
        raw_content: rawContent,
        cleaned_content: cleanedContent,
        published_at: publishedAt,
        fetched_at: new Date().toISOString(),
        trust_score: trustScore,
        content_hash: contentHash,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRequestSources(
  requestId: string
): Promise<Source[]> {
  const { data, error } = await supabaseAdmin
    .from("sources")
    .select("*")
    .eq("request_id", requestId);

  if (error) throw error;
  return data || [];
}

// Chunks
export async function createChunk(
  sourceId: string,
  chunkIndex: number,
  text: string,
  tokenCount: number,
  metadata?: Record<string, any>
): Promise<Chunk> {
  const { data, error } = await supabaseAdmin
    .from("chunks")
    .insert([
      {
        source_id: sourceId,
        chunk_index: chunkIndex,
        text,
        token_count: tokenCount,
        metadata_json: metadata,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createChunks(
  sourceId: string,
  chunks: Array<{
    chunkIndex: number;
    text: string;
    tokenCount: number;
    metadata?: Record<string, any>;
  }>
): Promise<Chunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("chunks")
    .insert(
      chunks.map((chunk) => ({
        source_id: sourceId,
        chunk_index: chunk.chunkIndex,
        text: chunk.text,
        token_count: chunk.tokenCount,
        metadata_json: chunk.metadata,
      }))
    )
    .select();

  if (error) throw error;

  return ((data || []) as Chunk[]).sort(
    (left: Chunk, right: Chunk) => left.chunk_index - right.chunk_index
  );
}

export async function getSourceChunks(sourceId: string): Promise<Chunk[]> {
  const { data, error } = await supabaseAdmin
    .from("chunks")
    .select("*")
    .eq("source_id", sourceId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Reports
function isMissingReportMetricsColumn(error: { message?: string } | null | undefined): boolean {
  return /ai_query_count|source_count|source_host_count|report_format|report_family|display_order/i.test(error?.message ?? "");
}

function isMissingReportSectionOrderingColumn(error: { message?: string } | null | undefined): boolean {
  return /display_order/i.test(error?.message ?? "");
}

export function getEffectiveReportFormat(report: Pick<Report, "report_format" | "summary_json">): string {
  if (report.report_format) {
    return report.report_format;
  }

  const summaryFormat = report.summary_json?.report_format;
  if (typeof summaryFormat === "string" && summaryFormat.length > 0) {
    return summaryFormat;
  }

  if (report.summary_json?.generator_version === "premium_v2_default") {
    return "premium_v2";
  }

  return "legacy_v1";
}

export function getEffectiveReportFamily(report: Pick<Report, "report_family" | "summary_json">): string {
  if (report.report_family) {
    return report.report_family;
  }

  const summaryFamily = report.summary_json?.report_family;
  if (typeof summaryFamily === "string" && summaryFamily.length > 0) {
    return summaryFamily;
  }

  const format = getEffectiveReportFormat(report);
  if (format.startsWith("premium_")) {
    return "premium";
  }

  return "legacy";
}

function pickLatestReport(
  reports: Report[],
  preferredFormat?: string
): Report | null {
  if (!reports.length) {
    return null;
  }

  const sorted = [...reports].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  if (!preferredFormat) {
    return sorted[0] ?? null;
  }

  const preferredFormats = preferredFormat === "premium_v2"
    ? ["premium_v2", "premium_v1"]
    : [preferredFormat];

  return sorted.find((report) => preferredFormats.includes(getEffectiveReportFormat(report))) ?? sorted[0] ?? null;
}

export async function createReport(
  requestId: string,
  recommendation: string,
  scores: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  },
  summaryJson?: Record<string, any>,
  metrics?: {
    ai_query_count?: number;
    source_count?: number;
    source_host_count?: number;
  },
  options?: {
    report_format?: string;
    report_family?: string;
  }
): Promise<Report> {
  const payload = {
    request_id: requestId,
    report_format: options?.report_format ?? "legacy_v1",
    report_family: options?.report_family ?? "legacy",
    recommendation,
    company_momentum_score: scores.company_momentum,
    org_clarity_score: scores.org_clarity,
    role_leverage_score: scores.role_leverage,
    execution_risk_score: scores.execution_risk,
    candidate_fit_score: scores.candidate_fit,
    ai_query_count: metrics?.ai_query_count ?? 0,
    source_count: metrics?.source_count ?? 0,
    source_host_count: metrics?.source_host_count ?? 0,
    summary_json: summaryJson ?? null,
    created_at: new Date().toISOString(),
  };

  let { data, error } = await supabaseAdmin
    .from("reports")
    .insert([payload])
    .select()
    .single();

  if (error && isMissingReportMetricsColumn(error)) {
    ({ data, error } = await supabaseAdmin
      .from("reports")
      .insert([
        {
          request_id: requestId,
          recommendation,
          company_momentum_score: scores.company_momentum,
          org_clarity_score: scores.org_clarity,
          role_leverage_score: scores.role_leverage,
          execution_risk_score: scores.execution_risk,
          candidate_fit_score: scores.candidate_fit,
          summary_json: summaryJson ?? null,
          created_at: payload.created_at,
        },
      ])
      .select()
      .single());
  }

  if (error) throw error;
  return data;
}

export async function updateReport(
  reportId: string,
  recommendation: string,
  scores: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  },
  summaryJson?: Record<string, any>,
  metrics?: {
    ai_query_count?: number;
    source_count?: number;
    source_host_count?: number;
  },
  options?: {
    report_format?: string;
    report_family?: string;
  }
): Promise<Report> {
  const payload = {
    report_format: options?.report_format,
    report_family: options?.report_family,
    recommendation,
    company_momentum_score: scores.company_momentum,
    org_clarity_score: scores.org_clarity,
    role_leverage_score: scores.role_leverage,
    execution_risk_score: scores.execution_risk,
    candidate_fit_score: scores.candidate_fit,
    ai_query_count: metrics?.ai_query_count ?? 0,
    source_count: metrics?.source_count ?? 0,
    source_host_count: metrics?.source_host_count ?? 0,
    summary_json: summaryJson ?? null,
  };

  const filteredPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  let { data, error } = await supabaseAdmin
    .from("reports")
    .update(filteredPayload)
    .eq("id", reportId)
    .select()
    .single();

  if (error && isMissingReportMetricsColumn(error)) {
    ({ data, error } = await supabaseAdmin
      .from("reports")
      .update({
        recommendation,
        company_momentum_score: scores.company_momentum,
        org_clarity_score: scores.org_clarity,
        role_leverage_score: scores.role_leverage,
        execution_risk_score: scores.execution_risk,
        candidate_fit_score: scores.candidate_fit,
        summary_json: summaryJson ?? null,
      })
      .eq("id", reportId)
      .select()
      .single());
  }

  if (error) throw error;
  return data;
}

export async function updateReportSummaryJson(
  reportId: string,
  summaryJson: Record<string, any>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("reports")
    .update({ summary_json: summaryJson })
    .eq("id", reportId);

  if (error) throw error;
}

export async function getReportSectionCount(reportId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("report_sections")
    .select("id", { count: "exact", head: true })
    .eq("report_id", reportId);

  if (error && isMissingReportSectionOrderingColumn(error)) {
    return 0;
  }

  if (error) throw error;
  return count ?? 0;
}

export async function clearReportSections(reportId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("report_sections")
    .delete()
    .eq("report_id", reportId);

  if (error && error.code !== "PGRST116") throw error;
}

export async function getSourceCount(requestId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);

  if (error) throw error;
  return count ?? 0;
}

export async function getReport(requestId: string): Promise<Report | null> {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (error && error.code !== "PGRST116") throw error;
  return pickLatestReport((data || []) as Report[], "premium_v2");
}

export async function getReportByRequestAndFormat(
  requestId: string,
  reportFormat: string
): Promise<Report | null> {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error && error.code !== "PGRST116") throw error;
  return ((data || []) as Report[]).find((report) => getEffectiveReportFormat(report) === reportFormat) || null;
}

export async function getReportById(reportId: string): Promise<Report | null> {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

// Report Sections
export async function createReportSection(
  reportId: string,
  sectionKey: string,
  sectionTitle: string,
  contentMarkdown: string,
  displayOrder = 0,
  citations?: Array<{
    source_id: string;
    url?: string;
    title: string;
  }>
): Promise<ReportSection> {
  let { data, error } = await supabaseAdmin
    .from("report_sections")
    .insert([
      {
        report_id: reportId,
        display_order: displayOrder,
        section_key: sectionKey,
        section_title: sectionTitle,
        content_markdown: contentMarkdown,
        citations_json: citations,
      },
    ])
    .select()
    .single();

  if (error && isMissingReportSectionOrderingColumn(error)) {
    ({ data, error } = await supabaseAdmin
      .from("report_sections")
      .insert([
        {
          report_id: reportId,
          section_key: sectionKey,
          section_title: sectionTitle,
          content_markdown: contentMarkdown,
          citations_json: citations,
        },
      ])
      .select()
      .single());
  }

  if (error) throw error;
  return data;
}

export async function getReportSections(
  reportId: string
): Promise<ReportSection[]> {
  let { data, error } = await supabaseAdmin
    .from("report_sections")
    .select("*")
    .eq("report_id", reportId)
    .order("display_order", { ascending: true })
    .order("section_key", { ascending: true });

  if (error && isMissingReportSectionOrderingColumn(error)) {
    ({ data, error } = await supabaseAdmin
      .from("report_sections")
      .select("*")
      .eq("report_id", reportId)
      .order("section_key", { ascending: true }));
  }

  if (error) throw error;
  return data || [];
}

// Feedback
export async function submitFeedback(
  reportId: string,
  sectionKey: string,
  feedbackType: "useful" | "not_useful"
): Promise<FeedbackEvent> {
  const { data, error } = await supabaseAdmin
    .from("feedback_events")
    .insert([
      {
        report_id: reportId,
        section_key: sectionKey,
        feedback_type: feedbackType,
        feedback_value: feedbackType === "useful",
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Regeneration helpers
export async function deleteReportForRequest(requestId: string): Promise<void> {
  // report_sections cascade-delete when report is deleted
  const { error } = await supabaseAdmin
    .from("reports")
    .delete()
    .eq("request_id", requestId);
  if (error && error.code !== "PGRST116") throw error;
}

export async function deleteSourcesForRequest(requestId: string): Promise<void> {
  // chunks → embeddings cascade-delete when sources are deleted
  const { error } = await supabaseAdmin
    .from("sources")
    .delete()
    .eq("request_id", requestId);
  if (error) throw error;
}

// Vector search (for retrieval)
export async function semanticSearch(
  requestId: string,
  embedding: number[],
  limit = 10,
  similarityThreshold = 0.5
) {
  const { data, error } = await supabaseAdmin.rpc("search_embeddings", {
    query_embedding: embedding,
    request_id: requestId,
    match_count: limit,
    similarity_threshold: similarityThreshold,
  });

  if (error) throw error;
  return data || [];
}

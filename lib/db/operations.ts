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
  status: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("deep_dive_requests")
    .update({ status })
    .eq("id", requestId);

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
    report: req.reports?.[0] || null,
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
export async function createReport(
  requestId: string,
  recommendation: string,
  scores: {
    company_momentum: number;
    org_clarity: number;
    role_leverage: number;
    execution_risk: number;
    candidate_fit: number;
  }
): Promise<Report> {
  const { data, error } = await supabaseAdmin
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
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReport(requestId: string): Promise<Report | null> {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
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
  citations?: Array<{
    source_id: string;
    url?: string;
    title: string;
  }>
): Promise<ReportSection> {
  const { data, error } = await supabaseAdmin
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
    .single();

  if (error) throw error;
  return data;
}

export async function getReportSections(
  reportId: string
): Promise<ReportSection[]> {
  const { data, error } = await supabaseAdmin
    .from("report_sections")
    .select("*")
    .eq("report_id", reportId)
    .order("section_key", { ascending: true });

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

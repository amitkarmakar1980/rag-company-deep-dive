import { supabaseAdmin } from "@/lib/db/supabase";

export const CACHE_TTL_DAYS = 7;

export type EnrichmentSourceType =
  | "linkedin_company"
  | "glassdoor_company"
  | "levels_fyi"
  | "built_in"
  | "indeed_company"
  | "clearbit_company";

export interface CachedSource {
  id: string;
  company_id: string;
  source_type: string;
  url: string | null;
  title: string;
  raw_content: string;
  cleaned_content: string;
  content_hash: string;
  fetched_at: string;
  expires_at: string;
}

/** Returns all unexpired cache entries for a given company + source type. */
export async function getCachedSources(
  companyId: string,
  sourceType: EnrichmentSourceType
): Promise<CachedSource[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("enrichment_source_cache")
      .select("*")
      .eq("company_id", companyId)
      .eq("source_type", sourceType)
      .gt("expires_at", new Date().toISOString());

    if (error) {
      // Table not yet created — degrade gracefully
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        console.warn("[SourceCache] Table not found — run migration 20250602_enrichment_source_cache.sql");
        return [];
      }
      console.error("[SourceCache] Read error:", error.message);
      return [];
    }

    return (data ?? []) as CachedSource[];
  } catch (err) {
    console.error("[SourceCache] Unexpected read error:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Upserts a fetched page into the cache. Safe to call even if table is missing. */
export async function storeCachedSource(entry: {
  companyId: string;
  sourceType: EnrichmentSourceType;
  url: string | null;
  title: string;
  rawContent: string;
  cleanedContent: string;
  contentHash: string;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    const { error } = await supabaseAdmin.from("enrichment_source_cache").upsert(
      {
        company_id: entry.companyId,
        source_type: entry.sourceType,
        url: entry.url,
        title: entry.title,
        raw_content: entry.rawContent,
        cleaned_content: entry.cleanedContent,
        content_hash: entry.contentHash,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "company_id,source_type,url" }
    );

    if (error && error.code !== "42P01") {
      console.error("[SourceCache] Write error:", error.message);
    }
  } catch (err) {
    console.error("[SourceCache] Unexpected write error:", err instanceof Error ? err.message : err);
  }
}

/**
 * Force-expire cache entries for a company so the next ingest re-fetches them.
 * Pass sourceType to invalidate only one platform; omit to invalidate all.
 */
export async function invalidateCompanyCache(
  companyId: string,
  sourceType?: EnrichmentSourceType
): Promise<void> {
  try {
    let q = supabaseAdmin
      .from("enrichment_source_cache")
      .update({ expires_at: new Date(0).toISOString() })
      .eq("company_id", companyId);

    if (sourceType) q = q.eq("source_type", sourceType);

    const { error } = await q;
    if (error && error.code !== "42P01") {
      console.error("[SourceCache] Invalidation error:", error.message);
    }
  } catch (err) {
    console.error("[SourceCache] Unexpected invalidation error:", err instanceof Error ? err.message : err);
  }
}

/** How old is the freshest cache entry for this company+type (in hours)? Returns null if none. */
export async function getCacheAge(
  companyId: string,
  sourceType: EnrichmentSourceType
): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("enrichment_source_cache")
      .select("fetched_at")
      .eq("company_id", companyId)
      .eq("source_type", sourceType)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const ageMs = Date.now() - new Date(data.fetched_at).getTime();
    return Math.round(ageMs / (1000 * 60 * 60));
  } catch {
    return null;
  }
}

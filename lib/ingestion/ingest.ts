import { buildSourceUrls, fetchResolvedPlannedSource, ResearchPlan } from "./firecrawl";
import { cleanContent, calculateContentHash, sanitizeTextForStorage } from "./clean";
import { chunkContent } from "./chunk";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import {
  createSource,
  createChunks as dbCreateChunks,
  updateDeepDiveRequestMetadata,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";
import { ENRICHMENT_FETCH_PLAN, type EnrichmentResult } from "./enrichmentSources";
import {
  getCachedSources,
  storeCachedSource,
  getCacheAge,
} from "./sourceCache";

const SOURCE_PROCESSING_CONCURRENCY = 3;
const ENRICHMENT_CONCURRENCY = 2; // run at most 2 platform fetchers in parallel

export interface SourceInput {
  type:
    | "job_description"
    | "company_homepage"
    | "newsroom"
    | "blog"
    | "custom_url"
    | "profile_text"
    | "linkedin_company"
    | "glassdoor_company"
    | "levels_fyi"
    | "built_in"
    | "indeed_company";
  content: string;
  title: string;
  url?: string;
  priority?: number;
}

export async function ingestSources(
  requestId: string,
  companyId: string,
  companyName: string,
  roleTitle: string,
  companyUrl?: string,
  customUrls: string[] = [],
  jobDescription?: string,
  profileContext?: string
): Promise<{
  success: boolean;
  sourcesCreated: number;
  chunksCreated: number;
  researchPlan: ResearchPlan;
  error?: string;
}> {
  const sources: SourceInput[] = [];
  const stats = { success: true, sourcesCreated: 0, chunksCreated: 0 };
  const fallbackPlan: ResearchPlan = {
    strategySummary: `Fallback research plan for ${companyName}.`,
    selectedSources: [],
    retrievalQueries: [],
    sourceStrategy: {
      goal: `Fallback source strategy for ${companyName}.`,
      requiredSourceClasses: [],
      priorityOrder: [],
      recommendedSources: [],
      notes: [],
    },
  };

  try {
    console.log(`[Ingest] START requestId=${requestId} jd=${!!jobDescription} profile=${!!profileContext} companyUrl=${companyUrl}`);

    // ── Static sources (job description, profile) ──────────────────────────
    if (jobDescription) {
      sources.push({
        type: "job_description",
        content: jobDescription,
        title: `Job Description: ${companyName}`,
        priority: 10,
      });
    }

    if (profileContext) {
      sources.push({
        type: "profile_text",
        content: profileContext,
        title: "Hiring Manager/Recruiter Profile",
        priority: 5,
      });
    }

    // ── Primary web sources (firecrawl / company site) ─────────────────────
    const researchPlan = await buildSourceUrls(
      companyName,
      roleTitle,
      companyUrl,
      customUrls,
      jobDescription,
      profileContext
    );
    await updateDeepDiveRequestMetadata(requestId, { research_plan: researchPlan });
    console.log(`[Ingest] Research plan: ${researchPlan.strategySummary}`);
    console.log(`[Ingest] Planned web sources=${researchPlan.selectedSources.length} retrievalQueries=${researchPlan.retrievalQueries.length}`);

    const fetchResults = await Promise.allSettled(
      researchPlan.selectedSources.map((urlSource) => fetchResolvedPlannedSource(urlSource))
    );

    const seenFetchedUrls = new Set<string>();
    for (const result of fetchResults) {
      if (result.status === "rejected") continue;
      for (const resolvedSource of result.value) {
        if (seenFetchedUrls.has(resolvedSource.url)) continue;
        seenFetchedUrls.add(resolvedSource.url);
        sources.push({
          type: resolvedSource.type as SourceInput["type"],
          content: resolvedSource.content,
          title: resolvedSource.title,
          url: resolvedSource.url,
          priority: resolvedSource.priority,
        });
      }
    }

    // ── Enrichment sources (LinkedIn, Glassdoor, Levels.fyi, Built In, Indeed) ─
    const enrichmentSources = await fetchEnrichmentSources(companyId, companyName);
    sources.push(...enrichmentSources);

    console.log(`[Ingest] ${sources.length} total sources to process (${enrichmentSources.length} enrichment)`);

    // ── Process all sources: chunk + embed + store ─────────────────────────
    await runWithConcurrency(sources, SOURCE_PROCESSING_CONCURRENCY, async (source) => {
      console.log(`[Ingest] Processing source: type=${source.type} title="${source.title}"`);
      const sourceStats = await processSource(requestId, companyId, source);
      stats.sourcesCreated += sourceStats.sourcesCreated;
      stats.chunksCreated += sourceStats.chunksCreated;
      console.log(`[Ingest] Source done. totals: sources=${stats.sourcesCreated} chunks=${stats.chunksCreated}`);
    });

    console.log(`[Ingest] COMPLETE sources=${stats.sourcesCreated} chunks=${stats.chunksCreated}`);
    return { ...stats, researchPlan };
  } catch (error) {
    console.error("[Ingest] ERROR:", error instanceof Error ? error.message : error);
    console.error(error);
    return {
      success: false,
      sourcesCreated: stats.sourcesCreated,
      chunksCreated: stats.chunksCreated,
      researchPlan: fallbackPlan,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Enrichment orchestrator with cache ──────────────────────────────────────

async function fetchEnrichmentSources(
  companyId: string,
  companyName: string
): Promise<SourceInput[]> {
  const results: SourceInput[] = [];

  await runWithConcurrency(
    ENRICHMENT_FETCH_PLAN,
    ENRICHMENT_CONCURRENCY,
    async (plan) => {
      const cacheAge = await getCacheAge(companyId, plan.sourceType);
      const cacheHit = cacheAge !== null && cacheAge < CACHE_TTL_HOURS;

      if (cacheHit) {
        // ── Cache hit: reuse stored content, skip HTTP fetch ─────────────
        console.log(
          `[Enrichment] ${plan.label} cache hit (${cacheAge}h old) for company=${companyId}`
        );
        const cached = await getCachedSources(companyId, plan.sourceType);
        for (const entry of cached) {
          results.push({
            type: plan.sourceType,
            content: entry.cleaned_content,
            title: entry.title,
            url: entry.url ?? undefined,
            priority: 3,
          });
        }
        return;
      }

      // ── Cache miss / expired: fetch fresh ───────────────────────────────
      console.log(`[Enrichment] ${plan.label} fetching fresh for "${companyName}"`);
      let fetched: EnrichmentResult[] = [];
      try {
        fetched = await plan.fetch(companyName);
      } catch (err) {
        console.warn(
          `[Enrichment] ${plan.label} fetch error:`,
          err instanceof Error ? err.message : err
        );
        return;
      }

      console.log(`[Enrichment] ${plan.label} got ${fetched.length} results`);

      for (const item of fetched) {
        if (!item.content || item.content.length < 150) continue;

        const rawContent = sanitizeTextForStorage(item.content);
        const cleanedContent = cleanContent(rawContent);
        if (!cleanedContent.trim()) continue;

        const contentHash = calculateContentHash(cleanedContent);

        // Store in cache (non-blocking — errors logged inside)
        await storeCachedSource({
          companyId,
          sourceType: plan.sourceType,
          url: item.url,
          title: item.title,
          rawContent,
          cleanedContent,
          contentHash,
        });

        results.push({
          type: plan.sourceType,
          content: cleanedContent,
          title: item.title,
          url: item.url,
          priority: 3,
        });
      }
    }
  );

  return results;
}

// 7 days in hours — matches CACHE_TTL_DAYS in sourceCache.ts
const CACHE_TTL_HOURS = 7 * 24;

// ── Source processor ─────────────────────────────────────────────────────────

async function processSource(
  requestId: string,
  companyId: string,
  sourceInput: SourceInput
): Promise<{ sourcesCreated: number; chunksCreated: number }> {
  const sanitizedRawContent = sanitizeTextForStorage(sourceInput.content);
  const cleanedContent = cleanContent(sanitizedRawContent);

  if (!cleanedContent.trim()) {
    console.warn("Source produced no content after cleaning:", sourceInput.url);
    return { sourcesCreated: 0, chunksCreated: 0 };
  }

  const contentHash = calculateContentHash(cleanedContent);

  const source = await createSource(
    companyId,
    requestId,
    sourceInput.type,
    sourceInput.title,
    sanitizedRawContent,
    cleanedContent,
    contentHash,
    sourceInput.url,
    undefined,
    0.8 + (sourceInput.priority || 0) * 0.02
  );

  const chunks = chunkContent(cleanedContent);
  const chunkTexts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(chunkTexts);

  const dbChunks = await dbCreateChunks(
    source.id,
    chunks.map((chunk) => ({
      chunkIndex: chunk.index,
      text: chunk.text,
      tokenCount: chunk.tokenCount,
    }))
  );

  const embeddingRows = dbChunks.map((dbChunk, i) => ({
    chunk_id: dbChunk.id,
    embedding: embeddings[i],
  }));

  await supabaseAdmin.from("embeddings").insert(embeddingRows);

  return { sourcesCreated: 1, chunksCreated: dbChunks.length };
}

// ── Concurrency helper ───────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;

  let currentIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (currentIndex < items.length) {
        const item = items[currentIndex++];
        await worker(item);
      }
    })
  );
}

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

const SOURCE_PROCESSING_CONCURRENCY = 3;

export interface SourceInput {
  type:
    | "job_description"
    | "company_homepage"
    | "newsroom"
    | "blog"
    | "custom_url"
    | "profile_text";
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
    // Assemble sources to fetch
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

    // Fetch web sources
    const researchPlan = await buildSourceUrls(
      companyName,
      roleTitle,
      companyUrl,
      customUrls,
      jobDescription,
      profileContext
    );
    await updateDeepDiveRequestMetadata(requestId, {
      research_plan: researchPlan,
    });
    console.log(`[Ingest] Research plan: ${researchPlan.strategySummary}`);
    console.log(`[Ingest] Planned web sources=${researchPlan.selectedSources.length} retrievalQueries=${researchPlan.retrievalQueries.length}`);

    // Fetch all web sources in parallel
    const fetchResults = await Promise.allSettled(
      researchPlan.selectedSources.map((urlSource) => fetchResolvedPlannedSource(urlSource))
    );

    const seenFetchedUrls = new Set<string>();

    for (const result of fetchResults) {
      if (result.status === "rejected") continue;
      for (const resolvedSource of result.value) {
        if (seenFetchedUrls.has(resolvedSource.url)) {
          continue;
        }

        seenFetchedUrls.add(resolvedSource.url);
        sources.push({
          type: resolvedSource.type as any,
          content: resolvedSource.content,
          title: resolvedSource.title,
          url: resolvedSource.url,
          priority: resolvedSource.priority,
        });
      }
    }

    console.log(`[Ingest] ${sources.length} sources to process`);

    await runWithConcurrency(sources, SOURCE_PROCESSING_CONCURRENCY, async (source) => {
      console.log(`[Ingest] Processing source: type=${source.type} title="${source.title}"`);
      const sourceStats = await processSource(requestId, companyId, source);
      stats.sourcesCreated += sourceStats.sourcesCreated;
      stats.chunksCreated += sourceStats.chunksCreated;
      console.log(`[Ingest] Source done. totals: sources=${stats.sourcesCreated} chunks=${stats.chunksCreated}`);
    });

    console.log(`[Ingest] COMPLETE sources=${stats.sourcesCreated} chunks=${stats.chunksCreated}`);
    return {
      ...stats,
      researchPlan,
    };
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

  // Create source record
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

  // Chunk content
  const chunks = chunkContent(cleanedContent);

  // Generate embeddings for all chunks
  const chunkTexts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(chunkTexts);

  // Store chunks in parallel, then batch-insert embeddings
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

  // Batch insert all embeddings in one DB call
  await supabaseAdmin.from("embeddings").insert(embeddingRows);

  return {
    sourcesCreated: 1,
    chunksCreated: dbChunks.length,
  };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

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

import { buildSourceUrls, fetchPageWithFirecrawl } from "./firecrawl";
import { cleanContent, calculateContentHash } from "./clean";
import { chunkContent } from "./chunk";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import {
  createSource,
  createChunks as dbCreateChunks,
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
  companyUrl?: string,
  customUrls: string[] = [],
  jobDescription?: string,
  profileContext?: string
): Promise<{
  success: boolean;
  sourcesCreated: number;
  chunksCreated: number;
  error?: string;
}> {
  const sources: SourceInput[] = [];
  const stats = { success: true, sourcesCreated: 0, chunksCreated: 0 };

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
    const urlSources = await buildSourceUrls(
      companyName,
      companyUrl,
      customUrls
    );

    // Fetch all web sources in parallel
    const fetchResults = await Promise.allSettled(
      urlSources.map((urlSource) =>
        fetchPageWithFirecrawl(urlSource.url).then((response) => ({ urlSource, response }))
      )
    );

    for (const result of fetchResults) {
      if (result.status === "rejected") continue;
      const { urlSource, response } = result.value;
      const pageContent = response.data?.markdown || (response.data as any)?.content;
      if (response.success && pageContent) {
        sources.push({
          type: urlSource.type as any,
          content: pageContent,
          title: response.data?.metadata?.title || urlSource.url,
          url: urlSource.url,
          priority: urlSource.priority,
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
    return stats;
  } catch (error) {
    console.error("[Ingest] ERROR:", error instanceof Error ? error.message : error);
    console.error(error);
    return {
      success: false,
      sourcesCreated: stats.sourcesCreated,
      chunksCreated: stats.chunksCreated,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function processSource(
  requestId: string,
  companyId: string,
  sourceInput: SourceInput
): Promise<{ sourcesCreated: number; chunksCreated: number }> {
  const cleanedContent = cleanContent(sourceInput.content);

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
    sourceInput.content,
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

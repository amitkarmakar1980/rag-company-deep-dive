import { buildSourceUrls, fetchPageWithFirecrawl } from "./firecrawl";
import { cleanContent, calculateContentHash } from "./clean";
import { chunkContent } from "./chunk";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import {
  createSource,
  createChunk as dbCreateChunk,
} from "@/lib/db/operations";
import { supabaseAdmin } from "@/lib/db/supabase";

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
  let stats = { success: true, sourcesCreated: 0, chunksCreated: 0 };

  try {
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

    for (const urlSource of urlSources) {
      const response = await fetchPageWithFirecrawl(urlSource.url);

      if (response.success && response.data?.content) {
        sources.push({
          type: urlSource.type as any,
          content: response.data.content,
          title: response.data.metadata?.title || urlSource.url,
          url: urlSource.url,
          priority: urlSource.priority,
        });
      }
    }

    // Process each source
    for (const source of sources) {
      await processSource(
        requestId,
        companyId,
        source,
        stats
      );
    }

    return stats;
  } catch (error) {
    console.error("Ingestion error:", error);
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
  sourceInput: SourceInput,
  stats: { success: boolean; sourcesCreated: number; chunksCreated: number }
): Promise<void> {
  const cleanedContent = cleanContent(sourceInput.content);

  if (!cleanedContent.trim()) {
    console.warn("Source produced no content after cleaning:", sourceInput.url);
    return;
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

  stats.sourcesCreated++;

  // Chunk content
  const chunks = chunkContent(cleanedContent);

  // Generate embeddings for all chunks
  const chunkTexts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(chunkTexts);

  // Store chunks and embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];

    const dbChunk = await dbCreateChunk(
      source.id,
      chunk.index,
      chunk.text,
      chunk.tokenCount
    );

    // Store embedding in database
    await supabaseAdmin.from("embeddings").insert([
      {
        chunk_id: dbChunk.id,
        embedding,
      },
    ]);

    stats.chunksCreated++;
  }
}

import { supabaseAdmin } from "@/lib/db/supabase";
import { Chunk, Source, SourceType } from "@/lib/types";

export interface RetrievalResult {
  chunk: Chunk;
  source: Source;
  similarity: number;
  rank: number;
}

const STRATEGIC_KEYWORDS = [
  "launch",
  "roadmap",
  "leadership",
  "ai",
  "platform",
  "investment",
  "restructuring",
  "growth",
  "hiring",
  "efficiency",
  "margins",
  "international",
  "personalization",
  "ads",
  "partnerships",
  "acquisition",
  "strategy",
  "innovation",
  "scale",
  "expansion",
];

export async function semanticSearch(
  requestId: string,
  embedding: number[],
  limit = 15,
  similarityThreshold = 0.5
): Promise<RetrievalResult[]> {
  // Call Supabase vector search
  const { data: matches, error } = await supabaseAdmin.rpc("search_embeddings", {
    query_embedding: embedding,
    request_id: requestId,
    match_count: limit,
    similarity_threshold: similarityThreshold,
  });

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  // Fetch full source and chunk data
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const chunkIds = matches.map((match) => match.chunk_id);
  const { data: chunks, error: chunkError } = await supabaseAdmin
    .from("chunks")
    .select("*")
    .in("id", chunkIds);

  if (chunkError) {
    console.error("Chunk lookup error:", chunkError);
    return [];
  }

  const typedChunks = (chunks || []) as Chunk[];
  const chunkById = new Map(
    typedChunks.map((chunk: Chunk) => [chunk.id, chunk])
  );
  const sourceIds = Array.from(
    new Set(typedChunks.map((chunk: Chunk) => chunk.source_id))
  );

  if (sourceIds.length === 0) {
    return [];
  }

  const { data: sources, error: sourceError } = await supabaseAdmin
    .from("sources")
    .select("*")
    .in("id", sourceIds);

  if (sourceError) {
    console.error("Source lookup error:", sourceError);
    return [];
  }

  const typedSources = (sources || []) as Source[];
  const sourceById = new Map(
    typedSources.map((source: Source) => [source.id, source])
  );

  return matches.flatMap((match, index) => {
    const chunk = chunkById.get(match.chunk_id);
    const source = chunk ? sourceById.get(chunk.source_id) : undefined;

    if (!chunk || !source) {
      return [];
    }

    return [{
      chunk,
      source,
      similarity: match.similarity,
      rank: index,
    }];
  });
}

export function rerank(
  results: RetrievalResult[],
  userContext: {
    role_title: string;
    company_name: string;
  }
): RetrievalResult[] {
  // Simple heuristic reranking
  const scored = results.map((result) => {
    let score = result.similarity;

    // Boost recent sources
    const daysSincePublish = Math.floor(
      (Date.now() - new Date(result.source.published_at || result.source.fetched_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSincePublish < 30) score += 0.15;
    else if (daysSincePublish < 90) score += 0.1;
    else if (daysSincePublish < 180) score += 0.05;

    // Boost high-signal source types
    const sourceWeights: Record<SourceType, number> = {
      newsroom: 0.2,
      blog: 0.15,
      job_description: 0.25,
      company_homepage: 0.1,
      custom_url: 0.05,
      profile_text: 0.02,
    };

    score +=
      (sourceWeights[result.source.source_type as SourceType] || 0) * 0.3;

    // Boost if content contains strategic language
    const contentLower = result.chunk.text.toLowerCase();
    let keywordMatches = 0;
    for (const keyword of STRATEGIC_KEYWORDS) {
      if (contentLower.includes(keyword)) keywordMatches++;
    }

    score += Math.min(keywordMatches * 0.02, 0.1);

    // Boost if title/content matches company or role
    const companyLower = userContext.company_name.toLowerCase();
    const roleLower = userContext.role_title.toLowerCase();

    if (
      result.source.title.toLowerCase().includes(companyLower) ||
      result.chunk.text.toLowerCase().includes(companyLower)
    )
      score += 0.1;

    if (result.chunk.text.toLowerCase().includes(roleLower)) score += 0.08;

    // Penalize boilerplate
    if (
      result.chunk.text.length < 100 ||
      result.source.source_type === "company_homepage"
    )
      score -= 0.05;

    return {
      ...result,
      rerankScore: Math.min(1, score),
    };
  });

  // Sort by rerank score
  return scored
    .sort((a, b) => (b as any).rerankScore - (a as any).rerankScore)
    .map((result, index) => ({
      ...result,
      rank: index,
    }));
}

export async function retrieveForSection(
  _requestId: string,
  _sectionQuery: string,
  _userContext: {
    role_title: string;
    company_name: string;
  },
  _resultLimit = 5
) {
  // In a real system, you'd embed the query first
  // For now, return a note that this should be called with embeddings

  // This is called after embedding the section query
  // See generateSection in report module for usage
  return {
    chunks: [],
    metadata: {
      total_chunks_available: 0,
      retrieval_confidence: 0,
    },
  };
}

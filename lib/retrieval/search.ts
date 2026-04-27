import { supabaseAdmin } from "@/lib/db/supabase";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { Chunk, Source, SourceType } from "@/lib/types";

export interface RetrievalResult {
  chunk: Chunk;
  source: Source;
  similarity: number;
  rank: number;
}

/**
 * Topic-decomposed retrieval queries.
 * Each covers a distinct analytical dimension so that no single dimension
 * dominates the embedding space of a broad query.
 */
const DEFAULT_TOPIC_QUERIES = [
  // 1. Company snapshot — factual foundation for Company Deep Dive
  "company history founding mission vision values employee count revenue valuation business model overview",
  // 2. Product lines, segments, and how the company makes money
  "product lines business segments revenue streams pricing customers markets how company makes money segment breakdown",
  // 3. Strategic bets and transformation — what leadership is investing in now
  "strategic priorities investment growth initiatives transformation programs roadmap AI platform expansion named bets",
  // 4. Market position, competitors, and competitive advantage
  "market position competitors competitive landscape market share differentiation moat strengths weaknesses industry dynamics",
  // 5. Investor, earnings, and financial signals
  "investor relations earnings shareholder letter annual report 10-K financial results guidance capital allocation strategic priorities",
  // 6. Leadership intent, culture, and operating style
  "CEO leadership team executive vision culture values operating principles decision making org structure management style",
  // 7. Role scope, charter, and hiring rationale
  "role responsibilities success metrics deliverables expectations hiring mandate what this role does ownership stakeholders",
  // 8. Risks, headwinds, and pressure points
  "risks challenges headwinds layoffs restructuring competition pressure financial constraints execution risk regulatory",
];

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
    // custom_url covers investor relations, annual reports, earnings, careers — give it significant weight
    const sourceWeights: Record<SourceType, number> = {
      newsroom: 0.2,
      blog: 0.15,
      job_description: 0.25,
      company_homepage: 0.05,
      custom_url: 0.2,
      profile_text: 0.02,
    };

    score +=
      (sourceWeights[result.source.source_type as SourceType] || 0) * 0.3;

    // Extra boost for investor/earnings content regardless of source type
    const titleLower = (result.source.title ?? "").toLowerCase();
    const urlLower = (result.source.url ?? "").toLowerCase();
    if (/investor|earnings|annual.report|10-k|shareholder|ir\./.test(titleLower + urlLower)) {
      score += 0.12;
    }

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
  const sorted = scored
    .sort((a, b) => (b as any).rerankScore - (a as any).rerankScore);

  // Source diversity cap: max 3 chunks per source to prevent one source
  // dominating context and inflating confidence in a single signal
  const chunksPerSource = new Map<string, number>();
  const diversified: typeof sorted = [];
  for (const result of sorted) {
    const sourceId = result.source.id;
    const count = chunksPerSource.get(sourceId) ?? 0;
    if (count < 3) {
      diversified.push(result);
      chunksPerSource.set(sourceId, count + 1);
    }
  }

  return diversified.map((result, index) => ({ ...result, rank: index }));
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/**
 * Word-level Jaccard similarity between two text strings.
 * Two chunks are considered near-duplicates if they share > 60% of their words.
 */
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().match(/\b\w{4,}\b/g) ?? []);
  const wordsB = new Set(b.toLowerCase().match(/\b\w{4,}\b/g) ?? []);
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

/**
 * Removes near-duplicate chunks from a merged result set.
 * Keeps the higher-similarity result when two chunks are near-identical.
 * Uses a greedy O(n²) scan — acceptable for n ≤ ~100.
 */
export function deduplicateChunks(
  results: RetrievalResult[],
  threshold = 0.6
): RetrievalResult[] {
  const kept: RetrievalResult[] = [];
  for (const candidate of results) {
    const isDuplicate = kept.some(
      (k) =>
        // Same chunk ID — exact duplicate from multiple topic queries
        k.chunk.id === candidate.chunk.id ||
        // Near-duplicate by text content
        jaccardSimilarity(k.chunk.text, candidate.chunk.text) >= threshold
    );
    if (!isDuplicate) kept.push(candidate);
  }
  return kept;
}

// ─── Multi-topic retrieval ────────────────────────────────────────────────────

/**
 * Runs semantic search across all TOPIC_QUERIES in parallel, merges results,
 * deduplicates near-identical chunks, and returns the unified result set.
 *
 * This replaces the single BROAD_RETRIEVAL_QUERY approach, ensuring that
 * each analytical dimension (strategy, leadership, risks, etc.) gets
 * dedicated retrieval coverage rather than competing in one embedding space.
 */
export async function multiTopicSearch(
  requestId: string,
  /** Max chunks to retrieve per topic query (total before dedup = topics × perTopicLimit) */
  perTopicLimit = 8,
  similarityThreshold = 0.35,
  topicQueries?: string[]
): Promise<RetrievalResult[]> {
  const activeQueries = topicQueries?.length ? topicQueries : DEFAULT_TOPIC_QUERIES;

  // 1. Batch-embed all topic queries in a single API call
  const embeddings = await generateEmbeddings(activeQueries);

  // 2. Run all topic searches in parallel
  const topicResults = await Promise.all(
    embeddings.map((embedding) =>
      semanticSearch(requestId, embedding, perTopicLimit, similarityThreshold)
    )
  );

  // 3. Merge: flatten and sort by similarity descending
  const merged = topicResults
    .flat()
    .sort((a, b) => b.similarity - a.similarity);

  // 4. Deduplicate: remove exact + near-duplicate chunks
  const unique = deduplicateChunks(merged);

  console.log(
    `[multiTopicSearch] ${merged.length} raw → ${unique.length} after dedup (${merged.length - unique.length} removed)`
  );

  return unique;
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

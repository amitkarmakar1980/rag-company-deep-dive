// Text chunking for embedding and retrieval

const CHUNK_SIZE = 500; // Target tokens per chunk
const CHUNK_OVERLAP = 50; // Overlap tokens between chunks

// Rough token count (1 word ≈ 1.3 tokens)
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export interface ContentChunk {
  text: string;
  tokenCount: number;
  index: number;
}

export function chunkBySections(text: string): ContentChunk[] {
  // Try to chunk by semantic sections first
  const sections = text.split(/\n{2,}|#+\s+/);
  const chunks: ContentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    if (!section.trim()) continue;

    const sectionTokens = estimateTokens(section);

    if (sectionTokens <= CHUNK_SIZE) {
      // Section fits in one chunk
      chunks.push({
        text: section.trim(),
        tokenCount: sectionTokens,
        index: chunkIndex++,
      });
    } else {
      // Split large section by sentences
      const sentences = section.match(/[^.!?]+[.!?]+/g) || [section];
      let currentChunk = "";
      let currentTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (currentTokens + sentenceTokens > CHUNK_SIZE && currentChunk) {
          // Save current chunk
          chunks.push({
            text: currentChunk.trim(),
            tokenCount: currentTokens,
            index: chunkIndex++,
          });

          // Start overlap
          currentChunk = currentChunk
            .split(" ")
            .slice(-Math.ceil(CHUNK_OVERLAP / 2))
            .join(" ");
          currentTokens = estimateTokens(currentChunk);
        }

        currentChunk += " " + sentence;
        currentTokens = estimateTokens(currentChunk);
      }

      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          tokenCount: currentTokens,
          index: chunkIndex++,
        });
      }
    }
  }

  return chunks;
}

export function chunkByTokens(
  text: string,
  targetTokens = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): ContentChunk[] {
  const words = text.split(/\s+/);
  const chunks: ContentChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const word of words) {
    const wordTokens = estimateTokens(word);

    if (currentTokens + wordTokens > targetTokens && currentChunk.length > 0) {
      // Save chunk
      chunks.push({
        text: currentChunk.join(" "),
        tokenCount: currentTokens,
        index: chunkIndex++,
      });

      // Apply overlap
      const overlapWords = Math.ceil(overlap / 1.3);
      currentChunk = currentChunk.slice(-overlapWords);
      currentTokens = estimateTokens(currentChunk.join(" "));
    }

    currentChunk.push(word);
    currentTokens = estimateTokens(currentChunk.join(" "));
  }

  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(" "),
      tokenCount: currentTokens,
      index: chunkIndex,
    });
  }

  return chunks;
}

export function chunkContent(text: string): ContentChunk[] {
  // Try semantic chunking first, fall back to token-based if results are too large
  const semanticChunks = chunkBySections(text);

  const largeChunks = semanticChunks.filter(
    (chunk) => chunk.tokenCount > CHUNK_SIZE * 1.5
  );

  if (largeChunks.length === 0) {
    return semanticChunks;
  }

  // Split large chunks further by tokens
  const result: ContentChunk[] = [];
  let globalIndex = 0;

  for (const chunk of semanticChunks) {
    if (chunk.tokenCount > CHUNK_SIZE * 1.5) {
      const subChunks = chunkByTokens(chunk.text);
      for (const subChunk of subChunks) {
        result.push({
          ...subChunk,
          index: globalIndex++,
        });
      }
    } else {
      result.push({
        ...chunk,
        index: globalIndex++,
      });
    }
  }

  return result;
}

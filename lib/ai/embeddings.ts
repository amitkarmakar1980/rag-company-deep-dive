import OpenAI from "openai";

const EMBEDDING_BATCH_SIZE = 64;
const EMBEDDING_SAFE_MAX_CHARS = 6000;
const EMBEDDING_SAFE_MAX_TOKENS = 3500;
const EMBEDDING_RETRY_MAX_CHARS = 3000;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function trimToWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  const truncated = text.slice(0, maxChars);
  const splitAt = Math.max(truncated.lastIndexOf("\n\n"), truncated.lastIndexOf("\n"), truncated.lastIndexOf(" "));
  const boundary = splitAt >= Math.floor(maxChars * 0.6) ? splitAt : maxChars;
  return truncated.slice(0, boundary).trim();
}

function normalizeEmbeddingInput(text: string): string {
  let normalized = text.trim();

  if (!normalized) {
    return "[empty]";
  }

  normalized = trimToWordBoundary(normalized, EMBEDDING_SAFE_MAX_CHARS);

  while (estimateTokens(normalized) > EMBEDDING_SAFE_MAX_TOKENS && normalized.length > EMBEDDING_RETRY_MAX_CHARS) {
    normalized = trimToWordBoundary(normalized, Math.max(EMBEDDING_RETRY_MAX_CHARS, Math.floor(normalized.length * 0.75)));
  }

  if (estimateTokens(normalized) > EMBEDDING_SAFE_MAX_TOKENS) {
    normalized = trimToWordBoundary(normalized, EMBEDDING_RETRY_MAX_CHARS);
  }

  return normalized || "[truncated-empty]";
}

function isEmbeddingLengthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /maximum input length is 8192 tokens|Invalid 'input\[/i.test(message);
}

async function createEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: normalizeEmbeddingInput(text),
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const normalizedTexts = texts.map(normalizeEmbeddingInput);
  const embeddings: number[][] = [];

  for (let index = 0; index < normalizedTexts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = normalizedTexts.slice(index, index + EMBEDDING_BATCH_SIZE);
    try {
      embeddings.push(...await createEmbeddingBatch(batch));
    } catch (error) {
      if (!isEmbeddingLengthError(error)) {
        throw error;
      }

      for (const text of batch) {
        const fallbackText = normalizeEmbeddingInput(trimToWordBoundary(text, EMBEDDING_RETRY_MAX_CHARS));
        embeddings.push(...await createEmbeddingBatch([fallbackText]));
      }
    }
  }

  return embeddings;
}

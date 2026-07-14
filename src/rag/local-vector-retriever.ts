import { ConfigurationError } from "../config/server-env.ts";
import type { RetrievalQuery, RetrievedSource, Retriever } from "../contracts/rag.ts";
import { validateDashScopeIndex, type DashScopeIndex } from "./dashscope-index.ts";

export type EmbeddingClient = { embed(inputs: string[], options: { model: string; dimensions: number }): Promise<number[][]> };

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) throw new RangeError("Vector dimensions must match");
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export class LocalVectorRetriever implements Retriever {
  private readonly index: DashScopeIndex;
  private readonly embedding: EmbeddingClient;
  private readonly expected: { model: string; dimensions: number; minScore?: number };
  constructor(index: unknown, embedding: EmbeddingClient, expected: { model: string; dimensions: number; minScore?: number }) {
    this.embedding = embedding;
    this.expected = expected;
    this.index = validateDashScopeIndex(index);
    if (!this.index.chunks.length) throw new ConfigurationError("DashScope index is missing or empty");
    if (this.index.model !== expected.model || this.index.dimensions !== expected.dimensions) throw new ConfigurationError("DashScope index model/dimensions do not match runtime configuration");
  }
  async search(query: RetrievalQuery): Promise<RetrievedSource[]> {
    const text = query.text.trim();
    if (!text) throw new TypeError("Retrieval query must not be empty");
    const maxResults = query.maxResults ?? 8;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) throw new RangeError("maxResults must be an integer from 1 to 50");
    const [vector] = await this.embedding.embed([text], { model: this.expected.model, dimensions: this.expected.dimensions });
    if (!vector || vector.length !== this.expected.dimensions) throw new ConfigurationError("Query embedding dimensions do not match the generated index");
    const filters = query.filters ?? {};
    const minScore = this.expected.minScore ?? 0.2;
    return this.index.chunks
      .filter((chunk) => Object.entries(filters).every(([key, value]) => {
        if (key === "path") return chunk.path === value;
        if (key === "title") return chunk.title === value;
        if (key === "category") return chunk.category === value;
        if (key === "contentHash") return chunk.contentHash === value;
        if (key === "chunkId") return chunk.chunkId === value;
        return false;
      }))
      .map((chunk) => ({ chunk, score: cosineSimilarity(vector, chunk.vector) }))
      .filter(({ score }) => Number.isFinite(score) && score >= minScore)
      .sort((a, b) => b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId))
      .slice(0, maxResults)
      .map(({ chunk, score }) => ({ id: chunk.chunkId, fileId: chunk.contentHash, path: chunk.path, title: chunk.title, category: chunk.category, score, text: chunk.text, contentHash: chunk.contentHash }));
  }
}

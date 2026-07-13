import type { RetrievedSource, RetrievalQuery, Retriever } from "../contracts/rag.ts";
export class MockRetriever implements Retriever {
  private readonly sources: readonly RetrievedSource[];
  constructor(sources: readonly RetrievedSource[] = []) { this.sources = sources }
  async search(query: RetrievalQuery): Promise<RetrievedSource[]> {
    const text = query.text.trim();
    if (!text) return [];
    return this.sources.filter((source) => `${source.title}\n${source.text}`.includes(text)).slice(0, Math.max(0, query.maxResults ?? this.sources.length)).map((source) => ({ ...source }));
  }
}

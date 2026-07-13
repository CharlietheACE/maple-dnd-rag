import type { ChunkingConfig, Scalar, SourceMetadata } from "./types.ts";

export type SearchResult = { file_id: string; filename: string; score: number; attributes: Record<string, Scalar>; content: Array<{ type: "text"; text: string }> };
export interface OpenAITransport {
  search(vectorStoreId: string, body: unknown): Promise<{ data: SearchResult[] }>;
  upload(filename: string, content: string): Promise<{ id: string }>;
  attach(vectorStoreId: string, fileId: string, metadata: SourceMetadata, chunking: ChunkingConfig): Promise<{ id: string; status?: string }>;
  waitUntilIndexed(vectorStoreId: string, vectorStoreFileId: string): Promise<void>;
  detach(vectorStoreId: string, vectorStoreFileId: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
}

export class OpenAIHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export class FetchOpenAITransport implements OpenAITransport {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  constructor(apiKey: string, fetcher: typeof fetch = fetch, baseUrl = "https://api.openai.com/v1") { this.apiKey = apiKey; this.fetcher = fetcher; this.baseUrl = baseUrl; }
  private async request(endpoint: string, init: RequestInit = {}) {
    const response = await this.fetcher(`${this.baseUrl}${endpoint}`, { ...init, headers: { Authorization: `Bearer ${this.apiKey}`, ...init.headers } });
    if (!response.ok) throw new OpenAIHttpError(response.status, `OpenAI request failed (${response.status})`);
    return response.status === 204 ? undefined : response.json();
  }
  search(vectorStoreId: string, body: unknown) { return this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) as Promise<{ data: SearchResult[] }>; }
  upload(filename: string, content: string) {
    const form = new FormData(); form.set("purpose", "assistants"); form.set("file", new Blob([content], { type: "text/markdown;charset=utf-8" }), filename);
    return this.request("/files", { method: "POST", body: form }) as Promise<{ id: string }>;
  }
  attach(vectorStoreId: string, fileId: string, metadata: SourceMetadata, chunking: ChunkingConfig) {
    return this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, attributes: { source_path: metadata.path, title: metadata.title, category: metadata.category, content_hash: metadata.contentHash, sync_version: metadata.syncVersion }, chunking_strategy: { type: chunking.type, max_chunk_size_tokens: chunking.maxChunkSizeTokens, chunk_overlap_tokens: chunking.chunkOverlapTokens } }) }) as Promise<{ id: string; status?: string }>;
  }
  async waitUntilIndexed(vectorStoreId: string, id: string) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const item = await this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(id)}`) as { status: string; last_error?: { message?: string } };
      if (item.status === "completed") return;
      if (item.status === "failed" || item.status === "cancelled") throw new Error(item.last_error?.message || `Indexing ${item.status}`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 10_000)));
    }
    throw new Error("Timed out waiting for vector-store indexing");
  }
  async detach(vectorStoreId: string, id: string) { await this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  async deleteFile(id: string) { await this.request(`/files/${encodeURIComponent(id)}`, { method: "DELETE" }); }
}

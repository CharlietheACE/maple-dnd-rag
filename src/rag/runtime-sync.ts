import type { ChunkingConfig, Scalar, SourceMetadata } from "./types.ts";

export type EmbeddedDocument = SourceMetadata & { content: string };
export type RemoteVectorFile = { id: string; status: string; attributes: Record<string, Scalar> };
export type RuntimeSyncPlanItem = { document: EmbeddedDocument; action: "add" | "replace" | "skip"; previous: RemoteVectorFile[] };

export const RUNTIME_SYNC_CHUNKING: ChunkingConfig = { type: "static", maxChunkSizeTokens: 800, chunkOverlapTokens: 400 };

export interface RuntimeSyncTransport {
  list(vectorStoreId: string): Promise<RemoteVectorFile[]>;
  upload(filename: string, content: string): Promise<{ id: string }>;
  attach(vectorStoreId: string, fileId: string, metadata: SourceMetadata, chunking: ChunkingConfig): Promise<{ id: string }>;
  waitUntilIndexed(vectorStoreId: string, vectorStoreFileId: string): Promise<void>;
  detach(vectorStoreId: string, vectorStoreFileId: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
}

export function planRuntimeBatch(documents: readonly EmbeddedDocument[], remote: readonly RemoteVectorFile[], cursor: number, batchSize = 1): RuntimeSyncPlanItem[] {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > documents.length) throw new RangeError("Invalid cursor");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 4) throw new RangeError("Invalid batch size");
  return documents.slice(cursor, cursor + batchSize).map((document) => {
    const previous = remote.filter((file) => file.attributes.source_path === document.path);
    const current = previous.find((file) => file.status === "completed" && file.attributes.content_hash === document.contentHash);
    return { document, action: current ? "skip" : previous.length ? "replace" : "add", previous };
  });
}

export async function syncRuntimeBatch(options: { documents: readonly EmbeddedDocument[]; cursor: number; vectorStoreId: string; transport: RuntimeSyncTransport; batchSize?: number }) {
  const remote = await options.transport.list(options.vectorStoreId);
  const plan = planRuntimeBatch(options.documents, remote, options.cursor, options.batchSize ?? 1);
  const counts = { added: 0, replaced: 0, skipped: 0 };
  for (const item of plan) {
    if (item.action === "skip") { counts.skipped++; continue; }
    const filename = item.document.path.split("/").at(-1) || "erda.md";
    const uploaded = await options.transport.upload(filename, item.document.content);
    let attachedId: string | undefined;
    try {
      const attached = await options.transport.attach(options.vectorStoreId, uploaded.id, item.document, RUNTIME_SYNC_CHUNKING);
      attachedId = attached.id;
      await options.transport.waitUntilIndexed(options.vectorStoreId, attached.id);
      for (const previous of item.previous) {
        await options.transport.detach(options.vectorStoreId, previous.id);
        await options.transport.deleteFile(previous.id);
      }
      counts[item.action === "add" ? "added" : "replaced"]++;
    } catch (error) {
      if (attachedId) await options.transport.detach(options.vectorStoreId, attachedId).catch(() => undefined);
      await options.transport.deleteFile(uploaded.id).catch(() => undefined);
      throw error;
    }
  }
  const nextCursor = options.cursor + plan.length;
  return { ...counts, processed: plan.length, nextCursor, done: nextCursor >= options.documents.length, total: options.documents.length };
}

export class RuntimeOpenAITransport implements RuntimeSyncTransport {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  constructor(apiKey: string, fetcher: typeof fetch = fetch, baseUrl = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
    this.baseUrl = baseUrl;
  }
  private async request(endpoint: string, init: RequestInit = {}) {
    const response = await this.fetcher(`${this.baseUrl}${endpoint}`, { ...init, headers: { Authorization: `Bearer ${this.apiKey}`, ...init.headers } });
    if (!response.ok) {
      const error = new Error(`OpenAI request failed (${response.status})`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? undefined : response.json();
  }
  async list(vectorStoreId: string) {
    const files: RemoteVectorFile[] = [];
    let after: string | undefined;
    do {
      const query = new URLSearchParams({ limit: "100", order: "asc", ...(after ? { after } : {}) });
      const page = await this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files?${query}`) as { data: RemoteVectorFile[]; has_more?: boolean; last_id?: string };
      files.push(...page.data);
      after = page.has_more ? page.last_id : undefined;
    } while (after);
    return files;
  }
  upload(filename: string, content: string) {
    const form = new FormData(); form.set("purpose", "assistants"); form.set("file", new Blob([content], { type: "text/markdown;charset=utf-8" }), filename);
    return this.request("/files", { method: "POST", body: form }) as Promise<{ id: string }>;
  }
  attach(vectorStoreId: string, fileId: string, metadata: SourceMetadata, chunking: ChunkingConfig) {
    return this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, attributes: { source_path: metadata.path, title: metadata.title, category: metadata.category, content_hash: metadata.contentHash, sync_version: metadata.syncVersion }, chunking_strategy: { type: chunking.type, static: { max_chunk_size_tokens: chunking.maxChunkSizeTokens, chunk_overlap_tokens: chunking.chunkOverlapTokens } } }) }) as Promise<{ id: string }>;
  }
  async waitUntilIndexed(vectorStoreId: string, id: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const item = await this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(id)}`) as { status: string };
      if (item.status === "completed") return;
      if (item.status === "failed" || item.status === "cancelled") throw new Error(`Indexing ${item.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    throw new Error("Indexing timeout");
  }
  async detach(vectorStoreId: string, id: string) { await this.request(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  async deleteFile(id: string) { await this.request(`/files/${encodeURIComponent(id)}`, { method: "DELETE" }); }
}

export function authorizedSyncRequest(request: Request, expected: string): boolean {
  const prefix = "Bearer ";
  const actual = request.headers.get("authorization")?.startsWith(prefix) ? request.headers.get("authorization")!.slice(prefix.length) : "";
  let mismatch = actual.length ^ expected.length;
  const length = Math.max(actual.length, expected.length);
  for (let index = 0; index < length; index++) mismatch |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  return mismatch === 0 && expected.length >= 32;
}

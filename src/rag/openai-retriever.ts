import type { RetrievalQuery, RetrievedSource, Retriever } from "../contracts/index.ts";
import type { OpenAITransport } from "./openai-transport.ts";

function filtersOf(filters?: RetrievalQuery["filters"]) {
  if (!filters || !Object.keys(filters).length) return undefined;
  const remoteKeys: Record<string, string> = { path: "source_path", contentHash: "content_hash", syncVersion: "sync_version" };
  const values = Object.entries(filters).map(([key, value]) => ({ type: "eq", key: remoteKeys[key] ?? key, value }));
  return values.length === 1 ? values[0] : { type: "and", filters: values };
}

export class OpenAIRetriever implements Retriever {
  private readonly vectorStoreId: string;
  private readonly transport: Pick<OpenAITransport, "search">;
  constructor(vectorStoreId: string, transport: Pick<OpenAITransport, "search">) { this.vectorStoreId = vectorStoreId; this.transport = transport; }
  async search(query: RetrievalQuery): Promise<RetrievedSource[]> {
    const text = query.text.trim();
    if (!text) throw new TypeError("Retrieval query must not be empty");
    const maxResults = query.maxResults ?? 8;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) throw new RangeError("maxResults must be an integer from 1 to 50");
    const response = await this.transport.search(this.vectorStoreId, { query: text, max_num_results: maxResults, filters: filtersOf(query.filters) });
    return response.data.map((item, index) => ({
      id: `${item.file_id}:${index}`,
      fileId: item.file_id,
      path: String(item.attributes.source_path ?? item.filename),
      title: String(item.attributes.title ?? item.filename),
      category: String(item.attributes.category ?? "unknown"),
      score: typeof item.score === "number" ? item.score : null,
      text: item.content.filter((part) => part.type === "text").map((part) => part.text).join("\n"),
      ...(typeof item.attributes.content_hash === "string" ? { contentHash: item.attributes.content_hash } : {}),
    }));
  }
}

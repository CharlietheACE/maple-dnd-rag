import assert from "node:assert/strict";
import test from "node:test";
import { FetchOpenAITransport } from "../src/rag/openai-transport.ts";

test("uses current vector-store file attributes and nested static chunking shape", async () => {
  let request: { url?: string; init?: RequestInit } = {};
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ id: "file_1", status: "in_progress" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const transport = new FetchOpenAITransport("secret", fetcher, "https://example.test/v1");
  await transport.attach("vs_1", "file_1", { path: "ErdaBook/a.md", title: "A", category: "root", contentHash: "hash", syncVersion: "sync" }, { type: "static", maxChunkSizeTokens: 800, chunkOverlapTokens: 400 });
  assert.equal(request.url, "https://example.test/v1/vector_stores/vs_1/files");
  assert.deepEqual(JSON.parse(String(request.init?.body)), {
    file_id: "file_1",
    attributes: { source_path: "ErdaBook/a.md", title: "A", category: "root", content_hash: "hash", sync_version: "sync" },
    chunking_strategy: { type: "static", static: { max_chunk_size_tokens: 800, chunk_overlap_tokens: 400 } },
  });
  assert.equal((request.init?.headers as Record<string, string>)["Content-Type"], "application/json");
});

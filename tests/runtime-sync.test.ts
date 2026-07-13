import assert from "node:assert/strict";
import test from "node:test";
import { authorizedSameOriginSyncRequest, authorizedSyncRequest, planRuntimeBatch, RUNTIME_SYNC_CHUNKING, RuntimeOpenAITransport, SAME_ORIGIN_SYNC_HEADER, syncRuntimeBatch, type EmbeddedDocument, type RemoteVectorFile, type RuntimeSyncTransport } from "../src/rag/runtime-sync.ts";

const documents: EmbeddedDocument[] = Array.from({ length: 5 }, (_, index) => ({ path: `ErdaBook/${index}.md`, title: `标题${index}`, category: "root", contentHash: `hash${index}`, syncVersion: "sync-v1", content: `正文${index}` }));

test("rejects missing or incorrect sync bearer tokens", () => {
  const token = "x".repeat(64);
  assert.equal(authorizedSyncRequest(new Request("https://example.test"), token), false);
  assert.equal(authorizedSyncRequest(new Request("https://example.test", { headers: { Authorization: "Bearer wrong" } }), token), false);
  assert.equal(authorizedSyncRequest(new Request("https://example.test", { headers: { Authorization: `Bearer ${token}` } }), token), true);
});

test("same-origin sync authorization requires origin, browser fetch metadata, and dedicated header", () => {
  const url = "https://private.example/admin/rag-sync";
  const validHeaders = { Origin: "https://private.example", "Sec-Fetch-Site": "same-origin", "X-Erda-Sync": SAME_ORIGIN_SYNC_HEADER };
  assert.equal(authorizedSameOriginSyncRequest(new Request(url, { headers: validHeaders })), true);
  assert.equal(authorizedSameOriginSyncRequest(new Request(url, { headers: { ...validHeaders, Origin: "https://evil.example" } })), false);
  assert.equal(authorizedSameOriginSyncRequest(new Request(url, { headers: { ...validHeaders, "Sec-Fetch-Site": "cross-site" } })), false);
  assert.equal(authorizedSameOriginSyncRequest(new Request(url, { headers: { ...validHeaders, "X-Erda-Sync": "wrong" } })), false);
  assert.equal(authorizedSameOriginSyncRequest(new Request(url, { headers: { Origin: "https://private.example" } })), false);
});

test("plans bounded cursor batches and skips matching completed hashes", () => {
  const remote: RemoteVectorFile[] = [{ id: "file-2", status: "completed", attributes: { source_path: "ErdaBook/2.md", content_hash: "hash2" } }];
  const plan = planRuntimeBatch(documents, remote, 2, 2);
  assert.deepEqual(plan.map((item) => item.action), ["skip", "add"]);
  assert.deepEqual(plan.map((item) => item.document.path), ["ErdaBook/2.md", "ErdaBook/3.md"]);
});

test("sync is idempotent and attaches required metadata with 800/400 chunking", async () => {
  const attached: unknown[] = [];
  const transport: RuntimeSyncTransport = {
    list: async () => [{ id: "file-0", status: "completed", attributes: { source_path: "ErdaBook/0.md", content_hash: "hash0" } }],
    upload: async () => ({ id: "file-new" }),
    attach: async (_vectorStoreId, _fileId, metadata, chunking) => { attached.push({ metadata, chunking }); return { id: "file-new" }; },
    waitUntilIndexed: async () => undefined,
    detach: async () => undefined,
    deleteFile: async () => undefined,
  };
  const result = await syncRuntimeBatch({ documents, cursor: 0, vectorStoreId: "vs", transport, batchSize: 2 });
  assert.deepEqual({ added: result.added, skipped: result.skipped, nextCursor: result.nextCursor }, { added: 1, skipped: 1, nextCursor: 2 });
  assert.equal(attached.length, 1);
  assert.deepEqual((attached[0] as { chunking: unknown }).chunking, RUNTIME_SYNC_CHUNKING);
  assert.deepEqual((attached[0] as { metadata: EmbeddedDocument }).metadata.path, "ErdaBook/1.md");
  assert.deepEqual((attached[0] as { metadata: EmbeddedDocument }).metadata.syncVersion, "sync-v1");
});

test("runtime transport sends nested static chunking request body", async () => {
  let body: Record<string, unknown> = {};
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return Response.json({ id: "file-new" });
  }) as typeof fetch;
  const transport = new RuntimeOpenAITransport("not-a-real-key", fetcher, "https://example.test/v1");
  await transport.attach("vs", "file-new", documents[0], RUNTIME_SYNC_CHUNKING);
  assert.deepEqual(body.chunking_strategy, { type: "static", static: { max_chunk_size_tokens: 800, chunk_overlap_tokens: 400 } });
  assert.deepEqual(body.attributes, { source_path: "ErdaBook/0.md", title: "标题0", category: "root", content_hash: "hash0", sync_version: "sync-v1" });
});

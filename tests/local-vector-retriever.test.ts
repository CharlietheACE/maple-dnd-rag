import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationError } from "../src/config/server-env.ts";
import { createDashScopeIndex } from "../src/rag/dashscope-index.ts";
import { cosineSimilarity, LocalVectorRetriever } from "../src/rag/local-vector-retriever.ts";

const chunks = [
  { chunkId: "a", path: "ErdaBook/a.md", title: "A", category: "world", contentHash: "ha", text: "A evidence" },
  { chunkId: "b", path: "ErdaBook/b.md", title: "B", category: "rules", contentHash: "hb", text: "B evidence" },
];
const index = createDashScopeIndex({ chunks, vectors: [[1, 0], [0, 1]], model: "embed", dimensions: 2 });
test("cosine retrieval ranks chunks and preserves real metadata", async () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  const results = await new LocalVectorRetriever(index, { embed: async () => [[0.9, 0.1]] }, { model: "embed", dimensions: 2 }).search({ text: "query", maxResults: 1 });
  assert.deepEqual(results[0], { id: "a", fileId: "ha", path: "ErdaBook/a.md", title: "A", category: "world", score: cosineSimilarity([0.9, 0.1], [1, 0]), text: "A evidence", contentHash: "ha" });
});
test("missing, empty, or mismatched indexes are not configured", () => {
  assert.throws(() => new LocalVectorRetriever(undefined, { embed: async () => [] }, { model: "embed", dimensions: 2 }), ConfigurationError);
  assert.throws(() => new LocalVectorRetriever({ ...index, chunks: [] }, { embed: async () => [] }, { model: "embed", dimensions: 2 }), ConfigurationError);
  assert.throws(() => new LocalVectorRetriever(index, { embed: async () => [] }, { model: "other", dimensions: 2 }), ConfigurationError);
});

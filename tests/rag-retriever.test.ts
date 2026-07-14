import assert from "node:assert/strict";
import test from "node:test";
import { OpenAIRetriever } from "../src/rag/openai-retriever.ts";

test("maps vector-store results and metadata without inventing citations", async () => {
  let body: unknown;
  const retriever = new OpenAIRetriever("vs_test", { search: async (_id, value) => { body = value; return { data: [{ file_id: "file_1", filename: "source.md", score: .91, attributes: { source_path: "ErdaBook/world.md", title: "世界", category: "lore", content_hash: "abc" }, content: [{ type: "text", text: "证据" }] }] }; } });
  const results = await retriever.search({ text: "问题", maxResults: 3, filters: { category: "lore", path: "ErdaBook/world.md" } });
  assert.deepEqual(body, { query: "问题", max_num_results: 3, filters: { type: "and", filters: [{ type: "eq", key: "category", value: "lore" }, { type: "eq", key: "source_path", value: "ErdaBook/world.md" }] } });
  assert.deepEqual(results[0], { id: "file_1:0", fileId: "file_1", path: "ErdaBook/world.md", title: "世界", category: "lore", score: .91, text: "证据", contentHash: "abc" });
});

test("rejects bad retrieval input", async () => {
  const retriever = new OpenAIRetriever("vs", { search: async () => ({ data: [] }) });
  await assert.rejects(() => retriever.search({ text: " " }), TypeError);
  await assert.rejects(() => retriever.search({ text: "x", maxResults: 51 }), RangeError);
});

import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationError } from "../src/config/server-env.ts";
import { createDashScopeIndex, validateDashScopeIndex } from "../src/rag/dashscope-index.ts";

const chunk = { chunkId: "id", path: "ErdaBook/a.md", title: "A", category: "root", contentHash: "hash", text: "text" };
test("builds an auditable deterministic index schema", () => {
  const first = createDashScopeIndex({ chunks: [chunk], vectors: [[1, 0]], model: "embed", dimensions: 2 });
  const second = createDashScopeIndex({ chunks: [chunk], vectors: [[1, 0]], model: "embed", dimensions: 2 });
  assert.deepEqual(first, second);
  assert.deepEqual(first.documents[0].chunkIds, ["id"]);
  assert.equal(validateDashScopeIndex(first).chunks[0].vector.length, 2);
});
test("rejects malformed vectors and schema mismatch", () => {
  assert.throws(() => createDashScopeIndex({ chunks: [chunk], vectors: [[1]], model: "embed", dimensions: 2 }), ConfigurationError);
  assert.throws(() => validateDashScopeIndex({}), ConfigurationError);
});

import assert from "node:assert/strict";
import test from "node:test";
import { chunkMarkdown } from "../src/rag/chunker.ts";
import type { ScannedMarkdown } from "../src/rag/types.ts";

const document: ScannedMarkdown = { absolutePath: "ignored", path: "ErdaBook/chapter/a.md", title: "标题", category: "chapter", contentHash: "abc", syncVersion: "v1", content: "# 标题\r\n\r\n引言\r\n\r\n## 小节\r\n\r\n" + "内容".repeat(800) };
test("heading-aware chunks and ids are deterministic across newline forms", () => {
  const first = chunkMarkdown(document);
  const second = chunkMarkdown({ ...document, content: document.content.replace(/\r\n/g, "\n") });
  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  assert.ok(first.every((chunk) => chunk.text.startsWith("# 标题")));
  assert.ok(first.some((chunk) => chunk.text.includes("## 小节")));
  assert.ok(first.every((chunk) => /^[a-f0-9]{64}$/.test(chunk.chunkId)));
});

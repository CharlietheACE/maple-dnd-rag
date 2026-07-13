import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanErdaBook } from "../src/rag/scan.ts";

test("scans only UTF-8 Markdown with deterministic metadata and SHA-256", async (t) => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(os.tmpdir(), "erda-scan-")));
  t.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
  await mkdir(path.join(root, "ErdaBook", "chapter"), { recursive: true });
  await writeFile(path.join(root, "ErdaBook", "chapter", "a.md"), "# 标题\n\n正文", "utf8");
  await writeFile(path.join(root, "ErdaBook", "ignored.txt"), "ignore", "utf8");
  const [source] = await scanErdaBook(root, "sync-1");
  assert.equal(source.path, "ErdaBook/chapter/a.md"); assert.equal(source.title, "标题"); assert.equal(source.category, "chapter"); assert.match(source.contentHash, /^[a-f0-9]{64}$/); assert.equal(source.syncVersion, "sync-1");
});

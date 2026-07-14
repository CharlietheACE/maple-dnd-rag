import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readManifest } from "../src/rag/manifest.ts";
import type { OpenAITransport } from "../src/rag/openai-transport.ts";
import { syncErdaBook } from "../src/rag/sync.ts";

function transport(log: string[], failIndex = false): OpenAITransport {
  let id = 0;
  return {
    search: async () => ({ data: [] }),
    upload: async () => { const value = `new-${++id}`; log.push(`upload:${value}`); return { id: value }; },
    attach: async (_vs, file) => { log.push(`attach:${file}`); return { id: `vs-${file}` }; },
    waitUntilIndexed: async (_vs, file) => { log.push(`wait:${file}`); if (failIndex) throw new Error("index failed"); },
    detach: async (_vs, file) => { log.push(`detach:${file}`); },
    deleteFile: async (file) => { log.push(`delete:${file}`); },
  };
}

async function fixture(t: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), "erda-sync-")); t.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
  await mkdir(path.join(root, "ErdaBook"), { recursive: true }); await writeFile(path.join(root, "ErdaBook", "a.md"), "# A\none", "utf8");
  return { root, manifestPath: path.join(root, ".rag", "manifest.json") };
}

test("sync covers add, no-op, replace ordering, and delete", async (t) => {
  const { root, manifestPath } = await fixture(t); const log: string[] = []; const api = transport(log);
  let result = await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: api, syncVersion: "1" }); assert.equal(result.actions[0].type, "add");
  result = await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: api, syncVersion: "2" }); assert.deepEqual(result.actions, []);
  await writeFile(path.join(root, "ErdaBook", "a.md"), "# A\ntwo", "utf8"); log.length = 0;
  result = await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: api, syncVersion: "3" }); assert.equal(result.actions[0].type, "replace"); assert.ok(log.indexOf("wait:vs-new-2") < log.indexOf("detach:vs-new-1"));
  await import("node:fs/promises").then(({ rm }) => rm(path.join(root, "ErdaBook", "a.md"))); result = await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: api, syncVersion: "4" }); assert.equal(result.actions[0].type, "delete"); assert.deepEqual((await readManifest(manifestPath)).entries, {});
});

test("dry-run never mutates remote state or manifest", async (t) => {
  const { root, manifestPath } = await fixture(t); const log: string[] = [];
  const result = await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: transport(log), dryRun: true }); assert.equal(result.actions[0].type, "add"); assert.deepEqual(log, []); await assert.rejects(readFile(manifestPath), { code: "ENOENT" });
});

test("partial indexing failure preserves old manifest and remote file", async (t) => {
  const { root, manifestPath } = await fixture(t); await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: transport([]), syncVersion: "1" }); const before = await readFile(manifestPath, "utf8");
  await writeFile(path.join(root, "ErdaBook", "a.md"), "# A\nchanged", "utf8"); const log: string[] = [];
  await assert.rejects(syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: transport(log, true), syncVersion: "2" }), /index failed/); assert.equal(await readFile(manifestPath, "utf8"), before); assert.ok(!log.includes("detach:vs-new-1")); assert.ok(log.includes("delete:new-1"));
  log.length = 0;
  const retry = await syncErdaBook({ root, manifestPath, vectorStoreId: "vs", transport: transport(log), syncVersion: "3" });
  assert.equal(retry.actions[0].type, "replace"); assert.ok(log.indexOf("wait:vs-new-1") < log.indexOf("detach:vs-new-1"));
});

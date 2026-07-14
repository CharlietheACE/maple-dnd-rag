import assert from "node:assert/strict";
import test from "node:test";
import { MockRetriever } from "../src/retrieval/mock-retriever.ts";
const source = { id: "1", fileId: "f1", path: "ErdaBook/a.md", title: "测试", category: "world", score: 1, text: "艾尔达" };
test("returns matching evidence and respects maxResults", async () => assert.equal((await new MockRetriever([source, { ...source, id: "2" }]).search({ text: "艾尔达", maxResults: 1 })).length, 1));
test("returns no evidence for blank or unmatched input", async () => { const r = new MockRetriever([source]); assert.deepEqual(await r.search({ text: "" }), []); assert.deepEqual(await r.search({ text: "不存在" }), []) });

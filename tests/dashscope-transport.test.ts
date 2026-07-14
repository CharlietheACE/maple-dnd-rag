import assert from "node:assert/strict";
import test from "node:test";
import { DashScopeChatTransport, DashScopeEmbeddingTransport, DashScopeError } from "../src/rag/dashscope-transport.ts";

test("embeddings use compatible request shape and batches of at most ten", async () => {
  const batches: unknown[] = [];
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)); batches.push(body);
    return Response.json({ data: body.input.map((_text: string, index: number) => ({ index, embedding: [index, 1] })) });
  }) as typeof fetch;
  const vectors = await new DashScopeEmbeddingTransport({ apiKey: "secret", baseUrl: "https://example.test/v1/", fetcher }).embed(Array.from({ length: 12 }, (_, index) => `text-${index}`), { model: "text-embedding-v4", dimensions: 2 });
  assert.equal(vectors.length, 12);
  assert.deepEqual((batches[0] as { input: string[] }).input.length, 10);
  assert.deepEqual((batches[1] as { input: string[] }).input.length, 2);
  assert.deepEqual(batches[0], { model: "text-embedding-v4", input: Array.from({ length: 10 }, (_, index) => `text-${index}`), dimensions: 2, encoding_format: "float" });
});

test("normalizes 401, 429, timeout, and upstream failures", async () => {
  for (const [status, code] of [[401, "UNAUTHORIZED"], [429, "RATE_LIMITED"], [504, "TIMEOUT"], [500, "UPSTREAM"]] as const) {
    const fetcher = (async () => new Response("", { status })) as typeof fetch;
    await assert.rejects(() => new DashScopeEmbeddingTransport({ apiKey: "secret", baseUrl: "https://example.test", fetcher }).embed(["x"], { model: "m", dimensions: 2 }), (error: unknown) => error instanceof DashScopeError && error.code === code);
  }
  const hanging = ((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as typeof fetch;
  await assert.rejects(() => new DashScopeEmbeddingTransport({ apiKey: "secret", baseUrl: "https://example.test", fetcher: hanging, timeoutMs: 5 }).embed(["x"], { model: "m", dimensions: 2 }), (error: unknown) => error instanceof DashScopeError && error.code === "TIMEOUT");
});

test("chat completions use the configured compatible host and qwen request shape", async () => {
  let captured: { url?: string; body?: Record<string, unknown>; authorization?: string } = {};
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), body: JSON.parse(String(init?.body)), authorization: (init?.headers as Record<string, string>).Authorization };
    return Response.json({ choices: [{ message: { content: "回答 [来源 1]" } }] });
  }) as typeof fetch;
  const answer = await new DashScopeChatTransport({ apiKey: "secret", baseUrl: "https://example.test/v1/", fetcher }).complete({ model: "qwen-plus", messages: [{ role: "user", content: "问题" }] });
  assert.equal(answer, "回答 [来源 1]");
  assert.equal(captured.url, "https://example.test/v1/chat/completions");
  assert.equal(captured.authorization, "Bearer secret");
  assert.deepEqual(captured.body, { model: "qwen-plus", messages: [{ role: "user", content: "问题" }], temperature: 0, max_tokens: 1200, stream: false });
});

import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationError, DEFAULT_DASHSCOPE_BASE_URL, DEFAULT_DASHSCOPE_CHAT_MODEL, DEFAULT_DASHSCOPE_EMBEDDING_DIMENSIONS, DEFAULT_DASHSCOPE_EMBEDDING_MODEL, readServerEnv } from "../src/config/server-env.ts";

test("reads DashScope server configuration with cost-conscious defaults", () => assert.deepEqual(readServerEnv({ DASHSCOPE_API_KEY: " key " }), {
  DASHSCOPE_API_KEY: "key",
  DASHSCOPE_BASE_URL: DEFAULT_DASHSCOPE_BASE_URL,
  DASHSCOPE_CHAT_MODEL: DEFAULT_DASHSCOPE_CHAT_MODEL,
  DASHSCOPE_EMBEDDING_MODEL: DEFAULT_DASHSCOPE_EMBEDDING_MODEL,
  DASHSCOPE_EMBEDDING_DIMENSIONS: DEFAULT_DASHSCOPE_EMBEDDING_DIMENSIONS,
}));
test("reads configurable DashScope models, host, and dimensions", () => assert.deepEqual(readServerEnv({ DASHSCOPE_API_KEY: "key", DASHSCOPE_BASE_URL: "https://example.test/v1/", DASHSCOPE_CHAT_MODEL: "chat", DASHSCOPE_EMBEDDING_MODEL: "embed", DASHSCOPE_EMBEDDING_DIMENSIONS: "2" }), { DASHSCOPE_API_KEY: "key", DASHSCOPE_BASE_URL: "https://example.test/v1", DASHSCOPE_CHAT_MODEL: "chat", DASHSCOPE_EMBEDDING_MODEL: "embed", DASHSCOPE_EMBEDDING_DIMENSIONS: 2 }));
test("reports missing or invalid configuration", () => {
  assert.throws(() => readServerEnv({}), ConfigurationError);
  assert.throws(() => readServerEnv({ DASHSCOPE_API_KEY: "key", DASHSCOPE_EMBEDDING_DIMENSIONS: "0" }), ConfigurationError);
});

import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationError, DEFAULT_OPENAI_MODEL, readServerEnv } from "../src/config/server-env.ts";
test("reads required server configuration", () => assert.deepEqual(readServerEnv({ OPENAI_API_KEY: " key ", OPENAI_VECTOR_STORE_ID: " vs " }), { OPENAI_API_KEY: "key", OPENAI_VECTOR_STORE_ID: "vs", OPENAI_MODEL: DEFAULT_OPENAI_MODEL }));
test("reads a configurable answer model", () => assert.equal(readServerEnv({ OPENAI_API_KEY: "key", OPENAI_VECTOR_STORE_ID: "vs", OPENAI_MODEL: " custom " }).OPENAI_MODEL, "custom"));
test("reports missing configuration", () => assert.throws(() => readServerEnv({}), ConfigurationError));

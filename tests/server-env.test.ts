import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationError, readServerEnv } from "../src/config/server-env.ts";
test("reads required server configuration", () => assert.deepEqual(readServerEnv({ OPENAI_API_KEY: " key ", OPENAI_VECTOR_STORE_ID: " vs " }), { OPENAI_API_KEY: "key", OPENAI_VECTOR_STORE_ID: "vs" }));
test("reports missing configuration", () => assert.throws(() => readServerEnv({}), ConfigurationError));

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("generated vectors are imported only by the server route", async () => {
  const route = await readFile("app/api/chat/route.ts", "utf8");
  const client = await readFile("app/chat-experience.tsx", "utf8");
  assert.match(route, /generated\/dashscope-index\.json/);
  assert.doesNotMatch(client, /dashscope-index|generated\/|\.vector/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseChatStream } from "../app/ndjson.ts";

function stream(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

test("parses NDJSON events split across arbitrary chunks", async () => {
  const events = [];
  for await (const event of parseChatStream(stream([
    '{"type":"answer.del',
    'ta","delta":"你好"}\n{"type":"sources","sources":[]}\n',
    '{"type":"answer.done"}',
  ]))) events.push(event);

  assert.deepEqual(events, [
    { type: "answer.delta", delta: "你好" },
    { type: "sources", sources: [] },
    { type: "answer.done" },
  ]);
});

test("ignores blank lines and supports CRLF", async () => {
  const events = [];
  for await (const event of parseChatStream(stream(['\r\n{"type":"error","code":"NO_EVIDENCE","message":"无证据"}\r\n']))) events.push(event);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "error");
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildChatHistory, type HistoryExchange } from "../app/chat-history.ts";

function exchange(question: string, answer: string, status: HistoryExchange["status"] = "done"): HistoryExchange {
  return { question, answer, status };
}

test("excludes failed, streaming, and empty-answer exchanges from history", () => {
  assert.deepEqual(buildChatHistory([
    exchange("配置失败的问题", "", "error"),
    exchange("仍在回答的问题", "部分回答", "streaming"),
    exchange("空白回答", "   "),
  ]), []);
});

test("preserves successful round order and limits history to the latest three rounds", () => {
  assert.deepEqual(buildChatHistory([
    exchange("问题一", "回答一"),
    exchange("失败的问题", "", "error"),
    exchange(" 问题二 ", " 回答二 "),
    exchange("问题三", "回答三"),
    exchange("问题四", "回答四"),
  ]), [
    { role: "user", content: "问题二" },
    { role: "assistant", content: "回答二" },
    { role: "user", content: "问题三" },
    { role: "assistant", content: "回答三" },
    { role: "user", content: "问题四" },
    { role: "assistant", content: "回答四" },
  ]);
});

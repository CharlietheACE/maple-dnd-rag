import type { ChatRequest } from "@/src/contracts/rag";

export type HistoryExchange = {
  question: string;
  answer: string;
  status: "streaming" | "done" | "error";
};

export function buildChatHistory(exchanges: readonly HistoryExchange[]): NonNullable<ChatRequest["history"]> {
  return exchanges
    .filter((exchange) => exchange.status === "done" && exchange.question.trim() && exchange.answer.trim())
    .slice(-3)
    .flatMap((exchange) => [
      { role: "user" as const, content: exchange.question.trim() },
      { role: "assistant" as const, content: exchange.answer.trim() },
    ]);
}

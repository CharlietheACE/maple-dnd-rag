export type RetrievalQuery = { text: string; maxResults?: number; filters?: Record<string, string | number | boolean> };
export type RetrievedSource = { id: string; fileId: string; path: string; title: string; category: string; score: number | null; text: string; contentHash?: string };
export interface Retriever { search(query: RetrievalQuery): Promise<RetrievedSource[]> }
export type ChatRequest = { question: string; history?: Array<{ role: "user" | "assistant"; content: string }> };
export type ChatErrorCode = "BAD_REQUEST" | "NOT_CONFIGURED" | "NO_EVIDENCE" | "RATE_LIMITED" | "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR";
export type ChatStreamEvent =
  | { type: "answer.delta"; delta: string }
  | { type: "sources"; sources: Omit<RetrievedSource, "text">[] }
  | { type: "answer.done" }
  | { type: "error"; code: ChatErrorCode; message: string };

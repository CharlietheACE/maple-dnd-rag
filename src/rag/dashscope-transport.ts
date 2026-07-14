export type DashScopeErrorCode = "UNAUTHORIZED" | "RATE_LIMITED" | "TIMEOUT" | "UPSTREAM";
export class DashScopeError extends Error {
  readonly code: DashScopeErrorCode;
  readonly status?: number;
  constructor(code: DashScopeErrorCode, status?: number) { super(`DashScope request failed: ${code}${status ? ` (${status})` : ""}`); this.code = code; this.status = status; }
}

type TransportOptions = { apiKey: string; baseUrl: string; fetcher?: typeof fetch; timeoutMs?: number };

function normalizeError(error: unknown): DashScopeError {
  if (error instanceof DashScopeError) return error;
  if (error instanceof DOMException && error.name === "AbortError") return new DashScopeError("TIMEOUT");
  return new DashScopeError("UPSTREAM");
}

abstract class DashScopeTransport {
  protected readonly fetcher: typeof fetch;
  protected readonly timeoutMs: number;
  protected readonly options: TransportOptions;
  constructor(options: TransportOptions) { this.options = options; this.fetcher = options.fetcher ?? fetch; this.timeoutMs = options.timeoutMs ?? 25_000; }
  protected async post(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new DashScopeError("UNAUTHORIZED", response.status);
        if (response.status === 429) throw new DashScopeError("RATE_LIMITED", response.status);
        if (response.status === 408 || response.status === 504) throw new DashScopeError("TIMEOUT", response.status);
        throw new DashScopeError("UPSTREAM", response.status);
      }
      return await response.json();
    } catch (error) { throw normalizeError(error); }
    finally { clearTimeout(timer); }
  }
}

export class DashScopeEmbeddingTransport extends DashScopeTransport {
  async embed(inputs: string[], options: { model: string; dimensions: number }): Promise<number[][]> {
    if (!inputs.length) return [];
    const vectors: number[][] = [];
    for (let offset = 0; offset < inputs.length; offset += 10) {
      const batch = inputs.slice(offset, offset + 10);
      const payload = await this.post("/embeddings", { model: options.model, input: batch, dimensions: options.dimensions, encoding_format: "float" });
      const data = typeof payload === "object" && payload !== null && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : null;
      if (!data) throw new DashScopeError("UPSTREAM");
      const ordered = data.map((item) => item as { index?: unknown; embedding?: unknown }).sort((a, b) => Number(a.index) - Number(b.index));
      if (ordered.length !== batch.length) throw new DashScopeError("UPSTREAM");
      for (const item of ordered) {
        if (!Array.isArray(item.embedding) || item.embedding.length !== options.dimensions || !item.embedding.every((value) => typeof value === "number" && Number.isFinite(value))) throw new DashScopeError("UPSTREAM");
        vectors.push(item.embedding as number[]);
      }
    }
    return vectors;
  }
}

export class DashScopeChatTransport extends DashScopeTransport {
  async complete(options: { model: string; messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; maxTokens?: number }): Promise<string> {
    const payload = await this.post("/chat/completions", { model: options.model, messages: options.messages, temperature: 0, max_tokens: options.maxTokens ?? 1200, stream: false });
    const choices = typeof payload === "object" && payload !== null && Array.isArray((payload as { choices?: unknown }).choices) ? (payload as { choices: unknown[] }).choices : [];
    const first = choices[0] as { message?: { content?: unknown } } | undefined;
    if (typeof first?.message?.content !== "string") throw new DashScopeError("UPSTREAM");
    return first.message.content.trim();
  }
}

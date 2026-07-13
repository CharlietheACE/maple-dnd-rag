import type { ChatStreamEvent } from "@/src/contracts/rag";

export async function* parseChatStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parseLine = (line: string): ChatStreamEvent | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as ChatStreamEvent;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = parseLine(line);
        if (event) yield event;
      }
      if (done) break;
    }
    const finalEvent = parseLine(buffer);
    if (finalEvent) yield finalEvent;
  } finally {
    reader.releaseLock();
  }
}

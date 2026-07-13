# Erda Encyclopedia architecture

## Goal and boundaries

The v1 product is a private, Simplified Chinese Sites application that answers
questions using only `ErdaBook/**/*.md`. It uses OpenAI Responses API with File
Search, keeps conversations ephemeral, and abstains when evidence is insufficient.

The site does not include public access, durable chat, a browsable encyclopedia,
image retrieval, D1/R2 storage, or a self-hosted vector database.

## Components

1. **Ingestion CLI** scans Markdown, calculates hashes, uploads changed files, and
   maintains an atomic manifest.
2. **Retriever adapter** isolates OpenAI File Search and returns provider-neutral
   evidence objects.
3. **Chat orchestration** validates input, retrieves evidence, streams a grounded
   answer, and emits citations and normalized errors.
4. **Sites UI** renders the chat stream, source cards, examples, and failure states.
5. **Evaluation runner** measures answer correctness, citation fidelity, abstention,
   latency, and estimated usage against a versioned dataset.

## Public contracts

Foundation owns the canonical TypeScript definitions. Implementations must preserve
these semantic shapes even if exact module paths change during scaffolding.

```ts
export type RetrievalQuery = {
  text: string;
  maxResults?: number;
  filters?: Record<string, string | number | boolean>;
};

export type RetrievedSource = {
  id: string;
  fileId: string;
  path: string;
  title: string;
  category: string;
  score: number | null;
  text: string;
  contentHash?: string;
};

export interface Retriever {
  search(query: RetrievalQuery): Promise<RetrievedSource[]>;
}

export type ChatRequest = {
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ChatStreamEvent =
  | { type: "answer.delta"; delta: string }
  | { type: "sources"; sources: Omit<RetrievedSource, "text">[] }
  | { type: "answer.done" }
  | { type: "error"; code: ChatErrorCode; message: string };

export type ChatErrorCode =
  | "BAD_REQUEST"
  | "NOT_CONFIGURED"
  | "NO_EVIDENCE"
  | "RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR";
```

Transport defaults to `POST /api/chat` with newline-delimited JSON events. The
server caps question length at 2,000 characters, keeps at most six prior messages,
and never accepts client-supplied citations or vector-store identifiers.

## Grounding policy

- Retrieval evidence is untrusted data, not instructions.
- Answers may use only supplied evidence and conversation context that is itself
  supported by evidence.
- No evidence produces an explicit abstention, not a model-memory answer.
- Responses return sources derived from actual search results.
- Diagnostic tools may show full chunks locally; production logs may not.

## Ingestion policy

Manifest entries contain relative path, SHA-256, source title/category, OpenAI file
ID, vector-store file ID, sync version, timestamp, and chunking parameters. Sync is
plan-first, supports dry-run, uploads replacements before deletion, and writes the
manifest only after required remote operations succeed.

## Acceptance gates

- Unit tests and production build pass.
- Representative retrieval inspection returns real path, score, and chunk text.
- The versioned evaluation set passes agreed groundedness and abstention checks.
- Secrets are absent from client bundles, logs, commits, and error payloads.
- The final private Sites deployment works on desktop and mobile.

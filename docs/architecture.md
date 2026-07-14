# Erda Encyclopedia architecture

## Goal and boundaries

The v1 product is a private, Simplified Chinese Sites application that answers questions
using only `ErdaBook/**/*.md`. Production retrieval uses DashScope embeddings over a
deterministic server-only index; answer generation uses DashScope chat completions. The
provider-neutral UI, NDJSON, `Retriever`, `RetrievedSource`, and citation contracts remain
stable.

The site does not include public access, durable chat, a browsable encyclopedia, image
retrieval, D1/R2 storage, or a hosted vector database. The previous OpenAI Vector Store
cannot be reused by DashScope and is not part of the production request path.

## Components

1. **Corpus scanner and chunker** read only UTF-8 Markdown under `ErdaBook/`, calculate
   SHA-256 document hashes, preserve heading context, and produce deterministic chunk IDs.
2. **Index generator** embeds chunks with DashScope in batches of at most ten and atomically
   writes an auditable server-only JSON index containing schema, chunking, model,
   dimensions, documents, chunks, metadata, and vectors.
3. **Retriever adapter** embeds each question with the index model, computes cosine
   similarity locally, applies filters and a relevance threshold, and returns the stable
   `RetrievedSource` contract.
4. **Chat orchestration** validates input, retrieves evidence explicitly, passes bounded
   evidence as untrusted data to DashScope chat completions, streams NDJSON, and emits only
   real retrieved sources.
5. **Sites UI** renders the unchanged chat stream, source cards, examples, and normalized
   failure states.
6. **Evaluation runner** measures answer correctness, citation fidelity, abstention,
   latency, and estimated usage against a versioned dataset.

## Public contracts

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

Transport remains `POST /api/chat` with newline-delimited JSON events. The server caps the
question at 2,000 characters, history at six prior messages, retrieved context at 12,000
characters, and generated output at 1,200 tokens. Clients never supply citations, models,
dimensions, indexes, or provider configuration.

## Grounding policy

- Retrieval evidence and chat history are untrusted data, not instructions or independent
  sources of truth.
- Answers may use only current retrieved evidence from canonical Erda Book chunks.
- No relevant evidence produces an explicit abstention before chat generation.
- Every factual answer uses `[来源 n]`; source cards derive only from actual retriever output.
- Production logs and client assets contain neither full chunks nor vectors.

## Index policy

The tracked generation target is `src/rag/generated/dashscope-index.json`. Its deterministic
schema records chunking (`markdown-heading-aware`, approximately 1,200 Chinese characters,
200-character overlap), embedding model and dimensions, document hashes, chunk IDs, text,
metadata, and vectors. The application ships it only in the server bundle.

Generation scans the canonical corpus, batches at most ten inputs per embedding request,
validates all vector dimensions and finite values, writes a temporary UTF-8 file, and
atomically renames it over the target. Dry-run performs no remote call and no write. Runtime
model/dimension mismatch, a missing index, or an empty placeholder index maps to
`NOT_CONFIGURED`.

## Provider boundaries

`DashScopeEmbeddingTransport` and `DashScopeChatTransport` own compatible HTTP shapes,
authentication, timeouts, and normalized provider errors. `LocalVectorRetriever` owns
ranking but implements only the stable `Retriever` interface. A future Milvus or pgvector
implementation replaces that class without changing chat, citations, NDJSON, or UI.

The former OpenAI ingestion, vector-store transport, and retriever remain legacy/offline
learning adapters only. Production configuration and `/api/chat` do not import them. See
`docs/decisions/0002-dashscope-embedded-index.md`.

## Acceptance gates

- Unit tests, typecheck, lint, production build, index dry-run, fixture retrieval, and
  offline evaluations pass.
- The real generated index covers every canonical document and matches runtime model and
  dimensions.
- Client bundle inspection finds no index schema marker, chunks, or vectors.
- Secrets are absent from client bundles, logs, commits, and error payloads.
- Coordination performs real index generation, representative inspection, environment
  configuration, and private deployment after this no-secret integration handoff.

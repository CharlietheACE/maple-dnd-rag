# ADR 0002: DashScope embeddings with a server-only embedded index

- Status: accepted
- Date: 2026-07-13

## Context

Erda Encyclopedia must move its production answer path from OpenAI Responses API and
OpenAI Vector Store File Search to Alibaba Cloud Model Studio (DashScope). DashScope's
OpenAI-compatible embeddings and chat endpoints do not provide access to, or reuse of,
the previously populated OpenAI Vector Store. Vector stores are provider-owned managed
resources; their file IDs, chunking state, metadata, and vectors are not portable API
objects.

## Decision

The MVP builds a deterministic, auditable JSON index from the canonical UTF-8
`ErdaBook/**/*.md` files. Heading-aware chunks are embedded with DashScope and the index
is imported only by the server chat route. At request time a provider-neutral
`LocalVectorRetriever` embeds the question with the same model and dimensions, ranks
chunks by cosine similarity, and returns the existing `RetrievedSource` contract. The
answer layer sends those retrieved chunks as explicitly untrusted evidence to DashScope
chat completions.

The embedded index is suitable for this small, read-only 40-document corpus: it avoids a
second hosted database, keeps deployment reproducible, and makes metadata/vector changes
reviewable. It must never be imported by client components or emitted into client assets.

The former OpenAI ingestion and retriever remain only as documented legacy/offline
learning adapters. Production configuration and `/api/chat` do not reference them.

## Consequences and future boundary

Index generation requires a trusted offline or coordination environment with DashScope
credentials. Sites receives the generated server-only artifact and runtime DashScope
configuration; browsers receive neither vectors nor chunks.

If corpus size, update frequency, tenant isolation, filtering, or latency outgrows a
bundled linear scan, replace only the `Retriever` implementation with Milvus or pgvector.
Chunk IDs, metadata, query validation, grounding, citations, NDJSON, and UI contracts stay
unchanged. A future migration must bulk-load the deterministic chunks, verify model and
dimension compatibility, use atomic alias/table cutover, and preserve abstention and
citation evaluation gates.

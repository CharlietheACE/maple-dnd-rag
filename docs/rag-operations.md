# RAG operations

## Production scope

Production scans only UTF-8 `ErdaBook/**/*.md`. It never rewrites canonical documents.
Each generated chunk carries `path`, `title`, `category`, `contentHash`, and deterministic
`chunkId`. The server-only index also records schema/version, heading-aware chunking,
embedding model, dimensions, documents, chunk text, and vectors.

## Server configuration

Configure these only in the trusted index-generation environment and Sites server runtime:

- `DASHSCOPE_API_KEY` (required secret)
- `DASHSCOPE_BASE_URL` (compatible API base URL)
- `DASHSCOPE_CHAT_MODEL` (defaults to `qwen-plus`)
- `DASHSCOPE_EMBEDDING_MODEL` (defaults to `text-embedding-v4`)
- `DASHSCOPE_EMBEDDING_DIMENSIONS` (defaults to `1024`)

The embedding model and dimensions must exactly match the generated index. Missing runtime
configuration, an empty/missing index, or a mismatch returns `NOT_CONFIGURED` without
calling chat generation.

## Deterministic index generation

Preview the canonical scan and chunk plan without credentials, provider calls, or writes:

```powershell
npm run dashscope:index:dry-run
```

Generate the real server-only index in a trusted environment after setting the five
`DASHSCOPE_*` values:

```powershell
npm run dashscope:index
```

The generator sends at most ten chunks per embeddings request. It validates response count,
ordering, finite vector values, and dimensions before writing a temporary UTF-8 JSON file
and atomically replacing `src/rag/generated/dashscope-index.json`. Console output contains
only counts, model/dimensions, dry-run state, and the relative output path; it never prints
the key or full chunks.

The checked-in production index contains 40 documents and 294 chunks generated with
`text-embedding-v4` at 1024 dimensions. Before deployment, verify its schema and client
bundle boundary again after any regeneration; runtime model and dimensions must match it.

## Retrieval inspection

After real generation, inspect representative and no-evidence queries locally:

```powershell
npm run dashscope:inspect -- "艾尔达是什么？"
```

The diagnostic prints local top-k score, path, metadata, and chunk text. Do not run it in
production logging or attach its output to public build logs.

## Validation

```powershell
npm run dashscope:index:dry-run
npm test
npm run typecheck
npm run lint
npm run build
npm run check:client-index
```

Before deployment, also verify that the generated index reports 40 documents, that its
model/dimensions equal the Sites runtime configuration, and that representative retrieval
returns real `ErdaBook/` paths. Client bundle checking must report zero index markers.

## Error behavior

- Invalid or unauthorized DashScope credentials: `NOT_CONFIGURED`
- Provider quota/rate limit: `RATE_LIMITED`
- Abort, HTTP 408, or HTTP 504: `UPSTREAM_TIMEOUT`
- Other provider or malformed payload failures: `UPSTREAM_ERROR`
- No retrieved chunk above the relevance threshold: `NO_EVIDENCE`

Error payloads never contain provider bodies, credentials, complete chunks, or vectors.

## Legacy OpenAI adapter

`scripts/rag-sync.ts`, `scripts/rag-inspect.ts`, `src/rag/openai-transport.ts`,
`src/rag/openai-retriever.ts`, manifest, and remote-sync modules remain only as offline
learning/reference code for the historical OpenAI Vector Store implementation. They may use
legacy `OPENAI_*` variables when invoked explicitly, but production `/api/chat`, server
configuration, generation, and deployment do not reference them. OpenAI-managed files and
vectors cannot be transferred to DashScope; see ADR 0002.

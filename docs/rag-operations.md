# RAG operations

## Scope and source of truth

The RAG workstream indexes only UTF-8 `ErdaBook/**/*.md`. It never rewrites those
files. Each indexed file carries `source_path`, `title`, `category`,
`content_hash`, and `sync_version` attributes. The local `.rag/manifest.json`
also records both remote IDs, indexing time, and the exact chunking configuration.

## Configuration

Set these server-side values; never expose or commit them:

- `OPENAI_API_KEY`
- `OPENAI_VECTOR_STORE_ID`
- `OPENAI_MODEL` (optional; defaults to the cost-sensitive `gpt-5.6-luna`)

Dry-run needs neither value because it performs local planning only. An apply or
retrieval inspection requires both values.

The implementation uses the platform `fetch`, `FormData`, and `Blob` APIs and has
no OpenAI SDK dependency. The HTTP transport can be replaced by a mock for tests.

## Incremental sync

Preview every sync first:

```powershell
node --experimental-strip-types scripts/rag-sync.ts --dry-run
```

Apply the plan:

```powershell
node --experimental-strip-types scripts/rag-sync.ts
```

The plan classifies paths as add, replace, delete, or no-op. Dry-run performs no
remote mutation and does not write a manifest. For replacements, the new file is
uploaded, attached, and confirmed `completed` before the previous vector-store
file and uploaded file are removed. The manifest is written through a temporary
file and atomic rename only after all required operations succeed. If indexing
fails, the newly uploaded file is cleaned up and the previous manifest/index is
retained. Re-run the same command after correcting a partial failure.

Default chunking is static: 800 maximum tokens with 400 overlap tokens. Changing
this is an indexing-version change and should be evaluated before integration.

## Retrieval inspection

Inspect the actual top results locally:

```powershell
node --experimental-strip-types scripts/rag-inspect.ts "赫纳西斯在哪里？"
```

The command prints result ID, OpenAI file ID, real source path/title/category,
score, content hash, and retrieved chunk text. Chunk text is intentionally shown
only by this local diagnostic; production logging must not emit full chunks.

The adapter calls `POST /v1/vector_stores/{vector_store_id}/search`. It maps the
provider response to the shared `Retriever` contract and supports equality filters
over indexed attributes. `maxResults` must be an integer from 1 through 50.

## Verification and recovery

Run targeted checks before handoff:

```powershell
npm test
npm run typecheck
npm run build
```

An online smoke test additionally requires a non-production test vector store:

1. Run dry-run and review every planned path.
2. Apply sync and confirm the manifest contains the expected hashes and IDs.
3. Run `rag-inspect` with representative and no-evidence queries.
4. Confirm returned paths and text match the canonical Markdown.

Do not edit the manifest by hand to conceal a remote failure. If local state is
lost, reconcile remote files explicitly before rebuilding it; a blind empty-manifest
sync can duplicate every source. Never delete remote data based on a dry-run.

## Production sync status

The private Sites runtime completed the one-time production sync of all 40 supported
`ErdaBook/**/*.md` documents. A subsequent idempotence pass processed the same 40 paths
and reported all 40 as skipped, confirming that the vector store already held the current
content hashes without duplicate additions.

The temporary browser sync console, admin endpoint, embedded corpus, and sync token are
not permanent operational surfaces and were removed after verification. The hosted runtime
keeps only `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_VECTOR_STORE_ID` at environment
revision 4.

Two production chat smoke tests reached the OpenAI service but returned HTTP 429. The
application correctly maps this response to `RATE_LIMITED`; further live-answer verification
is blocked until the OpenAI project quota or rate limit is available.

## Current platform shapes

The implementation was checked against current official OpenAI documentation:

- Files upload is multipart `POST /v1/files`; `assistants` is an accepted purpose.
- Vector-store file creation accepts file attributes and a static chunking strategy.
- Vector-store search returns file ID, filename, score, attributes, and text content.
- Responses API File Search uses `tools[].type = "file_search"` and
  `vector_store_ids`; answer orchestration must request
  `include: ["file_search_call.results"]` to retain result details.

The RAG workstream does not implement Responses answer orchestration. Integration
must perform the live API validation because no real API key is committed or
available to unit tests.

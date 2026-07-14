# AGENTS.md

## Project purpose

This repository contains Erda Book, a Chinese D&D 5e homebrew setting based on
MapleStory, and the Erda Encyclopedia RAG application.

The project must provide grounded question answering over Erda Book while
remaining a useful learning project for enterprise-grade RAG engineering.

## Source of truth

- `ErdaBook/**/*.md` is the only canonical knowledge source for answers.
- MapleStory canon, D&D sourcebooks, model memory, and web sources must not be
  presented as Erda Book facts.
- When retrieved evidence is insufficient, say that Erda Book does not establish
  the answer.
- Preserve original names, dates, units, meaning, Markdown hierarchy, and files.
- Do not rewrite Erda Book content as part of application work.

## Architecture boundaries

- The production backend is DashScope embeddings over a deterministic server-only
  embedded index behind `Retriever`; answer generation uses DashScope chat completions.
- UI and answer orchestration must not call the OpenAI SDK directly.
- Provider API keys and generated vector indexes are server-side only.
- Do not add D1, R2, public access, persistent chat history, authentication, or a
  second vector database unless the user expands scope.
- Public contracts are defined in `docs/architecture.md`. Do not fork equivalent
  local types in separate workstreams.

## Retrieval, citation, and ingestion

- Every factual answer must cite at least one retrieved source.
- Retain retrieved chunk text, score, path, and metadata for citation and evaluation.
- Metadata must include source path, title, content hash, category, and deterministic
  chunk ID; generated indexes also record schema, chunking, model, and dimensions.
- Diagnostics must expose top-k text, score, path, and metadata.
- Scan only supported files under `ErdaBook/`; treat Markdown as UTF-8.
- Preserve heading context, use deterministic SHA-256 hashes, and replace generated
  indexes atomically only after every embedding validates.
- Index generation must support dry-run and perform no provider calls or writes in dry-run.
- Record the chunking configuration for every indexed version.
- Never log secrets or full retrieved chunks in production by default.

## Product behavior

- The primary language is Simplified Chinese.
- Stream answers when supported and prevent concurrent duplicate submissions.
- Bound question length, history, retrieved context, and output.
- Provide explicit no-evidence, timeout, rate-limit, configuration, and upstream
  failure states.
- User-facing sources must derive from real metadata. Never invent filenames,
  titles, quotations, or citations.

## Multi-task collaboration

Each implementation task uses its own Git branch and worktree. Never run multiple
writable tasks in the same directory. Preserve other tasks' commits and changes.

Ownership:

- `foundation`: scaffold, dependencies, shared contracts, configuration, mocks.
- `rag`: ingestion, manifests, OpenAI retrieval adapter, diagnostics.
- `site-ui`: pages, styles, client interaction, accessibility, site metadata.
- `evals`: datasets, runners, metrics, reports.
- `integration`: merge conflict resolution, end-to-end fixes, hosting, deployment.

Rules:

- Parallel work begins only after foundation contracts are committed.
- Consumers import committed contracts rather than another workstream's internals.
- Contract changes require coordination and an update to `docs/architecture.md`.
- Do not modify another workstream's owned files without an ownership transfer in
  `docs/workstreams.md`.
- Dependency or lockfile changes belong to foundation before parallel work and to
  integration afterward.
- Only integration resolves cross-workstream conflicts and deploys.
- Task conversations are not shared memory. Durable facts belong in repository docs.
- A workstream is incomplete until it has a tested commit and a handoff containing
  branch, commit, delivered behavior, interface changes, validation, configuration,
  limitations, and intentionally untouched files.

## Engineering workflow

Before editing:

1. Read this file, `docs/architecture.md`, and the relevant operational or decision docs.
2. Inspect `docs/workstreams.md` and `git status`.
3. Confirm the current workstream owns the files it will change.
4. Preserve unrelated user changes and state material assumptions.

Before completing:

1. Run targeted unit tests.
2. Run the production build for application changes.
3. Run retrieval inspection for ingestion or retrieval changes.
4. Run the RAG evaluation set for retrieval, prompt, model, or citation changes.
5. Commit the owned changes and provide the required handoff.

Minimum test coverage includes ingestion add/change/delete/no-op, partial failure
and retry, metadata mapping, grounded citation, abstention, indexed prompt injection,
bad input, missing configuration, timeout/rate limit, and mobile/desktop chat flows.

## Shared state

- Stable rules: `AGENTS.md`.
- Architecture and contracts: `docs/architecture.md`.
- Dynamic ownership, dependencies, and handoffs: `docs/workstreams.md`.
- Operations: `docs/rag-operations.md`.
- Decisions: `docs/decisions/`.
- Generated sync state: `.rag/manifest.json`.
- Never store secrets, temporary task IDs, progress chatter, or changelog entries here.

# Workstreams

This file is the dynamic coordination ledger. Update status and append handoffs;
do not place transient state in `AGENTS.md`.

| Workstream | Branch | Owns | Depends on | Status |
|---|---|---|---|---|
| coordinator | `main` | rules, architecture, assignment, acceptance | none | in progress |
| foundation | `codex/foundation` | scaffold, contracts, config, mocks | coordinator | complete (`031bd88`) |
| rag | `codex/rag` | ingestion, retriever, diagnostics | foundation | complete (`19ea6ef`, from `fc09b62`) |
| site-ui | `codex/site-ui` | UI, streaming UX, metadata | foundation | complete (`759f995`, from `5f903b6`) |
| evals | `codex/evals` | datasets, runners, metrics | foundation | complete (`cfcc94b`, from `4098a5c`) |
| integration | `codex/integration` | merge, E2E fixes, hosting, deploy | rag, site-ui, evals | private deployment complete; chat runtime blocked by missing OpenAI secrets |

## Ownership collision policy

Only foundation changes dependencies, the lockfile, shared contracts, and initial
hosting configuration before parallel work. After foundation, only integration may
make cross-cutting dependency or contract changes. Feature workstreams request an
ownership transfer here instead of editing shared files independently.

## Handoff template

```md
### <workstream> handoff

- Branch:
- Commit:
- Delivered:
- Public interfaces changed:
- Validation performed:
- Configuration required:
- Known limitations:
- Files intentionally not modified:
- Recommended merge order:
```

## Handoffs

Handoffs are appended here by the integration workstream after verification.

### Foundation handoff

- Branch: `codex/foundation`
- Commit: `031bd88`
- Delivered: Sites-compatible scaffold, shared RAG contracts, server environment
  validation, mock Retriever, base tests, build configuration, and empty hosting metadata.
- Public interfaces changed: Added the contracts specified in `docs/architecture.md`.
- Validation performed: TypeScript check, four unit tests, and production build passed.
- Configuration required: `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`.
- Known limitations: No real retrieval, chat endpoint, product UI, evaluation, or deployment.
- Files intentionally not modified: `ErdaBook/**`, RAG operations, evaluation assets.
- Recommended merge order: Foundation is the base for RAG, site UI, and evals.

### RAG handoff

- Branch: `codex/rag`
- Commit: `19ea6ef` (integrated equivalent of verified source commit `fc09b62`)
- Delivered: Deterministic UTF-8 Markdown scan and hashing, atomic manifest planning,
  add/replace/delete/no-op sync, retry-safe partial-failure behavior, OpenAI vector-store
  HTTP transport, Retriever adapter, and local retrieval diagnostics.
- Public interfaces changed: Implemented the committed `Retriever` contract without
  changing its semantic shape; added RAG-only transport and manifest types.
- Validation performed: Integration reran the complete unit suite, verified a 40-document
  dry-run, typecheck, lint, and production build.
- Configuration required: `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID` for apply or
  live inspection; dry-run requires neither.
- Known limitations: No live sync or `rag:inspect` was claimed because neither secret was
  present in the integration environment.
- Files intentionally not modified: `ErdaBook/**`, application UI, evaluation datasets.
- Recommended merge order: After foundation and before UI/evals integration fixes.

### Site UI handoff

- Branch: `codex/site-ui`
- Commit: `759f995` (integrated equivalent of verified source commit `5f903b6`)
- Delivered: Simplified Chinese responsive chat experience, bounded six-message history,
  duplicate-submission prevention, NDJSON stream parsing, source cards, accessibility
  labels, explicit failure states, and site metadata.
- Public interfaces changed: Consumes `POST /api/chat` and the committed
  `ChatStreamEvent` contract; no parallel contract types were introduced.
- Validation performed: Integration reran NDJSON/UI unit tests, typecheck, lint, and the
  production build with `/` and `/api/chat` emitted.
- Configuration required: None in the client bundle; runtime secrets remain server-only.
- Known limitations: The bespoke social preview generation request failed at the image
  service network boundary, so metadata intentionally omits `og:image` rather than shipping
  a generic or invalid asset.
- Files intentionally not modified: `ErdaBook/**`, ingestion and evaluation internals.
- Recommended merge order: After RAG, before integration endpoint wiring.

### Evals handoff

- Branch: `codex/evals`
- Commit: `cfcc94b` (integrated equivalent of verified source commit `4098a5c`)
- Delivered: Versioned 24-case Simplified Chinese dataset, deterministic offline runner,
  groundedness/citation-fidelity/abstention metrics, latency and usage reporting, and
  fixtures covering answerable, unanswerable, numeric, disambiguation, cross-document,
  and indexed prompt-injection cases.
- Public interfaces changed: Added evaluation JSON/JSONL schemas only; production
  contracts were unchanged.
- Validation performed: Offline evaluation completed with groundedness 1.0, citation
  fidelity 1.0, and abstention accuracy 1.0 across all 24 cases; eval unit tests passed.
- Configuration required: None for the deterministic offline fixture.
- Known limitations: No live model evaluation was claimed without runtime OpenAI secrets.
- Files intentionally not modified: `ErdaBook/**`, application UI, Retriever internals.
- Recommended merge order: After RAG and UI, before integration acceptance.

### Integration handoff

- Branch: `codex/integration`
- Commit: `dc81027`
- Delivered: Integrated RAG/UI/evals and coordination ledger commits in the required order;
  added server-only `POST /api/chat` validation, six-message history bound, OpenAI Responses
  API File Search with retained `file_search_call.results`, strict ErdaBook metadata gating,
  NDJSON answer streaming, real source mapping, deterministic no-evidence refusal, timeouts,
  normalized errors, and configurable `OPENAI_MODEL` defaulting to `gpt-5.6-luna`.
- Public interfaces changed: No semantic contract changes. Added optional server setting
  `OPENAI_MODEL`; `/api/chat` implements the existing `ChatRequest`/`ChatStreamEvent` contract.
- Validation performed: Typecheck, lint, production build, 23 unit tests, 40-document RAG
  dry-run, and 24-case offline evaluation all passed. Official OpenAI docs were checked for
  Responses File Search tool fields and the explicit results include parameter.
- Configuration required: `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID` as Sites secrets;
  `OPENAI_MODEL` is optional and defaults to `gpt-5.6-luna`.
- Known limitations: Live sync, representative `rag:inspect`, live endpoint/model validation,
  and functional chat remain blocked until the two required secrets are supplied. The private
  deployment at `https://erda-encyclopedia.yjnyjpwgsf.chatgpt.site` succeeds and its endpoint
  returns the explicit `NOT_CONFIGURED` state until then.
- Files intentionally not modified: All canonical `ErdaBook/**` content, D1/R2/auth/history
  scope, and dependency/lockfile versions.
- Recommended merge order: This is the final integration branch after foundation, RAG, UI,
  evals, and the coordination ledger.

# Workstreams

This file is the dynamic coordination ledger. Update status and append handoffs;
do not place transient state in `AGENTS.md`.

| Workstream | Branch | Owns | Depends on | Status |
|---|---|---|---|---|
| coordinator | `main` | rules, architecture, assignment, acceptance | none | in progress |
| foundation | `codex/foundation` | scaffold, contracts, config, mocks | coordinator | complete (`031bd88`) |
| rag | `codex/rag` | ingestion, retriever, diagnostics | foundation | in progress |
| site-ui | `codex/site-ui` | UI, streaming UX, metadata | foundation | in progress |
| evals | `codex/evals` | datasets, runners, metrics | foundation | in progress |
| integration | `codex/integration` | merge, E2E fixes, hosting, deploy | rag, site-ui, evals | blocked |

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

# Workstreams

This file is the dynamic coordination ledger. Update status and append handoffs;
do not place transient state in `AGENTS.md`.

| Workstream | Branch | Owns | Depends on | Status |
|---|---|---|---|---|
| coordinator | `main` | rules, architecture, assignment, acceptance | none | in progress |
| foundation | `codex/foundation` | scaffold, contracts, config, mocks | coordinator | planned |
| rag | `codex/rag` | ingestion, retriever, diagnostics | foundation | blocked |
| site-ui | `codex/site-ui` | UI, streaming UX, metadata | foundation | blocked |
| evals | `codex/evals` | datasets, runners, metrics | foundation | blocked |
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

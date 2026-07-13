# ADR 0001: Persistent task workstreams

## Status

Accepted.

## Decision

Use persistent Codex tasks backed by independent Git worktrees for foundation,
RAG, UI, evaluation, and integration. Use repository documents and commits as the
handoff mechanism. Do not use chat context as shared state.

## Consequences

Public contracts must be committed before parallel implementation. File ownership
must remain disjoint, and the integration workstream becomes the sole owner of
cross-workstream conflict resolution and deployment.

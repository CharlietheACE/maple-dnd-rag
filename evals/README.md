# Erda Encyclopedia RAG evaluations

`datasets/erda-rag-v1.json` is a versioned, Simplified Chinese evaluation set grounded only in `ErdaBook/**/*.md`. It covers single-document, cross-document, name-disambiguation, numeric, unanswerable, and prompt-injection cases.

Run the deterministic offline fixture without an API key:

```powershell
node --experimental-strip-types evals/runner.ts --dataset evals/datasets/erda-rag-v1.json --input evals/fixtures/offline-results.jsonl --output evals/report.json
```

The report contains per-case and aggregate `groundedness`, `citationFidelity`, and `abstentionAccuracy`, plus latency samples and token usage totals. Groundedness is deterministic required-claim coverage. Citation fidelity is the fraction of emitted paths allowed by the case. Abstention checks both explicit `abstained: true` and the standard Chinese no-evidence wording.

## Optional online model input

An integration-owned online command may call the application or model and write one JSON object per dataset case to JSONL. The runner itself never imports an SDK and needs no secrets. Each line has this shape:

```json
{"id":"single-001","answer":"...","citations":["ErdaBook/...md"],"abstained":false,"latencyMs":250,"usage":{"inputTokens":100,"outputTokens":30,"totalTokens":130}}
```

Keep IDs unique and include every dataset case. Citation paths must come from real returned metadata. Missing latency or usage remains `null` at sample level and is excluded from latency averages; usage totals still expose the number of measured samples.

To version the set, add a new dataset file and change `datasetVersion`; do not mutate historical expected behavior after reports have been published.

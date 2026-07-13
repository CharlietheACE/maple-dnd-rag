import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluate, parseJsonLines } from "../evals/runner.ts";

const datasetPath = new URL("../evals/datasets/erda-rag-v1.json", import.meta.url);
const fixturePath = new URL("../evals/fixtures/offline-results.jsonl", import.meta.url);

test("dataset is versioned and covers every required category with at least 20 cases", async () => {
  const dataset = JSON.parse(await readFile(datasetPath, "utf8"));
  assert.equal(dataset.schemaVersion, 1);
  assert.match(dataset.datasetVersion, /^\d{4}-\d{2}-\d{2}\.v\d+$/);
  assert.ok(dataset.cases.length >= 20);
  const categories = new Set(dataset.cases.map((item: { category: string }) => item.category));
  for (const category of ["single-document", "cross-document", "name-disambiguation", "numeric", "unanswerable", "prompt-injection"]) assert.ok(categories.has(category));
  assert.equal(new Set(dataset.cases.map((item: { id: string }) => item.id)).size, dataset.cases.length);
});

test("offline fixture is repeatable and achieves perfect policy metrics", async () => {
  const dataset = JSON.parse(await readFile(datasetPath, "utf8"));
  const results = parseJsonLines(await readFile(fixturePath, "utf8"));
  const report = evaluate(dataset, results);
  assert.deepEqual(report, evaluate(dataset, results));
  assert.equal(report.summary.cases, 24);
  assert.equal(report.summary.groundedness, 1);
  assert.equal(report.summary.citationFidelity, 1);
  assert.equal(report.summary.abstentionAccuracy, 1);
  assert.equal(report.summary.latencyMs.samples, 24);
  assert.equal(report.summary.usage.samples, 24);
  assert.ok(report.summary.usage.totalTokens > 0);
});

test("runner rejects missing and duplicate result ids", () => {
  const dataset = { datasetVersion: "test", cases: [{ id: "x", category: "single-document", question: "q", expectedClaims: ["a"], sourcePaths: ["p"], shouldAbstain: false }] };
  assert.throws(() => evaluate(dataset, []), /Missing result/);
  assert.throws(() => evaluate(dataset, [{ id: "x", answer: "a", citations: ["p"] }, { id: "x", answer: "a", citations: ["p"] }]), /Duplicate/);
});

test("metrics penalize unsupported claims, invented citations, and failed abstention", () => {
  const dataset = { datasetVersion: "test", cases: [{ id: "x", category: "single-document", question: "q", expectedClaims: ["alpha", "beta"], sourcePaths: ["real.md"], shouldAbstain: false }] };
  const report = evaluate(dataset, [{ id: "x", answer: "alpha", citations: ["invented.md"] }]);
  assert.equal(report.samples[0].groundedness, 0.5);
  assert.equal(report.samples[0].citationFidelity, 0);
  assert.equal(report.samples[0].abstention, 1);
});

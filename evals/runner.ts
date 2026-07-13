import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export type EvalCase = { id: string; category: string; question: string; expectedClaims: string[]; sourcePaths: string[]; shouldAbstain: boolean };
export type EvalResult = { id: string; answer: string; citations: string[]; abstained?: boolean; latencyMs?: number; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } };

const ratio = (hits: number, total: number) => total === 0 ? 1 : hits / total;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export function parseJsonLines(text: string): EvalResult[] {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try { return JSON.parse(line) as EvalResult; }
    catch { throw new Error(`Invalid JSON on results line ${index + 1}`); }
  });
}

export function evaluate(dataset: { datasetVersion: string; cases: EvalCase[] }, results: EvalResult[]) {
  const byId = new Map(results.map((result) => [result.id, result]));
  if (byId.size !== results.length) throw new Error("Duplicate result id");
  const samples = dataset.cases.map((item) => {
    const result = byId.get(item.id);
    if (!result) throw new Error(`Missing result for ${item.id}`);
    if (!Array.isArray(result.citations) || typeof result.answer !== "string") throw new Error(`Malformed result for ${item.id}`);
    const claimHits = item.expectedClaims.filter((claim) => result.answer.includes(claim)).length;
    const validCitations = result.citations.filter((path) => item.sourcePaths.includes(path)).length;
    const inferredAbstention = result.abstained === true || /未确立|没有足够|无法.*回答/.test(result.answer);
    return {
      id: item.id,
      category: item.category,
      groundedness: item.shouldAbstain ? (inferredAbstention ? 1 : 0) : ratio(claimHits, item.expectedClaims.length),
      citationFidelity: item.shouldAbstain ? (result.citations.length === 0 ? 1 : 0) : ratio(validCitations, result.citations.length || 1),
      abstention: inferredAbstention === item.shouldAbstain ? 1 : 0,
      latencyMs: result.latencyMs ?? null,
      usage: { inputTokens: result.usage?.inputTokens ?? null, outputTokens: result.usage?.outputTokens ?? null, totalTokens: result.usage?.totalTokens ?? null }
    };
  });
  const totals = (key: "inputTokens" | "outputTokens" | "totalTokens") => samples.reduce((sum, sample) => sum + (sample.usage[key] ?? 0), 0);
  return {
    schemaVersion: 1,
    datasetVersion: dataset.datasetVersion,
    summary: {
      cases: samples.length,
      groundedness: mean(samples.map((s) => s.groundedness)),
      citationFidelity: mean(samples.map((s) => s.citationFidelity)),
      abstentionAccuracy: mean(samples.map((s) => s.abstention)),
      latencyMs: { average: mean(samples.flatMap((s) => s.latencyMs === null ? [] : [s.latencyMs])), samples: samples.filter((s) => s.latencyMs !== null).length },
      usage: { inputTokens: totals("inputTokens"), outputTokens: totals("outputTokens"), totalTokens: totals("totalTokens"), samples: samples.filter((s) => s.usage.totalTokens !== null).length }
    },
    samples
  };
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).reduce<string[][]>((pairs, value, index, all) => index % 2 === 0 ? [...pairs, [value, all[index + 1]]] : pairs, []));
  if (!args["--dataset"] || !args["--input"]) throw new Error("Usage: runner.ts --dataset <json> --input <jsonl> [--output <json>]");
  const dataset = JSON.parse(await readFile(args["--dataset"], "utf8"));
  const report = evaluate(dataset, parseJsonLines(await readFile(args["--input"], "utf8")));
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args["--output"]) await writeFile(args["--output"], output, "utf8"); else process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

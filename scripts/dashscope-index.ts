import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_DASHSCOPE_EMBEDDING_DIMENSIONS, DEFAULT_DASHSCOPE_EMBEDDING_MODEL } from "../src/config/server-env.ts";
import { chunkDocuments, createDashScopeIndex, DashScopeEmbeddingTransport, scanErdaBook } from "../src/rag/index.ts";

const dryRun = process.argv.includes("--dry-run");
const root = process.cwd();
const outputPath = path.join(root, "src", "rag", "generated", "dashscope-index.json");
const model = process.env.DASHSCOPE_EMBEDDING_MODEL?.trim() || DEFAULT_DASHSCOPE_EMBEDDING_MODEL;
const dimensions = Number(process.env.DASHSCOPE_EMBEDDING_DIMENSIONS?.trim() || DEFAULT_DASHSCOPE_EMBEDDING_DIMENSIONS);
if (!Number.isInteger(dimensions) || dimensions < 1) throw new Error("DASHSCOPE_EMBEDDING_DIMENSIONS must be a positive integer");

const documents = await scanErdaBook(root, "dashscope-index-v1");
const chunks = chunkDocuments(documents);
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, documents: documents.length, chunks: chunks.length, model, dimensions, output: "src/rag/generated/dashscope-index.json" }, null, 2));
} else {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  const baseUrl = process.env.DASHSCOPE_BASE_URL?.trim();
  if (!apiKey || !baseUrl) throw new Error("Index generation requires DASHSCOPE_API_KEY and DASHSCOPE_BASE_URL");
  const transport = new DashScopeEmbeddingTransport({ apiKey, baseUrl });
  const vectors = await transport.embed(chunks.map((chunk) => chunk.text), { model, dimensions });
  const index = createDashScopeIndex({ chunks, vectors, model, dimensions });
  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(index, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, outputPath);
  console.log(JSON.stringify({ dryRun: false, documents: index.documents.length, chunks: index.chunks.length, model, dimensions, output: "src/rag/generated/dashscope-index.json" }, null, 2));
}

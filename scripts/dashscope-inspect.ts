import { readFile } from "node:fs/promises";
import path from "node:path";
import { readServerEnv } from "../src/config/server-env.ts";
import { DashScopeEmbeddingTransport, LocalVectorRetriever } from "../src/rag/index.ts";

const query = process.argv.slice(2).join(" ").trim();
if (!query) throw new Error("Usage: npm run dashscope:inspect -- <query>");
const env = readServerEnv();
const index = JSON.parse(await readFile(path.join(process.cwd(), "src", "rag", "generated", "dashscope-index.json"), "utf8"));
const transport = new DashScopeEmbeddingTransport({ apiKey: env.DASHSCOPE_API_KEY, baseUrl: env.DASHSCOPE_BASE_URL });
const results = await new LocalVectorRetriever(index, transport, { model: env.DASHSCOPE_EMBEDDING_MODEL, dimensions: env.DASHSCOPE_EMBEDDING_DIMENSIONS }).search({ text: query, maxResults: 8 });
console.log(JSON.stringify(results, null, 2));

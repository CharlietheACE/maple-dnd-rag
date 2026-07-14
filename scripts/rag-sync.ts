import { FetchOpenAITransport, syncErdaBook } from "../src/rag/index.ts";

const dryRun = process.argv.includes("--dry-run");
function legacyEnv() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  if (!apiKey || !vectorStoreId) throw new Error("Legacy OpenAI sync requires OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID");
  return { OPENAI_API_KEY: apiKey, OPENAI_VECTOR_STORE_ID: vectorStoreId };
}
const env = dryRun
  ? { OPENAI_API_KEY: "", OPENAI_VECTOR_STORE_ID: process.env.OPENAI_VECTOR_STORE_ID?.trim() || "dry-run" }
  : legacyEnv();
const result = await syncErdaBook({ vectorStoreId: env.OPENAI_VECTOR_STORE_ID, transport: new FetchOpenAITransport(env.OPENAI_API_KEY), dryRun });
console.log(JSON.stringify({ dryRun, actions: result.actions }, null, 2));

import { readServerEnv } from "../src/config/server-env.ts";
import { FetchOpenAITransport, syncErdaBook } from "../src/rag/index.ts";

const dryRun = process.argv.includes("--dry-run");
const env = dryRun
  ? { OPENAI_API_KEY: "", OPENAI_VECTOR_STORE_ID: process.env.OPENAI_VECTOR_STORE_ID?.trim() || "dry-run" }
  : readServerEnv();
const result = await syncErdaBook({ vectorStoreId: env.OPENAI_VECTOR_STORE_ID, transport: new FetchOpenAITransport(env.OPENAI_API_KEY), dryRun });
console.log(JSON.stringify({ dryRun, actions: result.actions }, null, 2));

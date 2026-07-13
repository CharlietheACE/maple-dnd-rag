import { FetchOpenAITransport, OpenAIRetriever } from "../src/rag/index.ts";

const query = process.argv.slice(2).join(" ").trim();
if (!query) throw new Error("Usage: node --experimental-strip-types scripts/rag-inspect.ts <query>");
const apiKey = process.env.OPENAI_API_KEY?.trim();
const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
if (!apiKey || !vectorStoreId) throw new Error("Legacy OpenAI inspection requires OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID");
const env = { OPENAI_API_KEY: apiKey, OPENAI_VECTOR_STORE_ID: vectorStoreId };
const results = await new OpenAIRetriever(env.OPENAI_VECTOR_STORE_ID, new FetchOpenAITransport(env.OPENAI_API_KEY)).search({ text: query, maxResults: 8 });
console.log(JSON.stringify(results.map(({ text, ...metadata }) => ({ ...metadata, text })), null, 2));

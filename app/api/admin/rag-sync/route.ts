import { EMBEDDED_ERDA_CORPUS } from "@/src/rag/generated/embedded-corpus";
import { authorizedSameOriginSyncRequest, authorizedSyncRequest, RuntimeOpenAITransport, syncRuntimeBatch } from "@/src/rag/runtime-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const token = process.env.ERDA_SYNC_TOKEN || "";
  if (!authorizedSyncRequest(request, token) && !authorizedSameOriginSyncRequest(request)) {
    return Response.json({ status: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID?.trim();
  if (!apiKey || !vectorStoreId) return Response.json({ status: "not_configured" }, { status: 503 });
  let cursor = 0;
  try {
    const body = await request.json() as { cursor?: unknown };
    cursor = typeof body.cursor === "number" ? body.cursor : 0;
    const result = await syncRuntimeBatch({ documents: EMBEDDED_ERDA_CORPUS, cursor, vectorStoreId, transport: new RuntimeOpenAITransport(apiKey), batchSize: 1 });
    return Response.json({ status: "ok", ...result });
  } catch (error) {
    const upstreamStatus = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : 500;
    const status = upstreamStatus === 429 ? 429 : upstreamStatus >= 400 && upstreamStatus < 500 ? 502 : 500;
    return Response.json({ status: "failed", code: upstreamStatus === 429 ? "rate_limited" : `upstream_${upstreamStatus}` }, { status });
  }
}

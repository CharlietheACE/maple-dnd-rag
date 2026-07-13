import { handleChat } from "@/src/chat/handler";
import dashscopeIndex from "@/src/rag/generated/dashscope-index.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleChat(request, process.env, { index: dashscopeIndex });
}

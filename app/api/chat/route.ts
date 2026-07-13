import { handleChat } from "@/src/chat/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleChat(request);
}

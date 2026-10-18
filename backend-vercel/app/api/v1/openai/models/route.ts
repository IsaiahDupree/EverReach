import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "not_configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getOpenAIClient();
    const models = await client.models.list();
    
    // Filter to only chat models
    const chatModels = models.data
      .filter(m => m.id.includes('gpt'))
      .map(m => ({
        id: m.id,
        created: m.created,
        owned_by: m.owned_by
      }));

    return ok({ models: chatModels }, req);
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

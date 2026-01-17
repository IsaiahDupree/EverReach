import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    const supabase = getClientOrThrow(req);

    const { data, error } = await supabase
      .from('agent_conversations')
      .select('id, created_at, updated_at, context')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) return serverError(error.message, req);

    const conversations = (data || []).map(c => ({
      id: c.id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      context: JSON.parse(c.context || '{}')
    }));

    return ok({ conversations }, req);
  } catch (error: any) {
    return serverError(error.message, req);
  }
}

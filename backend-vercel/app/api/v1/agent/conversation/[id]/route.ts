import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const { id } = params;
    const supabase = getClientOrThrow(req);

    const { data, error } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    return ok({
      conversation_id: data.id,
      messages: JSON.parse(data.messages || '[]'),
      context: JSON.parse(data.context || '{}'),
      created_at: data.created_at,
      updated_at: data.updated_at
    }, req);
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const { id } = params;
    const supabase = getClientOrThrow(req);

    const { error } = await supabase
      .from('agent_conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return serverError("Internal server error", req);

    return ok({ deleted: true }, req);
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

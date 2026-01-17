import { options, ok } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('messages')
    .select('id, thread_id, role, content, metadata, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return new Response(JSON.stringify({ error: 'db_select_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return ok({ message: data }, req);
}

import { options, ok, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { interactionUpdateSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .select('id, contact_id, kind, channel, direction, summary, sentiment, content, metadata, occurred_at, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: 'db_select_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return ok({ interaction: data }, req);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const rl = checkRateLimit(`u:${user.id}:PATCH:/v1/interactions/${params.id}`, 60, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: rl.retryAfter }), { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = interactionUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .update(parsed.data as any)
    .eq('id', params.id)
    .select('id, updated_at')
    .maybeSingle();
  if (error) return new Response(JSON.stringify({ error: 'db_update_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return ok({ interaction: data }, req);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const rl = checkRateLimit(`u:${user.id}:DELETE:/v1/interactions/${params.id}`, 60, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: rl.retryAfter }), { status: 429 });

  const supabase = getClientOrThrow(req);
  const { error } = await supabase
    .from('interactions')
    .delete()
    .eq('id', params.id);
  if (error) return new Response(JSON.stringify({ error: 'db_delete_failed', details: error.message }), { status: 500 });
  return ok({ success: true }, req);
}

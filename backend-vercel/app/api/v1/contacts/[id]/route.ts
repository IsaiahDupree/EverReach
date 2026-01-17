import { options, ok } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactUpdateSchema } from "@/lib/validation";
import { withCurrentWarmth } from "@/lib/warmth-helpers";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('contacts')
    .select('id, display_name, emails, phones, company, notes, tags, photo_url, avatar_url, metadata, warmth, warmth_band, warmth_override, warmth_override_reason, warmth_updated_at, last_interaction_at, created_at, updated_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: 'db_select_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  const enriched = withCurrentWarmth(data);
  return ok({ contact: enriched }, req);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const rl = checkRateLimit(`u:${user.id}:PATCH:/v1/contacts/${params.id}`, 30, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: rl.retryAfter }), { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 }); }
  const parsed = contactUpdateSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'validation_error', details: parsed.error.flatten() }), { status: 422 });

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('contacts')
    .update(parsed.data as any)
    .eq('id', params.id)
    .select('id, display_name, emails, phones, company, notes, tags, photo_url, avatar_url, metadata, warmth, warmth_band, updated_at')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: 'db_update_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return ok({ contact: data }, req);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return PATCH(req, { params });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const rl = checkRateLimit(`u:${user.id}:DELETE:/v1/contacts/${params.id}`, 20, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: rl.retryAfter }), { status: 429 });

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, deleted_at')
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: 'db_delete_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return ok({ deleted: true, contact: data }, req);
}

import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { composeSettingsUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/me/compose-settings
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('compose_settings')
      .select('user_id, enabled, default_channel, auto_use_persona_notes, default_template_id, tone, max_length, guardrails, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) {
      // return sensible defaults without creating a row
      return ok({ settings: {
        user_id: user.id,
        enabled: true,
        default_channel: 'email',
        auto_use_persona_notes: true,
        default_template_id: null,
        tone: 'warm',
        max_length: null,
        guardrails: {},
        updated_at: null,
      } }, req);
    }
    return ok({ settings: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// PATCH /v1/me/compose-settings
export async function PATCH(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = composeSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('compose_settings')
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' } as any)
      .select('user_id, enabled, default_channel, auto_use_persona_notes, default_template_id, tone, max_length, guardrails, updated_at')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    return ok({ settings: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

import { options, ok, badRequest, serverError, created, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { promptFirstSchema } from "@/lib/validation";
import { normalizePromptKey } from "@/lib/text";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /api/telemetry/prompt-first
export async function POST(req: Request){
  const origin = req.headers.get('origin') ?? undefined;
  
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401, 
    headers: { "Content-Type": "application/json", ...buildCorsHeaders(origin) } 
  });

  const rl = checkRateLimit(`u:${user.id}:telemetry:prompt-first`, 60, 60_000);
  if (!rl.allowed) return new Response(JSON.stringify({ error: { code: 'rate_limited', retryAfter: rl.retryAfter } }), { 
    status: 429, 
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) } 
  });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = promptFirstSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);

    // Check privacy toggle
    const { data: profile } = await supabase
      .from('profiles')
      .select('analytics_opt_in')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.analytics_opt_in) {
      return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
    }

    const prompt_norm = normalizePromptKey(parsed.data.prompt_raw);
    if (!prompt_norm || prompt_norm.length < 2) {
      return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
    }

    const insert = {
      user_id: user.id,
      prompt_raw: parsed.data.prompt_raw,
      prompt_norm,
      lang: parsed.data.lang ?? null,
      intent: parsed.data.intent ?? null,
      entities: parsed.data.entities ?? {},
      source: parsed.data.source ?? null,
      session_id: parsed.data.session_id ?? null,
      latency_ms: parsed.data.latency_ms ?? null,
      result_kind: parsed.data.result_kind ?? null,
      error_code: parsed.data.error_code ?? null,
      used: parsed.data.used ?? true,
    } as any;

    const { data, error } = await supabase
      .from('prompt_first_raw')
      .insert([insert])
      .select('id, created_at')
      .single();
    if (error) return serverError(error.message, req);
    return created({ id: data.id, created_at: data.created_at }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { composeValidateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/compose/validate
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = composeValidateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);

    let variablesSchema: any = null;
    if (parsed.data.goal_id) {
      const { data: goal, error } = await supabase
        .from('message_goals')
        .select('variables_schema')
        .eq('id', parsed.data.goal_id)
        .maybeSingle();
      if (error) return serverError("Internal server error", req);
      variablesSchema = goal?.variables_schema || null;
    }

    const vars = parsed.data.variables || {};
    const missing: string[] = [];

    // Minimal JSON Schema support: if schema has required[] and properties, check presence only
    if (variablesSchema && Array.isArray(variablesSchema.required)) {
      for (const name of variablesSchema.required) {
        if (!(name in vars)) missing.push(String(name));
      }
    }

    return ok({ ok: missing.length === 0, missing, errors: [] }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

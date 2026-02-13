import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { goalPinSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/goals/:id/pin { pinned: true|false }
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = goalPinSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const { error } = await supabase
      .from('user_goal_prefs')
      .upsert({ user_id: user.id, goal_id: params.id, pinned: parsed.data.pinned, uses: 0 }, { onConflict: 'user_id,goal_id' } as any);
    if (error) return serverError("Internal server error", req);
    return ok({ goal_id: params.id, pinned: parsed.data.pinned }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

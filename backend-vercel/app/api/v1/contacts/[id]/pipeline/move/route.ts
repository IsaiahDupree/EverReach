import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

const moveSchema = z.object({
  stage_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// POST /v1/contacts/:id/pipeline/move
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);

    // Load existing state
    const { data: state, error: sErr } = await supabase
      .from('contact_pipeline_state')
      .select('contact_id, pipeline_id, stage_id')
      .eq('contact_id', params.id)
      .maybeSingle();
    if (sErr) return serverError(sErr.message, req);
    if (!state) return new Response(JSON.stringify({ error: 'state_not_found' }), { status: 404 });

    // Verify new stage belongs to same pipeline
    const { data: nextStage, error: stErr } = await supabase
      .from('pipeline_stages')
      .select('id, pipeline_id, key, name')
      .eq('id', parsed.data.stage_id)
      .maybeSingle();
    if (stErr) return serverError(stErr.message, req);
    if (!nextStage || nextStage.pipeline_id !== state.pipeline_id) {
      return new Response(JSON.stringify({ error: 'INVALID_STAGE_MOVE' }), { status: 409 });
    }

    // Update state
    const { error: upErr } = await supabase
      .from('contact_pipeline_state')
      .update({ stage_id: parsed.data.stage_id })
      .eq('contact_id', params.id);
    if (upErr) return serverError(upErr.message, req);

    // Insert history
    const { error: hErr } = await supabase
      .from('contact_pipeline_history')
      .insert([{ contact_id: params.id, pipeline_id: state.pipeline_id, from_stage_id: state.stage_id, to_stage_id: parsed.data.stage_id, changed_by_user_id: user.id, reason: parsed.data.reason ?? null }]);
    if (hErr) return serverError(hErr.message, req);

    return ok({ from_stage_id: state.stage_id, to_stage_id: parsed.data.stage_id, changed_by_user_id: user.id, reason: parsed.data.reason ?? null, created_at: new Date().toISOString() }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

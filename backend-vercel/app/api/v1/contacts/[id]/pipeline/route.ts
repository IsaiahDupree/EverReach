import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/pipeline — current state + allowed moves
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);

    const { data: state, error: sErr } = await supabase
      .from('contact_pipeline_state')
      .select('contact_id, pipeline_id, stage_id, started_at, updated_at')
      .eq('contact_id', params.id)
      .maybeSingle();
    if (sErr) return serverError(sErr.message, req);
    if (!state) return ok({ contact_id: params.id, pipeline_id: null, stage_id: null, allowed_moves: [] }, req);

    const [{ data: pipeline }, { data: stage }, { data: stages }] = await Promise.all([
      supabase.from('pipelines').select('id, key, name').eq('id', state.pipeline_id).maybeSingle(),
      supabase.from('pipeline_stages').select('id, key, name, position, terminal').eq('id', state.stage_id).maybeSingle(),
      supabase.from('pipeline_stages').select('id, key, name, position, terminal').eq('pipeline_id', state.pipeline_id).order('position', { ascending: true })
    ]);

    const allowed_moves = (stages || []).map(s => ({ stage_id: s.id, stage_key: s.key, stage_name: s.name }));

    return ok({
      contact_id: state.contact_id,
      pipeline_id: pipeline?.id || state.pipeline_id,
      stage_id: stage?.id || state.stage_id,
      pipeline_key: pipeline?.key || null,
      stage_key: stage?.key || null,
      stage_name: stage?.name || null,
      started_at: state.started_at,
      updated_at: state.updated_at,
      allowed_moves,
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

const setSchema = z.object({
  pipeline_key: z.enum(['networking','personal','business']),
  stage_key: z.string().optional(),
});

// POST /v1/contacts/:id/pipeline — set pipeline (initial stage)
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);

    // First verify contact exists and get org_id
    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, org_id')
      .eq('id', params.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (cErr) return serverError(cErr.message, req);
    if (!contact) return new Response(JSON.stringify({ error: 'contact_not_found' }), { status: 404 });

    const { data: pipeline, error: pErr } = await supabase
      .from('pipelines')
      .select('id')
      .eq('key', parsed.data.pipeline_key)
      .maybeSingle();
    if (pErr) return serverError(pErr.message, req);
    if (!pipeline) return new Response(JSON.stringify({ error: 'pipeline_not_found' }), { status: 404 });

    let stageId: string | null = null;
    if (parsed.data.stage_key) {
      const { data: stage, error: sErr } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipeline.id)
        .eq('key', parsed.data.stage_key)
        .maybeSingle();
      if (sErr) return serverError(sErr.message, req);
      if (!stage) return new Response(JSON.stringify({ error: 'stage_not_found' }), { status: 404 });
      stageId = stage.id;
    } else {
      const { data: firstStage, error: fsErr } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipeline.id)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (fsErr) return serverError(fsErr.message, req);
      stageId = firstStage?.id || null;
    }

    if (!stageId) return new Response(JSON.stringify({ error: 'no_stage_available' }), { status: 409 });

    // Upsert state (include org_id for RLS)
    const { data: state, error: upErr } = await supabase
      .from('contact_pipeline_state')
      .upsert({ contact_id: params.id, org_id: contact.org_id, pipeline_id: pipeline.id, stage_id: stageId }, { onConflict: 'contact_id' } as any)
      .select('contact_id, pipeline_id, stage_id, updated_at')
      .maybeSingle();
    if (upErr) return serverError(upErr.message, req);

    // History (include org_id)
    const { error: hErr } = await supabase
      .from('contact_pipeline_history')
      .insert([{ contact_id: params.id, org_id: contact.org_id, pipeline_id: pipeline.id, from_stage_id: null, to_stage_id: stageId, changed_by_user_id: user.id, reason: 'set' }]);
    if (hErr) return serverError(hErr.message, req);

    return ok({ state }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

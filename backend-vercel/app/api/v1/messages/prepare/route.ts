import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { messagesPrepareSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/messages/prepare
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = messagesPrepareSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    let threadId = parsed.data.thread_id as string | undefined;

    if (!threadId) {
      let title: string | undefined = undefined;
      if (parsed.data.contact_id) {
        const { data: c } = await supabase.from('contacts').select('display_name').eq('id', parsed.data.contact_id).maybeSingle();
        if (c?.display_name) title = `Compose: ${c.display_name}`;
      }
      const { data: thread, error: tErr } = await supabase
        .from('message_threads')
        .insert([{ title: title ?? null }])
        .select('id')
        .single();
      if (tErr) return serverError(tErr.message, req);
      threadId = thread.id;
    }

    const meta: any = {
      channel: parsed.data.channel,
      contact_id: parsed.data.contact_id || null,
    };
    if (parsed.data.draft.subject) meta.subject = parsed.data.draft.subject;

    const { data: msg, error } = await supabase
      .from('messages')
      .insert([{ thread_id: threadId, role: 'assistant', content: parsed.data.draft.body, metadata: meta, composer_context: parsed.data.composer_context ?? {} }])
      .select('id, thread_id, created_at')
      .single();
    if (error) return serverError("Internal server error", req);

    // Starter-lite analytics: increment template accepts_count if provided
    const templateId = (parsed.data.composer_context as any)?.template_id;
    if (templateId) {
      const { data: stat } = await supabase
        .from('templates_stats')
        .select('accepts_count')
        .eq('template_id', templateId)
        .maybeSingle();
      if (stat) {
        await supabase
          .from('templates_stats')
          .update({ accepts_count: (stat.accepts_count ?? 0) + 1 })
          .eq('template_id', templateId);
      } else {
        await supabase
          .from('templates_stats')
          .insert([{ template_id: templateId, user_id: user.id, accepts_count: 1 }]);
      }
    }

    // Attempt to log compose session and return its id (will succeed after migrations are applied)
    let compose_session_id: string | null = null;
    try {
      const sources = {
        template_id: (parsed.data.composer_context as any)?.template_id ?? null,
        contact_id: parsed.data.contact_id ?? null,
      };
      const draft = { body: parsed.data.draft.body, subject: parsed.data.draft.subject ?? null } as any;
      const { data: session } = await supabase
        .from('compose_sessions')
        .insert([{ user_id: user.id, contact_id: parsed.data.contact_id ?? null, goal_id: null, goal_text: null, channel: parsed.data.channel, template_id: sources.template_id, variables: {}, sources, draft, safety: {} }])
        .select('id')
        .single();
      compose_session_id = session?.id ?? null;
    } catch { /* ignore if table not present */ }

    return created({ message: msg, compose_session_id }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

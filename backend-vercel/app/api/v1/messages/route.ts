import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { messageLogSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/messages – log a message (manual or from integration webhook)
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = messageLogSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const { content, role = 'user', thread_id, contact_id, metadata = {} } = parsed.data as any;

  try {
    const supabase = getClientOrThrow(req);

    let threadId = thread_id as string | undefined;
    if (!threadId) {
      // Create a new thread; optionally label by contact
      let title: string | undefined = undefined;
      if (contact_id) {
        const { data: contact } = await supabase.from('contacts').select('display_name').eq('id', contact_id).maybeSingle();
        if (contact?.display_name) title = `Contact: ${contact.display_name}`;
      }
      const { data: threadRow, error: threadErr } = await supabase
        .from('message_threads')
        .insert([{ title: title ?? null }])
        .select('id')
        .single();
      if (threadErr) return serverError(threadErr.message, req);
      threadId = threadRow.id;
    }

    const meta = { ...(metadata || {}), ...(contact_id ? { contact_id } : {}) };
    const { data: msg, error } = await supabase
      .from('messages')
      .insert([{ thread_id: threadId, role, content, metadata: meta }])
      .select('id, thread_id, role, content, metadata, created_at')
      .single();
    if (error) return serverError(error.message, req);

    return ok({ message: msg }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

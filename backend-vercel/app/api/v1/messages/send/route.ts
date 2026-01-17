import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { messagesSendSchema } from "@/lib/validation";
import { normalizePromptKey } from "@/lib/text";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/messages/send
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = messagesSendSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    // Load current metadata to merge
    const { data: msg, error: selErr } = await supabase
      .from('messages')
      .select('id, thread_id, content, metadata')
      .eq('id', parsed.data.message_id)
      .maybeSingle();
    if (selErr) return serverError(selErr.message, req);
    if (!msg) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    const existing = (msg.metadata || {}) as Record<string, any>;
    const sentAt = new Date().toISOString();
    const updatedMeta = { ...existing, sent_at: sentAt, channel_account_id: parsed.data.channel_account_id ?? null };

    const { error: updErr } = await supabase
      .from('messages')
      .update({ metadata: updatedMeta, delivery_status: 'sent', sent_at: sentAt })
      .eq('id', msg.id);
    if (updErr) return serverError(updErr.message, req);

    // Get contact_id and org_id from the message to create interaction
    const { data: msgWithContact, error: msgErr } = await supabase
      .from('messages')
      .select('contact_id, channel, org_id')
      .eq('id', msg.id)
      .maybeSingle();
    
    if (!msgErr && msgWithContact?.contact_id && msgWithContact?.org_id) {
      // Create an interaction record for this sent message
      try {
        const { error: interErr } = await supabase
          .from('interactions')
          .insert([{
            org_id: msgWithContact.org_id,
            contact_id: msgWithContact.contact_id,
            kind: msgWithContact.channel || 'note',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            metadata: { message_id: msg.id, sent_at: sentAt },
            created_by: user.id,
            created_at: sentAt,
          }]);
        
        if (interErr) {
          console.error('[messages/send] Failed to create interaction:', interErr);
        } else {
          // Update contact's last_interaction_at
          await supabase
            .from('contacts')
            .update({ last_interaction_at: sentAt })
            .eq('id', msgWithContact.contact_id);

          // Recompute contact warmth now that we have a new interaction
          try {
            const base = new URL(req.url);
            base.pathname = `/api/v1/contacts/${msgWithContact.contact_id}/warmth/recompute`;
            const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
            await fetch(base.toString(), {
              method: 'POST',
              headers: auth ? { Authorization: auth } as any : undefined,
            });
          } catch (e) {
            console.error('[messages/send] Failed to recompute warmth:', e);
          }
        }
      } catch (e) {
        console.error('[messages/send] Error creating interaction:', e);
      }
    }

    // Auto-fire telemetry: prompt-first on first send in thread
    try {
      if (msg.thread_id) {
        const { data: prior } = await supabase
          .from('messages')
          .select('id, sent_at')
          .eq('thread_id', msg.thread_id)
          .lt('sent_at', sentAt)
          .limit(1);
        const isFirstSendInThread = !prior || prior.length === 0;
        if (isFirstSendInThread) {
          // Respect privacy toggle
          const { data: profile } = await supabase
            .from('profiles')
            .select('analytics_opt_in')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.analytics_opt_in) {
            const existingMeta = (msg as any).metadata || {};
            const prompt_raw: string = (existingMeta.prompt_raw || (typeof (msg as any).content === 'string' ? (msg as any).content : '') || '').slice(0, 500);
            const prompt_norm = normalizePromptKey(prompt_raw);
            if (prompt_norm && prompt_norm.length >= 2) {
              await supabase
                .from('prompt_first_raw')
                .insert([{ user_id: user.id, prompt_raw, prompt_norm, lang: null, intent: null, entities: {}, source: 'messages.send', session_id: msg.thread_id, latency_ms: null, result_kind: 'send', error_code: null, used: true }] as any);
            }
          }
        }
      }
    } catch {
      // non-fatal
    }

    // Provider integration would be invoked here; for Starter we just mark sent metadata.
    return ok({ sent: true, message_id: msg.id, sent_at: sentAt, delivery_status: 'sent' }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

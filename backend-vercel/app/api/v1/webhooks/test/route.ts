import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import crypto from 'crypto';

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/webhooks/test
// Body: { url: string, secret: string, event_type?: string, payload?: any }
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user || !isAdmin(user.id)) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });

  let body: any;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const { url, secret, event_type = 'compose.draft.created', payload = {} } = body || {};
  if (!url || !secret) return badRequest('missing url or secret', req);

  try {
    const event = {
      id: crypto.randomUUID(),
      type: event_type,
      time: new Date().toISOString(),
      data: payload,
    };
    const json = JSON.stringify(event);
    const sig = crypto.createHmac('sha256', secret).update(json).digest('hex');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EverReach-Event': event_type,
        'X-EverReach-Signature': `sha256=${sig}`,
      },
      body: json,
    });

    const text = await resp.text();
    return ok({ delivered: resp.ok, status: resp.status, response: text.slice(0, 2000) }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

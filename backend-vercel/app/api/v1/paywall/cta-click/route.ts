/**
 * POST /api/v1/paywall/cta-click
 * 
 * Track paywall CTA clicks (start_trial, subscribe, etc)
 * Idempotent via idempotency_key
 * 
 * Body: { variant, cta, context, idempotency_key }
 */

import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const { variant, cta, context, idempotency_key } = body;

    if (!variant || !cta) {
      return badRequest('variant and cta are required', req);
    }

    const supabase = getClientOrThrow(req);

    // Insert with idempotency
    const { data, error } = await supabase
      .from('paywall_events')
      .insert({
        user_id: user.id,
        variant,
        type: 'cta_click',
        cta,
        context: context || null,
        idempotency_key: idempotency_key || `cta-${user.id}-${cta}-${Date.now()}`,
      })
      .select('id, created_at')
      .single();

    if (error) {
      // If duplicate idempotency_key, that's OK (idempotent)
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return ok({ ok: true, idempotent: true }, req);
      }
      return serverError("Internal server error", req);
    }

    return ok({
      ok: true,
      event_id: data.id,
      recorded_at: data.created_at,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

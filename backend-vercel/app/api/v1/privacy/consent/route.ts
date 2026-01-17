/**
 * POST /api/v1/privacy/consent
 * 
 * Update user privacy consent preferences
 * 
 * Body: { marketing_emails, tracking, updated_at }
 */

import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const { marketing_emails, tracking } = body;

    const supabase = getClientOrThrow(req);

    const updates: Record<string, any> = {
      consent_updated_at: new Date().toISOString(),
    };

    if (marketing_emails !== undefined) {
      updates.marketing_emails = marketing_emails;
    }

    if (tracking !== undefined) {
      updates.tracking_consent = tracking;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      return serverError(`Failed to update consent: ${error.message}`, req);
    }

    return ok({
      ok: true,
      updated_at: updates.consent_updated_at,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

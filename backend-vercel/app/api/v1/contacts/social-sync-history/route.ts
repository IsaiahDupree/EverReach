import { options, ok, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /api/v1/contacts/social-sync-history
 * Returns last 50 social sync log entries for current user
 * Response: { entries: { contact_id, platform, handle, action, display_name, warmth, warmth_band, created_at }[] }
 */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('social_sync_log')
      .select(`
        contact_id,
        platform,
        handle,
        profile_url,
        action,
        created_at,
        contacts!social_sync_log_contact_id_fkey (
          display_name,
          warmth,
          warmth_band
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[social-sync-history] db error:', error);
      return serverError('Database query failed', req);
    }

    // Flatten the joined data
    const entries = (data || []).map((log: any) => ({
      contact_id: log.contact_id,
      platform: log.platform,
      handle: log.handle,
      profile_url: log.profile_url,
      action: log.action,
      display_name: log.contacts?.display_name || null,
      warmth: log.contacts?.warmth || null,
      warmth_band: log.contacts?.warmth_band || null,
      created_at: log.created_at,
    }));

    return ok({ entries }, req);

  } catch (e: any) {
    console.error('[social-sync-history] error:', e?.message);
    return serverError('Internal error', req);
  }
}

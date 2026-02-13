import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /v1/alerts
 * Get user's warmth alerts (pending by default)
 */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const dismissed = url.searchParams.get('dismissed') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  
  try {
    const supabase = getClientOrThrow(req);
    
    let query = supabase
      .from('warmth_alerts')
      .select(`
        id,
        contact_id,
        alert_type,
        warmth_at_alert,
        warmth_threshold,
        days_since_interaction,
        dismissed,
        dismissed_at,
        action_taken,
        action_taken_at,
        snooze_until,
        notification_sent,
        notification_sent_at,
        created_at,
        contacts (
          id,
          display_name,
          warmth,
          warmth_band,
          watch_status,
          tags
        )
      `)
      .eq('dismissed', dismissed)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Filter out snoozed alerts
    if (!dismissed) {
      const now = new Date().toISOString();
      query = query.or(`snooze_until.is.null,snooze_until.lt.${now}`);
    }
    
    const { data: alerts, error } = await query;
    
    if (error) {
      return serverError("Internal server error", req);
    }
    
    // Transform data for frontend
    const transformedAlerts = (alerts || []).map(alert => ({
      id: alert.id,
      type: alert.alert_type,
      contact: {
        id: alert.contact_id,
        name: (alert.contacts as any)?.display_name,
        warmth: (alert.contacts as any)?.warmth,
        warmth_band: (alert.contacts as any)?.warmth_band,
        watch_status: (alert.contacts as any)?.watch_status,
        tags: (alert.contacts as any)?.tags
      },
      warmth_at_alert: alert.warmth_at_alert,
      warmth_threshold: alert.warmth_threshold,
      days_since_interaction: alert.days_since_interaction,
      dismissed: alert.dismissed,
      dismissed_at: alert.dismissed_at,
      action_taken: alert.action_taken,
      action_taken_at: alert.action_taken_at,
      snoozed_until: alert.snooze_until,
      notification_sent: alert.notification_sent,
      notification_sent_at: alert.notification_sent_at,
      created_at: alert.created_at
    }));
    
    return ok({
      alerts: transformedAlerts,
      items: transformedAlerts,
      total: transformedAlerts.length,
      dismissed
    }, req);
    
  } catch (error: any) {
    return serverError("Internal server error", req);
  }
}

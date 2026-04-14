import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { sendPushNotificationForDrifting } from "@/lib/notificationService";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /v1/notifications/send-drifting
 * Send drifting notifications for contacts with warmth < 15
 * Rate limited to 3 notifications per user per day
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);

    // Get user's push tokens
    const { data: pushTokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('is_active', true)
      .eq('notifications_enabled', true);

    if (tokenError || !pushTokens || pushTokens.length === 0) {
      return ok({
        sent: 0,
        message: 'No active push tokens found'
      }, req);
    }

    // Check notification count for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const { data: sentToday, error: countError } = await supabase
      .from('notification_history')
      .select('id')
      .eq('notification_type', 'relationship_drifting')
      .gte('created_at', todayStr)
      .lt('created_at', new Date(today.getTime() + 86400000).toISOString().split('T')[0]);

    if (countError) {
      return serverError("Internal server error", req);
    }

    const sentTodayCount = sentToday?.length || 0;
    const dailyLimit = 3;

    if (sentTodayCount >= dailyLimit) {
      return ok({
        sent: 0,
        message: `Daily limit (${dailyLimit}) reached`
      }, req);
    }

    // Find drifting contacts (warmth < 15) with relationship_goal set
    const { data: driftingContacts, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        id,
        display_name,
        warmth,
        last_interaction_at,
        relationship_goal
      `)
      .lt('warmth', 15)
      .not('relationship_goal', 'is', null)
      .is('deleted_at', null);

    if (contactsError || !driftingContacts) {
      return serverError("Internal server error", req);
    }

    // Filter to only new drifts (those that dropped below 15 recently)
    // Check if we've already sent a notification for this contact recently
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentNotifications, error: recentError } = await supabase
      .from('notification_history')
      .select('contact_id')
      .eq('notification_type', 'relationship_drifting')
      .gte('created_at', oneWeekAgo)
      .in('contact_id', driftingContacts.map(c => c.id));

    if (recentError) {
      return serverError("Internal server error", req);
    }

    const alreadyNotified = new Set(recentNotifications?.map(n => n.contact_id) || []);
    const contactsToNotify = driftingContacts.filter(c => !alreadyNotified.has(c.id));

    if (contactsToNotify.length === 0) {
      return ok({
        sent: 0,
        message: 'No new drifting contacts to notify'
      }, req);
    }

    // Send notifications
    let notificationsSent = 0;
    const remainingNotifications = Math.min(contactsToNotify.length, dailyLimit - sentTodayCount);

    for (let i = 0; i < remainingNotifications; i++) {
      const contact = contactsToNotify[i];
      const daysSince = contact.last_interaction_at
        ? Math.floor((Date.now() - new Date(contact.last_interaction_at).getTime()) / 86400000)
        : null;

      try {
        // Send push notification via Expo
        for (const tokenRecord of pushTokens) {
          await sendPushNotificationForDrifting(
            tokenRecord.push_token,
            contact.display_name,
            daysSince,
            contact.id
          );
        }

        // Record notification sent
        await supabase
          .from('notification_history')
          .insert({
            notification_type: 'relationship_drifting',
            contact_id: contact.id,
            user_id: user.id,
            message: `${contact.display_name} is drifting — it's been ${daysSince || '0'} days.`,
            status: 'sent'
          });

        notificationsSent++;

        // Track event in PostHog
        // Note: PostHog tracking would be done client-side via analytics SDK
      } catch (error) {
        console.error(`Failed to send notification for contact ${contact.id}:`, error);
      }
    }

    return ok({
      sent: notificationsSent,
      total: contactsToNotify.length,
      message: `Sent ${notificationsSent} notification(s)`
    }, req);

  } catch (error: any) {
    console.error('Error in send-drifting endpoint:', error);
    return serverError("Internal server error", req);
  }
}

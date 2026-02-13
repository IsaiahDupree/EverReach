import { ok, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "edge";

/**
 * Cron Job: Check Warmth Alerts
 * Runs daily to check watched contacts and send alerts when they go cold
 * 
 * Schedule: Daily at 9 AM (configured in vercel.json)
 * Endpoint: GET /api/cron/check-warmth-alerts
 * Auth: Cron secret (CRON_SECRET env var)
 */
export async function GET(req: Request) {
  // Verify cron secret (fail-closed)
  const { verifyCron } = await import('@/lib/cron-auth');
  const cronAuthError = verifyCron(req);
  if (cronAuthError) return cronAuthError;
  
  const startTime = Date.now();
  console.log('[Warmth Alerts Cron] Starting warmth check...');
  
  try {
    const supabase = getServiceClient();
    
    // ================================================
    // 1. GET ALL WATCHED CONTACTS
    // ================================================
    const { data: watchedContacts, error: fetchError } = await supabase
      .from('contacts')
      .select(`
        id,
        user_id,
        org_id,
        display_name,
        warmth,
        warmth_band,
        watch_status,
        warmth_alert_threshold,
        last_warmth_alert_sent_at,
        last_interaction_at,
        metadata
      `)
      .in('watch_status', ['watch', 'important', 'vip'])
      .not('warmth', 'is', null);
    
    if (fetchError) {
      console.error('[Warmth Alerts Cron] Fetch error:', fetchError);
      return serverError(fetchError.message, req);
    }
    
    console.log(`[Warmth Alerts Cron] Found ${watchedContacts?.length || 0} watched contacts`);
    
    // ================================================
    // 2. IDENTIFY CONTACTS NEEDING ALERTS
    // ================================================
    const alertsToCreate = [];
    const now = new Date();
    
    for (const contact of watchedContacts || []) {
      // Skip if warmth is null or undefined
      if (contact.warmth == null) continue;
      
      // Skip if already alerted recently (within 7 days)
      if (contact.last_warmth_alert_sent_at) {
        const lastAlertDate = new Date(contact.last_warmth_alert_sent_at);
        const daysSinceAlert = Math.floor((now.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceAlert < 7) {
          console.log(`[Warmth Alerts Cron] Skipping ${contact.display_name} - alerted ${daysSinceAlert} days ago`);
          continue;
        }
      }
      
      // Check if warmth is below threshold
      const threshold = contact.warmth_alert_threshold || 30;
      
      if (contact.warmth < threshold) {
        // Calculate days since last interaction
        let daysSinceInteraction = null;
        if (contact.last_interaction_at) {
          const lastInteractionDate = new Date(contact.last_interaction_at);
          daysSinceInteraction = Math.floor((now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        console.log(`[Warmth Alerts Cron] Alert needed: ${contact.display_name} (warmth: ${contact.warmth}, threshold: ${threshold})`);
        
        alertsToCreate.push({
          org_id: contact.org_id,
          user_id: contact.user_id,
          contact_id: contact.id,
          alert_type: 'dropped_below',
          warmth_at_alert: contact.warmth,
          warmth_threshold: threshold,
          days_since_interaction: daysSinceInteraction,
          previous_warmth: contact.metadata?.previous_warmth || null,
          metadata: {
            contact_name: contact.display_name,
            watch_status: contact.watch_status,
            warmth_band: contact.warmth_band
          }
        });
      }
    }
    
    console.log(`[Warmth Alerts Cron] ${alertsToCreate.length} alerts to create`);
    
    if (alertsToCreate.length === 0) {
      return ok({ 
        success: true, 
        alerts_created: 0,
        contacts_checked: watchedContacts?.length || 0,
        duration_ms: Date.now() - startTime
      }, req);
    }
    
    // ================================================
    // 3. CREATE ALERT RECORDS
    // ================================================
    const { data: createdAlerts, error: insertError } = await supabase
      .from('warmth_alerts')
      .insert(alertsToCreate)
      .select('id, user_id, contact_id, warmth_at_alert');
    
    if (insertError) {
      console.error('[Warmth Alerts Cron] Insert error:', insertError);
      return serverError(insertError.message, req);
    }
    
    console.log(`[Warmth Alerts Cron] Created ${createdAlerts?.length || 0} alert records`);
    
    // ================================================
    // 4. SEND PUSH NOTIFICATIONS
    // ================================================
    const notificationResults = await sendPushNotifications(supabase, createdAlerts || []);
    
    // ================================================
    // 5. UPDATE CONTACTS WITH LAST ALERT TIME
    // ================================================
    const contactIdsAlerted = createdAlerts?.map(a => a.contact_id) || [];
    if (contactIdsAlerted.length > 0) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ last_warmth_alert_sent_at: now.toISOString() })
        .in('id', contactIdsAlerted);
      
      if (updateError) {
        console.error('[Warmth Alerts Cron] Update error:', updateError);
      }
    }
    
    // ================================================
    // 6. RETURN RESULTS
    // ================================================
    const duration = Date.now() - startTime;
    console.log(`[Warmth Alerts Cron] Completed in ${duration}ms`);
    
    return ok({
      success: true,
      alerts_created: createdAlerts?.length || 0,
      notifications_sent: notificationResults.sent,
      notifications_failed: notificationResults.failed,
      contacts_checked: watchedContacts?.length || 0,
      duration_ms: duration
    }, req);
    
  } catch (error: any) {
    console.error('[Warmth Alerts Cron] Fatal error:', error);
    return serverError(error.message, req);
  }
}

/**
 * Send push notifications for warmth alerts
 */
async function sendPushNotifications(supabase: any, alerts: any[]) {
  let sent = 0;
  let failed = 0;
  
  // Group alerts by user_id for efficiency
  const alertsByUser = alerts.reduce((acc, alert) => {
    if (!acc[alert.user_id]) acc[alert.user_id] = [];
    acc[alert.user_id].push(alert);
    return acc;
  }, {} as Record<string, any[]>);
  
  for (const [userId, userAlerts] of Object.entries(alertsByUser)) {
    try {
      // Get user's push tokens
      const { data: tokens } = await supabase
        .from('user_push_tokens')
        .select('push_token, platform, warmth_alerts_enabled')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('warmth_alerts_enabled', true);
      
      if (!tokens || tokens.length === 0) {
        console.log(`[Push] No active tokens for user ${userId}`);
        continue;
      }
      
      // Get contact details for notifications
      const contactIds = (userAlerts as any[]).map((a: any) => a.contact_id);
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, display_name, warmth, watch_status')
        .in('id', contactIds);
      
      const contactsMap = contacts?.reduce((acc: any, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {});
      
      // Send notification for each alert
      for (const alert of (userAlerts as any[])) {
        const contact = contactsMap?.[alert.contact_id];
        if (!contact) continue;
        
        for (const token of tokens) {
          try {
            await sendExpoNotification({
              token: token.push_token,
              title: getNotificationTitle(contact),
              body: getNotificationBody(contact, alert),
              data: {
                type: 'warmth_alert',
                alert_id: alert.id,
                contact_id: contact.id,
                warmth: alert.warmth_at_alert,
                screen: '/contact/' + contact.id,
                action: 'compose'
              },
              priority: contact.watch_status === 'vip' ? 'high' : 'default'
            });
            
            sent++;
            
            // Update alert record
            await supabase
              .from('warmth_alerts')
              .update({
                notification_sent: true,
                notification_channel: 'push',
                notification_sent_at: new Date().toISOString()
              })
              .eq('id', alert.id);
            
          } catch (notifError: any) {
            console.error(`[Push] Failed to send to token ${token.push_token.slice(0, 20)}...`, notifError);
            failed++;
            
            // Log error
            await supabase
              .from('warmth_alerts')
              .update({
                notification_error: notifError.message
              })
              .eq('id', alert.id);
          }
        }
      }
    } catch (error: any) {
      console.error(`[Push] Error processing user ${userId}:`, error);
      failed += (userAlerts as any[]).length;
    }
  }
  
  return { sent, failed };
}

/**
 * Send notification via Expo Push API
 */
async function sendExpoNotification(params: {
  token: string;
  title: string;
  body: string;
  data: any;
  priority?: 'default' | 'normal' | 'high';
}) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: params.token,
      title: params.title,
      body: params.body,
      data: params.data,
      priority: params.priority || 'default',
      sound: 'default',
      badge: 1,
      channelId: 'warmth-alerts'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Expo push failed: ${error}`);
  }
  
  const result = await response.json();
  
  // Check for errors in response
  if (result.data && result.data[0]?.status === 'error') {
    throw new Error(result.data[0].message || 'Push notification failed');
  }
  
  return result;
}

/**
 * Generate notification title based on contact
 */
function getNotificationTitle(contact: any): string {
  const emoji = contact.watch_status === 'vip' ? '⭐' : 
                contact.watch_status === 'important' ? '🔥' : '📉';
  
  return `${emoji} ${contact.display_name} is getting cold`;
}

/**
 * Generate notification body based on contact and alert
 */
function getNotificationBody(contact: any, alert: any): string {
  const warmth = alert.warmth_at_alert;
  const days = alert.days_since_interaction;
  
  if (days != null) {
    return `Warmth: ${warmth}/100 • ${days} days since last contact`;
  } else {
    return `Warmth: ${warmth}/100 • No recent interactions`;
  }
}

/**
 * Notification System
 * 
 * Sends push notifications to users via Expo Push Notifications
 * and creates in-app notifications in the database.
 */

import { getServiceClient } from './supabase';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: 'info' | 'success' | 'warning' | 'error';
  priority?: 'default' | 'high';
}

/**
 * Send a notification to a user
 * - Creates in-app notification in database
 * - Sends push notification if user has tokens registered
 */
export async function sendNotification(payload: NotificationPayload) {
  const supabase = getServiceClient();

  try {
    // 1. Create in-app notification
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.userId,
        title: payload.title,
        body: payload.body,
        type: payload.type || 'info',
        data: payload.data || {},
        read: false,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[Notifications] Failed to create notification:', dbError);
    } else {
      console.log(`[Notifications] Created notification ${notification.id} for user ${payload.userId}`);
    }

    // 2. Send push notification if user has Expo tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', payload.userId)
      .eq('enabled', true);

    if (tokens && tokens.length > 0) {
      await sendExpoPushNotifications(tokens.map(t => t.token), {
        title: payload.title,
        body: payload.body,
        data: payload.data,
        priority: payload.priority,
      });
    }

  } catch (error) {
    console.error('[Notifications] Error sending notification:', error);
    // Don't throw - notifications should never break the app
  }
}

/**
 * Send Expo Push Notifications
 */
async function sendExpoPushNotifications(
  tokens: string[],
  message: {
    title: string;
    body: string;
    data?: Record<string, any>;
    priority?: 'default' | 'high';
  }
) {
  try {
    // Expo Push Notification format
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
      priority: message.priority || 'default',
    }));

    // Send to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Expo Push] Failed to send:', error);
    } else {
      const result = await response.json();
      console.log(`[Expo Push] Sent ${messages.length} notification(s):`, result);
    }

  } catch (error) {
    console.error('[Expo Push] Error:', error);
  }
}

/**
 * Specific notification helpers
 */

export async function notifyImportComplete(
  userId: string,
  jobId: string,
  provider: string,
  stats: {
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  }
) {
  await sendNotification({
    userId,
    title: '✅ Import Complete!',
    body: `${stats.imported} contacts imported from ${provider}. ${stats.skipped} skipped, ${stats.failed} failed.`,
    type: 'success',
    priority: 'high',
    data: {
      type: 'import_complete',
      jobId,
      provider,
      ...stats,
    },
  });
}

export async function notifyImportFailed(
  userId: string,
  jobId: string,
  provider: string,
  error: string
) {
  await sendNotification({
    userId,
    title: '❌ Import Failed',
    body: `Failed to import contacts from ${provider}: ${error}`,
    type: 'error',
    priority: 'high',
    data: {
      type: 'import_failed',
      jobId,
      provider,
      error,
    },
  });
}

export async function notifyImportReady(
  userId: string,
  jobId: string,
  provider: string,
  contactCount: number
) {
  await sendNotification({
    userId,
    title: '📋 Contacts Ready to Review',
    body: `Found ${contactCount} contacts from ${provider}. Ready to select which ones to import!`,
    type: 'info',
    priority: 'high',
    data: {
      type: 'import_ready',
      jobId,
      provider,
      contactCount,
    },
  });
}

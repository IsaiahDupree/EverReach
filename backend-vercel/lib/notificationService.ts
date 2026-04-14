/**
 * Notification Service
 * Handles sending push notifications via Expo
 */

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

interface ExPoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a drifting notification via Expo Push Notifications
 */
export async function sendPushNotificationForDrifting(
  expoPushToken: string,
  contactName: string,
  daysSince: number | null,
  contactId: string
): Promise<boolean> {
  try {
    const daysText = daysSince === null
      ? 'some time'
      : daysSince === 0
      ? 'today'
      : daysSince === 1
      ? '1 day'
      : `${daysSince} days`;

    const message: ExPoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title: 'Relationship Alert',
      body: `${contactName} is drifting — it's been ${daysText}. Say something?`,
      data: {
        type: 'relationship_drifting',
        contact_id: contactId,
        deeplink: `/contact/${contactId}`,
      },
    };

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Expo push notification error:', error);
      return false;
    }

    const result = await response.json();
    return result.data && result.data.length > 0 && result.data[0].status === 'ok';
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send a generic push notification
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const message: ExPoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Expo push notification error:', error);
      return false;
    }

    const result = await response.json();
    return result.data && result.data.length > 0 && result.data[0].status === 'ok';
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

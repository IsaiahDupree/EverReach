import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Registers the device for push notifications and sends the token to the backend
 * @param authToken - User's authentication token
 * @returns The Expo push token or null if registration failed
 */
export async function registerForPushNotifications(authToken: string): Promise<string | null> {
  try {
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.log('[Notifications] Push notifications only work on physical devices');
      return null;
    }

    // Get current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Check if permission was granted
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Push notification permission denied');
      return null;
    }

    console.log('[Notifications] Permission granted, getting push token...');

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;

    console.log('[Notifications] Got Expo push token:', token.substring(0, 20) + '...');

    // Send token to backend
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
    const response = await fetch(`${apiUrl}/api/v1/me/push-tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      console.error('[Notifications] Failed to register token with backend:', response.status);
      return null;
    }

    console.log('[Notifications] Successfully registered push token with backend');
    return token;
  } catch (error) {
    console.error('[Notifications] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Unregisters a push token from the backend
 * @param token - The push token to unregister
 * @param authToken - User's authentication token
 */
export async function unregisterPushToken(token: string, authToken: string): Promise<boolean> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
    const response = await fetch(`${apiUrl}/api/v1/me/push-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Notifications] Failed to unregister token:', response.status);
      return false;
    }

    console.log('[Notifications] Successfully unregistered push token');
    return true;
  } catch (error) {
    console.error('[Notifications] Error unregistering push token:', error);
    return false;
  }
}

/**
 * Configure how notifications are handled
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

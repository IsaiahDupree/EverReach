import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Hook to manage push notification registration and handling
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications();

    // Listen for notifications while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Cleanup
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, [user]);

  async function registerForPushNotifications() {
    try {
      // Only works on physical devices
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Permission not granted for push notifications');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id'
      });

      const token = tokenData.data;
      setExpoPushToken(token);

      // Register token with backend
      await apiFetch('/v1/push-tokens', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          push_token: token,
          platform: Platform.OS as 'ios' | 'android',
          device_name: `${Platform.OS} ${Device.modelName || 'Device'}`
        })
      });

      console.log('✅ Push token registered:', token.slice(0, 20) + '...');

      // Configure notification behavior
      await Notifications.setNotificationChannelAsync('warmth-alerts', {
        name: 'Warmth Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });

      return token;
    } catch (error: any) {
      console.error('Failed to register push notifications:', error);
      setError(error.message);
      return null;
    }
  }

  async function unregisterPushNotifications() {
    if (!expoPushToken) return;

    try {
      await apiFetch(`/v1/push-tokens?token=${encodeURIComponent(expoPushToken)}`, {
        method: 'DELETE',
        requireAuth: true
      });

      setExpoPushToken(null);
      console.log('✅ Push token unregistered');
    } catch (error: any) {
      console.error('Failed to unregister push token:', error);
      setError(error.message);
    }
  }

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
    unregisterPushNotifications
  };
}

/**
 * Configure notification handler (call in app root)
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

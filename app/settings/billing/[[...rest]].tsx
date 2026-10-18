import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function SettingsBillingRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ state?: string; rest?: string[] }>() as any;
  const screenAnalytics = useAnalytics('SettingsBillingRedirect');

  useEffect(() => {
    let state: string | undefined = params?.state as string | undefined;
    const rest = params?.rest as string[] | undefined;
    if (!state && Array.isArray(rest) && rest.length > 0) {
      const seg = rest[0];
      if (typeof seg === 'string' && seg.startsWith('state=')) {
        state = seg.split('=')[1];
      }
    }

    if (state === 'cancel') {
      screenAnalytics.track('subscription_checkout_cancelled', {
        payment_platform: 'stripe',
        source: 'settings_billing_redirect',
      });
      router.replace('/subscription-plans' as any);
      return;
    }

    router.replace('/subscription-plans' as any);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}

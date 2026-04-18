import React, { useEffect, useState } from 'react';
import { View, Text, Platform, ActivityIndicator } from 'react-native';
import analytics from '@/lib/analytics';

interface RemoteConfig {
  provider: 'superwall';
  paywall_id: string;
  platform: 'ios' | 'android' | 'web';
  updated_at: string;
}

interface SuperwallPaywallUIProps {
  remoteConfig: RemoteConfig;
  onPurchaseComplete?: () => void;
  onDismiss?: () => void;
}

export default function SuperwallPaywallUI({
  remoteConfig,
  onPurchaseComplete,
  onDismiss,
}: SuperwallPaywallUIProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const loadSuperwall = async () => {
      try {
        // Dynamically import Superwall SDK - only on native platforms
        let Superwall;
        try {
          // Try to import the native Superwall SDK
          const module = await import('@superwall/react-native-superwall');
          Superwall = module.default;
        } catch {
          // If import fails, Superwall might not be available (e.g., in Expo Go)
          throw new Error('Superwall SDK not available. Requires a custom dev build.');
        }

        if (!Superwall || !Superwall.shared) {
          throw new Error('Superwall SDK failed to initialize');
        }

        // Track paywall display
        analytics.track('superwall_paywall_displayed', {
          placement: remoteConfig.paywall_id,
          platform: Platform.OS,
        });

        // Setup delegates for purchase/dismissal events
        if (Superwall.shared.delegate) {
          Superwall.shared.delegate.didPurchase = () => {
            if (onPurchaseComplete) {
              onPurchaseComplete();
            }
            analytics.track('superwall_purchase_success', {
              placement: remoteConfig.paywall_id,
            });
          };

          Superwall.shared.delegate.paywallWillDismiss = () => {
            if (onDismiss) {
              onDismiss();
            }
            analytics.track('superwall_paywall_dismissed', {
              placement: remoteConfig.paywall_id,
            });
          };
        }

        // Register the paywall placement
        await Superwall.shared.register(remoteConfig.paywall_id);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Superwall:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load Superwall paywall'
        );
        setIsLoading(false);
      }
    };

    loadSuperwall();
  }, [remoteConfig.paywall_id, onPurchaseComplete, onDismiss]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ padding: 16 }}>
        <Text>Superwall is not supported on web platform.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading Superwall paywall...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Failed to load Superwall paywall
        </Text>
        <Text style={{ color: '#666', marginBottom: 16 }}>{error}</Text>
        <Text style={{ fontSize: 12, color: '#999' }}>
          Note: Superwall requires a custom dev build. Make sure you&apos;ve built the app with expo-superwall configured.
        </Text>
      </View>
    );
  }

  // Superwall handles the actual paywall UI rendering natively
  return <View style={{ flex: 1 }} />;
}

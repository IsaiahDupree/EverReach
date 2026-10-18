import React from 'react';
import { View, Text, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Paywall, { type PaywallPlan } from '@/components/paywall/Paywall';
import RevenueCatPaywallUI from '@/components/paywall/RevenueCatPaywallUI';
import SuperwallPaywallNew from '@/components/paywall/SuperwallPaywallNew';
import { useLivePaywall } from '@/hooks/useLivePaywall';
import { useSubscription } from '@/providers/SubscriptionProvider';
import analytics from '@/lib/analytics';
import { safeGoBack } from '@/lib/navigation';

interface PaywallRouterProps {
  plans: PaywallPlan[];
  entitlements?: any;
  isLoading?: boolean;
  isRestoring?: boolean;
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  onRestore?: () => void;
}

export function PaywallRouter(props: PaywallRouterProps) {
  const { config, loading, error } = useLivePaywall();
  const { isPaid, refreshEntitlements, restorePurchases } = useSubscription();
  const router = useRouter();
  
  // CRITICAL: All hooks must be at the top before any conditional returns
  const [isPurchasing, setIsPurchasing] = React.useState(false);

  // If user is already paid, don't show Superwall paywall on iOS
  // (Allow custom paywall to show upgrade options)
  if (Platform.OS === 'ios' && isPaid) {
    // console.log('[PaywallRouter] User is paid - skipping Superwall, showing custom paywall for upgrades');
    return <Paywall {...props} />;
  }

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading paywall configuration…</Text>
      </View>
    );
  }

  // Fallback to current Paywall if anything is off
  if (error || !config) {
    if (error) {
      analytics.track('paywall_provider_fallback', {
        reason: 'hook_error',
        error,
        platform: Platform.OS,
      });
    }
    return <Paywall {...props} />;
  }

  // ALWAYS use Superwall on iOS (override backend config)
  if (Platform.OS === 'ios') {
    const placementName = 'main_pay_wall';
    // console.log('[PaywallRouter] Using Superwall provider on iOS, placement:', placementName);

    if (isPurchasing) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 20, fontSize: 16, fontWeight: '600' }}>Verifying your subscription...</Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: '#666' }}>This may take a few seconds.</Text>
        </View>
      );
    }

    return (
      <SuperwallPaywallNew
        placementId={placementName}
        // autoShow defaults to true, but component prevents multiple shows per mount
        onPurchaseComplete={async () => {
          console.log('[PaywallRouter] onPurchaseComplete called - verifying subscription');
          setIsPurchasing(true);

          try {
            // CRITICAL: Refresh subscription state from backend (force sync)
            // This now polls the backend for up to 5 seconds to handle webhook latency
            const success = await restorePurchases();
            
            console.log('[PaywallRouter] Restore result:', success);

            if (!success) {
              // Fallback to simple refresh if restore fails
              await refreshEntitlements();
            }

            // Re-fetch entitlements to check if user is now paid
            await refreshEntitlements();
            
            // Wait a moment for state to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Note: isPaid from useSubscription will update after refreshEntitlements
            // For now, we'll check if restore returned a paid status
            if (success) {
              console.log('[PaywallRouter] ✅ Purchase verified - showing success message');
              props.onSelectPlan?.('superwall_purchase');
              
              Alert.alert(
                '🎉 Welcome to Pro!',
                'Your subscription is now active. Enjoy all premium features!',
                [{ text: 'Get Started', onPress: () => router.back() }]
              );
            } else {
              console.log('[PaywallRouter] ⚠️ Purchase not verified - no paid subscription found');
              // Don't show success message if subscription isn't active
              router.back();
            }
          } catch (error) {
            console.error('[PaywallRouter] ❌ Failed to refresh entitlements:', error);
            // Only show error if we're confident there was a purchase attempt
            router.back();
          } finally {
            setIsPurchasing(false);
          }
        }}
        onDismiss={() => {
          // console.log('[PaywallRouter] Paywall dismissed - navigating back');
          safeGoBack(router);
        }}
      />
    );
  }

  // Route by provider
  switch (config.provider) {
    case 'custom':
      return <Paywall {...props} />;

    case 'revenuecat': {
      // RevenueCat using core SDK (fetches offerings and uses custom UI)
      if (Platform.OS === 'web') {
        analytics.track('paywall_provider_fallback', {
          reason: 'unsupported_platform',
          provider: 'revenuecat',
          platform: 'web',
        });
        return <Paywall {...props} />;
      }

      console.log('[PaywallRouter] Using RevenueCat provider, offering:', config.paywall_id);
      return (
        <RevenueCatPaywallUI
          remoteConfig={config}
          entitlements={props.entitlements}
          isRestoring={props.isRestoring}
          currentPlanId={props.currentPlanId}
          onPurchaseComplete={() => {
            console.log('[PaywallRouter] Purchase completed');
          }}
          onRestoreComplete={() => {
            console.log('[PaywallRouter] Restore completed');
          }}
          onSelectPlan={(planId) => {
            console.log('[PaywallRouter] Plan selected:', planId);
            props.onSelectPlan?.(planId);
          }}
          onRestore={() => {
            console.log('[PaywallRouter] Restore triggered');
            props.onRestore?.();
          }}
          onDismiss={() => {
            console.log('[PaywallRouter] Paywall dismissed');
          }}
        />
      );
    }

    case 'superwall': {
      // Superwall requires custom dev build (not Expo Go)
      if (Platform.OS === 'web') {
        analytics.track('paywall_provider_fallback', {
          reason: 'unsupported_platform',
          provider: 'superwall',
          platform: 'web',
        });
        return <Paywall {...props} />;
      }

      // Use SuperwallPaywallNew component with modern hooks API
      // Use placement name from config, or default to "main_pay_wall"
      const placementName = config.paywall_id || 'main_pay_wall';
      console.log('[PaywallRouter] Using Superwall provider, placement:', placementName);
      return (
        <SuperwallPaywallNew
          placementId={placementName}
          autoShow={true} // Enable auto-show when this component renders
          onPurchaseComplete={async () => {
            console.log('[PaywallRouter] Purchase completed - refreshing entitlements');

            try {
              // CRITICAL: Refresh subscription state from backend
              await refreshEntitlements();

              console.log('[PaywallRouter] ✅ Entitlements refreshed');
              props.onSelectPlan?.('superwall_purchase');

              // Show success message
              Alert.alert(
                '🎉 Welcome to Pro!',
                'Your subscription is now active. Enjoy all premium features!',
                [{ text: 'Get Started', onPress: () => safeGoBack(router) }]
              );
            } catch (error) {
              console.error('[PaywallRouter] ❌ Failed to refresh entitlements:', error);
              Alert.alert(
                'Subscription Active',
                'Your purchase was successful! Please restart the app to see your new features.',
                [{ text: 'OK', onPress: () => safeGoBack(router) }]
              );
            }
          }}
          onDismiss={() => {
            console.log('[PaywallRouter] Paywall dismissed - navigating back');
            safeGoBack(router);
          }}
        />
      );
    }

    default:
      analytics.track('paywall_provider_fallback', {
        reason: 'unknown_provider',
        provider: (config as any)?.provider,
        platform: Platform.OS,
      });
      return <Paywall {...props} />;
  }
}

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import Paywall, { type PaywallPlan } from '@/components/paywall/Paywall';
import type { LivePaywallConfig } from '@/hooks/useLivePaywall';
import analytics from '@/lib/analytics';

interface RevenueCatPaywallProps {
  remoteConfig: LivePaywallConfig;
  entitlements?: any;
  isLoading?: boolean;
  isRestoring?: boolean;
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  onRestore?: () => void;
}

/**
 * RevenueCatPaywall - Maps RevenueCat offerings to PaywallPlan format
 * 
 * Flow:
 * 1. Fetch RevenueCat offerings using paywallId from remote config
 * 2. Map packages → PaywallPlan format (our Paywall component format)
 * 3. Pass to existing Paywall component for rendering
 * 4. onSelectPlan receives package identifier, purchase via RevenueCat
 */
export function RevenueCatPaywall(props: RevenueCatPaywallProps) {
  const { remoteConfig, onSelectPlan, ...restProps } = props;
  const [offerings, setOfferings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setError('RevenueCat is not supported on web');
      setLoading(false);
      return;
    }

    loadOfferings();
  }, [remoteConfig.paywall_id]);

  const loadOfferings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Dynamically import RevenueCat (native module)
      const Purchases = await import('react-native-purchases').then(m => m.default);
      
      console.log('[RevenueCatPaywall] Fetching offerings...');
      const offerings = await Purchases.getOfferings();
      
      console.log('[RevenueCatPaywall] Available offerings:', Object.keys(offerings.all || {}));
      console.log('[RevenueCatPaywall] Current offering:', offerings.current?.identifier);
      console.log('[RevenueCatPaywall] Target paywall_id:', remoteConfig.paywall_id);

      setOfferings(offerings);
      
      analytics.track('revenuecat_offerings_loaded', {
        offering_count: Object.keys(offerings.all || {}).length,
        current_offering: offerings.current?.identifier,
        target_offering: remoteConfig.paywall_id,
      });
      
    } catch (e: any) {
      console.error('[RevenueCatPaywall] Failed to load offerings:', e);
      setError(e?.message || 'Failed to load offerings');
      
      analytics.track('revenuecat_offerings_failed', {
        error: e?.message || 'Unknown error',
        paywall_id: remoteConfig.paywall_id,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || props.isLoading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, fontSize: 14, color: '#6B7280' }}>
          Loading RevenueCat offerings...
        </Text>
      </View>
    );
  }

  if (error) {
    console.error('[RevenueCatPaywall] Error state:', error);
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#DC2626', marginBottom: 8, fontWeight: '600' }}>
          Unable to Load Offerings
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!offerings) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          No offerings available
        </Text>
      </View>
    );
  }

  // Find the target offering by paywall_id
  const targetOffering = 
    offerings.all?.[remoteConfig.paywall_id] || 
    offerings.current;

  if (!targetOffering || !targetOffering.availablePackages?.length) {
    console.warn('[RevenueCatPaywall] No packages in offering:', remoteConfig.paywall_id);
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          No subscription packages available for offering: {remoteConfig.paywall_id}
        </Text>
      </View>
    );
  }

  console.log('[RevenueCatPaywall] Using offering:', targetOffering.identifier);
  console.log('[RevenueCatPaywall] Packages:', targetOffering.availablePackages.length);

  // Map RevenueCat packages to PaywallPlan format
  const plans: PaywallPlan[] = targetOffering.availablePackages.map((pkg: any) => {
    const product = pkg.product;
    
    // Determine if this is the popular/recommended plan
    const isMonthly = pkg.packageType === 'MONTHLY' || pkg.identifier?.includes('monthly');
    
    return {
      id: pkg.identifier,
      name: product.title || pkg.identifier,
      price: product.priceString,
      description: product.description || `${pkg.packageType} subscription`,
      isPopular: isMonthly, // Mark monthly as popular
      isAvailable: true,
      features: [
        { name: 'All premium features', included: true },
        { name: 'Voice notes', included: true },
        { name: 'Screenshot-to-reply', included: true },
        { name: 'AI-powered messaging', included: true },
        { name: 'Unlimited contacts', included: true },
        { name: 'Advanced analytics', included: true },
      ],
    };
  });

  console.log('[RevenueCatPaywall] Mapped plans:', plans.map(p => ({ id: p.id, name: p.name, price: p.price })));

  // Wrap onSelectPlan to handle RevenueCat purchase flow
  const handleSelectPlan = async (planId: string) => {
    console.log('[RevenueCatPaywall] Plan selected:', planId);
    
    analytics.track('revenuecat_plan_selected', {
      plan_id: planId,
      offering_id: targetOffering.identifier,
      platform: Platform.OS,
    });

    try {
      // Find the package
      const pkg = targetOffering.availablePackages.find((p: any) => p.identifier === planId);
      if (!pkg) {
        throw new Error('Package not found');
      }

      console.log('[RevenueCatPaywall] Purchasing package:', pkg.identifier);
      
      // Dynamically import RevenueCat
      const Purchases = await import('react-native-purchases').then(m => m.default);
      
      // Purchase the package
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      console.log('[RevenueCatPaywall] Purchase successful');
      console.log('[RevenueCatPaywall] Entitlements:', Object.keys(customerInfo.entitlements.active));
      
      analytics.track('revenuecat_purchase_success', {
        plan_id: planId,
        offering_id: targetOffering.identifier,
        platform: Platform.OS,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // Call the original onSelectPlan (triggers app-level refresh)
      onSelectPlan(planId);
      
    } catch (e: any) {
      // User cancelled or error
      if (!e.userCancelled) {
        console.error('[RevenueCatPaywall] Purchase failed:', e);
        analytics.track('revenuecat_purchase_failed', {
          plan_id: planId,
          error: e?.message || 'Unknown error',
          platform: Platform.OS,
        });
      } else {
        console.log('[RevenueCatPaywall] User cancelled purchase');
        analytics.track('revenuecat_purchase_cancelled', {
          plan_id: planId,
          platform: Platform.OS,
        });
      }
    }
  };

  // Render using existing Paywall UI with mapped plans
  return (
    <Paywall
      {...restProps}
      plans={plans}
      onSelectPlan={handleSelectPlan}
    />
  );
}

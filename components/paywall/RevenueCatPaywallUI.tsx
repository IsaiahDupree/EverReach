import React, { useState, useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, Alert, Button, StyleSheet } from 'react-native';
import type { LivePaywallConfig } from '@/hooks/useLivePaywall';
import Paywall, { type PaywallPlan } from '@/components/paywall/Paywall';
import analytics from '@/lib/analytics';

interface RevenueCatPaywallUIProps {
  remoteConfig: LivePaywallConfig;
  onPurchaseComplete?: () => void;
  onRestoreComplete?: () => void;
  onDismiss?: () => void;
  // Pass through props for Paywall component
  entitlements?: any;
  isRestoring?: boolean;
  currentPlanId?: string;
  onSelectPlan?: (planId: string) => void;
  onRestore?: () => void;
}

/**
 * RevenueCatPaywallUI - Fetches RevenueCat offerings and displays using custom Paywall UI
 * 
 * Uses the core react-native-purchases SDK to fetch offerings and maps them
 * to our existing Paywall component. This works without the UI package.
 * 
 * IMPORTANT: Requires Purchases SDK initialization in your app root with:
 * - Purchases.configure({ apiKey: 'your_key' })
 */
export default function RevenueCatPaywallUI({ 
  remoteConfig, 
  onPurchaseComplete,
  onRestoreComplete,
  onDismiss,
  entitlements,
  isRestoring,
  currentPlanId,
  onSelectPlan,
  onRestore,
}: RevenueCatPaywallUIProps) {
  // Early return for web BEFORE any hooks
  if (Platform.OS === 'web') {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#DC2626', marginBottom: 8 }}>
          RevenueCat Paywalls Not Supported on Web
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          Please use the mobile app to access premium features.
        </Text>
      </View>
    );
  }

  const [Purchases, setPurchases] = useState<any>(null);
  const [plans, setPlans] = useState<PaywallPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load RevenueCat SDK
  useEffect(() => {

    // Dynamically import RevenueCat core SDK (native only)
    import('react-native-purchases')
      .then(module => {
        setPurchases(module.default || module);
        console.log('[RevenueCatPaywallUI] Core SDK loaded');
      })
      .catch(error => {
        console.error('[RevenueCatPaywallUI] Failed to load SDK:', error);
        setError('Failed to load RevenueCat SDK');
        setIsLoading(false);
      });
  }, []);

  // Fetch offerings when SDK is ready
  useEffect(() => {
    if (!Purchases) return;

    const fetchOfferings = async () => {
      try {
        console.log('[RevenueCatPaywallUI] Fetching offerings for:', remoteConfig.paywall_id);
        
        const offerings = await Purchases.getOfferings();
        
        // Use the offering ID from backend config
        const targetOffering = offerings.all[remoteConfig.paywall_id] || offerings.current;
        
        if (!targetOffering) {
          throw new Error(`No offering found for ID: ${remoteConfig.paywall_id}`);
        }

        console.log('[RevenueCatPaywallUI] Found offering:', targetOffering.identifier);
        
        // Map RevenueCat packages to Paywall plans
        const mappedPlans: PaywallPlan[] = targetOffering.availablePackages.map((pkg: any) => ({
          id: pkg.identifier,
          name: pkg.product.title,
          price: pkg.product.priceString,
          interval: getIntervalFromPackageType(pkg.packageType),
          features: pkg.product.description ? [pkg.product.description] : [],
          isPopular: pkg.packageType === Purchases.PACKAGE_TYPE.ANNUAL,
          // Store the package for purchase
          _rcPackage: pkg,
        }));

        setPlans(mappedPlans);
        setIsLoading(false);

        analytics.track('revenuecat_offering_loaded', {
          offering_id: targetOffering.identifier,
          package_count: mappedPlans.length,
          platform: Platform.OS,
        });
      } catch (err: any) {
        // Check if this is the "no products" error
        const isProductConfigError = err?.message?.includes('products registered') || 
                                     err?.message?.includes('App Store Connect') ||
                                     err?.message?.includes('StoreKit Configuration');
        
        const errorMsg = err?.message || 'Failed to load offerings';
        
        // CRITICAL ERROR - Show alert
        console.error('🚨 [CRITICAL REVENUECAT ERROR] 🚨', err);
        
        Alert.alert(
          '🚨 RevenueCat Critical Error',
          isProductConfigError 
            ? `REVENUE AT RISK!\n\nNo App Store products configured!\n\nYour app depends on RevenueCat. Users cannot purchase until this is fixed.\n\nError: ${errorMsg}`
            : `Critical error loading RevenueCat offerings!\n\n${errorMsg}\n\nUsers cannot upgrade!`,
          [
            { text: 'Dismiss', style: 'destructive' }
          ]
        );
        
        if (isProductConfigError) {
          setError('CRITICAL: No App Store products configured! Users cannot purchase. See CUSTOM_BUILD_SETUP_AND_FIXES.md');
        } else {
          setError(errorMsg);
        }
        
        setIsLoading(false);

        analytics.track('revenuecat_offering_error', {
          error: errorMsg,
          is_product_config_error: isProductConfigError,
          severity: 'critical',
          platform: Platform.OS,
        });
      }
    };

    fetchOfferings();
  }, [Purchases, remoteConfig.paywall_id]);

  // Handle plan selection (purchase)
  const handleSelectPlan = async (planId: string) => {
    if (!Purchases) {
      console.error('[RevenueCatPaywallUI] Purchases SDK not loaded');
      return;
    }

    // Find the package to purchase
    const plan = plans.find(p => p.id === planId);
    if (!plan || !(plan as any)._rcPackage) {
      console.error('[RevenueCatPaywallUI] Plan not found:', planId);
      return;
    }

    try {
      console.log('[RevenueCatPaywallUI] Purchasing package:', planId);
      
      analytics.track('revenuecat_purchase_started', {
        plan_id: planId,
        offering_id: remoteConfig.paywall_id,
      });

      const { customerInfo } = await Purchases.purchasePackage((plan as any)._rcPackage);
      
      console.log('[RevenueCatPaywallUI] Purchase successful');
      
      analytics.track('revenuecat_purchase_success', {
        plan_id: planId,
        offering_id: remoteConfig.paywall_id,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      onPurchaseComplete?.();
      onSelectPlan?.(planId);
    } catch (err: any) {
      if (!err.userCancelled) {
        console.error('[RevenueCatPaywallUI] Purchase failed:', err);
        
        analytics.track('revenuecat_purchase_error', {
          plan_id: planId,
          error: err.message,
          code: err.code,
        });
      } else {
        console.log('[RevenueCatPaywallUI] Purchase cancelled by user');
        analytics.track('revenuecat_purchase_cancelled', {
          plan_id: planId,
        });
      }
    }
  };

  // Handle restore purchases
  const handleRestore = async () => {
    if (!Purchases) return;

    try {
      console.log('[RevenueCatPaywallUI] Restoring purchases');
      
      analytics.track('revenuecat_restore_started', {
        offering_id: remoteConfig.paywall_id,
      });

      const customerInfo = await Purchases.restorePurchases();
      
      console.log('[RevenueCatPaywallUI] Restore successful');
      
      analytics.track('revenuecat_restore_success', {
        offering_id: remoteConfig.paywall_id,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      onRestoreComplete?.();
      onRestore?.();
    } catch (err: any) {
      console.error('[RevenueCatPaywallUI] Restore failed:', err);
      
      analytics.track('revenuecat_restore_error', {
        error: err.message,
        offering_id: remoteConfig.paywall_id,
      });
    }
  };

  // Loading state (AFTER all hooks)
  if (isLoading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>
          Loading subscription plans...
        </Text>
      </View>
    );
  }

  // Error state - CRITICAL ERROR
  if (error) {
    const isProductConfigError = error.includes('App Store products') || error.includes('CRITICAL');
    
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: '#FEE2E2', justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#DC2626', textAlign: 'center', marginBottom: 12 }}>
          🚨 CRITICAL: RevenueCat Failed
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#DC2626', textAlign: 'center', marginBottom: 20 }}>
          {isProductConfigError ? 'Revenue System Down!' : 'Failed to Load Plans'}
        </Text>
        
        <View style={{
          backgroundColor: '#DC2626',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
            ⚠️ {isProductConfigError ? 'REVENUE AT RISK' : 'USERS CANNOT UPGRADE'} ⚠️
          </Text>
          <Text style={{ color: '#FFF', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {isProductConfigError 
              ? 'App Store products must be configured immediately!'
              : 'RevenueCat system is not working!'}
          </Text>
        </View>
        
        <Text style={{ fontSize: 14, color: '#374151', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
          {error}
        </Text>
        
        {isProductConfigError && (
          <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E', marginBottom: 8 }}>
              Required Actions:
            </Text>
            <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 18 }}>
              1. Create products in App Store Connect{'\n'}
              2. Link products in RevenueCat dashboard{'\n'}
              3. Wait 2-4 hours for sync{'\n'}
              4. Test with sandbox account
            </Text>
          </View>
        )}
        
        <Button 
          title="📖 View Setup Guide" 
          onPress={() => {
            Alert.alert(
              'RevenueCat Setup Required',
              'See CUSTOM_BUILD_SETUP_AND_FIXES.md or REVENUECAT_ERROR_FIX.md for complete setup instructions.',
              [{ text: 'OK' }]
            );
          }}
          color="#DC2626"
        />
      </View>
    );
  }

  // Success - render with our custom Paywall component
  return (
    <Paywall
      plans={plans}
      entitlements={entitlements}
      isLoading={false}
      isRestoring={isRestoring}
      currentPlanId={currentPlanId}
      onSelectPlan={handleSelectPlan}
      onRestore={handleRestore}
    />
  );
}

// Helper function to map RevenueCat package types to intervals
function getIntervalFromPackageType(packageType: string): 'month' | 'year' | 'lifetime' {
  // RevenueCat package types: ANNUAL, SIX_MONTH, THREE_MONTH, TWO_MONTH, MONTHLY, WEEKLY, LIFETIME, etc.
  if (packageType.includes('ANNUAL') || packageType.includes('YEAR')) {
    return 'year';
  }
  if (packageType.includes('LIFETIME')) {
    return 'lifetime';
  }
  // Default to month for all other types
  return 'month';
}

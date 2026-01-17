/**
 * Test Paywall Screen
 * 
 * Allows testing different paywall providers directly from settings
 * Useful for verifying RevenueCat and Superwall integrations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Paywall from '@/components/paywall/Paywall';
import RevenueCatPaywallUI from '@/components/paywall/RevenueCatPaywallUI';
import SuperwallPaywallNew from '@/components/paywall/SuperwallPaywallNew';

export default function TestPaywallScreen() {
  const params = useLocalSearchParams();
  const provider = (params.provider as string) || 'custom';
  
  console.log('[TestPaywall] Screen loaded');
  console.log('[TestPaywall] Provider:', provider);
  console.log('[TestPaywall] Testing placement:', provider === 'superwall' ? 'main_pay_wall' : provider === 'superwall2' ? 'intro_paywall' : 'N/A');

  // Create a test config for the paywall components
  const testConfig = {
    provider: provider as 'custom' | 'revenuecat' | 'superwall' | 'superwall2',
    paywall_id: provider === 'superwall' || provider === 'superwall2' ? 'default' : 
                provider === 'revenuecat' ? 'default' : 
                'everreach_basic_paywall',
    platform: Platform.OS as 'ios' | 'android' | 'web',
    configuration: {},
    updated_at: new Date().toISOString(),
  };

  const handlePurchaseComplete = () => {
    console.log('[TestPaywall] Purchase completed');
    router.back();
  };

  const handleDismiss = () => {
    console.log('[TestPaywall] Dismissed');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Test Paywall</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Provider Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Testing Provider:</Text>
        <Text style={styles.infoProvider}>
          {provider === 'custom' && '🎨 Custom Stripe'}
          {provider === 'revenuecat' && '💳 RevenueCat'}
          {provider === 'superwall' && '🚀 Superwall (main_pay_wall)'}
          {provider === 'superwall2' && '🎯 Superwall #2 (intro_paywall)'}
        </Text>
        {provider !== 'custom' && Platform.OS === 'web' && (
          <Text style={styles.warning}>
            ⚠️ {provider === 'revenuecat' ? 'RevenueCat' : 'Superwall'} requires a native app (iOS/Android).
            This will not work on web.
          </Text>
        )}
        {provider !== 'custom' && (
          <Text style={styles.info}>
            💡 Requires custom dev build (not Expo Go)
          </Text>
        )}
      </View>

      {/* Paywall Content */}
      <ScrollView style={styles.paywallContainer}>
        {provider === 'custom' && (
          <Paywall
            plans={[
              {
                id: 'monthly',
                name: 'Monthly',
                price: '$9.99',
                description: 'Per month',
                features: [
                  { name: 'All Premium Features', included: true },
                  { name: 'Unlimited Voice Notes', included: true },
                  { name: 'AI Chat Assistant', included: true },
                ],
              },
              {
                id: 'annual',
                name: 'Annual',
                price: '$99.99',
                description: 'Per year - Save $20!',
                features: [
                  { name: 'All Premium Features', included: true },
                  { name: 'Unlimited Voice Notes', included: true },
                  { name: 'AI Chat Assistant', included: true },
                  { name: '2 Months Free!', included: true },
                ],
                isPopular: true,
              },
            ]}
            onSelectPlan={(planId) => console.log('[TestPaywall] Selected:', planId)}
            currentPlanId={undefined}
            isRestoring={false}
          />
        )}

        {provider === 'revenuecat' && (
          <RevenueCatPaywallUI
            remoteConfig={testConfig}
            onPurchaseComplete={handlePurchaseComplete}
            onRestoreComplete={handlePurchaseComplete}
            onDismiss={handleDismiss}
          />
        )}

        {provider === 'superwall' && (
          <SuperwallPaywallNew
            placementId="main_pay_wall"
            autoShow={true}
            forceShow={true} // Force show for testing, even if user is subscribed
            onPurchaseComplete={handlePurchaseComplete}
            onDismiss={handleDismiss}
          />
        )}

        {provider === 'superwall2' && (
          <SuperwallPaywallNew
            placementId="intro_paywall"
            autoShow={true}
            forceShow={true} // Force show for testing, even if user is subscribed
            onPurchaseComplete={handlePurchaseComplete}
            onDismiss={handleDismiss}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  infoProvider: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  warning: {
    fontSize: 14,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
  },
  paywallContainer: {
    flex: 1,
  },
});

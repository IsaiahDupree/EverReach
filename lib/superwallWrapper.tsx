import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SuperwallProvider, SuperwallLoading, SuperwallLoaded, CustomPurchaseControllerProvider } from 'expo-superwall';
import Purchases from 'react-native-purchases';

export function SuperwallWrapper({ children }: { children: React.ReactNode }) {
  return (
    <CustomPurchaseControllerProvider
      controller={{
        onPurchase: async (params) => {
          try {
            console.log('[Superwall] Purchase initiated for:', params.productId);
            const products = await Purchases.getProducts([params.productId]);
            if (!products || products.length === 0) {
              console.error('[Superwall] No products found for:', params.productId);
              throw new Error('Product not found');
            }
            console.log('[Superwall] Product found, purchasing:', products[0].identifier);
            const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
            console.log('[Superwall] Purchase completed, active entitlements:', Object.keys(customerInfo?.entitlements?.active || {}));
          } catch (error) {
            console.error('[Superwall] Purchase failed:', error);
            throw error;
          }
        },
        onPurchaseRestore: async () => {
          try {
            console.log('[Superwall] Restore initiated');
            const customerInfo = await Purchases.restorePurchases();
            console.log('[Superwall] Purchases restored, active entitlements:', Object.keys(customerInfo?.entitlements?.active || {}));
          } catch (error) {
            console.error('[Superwall] Restore failed:', error);
            throw error;
          }
        },
      }}
    >
      <SuperwallProvider
        apiKeys={{
          ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '',
          android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY || ''
        }}
      >
        <SuperwallLoading>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Superwall...</Text>
          </View>
        </SuperwallLoading>
        <SuperwallLoaded>
          {children}
        </SuperwallLoaded>
      </SuperwallProvider>
    </CustomPurchaseControllerProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

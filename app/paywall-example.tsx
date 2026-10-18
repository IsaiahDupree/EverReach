/**
 * Paywall Example with Full Analytics Integration
 * 
 * This example shows how to integrate comprehensive paywall analytics
 * tracking with your paywall UI.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { usePaywallAnalytics, ProductInfo } from '@/hooks/usePaywallAnalytics';
import { useTracking } from '@/providers/TrackingProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { Zap, Check, X } from 'lucide-react-native';

// Define your products
const PRODUCTS: ProductInfo[] = [
  {
    id: 'pro_monthly',
    price: 15,
    currency: 'USD',
    trialLength: 7,
    introOfferType: 'free_trial',
    period: 'month',
  },
  {
    id: 'pro_annual',
    price: 120,
    currency: 'USD',
    period: 'year',
  },
];

export default function PaywallExample() {
  const { upgradeToPaid } = useSubscription();
  const { getExperimentVariant, logExperimentExposure } = useTracking();
  
  const [variant, setVariant] = useState<string>('A');
  const [selectedProduct, setSelectedProduct] = useState<string>('pro_monthly');
  const [loading, setLoading] = useState(false);
  
  // Get A/B test variant
  useEffect(() => {
    getExperimentVariant('paywall_copy_test').then(v => {
      setVariant(v);
      logExperimentExposure('paywall_copy_test', v);
    });
  }, []);
  
  // Initialize paywall analytics
  const analytics = usePaywallAnalytics({
    paywallId: 'v3_primary',
    variant,
    experimentKey: 'paywall_copy_test',
    placement: 'manual_test', // Change based on where paywall is shown
    sourceScreen: 'example',
    products: PRODUCTS,
    metadata: {
      appVersion: '1.0.0',
      // Add more context as needed
    },
  });
  
  // Copy variants for A/B testing
  const copy = {
    A: {
      headline: 'Upgrade to EverReach Pro',
      subheadline: 'Get unlimited access to all premium features',
      cta: 'Start 7-Day Free Trial',
    },
    B: {
      headline: 'Never Forget a Connection',
      subheadline: 'Transform how you build and maintain relationships',
      cta: 'Try Free for 7 Days',
    },
  };
  
  const selectedCopy = copy[variant as 'A' | 'B'] || copy.A;
  
  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    analytics.trackPriceTileSelected(productId);
  };
  
  // Handle purchase
  const handlePurchase = async () => {
    setLoading(true);
    analytics.trackPurchaseStarted(selectedProduct);
    
    try {
      // Call your payment provider (Stripe, RevenueCat, etc.)
      await upgradeToPaid('stripe'); // Replace with actual purchase logic
      
      // Track success (client-side - server confirmation comes via webhook)
      analytics.trackPurchaseSucceeded(selectedProduct);
      
      router.back();
    } catch (error: any) {
      analytics.trackPurchaseFailed(selectedProduct, error.message);
      console.error('Purchase failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle restore
  const handleRestore = () => {
    analytics.trackRestoreTapped();
    // Add restore purchases logic
  };
  
  // Handle scroll (track scroll depth)
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollDepth = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
    
    // Track at 25%, 50%, 75%, 100%
    if (scrollDepth > 0 && scrollDepth % 25 < 1) {
      analytics.trackScrollDepth(Math.round(scrollDepth));
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <X size={24} color="#9CA3AF" />
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Zap size={48} color="#FBBF24" />
          </View>
          <Text style={styles.headline}>{selectedCopy.headline}</Text>
          <Text style={styles.subheadline}>{selectedCopy.subheadline}</Text>
        </View>
        
        {/* Product Selection */}
        <View style={styles.productsSection}>
          {PRODUCTS.map(product => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productCard,
                selectedProduct === product.id && styles.productCardSelected,
              ]}
              onPress={() => handleProductSelect(product.id)}
            >
              <View style={styles.productHeader}>
                <Text style={styles.productName}>
                  {product.period === 'year' ? 'Annual' : 'Monthly'}
                </Text>
                {product.period === 'year' && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save 33%</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.productPrice}>
                ${product.price}/{product.period === 'year' ? 'year' : 'mo'}
              </Text>
              
              {product.trialLength && (
                <Text style={styles.trialBadge}>
                  {product.trialLength} days free
                </Text>
              )}
              
              <View style={styles.checkmark}>
                {selectedProduct === product.id && (
                  <Check size={20} color="#3B82F6" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's Included</Text>
          {[
            'Unlimited voice notes',
            'AI message composer',
            'Warmth score tracking',
            'Smart reminders',
            'Priority support',
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Check size={20} color="#10B981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity onPress={() => analytics.trackLegalLinkTapped('terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => analytics.trackLegalLinkTapped('privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Text style={styles.ctaText}>{selectedCopy.cta}</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  productsSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  productCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  productCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  trialBadge: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  legalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  legalLink: {
    fontSize: 14,
    color: '#3B82F6',
  },
  legalSeparator: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  restoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

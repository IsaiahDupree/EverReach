/**
 * Paywall Screen
 * Feature: IOS-NAV-008
 * Help Integration: HO-HELP-003
 *
 * Subscription paywall screen with:
 * - Tier selection display
 * - Purchase flow with loading states
 * - Restore purchases functionality
 * - Error handling
 * - Help button with contextual help overlay
 *
 * @module app/paywall
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Purchases, { PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { SubscriptionTier, SubscriptionTierInfo } from '../types/subscription';
import HelpOverlay from '../components/common/HelpOverlay';
import { HELP_CONTENT } from '../lib/help-content';

/**
 * Subscription tier information for display
 */
const SUBSCRIPTION_TIERS: SubscriptionTierInfo[] = [
  {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    description: 'Perfect for getting started',
    price: '$0',
    period: 'monthly',
    features: [
      'Up to 10 items',
      'Basic features',
      'Community support',
    ],
  },
  {
    tier: SubscriptionTier.BASIC,
    name: 'Basic',
    description: 'For casual users',
    price: '$4.99',
    period: 'monthly',
    features: [
      'Up to 50 items',
      'Standard features',
      'Email support',
      'No ads',
    ],
    productId: 'basic_monthly',
  },
  {
    tier: SubscriptionTier.PRO,
    name: 'Pro',
    description: 'Most popular choice',
    price: '$9.99',
    period: 'monthly',
    features: [
      'Unlimited items',
      'Advanced features',
      'Priority support',
      'Export to CSV',
      'Custom themes',
    ],
    isPopular: true,
    productId: 'pro_monthly',
  },
  {
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    description: 'For power users',
    price: '$19.99',
    period: 'monthly',
    features: [
      'Everything in Pro',
      'API access',
      'White-label options',
      'Dedicated support',
      'Early access to features',
    ],
    productId: 'premium_monthly',
  },
];

/**
 * Paywall Screen Component
 *
 * Displays subscription tiers and handles purchase flow
 */
export default function PaywallScreen() {
  const router = useRouter();

  // UI state
  const [loading, setLoading] = useState(false);
  const [purchasingTier, setPurchasingTier] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState('');
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // RevenueCat offerings
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  /**
   * Load RevenueCat offerings on mount
   */
  useEffect(() => {
    const loadOfferings = async () => {
      try {
        setLoadingOfferings(true);
        const customerInfo = await Purchases.getOfferings();
        setOfferings(customerInfo);
      } catch (err) {
        console.error('Failed to load offerings:', err);
        setError('Failed to load subscription options. Please try again.');
      } finally {
        setLoadingOfferings(false);
      }
    };

    loadOfferings();
  }, []);

  /**
   * Handle tier purchase using RevenueCat SDK
   */
  const handlePurchase = async (tier: SubscriptionTierInfo) => {
    // Clear previous errors
    setError('');

    // Free tier doesn't require purchase
    if (tier.tier === SubscriptionTier.FREE) {
      Alert.alert('Free Tier', 'You are already on the free tier!');
      return;
    }

    // Check if product ID exists
    if (!tier.productId) {
      setError('This tier is not available for purchase');
      return;
    }

    setPurchasingTier(tier.tier);
    setLoading(true);

    try {
      // Get the package from offerings
      const currentOffering = offerings?.current;
      if (!currentOffering) {
        throw new Error('No offerings available');
      }

      // Find the package matching the product ID
      const packageToPurchase = currentOffering.availablePackages.find(
        (pkg: PurchasesPackage) => pkg.product.identifier === tier.productId
      );

      if (!packageToPurchase) {
        throw new Error(`Package not found for ${tier.productId}`);
      }

      // Purchase the package using RevenueCat SDK
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      // Check if the entitlement is active
      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasActiveEntitlement) {
        // Show success message
        Alert.alert(
          'Purchase Successful',
          `You have successfully subscribed to ${tier.name}!`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error('Subscription not activated');
      }
    } catch (err: any) {
      // Handle user cancellation gracefully
      if (err.userCancelled) {
        // User cancelled, just clear loading state without showing error
        console.log('User cancelled purchase');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
        setError(errorMessage);
        Alert.alert('Purchase Failed', errorMessage);
      }
    } finally {
      setLoading(false);
      setPurchasingTier(null);
    }
  };

  /**
   * Handle restore purchases using RevenueCat SDK
   */
  const handleRestorePurchases = async () => {
    setError('');
    setRestoringPurchases(true);

    try {
      // Call RevenueCat to restore purchases
      const customerInfo = await Purchases.restorePurchases();

      // Check if any entitlements were restored
      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasActiveEntitlement) {
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored successfully!'
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.'
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      setError(errorMessage);
      Alert.alert('Restore Failed', errorMessage);
    } finally {
      setRestoringPurchases(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Select the subscription tier that's right for you
          </Text>

          {/* Help Button */}
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setShowHelp(true)}
            testID="paywall-help-button"
            accessibilityLabel="Get help with subscriptions"
            accessibilityRole="button"
            accessibilityHint="Opens information about subscription tiers and pricing"
          >
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Offerings */}
        {loadingOfferings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading subscription options...</Text>
          </View>
        ) : null}

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Subscription Tiers */}
        <View style={styles.tiersContainer}>
          {SUBSCRIPTION_TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.tier}
              style={[
                styles.tierCard,
                tier.isPopular ? styles.tierCardPopular : null,
              ]}
              onPress={() => handlePurchase(tier)}
              disabled={loading}
            >
              {/* Popular Badge */}
              {tier.isPopular ? (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              ) : null}

              {/* Tier Header */}
              <View style={styles.tierHeader}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierDescription}>{tier.description}</Text>
              </View>

              {/* Pricing */}
              <View style={styles.pricingContainer}>
                <Text style={styles.price}>{tier.price}</Text>
                <Text style={styles.period}>/{tier.period}</Text>
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {tier.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.featureCheckmark}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Purchase Button */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  tier.tier === SubscriptionTier.FREE
                    ? styles.purchaseButtonFree
                    : styles.purchaseButtonPaid,
                  loading && purchasingTier === tier.tier
                    ? styles.purchaseButtonLoading
                    : null,
                ]}
                onPress={() => handlePurchase(tier)}
                disabled={loading}
              >
                {loading && purchasingTier === tier.tier ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {tier.tier === SubscriptionTier.FREE
                      ? 'Current Plan'
                      : `Subscribe to ${tier.name}`}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={restoringPurchases || loading}
        >
          {restoringPurchases ? (
            <View style={styles.restoringContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.restoreButtonText}>Restoring...</Text>
            </View>
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Subscriptions auto-renew unless cancelled 24 hours before the end of
            the current period.
          </Text>
          <Text style={styles.footerText}>
            Manage subscriptions in your App Store settings.
          </Text>
        </View>
      </ScrollView>

      {/* Help Overlay */}
      {showHelp && (
        <HelpOverlay
          id="paywall-help"
          title={HELP_CONTENT.subscription.title}
          dismissText="Got it"
          onDismiss={() => setShowHelp(false)}
        >
          <View style={styles.helpContent}>
            <Text style={styles.helpDescription}>
              {HELP_CONTENT.subscription.description}
            </Text>

            {/* Tiers explanation */}
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Subscription Tiers</Text>
              {HELP_CONTENT.subscription.tiers.map((tier, index) => (
                <View key={index} style={styles.helpItem}>
                  <Text style={styles.helpItemTitle}>{tier.name}</Text>
                  <Text style={styles.helpItemText}>{tier.description}</Text>
                </View>
              ))}
            </View>

            {/* FAQs */}
            <View style={styles.helpSection}>
              <Text style={styles.helpSectionTitle}>Frequently Asked Questions</Text>
              {HELP_CONTENT.subscription.faqs.map((faq, index) => (
                <View key={index} style={styles.helpItem}>
                  <Text style={styles.helpItemTitle}>{faq.question}</Text>
                  <Text style={styles.helpItemText}>{faq.answer}</Text>
                </View>
              ))}
            </View>
          </View>
        </HelpOverlay>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
  },
  tiersContainer: {
    gap: 16,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  tierCardPopular: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tierHeader: {
    marginBottom: 12,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#666',
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 16,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureCheckmark: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  purchaseButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  purchaseButtonFree: {
    backgroundColor: '#e0e0e0',
  },
  purchaseButtonPaid: {
    backgroundColor: '#007AFF',
  },
  purchaseButtonLoading: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 24,
    padding: 14,
    alignItems: 'center',
  },
  restoringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Help overlay styles
  helpContent: {
    gap: 16,
  },
  helpDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  helpSection: {
    gap: 12,
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  helpItem: {
    gap: 4,
  },
  helpItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  helpItemText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
});

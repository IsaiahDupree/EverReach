/**
 * Billing Settings Screen
 * Manages subscription, displays plans, and handles billing actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, ExternalLink, AlertTriangle } from 'lucide-react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';
import { PlanCard } from '@/components/PlanCard';

// Plan configurations
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Up to 50 contacts',
      '100 AI messages/month',
      'Basic warmth tracking',
      'Manual interactions',
    ],
  },
  pro: {
    name: 'Core',
    monthlyPrice: 15,
    yearlyPrice: 150,
    monthlyPriceId: 'price_1SCCoND7MP3Gp2rw3dkn4A8g', // EverReach Core Monthly
    yearlyPriceId: 'price_1SCreQD7MP3Gp2rwc9mlUnfH', // EverReach Core Annual
    features: [
      'Unlimited contacts',
      'Voice notes & transcription',
      'Screenshot-to-reply',
      'Goal-based responses',
      'Warmth score tracking',
      'Search & tags',
      'Import/export',
      'Unified message history',
    ],
  },
  team: {
    name: 'Team',
    monthlyPrice: 99,
    yearlyPrice: 990,
    monthlyPriceId: 'price_team_monthly', // TODO: Create Team plan in Stripe
    yearlyPriceId: 'price_team_yearly',
    features: [
      'Everything in Core',
      'Unlimited AI messages',
      'Team collaboration',
      'Shared contacts',
      'Admin controls',
      'Dedicated support',
    ],
  },
};

// Helper function for status badge styling
function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'active':
      return { backgroundColor: '#10b981' };
    case 'trial':
      return { backgroundColor: '#2563eb' };
    case 'grace':
    case 'paused':
      return { backgroundColor: '#f59e0b' };
    case 'canceled':
      return { backgroundColor: '#dc2626' };
    default:
      return { backgroundColor: '#6b7280' };
  }
}

export default function BillingSettingsScreen() {
  const router = useRouter();
  
  // Redirect to subscription-plans page
  React.useEffect(() => {
    router.replace('/subscription-plans');
  }, []);
  
  const {
    // Mobile subscription
    isPaid,
    tier,
    trialDaysRemaining,
    paymentPlatform, // 'apple' | 'google' | 'stripe' | null
    subscriptionStartDate, // Actual subscription start date (first time user became paid)
    // Web billing
    billingSubscription,
    billingLoading,
    billingError,
    startCheckout,
    openBillingPortal,
    cancelBilling,
  } = useSubscription();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isCanceling, setIsCanceling] = useState(false);

  // Get current plan from billing subscription
  const currentPlan = billingSubscription?.subscription?.plan || (isPaid ? 'pro' : 'free');
  const subscriptionStatus = billingSubscription?.subscription?.status || (isPaid ? 'active' : 'trial');
  const currentPeriodEnd = billingSubscription?.subscription?.current_period_end || null;
  const cancelAtPeriodEnd = billingSubscription?.subscription?.cancel_at_period_end || false;
  
  // Get payment method - check Apple/Google first, then Stripe
  const getPaymentMethod = () => {
    if (paymentPlatform === 'apple') return 'Apple App Store';
    if (paymentPlatform === 'google') return 'Google Play';
    if (paymentPlatform === 'stripe' || billingSubscription?.subscription?.stripe_customer_id) return 'Card on file';
    return 'Unknown';
  };
  
  // Get subscription start date - CRITICAL: Use subscriptionStartDate to prevent date reset
  const getSubscribedSinceDate = () => {
    // Use subscriptionStartDate (when user first became paid) - this NEVER changes
    if (subscriptionStartDate) return new Date(subscriptionStartDate);
    return null;
  };

  // Handle plan selection
  const handleSelectPlan = (plan: 'pro' | 'team') => {
    const priceId =
      billingPeriod === 'monthly' ? PLANS[plan].monthlyPriceId : PLANS[plan].yearlyPriceId;

    const successUrl = Platform.OS === 'web' 
      ? `${window.location.origin}/settings/billing?success=true`
      : 'everreach://settings/billing?success=true';
    
    const cancelUrl = Platform.OS === 'web'
      ? `${window.location.origin}/settings/billing`
      : 'everreach://settings/billing';

    startCheckout({
      priceId,
      successUrl,
      cancelUrl,
    });
  };

  // Handle cancel subscription
  const handleCancelSubscription = () => {
    // For web, open Stripe billing portal to handle cancellation
    if (Platform.OS === 'web') {
      openBillingPortal();
      return;
    }
    
    // For mobile, show confirmation dialog
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCanceling(true);
            try {
              cancelBilling({ when: 'period_end', reason: 'user_requested' });
              Alert.alert(
                'Subscription Canceled',
                'Your subscription will remain active until the end of your billing period.'
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to cancel subscription. Please try again or contact support.'
              );
            } finally {
              setIsCanceling(false);
            }
          },
        },
      ]
    );
  };

  if (billingLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading billing information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        {subscriptionStatus !== 'active' || cancelAtPeriodEnd ? (
          <SubscriptionStatusBanner
            status={subscriptionStatus}
            currentPeriodEnd={currentPeriodEnd}
            cancelAtPeriodEnd={cancelAtPeriodEnd}
            onAction={() => {
              if (subscriptionStatus === 'grace') {
                openBillingPortal();
              } else {
                // Scroll to plans or trigger upgrade
              }
            }}
          />
        ) : null}

        {/* Current Subscription Info */}
        {currentPlan !== 'free' && (
          <View style={styles.currentSubscription}>
            <Text style={styles.sectionTitle}>Current Subscription</Text>
            <View style={styles.subscriptionCard}>
              {/* Plan and Price */}
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionPlan}>
                  {PLANS[currentPlan as 'pro' | 'team'].name} Plan
                </Text>
                <Text style={styles.subscriptionPrice}>
                  ${billingSubscription?.subscription?.price}/{billingSubscription?.subscription?.billing_period || 'month'}
                </Text>
              </View>

              {/* Subscription Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, getStatusBadgeStyle(subscriptionStatus)]}>
                    <Text style={styles.statusText}>{subscriptionStatus}</Text>
                  </View>
                </View>

                {billingSubscription?.subscription?.stripe_customer_id && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {billingSubscription.subscription.stripe_customer_id}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method:</Text>
                  <Text style={styles.detailValue}>
                    {getPaymentMethod()}
                  </Text>
                </View>

                {getSubscribedSinceDate() && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subscribed Since:</Text>
                    <Text style={styles.detailValue}>
                      {getSubscribedSinceDate()!.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Text>
                  </View>
                )}

                {billingSubscription?.next_billing_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Next Billing:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(billingSubscription.next_billing_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Usage Stats (Last 30 Days) */}
              <View style={styles.usageSection}>
                <Text style={styles.usageTitle}>Usage (Last 30 Days)</Text>
                <View style={styles.usageGrid}>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>0</Text>
                    <Text style={styles.usageLabel}>Compose Texts</Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>0</Text>
                    <Text style={styles.usageLabel}>Voice Minutes</Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>0</Text>
                    <Text style={styles.usageLabel}>Messages Sent</Text>
                  </View>
                </View>
              </View>

              {/* Manage Billing Button */}
              {billingSubscription?.can_manage && (
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => openBillingPortal()}
                >
                  <CreditCard size={16} color="#2563eb" />
                  <Text style={styles.manageButtonText}>Manage Billing</Text>
                  <ExternalLink size={14} color="#2563eb" />
                </TouchableOpacity>
              )}

              {/* Cancel Button */}
              {!cancelAtPeriodEnd && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <>
                      <AlertTriangle size={16} color="#dc2626" />
                      <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Billing Period Toggle */}
        {billingSubscription?.can_upgrade && (
          <>
            <Text style={styles.sectionTitle}>Choose a Plan</Text>
            
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, billingPeriod === 'monthly' && styles.toggleButtonActive]}
                onPress={() => setBillingPeriod('monthly')}
              >
                <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, billingPeriod === 'yearly' && styles.toggleButtonActive]}
                onPress={() => setBillingPeriod('yearly')}
              >
                <Text style={[styles.toggleText, billingPeriod === 'yearly' && styles.toggleTextActive]}>
                  Yearly
                </Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save 17%</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Plan Cards */}
            <PlanCard
              plan="pro"
              name={PLANS.pro.name}
              price={billingPeriod === 'monthly' ? PLANS.pro.monthlyPrice : PLANS.pro.yearlyPrice}
              billingPeriod={billingPeriod}
              features={PLANS.pro.features}
              isCurrentPlan={currentPlan === 'pro'}
              isPopular={true}
              onSelect={() => handleSelectPlan('pro')}
            />

            <PlanCard
              plan="team"
              name={PLANS.team.name}
              price={billingPeriod === 'monthly' ? PLANS.team.monthlyPrice : PLANS.team.yearlyPrice}
              billingPeriod={billingPeriod}
              features={PLANS.team.features}
              isCurrentPlan={currentPlan === 'team'}
              onSelect={() => handleSelectPlan('team')}
            />
          </>
        )}

        {/* Free Plan Info */}
        {currentPlan === 'free' && (
          <View style={styles.freePlanInfo}>
            <Text style={styles.freePlanTitle}>Free Plan</Text>
            <Text style={styles.freePlanDescription}>
              You're currently on the free plan. Upgrade to unlock premium features and unlimited access.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  currentSubscription: {
    marginBottom: 24,
  },
  subscriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subscriptionInfo: {
    marginBottom: 16,
  },
  subscriptionPlan: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  subscriptionNextBilling: {
    fontSize: 13,
    color: '#6b7280',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 12,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  savingsBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  freePlanInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  freePlanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  freePlanDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  // Subscription details
  detailsGrid: {
    marginTop: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  // Usage stats
  usageSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  usageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  usageItem: {
    alignItems: 'center',
  },
  usageValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

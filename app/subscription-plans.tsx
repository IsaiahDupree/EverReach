import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Check, X, ExternalLink } from 'lucide-react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useAuth } from '@/providers/AuthProviderV2';
import { apiFetch } from '@/lib/api';
import { FLAGS } from '@/constants/flags';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  isPopular?: boolean;
  isAvailable: boolean;
}

interface UsageSummaryResponse {
  usage: { compose_runs_used: number; voice_minutes_used: number; messages_sent: number };
  limits: { compose_runs: number; voice_minutes: number; messages: number };
}

interface AccountInfoResponse {
  user: { id: string; email: string | null; display_name: string | null };
  org: any;
  billing: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    subscription_status: string | null;
    current_period_end: string | null;
  } | null;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'core',
    name: 'EverReach Core',
    price: '$15/month',
    description: 'Perfect for professionals getting started with relationship management',
    isPopular: true,
    isAvailable: true,
    features: [
      { name: 'Voice notes', included: true },
      { name: 'Screenshot-to-reply', included: true },
      { name: 'Goal-based responses (networking/business/personal)', included: true },
      { name: 'Warmth score', included: true },
      { name: 'Search & tags', included: true },
      { name: 'Import/export', included: true },
      { name: 'Unified message history', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced AI insights', included: false },
      { name: 'Team collaboration', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'EverReach Pro',
    price: '$35/month',
    description: 'Advanced features for power users and small teams',
    isAvailable: false,
    features: [
      { name: 'Everything in Core', included: true },
      { name: 'Advanced AI insights', included: true },
      { name: 'Relationship analytics', included: true },
      { name: 'Custom response templates', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: true },
      { name: 'Team collaboration (up to 5)', included: true },
      { name: 'Advanced reporting', included: true },
      { name: 'Custom integrations', included: false },
      { name: 'White-label options', included: false },
      { name: 'Dedicated account manager', included: false },
      { name: 'Custom SLA', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'EverReach Enterprise',
    price: 'Custom pricing',
    description: 'Full-scale solution for large organizations',
    isAvailable: false,
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'White-label options', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'Custom SLA', included: true },
      { name: 'On-premise deployment', included: true },
      { name: 'Advanced security features', included: true },
      { name: 'Custom training', included: true },
      { name: 'Priority feature requests', included: true },
      { name: '24/7 phone support', included: true },
      { name: 'Custom reporting dashboard', included: true },
    ],
  },
];

export default function SubscriptionPlansScreen() {
  const { upgradeToPaid, tier, trialStartDate, trialDaysRemaining, isPaid, paymentPlatform } = useSubscription();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (FLAGS.LOCAL_ONLY) return;
      try {
        setLoadError(null);
        const [entRes, usageRes, meRes] = await Promise.all([
          apiFetch('/api/v1/me/entitlements', { requireAuth: true }),
          apiFetch('/api/v1/me/usage-summary?window=30d', { requireAuth: true }),
          apiFetch('/api/v1/me', { requireAuth: true }),
        ]);
        if (entRes.ok) {
          const data = await entRes.json();
          setEntitlements(data);
        }
        if (usageRes.ok) {
          const data: UsageSummaryResponse = await usageRes.json();
          setUsageSummary(data);
        }
        if (meRes.ok) {
          const data: AccountInfoResponse = await meRes.json();
          setAccountInfo(data);
        } else if (meRes.status === 401) {
          setLoadError('Unauthorized');
        }
      } catch (e: any) {
        setLoadError(String(e?.message ?? e));
      }
    };
    void load();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'core') {
      setLoading(true);
      try {
        if (!FLAGS.LOCAL_ONLY) {
          try {
            const response = await apiFetch('/api/billing/checkout', {
              method: 'POST',
              requireAuth: true,
              body: JSON.stringify({
                priceId: 'price_core_monthly',
                successUrl: Platform.OS === 'web' ? window.location.origin + '/subscription-plans?success=true' : '',
                cancelUrl: Platform.OS === 'web' ? window.location.origin + '/subscription-plans?canceled=true' : '',
              }),
            });
            if (response.ok) {
              const { url } = (await response.json()) as { url: string };
              if (Platform.OS === 'web') {
                window.location.href = url;
                return;
              }
            }
          } catch (error) {
          }
        }
        await upgradeToPaid('stripe');
        Alert.alert(
          'Subscription Activated!',
          'Welcome to EverReach Core! You now have access to all premium features.',
          [
            {
              text: 'Get Started',
              onPress: () => router.back(),
            },
          ]
        );
      } catch (_) {
        Alert.alert('Error', 'Failed to activate subscription. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Coming Soon', `${plans.find(p => p.id === planId)?.name ?? 'Plan'} will be available soon. Stay tuned!`);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/sign-in');
            } catch (error) {
            }
          },
        },
      ]
    );
  };

  const renderPlan = (plan: SubscriptionPlan) => {
    const isCurrentPlan = tier === 'paid' && plan.id === 'core';
    const isDisabled = !plan.isAvailable;

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          plan.isPopular && styles.popularPlan,
          isDisabled && styles.disabledPlan,
        ]}
        testID={`plan-card-${plan.id}`}
      >
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={[styles.planName, isDisabled && styles.disabledText]}>
            {plan.name}
          </Text>
          <Text style={[styles.planPrice, isDisabled && styles.disabledText]}>
            {plan.price}
          </Text>
          <Text style={[styles.planDescription, isDisabled && styles.disabledText]}>
            {plan.description}
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              {feature.included ? (
                <Check
                  size={16}
                  color={isDisabled ? '#9CA3AF' : '#10B981'}
                  style={styles.featureIcon}
                />
              ) : (
                <X
                  size={16}
                  color={isDisabled ? '#9CA3AF' : '#EF4444'}
                  style={styles.featureIcon}
                />
              )}
              <Text style={[
                styles.featureText,
                !feature.included && styles.excludedFeature,
                isDisabled && styles.disabledText,
              ]}>
                {feature.name}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            plan.isPopular && styles.popularButton,
            isCurrentPlan && styles.currentPlanButton,
            isDisabled && styles.disabledButton,
          ]}
          onPress={() => handleSelectPlan(plan.id)}
          disabled={isDisabled || isCurrentPlan || loading}
          testID={`select-plan-${plan.id}`}
        >
          {loading && plan.id === 'core' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[
              styles.selectButtonText,
              plan.isPopular && styles.popularButtonText,
              isCurrentPlan && styles.currentPlanButtonText,
              isDisabled && styles.disabledButtonText,
            ]}>
              {isCurrentPlan ? 'Current Plan' : isDisabled ? 'Coming Soon' : 'Select Plan'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const subscriptionBadge = useMemo(() => {
    const status = accountInfo?.billing?.subscription_status ?? (isPaid ? 'active' : 'trial');
    return status;
  }, [accountInfo?.billing?.subscription_status, isPaid]);

  // Determine subscription source from entitlements
  const subscriptionSource = useMemo(() => {
    const src = (entitlements as any)?.source as string | undefined;
    
    // Map revenuecat to more specific source based on product_id
    if (src === 'revenuecat') {
      const productId = (entitlements as any)?.product_id || '';
      if (productId.includes('ios') || productId.startsWith('com.')) return 'app_store';
      if (productId.includes('android')) return 'play';
    }
    
    return src || null;
  }, [entitlements]);

  // Handle Stripe billing portal
  const handleStripePortal = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/billing/portal', {
        method: 'POST',
        requireAuth: true,
      });
      
      if (response.ok) {
        const { url } = await response.json();
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to open billing portal');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  // Handle App Store subscription management
  const handleAppStoreManage = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Opens the App Store subscriptions page
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        Alert.alert(
          'Manage via App Store',
          'To manage your subscription, open the App Store app on your iPhone or iPad, tap your profile icon, then tap Subscriptions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open App Store');
    }
  };

  // Handle Google Play subscription management
  const handlePlayStoreManage = async () => {
    try {
      if (Platform.OS === 'android') {
        // Opens Google Play subscriptions
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      } else {
        Alert.alert(
          'Manage via Google Play',
          'To manage your subscription, open the Google Play Store app on your Android device, tap Menu → Subscriptions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open Google Play');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Subscription Plans',
          headerRight: () => (
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton} testID="sign-out-subscription">
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {(isPaid || trialDaysRemaining > 0 || entitlements || accountInfo) && (
          <View style={styles.statusCard} testID="current-subscription-card">
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Current Subscription</Text>
              {(subscriptionBadge === 'active' || isPaid) ? (
                <View style={styles.activeBadge}>
                  <Check size={14} color="#FFFFFF" />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              ) : (
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>{subscriptionBadge === 'trial' ? 'Free' : 'Inactive'}</Text>
                </View>
              )}
            </View>

            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Plan:</Text>
                <Text style={styles.statusValue}>
                  {entitlements ? (entitlements.plan === 'free' ? 'Free Plan' : 'EverReach Core') : (isPaid ? 'EverReach Core' : 'Free Trial')}
                </Text>
              </View>

              {accountInfo?.user?.email && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Account:</Text>
                  <Text style={styles.statusValue}>{accountInfo.user.email}</Text>
                </View>
              )}

              {accountInfo?.billing?.subscription_status && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={styles.statusValue}>{accountInfo.billing.subscription_status}</Text>
                </View>
              )}

              {accountInfo?.billing?.current_period_end && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Current Period Ends:</Text>
                  <Text style={styles.statusValue}>
                    {new Date(accountInfo.billing.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}

              {(isPaid || subscriptionSource) && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Payment Method:</Text>
                  <Text style={styles.statusValue} testID="subscription-source-label">
                    {subscriptionSource === 'stripe' ? 'Stripe' : 
                     subscriptionSource === 'app_store' ? 'App Store' : 
                     subscriptionSource === 'play' ? 'Google Play' : 
                     subscriptionSource === 'manual' ? 'Enterprise' :
                     paymentPlatform === 'stripe' ? 'Stripe' : 
                     paymentPlatform === 'apple' ? 'Apple Pay' : 'Google Play'}
                  </Text>
                </View>
              )}

              {!isPaid && trialDaysRemaining >= 0 && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Trial Days Remaining:</Text>
                  <Text style={[styles.statusValue, styles.trialDaysText]}>
                    {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              )}

              {trialStartDate && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>
                    {isPaid ? 'Subscribed Since:' : 'Trial Started:'}
                  </Text>
                  <Text style={styles.statusValue}>
                    {new Date(trialStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>

            {usageSummary && (
              <View style={styles.usageSection}>
                <Text style={styles.usageTitle}>Usage (Last 30 Days)</Text>
                <View style={styles.usageGrid}>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>{usageSummary.usage.compose_runs_used}</Text>
                    <Text style={styles.usageLabel}>Compose Runs</Text>
                    <Text style={styles.usageLimit}>/ {usageSummary.limits.compose_runs}</Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>{usageSummary.usage.voice_minutes_used}</Text>
                    <Text style={styles.usageLabel}>Voice Minutes</Text>
                    <Text style={styles.usageLimit}>/ {usageSummary.limits.voice_minutes}</Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>{usageSummary.usage.messages_sent}</Text>
                    <Text style={styles.usageLabel}>Messages Sent</Text>
                    <Text style={styles.usageLimit}>/ {usageSummary.limits.messages}</Text>
                  </View>
                </View>
              </View>
            )}

            {(isPaid || entitlements?.plan !== 'free') && (
              <View style={styles.statusFooter}>
                <Text style={styles.statusFooterText}>
                  You have access to all premium features
                </Text>
              </View>
            )}

            {/* Subscription Source-based Billing Management */}
            {(isPaid || subscriptionSource) && (
              <View style={styles.billingManagementSection}>
                {subscriptionSource === 'stripe' && (
                  <TouchableOpacity
                    style={styles.manageBillingButton}
                    onPress={handleStripePortal}
                    disabled={loading}
                    testID="manage-billing-stripe-button"
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.manageBillingText}>Manage Billing</Text>
                        <ExternalLink size={16} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {subscriptionSource === 'app_store' && (
                  <View testID="app-store-instructions">
                    <View style={styles.subscriptionSourceBadge}>
                      <Text style={styles.subscriptionSourceBadgeText}>Subscribed via App Store</Text>
                    </View>
                    {Platform.OS === 'ios' ? (
                      <TouchableOpacity
                        style={styles.manageBillingButton}
                        onPress={handleAppStoreManage}
                        testID="manage-billing-native-button"
                      >
                        <Text style={styles.manageBillingText}>Manage in App Store</Text>
                        <ExternalLink size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.billingInstructions}>
                        Open Settings → Apple ID → Subscriptions → EverReach to manage your subscription.
                      </Text>
                    )}
                  </View>
                )}

                {subscriptionSource === 'play' && (
                  <View testID="play-store-instructions">
                    <View style={styles.subscriptionSourceBadge}>
                      <Text style={styles.subscriptionSourceBadgeText}>Subscribed via Google Play</Text>
                    </View>
                    {Platform.OS === 'android' ? (
                      <TouchableOpacity
                        style={styles.manageBillingButton}
                        onPress={handlePlayStoreManage}
                        testID="manage-billing-native-button"
                      >
                        <Text style={styles.manageBillingText}>Manage in Play Store</Text>
                        <ExternalLink size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.billingInstructions}>
                        Open Play Store → Menu → Subscriptions → EverReach to manage your subscription.
                      </Text>
                    )}
                  </View>
                )}

                {subscriptionSource === 'manual' && (
                  <View testID="enterprise-instructions">
                    <View style={[styles.subscriptionSourceBadge, styles.enterpriseBadge]}>
                      <Text style={styles.subscriptionSourceBadgeText}>Enterprise Subscription</Text>
                    </View>
                    <Text style={styles.billingInstructions}>
                      Contact support for billing changes or subscription management.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!isPaid && trialDaysRemaining > 0 && (
              <View style={styles.statusFooter}>
                <Text style={styles.statusFooterText}>
                  Upgrade now to continue using premium features after your trial ends
                </Text>
              </View>
            )}

            {loadError && (
              <View style={styles.statusFooter}>
                <Text style={[styles.statusFooterText, { color: '#EF4444' }]}>Failed to load account info</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock the full potential of EverReach with our premium features
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {plans.map(renderPlan)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include a 7-day free trial. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#3B82F6',
    transform: [{ scale: 1.02 }],
  },
  disabledPlan: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planHeader: {
    marginBottom: 24,
    marginTop: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#3B82F6',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  excludedFeature: {
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  selectButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularButton: {
    backgroundColor: '#3B82F6',
  },
  currentPlanButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
  },
  popularButtonText: {
    color: '#FFFFFF',
  },
  currentPlanButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  trialBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trialBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusDetails: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  statusValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600' as const,
  },
  trialDaysText: {
    color: '#F59E0B',
  },
  statusFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  usageSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
  },
  usageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  usageItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#3B82F6',
  },
  usageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  usageLimit: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  billingManagementSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  manageBillingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  manageBillingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  subscriptionSourceBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  enterpriseBadge: {
    backgroundColor: '#7C3AED',
  },
  subscriptionSourceBadgeText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  billingInstructions: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
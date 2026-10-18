import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform, Alert, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Stack, router } from 'expo-router';
import { Play, ArrowRight, CheckCircle, Info, Shield, X, Lock, Zap, Users, Clock, Star, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import AppAnalytics from '@/lib/analytics';

const { width, height } = Dimensions.get('window');

const PREMIUM_FEATURES = [
  { icon: Zap, title: 'Unlimited AI Messages', free: '50/month', pro: 'Unlimited' },
  { icon: Users, title: 'Contacts', free: '100', pro: 'Unlimited' },
  { icon: Shield, title: 'Warmth Tracking', free: '✗', pro: '✓' },
  { icon: CheckCircle, title: 'Screenshot OCR', free: '✗', pro: '✓' },
  { icon: Play, title: 'Voice Transcription', free: 'Limited', pro: 'Unlimited' },
  { icon: Star, title: 'Priority Support', free: '✗', pro: '✓' },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Sales Manager', quote: 'EverReach helped me stay connected with 200+ clients effortlessly.' },
  { name: 'David K.', role: 'Entrepreneur', quote: 'The warmth tracking feature is a game-changer for networking.' },
];

const ONBOARDING_PAGES = [
  {
    id: 'hero',
    title: 'Don\'t Lose Your Connections',
    subtitle: 'Your trial is ending soon. Upgrade now to keep all your relationship data, AI insights, and premium features.',
  },
  {
    id: 'features',
    title: 'What You\'ll Miss Without Pro',
    subtitle: 'Compare free vs premium features',
  },
  {
    id: 'pricing',
    title: 'Choose Your Plan',
    subtitle: 'Flexible pricing that scales with you',
  },
  {
    id: 'social',
    title: 'Trusted by Professionals',
    subtitle: 'Join thousands of users staying connected',
  },
  {
    id: 'video',
    title: 'See EverReach in Action',
    subtitle: 'Watch how EverReach helps you connect faster',
  },
];

export default function UpgradeOnboarding() {
  const {
    isPaid,
    trialDaysRemaining,
    trialGateStrategy,
    trialUsageSeconds,
    trialUsageSecondsLimit,
    trialGateStrategy: gateStrategy,
  } = useSubscription();
  const [currentPage, setCurrentPage] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const videoStarted = useRef<boolean>(false);
  const videoCompleted = useRef<boolean>(false);
  const screenAnalytics = useAnalytics('UpgradeOnboarding');

  const trialMeta = useMemo(() => {
    return {
      trial_days_remaining: trialDaysRemaining,
      trial_gate_strategy: trialGateStrategy,
      trial_usage_seconds: trialUsageSeconds,
      trial_usage_seconds_limit: trialUsageSecondsLimit,
      is_paid: isPaid,
      page_index: currentPage,
    };
  }, [trialDaysRemaining, trialGateStrategy, trialUsageSeconds, trialUsageSecondsLimit, isPaid, currentPage]);

  useEffect(() => {
    screenAnalytics.track('upgrade_onboarding_viewed', AppAnalytics.withTrialProps({}, trialMeta));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const urgencyMessage = useMemo(() => {
    if (trialDaysRemaining <= 0) {
      return { text: 'Your trial has ended', color: '#EF4444', urgent: true };
    } else if (trialDaysRemaining === 1) {
      return { text: 'Last day of trial!', color: '#F59E0B', urgent: true };
    } else if (trialDaysRemaining <= 3) {
      return { text: `Only ${trialDaysRemaining} days left in trial`, color: '#F59E0B', urgent: true };
    }
    return { text: `${trialDaysRemaining} days left in trial`, color: '#10B981', urgent: false };
  }, [trialDaysRemaining]);

  const handleSubscribe = (plan: 'monthly' | 'annual') => {
    screenAnalytics.track('upgrade_cta_clicked', AppAnalytics.withTrialProps({ plan, days_remaining: trialDaysRemaining }, trialMeta));
    router.push('/subscription-plans');
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    if (page !== currentPage) {
      setCurrentPage(page);
      screenAnalytics.track('upgrade_onboarding_page_viewed', AppAnalytics.withTrialProps({ page_index: page, page_id: ONBOARDING_PAGES[page]?.id }, trialMeta));
    }
  };

  const goToPage = (pageIndex: number) => {
    scrollViewRef.current?.scrollTo({ x: pageIndex * width, animated: true });
    setCurrentPage(pageIndex);
  };

  const handleUpgrade = () => {
    screenAnalytics.track('upgrade_onboarding_cta_clicked', AppAnalytics.withTrialProps({ cta: 'view_plans' }, trialMeta));
    router.push('/subscription-plans');
  };

  const handleManageBilling = async () => {
    screenAnalytics.track('upgrade_onboarding_cta_clicked', AppAnalytics.withTrialProps({ cta: 'manage_billing' }, trialMeta));
    router.push('/subscription-plans');
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS === 'web') return;
    screenAnalytics.track('upgrade_onboarding_cta_clicked', AppAnalytics.withTrialProps({ cta: 'restore_purchases' }, trialMeta));
    Alert.alert('Restore Purchases', 'Use the Restore Purchases button on the plans screen.');
    router.push('/subscription-plans');
  };

  const handleOpenApiPlayground = () => {
    screenAnalytics.track('upgrade_onboarding_cta_clicked', AppAnalytics.withTrialProps({ cta: 'api_playground' }, trialMeta));
    router.push('/api-playground' as any);
  };

  const superwallEnabled = !!(
    process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY
  );

  

  const renderPage = (pageId: string) => {
    switch (pageId) {
      case 'hero':
        return (
          <View style={styles.pageContent}>
            <Text style={styles.heroTitle}>Don't Lose Your Connections</Text>
            <Text style={styles.heroSubtitle}>
              Your trial is ending soon. Upgrade now to keep all your relationship data, AI insights, and premium features.
            </Text>
          </View>
        );
      case 'features':
        return (
          <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>What You'll Miss Without Pro</Text>
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonLabel}>Feature</Text>
                <Text style={styles.comparisonLabel}>Free</Text>
                <Text style={[styles.comparisonLabel, styles.proLabel]}>Pro</Text>
              </View>
              {PREMIUM_FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <View key={idx} style={styles.comparisonRow}>
                    <View style={styles.featureName}>
                      <Icon size={16} color="#6B7280" />
                      <Text style={styles.featureText}>{feature.title}</Text>
                    </View>
                    <Text style={styles.freeValue}>{feature.free}</Text>
                    <Text style={styles.proValue}>{feature.pro}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        );
      case 'pricing':
        return (
          <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <TouchableOpacity 
              style={styles.pricingCard} 
              onPress={() => handleSubscribe('monthly')}
              activeOpacity={0.7}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planPrice}>$14.99<Text style={styles.perMonth}>/mo</Text></Text>
              </View>
              <Text style={styles.planDescription}>Perfect for getting started</Text>
              <View style={styles.selectBtn}>
                <Text style={styles.selectText}>Select Monthly</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.pricingCard, styles.recommendedCard]} 
              onPress={() => handleSubscribe('annual')}
              activeOpacity={0.7}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Save 40%</Text>
              </View>
              <View style={styles.pricingHeader}>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planPrice}>$89.99<Text style={styles.perMonth}>/yr</Text></Text>
              </View>
              <Text style={styles.planDescription}>Best value - just $7.49/month</Text>
              <View style={[styles.selectBtn, styles.selectBtnPrimary]}>
                <Text style={[styles.selectText, styles.selectTextPrimary]}>Select Annual</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        );
      case 'social':
        return (
          <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Trusted by Professionals</Text>
            {TESTIMONIALS.map((testimonial, idx) => (
              <View key={idx} style={styles.testimonialCard}>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} color="#F59E0B" fill="#F59E0B" />)}
                </View>
                <Text style={styles.quote}>"{testimonial.quote}"</Text>
                <Text style={styles.author}>{testimonial.name} · {testimonial.role}</Text>
              </View>
            ))}
          </ScrollView>
        );
      case 'video':
        return (
          <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>See EverReach in Action</Text>
            <View style={styles.videoCard}>
              <Video
                style={styles.video}
                source={{ uri: 'https://cdn.coverr.co/videos/coverr-woman-typing-on-a-phone-8933/1080p.mp4' }}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                shouldPlay={false}
                isLooping
                onPlaybackStatusUpdate={(status: any) => {
                  try {
                    if (!videoStarted.current && status?.isPlaying) {
                      videoStarted.current = true;
                      screenAnalytics.track('upgrade_onboarding_video_started', AppAnalytics.withTrialProps({}, trialMeta));
                    }
                    if (!videoCompleted.current && status?.didJustFinish) {
                      videoCompleted.current = true;
                      screenAnalytics.track('upgrade_onboarding_video_completed', AppAnalytics.withTrialProps({}, trialMeta));
                    }
                  } catch {}
                }}
              />
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Urgency Header */}
      <View style={[styles.urgencyBanner, { backgroundColor: urgencyMessage.urgent ? urgencyMessage.color : '#7C3AED' }]}>
        <Clock size={16} color="#FFFFFF" />
        <Text style={styles.urgencyText}>{urgencyMessage.text}</Text>
      </View>

      {/* Swipeable Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.pagerContainer}
      >
        {ONBOARDING_PAGES.map((page, index) => (
          <View key={page.id} style={styles.page}>
            {renderPage(page.id)}
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.paginationContainer}>
        {ONBOARDING_PAGES.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToPage(index)}
            style={[
              styles.paginationDot,
              index === currentPage && styles.paginationDotActive
            ]}
          />
        ))}
      </View>

      {/* Navigation Arrows */}
      {currentPage > 0 && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowLeft]}
          onPress={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      {currentPage < ONBOARDING_PAGES.length - 1 && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowRight]}
          onPress={() => goToPage(currentPage + 1)}
        >
          <ChevronRight size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Sticky Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.mainCTA} onPress={() => handleSubscribe('annual')}>
          <Text style={styles.mainCTAText}>Unlock Pro Features Now</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestorePurchases}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PaywallTriggerButton({ trialMeta }: { trialMeta: any }) {
  // Dynamically require expo-superwall to avoid crashing in Expo Go
  const superwall = React.useMemo(() => {
    try { return require('expo-superwall'); } catch { return null; }
  }, []);
  const usePlacement = superwall?.usePlacement as undefined | ((args: any) => any);
  if (!usePlacement) {
    return null; // Not available in this runtime (e.g., Expo Go)
  }
  
  // Import event logger dynamically (safe in all environments)
  const { logSuperwallEvent } = require('@/lib/paymentEventLogger');
  const screenAnalytics = useAnalytics('UpgradeOnboarding');
  
  const { registerPlacement } = usePlacement({
    onPresent: (info: any) => {
      console.log('[Superwall] Paywall presented', info);
      logSuperwallEvent('paywall_present', info, { placement: 'main_pay_wall' });
      screenAnalytics.track('paywall_presented', AppAnalytics.withTrialProps({ placement: 'main_pay_wall' }, trialMeta));
    },
    onDismiss: (info: any, result: any) => {
      console.log('[Superwall] Paywall dismissed', info, result);
      logSuperwallEvent('paywall_dismiss', { info, result }, { placement: 'main_pay_wall' });
      screenAnalytics.track('paywall_dismissed', AppAnalytics.withTrialProps({ result: result?.state || 'unknown' }, trialMeta));
    },
    onError: (err: any) => {
      console.warn('[Superwall] Paywall error', err);
      logSuperwallEvent('paywall_error', { error: err?.message || String(err) }, { placement: 'main_pay_wall' });
      screenAnalytics.track('paywall_error', AppAnalytics.withTrialProps({ error: err?.message || 'unknown' }, trialMeta));
    },
    onSkip: (reason: any) => {
      console.log('[Superwall] Paywall skipped', reason);
      logSuperwallEvent('paywall_skip', { reason }, { placement: 'main_pay_wall' });
    },
  });
  
  const onShowPaywall = async () => {
    try {
      logSuperwallEvent('paywall_trigger_attempt', { placement: 'main_pay_wall' });
      await registerPlacement({ placement: 'main_pay_wall' });
      screenAnalytics.track('upgrade_onboarding_cta_clicked', AppAnalytics.withTrialProps({ cta: 'show_paywall' }, trialMeta));
    } catch (e) {
      console.error('[Superwall] Register placement error:', e);
      logSuperwallEvent('paywall_register_error', { error: String(e) });
    }
  };
  return (
    <TouchableOpacity style={[styles.mainCTA, { backgroundColor: '#111827' }]} onPress={onShowPaywall}>
      <Text style={styles.mainCTAText}>Show Paywall (Superwall)</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  urgencyBanner: { paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  urgencyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  pagerContainer: { flex: 1 },
  page: { width, paddingHorizontal: 20, paddingTop: 20 },
  pageContent: { flex: 1, paddingBottom: 20 },
  scrollView: { flex: 1 },
  hero: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16, alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 12 },
  heroSubtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  paginationContainer: { position: 'absolute', bottom: 140, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  paginationDotActive: { width: 24, backgroundColor: '#7C3AED' },
  navArrow: { position: 'absolute', top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(124, 58, 237, 0.9)', justifyContent: 'center', alignItems: 'center' },
  navArrowLeft: { left: 16 },
  navArrowRight: { right: 16 },
  comparisonCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  comparisonHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
  comparisonLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  proLabel: { color: '#7C3AED' },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  featureName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: '#374151', flex: 1 },
  freeValue: { flex: 1, fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  proValue: { flex: 1, fontSize: 13, color: '#7C3AED', fontWeight: '700', textAlign: 'center' },
  pricingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 12, position: 'relative' },
  recommendedCard: { borderColor: '#7C3AED', backgroundColor: '#F9F5FF' },
  badge: { position: 'absolute', top: -10, right: 20, backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pricingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#111827' },
  perMonth: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  planDescription: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  selectBtn: { backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  selectBtnPrimary: { backgroundColor: '#7C3AED' },
  selectText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  selectTextPrimary: { color: '#FFFFFF' },
  testimonialCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  stars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  quote: { fontSize: 15, color: '#374151', fontStyle: 'italic', marginBottom: 8, lineHeight: 22 },
  author: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  videoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  video: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#000' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8, paddingBottom: 32 },
  mainCTA: { backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  mainCTAText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  restoreBtn: { alignItems: 'center', paddingVertical: 10 },
  restoreText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X, Sun, Zap, Shield, Map, MessageCircle } from 'lucide-react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { SUNTRACE_COLORS, SUNTRACE_CONFIG } from '@/constants/suntrace';
import { useSubscription } from '@/hooks/useSubscription';

const PRO_FEATURES = [
  { icon: <Zap size={18} color={SUNTRACE_COLORS.primary} />, text: '7-day UV forecast' },
  { icon: <MessageCircle size={18} color={SUNTRACE_COLORS.primary} />, text: 'AI Sun Coach (100 msg/day)' },
  { icon: <Map size={18} color={SUNTRACE_COLORS.primary} />, text: 'Submit & discover sun spots' },
  { icon: <Sun size={18} color={SUNTRACE_COLORS.primary} />, text: 'Advanced analytics & trends' },
  { icon: <Shield size={18} color={SUNTRACE_COLORS.primary} />, text: 'Priority burn risk alerts' },
];

const FREE_FEATURES = [
  { text: 'Real-time UV tracking', included: true },
  { text: 'Session logging (unlimited)', included: true },
  { text: 'Streak tracking', included: true },
  { text: '1-day UV forecast', included: true },
  { text: 'AI Coach (20 msg/day)', included: true },
  { text: '7-day UV forecast', included: false },
  { text: 'AI Coach (100 msg/day)', included: false },
  { text: 'Submit sun spots', included: false },
];

export default function SunPaywallScreen() {
  const router = useRouter();
  const { isPro, packages } = useSubscription();
  const [selectedPkg, setSelectedPkg] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  if (isPro) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.alreadyProIcon}>✅</Text>
        <Text style={styles.alreadyProTitle}>You're already Pro!</Text>
        <Text style={styles.alreadyProSub}>Enjoy all SunTrace features.</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handlePurchase() {
    setPurchasing(true);
    try {
      const pkg = selectedPkg === 'monthly'
        ? packages?.find(p => p.packageType === 'MONTHLY')
        : packages?.find(p => p.packageType === 'ANNUAL');

      if (!pkg) {
        Alert.alert('Package not available', 'Please try again later.');
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[SUNTRACE_CONFIG.PRO_ENTITLEMENT]) {
        Alert.alert('Welcome to Pro!', 'You now have full access to SunTrace Pro.', [
          { text: 'Awesome!', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      if (!err.userCancelled) {
        Alert.alert('Purchase Failed', err.message ?? 'An error occurred');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[SUNTRACE_CONFIG.PRO_ENTITLEMENT]) {
        Alert.alert('Purchases Restored', 'Your Pro subscription has been restored!', [
          { text: 'Great!', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Nothing to Restore', 'No active Pro subscription found for this account.');
      }
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message ?? 'An error occurred');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Close */}
      <TouchableOpacity style={styles.closeIcon} onPress={() => router.back()}>
        <X size={24} color={SUNTRACE_COLORS.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Sun size={56} color={SUNTRACE_COLORS.primary} strokeWidth={1.5} />
          <Text style={styles.heroTitle}>SunTrace Pro</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the full power of your personal sun health coach.
          </Text>
        </View>

        {/* Pro features */}
        <View style={styles.featureList}>
          {PRO_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              {f.icon}
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Pricing toggle */}
        <View style={styles.pricingRow}>
          <TouchableOpacity
            style={[styles.pricingOption, selectedPkg === 'monthly' && styles.pricingSelected]}
            onPress={() => setSelectedPkg('monthly')}
          >
            <Text style={[styles.pricingTitle, selectedPkg === 'monthly' && styles.pricingTitleSelected]}>
              Monthly
            </Text>
            <Text style={[styles.pricingPrice, selectedPkg === 'monthly' && styles.pricingPriceSelected]}>
              $3.99/mo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pricingOption, selectedPkg === 'annual' && styles.pricingSelected]}
            onPress={() => setSelectedPkg('annual')}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 37%</Text>
            </View>
            <Text style={[styles.pricingTitle, selectedPkg === 'annual' && styles.pricingTitleSelected]}>
              Annual
            </Text>
            <Text style={[styles.pricingPrice, selectedPkg === 'annual' && styles.pricingPriceSelected]}>
              $29.99/yr
            </Text>
            <Text style={styles.pricingPer}>$2.50/mo</Text>
          </TouchableOpacity>
        </View>

        {/* Free comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Free vs Pro</Text>
          {FREE_FEATURES.map((f, i) => (
            <View key={i} style={styles.compRow}>
              {f.included ? (
                <Check size={16} color={SUNTRACE_COLORS.accent} />
              ) : (
                <X size={16} color={SUNTRACE_COLORS.textSecondary} />
              )}
              <Text style={[styles.compText, !f.included && styles.compTextMuted]}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Free trial note */}
        <Text style={styles.trialNote}>
          🎉 7-day free trial included · Cancel anytime
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>
              Start Free Trial — {selectedPkg === 'monthly' ? '$3.99/mo' : '$29.99/yr'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          <Text style={styles.restoreText}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Payment charged to your Apple ID account. Subscription renews automatically unless cancelled 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgDark },
  center: { alignItems: 'center', justifyContent: 'center' },
  closeIcon: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 20,
    zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingHorizontal: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 32, gap: 12 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary },
  heroSubtitle: { fontSize: 16, color: SUNTRACE_COLORS.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  featureList: { backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 16, padding: 20, gap: 14, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, color: SUNTRACE_COLORS.textPrimary, fontWeight: '500' },
  pricingRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  pricingOption: {
    flex: 1, backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 4,
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  pricingSelected: { borderColor: SUNTRACE_COLORS.primary },
  saveBadge: {
    position: 'absolute', top: -10,
    backgroundColor: SUNTRACE_COLORS.accent,
    borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  pricingTitle: { fontSize: 14, color: SUNTRACE_COLORS.textSecondary, fontWeight: '600' },
  pricingTitleSelected: { color: SUNTRACE_COLORS.textPrimary },
  pricingPrice: { fontSize: 22, fontWeight: '800', color: SUNTRACE_COLORS.textSecondary },
  pricingPriceSelected: { color: SUNTRACE_COLORS.primary },
  pricingPer: { fontSize: 12, color: SUNTRACE_COLORS.textSecondary },
  comparisonCard: { backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 16, padding: 16, gap: 10, marginBottom: 20 },
  comparisonTitle: { fontSize: 14, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary, marginBottom: 4 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compText: { fontSize: 14, color: SUNTRACE_COLORS.textPrimary },
  compTextMuted: { color: SUNTRACE_COLORS.textSecondary },
  trialNote: { fontSize: 14, color: SUNTRACE_COLORS.accent, textAlign: 'center', marginBottom: 20 },
  ctaBtn: {
    backgroundColor: SUNTRACE_COLORS.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreBtn: { paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  restoreText: { fontSize: 14, color: SUNTRACE_COLORS.textSecondary },
  legal: { fontSize: 11, color: SUNTRACE_COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  alreadyProIcon: { fontSize: 64, marginBottom: 16 },
  alreadyProTitle: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary, marginBottom: 8 },
  alreadyProSub: { fontSize: 16, color: SUNTRACE_COLORS.textSecondary, marginBottom: 40 },
  closeBtn: { backgroundColor: SUNTRACE_COLORS.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

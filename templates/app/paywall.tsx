/**
 * APP-KIT: Paywall / Subscription Screen
 * 
 * ✅ KEEP: Subscription logic, Stripe/RevenueCat integration
 * 🔧 CUSTOMIZE: Pricing, features list, styling
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X, Sparkles, Crown } from 'lucide-react-native';
import { APP_CONFIG } from '@/constants/config';

// 🔧 CUSTOMIZE: Your feature comparison
const FEATURES = [
  { name: 'Basic features', free: true, pro: true },
  { name: 'Limited items', free: '10 items', pro: 'Unlimited' },
  { name: 'Priority support', free: false, pro: true },
  { name: 'Advanced analytics', free: false, pro: true },
  { name: 'Export data', free: false, pro: true },
  { name: 'Custom themes', free: false, pro: true },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  const monthlyPrice = APP_CONFIG.SUBSCRIPTION.PRO_PRICE_MONTHLY;
  const yearlyPrice = APP_CONFIG.SUBSCRIPTION.PRO_PRICE_YEARLY;
  const yearlySavings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // TODO: Implement purchase logic
      // Platform.OS === 'web' ? stripeCheckout() : revenueCatPurchase()
      console.log('Purchase:', selectedPlan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Dev Mode Hint */}
      {APP_CONFIG.DEV_MODE && (
        <View style={styles.devHint}>
          <Text style={styles.devHintText}>🔧 APP-KIT: Customize pricing & features</Text>
          <Text style={styles.devHintFile}>File: app/paywall.tsx</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X color="#6B7280" size={24} />
        </TouchableOpacity>
        <Crown color="#F59E0B" size={48} />
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>Unlock all features and remove limits</Text>
      </View>

      {/* Plan Selection */}
      <View style={styles.planContainer}>
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <Text style={styles.planName}>Monthly</Text>
          <Text style={styles.planPrice}>${monthlyPrice}</Text>
          <Text style={styles.planPeriod}>per month</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('yearly')}
        >
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {yearlySavings}%</Text>
          </View>
          <Text style={styles.planName}>Yearly</Text>
          <Text style={styles.planPrice}>${yearlyPrice}</Text>
          <Text style={styles.planPeriod}>per year</Text>
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>What's included</Text>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.featureName}>{feature.name}</Text>
            <View style={styles.featureValues}>
              <View style={styles.featureCell}>
                {feature.free === true ? (
                  <Check color="#10B981" size={16} />
                ) : feature.free === false ? (
                  <X color="#D1D5DB" size={16} />
                ) : (
                  <Text style={styles.featureLimit}>{feature.free}</Text>
                )}
              </View>
              <View style={[styles.featureCell, styles.proCell]}>
                {feature.pro === true ? (
                  <Check color="#10B981" size={16} />
                ) : (
                  <Text style={styles.featureUnlimited}>{feature.pro}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
        onPress={handlePurchase}
        disabled={loading}
      >
        <Sparkles color="white" size={20} />
        <Text style={styles.ctaText}>
          {loading ? 'Processing...' : `Start ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Plan`}
        </Text>
      </TouchableOpacity>

      {/* Terms */}
      <Text style={styles.terms}>
        Cancel anytime. Subscription auto-renews until canceled.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  devHint: { backgroundColor: '#8B5CF6', padding: 12 },
  devHintText: { color: 'white', fontSize: 14, fontWeight: '600' },
  devHintFile: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'monospace', marginTop: 4 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
  closeButton: { position: 'absolute', top: 50, right: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  planContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  planCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center' },
  planCardSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  savingsBadge: { position: 'absolute', top: -10, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  savingsText: { color: 'white', fontSize: 10, fontWeight: '600' },
  planName: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  planPrice: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  planPeriod: { fontSize: 12, color: '#9CA3AF' },
  featuresContainer: { padding: 16, marginTop: 24 },
  featuresTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  featureName: { flex: 1, fontSize: 14, color: '#4B5563' },
  featureValues: { flexDirection: 'row', gap: 24 },
  featureCell: { width: 60, alignItems: 'center' },
  proCell: { backgroundColor: '#EFF6FF', borderRadius: 4, paddingVertical: 2 },
  featureLimit: { fontSize: 12, color: '#9CA3AF' },
  featureUnlimited: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', marginHorizontal: 16, marginTop: 24, paddingVertical: 16, borderRadius: 12 },
  ctaButtonDisabled: { backgroundColor: '#9CA3AF' },
  ctaText: { color: 'white', fontSize: 18, fontWeight: '600' },
  terms: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 16, marginBottom: 40, paddingHorizontal: 16 },
});

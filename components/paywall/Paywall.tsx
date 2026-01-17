import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';

export type PaywallPlan = {
  id: string;
  name: string;
  price: string;
  description: string;
  isPopular?: boolean;
  isAvailable?: boolean;
  features?: { name: string; included: boolean }[];
};

interface PaywallProps {
  plans: PaywallPlan[];
  entitlements?: any;
  isLoading?: boolean;
  isRestoring?: boolean;
  currentPlanId?: string; // ID of user's current plan
  onSelectPlan: (planId: string) => void;
  onRestore?: () => void;
}

export default function Paywall({ plans, entitlements, isLoading, isRestoring, currentPlanId, onSelectPlan, onRestore }: PaywallProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose Your Plan</Text>
      <Text style={styles.subheader}>Unlock premium features with EverReach Core</Text>

      {plans.map((p) => (
        <View key={p.id} style={[styles.card, p.isPopular && styles.cardPopular, p.isAvailable === false && styles.cardDisabled]}>
          {p.isPopular && (
            <View style={styles.badge}><Text style={styles.badgeText}>Most Popular</Text></View>
          )}
          <Text style={[styles.planName, p.isAvailable === false && styles.disabledText]}>{p.name}</Text>
          <Text style={[styles.planPrice, p.isAvailable === false && styles.disabledText]}>{p.price}</Text>
          <Text style={[styles.planDesc, p.isAvailable === false && styles.disabledText]}>{p.description}</Text>

          <TouchableOpacity
            style={[
              styles.selectBtn, 
              p.isPopular && styles.selectBtnPopular, 
              p.isAvailable === false && styles.selectBtnDisabled,
              currentPlanId === p.id && styles.selectBtnCurrent
            ]}
            onPress={() => onSelectPlan(p.id)}
            disabled={isLoading || p.isAvailable === false || currentPlanId === p.id}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={[
                  styles.selectText, 
                  p.isPopular && styles.selectTextPopular,
                  currentPlanId === p.id && styles.selectTextCurrent
                ]}>
                  {p.isAvailable === false 
                    ? 'Coming Soon' 
                    : currentPlanId === p.id 
                      ? '✓ Currently Active' 
                      : Platform.OS === 'ios'
                        ? 'Continue to App Store'
                        : Platform.OS === 'android'
                          ? 'Continue to Google Play'
                          : 'Continue to Stripe Checkout'}
                </Text>
                {!isLoading && p.isAvailable !== false && currentPlanId !== p.id && (
                  <Text style={styles.selectSubtext}>
                    {Platform.OS === 'ios' || Platform.OS === 'android'
                      ? 'Secure in-app purchase'
                      : 'Secure payment with Stripe'}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      ))}

      {Platform.OS !== 'web' && onRestore && (
        <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} disabled={!!isRestoring}>
          {isRestoring ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 12 },
  header: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subheader: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 12, position: 'relative' },
  cardPopular: { borderColor: '#3B82F6' },
  cardDisabled: { opacity: 0.6, backgroundColor: '#F3F4F6' },
  badge: { position: 'absolute', top: -8, left: 16, right: 16, backgroundColor: '#3B82F6', paddingVertical: 4, borderRadius: 12, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  planName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#3B82F6', marginTop: 6 },
  planDesc: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  disabledText: { color: '#9CA3AF' },
  selectBtn: { backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  selectBtnPopular: { backgroundColor: '#3B82F6' },
  selectBtnDisabled: { backgroundColor: '#E5E7EB' },
  selectBtnCurrent: { backgroundColor: '#10B981' },
  selectText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  selectTextPopular: { color: '#fff' },
  selectTextCurrent: { color: '#fff' },
  selectSubtext: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  restoreBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#3B82F6' },
  restoreText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
});

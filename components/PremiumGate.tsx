import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { router } from 'expo-router';

interface PremiumGateProps {
  children?: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  ctaLabel?: string;
}

export default function PremiumGate({
  children,
  fallbackTitle = 'Upgrade Required',
  fallbackMessage = 'Your free trial has ended. Upgrade to continue.',
  ctaLabel = 'View Plans',
}: PremiumGateProps) {
  const { isPaid, isTrialExpired } = useSubscription();

  if (!isTrialExpired || isPaid) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{fallbackTitle}</Text>
        <Text style={styles.message}>{fallbackMessage}</Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/subscription-plans')}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' as any } : {}),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  cta: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

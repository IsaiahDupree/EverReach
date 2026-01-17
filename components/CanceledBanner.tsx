/**
 * Canceled Banner Component
 * 
 * Displays banner when subscription is canceled but still has access until period end
 * Shows remaining access date and option to resubscribe
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEntitlements } from '@/providers/EntitlementsProviderV3';
import { AlertCircle } from 'lucide-react-native';

export function CanceledBanner() {
  const router = useRouter();
  const { entitlements } = useEntitlements();

  // Only show if subscription is canceled and we have a period end date
  if (!entitlements || !entitlements.current_period_end) {
    return null;
  }

  // Check if subscription is canceled (status or explicit canceledAt)
  const status = entitlements.subscription_status?.toLowerCase();
  const isCanceled =
    status === 'canceled' ||
    !!entitlements.canceled_at;

  if (!isCanceled) {
    return null;
  }

  // Format the end date
  const endDate = new Date(entitlements.current_period_end).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePress = () => {
    router.push('/subscription-plans');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <AlertCircle size={20} color="#FFFFFF" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            Subscription canceled
          </Text>
          <Text style={styles.subtext}>
            Access until {endDate}
          </Text>
        </View>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
});

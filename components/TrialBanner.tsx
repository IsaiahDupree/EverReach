/**
 * Trial Banner Component
 * 
 * Displays a banner when user is in trial period showing days remaining
 * Tapping navigates to upgrade screen
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEntitlements } from '@/providers/EntitlementsProviderV3';
import { Clock } from 'lucide-react-native';

export function TrialBanner() {
  const router = useRouter();
  const { entitlements } = useEntitlements();

  // Only show if in trial and have trial_ends_at date
  const status = entitlements?.subscription_status?.toLowerCase();
  if (
    !entitlements ||
    status !== 'trial' || // Only show for trial status
    !entitlements.trial_ends_at
  ) {
    return null;
  }

  // Calculate days remaining
  const trialEndsDate = new Date(entitlements.trial_ends_at);
  const now = new Date();
  const daysLeft = Math.ceil(
    (trialEndsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Don't show if trial already ended (should be handled by backend, but safety check)
  if (daysLeft <= 0) {
    return null;
  }

  const handlePress = () => {
    router.push({
      pathname: '/upgrade-onboarding',
      params: { source: 'trial_banner' },
    } as any);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Clock size={20} color="#FFFFFF" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            Trial ends in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </Text>
          <Text style={styles.subtext}>
            Upgrade now to keep your features
          </Text>
        </View>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9500',
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

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { SubscriptionRepo, Entitlements } from '@/repos/SubscriptionRepo';

interface SubscriptionCancellationBannerProps {
  entitlements?: Entitlements;
}

export function SubscriptionCancellationBanner({ entitlements }: SubscriptionCancellationBannerProps) {
  const subscription = useSubscription();
  
  // Use entitlements prop if provided, otherwise fall back to subscription provider
  const cancelAtPeriodEnd = entitlements?.cancel_at_period_end ?? false;
  const currentPeriodEnd = entitlements?.current_period_end ?? null;

  if (!cancelAtPeriodEnd || !currentPeriodEnd) {
    return null;
  }

  const endDate = new Date(currentPeriodEnd);
  const formattedDate = endDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleReactivate = async () => {
    // Open billing portal or settings
    try {
      const portal = await SubscriptionRepo.createPortalSession({
        return_url: 'everreach://settings/billing',
      });
      if (portal.url) {
        Linking.openURL(portal.url);
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Subscription Ending</Text>
        <Text style={styles.message}>
          Your subscription will end on {formattedDate}. Reactivate to keep your access.
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleReactivate}>
        <Text style={styles.buttonText}>Reactivate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#78350f',
  },
  button: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

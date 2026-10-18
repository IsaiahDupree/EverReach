import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { SubscriptionRepo } from '@/repos/SubscriptionRepo';

interface CancelSubscriptionButtonProps {
  style?: any;
  textStyle?: any;
}

export function CancelSubscriptionButton({ style, textStyle }: CancelSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const { refreshEntitlements, paymentPlatform, isPaid } = useSubscription();

  // Don't show button if not subscribed or already canceled
  if (!isPaid) {
    return null;
  }

  const handleCancel = async () => {
    // Confirm cancellation
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.',
      [
        {
          text: 'Keep Subscription',
          style: 'cancel',
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await SubscriptionRepo.cancelSubscription({
                scope: 'primary',
                when: 'period_end',
                reason: 'user_request',
              });

              if (result.success) {
                if (result.cancel_method === 'server') {
                  // Stripe: Server-side cancellation successful
                  Alert.alert(
                    'Subscription Canceled',
                    `Your subscription has been canceled. You'll retain access until ${result.access_until ? new Date(result.access_until).toLocaleDateString() : 'the end of your billing period'}.`,
                    [{ text: 'OK' }]
                  );
                  await refreshEntitlements();
                } else if (result.cancel_method === 'store') {
                  // App Store / Play Store: Redirect to manage URL
                  if (result.manage_url) {
                    Alert.alert(
                      'Manage Subscription',
                      result.instructions || 'Please cancel your subscription through the store. We\'ll update your status automatically.',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Open Store',
                          onPress: () => {
                            Linking.openURL(result.manage_url!);
                          },
                        },
                      ]
                    );
                  }
                }
              } else {
                Alert.alert(
                  'Cancellation Failed',
                  'Unable to cancel your subscription. Please try again or contact support.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Cancellation error:', error);
              Alert.alert(
                'Error',
                'An error occurred while canceling your subscription. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const buttonText = paymentPlatform === 'stripe' 
    ? 'Cancel Subscription' 
    : 'Manage Subscription';

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleCancel}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

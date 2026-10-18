import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { XCircle } from 'lucide-react-native';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function BillingCancel() {
  const router = useRouter();
  
  const screenAnalytics = useAnalytics('BillingCancel');

  useEffect(() => {
    screenAnalytics.track('subscription_checkout_cancelled', {
      payment_platform: 'stripe',
    });
  }, []);

  const handleTryAgain = () => {
    screenAnalytics.track('subscription_checkout_retry');
    router.replace('/subscription-plans');
  };

  const handleGoHome = () => {
    screenAnalytics.track('subscription_checkout_cancel_confirmed');
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <XCircle size={80} color="#6B7280" />
        </View>

        <Text style={styles.title}>Checkout Cancelled</Text>
        <Text style={styles.subtitle}>
          No worries! You can upgrade to premium anytime. Your free trial is still active.
        </Text>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>With EverReach Pro, you get:</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Unlimited contacts and interactions</Text>
            <Text style={styles.infoItem}>• AI-powered relationship insights</Text>
            <Text style={styles.infoItem}>• Advanced analytics and reports</Text>
            <Text style={styles.infoItem}>• Priority customer support</Text>
            <Text style={styles.infoItem}>• Cloud sync across all devices</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleTryAgain}
          testID="try-again-button"
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGoHome}
          testID="go-home-button"
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
});

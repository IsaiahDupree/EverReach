import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';

export default function BillingSuccess() {
  const router = useRouter();
  const { refreshEntitlements, tier, isPaid } = useSubscription();
  
  const screenAnalytics = useAnalytics('BillingSuccess', {
    screenProperties: {
      tier,
      is_paid: isPaid,
    },
  });

  useEffect(() => {
    // Refresh entitlements after successful payment
    const refresh = async () => {
      try {
        await refreshEntitlements();
        
        screenAnalytics.track('subscription_success_viewed', {
          tier,
          payment_platform: 'stripe',
        });
      } catch (e) {
        console.error('[BillingSuccess] Refresh error:', e);
      }
    };
    
    refresh();
  }, []);

  const handleContinue = () => {
    screenAnalytics.track('subscription_success_continue');
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={80} color="#10B981" />
        </View>

        <Text style={styles.title}>Welcome to EverReach Pro!</Text>
        <Text style={styles.subtitle}>
          Your subscription is now active. You have access to all premium features.
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.featureText}>Unlimited contacts</Text>
          </View>
          <View style={styles.featureRow}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.featureText}>AI-powered insights</Text>
          </View>
          <View style={styles.featureRow}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.featureText}>Advanced analytics</Text>
          </View>
          <View style={styles.featureRow}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.featureText}>Priority support</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          testID="continue-button"
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.replace('/subscription-plans')}
        >
          <Text style={styles.linkText}>View Subscription Details</Text>
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
    backgroundColor: '#ECFDF5',
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
  featuresContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    color: '#7C3AED',
    fontSize: 15,
    fontWeight: '600',
  },
});

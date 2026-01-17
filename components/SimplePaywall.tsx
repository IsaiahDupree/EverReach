import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePaywall } from '@/providers/PaywallProvider';
import { trackPaywallEvent } from '@/lib/paywallAnalytics';

interface SimplePaywallProps {
  onDismiss?: () => void;
}

export default function SimplePaywall({ onDismiss }: SimplePaywallProps) {
  const router = useRouter();
  const { config, userState, implementation, setImplementation, refreshConfig } = usePaywall();
  const [isLoading, setIsLoading] = useState(false);

  console.log('\n🎨 [SimplePaywall] Rendering');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Implementation: ${implementation}`);
  console.log(`   Config Mode: ${config?.strategy.mode}`);
  console.log(`   Can Skip: ${config?.strategy.can_skip}`);
  console.log(`   User Premium: ${userState.isPremium}`);
  console.log(`   Trial Expired: ${userState.isTrialExpired}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Track impression
  React.useEffect(() => {
    trackPaywallEvent('impression', {
      source: 'simple_paywall',
      implementation,
      config_mode: config?.strategy.mode,
    });
  }, []);

  const handleSubscribe = async () => {
    console.log('🔘 [SimplePaywall] Subscribe button clicked');
    setIsLoading(true);
    
    await trackPaywallEvent('cta_click', {
      button: 'subscribe',
      implementation,
    });

    // Simulate purchase flow
    setTimeout(() => {
      setIsLoading(false);
      console.log('✅ [SimplePaywall] Would navigate to purchase flow');
      // In real app: router.push('/purchase') or open RevenueCat/Stripe
      alert('Purchase flow would open here!\nImplementation: ' + implementation);
    }, 1000);
  };

  const handleSkip = async () => {
    console.log('⏭️  [SimplePaywall] Skip button clicked');
    
    await trackPaywallEvent('skipped', {
      implementation,
    });

    if (onDismiss) {
      onDismiss();
    } else {
      // Safe navigation: Try to go back, but if there's no screen to go back to,
      // navigate to home instead of throwing navigation error
      try {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.warn('[SimplePaywall] Navigation error, going to home:', error);
        router.replace('/');
      }
    }
  };

  const handleRefreshConfig = async () => {
    console.log('🔄 [SimplePaywall] Refresh config button clicked');
    setIsLoading(true);
    await refreshConfig();
    setIsLoading(false);
  };

  const handleSwitchImplementation = async (impl: 'custom' | 'revenuecat' | 'superwall') => {
    console.log(`🔄 [SimplePaywall] Switching to ${impl}`);
    await setImplementation(impl);
  };

  if (!config) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading paywall config...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Close Button (Always visible when onDismiss provided - for Android testing) */}
      {onDismiss && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Unlock Premium</Text>
        <Text style={styles.subtitle}>
          {config.strategy.name}
        </Text>
      </View>

      {/* User State Display */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📊 Current State</Text>
        <Text style={styles.infoText}>Premium: {userState.isPremium ? '✅ Yes' : '❌ No'}</Text>
        <Text style={styles.infoText}>Trial Expired: {userState.isTrialExpired ? '⚠️ Yes' : '✅ No'}</Text>
        {userState.trialEndDate && (
          <Text style={styles.infoText}>
            Trial Ends: {new Date(userState.trialEndDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Config Display */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>⚙️ Paywall Config</Text>
        <Text style={styles.infoText}>Mode: {config.strategy.mode}</Text>
        <Text style={styles.infoText}>Can Skip: {config.strategy.can_skip ? '✅ Yes' : '❌ No'}</Text>
        <Text style={styles.infoText}>Trial: {config.trial.duration_days} days</Text>
        <Text style={styles.infoText}>Variant: {config.presentation.variant}</Text>
      </View>

      {/* Implementation Switcher */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💳 Implementation</Text>
        <Text style={styles.infoText}>Current: {implementation}</Text>
        
        <View style={styles.implementationButtons}>
          <TouchableOpacity
            style={[styles.smallButton, implementation === 'custom' && styles.smallButtonActive]}
            onPress={() => handleSwitchImplementation('custom')}
          >
            <Text style={[styles.smallButtonText, implementation === 'custom' && styles.smallButtonTextActive]}>
              Custom
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallButton, implementation === 'revenuecat' && styles.smallButtonActive]}
            onPress={() => handleSwitchImplementation('revenuecat')}
          >
            <Text style={[styles.smallButtonText, implementation === 'revenuecat' && styles.smallButtonTextActive]}>
              RevenueCat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallButton, implementation === 'superwall' && styles.smallButtonActive]}
            onPress={() => handleSwitchImplementation('superwall')}
          >
            <Text style={[styles.smallButtonText, implementation === 'superwall' && styles.smallButtonTextActive]}>
              Superwall
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <Text style={styles.featuresTitle}>✨ Premium Features</Text>
        <FeatureItem text="Unlimited contacts & interactions" />
        <FeatureItem text="AI-powered insights & messages" />
        <FeatureItem text="Advanced analytics & reports" />
        <FeatureItem text="Priority support" />
      </View>

      {/* Subscribe Button */}
      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={handleSubscribe}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.subscribeButtonText}>
            Subscribe Now - ${config.trial.type === 'time_based' ? '9.99/mo' : 'See Plans'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Trial Info */}
      {config.trial.type === 'time_based' && (
        <Text style={styles.trialText}>
          ⏱️ Try free for {config.trial.duration_days} days, then $9.99/month
        </Text>
      )}

      {/* Skip Button (Conditional) */}
      {config.strategy.can_skip && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      )}

      {/* Testing Buttons */}
      <View style={styles.testingSection}>
        <Text style={styles.testingSectionTitle}>🧪 Testing</Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleRefreshConfig}
          disabled={isLoading}
        >
          <Text style={styles.testButtonText}>
            🔄 Refresh Config (Check Dashboard Changes)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.testButton}
          onPress={() => {
            console.log('📊 Current Config:', config);
            console.log('📊 User State:', userState);
            alert('Check console for full state dump!');
          }}
        >
          <Text style={styles.testButtonText}>
            📊 Dump State to Console
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Mode: {config.strategy.mode.toUpperCase()} | 
        {config.strategy.can_skip ? ' Skippable' : ' Not Skippable'}
      </Text>
    </ScrollView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureCheckmark}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  implementationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  smallButtonActive: {
    backgroundColor: '#3B82F6',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  smallButtonTextActive: {
    color: '#fff',
  },
  features: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheckmark: {
    fontSize: 18,
    color: '#10B981',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#4B5563',
  },
  subscribeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  trialText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  testingSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  testingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  testButtonText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 20,
    marginBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

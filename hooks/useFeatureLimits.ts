/**
 * Feature Limits Hook
 * Check usage against subscription limits and enforce restrictions
 */

import { useSubscription } from '@/providers/SubscriptionProvider';
import { usePeople } from '@/providers/PeopleProvider';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export interface FeatureLimits {
  contacts: number;
  aiMessages: number;
  screenshots: number;
  voiceNotes: number;
}

export interface FeatureUsage {
  contacts: number;
  aiMessages: number;
  screenshots: number;
  voiceNotes: number;
}

const DEFAULT_LIMITS: Record<string, FeatureLimits> = {
  free: {
    contacts: 50,
    aiMessages: 100,
    screenshots: 10,
    voiceNotes: 0, // No voice notes on free plan
  },
  pro: {
    contacts: -1, // Unlimited
    aiMessages: 500,
    screenshots: -1, // Unlimited
    voiceNotes: -1, // Unlimited
  },
  team: {
    contacts: -1, // Unlimited
    aiMessages: -1, // Unlimited
    screenshots: -1, // Unlimited
    voiceNotes: -1, // Unlimited
  },
};

export function useFeatureLimits() {
  const router = useRouter();
  const { isPaid, billingSubscription } = useSubscription();
  const { people } = usePeople();

  // Get current plan
  const currentPlan = billingSubscription?.subscription?.plan || 'free';
  
  // Get limits from subscription or defaults
  const subscriptionLimits = billingSubscription?.subscription?.limits;
  const limits: FeatureLimits = subscriptionLimits ? {
    contacts: subscriptionLimits.contacts,
    aiMessages: subscriptionLimits.ai_messages,
    screenshots: subscriptionLimits.screenshots || -1,
    voiceNotes: -1, // Always unlimited for paid plans
  } : DEFAULT_LIMITS[currentPlan];

  // Calculate current usage
  const usage: FeatureUsage = {
    contacts: people?.length || 0,
    aiMessages: 0, // TODO: Get from usage tracking
    screenshots: 0, // TODO: Get from usage tracking
    voiceNotes: 0, // TODO: Get from usage tracking
  };

  // Check if feature is available
  const canUseFeature = (feature: keyof FeatureLimits): boolean => {
    // Paid users get access to all features (unless specific limits apply)
    if (isPaid || currentPlan !== 'free') {
      const limit = limits[feature];
      // -1 means unlimited
      if (limit === -1) return true;
      // Check if under limit
      return usage[feature] < limit;
    }
    // Free users are limited
    return false;
  };

  // Check if limit is reached
  const isLimitReached = (feature: keyof FeatureLimits): boolean => {
    const limit = limits[feature];
    if (limit === -1) return false; // Unlimited
    return usage[feature] >= limit;
  };

  // Get remaining count
  const getRemaining = (feature: keyof FeatureLimits): number => {
    const limit = limits[feature];
    if (limit === -1) return Infinity;
    return Math.max(0, limit - usage[feature]);
  };

  // Get usage percentage
  const getUsagePercentage = (feature: keyof FeatureLimits): number => {
    const limit = limits[feature];
    if (limit === -1) return 0;
    return Math.min(100, (usage[feature] / limit) * 100);
  };

  // Show upgrade prompt with specific feature context
  const showUpgradePrompt = (feature: keyof FeatureLimits, action: string = 'use this feature') => {
    const featureNames = {
      contacts: 'Add More Contacts',
      aiMessages: 'Send More AI Messages',
      screenshots: 'Analyze More Screenshots',
      voiceNotes: 'Record Voice Notes',
    };

    Alert.alert(
      'Upgrade Required',
      `You've reached the limit for ${featureNames[feature]}. Upgrade to continue.`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        {
          text: 'View Plans',
          onPress: () => router.push('/settings/billing'),
        },
      ]
    );
  };

  // Enforce limit before action
  const enforceLimit = (feature: keyof FeatureLimits, action: string = 'continue'): boolean => {
    if (!canUseFeature(feature)) {
      if (currentPlan === 'free') {
        // Free plan - show upgrade prompt
        showUpgradePrompt(feature, action);
        return false;
      } else if (isLimitReached(feature)) {
        // Paid plan but limit reached
        showUpgradePrompt(feature, action);
        return false;
      }
    }
    return true;
  };

  // Show warning when approaching limit
  const showLimitWarning = (feature: keyof FeatureLimits, threshold: number = 80) => {
    const percentage = getUsagePercentage(feature);
    if (percentage >= threshold && percentage < 100) {
      const remaining = getRemaining(feature);
      Alert.alert(
        'Approaching Limit',
        `You have ${remaining} ${feature} remaining. Consider upgrading for unlimited access.`,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/settings/billing'),
          },
        ]
      );
    }
  };

  return {
    // Limits and usage
    limits,
    usage,
    currentPlan,
    isPaid,

    // Check functions
    canUseFeature,
    isLimitReached,
    getRemaining,
    getUsagePercentage,

    // Action functions
    enforceLimit,
    showUpgradePrompt,
    showLimitWarning,

    // Specific feature checks (convenience methods)
    canAddContact: () => canUseFeature('contacts'),
    canSendAIMessage: () => canUseFeature('aiMessages'),
    canAnalyzeScreenshot: () => canUseFeature('screenshots'),
    canRecordVoiceNote: () => canUseFeature('voiceNotes'),
  };
}

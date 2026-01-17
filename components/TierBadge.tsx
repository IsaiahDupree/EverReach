/**
 * Tier Badge Component
 * 
 * Displays user's subscription tier with appropriate styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useEntitlements, SubscriptionTier } from '@/providers/EntitlementsProviderV3';

interface TierBadgeProps {
  /**
   * Size variant
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Show only for paid users
   */
  paidOnly?: boolean;
}

export default function TierBadge({ size = 'medium', paidOnly = true }: TierBadgeProps) {
  const { entitlements, loading } = useEntitlements();

  // Don't show during loading
  if (loading || !entitlements) {
    return null;
  }

  // Don't show for free users if paidOnly is true
  if (paidOnly && entitlements.tier === 'free') {
    return null;
  }

  const tier = entitlements.tier;
  const colors = getTierColors(tier);
  const label = getTierLabel(tier);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }, sizeStyles.container]}>
      <Text style={[styles.text, { color: colors.text }, sizeStyles.text]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Get colors for tier
 */
function getTierColors(tier: SubscriptionTier) {
  const colorMap = {
    free: {
      background: '#E5E7EB',
      text: '#6B7280',
    },
    core: {
      background: '#DBEAFE',
      text: '#1E40AF',
    },
    pro: {
      background: '#FDE68A',
      text: '#92400E',
    },
    team: {
      background: '#D1FAE5',
      text: '#065F46',
    },
  };

  return colorMap[tier];
}

/**
 * Get display label for tier
 */
function getTierLabel(tier: SubscriptionTier): string {
  const labelMap: Record<SubscriptionTier, string> = {
    free: 'FREE',
    core: 'CORE',
    pro: 'PRO',
    team: 'TEAM',
  };

  return labelMap[tier];
}

/**
 * Get size-specific styles
 */
function getSizeStyles(size: 'small' | 'medium' | 'large') {
  const sizeMap = {
    small: {
      container: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
      },
      text: {
        fontSize: 10,
      },
    },
    medium: {
      container: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
      },
      text: {
        fontSize: 12,
      },
    },
    large: {
      container: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
      },
      text: {
        fontSize: 14,
      },
    },
  };

  return sizeMap[size];
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

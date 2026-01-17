/**
 * Plan Card Component
 * Displays subscription plan details with features and pricing
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Sparkles } from 'lucide-react-native';
import type { SubscriptionPlan } from '@/types/subscription';

interface PlanCardProps {
  plan: SubscriptionPlan;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function PlanCard({
  plan,
  name,
  price,
  billingPeriod,
  features,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
  disabled = false,
}: PlanCardProps) {
  return (
    <View style={[styles.card, isPopular && styles.popularCard]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Sparkles size={12} color="#ffffff" />
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.planName}>{name}</Text>
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentText}>Current Plan</Text>
          </View>
        )}
      </View>

      <View style={styles.pricing}>
        <Text style={styles.price}>${price}</Text>
        <Text style={styles.period}>/{billingPeriod === 'monthly' ? 'month' : 'year'}</Text>
      </View>

      {billingPeriod === 'yearly' && (
        <Text style={styles.savings}>Save {Math.round((1 - price / 12 / (price / 12)) * 100)}% vs monthly</Text>
      )}

      <View style={styles.features}>
        {features.map((feature, index) => (
          <View key={index} style={styles.feature}>
            <Check size={16} color="#10b981" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isCurrentPlan && styles.currentButton,
          disabled && styles.disabledButton,
        ]}
        onPress={onSelect}
        disabled={disabled || isCurrentPlan}
      >
        <Text style={[styles.buttonText, isCurrentPlan && styles.currentButtonText]}>
          {isCurrentPlan ? 'Current Plan' : disabled ? 'Unavailable' : 'Select Plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 24,
    marginBottom: 16,
  },
  popularCard: {
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  currentBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  period: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  savings: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 16,
  },
  features: {
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentButtonText: {
    color: '#6b7280',
  },
});

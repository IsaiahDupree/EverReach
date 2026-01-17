/**
 * Subscription Status Banner Component
 * Displays status messages for trial, active, grace, and canceled states
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, Calendar, XCircle, CheckCircle } from 'lucide-react-native';
import type { SubscriptionStatus } from '@/types/subscription';

interface SubscriptionStatusBannerProps {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  onAction?: () => void;
}

export function SubscriptionStatusBanner({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  onAction,
}: SubscriptionStatusBannerProps) {
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Trial status
  if (status === 'trial') {
    return (
      <View style={[styles.banner, styles.trialBanner]}>
        <Calendar size={20} color="#2563eb" />
        <View style={styles.content}>
          <Text style={styles.title}>Trial Active</Text>
          <Text style={styles.message}>
            {currentPeriodEnd
              ? `Your trial ends on ${formatDate(currentPeriodEnd)}`
              : 'Enjoying your trial? Upgrade to continue!'}
          </Text>
        </View>
        {onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionButtonText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Active with pending cancellation
  if (status === 'active' && cancelAtPeriodEnd) {
    return (
      <View style={[styles.banner, styles.warningBanner]}>
        <AlertCircle size={20} color="#f59e0b" />
        <View style={styles.content}>
          <Text style={styles.title}>Subscription Canceling</Text>
          <Text style={styles.message}>
            Your subscription will end on {formatDate(currentPeriodEnd)}. Renew to keep
            premium features.
          </Text>
        </View>
        {onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionButtonText}>Renew</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Grace period (payment issue)
  if (status === 'grace') {
    return (
      <View style={[styles.banner, styles.errorBanner]}>
        <AlertCircle size={20} color="#dc2626" />
        <View style={styles.content}>
          <Text style={styles.title}>Payment Issue</Text>
          <Text style={styles.message}>
            There was a problem with your payment. Please update your billing information.
          </Text>
        </View>
        {onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Canceled
  if (status === 'canceled') {
    return (
      <View style={[styles.banner, styles.errorBanner]}>
        <XCircle size={20} color="#dc2626" />
        <View style={styles.content}>
          <Text style={styles.title}>Plan Canceled</Text>
          <Text style={styles.message}>
            Your subscription has been canceled. Upgrade to restore premium features.
          </Text>
        </View>
        {onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionButtonText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Active subscription (no banner needed)
  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    marginBottom: 16,
  },
  trialBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  warningBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

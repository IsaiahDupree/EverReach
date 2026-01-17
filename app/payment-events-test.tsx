/**
 * Payment Events Test Screen
 * 
 * Real-time monitor for RevenueCat and Superwall events
 * Useful for testing and debugging payment flows
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Activity, Trash2, Download, Play, RefreshCcw, ArrowLeft } from 'lucide-react-native';
import { paymentEventLogger, PaymentEvent } from '@/lib/paymentEventLogger';
import { useSubscription } from '@/providers/SubscriptionProvider';

export default function PaymentEventsTestScreen() {
  const router = useRouter();
  const { isPaid, isTrialExpired, trialDaysRemaining } = useSubscription();
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Subscribe to new events
  useEffect(() => {
    // Initial load
    setEvents(paymentEventLogger.getEvents());

    // Subscribe to updates
    const unsubscribe = paymentEventLogger.subscribe((event) => {
      if (autoRefresh) {
        setEvents(paymentEventLogger.getEvents());
      }
    });

    return unsubscribe;
  }, [autoRefresh]);

  // Manual refresh
  const handleRefresh = () => {
    setEvents(paymentEventLogger.getEvents());
  };

  // Clear all events
  const handleClear = () => {
    Alert.alert(
      'Clear Events',
      'Are you sure you want to clear all logged events?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            paymentEventLogger.clearEvents();
            setEvents([]);
          },
        },
      ]
    );
  };

  // Export events
  const handleExport = async () => {
    const json = paymentEventLogger.exportEvents();
    
    if (Platform.OS === 'web') {
      // Copy to clipboard on web
      Alert.alert('Exported', 'Events JSON copied to console');
      console.log('=== EXPORTED PAYMENT EVENTS ===');
      console.log(json);
    } else {
      // Share on mobile
      try {
        await Share.share({
          message: json,
          title: 'Payment Events Export',
        });
      } catch (err) {
        console.error('[PaymentEventsTest] Share error:', err);
      }
    }
  };

  // Trigger test event
  const handleTestRevenueCat = () => {
    paymentEventLogger.logRevenueCat('test_event', {
      message: 'Manual test event',
      timestamp: new Date().toISOString(),
    });
  };

  const handleTestSuperwall = () => {
    paymentEventLogger.logSuperwall('test_event', {
      message: 'Manual test event',
      timestamp: new Date().toISOString(),
    });
  };

  // Navigate to trigger actual events
  const handleGoToPlans = () => {
    router.push('/subscription-plans');
  };

  const handleGoToUpgrade = () => {
    router.push('/upgrade-onboarding');
  };

  const summary = paymentEventLogger.getSummary();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Payment Events Monitor',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Summary Header */}
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Events</Text>
            <Text style={styles.summaryValue}>{summary.total}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>RevenueCat</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{summary.revenueCat}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Superwall</Text>
            <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{summary.superwall}</Text>
          </View>
        </View>

        {/* Subscription Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Subscription Status</Text>
          <Text style={styles.statusValue}>
            {isPaid ? '✅ Paid' : isTrialExpired ? '⚠️ Trial Expired' : `🆓 Trial (${trialDaysRemaining}d left)`}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleRefresh}>
          <RefreshCcw size={16} color="#FFFFFF" />
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleClear}>
          <Trash2 size={16} color="#FFFFFF" />
          <Text style={styles.actionText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleExport}>
          <Download size={16} color="#FFFFFF" />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Test Triggers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trigger Real Events</Text>
        <View style={styles.triggerRow}>
          <TouchableOpacity style={styles.triggerBtn} onPress={handleGoToPlans}>
            <Text style={styles.triggerText}>View Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.triggerBtn} onPress={handleGoToUpgrade}>
            <Text style={styles.triggerText}>Upgrade Screen</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>
          Navigate to these screens and perform actions to generate events
        </Text>
      </View>

      {/* Test Event Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Test Events</Text>
        <View style={styles.triggerRow}>
          <TouchableOpacity style={[styles.triggerBtn, { backgroundColor: '#10B981' }]} onPress={handleTestRevenueCat}>
            <Text style={styles.triggerText}>Test RC Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.triggerBtn, { backgroundColor: '#3B82F6' }]} onPress={handleTestSuperwall}>
            <Text style={styles.triggerText}>Test SW Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Events List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Activity size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No events logged yet</Text>
            <Text style={styles.emptySubtext}>
              Navigate to subscription screens and perform actions to see events here
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </ScrollView>

      {/* Auto-refresh toggle */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setAutoRefresh(!autoRefresh)}
        >
          <View style={[styles.toggleIndicator, autoRefresh && styles.toggleActive]} />
          <Text style={styles.toggleText}>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function EventCard({ event }: { event: PaymentEvent }) {
  const [expanded, setExpanded] = useState(false);
  const sourceColor = event.source === 'revenuecat' ? '#10B981' : '#3B82F6';
  const timeAgo = formatTimeAgo(event.timestamp);

  return (
    <TouchableOpacity
      style={[styles.eventCard, { borderLeftColor: sourceColor }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.eventHeader}>
        <View style={[styles.sourceBadge, { backgroundColor: sourceColor }]}>
          <Text style={styles.sourceBadgeText}>
            {event.source === 'revenuecat' ? 'RC' : 'SW'}
          </Text>
        </View>
        <View style={styles.eventHeaderText}>
          <Text style={styles.eventType}>{event.type}</Text>
          <Text style={styles.eventTime}>{timeAgo}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.eventBody}>
          <Text style={styles.eventDataLabel}>Data:</Text>
          <Text style={styles.eventData}>{JSON.stringify(event.data, null, 2)}</Text>
          {event.metadata && (
            <>
              <Text style={[styles.eventDataLabel, { marginTop: 8 }]}>Metadata:</Text>
              <Text style={styles.eventData}>{JSON.stringify(event.metadata, null, 2)}</Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerButton: {
    padding: 8,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statusCard: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  triggerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  triggerBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  triggerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  eventHeaderText: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  eventBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  eventDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  eventData: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#374151',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  toggleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});

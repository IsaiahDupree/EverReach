/**
 * Example: PaywallEvents Hook Usage
 * 
 * Demonstrates how to use usePaywallEvents for tracking and analytics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { usePaywallEvents, emitPaywallPresent, emitPaywallDismiss, emitSubscriptionStatusChange } from '@/hooks/usePaywallEvents';

export default function EventTrackingExample() {
  const [events, setEvents] = useState<string[]>([]);

  // Track all paywall and subscription events
  usePaywallEvents({
    onPaywallPresent: (info) => {
      const msg = `📱 Paywall Presented: ${info.name}`;
      console.log(msg, info);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onPaywallDismiss: (info, result) => {
      const msg = `🚪 Paywall Dismissed: ${result.type}`;
      console.log(msg, { info, result });
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onPaywallSkip: (reason) => {
      const msg = `⏭️ Paywall Skipped: ${reason.reason}`;
      console.log(msg, reason);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onPaywallError: (error) => {
      const msg = `❌ Paywall Error: ${error}`;
      console.error(msg);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onSubscriptionStatusChange: (status) => {
      const msg = `💳 Subscription Changed: ${status.status}`;
      console.log(msg, status);
      setEvents(prev => [msg, ...prev].slice(0, 20));
      
      // Show celebration for new subscriptions
      if (status.status === 'ACTIVE') {
        // Trigger confetti or success animation
        console.log('🎉 User became a subscriber!');
      }
    },
    
    willPresentPaywall: (info) => {
      const msg = `⏳ Will Present Paywall: ${info.name}`;
      console.log(msg);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    didPresentPaywall: (info) => {
      const msg = `✅ Did Present Paywall: ${info.name}`;
      console.log(msg);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onCustomPaywallAction: (name) => {
      const msg = `⚡ Custom Action: ${name}`;
      console.log(msg);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onPaywallEvent: (eventInfo) => {
      const msg = `📊 Event: ${eventInfo.event}`;
      console.log(msg, eventInfo);
      setEvents(prev => [msg, ...prev].slice(0, 20));
    },
    
    onLog: (params) => {
      if (params.level === 'error') {
        console.error(`[${params.scope}]`, params.message, params.error);
      } else {
        console.log(`[${params.scope}]`, params.message);
      }
    },
  });

  // Test event emitters
  const testPaywallPresent = () => {
    emitPaywallPresent({
      name: 'Premium Features',
      slug: 'premium',
      presentedAt: new Date().toISOString(),
    });
  };

  const testPaywallDismiss = () => {
    emitPaywallDismiss(
      {
        name: 'Premium Features',
        slug: 'premium',
        presentedAt: new Date().toISOString(),
      },
      {
        type: 'closed',
      }
    );
  };

  const testSubscriptionChange = () => {
    emitSubscriptionStatusChange({
      status: 'ACTIVE',
      tier: 'pro',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Event Tracking Example',
          headerBackTitle: 'Back',
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.title}>Paywall Event Tracking</Text>
          <Text style={styles.subtitle}>
            All paywall and subscription events are logged below
          </Text>
        </View>

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Event Emitters</Text>
          
          <TouchableOpacity style={styles.button} onPress={testPaywallPresent}>
            <Text style={styles.buttonText}>📱 Emit Paywall Present</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testPaywallDismiss}>
            <Text style={styles.buttonText}>🚪 Emit Paywall Dismiss</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testSubscriptionChange}>
            <Text style={styles.buttonText}>💳 Emit Subscription Change</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => router.push('/paywall')}>
            <Text style={styles.buttonText}>🎨 Open Real Paywall</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearEvents}>
            <Text style={styles.buttonText}>🗑️ Clear Events</Text>
          </TouchableOpacity>
        </View>

        {/* Event Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Log ({events.length})</Text>
          
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events yet</Text>
              <Text style={styles.emptySubtext}>
                Trigger events using the buttons above or navigate to the paywall
              </Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {events.map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <Text style={styles.eventText}>{event}</Text>
                  <Text style={styles.eventTime}>
                    {new Date().toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Integration Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integration Notes</Text>
          <View style={styles.note}>
            <Text style={styles.noteText}>
              • Use `usePaywallEvents` at the root of your app to track all events
            </Text>
            <Text style={styles.noteText}>
              • Send events to analytics (PostHog, Mixpanel, etc.)
            </Text>
            <Text style={styles.noteText}>
              • Track conversion funnels (view → click → purchase)
            </Text>
            <Text style={styles.noteText}>
              • Monitor errors and optimize paywall performance
            </Text>
            <Text style={styles.noteText}>
              • Automatically cleaned up on component unmount
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  eventList: {
    gap: 8,
  },
  eventItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  eventText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  note: {
    gap: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

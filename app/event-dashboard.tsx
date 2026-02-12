/**
 * Unified Event Dashboard
 * 
 * Real-time view of ALL events tracked through the app:
 * - Analytics events (analytics.track → Backend + PostHog + Meta)
 * - Meta Pixel events (which analytics events reach Meta)
 * - RevenueCat payment events (purchases, renewals, etc.)
 * 
 * Accessible at /event-dashboard in the app.
 * Use this while navigating the app to verify events fire on user actions.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SHOW_DEV_SETTINGS } from '@/config/dev';
import { subscribeDebugEvents, getDebugEvents, type DebugEvent } from '@/lib/debugEvents';
import { paymentEventLogger, type PaymentEvent } from '@/lib/paymentEventLogger';
import { mapToMetaEvent } from '@/lib/metaAppEvents';

type UnifiedEvent = {
  id: string;
  timestamp: number;
  source: 'analytics' | 'meta' | 'revenuecat' | 'superwall';
  eventName: string;
  metaEvent: string | null;
  props?: Record<string, any>;
};

// Source colors
const SOURCE_COLORS: Record<string, string> = {
  analytics: '#3B82F6',
  meta: '#7C3AED',
  revenuecat: '#F97316',
  superwall: '#EC4899',
};

const SOURCE_LABELS: Record<string, string> = {
  analytics: '📊 Analytics',
  meta: '🟣 Meta',
  revenuecat: '🔶 RevCat',
  superwall: '🩷 Superwall',
};

export default function EventDashboardScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showMetaOnly, setShowMetaOnly] = useState(false);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pausedRef = useRef(false);

  // Keep pausedRef in sync
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Gate behind dev settings
  useEffect(() => {
    if (!SHOW_DEV_SETTINGS) {
      router.replace('/(tabs)/settings');
    }
  }, []);

  // Convert debug events to unified format
  const debugToUnified = useCallback((debugEvents: DebugEvent[]): UnifiedEvent[] => {
    return debugEvents.map((de) => {
      const metaMapping = mapToMetaEvent(de.event);
      return {
        id: `dbg_${de.ts}_${de.event}`,
        timestamp: new Date(de.ts).getTime(),
        source: 'analytics',
        eventName: de.event,
        metaEvent: metaMapping?.metaEvent || null,
        props: de.props,
      };
    });
  }, []);

  // Convert payment events to unified format
  const paymentToUnified = useCallback((pe: PaymentEvent): UnifiedEvent => {
    return {
      id: pe.id,
      timestamp: pe.timestamp,
      source: pe.source === 'revenuecat' ? 'revenuecat' : 'superwall',
      eventName: pe.type,
      metaEvent: null, // Payment events don't go through mapToMetaEvent client-side
      props: pe.data,
    };
  }, []);

  // Subscribe to debug events (analytics.track)
  useEffect(() => {
    // Load existing events
    const existing = getDebugEvents();
    if (existing.length > 0) {
      setEvents((prev) => {
        const unified = debugToUnified(existing);
        // Merge without duplicates
        const existingIds = new Set(prev.map((e) => e.id));
        const newEvents = unified.filter((e) => !existingIds.has(e.id));
        return [...prev, ...newEvents].sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
      });
    }

    const unsub = subscribeDebugEvents((debugEvents) => {
      if (pausedRef.current) return;
      setEvents((prev) => {
        const unified = debugToUnified(debugEvents);
        // Get payment events already in state
        const paymentEvents = prev.filter((e) => e.source !== 'analytics');
        const merged = [...unified, ...paymentEvents]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 200);
        return merged;
      });
    });

    return unsub;
  }, []);

  // Subscribe to payment events (RevenueCat + Superwall)
  useEffect(() => {
    // Load existing payment events
    const existingPayments = paymentEventLogger.getEvents();
    if (existingPayments.length > 0) {
      setEvents((prev) => {
        const unified = existingPayments.map(paymentToUnified);
        const existingIds = new Set(prev.map((e) => e.id));
        const newEvents = unified.filter((e) => !existingIds.has(e.id));
        return [...prev, ...newEvents].sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
      });
    }

    const unsub = paymentEventLogger.subscribe((event) => {
      if (pausedRef.current) return;
      const unified = paymentToUnified(event);
      setEvents((prev) => [unified, ...prev].slice(0, 200));
    });

    return unsub;
  }, []);

  // Auto-scroll on new events
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [events.length]);

  // Filtered events
  const filteredEvents = events.filter((e) => {
    if (filter && e.source !== filter) return false;
    if (showMetaOnly && !e.metaEvent) return false;
    return true;
  });

  // Stats
  const stats = {
    total: events.length,
    analytics: events.filter((e) => e.source === 'analytics').length,
    meta: events.filter((e) => e.metaEvent !== null).length,
    revenuecat: events.filter((e) => e.source === 'revenuecat').length,
    superwall: events.filter((e) => e.source === 'superwall').length,
  };

  const clearEvents = () => setEvents([]);

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Event Dashboard</Text>
        <Text style={styles.subtitle}>Navigate the app to see events fire in real-time</Text>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <TouchableOpacity
          style={[styles.statChip, !filter && styles.statChipActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.statChipText, !filter && styles.statChipTextActive]}>
            All {stats.total}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statChip, filter === 'analytics' && styles.statChipActiveBlue]}
          onPress={() => setFilter(filter === 'analytics' ? null : 'analytics')}
        >
          <Text style={[styles.statChipText, filter === 'analytics' && styles.statChipTextActive]}>
            📊 {stats.analytics}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statChip, showMetaOnly && styles.statChipActivePurple]}
          onPress={() => setShowMetaOnly(!showMetaOnly)}
        >
          <Text style={[styles.statChipText, showMetaOnly && styles.statChipTextActive]}>
            🟣 Meta {stats.meta}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statChip, filter === 'revenuecat' && styles.statChipActiveOrange]}
          onPress={() => setFilter(filter === 'revenuecat' ? null : 'revenuecat')}
        >
          <Text style={[styles.statChipText, filter === 'revenuecat' && styles.statChipTextActive]}>
            🔶 {stats.revenuecat}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Auto-scroll</Text>
          <Switch
            value={autoScroll}
            onValueChange={setAutoScroll}
            trackColor={{ true: '#7C3AED' }}
          />
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>{paused ? '⏸ Paused' : '▶ Live'}</Text>
          <Switch
            value={!paused}
            onValueChange={(v) => setPaused(!v)}
            trackColor={{ true: '#22C55E' }}
          />
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearEvents}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      {filteredEvents.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>Listening for events...</Text>
          <Text style={styles.emptyText}>
            Navigate the app to trigger events.{'\n'}
            They'll appear here in real-time.{'\n\n'}
            Make sure EXPO_PUBLIC_TEST_TELEMETRY=true{'\n'}
            is set in your .env for analytics events.
          </Text>
        </View>
      )}

      {/* Event list */}
      <ScrollView ref={scrollRef} style={styles.eventList} showsVerticalScrollIndicator={false}>
        {filteredEvents.map((event) => (
          <View
            key={event.id}
            style={[
              styles.eventCard,
              { borderLeftColor: SOURCE_COLORS[event.source] || '#555' },
            ]}
          >
            <View style={styles.eventHeader}>
              <View style={styles.eventNameRow}>
                <Text style={[styles.eventSource, { color: SOURCE_COLORS[event.source] }]}>
                  {SOURCE_LABELS[event.source] || event.source}
                </Text>
                {event.metaEvent && (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>→ {event.metaEvent}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.eventTime}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.eventName}>{event.eventName}</Text>
            {event.props && Object.keys(event.props).length > 0 && (
              <Text style={styles.eventProps} numberOfLines={3}>
                {Object.entries(event.props)
                  .filter(([k]) => !['session_id', 'anon_id', 'platform', 'app_version', 'timestamp'].includes(k))
                  .slice(0, 6)
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                  .join('  •  ')}
              </Text>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  statChip: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statChipActive: {
    backgroundColor: '#333',
    borderColor: '#fff',
  },
  statChipActiveBlue: {
    backgroundColor: '#1E3A5F',
    borderColor: '#3B82F6',
  },
  statChipActivePurple: {
    backgroundColor: '#2D1B4E',
    borderColor: '#7C3AED',
  },
  statChipActiveOrange: {
    backgroundColor: '#3D2308',
    borderColor: '#F97316',
  },
  statChipText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  statChipTextActive: {
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
    paddingVertical: 4,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  clearButton: {
    marginLeft: 'auto',
    backgroundColor: '#2E0A0A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#5E1A1A',
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  eventList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  eventCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#252540',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  eventSource: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaBadge: {
    backgroundColor: '#2D1B4E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaBadgeText: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '600',
  },
  eventTime: {
    color: '#555',
    fontSize: 10,
  },
  eventName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventProps: {
    color: '#666',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 14,
  },
});

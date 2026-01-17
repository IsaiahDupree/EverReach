import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Analytics from '@/lib/analytics';
import { getDebugEvents, subscribeDebugEvents, DebugEvent } from '@/lib/debugEvents';

export default function TelemetryDebugScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<DebugEvent[]>(() => getDebugEvents());
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeDebugEvents((evts) => setEvents(evts));
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return events;
    const q = filter.toLowerCase();
    return events.filter(e => e.event.toLowerCase().includes(q));
  }, [events, filter]);

  const simulatePurchase = async () => {
    await Analytics.track('transaction_start', { provider: 'test', platform: Platform.OS });
    setTimeout(async () => {
      await Analytics.track('transaction_complete', { provider: 'test', product_id: 'test_product', platform: Platform.OS });
    }, 200);
  };

  const simulateScreenDuration = async () => {
    // Emit a synthetic duration if needed
    await Analytics.track(Analytics.EVENTS.SCREEN_DURATION, { screen_name: 'TelemetryDebug', duration_ms: 1234 });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Telemetry Debug', headerShown: true }} />

      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" testID="btn-sim-purchase" style={styles.button} onPress={simulatePurchase}>
          <Text style={styles.buttonText}>Simulate Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" testID="btn-sim-duration" style={styles.button} onPress={simulateScreenDuration}>
          <Text style={styles.buttonText}>Simulate Duration</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <Text testID="event-count" style={styles.summaryText}>Event Count: {events.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.map((e, idx) => (
          <View key={idx} testID="debug-event-row" style={styles.row}>
            <Text style={styles.rowTitle}>{e.event}</Text>
            <Text style={styles.rowSub}>{e.ts}</Text>
            {!!e.props && (
              <Text numberOfLines={3} style={styles.rowProps}>{JSON.stringify(e.props)}</Text>
            )}
          </View>
        ))}
        {filtered.length === 0 && (
          <Text style={styles.empty}>No events yet. Navigate around and return.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: 8, padding: 12 },
  button: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  summary: { paddingHorizontal: 12, paddingBottom: 8 },
  summaryText: { fontWeight: '700', fontSize: 14 },
  list: { padding: 12 },
  row: { padding: 10, borderRadius: 8, backgroundColor: '#F9FAFB', marginBottom: 8 },
  rowTitle: { fontWeight: '700', color: '#111827' },
  rowSub: { color: '#6B7280', fontSize: 12 },
  rowProps: { color: '#374151', fontSize: 12, marginTop: 4 },
  empty: { color: '#6B7280', padding: 16, textAlign: 'center' },
});

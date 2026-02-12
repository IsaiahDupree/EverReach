/**
 * RevenueCat Webhook Event Test Screen
 * 
 * Accessible at /revenuecat-event-test in the app.
 * Two modes:
 * 1. Direct Meta CAPI (default) — sends events directly to Meta's Conversions API
 *    simulating what the server-side emitter would do. Works without backend deploy.
 * 2. Backend Webhook — sends to your deployed backend (requires redeploy).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SHOW_DEV_SETTINGS } from '@/config/dev';
import { paymentEventLogger, type PaymentEvent } from '@/lib/paymentEventLogger';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ever-reach-be.vercel.app';
const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const TEST_EVENT_CODE = process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE || 'TEST48268';
const GRAPH_API_VERSION = 'v21.0';

// RevenueCat event types and their Meta CAPI mappings
const RC_EVENT_TYPES = [
  { type: 'INITIAL_PURCHASE', label: 'Initial Purchase', metaEvent: 'Purchase', color: '#22C55E', icon: '💰' },
  { type: 'INITIAL_PURCHASE_TRIAL', label: 'Trial Start', metaEvent: 'StartTrial', color: '#3B82F6', icon: '🆓' },
  { type: 'RENEWAL', label: 'Renewal', metaEvent: 'Purchase', color: '#22C55E', icon: '🔄' },
  { type: 'CANCELLATION', label: 'Cancellation', metaEvent: 'Cancel', color: '#F59E0B', icon: '⚠️' },
  { type: 'EXPIRATION', label: 'Expiration', metaEvent: 'Churn', color: '#EF4444', icon: '❌' },
  { type: 'BILLING_ISSUE', label: 'Billing Issue', metaEvent: 'BillingIssue', color: '#EF4444', icon: '🚨' },
  { type: 'PRODUCT_CHANGE', label: 'Product Change', metaEvent: 'Subscribe', color: '#8B5CF6', icon: '🔀' },
  { type: 'UNCANCELLATION', label: 'Uncancellation', metaEvent: 'Reactivate', color: '#22C55E', icon: '✅' },
  { type: 'REFUND', label: 'Refund', metaEvent: 'Refund', color: '#EF4444', icon: '💸' },
] as const;

interface TestResult {
  id: string;
  eventType: string;
  metaEvent: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: string;
  responseData?: any;
}

export default function RevenueCatEventTestScreen() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [eventCounts, setEventCounts] = useState<Record<string, { success: number; error: number }>>({});
  const [useMonitor, setUseMonitor] = useState(false);
  const [monitorOnline, setMonitorOnline] = useState<boolean | null>(null);
  const [liveEvents, setLiveEvents] = useState<PaymentEvent[]>([]);
  const [showLive, setShowLive] = useState(false);
  // Default to Direct Meta CAPI mode (works without backend deploy)
  const [mode, setMode] = useState<'direct' | 'backend'>('direct');

  const MONITOR_URL = 'http://localhost:3457';

  // Gate behind dev settings
  useEffect(() => {
    if (!SHOW_DEV_SETTINGS) {
      router.replace('/(tabs)/settings');
    }
  }, []);

  // Subscribe to live payment events from paymentEventLogger
  useEffect(() => {
    const unsub = paymentEventLogger.subscribe((event) => {
      setLiveEvents((prev) => [event, ...prev].slice(0, 50));
    });
    // Load existing events
    setLiveEvents(paymentEventLogger.getEvents().slice(0, 50));
    return unsub;
  }, []);

  const trackEventCount = useCallback((eventType: string, success: boolean) => {
    setEventCounts((prev) => {
      const existing = prev[eventType] || { success: 0, error: 0 };
      return {
        ...prev,
        [eventType]: {
          success: existing.success + (success ? 1 : 0),
          error: existing.error + (success ? 0 : 1),
        },
      };
    });
  }, []);

  const clearStats = useCallback(() => setEventCounts({}), []);

  // Check if monitor proxy is running
  const checkMonitor = useCallback(async () => {
    try {
      const res = await fetch(`${MONITOR_URL}/health`, { method: 'GET' });
      const data = await res.json();
      setMonitorOnline(data.status === 'ok');
    } catch {
      setMonitorOnline(false);
    }
  }, []);

  useEffect(() => {
    if (useMonitor) checkMonitor();
  }, [useMonitor]);

  const addResult = useCallback((result: TestResult) => {
    setResults((prev) => [result, ...prev]);
  }, []);

  const updateResult = useCallback((id: string, update: Partial<TestResult>) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...update } : r))
    );
  }, []);

  // Build a simulated RevenueCat webhook payload
  const buildWebhookPayload = (eventType: string) => {
    const isTrial = eventType === 'INITIAL_PURCHASE_TRIAL';
    const actualType = isTrial ? 'INITIAL_PURCHASE' : eventType;
    const now = Date.now();

    return {
      event: {
        type: actualType,
        id: `evt_test_${now}_${Math.random().toString(36).substring(2, 6)}`,
        app_user_id: 'test_user_001',
        product_id: 'com.everreach.core.monthly',
        entitlement_ids: ['core'],
        environment: 'SANDBOX',
        purchased_at_ms: now,
        expiration_at_ms: now + 30 * 24 * 60 * 60 * 1000, // 30 days
        period_type: isTrial ? 'TRIAL' : 'NORMAL',
        store: 'APP_STORE',
        country_code: 'US',
        presented_offering_id: 'default',
        original_transaction_id: `txn_test_${now}`,
        transaction_id: `txn_test_${now}_001`,
        price: isTrial ? 0 : 4.99,
        currency: 'USD',
      },
    };
  };

  // Send event directly to Meta Conversions API (simulating server-side emitter)
  const sendDirectMetaCAPI = async (eventConfig: typeof RC_EVENT_TYPES[number]) => {
    const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const eventId = `rc_test_${Date.now()}`;

    addResult({
      id,
      eventType: eventConfig.label,
      metaEvent: eventConfig.metaEvent,
      status: 'pending',
      message: `Sending ${eventConfig.metaEvent} to Meta CAPI...`,
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      // Build the same payload the server-side meta-capi emitter would construct
      const isTrial = eventConfig.type === 'INITIAL_PURCHASE_TRIAL';
      const customData: Record<string, any> = {
        content_name: eventConfig.metaEvent,
        content_type: 'subscription',
        product_id: 'com.everreach.core.monthly',
        event_source: 'revenuecat_test',
      };
      // Add value/currency for purchase-type events
      if (['Purchase', 'Subscribe', 'StartTrial'].includes(eventConfig.metaEvent)) {
        customData.value = isTrial ? 0 : 4.99;
        customData.currency = 'USD';
      }

      const payload = {
        data: [
          {
            event_name: eventConfig.metaEvent,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: 'app',
            user_data: {
              client_user_agent: `EverReach/1.0 (${Platform.OS})`,
              external_id: ['everreach_test_user_001'],
            },
            custom_data: customData,
            app_data: {
              advertiser_tracking_enabled: 1,
              application_tracking_enabled: 1,
              extinfo: [
                'i2', 'com.everreach.app', '1.0.0', '1.0.0', '18.0',
                'iPhone', 'en_US', 'UTC', '', '390', '844', '2', '6',
                '256000', '225000', '-5',
              ],
            },
          },
        ],
        test_event_code: TEST_EVENT_CODE,
      };

      const url = useMonitor
        ? `${MONITOR_URL}/events`
        : `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok && responseData.events_received > 0) {
        updateResult(id, {
          status: 'success',
          message: `✅ Meta received ${eventConfig.metaEvent}! (events_received: ${responseData.events_received})`,
          responseData,
        });
        trackEventCount(eventConfig.type, true);
      } else {
        updateResult(id, {
          status: 'error',
          message: `❌ ${responseData.error?.message || JSON.stringify(responseData)}`,
          responseData,
        });
        trackEventCount(eventConfig.type, false);
      }
    } catch (error: any) {
      updateResult(id, {
        status: 'error',
        message: `❌ Network error: ${error.message}`,
      });
      trackEventCount(eventConfig.type, false);
    }
  };

  // Send via backend webhook
  const sendBackendWebhook = async (eventConfig: typeof RC_EVENT_TYPES[number]) => {
    const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payload = buildWebhookPayload(eventConfig.type);

    addResult({
      id,
      eventType: eventConfig.label,
      metaEvent: eventConfig.metaEvent,
      status: 'pending',
      message: `Sending ${eventConfig.type} to backend...`,
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      const url = useMonitor
        ? `${MONITOR_URL}/webhook`
        : `${BACKEND_URL}/api/webhooks/revenuecat`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RevenueCat-Signature': 'test_signature',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({ status: response.status }));

      if (response.ok || response.status === 200) {
        updateResult(id, {
          status: 'success',
          message: `✅ Backend processed! → Meta CAPI: ${eventConfig.metaEvent}`,
          responseData,
        });
        trackEventCount(eventConfig.type, true);
      } else {
        const hint = response.status === 405
          ? ' (Backend needs redeploy — run: vercel --prod in backend-vercel/)'
          : '';
        updateResult(id, {
          status: 'error',
          message: `❌ HTTP ${response.status}${hint}`,
          responseData,
        });
        trackEventCount(eventConfig.type, false);
      }
    } catch (error: any) {
      updateResult(id, {
        status: 'error',
        message: `❌ Network error: ${error.message}`,
      });
      trackEventCount(eventConfig.type, false);
    }
  };

  // Dispatch to the right sender based on mode
  const sendTestEvent = async (eventConfig: typeof RC_EVENT_TYPES[number]) => {
    if (mode === 'direct') {
      await sendDirectMetaCAPI(eventConfig);
    } else {
      await sendBackendWebhook(eventConfig);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    // Config check
    const configOk = mode === 'direct' ? !!(PIXEL_ID && TOKEN) : !!BACKEND_URL;
    const configMsg = mode === 'direct'
      ? (PIXEL_ID && TOKEN
          ? `✅ Pixel: ${PIXEL_ID.substring(0, 8)}... | Token: ${TOKEN.substring(0, 10)}...`
          : `❌ Missing ${!PIXEL_ID ? 'PIXEL_ID' : ''} ${!TOKEN ? 'TOKEN' : ''}`)
      : (BACKEND_URL
          ? `✅ Backend: ${BACKEND_URL.substring(0, 35)}...`
          : '❌ Missing EXPO_PUBLIC_BACKEND_URL');

    addResult({
      id: 'config_check',
      eventType: 'Configuration',
      metaEvent: '—',
      status: configOk ? 'success' : 'error',
      message: configMsg,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (!configOk) { setTesting(false); return; }

    for (const eventConfig of RC_EVENT_TYPES) {
      await sendTestEvent(eventConfig);
      await delay(600);
    }

    setTesting(false);
  };

  const openRevenueCatDashboard = () => {
    Linking.openURL('https://app.revenuecat.com');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>RevenueCat Event Test</Text>
        <Text style={styles.subtitle}>
          Mode: {mode === 'direct' ? 'Direct Meta CAPI' : `Backend: ${BACKEND_URL}`}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'direct'
            ? `Pixel: ${PIXEL_ID ? PIXEL_ID.substring(0, 8) + '...' : 'NOT SET'} | Test: ${TEST_EVENT_CODE}`
            : 'Environment: SANDBOX (test mode)'}
        </Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'direct' && styles.modeButtonActive]}
          onPress={() => setMode('direct')}
        >
          <Text style={[styles.modeButtonText, mode === 'direct' && styles.modeButtonTextActive]}>
            🎯 Direct Meta CAPI
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'backend' && styles.modeButtonActiveBackend]}
          onPress={() => setMode('backend')}
        >
          <Text style={[styles.modeButtonText, mode === 'backend' && styles.modeButtonTextActive]}>
            🖥 Backend Webhook
          </Text>
        </TouchableOpacity>
      </View>

      {/* Run All Tests */}
      <TouchableOpacity
        style={[styles.primaryButton, testing && styles.disabledButton]}
        onPress={runAllTests}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {mode === 'direct' ? 'Run All Meta CAPI Tests' : 'Run All Webhook Tests'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Individual Event Buttons */}
      <Text style={styles.sectionTitle}>
        {mode === 'direct' ? 'Send Events to Meta' : 'Send Webhooks to Backend'}
      </Text>
      <View style={styles.buttonGrid}>
        {RC_EVENT_TYPES.map((evt) => (
          <TouchableOpacity
            key={evt.type}
            style={[styles.eventButton, { borderColor: evt.color + '60' }]}
            onPress={() => sendTestEvent(evt)}
          >
            <Text style={styles.eventIcon}>{evt.icon}</Text>
            <View>
              <Text style={[styles.eventButtonText, { color: evt.color }]}>{evt.label}</Text>
              <Text style={styles.metaMapping}>→ Meta: {evt.metaEvent}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Event Stats Dashboard */}
      {Object.keys(eventCounts).length > 0 && (
        <>
          <View style={styles.statsHeaderRow}>
            <Text style={styles.sectionTitle}>Webhook Stats (This Session)</Text>
            <TouchableOpacity onPress={clearStats}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              {Object.entries(eventCounts).sort((a, b) => (b[1].success + b[1].error) - (a[1].success + a[1].error)).map(([event, counts]) => (
                <View key={event} style={styles.statItem}>
                  <Text style={styles.statCount}>
                    <Text style={{ color: '#22C55E' }}>{counts.success}</Text>
                    {counts.error > 0 && <Text style={{ color: '#EF4444' }}> / {counts.error}</Text>}
                  </Text>
                  <Text style={styles.statLabel}>{event}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Live Payment Events */}
      <TouchableOpacity
        style={styles.liveToggle}
        onPress={() => setShowLive(!showLive)}
      >
        <Text style={styles.sectionTitle}>
          Live Payment Events ({liveEvents.length})
        </Text>
        <Text style={styles.toggleArrow}>{showLive ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {showLive && (
        <View style={styles.liveContainer}>
          {liveEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              No payment events yet. Make a purchase or trigger a webhook to see events here.
            </Text>
          ) : (
            liveEvents.slice(0, 20).map((event) => (
              <View key={event.id} style={[
                styles.liveEvent,
                { borderLeftColor: event.source === 'revenuecat' ? '#F97316' : '#8B5CF6' },
              ]}>
                <View style={styles.liveEventHeader}>
                  <Text style={styles.liveEventType}>{event.type}</Text>
                  <Text style={styles.liveEventSource}>
                    {event.source === 'revenuecat' ? '🔶 RC' : '🟣 SW'}
                  </Text>
                </View>
                <Text style={styles.liveEventTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Text>
                {event.data && (
                  <Text style={styles.liveEventData} numberOfLines={2}>
                    {JSON.stringify(event.data).substring(0, 120)}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Monitor Toggle */}
      <View style={styles.monitorRow}>
        <TouchableOpacity
          style={[styles.monitorToggle, useMonitor && styles.monitorToggleActive]}
          onPress={() => setUseMonitor(!useMonitor)}
        >
          <Text style={styles.monitorToggleText}>
            {useMonitor ? '● Monitor ON' : '○ Monitor OFF'}
          </Text>
        </TouchableOpacity>
        {useMonitor && (
          <Text style={[
            styles.monitorStatus,
            { color: monitorOnline ? '#22C55E' : '#EF4444' },
          ]}>
            {monitorOnline === null ? 'Checking...' : monitorOnline ? 'Connected' : 'Not running'}
          </Text>
        )}
      </View>
      {useMonitor && (
        <View style={styles.monitorInfo}>
          <Text style={styles.monitorInfoText}>
            Run in terminal:{' '}
            <Text style={{ color: '#F97316', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              node scripts/revenuecat-event-monitor.mjs
            </Text>
          </Text>
        </View>
      )}

      {/* Open RevenueCat */}
      <TouchableOpacity style={styles.rcButton} onPress={openRevenueCatDashboard}>
        <Text style={styles.rcButtonText}>Open RevenueCat Dashboard</Text>
      </TouchableOpacity>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          {mode === 'direct' ? 'How Direct Meta CAPI Works' : 'How Backend Webhook Works'}
        </Text>
        <Text style={styles.infoText}>
          {mode === 'direct'
            ? `1. Each button sends the Meta event directly to Conversions API\n2. Simulates exactly what the server-side emitter does\n3. Events appear in Meta Events Manager → Test Events\n4. Test code: ${TEST_EVENT_CODE}\n5. No backend deploy needed — tests Meta pipeline directly`
            : `1. Each button sends a simulated RevenueCat webhook to your backend\n2. Backend processes it → updates Supabase → fires Meta CAPI\n3. Requires backend to be deployed with latest code\n4. If you get HTTP 405, run: vercel --prod in backend-vercel/\n5. Enable Monitor to route through local proxy for full logging`}
        </Text>
      </View>

      {/* Event Mapping Reference */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>RevenueCat → Meta Event Mapping</Text>
        {RC_EVENT_TYPES.map((evt) => (
          <View key={evt.type} style={styles.mappingRow}>
            <Text style={[styles.mappingLeft, { color: evt.color }]}>{evt.icon} {evt.type}</Text>
            <Text style={styles.mappingArrow}>→</Text>
            <Text style={styles.mappingRight}>{evt.metaEvent}</Text>
          </View>
        ))}
      </View>

      {/* Results */}
      <Text style={styles.sectionTitle}>Results ({results.length})</Text>
      {results.map((result) => (
        <View
          key={result.id}
          style={[
            styles.resultCard,
            result.status === 'success' && styles.resultSuccess,
            result.status === 'error' && styles.resultError,
            result.status === 'pending' && styles.resultPending,
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultEvent}>{result.eventType}</Text>
            <Text style={styles.resultTime}>{result.timestamp}</Text>
          </View>
          <Text style={styles.resultMeta}>Meta CAPI → {result.metaEvent}</Text>
          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.responseData && (
            <Text style={styles.resultData}>
              {JSON.stringify(result.responseData, null, 2).substring(0, 200)}
            </Text>
          )}
        </View>
      ))}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 16,
  },
  header: {
    marginTop: 60,
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 12,
    marginTop: 8,
  },
  buttonGrid: {
    gap: 8,
    marginBottom: 20,
  },
  eventButton: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventIcon: {
    fontSize: 20,
  },
  eventButtonText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
  },
  metaMapping: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  statsContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    backgroundColor: '#252540',
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  statCount: {
    color: '#F97316',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  liveToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  toggleArrow: {
    color: '#888',
    fontSize: 14,
  },
  liveContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    padding: 16,
  },
  liveEvent: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  liveEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveEventType: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  liveEventSource: {
    fontSize: 12,
  },
  liveEventTime: {
    color: '#666',
    fontSize: 11,
  },
  liveEventData: {
    color: '#555',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  monitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  monitorToggle: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  monitorToggleActive: {
    backgroundColor: '#1B3A1B',
    borderColor: '#22C55E',
  },
  monitorToggleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  monitorStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  monitorInfo: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  monitorInfoText: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 18,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modeButtonActive: {
    backgroundColor: '#1B2B4E',
    borderColor: '#3B82F6',
  },
  modeButtonActiveBackend: {
    backgroundColor: '#2D1B0E',
    borderColor: '#F97316',
  },
  modeButtonText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  rcButton: {
    backgroundColor: '#F97316',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  rcButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  mappingLeft: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  mappingArrow: {
    color: '#555',
    fontSize: 12,
  },
  mappingRight: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
  },
  resultCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#0A2E1A',
    borderColor: '#1A5E3A',
  },
  resultError: {
    backgroundColor: '#2E0A0A',
    borderColor: '#5E1A1A',
  },
  resultPending: {
    backgroundColor: '#1A1A2E',
    borderColor: '#333',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  resultEvent: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 14,
  },
  resultTime: {
    color: '#888',
    fontSize: 12,
  },
  resultMeta: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultMessage: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  resultData: {
    color: '#666',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 6,
  },
});

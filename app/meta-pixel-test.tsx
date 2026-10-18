/**
 * Meta Pixel / Conversions API Verification Screen
 * 
 * Accessible at /meta-pixel-test in the app.
 * Fires test events and shows real-time status.
 * 
 * After firing events, verify at:
 * https://business.facebook.com/events_manager → Techmestuff pixel → Test Events
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SHOW_DEV_SETTINGS } from '@/config/dev';

const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN || '';
const TEST_EVENT_CODE = process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE || 'TEST48268';
const GRAPH_API_VERSION = 'v21.0';

interface TestResult {
  id: string;
  eventName: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: string;
  responseData?: any;
}

export default function MetaPixelTestScreen() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Gate behind dev settings
  useEffect(() => {
    if (!SHOW_DEV_SETTINGS) {
      router.replace('/(tabs)/settings');
    }
  }, []);

  const addResult = useCallback((result: TestResult) => {
    setResults((prev) => [result, ...prev]);
  }, []);

  const updateResult = useCallback((id: string, update: Partial<TestResult>) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...update } : r))
    );
  }, []);

  // Direct Conversions API test (bypasses the app's analytics layer)
  const sendTestEvent = async (eventName: string, customData?: Record<string, any>) => {
    const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const eventId = `ev_test_${Date.now()}`;

    addResult({
      id,
      eventName,
      status: 'pending',
      message: 'Sending to Conversions API...',
      timestamp: new Date().toLocaleTimeString(),
    });

    try {
      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: 'app',
            user_data: {
              client_user_agent: `EverReach/1.0 (${Platform.OS})`,
              external_id: ['everreach_test_user_001'],
            },
            custom_data: {
              ...customData,
            },
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
        // Use test_event_code to send as test event (visible in Test Events tab)
        test_event_code: TEST_EVENT_CODE,
      };

      const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok && responseData.events_received > 0) {
        updateResult(id, {
          status: 'success',
          message: `✅ Event received by Meta! (events_received: ${responseData.events_received})`,
          responseData,
        });
      } else {
        updateResult(id, {
          status: 'error',
          message: `❌ ${responseData.error?.message || JSON.stringify(responseData)}`,
          responseData,
        });
      }
    } catch (error: any) {
      updateResult(id, {
        status: 'error',
        message: `❌ Network error: ${error.message}`,
      });
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Configuration check
    const configId = 'config_check';
    addResult({
      id: configId,
      eventName: 'Configuration',
      status: PIXEL_ID && TOKEN ? 'success' : 'error',
      message: PIXEL_ID && TOKEN
        ? `✅ Pixel ID: ${PIXEL_ID.substring(0, 6)}... | Token: ${TOKEN.substring(0, 10)}...`
        : `❌ Missing ${!PIXEL_ID ? 'PIXEL_ID' : ''} ${!TOKEN ? 'CONVERSIONS_API_TOKEN' : ''}`,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (!PIXEL_ID || !TOKEN) {
      setTesting(false);
      return;
    }

    // Test 2: PageView (simplest event)
    await sendTestEvent('PageView');
    await delay(500);

    // Test 3: ViewContent
    await sendTestEvent('ViewContent', {
      content_name: 'meta_pixel_test_screen',
      content_type: 'screen',
    });
    await delay(500);

    // Test 4: CompleteRegistration
    await sendTestEvent('CompleteRegistration', {
      content_name: 'test_signup',
      status: 'test',
    });
    await delay(500);

    // Test 5: Lead
    await sendTestEvent('Lead', {
      content_name: 'test_lead',
      value: 0,
      currency: 'USD',
    });
    await delay(500);

    // Test 6: Custom app event
    await sendTestEvent('AppInstall', {
      content_name: 'test_install',
      content_category: 'verification',
    });

    setTesting(false);
  };

  const sendSingleTest = async (eventName: string) => {
    if (!PIXEL_ID || !TOKEN) {
      Alert.alert('Missing Config', 'Set EXPO_PUBLIC_META_PIXEL_ID and EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN in .env');
      return;
    }
    await sendTestEvent(eventName, {
      content_name: `manual_test_${eventName}`,
      test: true,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meta Pixel Verification</Text>
        <Text style={styles.subtitle}>
          Pixel ID: {PIXEL_ID || 'NOT SET'}
        </Text>
        <Text style={styles.subtitle}>
          Token: {TOKEN ? TOKEN.substring(0, 15) + '...' : 'NOT SET'}
        </Text>
      </View>

      {/* Run All Tests */}
      <TouchableOpacity
        style={[styles.primaryButton, testing && styles.disabledButton]}
        onPress={runAllTests}
        disabled={testing}
        testID="run-all-tests"
      >
        {testing ? (
          <ActivityIndicator color="#fff" testID="loading-indicator" />
        ) : (
          <Text style={styles.primaryButtonText}>Run All Verification Tests</Text>
        )}
      </TouchableOpacity>

      {/* Individual Event Buttons */}
      <Text style={styles.sectionTitle}>Send Individual Events</Text>
      <View style={styles.buttonGrid}>
        {['PageView', 'ViewContent', 'CompleteRegistration', 'StartTrial', 'Subscribe', 'Purchase', 'Lead', 'Search', 'Contact', 'AddToWishlist'].map(
          (event) => (
            <TouchableOpacity
              key={event}
              style={styles.eventButton}
              onPress={() => sendSingleTest(event)}
            >
              <Text style={styles.eventButtonText}>{event}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Verification Instructions */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How to Verify in Meta</Text>
        <Text style={styles.infoText}>
          1. Go to Meta Events Manager{'\n'}
          2. Select "Dupree Ops Meta Pixel" (ID: {PIXEL_ID}){'\n'}
          3. Click "Test Events" tab{'\n'}
          4. Enter test code: {TEST_EVENT_CODE}{'\n'}
          5. Events should appear within 30 seconds
        </Text>
      </View>

      {/* Results */}
      <Text style={styles.sectionTitle} testID="results-count">Results ({results.length})</Text>
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
            <Text style={styles.resultEvent}>{result.eventName}</Text>
            <Text style={styles.resultTime}>{result.timestamp}</Text>
          </View>
          <Text style={styles.resultMessage} testID={`result-message-${result.eventName}`}>{result.message}</Text>
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
    color: '#7C3AED',
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
    backgroundColor: '#7C3AED',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  eventButton: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  eventButtonText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 4,
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

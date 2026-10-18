import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { apiFetch, backendBase } from '@/lib/api';

const theme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
    error: '#FF3B30',
    border: '#E0E0E0',
  },
};

interface TestResult {
  name: string;
  method: string;
  url: string;
  status: number;
  ok: boolean;
  durationMs: number;
  error?: string;
  expected: number[];
  authed: boolean;
}

interface TestCase {
  name: string;
  method: string;
  path: string;
  expectStatus: number | number[];
  requireAuth?: boolean;
  body?: any;
}

interface TestReport {
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
  tests: TestResult[];
  meta: {
    backend: string;
    authStatus: string;
  };
}

export default function APITestSuiteScreen() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baseOverride, setBaseOverride] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [tokenPreview, setTokenPreview] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Check auth status on mount
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setAuthStatus(`Error: ${sessionError.message}`);
        setTokenPreview('');
        return;
      }
      
      if (!session) {
        setAuthStatus('❌ Not authenticated');
        setTokenPreview('');
        return;
      }
      
      const token = session.access_token;
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      const isExpired = expiresAt && expiresAt < now;
      
      if (isExpired) {
        setAuthStatus('⚠️ Token expired');
      } else {
        const timeLeft = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60) : 0;
        setAuthStatus(`✅ Authenticated (${timeLeft}m left)`);
      }
      
      setTokenPreview(token.substring(0, 30) + '...');
    } catch (err: any) {
      setAuthStatus(`Error: ${err.message}`);
      setTokenPreview('');
    }
  }

  async function refreshToken() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (data.session) {
        await checkAuthStatus();
        setError(null);
        console.log('✅ Token refreshed successfully');
      } else {
        throw new Error('No session returned after refresh');
      }
    } catch (err: any) {
      setError(`Token refresh failed: ${err.message}`);
      console.error('Token refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }

  async function runTests() {
    setRunning(true);
    setError(null);
    setReport(null);

    const results: TestResult[] = [];
    const BASE = (baseOverride?.trim() || backendBase());

    try {
      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('Not authenticated. Please log in first.');
      }
      
      // Check if token is expired
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      const isExpired = expiresAt && expiresAt < now;
      
      if (isExpired) {
        throw new Error('Token is expired. Please refresh your token.');
      }

      const token = session.access_token;
      console.log('\n🧪 Comprehensive API Test Suite');
      console.log('[api-test] Backend:', BASE);
      console.log('[api-test] Authenticated:', !!token);

      // Helper to make requests with optional auth (explicit per test)
      const makeRequest = async (method: string, path: string, requireAuth = false, body?: any) => {
        const startTime = Date.now();
        try {
          const response = await apiFetch(path, {
            method,
            requireAuth,
            baseOverride: BASE,
            body: body ? JSON.stringify(body) : undefined
          });
          
          return {
            status: response.status,
            ok: response.ok,
            durationMs: Date.now() - startTime,
            data: response.ok ? await response.json().catch(() => null) : null
          };
        } catch (err: any) {
          return {
            status: 0,
            ok: false,
            durationMs: Date.now() - startTime,
            error: err.message
          };
        }
      };

      const tests: TestCase[] = [
        // Health & Version (public)
        { name: 'Health Check', method: 'GET', path: '/api/health', expectStatus: 200, requireAuth: false },
        { name: 'Version Check', method: 'GET', path: '/api/version', expectStatus: 200, requireAuth: false },
        
        // Auth & User (protected)
        { name: 'Get Current User (v1)', method: 'GET', path: '/api/v1/me', expectStatus: 200, requireAuth: true },
        { name: 'Get User Entitlements', method: 'GET', path: '/api/v1/me/entitlements', expectStatus: [200, 404], requireAuth: true },
        
        // Contacts (protected)
        { name: 'List Contacts', method: 'GET', path: '/api/v1/contacts?limit=5', expectStatus: 200, requireAuth: true },
        { name: 'Search Contacts', method: 'GET', path: '/api/v1/contacts?q=test', expectStatus: 200, requireAuth: true },
        
        // Pipelines (protected)
        { name: 'List Pipelines', method: 'GET', path: '/api/v1/pipelines', expectStatus: 200, requireAuth: true },
        { name: 'Get Pipeline Stages', method: 'GET', path: '/api/v1/pipelines/business/stages', expectStatus: 200, requireAuth: true },
        
        // Templates (protected; may return 404 if not implemented)
        { name: 'List Templates', method: 'GET', path: '/api/v1/templates?limit=5', expectStatus: [200, 404], requireAuth: true },
        
        // Persona Notes (protected)
        { name: 'List Persona Notes', method: 'GET', path: '/api/v1/me/persona-notes?type=voice&limit=1', expectStatus: 200, requireAuth: true },
        
        // Paywall (protected)
        { name: 'Usage Summary', method: 'GET', path: '/api/me/usage-summary?window=30d', expectStatus: 200, requireAuth: true },
        { name: 'Impact Summary', method: 'GET', path: '/api/me/impact-summary?window=90d', expectStatus: 200, requireAuth: true },
        { name: 'Plan Recommendation', method: 'GET', path: '/api/me/plan-recommendation', expectStatus: 200, requireAuth: true },
        
        // Trending (public)
        { name: 'Trending Prompts', method: 'GET', path: '/api/trending/prompts?window=today&limit=5', expectStatus: 200, requireAuth: false },
        
        // Recommendations (protected in most setups)
        { name: 'Daily Recommendations', method: 'GET', path: '/api/recommendations/daily', expectStatus: [200, 404], requireAuth: true },
        
        // Config Status (backend returns 200 in this codebase)
        { name: 'Config Status', method: 'GET', path: '/api/v1/ops/config-status', expectStatus: 200, requireAuth: true },
      ];

      // Run each test
      for (const test of tests) {
        console.log(`\n📝 Testing: ${test.name}`);
        console.log(`   ${test.method} ${test.path}`);

        const result = await makeRequest(test.method, test.path, !!test.requireAuth, test.body);
        
        const expectedStatuses = Array.isArray(test.expectStatus) ? test.expectStatus : [test.expectStatus];
        const testPassed = expectedStatuses.includes(result.status);

        const testResult: TestResult = {
          name: test.name,
          method: test.method,
          url: `${BASE}${test.path}`,
          status: result.status,
          ok: testPassed,
          durationMs: result.durationMs,
          error: result.error,
          expected: expectedStatuses,
          authed: !!test.requireAuth,
        };

        results.push(testResult);

        if (testPassed) {
          console.log(`✅ PASS - Status: ${result.status} (${result.durationMs}ms)`);
        } else {
          console.log(`❌ FAIL - Expected ${test.expectStatus}, got ${result.status}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        }
      }

      // Generate report
      const passed = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok).length;

      const testReport: TestReport = {
        summary: {
          passed,
          failed,
          total: results.length
        },
        tests: results,
        meta: {
          backend: BASE,
          authStatus: session ? 'Authenticated' : 'Not authenticated'
        }
      };

      setReport(testReport);

      console.log('\n════════════════════════════════════════════════════════════');
      console.log('📊 API TEST SUMMARY');
      console.log('════════════════════════════════════════════════════════════');
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📝 Total:  ${results.length}`);
      console.log('════════════════════════════════════════════════════════════');

      if (passed === results.length) {
        console.log('\n🎉 All API tests passed!');
      } else {
        console.log(`\n⚠️  ${failed} test(s) failed`);
      }

    } catch (err: any) {
      console.error('Test suite error:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setRunning(false);
    }
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
    },
    buttonDisabled: {
      backgroundColor: theme.colors.border,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    errorCard: {
      backgroundColor: theme.colors.error + '20',
      borderColor: theme.colors.error,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 14,
    },
    reportCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    testItem: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    testHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    testName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    testStatus: {
      fontSize: 20,
    },
    testDetails: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    testError: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    input: {
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Stack.Screen options={{ title: 'API Test Suite' }} />
      
      <ScrollView style={dynamicStyles.content}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>Comprehensive API Tests</Text>
          <Text style={dynamicStyles.subtitle}>
            Tests all backend endpoints (similar to Node.js test suite)
          </Text>
        </View>

        {/* Auth Status */}
        <View style={[dynamicStyles.reportCard, { marginBottom: 16 }]}>
          <Text style={[dynamicStyles.subtitle, { marginBottom: 8, fontWeight: '600' }]}>Authentication Status</Text>
          <Text style={[dynamicStyles.testDetails, { marginBottom: 4 }]}>{authStatus}</Text>
          {tokenPreview && (
            <Text style={[dynamicStyles.testDetails, { marginBottom: 8 }]}>Token: {tokenPreview}</Text>
          )}
          <TouchableOpacity
            style={[dynamicStyles.button, { marginTop: 8, backgroundColor: '#10B981' }, refreshing && dynamicStyles.buttonDisabled]}
            onPress={refreshToken}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={dynamicStyles.buttonText}>Refresh Token</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Common Issues Warning */}
        {report && report.summary.failed > 0 && (
          <View style={[dynamicStyles.errorCard, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
            <Text style={[dynamicStyles.errorText, { color: '#856404', fontWeight: '600', marginBottom: 8 }]}>
              ⚠️ Common Issues for 401 Errors:
            </Text>
            <Text style={[dynamicStyles.errorText, { color: '#856404', marginBottom: 4 }]}>
              1. SUPABASE_JWT_SECRET not configured in backend .env
            </Text>
            <Text style={[dynamicStyles.errorText, { color: '#856404', marginBottom: 4 }]}>
              2. Token expired - try refreshing above
            </Text>
            <Text style={[dynamicStyles.errorText, { color: '#856404', marginBottom: 4 }]}>
              3. Backend not recognizing Supabase tokens
            </Text>
            <Text style={[dynamicStyles.errorText, { color: '#856404', marginTop: 8 }]}>
              🔧 Fix: Get JWT secret from Supabase Dashboard → Settings → API → JWT Secret
            </Text>
          </View>
        )}

        {/* Backend base override */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[dynamicStyles.subtitle, { marginBottom: 6 }]}>Backend base override (optional)</Text>
          <TextInput
            style={dynamicStyles.input}
            value={baseOverride}
            onChangeText={setBaseOverride}
            placeholder={backendBase()}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={[dynamicStyles.subtitle, { marginTop: 6 }]}>Leave empty to use the default above.</Text>
        </View>

        <TouchableOpacity
          style={[dynamicStyles.button, running && dynamicStyles.buttonDisabled]}
          onPress={runTests}
          disabled={running}
        >
          {running ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={dynamicStyles.buttonText}>Run All API Tests</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={dynamicStyles.errorCard}>
            <Text style={dynamicStyles.errorText}>{error}</Text>
          </View>
        )}

        {report && (
          <>
            <View style={dynamicStyles.reportCard}>
              <View style={dynamicStyles.summaryRow}>
                <View style={dynamicStyles.summaryItem}>
                  <Text style={[dynamicStyles.summaryValue, { color: '#4CAF50' }]}>
                    {report.summary.passed}
                  </Text>
                  <Text style={dynamicStyles.summaryLabel}>Passed</Text>
                </View>
                <View style={dynamicStyles.summaryItem}>
                  <Text style={[dynamicStyles.summaryValue, { color: '#F44336' }]}>
                    {report.summary.failed}
                  </Text>
                  <Text style={dynamicStyles.summaryLabel}>Failed</Text>
                </View>
                <View style={dynamicStyles.summaryItem}>
                  <Text style={dynamicStyles.summaryValue}>
                    {report.summary.total}
                  </Text>
                  <Text style={dynamicStyles.summaryLabel}>Total</Text>
                </View>
              </View>
            </View>

            {report.tests.map((test, index) => (
              <View key={index} style={dynamicStyles.testItem}>
                <View style={dynamicStyles.testHeader}>
                  <Text style={dynamicStyles.testName}>{test.name}</Text>
                  <Text style={dynamicStyles.testStatus}>
                    {test.ok ? '✅' : '❌'}
                  </Text>
                </View>
                <Text style={dynamicStyles.testDetails}>
                  {test.method} • Status: {test.status} • {test.durationMs}ms
                </Text>
                {test.error && (
                  <Text style={dynamicStyles.testError}>Error: {test.error}</Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

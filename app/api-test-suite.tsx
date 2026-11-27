import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  async function runTests() {
    setRunning(true);
    setError(null);
    setReport(null);

    const results: TestResult[] = [];
    const BASE = backendBase();

    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in first.');
      }

      const token = session.access_token;
      console.log('\n🧪 Comprehensive API Test Suite');
      console.log('[api-test] Backend:', BASE);
      console.log('[api-test] Authenticated:', !!token);

      // Helper to make requests with auth
      const makeRequest = async (method: string, path: string, body?: any) => {
        const startTime = Date.now();
        try {
          const response = await apiFetch(path, {
            method,
            requireAuth: path.includes('/me') || path.includes('/contacts') || path.includes('/v1'),
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

      const tests = [
        // Health & Version
        { name: 'Health Check', method: 'GET', path: '/api/health', expectStatus: 200 },
        { name: 'Version Check', method: 'GET', path: '/api/version', expectStatus: 200 },
        
        // Auth & User
        { name: 'Get Current User (v1)', method: 'GET', path: '/api/v1/me', expectStatus: 200 },
        { name: 'Get User Entitlements', method: 'GET', path: '/api/v1/me/entitlements', expectStatus: [200, 404] },
        
        // Contacts
        { name: 'List Contacts', method: 'GET', path: '/api/v1/contacts?limit=5', expectStatus: 200 },
        { name: 'Search Contacts', method: 'GET', path: '/api/v1/contacts?q=test', expectStatus: 200 },
        
        // Pipelines
        { name: 'List Pipelines', method: 'GET', path: '/api/v1/pipelines', expectStatus: 200 },
        { name: 'Get Pipeline Stages', method: 'GET', path: '/api/v1/pipelines/business/stages', expectStatus: 200 },
        
        // Templates
        { name: 'List Templates', method: 'GET', path: '/api/v1/templates?limit=5', expectStatus: [200, 404] },
        
        // Persona Notes
        { name: 'List Persona Notes', method: 'GET', path: '/api/v1/me/persona-notes?type=voice&limit=1', expectStatus: 200 },
        
        // Paywall
        { name: 'Usage Summary', method: 'GET', path: '/api/me/usage-summary?window=30d', expectStatus: 200 },
        { name: 'Impact Summary', method: 'GET', path: '/api/me/impact-summary?window=90d', expectStatus: 200 },
        { name: 'Plan Recommendation', method: 'GET', path: '/api/me/plan-recommendation', expectStatus: 200 },
        
        // Trending
        { name: 'Trending Prompts', method: 'GET', path: '/api/trending/prompts?window=today&limit=5', expectStatus: 200 },
        
        // Recommendations
        { name: 'Daily Recommendations', method: 'GET', path: '/api/recommendations/daily', expectStatus: [200, 404] },
        
        // Config Status
        { name: 'Config Status', method: 'GET', path: '/api/v1/ops/config-status', expectStatus: 200 },
      ];

      // Run each test
      for (const test of tests) {
        console.log(`\n📝 Testing: ${test.name}`);
        console.log(`   ${test.method} ${test.path}`);

        const result = await makeRequest(test.method, test.path);
        
        const expectedStatuses = Array.isArray(test.expectStatus) ? test.expectStatus : [test.expectStatus];
        const testPassed = expectedStatuses.includes(result.status);

        const testResult: TestResult = {
          name: test.name,
          method: test.method,
          url: `${BASE}${test.path}`,
          status: result.status,
          ok: testPassed,
          durationMs: result.durationMs,
          error: result.error
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

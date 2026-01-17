import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { API_ENDPOINTS, getBackendBase } from '@/constants/endpoints';

interface TestResult {
  name: string;
  platform: string;
  passed: boolean;
  status: number;
  duration: number;
  payload?: any;
  response?: any;
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
  createdIds: string[];
}

export default function ContactImportTestScreen() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testScenarios = [
    {
      name: 'Process 1: Phone Only (US)',
      platform: 'iOS',
      payload: {
        display_name: 'Sarah Ashley',
        phones: ['+16018264769'],
        emails: [],
        tags: ['imported']
      }
    },
    {
      name: 'Process 2: Email Only',
      platform: 'Google',
      payload: {
        display_name: 'John Doe',
        phones: [],
        emails: ['john.doe@example.com'],
        tags: ['imported']
      }
    },
    {
      name: 'Email Only',
      platform: 'Google',
      payload: {
        display_name: 'Email Test',
        phones: [],
        emails: ['test@example.com'],
        tags: ['test-email-only']
      }
    },
    {
      name: 'Phone + Email',
      platform: 'iCloud',
      payload: {
        display_name: 'Complete Contact',
        phones: ['+15551234567'],
        emails: ['user@example.com'],
        tags: ['test-complete']
      }
    },
    {
      name: 'Business Contact',
      platform: 'LinkedIn',
      payload: {
        display_name: 'Business Person',
        phones: ['+12025551234'],
        emails: ['contact@business.com'],
        company: 'Acme Corp',
        tags: ['test-business']
      }
    },
    {
      name: 'Unicode Names',
      platform: 'Global',
      payload: {
        display_name: '张伟 José',
        phones: ['+15551112222'],
        emails: ['unicode@test.com'],
        tags: ['test-unicode']
      }
    },
    {
      name: 'Invalid (No Contact Info)',
      platform: '(should fail)',
      payload: {
        display_name: 'Invalid Contact',
        phones: [],
        emails: [],
        tags: ['test-invalid']
      }
    },
  ];

  async function runTests() {
    setRunning(true);
    setError(null);
    setReport(null);

    const results: TestResult[] = [];
    const createdIds: string[] = [];
    const startTime = Date.now();

    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in first.');
      }

      const backend = getBackendBase();
      console.log('\n🧪 Contact Import/Export Test Suite');
      console.log('[contacts-test] Backend:', backend);
      console.log('[contacts-test] Authenticated:', !!session.access_token);

      // Run each test scenario
      for (const scenario of testScenarios) {
        const testStart = Date.now();
        
        console.log(`\n📝 Testing: ${scenario.name} (${scenario.platform})`);
        console.log('   Payload:', JSON.stringify(scenario.payload));

        try {
          const response = await apiFetch(API_ENDPOINTS.CONTACTS, {
            method: 'POST',
            requireAuth: true,
            body: JSON.stringify(scenario.payload)
          });

          const duration = Date.now() - testStart;
          const responseText = await response.text();
          let responseData;
          
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          const testResult: TestResult = {
            name: scenario.name,
            platform: scenario.platform,
            passed: false,
            status: response.status,
            duration,
            payload: scenario.payload,
            response: responseData,
          };

          // Determine if test passed based on expected behavior
          if (scenario.name.includes('Invalid')) {
            // Should fail with 422
            testResult.passed = response.status === 422;
            if (testResult.passed) {
              console.log(`✅ PASS - Status: ${response.status} (correctly rejected)`);
            } else {
              console.log(`❌ FAIL - Expected 422, got ${response.status}`);
            }
          } else {
            // Should succeed with 201
            testResult.passed = response.status === 201;
            if (testResult.passed) {
              console.log(`✅ PASS - Status: ${response.status}`);
              if (responseData?.contact?.id) {
                createdIds.push(responseData.contact.id);
              }
            } else {
              console.log(`❌ FAIL - Status: ${response.status}`);
              testResult.error = responseText;
            }
          }

          results.push(testResult);
        } catch (err: any) {
          const duration = Date.now() - testStart;
          console.log(`❌ FAIL - Error: ${err.message}`);
          
          results.push({
            name: scenario.name,
            platform: scenario.platform,
            passed: false,
            status: 0,
            duration,
            payload: scenario.payload,
            error: err.message
          });
        }
      }

      // Clean up created contacts
      if (createdIds.length > 0) {
        console.log(`\n🧹 Cleaning up ${createdIds.length} test contacts...`);
        for (const id of createdIds) {
          try {
            await apiFetch(`${API_ENDPOINTS.CONTACTS}/${id}`, {
              method: 'DELETE',
              requireAuth: true
            });
          } catch (err) {
            console.log(`⚠️  Failed to delete ${id}`);
          }
        }
        console.log('✅ Cleanup complete');
      }

      // Generate report
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      const testReport: TestReport = {
        summary: {
          passed,
          failed,
          total: results.length
        },
        tests: results,
        meta: {
          backend,
          authStatus: session ? 'Authenticated' : 'Not authenticated'
        },
        createdIds
      };

      setReport(testReport);

      console.log('\n════════════════════════════════════════════════════════════');
      console.log('📊 TEST SUMMARY');
      console.log('════════════════════════════════════════════════════════════');
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📝 Total:  ${results.length}`);
      console.log('════════════════════════════════════════════════════════════');

      if (passed === results.length) {
        console.log('\n🎉 All tests passed!');
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#000000',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: '#666666',
    },
    button: {
      backgroundColor: '#007AFF',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center' as const,
      marginBottom: 20,
    },
    buttonDisabled: {
      backgroundColor: '#E0E0E0',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    errorCard: {
      backgroundColor: '#FFEBEE',
      borderColor: '#F44336',
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    errorText: {
      color: '#F44336',
      fontSize: 14,
    },
    reportCard: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    summaryRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      marginBottom: 16,
    },
    summaryItem: {
      alignItems: 'center' as const,
    },
    summaryValue: {
      fontSize: 32,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    summaryLabel: {
      fontSize: 12,
      color: '#666666',
      marginTop: 4,
    },
    testItem: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    testHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    testName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#000000',
      flex: 1,
    },
    testStatus: {
      fontSize: 20,
    },
    testDetails: {
      fontSize: 12,
      color: '#666666',
    },
    testError: {
      fontSize: 12,
      color: '#F44336',
      marginTop: 4,
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Contact Import Tests' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Contact Import/Export Tests</Text>
          <Text style={styles.subtitle}>
            Tests contact creation with various scenarios
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, running && styles.buttonDisabled]}
          onPress={runTests}
          disabled={running}
        >
          {running ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Run Tests</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {report && (
          <>
            <View style={styles.reportCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {report.summary.passed}
                  </Text>
                  <Text style={styles.summaryLabel}>Passed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                    {report.summary.failed}
                  </Text>
                  <Text style={styles.summaryLabel}>Failed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {report.summary.total}
                  </Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
              </View>
            </View>

            {report.tests.map((test, index) => (
              <View key={index} style={styles.testItem}>
                <View style={styles.testHeader}>
                  <Text style={styles.testName}>{test.name}</Text>
                  <Text style={styles.testStatus}>
                    {test.passed ? '✅' : '❌'}
                  </Text>
                </View>
                <Text style={styles.testDetails}>
                  {test.platform} • Status: {test.status} • {test.duration}ms
                </Text>
                {test.error && (
                  <Text style={styles.testError}>Error: {test.error}</Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

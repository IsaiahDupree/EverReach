import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Users, Database } from 'lucide-react-native';
import { usePeople } from '@/providers/PeopleProvider';
import { PeopleRepo } from '@/repos/PeopleRepo';
import { FLAGS } from '@/constants/flags';
import { useAppSettings } from '@/providers/AppSettingsProvider';

type TestResult = {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
  duration?: number;
};

export default function ContactsLoadTestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { people, isLoading, refreshPeople } = usePeople();
  
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Provider State Check', status: 'pending' },
    { name: 'Direct Repo Query', status: 'pending' },
    { name: 'Storage Mode Check', status: 'pending' },
    { name: 'Manual Refresh Test', status: 'pending' },
  ]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTest = async (index: number, testFn: () => Promise<Partial<TestResult>>) => {
    const startTime = Date.now();
    updateTest(index, { status: 'running' });
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'success', 
        duration,
        ...result 
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'error', 
        message: error.message || String(error),
        duration 
      });
    }
  };

  const runAllTests = async () => {
    console.log('[ContactsLoadTest] Starting all tests...');
    
    await runTest(0, async () => {
      console.log('[Test 1] Checking provider state...');
      const count = people.length;
      const loading = isLoading;
      
      return {
        message: `Found ${count} contacts in provider state. Loading: ${loading}`,
        data: {
          count,
          isLoading: loading,
          sampleIds: people.slice(0, 3).map(p => ({ id: p.id, name: p.fullName })),
        }
      };
    });

    await runTest(1, async () => {
      console.log('[Test 2] Querying repo directly...');
      const contacts = await PeopleRepo.all();
      const count = contacts.length;
      
      return {
        message: `Direct repo query returned ${count} contacts`,
        data: {
          count,
          sampleIds: contacts.slice(0, 3).map(p => ({ id: p.id, name: p.fullName })),
        }
      };
    });

    await runTest(2, async () => {
      console.log('[Test 3] Checking storage mode...');
      const mode = FLAGS.LOCAL_ONLY ? 'LOCAL_ONLY' : 'SUPABASE';
      
      return {
        message: `Storage mode: ${mode}`,
        data: {
          mode,
          localOnly: FLAGS.LOCAL_ONLY,
        }
      };
    });

    await runTest(3, async () => {
      console.log('[Test 4] Testing manual refresh...');
      await refreshPeople();
      const count = people.length;
      
      return {
        message: `Refresh completed. Provider now has ${count} contacts`,
        data: { count }
      };
    });

    console.log('[ContactsLoadTest] All tests completed');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setAutoRefreshCount(prev => prev + 1);
    await runAllTests();
    setIsRefreshing(false);
  };

  useEffect(() => {
    void runAllTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <ActivityIndicator size="small" color={theme.colors.primary} />;
      case 'success':
        return <CheckCircle2 size={20} color={theme.colors.success} />;
      case 'error':
        return <XCircle size={20} color={theme.colors.error} />;
      default:
        return <AlertCircle size={20} color={theme.colors.textSecondary} />;
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{ 
          title: 'Contacts Load Test',
          headerShown: true,
        }} 
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Users size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Contacts Load Diagnostics</Text>
          <Text style={styles.subtitle}>
            Testing contact loading from provider and storage
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Provider Contacts:</Text>
            <Text style={styles.statValue}>{people.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Provider Loading:</Text>
            <Text style={styles.statValue}>{isLoading ? 'Yes' : 'No'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Storage Mode:</Text>
            <Text style={styles.statValue}>
              {FLAGS.LOCAL_ONLY ? 'Local Only' : 'Supabase'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Auto Refreshes:</Text>
            <Text style={styles.statValue}>{autoRefreshCount}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          {tests.map((test, index) => (
            <View key={index} style={styles.testCard}>
              <View style={styles.testHeader}>
                <View style={styles.testTitleRow}>
                  {getStatusIcon(test.status)}
                  <Text style={styles.testName}>{test.name}</Text>
                </View>
                {test.duration !== undefined && (
                  <Text style={styles.testDuration}>{test.duration}ms</Text>
                )}
              </View>
              
              {test.message && (
                <Text style={styles.testMessage}>{test.message}</Text>
              )}
              
              {test.data && (
                <View style={styles.testData}>
                  <Text style={styles.testDataLabel}>Data:</Text>
                  <Text style={styles.testDataValue}>
                    {JSON.stringify(test.data, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.button}
            onPress={runAllTests}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} color="#fff" />
            <Text style={styles.buttonText}>Run Tests Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={async () => {
              await refreshPeople();
              await runAllTests();
            }}
            disabled={isRefreshing}
          >
            <Database size={20} color={theme.colors.primary} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Force Refresh & Test
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsList}>
          <Text style={styles.sectionTitle}>Current Contacts in Provider</Text>
          {people.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No contacts found</Text>
            </View>
          ) : (
            people.map((person, index) => (
              <View key={person.id} style={styles.contactCard}>
                <Text style={styles.contactName}>{person.fullName}</Text>
                <Text style={styles.contactId}>ID: {person.id}</Text>
                {person.emails && person.emails.length > 0 && (
                  <Text style={styles.contactEmail}>{person.emails[0]}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  testCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  testDuration: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  testMessage: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 4,
  },
  testData: {
    marginTop: 8,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  testDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  testDataValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextSecondary: {
    color: theme.colors.primary,
  },
  contactsList: {
    padding: 16,
  },
  contactCard: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  contactId: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  contactEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
});

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, getCurrentUser, signInAnonymously, signOut } from '@/lib/supabase';
import { FLAGS } from '@/constants/flags';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { getStorageStats, clearCorruptedData } from '@/tools/backup';
import { Database, Wifi, WifiOff, Shield, HardDrive, Activity } from 'lucide-react-native';

interface ConnectionTest {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  duration?: number;
}

export default function SupabaseDebugScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const [user, setUser] = useState<any>(null);
  const [localStats, setLocalStats] = useState<any>(null);
  const [tests, setTests] = useState<ConnectionTest[]>([
    { name: 'Basic Connection', status: 'idle' },
    { name: 'Authentication Status', status: 'idle' },
    { name: 'Database Query (Public)', status: 'idle' },
    { name: 'Database Query (RLS)', status: 'idle' },
    { name: 'Real-time Connection', status: 'idle' },
  ]);

  const updateTest = useCallback((index: number, updates: Partial<ConnectionTest>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  }, []);

  const runTest = useCallback(async (testIndex: number) => {
    const startTime = Date.now();
    updateTest(testIndex, { status: 'running', error: undefined, result: undefined });

    try {
      switch (testIndex) {
        case 0: // Basic Connection
          if (FLAGS.LOCAL_ONLY || !supabase) {
            throw new Error('Local-only mode enabled');
          }
          await supabase.from('people').select('count', { count: 'exact', head: true });
          updateTest(testIndex, {
            status: 'success',
            result: `Connected successfully`,
            duration: Date.now() - startTime
          });
          break;

        case 1: // Authentication Status
          if (FLAGS.LOCAL_ONLY || !supabase) {
            throw new Error('Local-only mode enabled');
          }
          const currentUser = await getCurrentUser();
          updateTest(testIndex, {
            status: 'success',
            result: currentUser ? `Authenticated as: ${currentUser.id}` : 'Not authenticated',
            duration: Date.now() - startTime
          });
          setUser(currentUser);
          break;

        case 2: // Database Query (Public)
          if (FLAGS.LOCAL_ONLY || !supabase) {
            throw new Error('Local-only mode enabled');
          }
          const { error: publicError } = await supabase
            .from('message_threads')
            .select('id', { count: 'exact', head: true });
          if (publicError) throw publicError;
          updateTest(testIndex, {
            status: 'success',
            result: `Query successful`,
            duration: Date.now() - startTime
          });
          break;

        case 3: // Database Query (RLS)
          if (FLAGS.LOCAL_ONLY || !supabase) {
            throw new Error('Local-only mode enabled');
          }
          const { data: rlsData, error: rlsError } = await supabase
            .from('people')
            .select('id')
            .limit(1);
          if (rlsError) throw rlsError;
          updateTest(testIndex, {
            status: 'success',
            result: `RLS query successful (${rlsData?.length || 0} rows)`,
            duration: Date.now() - startTime
          });
          break;

        case 4: // Real-time Connection
          if (FLAGS.LOCAL_ONLY || !supabase) {
            throw new Error('Local-only mode enabled');
          }
          const channel = supabase.channel('test-channel');
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            channel.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                clearTimeout(timeout);
                resolve();
              } else if (status === 'CLOSED') {
                clearTimeout(timeout);
                reject(new Error('Connection closed'));
              }
            });
          });
          await channel.unsubscribe();
          updateTest(testIndex, {
            status: 'success',
            result: 'Real-time connection established',
            duration: Date.now() - startTime
          });
          break;
      }
    } catch (error: any) {
      updateTest(testIndex, {
        status: 'error',
        error: error.message || String(error),
        duration: Date.now() - startTime
      });
    }
  }, [updateTest]);

  const runAllTests = useCallback(async () => {
    for (let i = 0; i < tests.length; i++) {
      await runTest(i);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [runTest, tests.length]);

  const handleSignIn = useCallback(async () => {
    try {
      if (FLAGS.LOCAL_ONLY || !supabase) {
        if (Platform.OS === 'web') {
          console.log('Error: Local-only mode enabled');
        }
        return;
      }
      await signInAnonymously();
      const newUser = await getCurrentUser();
      setUser(newUser);
      if (Platform.OS === 'web') {
        console.log('Success: Signed in anonymously');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        console.error('Error:', error.message);
      }
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      if (FLAGS.LOCAL_ONLY || !supabase) {
        if (Platform.OS === 'web') {
          console.log('Error: Local-only mode enabled');
        }
        return;
      }
      await signOut();
      setUser(null);
      if (Platform.OS === 'web') {
        console.log('Success: Signed out');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        console.error('Error:', error.message);
      }
    }
  }, []);

  const loadLocalStats = useCallback(async () => {
    try {
      const result = await getStorageStats();
      if (result.success) {
        setLocalStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to load local stats:', error);
    }
  }, []);

  const handleClearCorruptedData = useCallback(async () => {
    try {
      const result = await clearCorruptedData();
      if (result.success) {
        if (Platform.OS === 'web') {
          console.log(`Cleared ${result.clearedCount} corrupted entries`);
        }
        // Reload stats after clearing
        await loadLocalStats();
      }
    } catch (error) {
      console.error('Failed to clear corrupted data:', error);
    }
  }, [loadLocalStats]);

  useEffect(() => {
    // Load initial auth state
    if (!FLAGS.LOCAL_ONLY && supabase) {
      getCurrentUser().then(setUser).catch(console.error);
    }
    // Always load local stats
    loadLocalStats();
  }, [loadLocalStats]);

  const getStatusColor = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'running': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'running': return '⟳';
      default: return '○';
    }
  };

  const createStyles = (theme: any) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    cardTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700' as const,
      marginLeft: 8,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    refreshButton: {
      padding: 4,
    },
    envText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    authButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    primaryButtonText: {
      color: 'white',
      fontWeight: '600' as const,
      fontSize: 14,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontWeight: '600' as const,
      fontSize: 14,
    },
    runAllButton: {
      backgroundColor: theme.colors.success,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    runAllButtonText: {
      color: 'white',
      fontWeight: '600' as const,
      fontSize: 12,
    },
    testRow: {
      marginBottom: 8,
    },
    testButton: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    testInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    testIcon: {
      fontSize: 16,
      marginRight: 12,
      marginTop: 2,
    },
    testDetails: {
      flex: 1,
    },
    testName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    testResult: {
      color: theme.colors.success,
      fontSize: 14,
      marginBottom: 2,
    },
    testError: {
      color: theme.colors.error,
      fontSize: 14,
      marginBottom: 2,
    },
    testDuration: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    tipText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 6,
      lineHeight: 20,
    },
  });

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} testID="supabaseDebugContainer">
      <Stack.Screen options={{ 
        title: FLAGS.LOCAL_ONLY ? 'Local Debug' : 'Cloud Debug',
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text
      }} />

      {/* App Mode Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {FLAGS.LOCAL_ONLY ? (
              <Shield size={20} color={theme.colors.success} />
            ) : (
              <Database size={20} color={theme.colors.primary} />
            )}
            <Text style={styles.cardTitle}>
              {FLAGS.LOCAL_ONLY ? 'Local-Only Mode' : 'Cloud Sync Mode'}
            </Text>
          </View>
        </View>
        <Text style={styles.envText}>Mode: {FLAGS.LOCAL_ONLY ? 'Local-Only' : 'Cloud Sync'}</Text>
        <Text style={styles.envText}>Platform: {Platform.OS}</Text>
        {!FLAGS.LOCAL_ONLY && (
          <>
            <Text style={styles.envText}>URL: {process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not set'}</Text>
            <Text style={styles.envText}>Key: {process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Set' : 'Not set'}</Text>
            <Text style={styles.envText}>Client: {supabase ? 'Initialized' : 'Null'}</Text>
          </>
        )}
      </View>

      {/* Local Storage Stats */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <HardDrive size={20} color={theme.colors.text} />
            <Text style={styles.cardTitle}>Local Storage</Text>
          </View>
          <TouchableOpacity onPress={loadLocalStats} style={styles.refreshButton}>
            <Activity size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {localStats ? (
          Object.entries(localStats).map(([key, count]) => (
            <Text key={key} style={styles.envText}>{key}: {String(count)} items</Text>
          ))
        ) : (
          <Text style={styles.envText}>Loading local storage stats...</Text>
        )}
        <Text style={[styles.envText, { marginTop: 8, color: theme.colors.textSecondary }]}>
          {FLAGS.LOCAL_ONLY ? '✓ All data stays on your device' : 'Local cache + cloud sync'}
        </Text>
        <TouchableOpacity 
          onPress={handleClearCorruptedData} 
          style={[styles.button, styles.secondaryButton, { marginTop: 12 }]}
        >
          <Text style={styles.secondaryButtonText}>Clear Corrupted Data</Text>
        </TouchableOpacity>
      </View>

      {/* Cloud Authentication - Only show in cloud mode */}
      {!FLAGS.LOCAL_ONLY && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              {user ? (
                <Wifi size={20} color={theme.colors.success} />
              ) : (
                <WifiOff size={20} color={theme.colors.error} />
              )}
              <Text style={styles.cardTitle}>Cloud Authentication</Text>
            </View>
          </View>
          <Text style={styles.envText}>Status: {user ? 'Authenticated' : 'Not authenticated'}</Text>
          {user && (
            <>
              <Text style={styles.envText}>User ID: {user.id}</Text>
              <Text style={styles.envText}>Email: {user.email || 'Anonymous'}</Text>
            </>
          )}
          <View style={styles.authButtons}>
            <TouchableOpacity 
              onPress={handleSignIn} 
              style={[styles.button, styles.primaryButton]}
              disabled={FLAGS.LOCAL_ONLY || !supabase}
            >
              <Text style={styles.primaryButtonText}>Sign In Anonymously</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSignOut} 
              style={[styles.button, styles.secondaryButton]}
              disabled={FLAGS.LOCAL_ONLY || !supabase || !user}
            >
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Connection Tests - Only show in cloud mode */}
      {!FLAGS.LOCAL_ONLY && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Database size={20} color={theme.colors.text} />
              <Text style={styles.cardTitle}>Cloud Connection Tests</Text>
            </View>
            <TouchableOpacity onPress={runAllTests} style={styles.runAllButton}>
              <Text style={styles.runAllButtonText}>Run All</Text>
            </TouchableOpacity>
          </View>
        
        {tests.map((test, index) => (
          <View key={`test-${test.name}-${index}`} style={styles.testRow}>
            <TouchableOpacity 
              onPress={() => runTest(index)} 
              style={styles.testButton}
              disabled={test.status === 'running'}
            >
              <View style={styles.testInfo}>
                <Text style={[styles.testIcon, { color: getStatusColor(test.status) }]}>
                  {getStatusIcon(test.status)}
                </Text>
                <View style={styles.testDetails}>
                  <Text style={styles.testName}>{test.name}</Text>
                  {test.result && (
                    <Text style={styles.testResult}>{test.result}</Text>
                  )}
                  {test.error && (
                    <Text style={styles.testError}>{test.error}</Text>
                  )}
                  {test.duration && (
                    <Text style={styles.testDuration}>{test.duration}ms</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ))}
        </View>
      )}

      {/* Tips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Troubleshooting Tips</Text>
        {FLAGS.LOCAL_ONLY ? (
          <>
            <Text style={styles.tipText}>• All data is stored locally using AsyncStorage</Text>
            <Text style={styles.tipText}>• No internet connection required</Text>
            <Text style={styles.tipText}>• Data persists between app sessions</Text>
            <Text style={styles.tipText}>• Use Export Data feature to backup your information</Text>
            <Text style={styles.tipText}>• Switch to Cloud mode in settings to enable sync</Text>
          </>
        ) : (
          <>
            <Text style={styles.tipText}>• Check your .env file for correct Supabase credentials</Text>
            <Text style={styles.tipText}>• Ensure EXPO_PUBLIC_LOCAL_ONLY is set to false</Text>
            <Text style={styles.tipText}>• Verify your Supabase project is active</Text>
            <Text style={styles.tipText}>• Check RLS policies if queries fail</Text>
            <Text style={styles.tipText}>• Try signing in anonymously for RLS-protected tables</Text>
          </>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
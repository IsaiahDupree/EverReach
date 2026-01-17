import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Switch, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, getCurrentUser, signInAnonymously, signOut } from '@/lib/supabase';
import { apiFetch, backendBase } from '@/lib/api';

import { FLAGS } from '@/constants/flags';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { getStorageStats, clearCorruptedData } from '@/tools/backup';
import { Database, Wifi, WifiOff, HardDrive, Activity, Settings, Cloud, Smartphone, Heart } from 'lucide-react-native';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';

interface ConnectionTest {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  duration?: number;
}

interface HealthStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  data?: {
    status: string;
    message: string;
    url: string;
    time: string;
  };
  error?: string;
  duration?: number;
}

export default function ModeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, cloudModeEnabled, enableCloudMode, disableCloudMode } = useAppSettings();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('ModeSettings', {
    screenProperties: {
      cloud_mode_enabled: cloudModeEnabled,
      flags_local_only: FLAGS.LOCAL_ONLY,
    },
  });
  
  const [user, setUser] = useState<any>(null);
  const [localStats, setLocalStats] = useState<any>(null);
  const [tests, setTests] = useState<ConnectionTest[]>([
    { name: 'Basic Connection', status: 'idle' },
    { name: 'Authentication Status', status: 'idle' },
    { name: 'Database Query (Public)', status: 'idle' },
    { name: 'Database Query (RLS)', status: 'idle' },
    { name: 'Real-time Connection', status: 'idle' },
  ]);


  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ status: 'idle' });

  const updateTest = useCallback((index: number, updates: Partial<ConnectionTest>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  }, []);


  const runTest = useCallback(async (testIndex: number) => {
    const startTime = Date.now();
    updateTest(testIndex, { status: 'running', error: undefined, result: undefined });

    try {
      switch (testIndex) {
        case 0: // Basic Connection
          if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
            throw new Error('Local-only mode enabled or cloud mode disabled');
          }
          await supabase.from('people').select('count', { count: 'exact', head: true });
          updateTest(testIndex, {
            status: 'success',
            result: `Connected successfully`,
            duration: Date.now() - startTime
          });
          break;

        case 1: // Authentication Status
          if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
            throw new Error('Local-only mode enabled or cloud mode disabled');
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
          if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
            throw new Error('Local-only mode enabled or cloud mode disabled');
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
          if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
            throw new Error('Local-only mode enabled or cloud mode disabled');
          }
          const authUser = await getCurrentUser();
          if (!authUser) {
            throw new Error('User not authenticated. Please sign in first.');
          }
          
          const { error: orgError } = await supabase.rpc('ensure_user_org');
          if (orgError) {
            console.error('Failed to ensure user org:', orgError);
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
          if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
            throw new Error('Local-only mode enabled or cloud mode disabled');
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
  }, [updateTest, cloudModeEnabled]);

  const runAllTests = useCallback(async () => {
    for (let i = 0; i < tests.length; i++) {
      await runTest(i);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [runTest, tests.length]);


  const checkHealthStatus = useCallback(async () => {
    const startTime = Date.now();
    setHealthStatus({ status: 'running' });
    
    try {
      const base = backendBase();
      const endpoint = `${base || ''}/api/health`;
      const res = await apiFetch('/api/health', { method: 'GET' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      const data = { ...json, url: endpoint } as any;
      
      setHealthStatus({
        status: 'success',
        data,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      setHealthStatus({
        status: 'error',
        error: error.message || String(error),
        duration: Date.now() - startTime
      });
    }
  }, []);


  const handleSignIn = useCallback(async () => {
    try {
      if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
        Alert.alert('Error', 'Cloud mode is disabled');
        return;
      }
      await signInAnonymously();
      const newUser = await getCurrentUser();
      setUser(newUser);
      Alert.alert('Success', 'Signed in anonymously');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [cloudModeEnabled]);

  const handleSignOut = useCallback(async () => {
    try {
      if (FLAGS.LOCAL_ONLY || !supabase || !cloudModeEnabled) {
        Alert.alert('Error', 'Cloud mode is disabled');
        return;
      }
      await signOut();
      setUser(null);
      Alert.alert('Success', 'Signed out');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [cloudModeEnabled]);

  const loadLocalStats = useCallback(async () => {
    try {
      const result = await getStorageStats();
      if (result.success && result.stats) {
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
        Alert.alert('Success', `Cleared ${result.clearedCount || 0} corrupted entries`);
        await loadLocalStats();
      }
    } catch (err) {
      console.error('Failed to clear corrupted data:', err);
      Alert.alert('Error', 'Failed to clear corrupted data');
    }
  }, [loadLocalStats]);

  const handleModeToggle = useCallback((value: boolean) => {
    if (FLAGS.LOCAL_ONLY) {
      Alert.alert(
        'Mode Locked',
        'App is running in local-only mode due to environment settings. Cloud mode is disabled.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (value) {
      Alert.alert(
        'Enable Cloud Mode',
        'This will enable data syncing with Supabase. Your local data will be preserved.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => enableCloudMode() }
        ]
      );
    } else {
      Alert.alert(
        'Disable Cloud Mode',
        'This will disable cloud syncing and use only local storage. Your data will remain on this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: () => disableCloudMode() }
        ]
      );
    }
  }, [enableCloudMode, disableCloudMode]);

  useEffect(() => {
    // Load initial auth state
    if (!FLAGS.LOCAL_ONLY && supabase && cloudModeEnabled) {
      getCurrentUser().then(setUser).catch(console.error);
    }
    // Always load local stats
    loadLocalStats();
    // Check health status on mount
    checkHealthStatus();
  }, [loadLocalStats, cloudModeEnabled, checkHealthStatus]);

  const getStatusColor = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'success': return theme.colors.success;
      case 'error': return theme.colors.error;
      case 'running': return '#F59E0B';
      default: return theme.colors.textSecondary;
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

  const effectiveMode = (FLAGS.LOCAL_ONLY || !cloudModeEnabled) ? 'local' : 'cloud';

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
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingVertical: 8,
    },
    switchInfo: {
      flex: 1,
    },
    switchLabel: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    switchDescription: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    envWarning: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 8,
      fontStyle: 'italic' as const,
      backgroundColor: theme.colors.background,
      padding: 8,
      borderRadius: 6,
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
    modeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 8,
    },
    modeIndicatorText: {
      color: effectiveMode === 'local' ? theme.colors.success : theme.colors.primary,
      fontSize: 12,
      fontWeight: '600' as const,
      marginLeft: 6,
    },
    resultContainer: {
      marginTop: 4,
    },
  });

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ 
        title: 'Mode Settings',
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text
      }} />
      
      <ScrollView style={styles.scrollView} testID="modeSettingsContainer">
        {/* Mode Control */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Settings size={20} color={theme.colors.text} />
              <Text style={styles.cardTitle}>App Mode</Text>
            </View>
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Cloud Sync Mode</Text>
              <Text style={styles.switchDescription}>
                {cloudModeEnabled && !FLAGS.LOCAL_ONLY ? 'Data syncs with Supabase cloud' : 'Data stays on device only'}
              </Text>
            </View>
            <Switch
              value={cloudModeEnabled && !FLAGS.LOCAL_ONLY}
              onValueChange={handleModeToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              testID="cloudModeSwitch"
              disabled={FLAGS.LOCAL_ONLY}
            />
          </View>
          
          {FLAGS.LOCAL_ONLY && (
            <Text style={styles.envWarning}>
              ⚠️ EXPO_PUBLIC_LOCAL_ONLY=true in environment. Cloud mode is disabled.
            </Text>
          )}
          
          <View style={styles.modeIndicator}>
            {effectiveMode === 'local' ? (
              <Smartphone size={16} color={theme.colors.success} />
            ) : (
              <Cloud size={16} color={theme.colors.primary} />
            )}
            <Text style={styles.modeIndicatorText}>
              {effectiveMode === 'local' ? 'LOCAL-ONLY MODE' : 'CLOUD SYNC MODE'}
            </Text>
          </View>
        </View>

        {/* Health Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Heart size={20} color={theme.colors.text} />
              <Text style={styles.cardTitle}>API Health Status</Text>
            </View>
            <TouchableOpacity onPress={checkHealthStatus} style={styles.refreshButton}>
              <Activity size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.testButton}>
            <View style={styles.testInfo}>
              <Text style={[styles.testIcon, { color: getStatusColor(healthStatus.status) }]}>
                {getStatusIcon(healthStatus.status)}
              </Text>
              <View style={styles.testDetails}>
                <Text style={styles.testName}>Health Check</Text>
                {healthStatus.data && (
                  <>
                    <Text style={styles.testResult}>
                      Status: {healthStatus.data.status} - {healthStatus.data.message}
                    </Text>
                    <Text style={[styles.envText, { fontSize: 12 }]}>
                      Endpoint: {healthStatus.data.url}
                    </Text>
                    <Text style={[styles.envText, { fontSize: 12 }]}>
                      Last checked: {new Date(healthStatus.data.time).toLocaleString()}
                    </Text>
                  </>
                )}
                {healthStatus.error && (
                  <Text style={styles.testError}>{healthStatus.error}</Text>
                )}
                {healthStatus.duration && (
                  <Text style={styles.testDuration}>{healthStatus.duration}ms</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Environment Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Database size={20} color={theme.colors.text} />
              <Text style={styles.cardTitle}>Environment</Text>
            </View>
          </View>
          <Text style={styles.envText}>Platform: {Platform.OS}</Text>
          <Text style={styles.envText}>Local-Only Flag: {String(FLAGS.LOCAL_ONLY)}</Text>
          <Text style={styles.envText}>Cloud Mode Enabled: {String(cloudModeEnabled)}</Text>
          <Text style={styles.envText}>Effective Mode: {effectiveMode}</Text>
          {!FLAGS.LOCAL_ONLY && (
            <>
              <Text style={styles.envText}>Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not set'}</Text>
              <Text style={styles.envText}>Supabase Key: {process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Set' : 'Not set'}</Text>
              <Text style={styles.envText}>Client Status: {supabase ? 'Initialized' : 'Null'}</Text>
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
            {effectiveMode === 'local' ? '✓ All data stays on your device' : 'Local cache + cloud sync'}
          </Text>
          <TouchableOpacity 
            onPress={handleClearCorruptedData} 
            style={[styles.button, styles.secondaryButton, { marginTop: 12 }]}
          >
            <Text style={styles.secondaryButtonText}>Clear Corrupted Data</Text>
          </TouchableOpacity>
        </View>

        {/* Cloud Authentication - Only show when cloud mode is enabled */}
        {!FLAGS.LOCAL_ONLY && cloudModeEnabled && (
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
                disabled={!supabase}
              >
                <Text style={styles.primaryButtonText}>Sign In Anonymously</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSignOut} 
                style={[styles.button, styles.secondaryButton]}
                disabled={!supabase || !user}
              >
                <Text style={styles.secondaryButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Connection Tests - Only show when cloud mode is enabled */}
        {!FLAGS.LOCAL_ONLY && cloudModeEnabled && (
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
          <Text style={styles.cardTitle}>Mode Information</Text>
          {effectiveMode === 'local' ? (
            <>
              <Text style={styles.tipText}>• All data is stored locally using AsyncStorage</Text>
              <Text style={styles.tipText}>• No internet connection required</Text>
              <Text style={styles.tipText}>• Data persists between app sessions</Text>
              <Text style={styles.tipText}>• Use Export Data feature to backup your information</Text>
              <Text style={styles.tipText}>• Toggle Cloud Sync Mode above to enable syncing</Text>
            </>
          ) : (
            <>
              <Text style={styles.tipText}>• Data syncs with Supabase cloud backend</Text>
              <Text style={styles.tipText}>• Requires internet connection for sync</Text>
              <Text style={styles.tipText}>• Local cache available when offline</Text>
              <Text style={styles.tipText}>• Sign in for full access to cloud features</Text>
              <Text style={styles.tipText}>• Toggle off to switch to local-only mode</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
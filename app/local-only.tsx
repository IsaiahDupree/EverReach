import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { FLAGS } from '@/constants/flags';
import { supabase } from '@/lib/supabase';
import { useAppSettings } from '@/providers/AppSettingsProvider';

interface PingRow { id?: string }

export default function LocalOnlyStatusScreen() {
  const [status, setStatus] = useState<string>('Idle');
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const { cloudModeEnabled, enableCloudMode, disableCloudMode } = useAppSettings();

  const envInfo = useMemo(() => ({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'unset',
    keySet: Boolean(process.env.EXPO_PUBLIC_SUPABASE_KEY) ? 'set' : 'unset',
    platform: Platform.OS,
    localOnly: FLAGS.LOCAL_ONLY,
    effectiveMode: cloudModeEnabled && !FLAGS.LOCAL_ONLY ? 'cloud' : 'local-only',
  }), [cloudModeEnabled]);

  const testConnection = useCallback(async () => {
    console.log('[LocalOnly] testConnection start');
    setStatus('Testing connection...');
    setError(null);
    setCount(null);
    try {
      if (!supabase || FLAGS.LOCAL_ONLY || !cloudModeEnabled) {
        setStatus('Local-Only mode: cloud disabled');
        return;
      }
      const { data, error: qErr, count: c } = await supabase
        .from('message_threads')
        .select('id', { count: 'exact', head: true });
      if (qErr) throw qErr;
      setCount(c ?? 0);
      setStatus('Connected to Supabase');
      console.log('[LocalOnly] testConnection ok', { count: c, dataLen: data?.length });
    } catch (e: any) {
      console.warn('[LocalOnly] testConnection error', e);
      setError(e?.message ?? String(e));
      setStatus('Failed');
    }
  }, [cloudModeEnabled]);

  const testRLS = useCallback(async () => {
    console.log('[LocalOnly] testRLS start');
    setStatus('Testing RLS...');
    setError(null);
    try {
      if (!supabase || FLAGS.LOCAL_ONLY || !cloudModeEnabled) {
        setStatus('Local-Only mode: cloud disabled');
        return;
      }
      const { error: rlsErr } = await supabase
        .from('people')
        .select('id')
        .limit(1);
      if (rlsErr) throw rlsErr;
      setStatus('RLS query succeeded');
      console.log('[LocalOnly] testRLS ok');
    } catch (e: any) {
      console.warn('[LocalOnly] testRLS error', e);
      setError(e?.message ?? String(e));
      setStatus('RLS blocked (expected if not signed in)');
    }
  }, [cloudModeEnabled]);

  return (
    <View style={styles.container} testID="localOnlyContainer">
      <Stack.Screen options={{ title: envInfo.effectiveMode === 'local-only' ? 'Local-Only Mode' : 'Cloud Connectivity' }} />

      <View style={styles.hero}>
        <Text style={styles.heroTitle} testID="heroTitle">
          {envInfo.effectiveMode === 'local-only' ? 'Local-Only Mode' : 'Cloud Connected'}
        </Text>
        <Text style={styles.heroSub} testID="heroSub">
          {envInfo.effectiveMode === 'local-only' ? 'All data stored locally on device' : 'Supabase features enabled'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Cloud Mode</Text>
            <Text style={styles.switchDescription}>
              {cloudModeEnabled ? 'Data syncs with Supabase' : 'Data stays on device only'}
            </Text>
          </View>
          <Switch
            value={cloudModeEnabled}
            onValueChange={(value) => {
              if (value) {
                enableCloudMode();
              } else {
                disableCloudMode();
              }
            }}
            trackColor={{ false: '#3E3E3E', true: '#3B82F6' }}
            thumbColor={cloudModeEnabled ? '#FFFFFF' : '#9CA3AF'}
            testID="cloudModeSwitch"
          />
        </View>
        {FLAGS.LOCAL_ONLY && (
          <Text style={styles.envWarning}>
            ⚠️ EXPO_PUBLIC_LOCAL_ONLY=true in environment. Cloud mode disabled.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Environment</Text>
        <Text selectable style={styles.env}>URL: {envInfo.url}</Text>
        <Text style={styles.env}>Key: {envInfo.keySet}</Text>
        <Text style={styles.env}>Platform: {envInfo.platform}</Text>
        <Text style={styles.env}>LOCAL_ONLY: {String(envInfo.localOnly)}</Text>
        <Text style={styles.env}>Effective Mode: {envInfo.effectiveMode}</Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity onPress={testConnection} style={[styles.btn, styles.primary]} testID="btnConnectivity">
          <Text style={styles.btnTextPrimary}>Test Connectivity</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={testRLS} style={[styles.btn, styles.secondary]} testID="btnRLS">
          <Text style={styles.btnTextSecondary}>Test RLS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.status} testID="statusText">{status}</Text>
        {count !== null && (
          <Text style={styles.env} testID="rowCount">message_threads count: {count}</Text>
        )}
        {error ? <Text style={styles.error} testID="errorText">{error}</Text> : null}
      </View>

      <TouchableOpacity 
        onPress={() => router.push('/supabase-debug')} 
        style={[styles.btn, styles.debugButton]} 
        testID="btnDebug"
      >
        <Text style={styles.btnTextDebug}>Advanced Debug & Testing</Text>
      </TouchableOpacity>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Mode Information</Text>
        <Text style={styles.tipText}>• Local-Only: All data stored using AsyncStorage</Text>
        <Text style={styles.tipText}>• Cloud Mode: Data syncs with Supabase backend</Text>
        <Text style={styles.tipText}>• Toggle the switch above to change modes instantly</Text>
        {FLAGS.LOCAL_ONLY && (
          <Text style={styles.tipText}>• Environment override: EXPO_PUBLIC_LOCAL_ONLY=true</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0B0F14' },
  hero: { paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  heroTitle: { color: '#E6EDF3', fontSize: 22, fontWeight: '700' as const },
  heroSub: { color: '#9FB1C1', marginTop: 4 },
  card: { backgroundColor: '#121923', borderRadius: 12, padding: 12, marginBottom: 12 },
  label: { color: '#9FB1C1', fontSize: 12, marginBottom: 6 },
  env: { color: '#9FB1C1', fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  switchInfo: { flex: 1 },
  switchLabel: { color: '#E6EDF3', fontSize: 16, fontWeight: '600' as const, marginBottom: 2 },
  switchDescription: { color: '#9FB1C1', fontSize: 12 },
  envWarning: { color: '#FCA5A5', fontSize: 12, marginTop: 8, fontStyle: 'italic' as const },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primary: { backgroundColor: '#3B82F6' },
  secondary: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  btnTextPrimary: { color: 'white', fontWeight: '600' as const },
  btnTextSecondary: { color: '#93C5FD', fontWeight: '600' as const },
  debugButton: { backgroundColor: '#7C3AED', marginBottom: 12 },
  btnTextDebug: { color: 'white', fontWeight: '600' as const },
  status: { color: '#E6EDF3', fontSize: 14, marginBottom: 6 },
  error: { color: '#FCA5A5', fontSize: 12 },
  tipBox: { backgroundColor: '#0F1621', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1F2A37' },
  tipTitle: { color: '#E6EDF3', fontWeight: '600' as const, marginBottom: 6 },
  tipText: { color: '#9FB1C1', fontSize: 12, marginBottom: 2 },
});

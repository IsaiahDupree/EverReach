import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface MessageThread {
  id: string;
  channel: 'imessage' | 'sms' | 'whatsapp' | 'telegram' | 'discord';
  thread_id: string;
  participants: string[];
  is_group?: boolean | null;
  last_message_at?: string | null;
  created_at?: string | null;
}

export default function SupabaseTestScreen() {
  const [status, setStatus] = useState<string>('Idle');
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const envInfo = useMemo(() => ({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'unset',
    keySet: Boolean(process.env.EXPO_PUBLIC_SUPABASE_KEY) ? 'set' : 'unset',
    platform: Platform.OS,
  }), []);

  const runSelect = useCallback(async () => {
    setStatus('Querying message_threads...');
    setErrorMsg(null);
    setThreads([]);
    try {
      const { data, error } = await supabase
        .from('message_threads')
        .select('*')
        .limit(5);

      if (error) throw error;
      setThreads((data ?? []) as MessageThread[]);
      setStatus(`Success: ${data?.length ?? 0} rows`);
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));
      setStatus('Failed');
    }
  }, []);

  const tryProtectedQuery = useCallback(async () => {
    setStatus('Querying protected table people...');
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('people')
        .select('id')
        .limit(1);
      if (error) throw error;
      setStatus('Protected query succeeded (you likely have a session and org membership)');
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));
      setStatus('Protected query blocked by RLS (expected if not signed in)');
    }
  }, []);

  return (
    <View style={styles.container} testID="supabaseTestContainer">
      <Stack.Screen options={{ title: 'Supabase Test' }} />

      <View style={styles.card}>
        <Text style={styles.title} testID="envTitle">Environment</Text>
        <Text selectable style={styles.env} testID="envUrl">URL: {envInfo.url}</Text>
        <Text style={styles.env} testID="envKey">Key: {envInfo.keySet}</Text>
        <Text style={styles.env} testID="envPlatform">Platform: {envInfo.platform}</Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity onPress={runSelect} style={styles.primaryBtn} testID="btnRunSelect">
          <Text style={styles.primaryText}>Test Connection</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={tryProtectedQuery} style={styles.secondaryBtn} testID="btnProtected">
          <Text style={styles.secondaryText}>Test RLS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.status} testID="statusText">{status}</Text>
        {errorMsg ? (
          <Text style={styles.error} testID="errorText">{errorMsg}</Text>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} testID="threadsList">
        {threads.map((t) => (
          <View key={t.id} style={styles.item}>
            <Text style={styles.itemTitle}>{t.channel} · {t.thread_id}</Text>
            <Text style={styles.itemSub} numberOfLines={1}>Participants: {t.participants?.join(', ')}</Text>
          </View>
        ))}
        {threads.length === 0 && (
          <Text style={styles.empty}>No rows yet</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0B0F14' },
  card: { backgroundColor: '#121923', borderRadius: 12, padding: 12, marginBottom: 12 },
  title: { color: '#E6EDF3', fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
  env: { color: '#9FB1C1', fontSize: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: '600' as const },
  secondaryBtn: { flex: 1, backgroundColor: '#1F2937', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  secondaryText: { color: '#93C5FD', fontWeight: '600' as const },
  statusBox: { backgroundColor: '#121923', borderRadius: 12, padding: 12, marginBottom: 12 },
  status: { color: '#E6EDF3', fontSize: 14, marginBottom: 6 },
  error: { color: '#FCA5A5', fontSize: 12 },
  list: { flex: 1 },
  listContent: { paddingBottom: 40 },
  item: { backgroundColor: '#0F1621', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1F2A37' },
  itemTitle: { color: '#E6EDF3', fontWeight: '600' as const, marginBottom: 4 },
  itemSub: { color: '#9FB1C1', fontSize: 12 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 8 },
});
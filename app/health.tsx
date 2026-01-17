import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { apiGet, backendBase } from '@/lib/api';

interface CheckResult<T = any> {
  ok: boolean;
  status?: number;
  error?: string;
  data?: T;
}

export default function HealthScreen() {
  const [backend, setBackend] = useState<CheckResult>({ ok: false });
  const [supabase, setSupabase] = useState<CheckResult>({ ok: false });
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // Backend health via our api wrapper
        try {
          const data = await apiGet('/api/health');
          if (!cancelled) setBackend({ ok: true, status: 200, data });
        } catch (e: any) {
          if (!cancelled) setBackend({ ok: false, error: String(e?.message ?? e) });
        }

        // Supabase auth settings (public endpoint with anon key)
        try {
          const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
          const supabaseKey = String(process.env.EXPO_PUBLIC_SUPABASE_KEY || '');
          const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`;
          const res = await fetch(url, { headers: { apikey: supabaseKey } });
          const text = await res.text();
          let parsed: any = undefined;
          try { parsed = JSON.parse(text); } catch {}
          if (!cancelled) setSupabase({ ok: res.ok, status: res.status, data: parsed ?? text, error: res.ok ? undefined : text });
        } catch (e: any) {
          if (!cancelled) setSupabase({ ok: false, error: String(e?.message ?? e) });
        }
      } finally {
        if (!cancelled) setRunning(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Connectivity Health' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Connectivity Checks</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backend</Text>
          <Text style={styles.label}>Base:</Text>
          <Text style={styles.mono}>{backendBase()}</Text>
          {running && !backend.status ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View>
              <Text style={[styles.result, backend.ok ? styles.ok : styles.fail]}>
                {backend.ok ? 'OK' : 'FAILED'} {backend.status ? `(HTTP ${backend.status})` : ''}
              </Text>
              {backend.data ? (
                <Text style={styles.monoSmall}>{truncate(JSON.stringify(backend.data), 600)}</Text>
              ) : backend.error ? (
                <Text style={[styles.monoSmall, styles.error]}>{truncate(backend.error, 600)}</Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Supabase (Auth Settings)</Text>
          <Text style={styles.label}>URL:</Text>
          <Text style={styles.mono}>{String(process.env.EXPO_PUBLIC_SUPABASE_URL || '')}/auth/v1/settings</Text>
          {running && !supabase.status ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View>
              <Text style={[styles.result, supabase.ok ? styles.ok : styles.fail]}>
                {supabase.ok ? 'OK' : 'FAILED'} {supabase.status ? `(HTTP ${supabase.status})` : ''}
              </Text>
              {supabase.data ? (
                <Text style={styles.monoSmall}>{truncate(JSON.stringify(supabase.data), 600)}</Text>
              ) : supabase.error ? (
                <Text style={[styles.monoSmall, styles.error]}>{truncate(supabase.error, 600)}</Text>
              ) : null}
            </View>
          )}
        </View>

        <Text style={styles.note}>Navigate to /health in Expo to run these checks. This screen does not perform any write operations.</Text>
      </ScrollView>
    </View>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111827' },
  label: { fontSize: 12, color: '#6B7280' },
  result: { marginTop: 8, fontSize: 14, fontWeight: '600' },
  ok: { color: '#10B981' },
  fail: { color: '#EF4444' },
  mono: { fontFamily: Platform.select({ default: 'System', ios: 'Menlo', android: 'monospace' }) as any, color: '#111827' },
  monoSmall: { fontFamily: Platform.select({ default: 'System', ios: 'Menlo', android: 'monospace' }) as any, color: '#374151', fontSize: 12, marginTop: 6 },
  loader: { marginTop: 8 },
  error: { color: '#EF4444' },
  note: { fontSize: 12, color: '#6B7280' }
});

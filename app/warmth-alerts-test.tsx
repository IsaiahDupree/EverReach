import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Shield, CheckCircle2, XCircle, Wrench, ChevronRight, Copy, Info, RefreshCcw } from 'lucide-react-native';
// Notifications loaded dynamically on native to keep web compatible
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: any = null;
if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative')) {
  // noop for SSR or non-native, safety guard
}
import { apiFetch, backendBase } from '@/lib/api';
import { useAppSettings, type Theme } from '@/providers/AppSettingsProvider';
import { FLAGS } from '@/constants/flags';

interface TestResult {
  id: string;
  name: string;
  ok: boolean | null;
  detail: string;
  at: number;
}

export default function WarmthAlertsTestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();

  const [contactId, setContactId] = useState<string>('');
  const [manualPushToken, setManualPushToken] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [alertsPreview, setAlertsPreview] = useState<any[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const base = useMemo(() => backendBase(), []);

  const addResult = useCallback((r: Omit<TestResult, 'id' | 'at'>) => {
    const entry: TestResult = { id: Math.random().toString(36).slice(2), at: Date.now(), ...r };
    setResults(prev => [entry, ...prev].slice(0, 100));
    console.log('[WarmthAlertsTest] result:', entry);
  }, []);

  const runGetWatch = useCallback(async () => {
    if (!contactId) {
      Alert.alert('Missing contact id', 'Enter a contactId to test watch status');
      return;
    }
    try {
      setRunning(true);
      const res = await apiFetch(`/api/v1/contacts/${contactId}/watch`, { method: 'GET', requireAuth: true });
      const text = await res.text();
      const ok = res.ok;
      addResult({ name: 'GET /v1/contacts/:id/watch', ok, detail: text });
    } catch (e: any) {
      addResult({ name: 'GET /v1/contacts/:id/watch', ok: false, detail: String(e?.message ?? e) });
    } finally {
      setRunning(false);
    }
  }, [contactId, addResult]);

  const runSetWatch = useCallback(async (status: 'none' | 'watch' | 'important' | 'vip') => {
    if (!contactId) {
      Alert.alert('Missing contact id', 'Enter a contactId to test watch status');
      return;
    }
    try {
      setRunning(true);
      const res = await apiFetch(`/api/v1/contacts/${contactId}/watch`, { method: 'PATCH', requireAuth: true, body: JSON.stringify({ watch_status: status }) });
      const text = await res.text();
      addResult({ name: `PATCH /v1/contacts/:id/watch -> ${status}`, ok: res.ok, detail: text });
    } catch (e: any) {
      addResult({ name: `PATCH /v1/contacts/:id/watch -> ${status}`, ok: false, detail: String(e?.message ?? e) });
    } finally {
      setRunning(false);
    }
  }, [contactId, addResult]);

  const runListAlerts = useCallback(async () => {
    try {
      setIsLoadingAlerts(true);
      const res = await apiFetch('/api/v1/alerts', { method: 'GET', requireAuth: true });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      setAlertsPreview(Array.isArray(json) ? json.slice(0, 10) : (json?.items ?? []).slice(0, 10));
      addResult({ name: 'GET /v1/alerts', ok: res.ok, detail: text });
    } catch (e: any) {
      addResult({ name: 'GET /v1/alerts', ok: false, detail: String(e?.message ?? e) });
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [addResult]);

  const registerPushToken = useCallback(async () => {
    try {
      setIsRegistering(true);
      let token: string | null = null;

      if (Platform.OS !== 'web') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          Notifications = require('expo-notifications');
        } catch (e) {
          Alert.alert('Unavailable', 'expo-notifications not available in this environment');
          setIsRegistering(false);
          return;
        }
        const perms = await Notifications.requestPermissionsAsync();
        if (perms.status !== 'granted') {
          Alert.alert('Permission required', 'Enable notifications to register token');
          setIsRegistering(false);
          return;
        }
        const expoToken = await Notifications.getExpoPushTokenAsync();
        token = expoToken.data;
      } else {
        token = manualPushToken.trim();
      }

      if (!token) {
        Alert.alert('Missing token', Platform.OS === 'web' ? 'Paste a valid Expo push token' : 'Could not get Expo push token');
        setIsRegistering(false);
        return;
      }

      const payload = { push_token: token, platform: Platform.OS, device_name: `${Platform.OS} device` };
      const res = await apiFetch('/api/v1/push-tokens', { method: 'POST', requireAuth: true, body: JSON.stringify(payload) });
      const text = await res.text();
      addResult({ name: 'POST /v1/push-tokens', ok: res.ok, detail: text });
      if (!res.ok) Alert.alert('Registration failed', text.slice(0, 300));
      else Alert.alert('Registered', 'Push token saved');
    } catch (e: any) {
      addResult({ name: 'POST /v1/push-tokens', ok: false, detail: String(e?.message ?? e) });
    } finally {
      setIsRegistering(false);
    }
  }, [manualPushToken, addResult]);

  const copyCron = useCallback(() => {
    const url = `${base}/api/cron/check-warmth-alerts`;
    if (Platform.OS === 'web') {
      try { void navigator.clipboard.writeText(url); Alert.alert('Copied', 'Cron URL copied'); } catch { Alert.alert('Info', url); }
    } else {
      Alert.alert('Cron URL', url);
    }
  }, [base]);

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Warmth Alerts Tests' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card} testID="warmth-info-card">
          <View style={styles.cardHeader}>
            <Info size={18} color={theme.colors.textSecondary} />
            <Text style={styles.cardTitle}>Environment</Text>
          </View>
          <Text style={styles.kv} testID="backend-base">Backend: {base}</Text>
          <Text style={styles.kv}>Mode: {FLAGS.LOCAL_ONLY ? 'Local-Only' : 'Cloud'}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={copyCron} accessibilityRole="button" testID="copy-cron-url">
            <Bell size={16} color={theme.colors.primary} />
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>Copy Cron URL (/api/cron/check-warmth-alerts)</Text>
            <Copy size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card} testID="push-card">
          <View style={styles.cardHeader}>
            <Shield size={18} color={theme.colors.textSecondary} />
            <Text style={styles.cardTitle}>Push Token Registration</Text>
          </View>
          {Platform.OS === 'web' && (
            <TextInput
              style={styles.input}
              placeholder="Paste ExponentPushToken[...]"
              placeholderTextColor={theme.colors.textSecondary}
              value={manualPushToken}
              onChangeText={setManualPushToken}
              autoCapitalize="none"
              testID="push-token-input"
            />
          )}
          <TouchableOpacity
            style={[styles.button, isRegistering && styles.buttonDisabled]}
            disabled={isRegistering}
            onPress={registerPushToken}
            testID="register-push-button"
          >
            {isRegistering ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.buttonText}>Register Push Token</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card} testID="watch-card">
          <View style={styles.cardHeader}>
            <Wrench size={18} color={theme.colors.textSecondary} />
            <Text style={styles.cardTitle}>Watch Status</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="contactId (UUID)"
            placeholderTextColor={theme.colors.textSecondary}
            value={contactId}
            onChangeText={setContactId}
            autoCapitalize="none"
            testID="contact-id-input"
          />
          <View style={styles.rowWrap}>
            <SmallButton label="Get" onPress={runGetWatch} theme={theme} testID="get-watch" />
            <SmallButton label="None" onPress={() => runSetWatch('none')} theme={theme} testID="set-watch-none" />
            <SmallButton label="Watch" onPress={() => runSetWatch('watch')} theme={theme} testID="set-watch-watch" />
            <SmallButton label="Important" onPress={() => runSetWatch('important')} theme={theme} testID="set-watch-important" />
            <SmallButton label="VIP" onPress={() => runSetWatch('vip')} theme={theme} testID="set-watch-vip" />
          </View>
        </View>

        <View style={styles.card} testID="alerts-card">
          <View style={styles.cardHeader}>
            <Bell size={18} color={theme.colors.textSecondary} />
            <Text style={styles.cardTitle}>Alerts</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={runListAlerts} testID="list-alerts-button">
            {isLoadingAlerts ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.buttonText}>List Alerts</Text>
            )}
          </TouchableOpacity>
          {alertsPreview.length > 0 && (
            <View style={styles.previewBox} testID="alerts-preview">
              {alertsPreview.map((a, i) => (
                <Text key={String(a?.id ?? i)} style={styles.previewLine} numberOfLines={2}>
                  • {a?.contact?.display_name ?? a?.contact_id ?? 'alert'} · warmth {a?.warmth_at_alert ?? '-'}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card} testID="results-card">
          <View style={styles.cardHeader}>
            <RefreshCcw size={18} color={theme.colors.textSecondary} />
            <Text style={styles.cardTitle}>Recent Results</Text>
          </View>
          {running && <Text style={styles.kv}>Running…</Text>}
          {results.length === 0 ? (
            <Text style={styles.kv}>No results yet</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {results.map(r => (
                <View key={r.id} style={styles.resultRow} testID={`result-${r.id}`}>
                  {r.ok ? (
                    <CheckCircle2 size={16} color={theme.colors.success} />
                  ) : r.ok === false ? (
                    <XCircle size={16} color={theme.colors.error} />
                  ) : (
                    <ChevronRight size={16} color={theme.colors.textSecondary} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.resultDetail} numberOfLines={3}>{r.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SmallButton({ label, onPress, theme, testID }: { label: string; onPress: () => void; theme: Theme; testID?: string }) {
  return (
    <TouchableOpacity style={[stylesStatic.smallBtn, { backgroundColor: theme.colors.primary }]} onPress={onPress} testID={testID} accessibilityRole="button">
      <Text style={[stylesStatic.smallBtnText, { color: theme.colors.surface }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const stylesStatic = StyleSheet.create({
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  smallBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  kv: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  previewBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 6,
  },
  previewLine: {
    fontSize: 13,
    color: theme.colors.text,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  resultDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

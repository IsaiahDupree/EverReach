import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '@/lib/api';

interface ImportStatus {
  id: string;
  provider: 'google' | 'microsoft';
  status: 'pending' | 'authenticating' | 'fetching' | 'processing' | 'completed' | 'failed';
  total_contacts: number;
  processed_contacts: number;
  imported_contacts: number;
  skipped_contacts: number;
  failed_contacts: number;
  progress_percent: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export default function ImportCallbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Redirect to consolidated import page
  useEffect(() => {
    if (id) {
      console.log('[ImportCallback] Redirecting to unified import page with job_id:', id);
      router.replace(`/import-third-party?job_id=${id}` as any);
    }
  }, [id]);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

// Keep for reference but not used anymore
function OldImplementation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/v1/contacts/import/status/${id}`, {
          method: 'GET',
          requireAuth: true,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Status ${res.status} ${txt}`);
        }
        const json: ImportStatus = await res.json();
        setStatus(json);
        if (json.status === 'completed') {
          clear();
          // small delay to show success, then route back into the app
          setTimeout(() => {
            // Prefer import-contacts screen if present
            router.replace('/import-contacts');
          }, 600);
        }
        if (json.status === 'failed') {
          clear();
          setError(json.error_message || 'Import failed');
        }
      } catch (e: any) {
        clear();
        setError(e?.message || 'Unable to complete import');
      }
    };

    const clear = () => {
      if (polling.current) {
        clearInterval(polling.current);
        polling.current = null;
      }
    };

    // start polling
    poll();
    polling.current = setInterval(poll, 1500);
    return clear;
  }, [id]);

  const goHome = () => router.replace('/(tabs)/home');
  const goImport = () => router.replace('/import-contacts');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {!error ? (
        <>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.title}>Completing import...</Text>
          {status && (
            <Text style={styles.subtitle}>
              {status.status === 'processing' && `Processing ${status.processed_contacts}/${status.total_contacts} contacts...`}
              {status.status === 'fetching' && 'Fetching contacts...'}
              {status.status === 'authenticating' && 'Waiting for authentication...'}
              {status.status === 'completed' && `Imported ${status.imported_contacts} contacts ✓`}
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={goImport}>
              <Text style={styles.actionText}>Go to Import Contacts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.secondary]} onPress={goHome}>
              <Text style={[styles.actionText, styles.secondaryText]}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Import Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={goImport}>
              <Text style={styles.actionText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  text: { marginTop: 16, fontSize: 16, color: '#6B7280', textAlign: 'center' },
  title: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
  actions: { marginTop: 24, gap: 12, width: 260 },
  actionBtn: { backgroundColor: '#7C3AED', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondary: { backgroundColor: '#EEF2FF' },
  secondaryText: { color: '#374151' },
  errorText: { marginTop: 8, fontSize: 14, color: '#DC2626', textAlign: 'center' },
});

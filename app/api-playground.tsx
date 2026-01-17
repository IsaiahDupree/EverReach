import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useAnalytics } from '@/hooks/useAnalytics';
import { apiFetch } from '@/lib/api';

export default function ApiPlayground() {
  const { theme } = useAppSettings();
  const screenAnalytics = useAnalytics('ApiPlayground');
  const [endpoint, setEndpoint] = useState<string>('/api/v1/me');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [body, setBody] = useState<string>('{}');
  const [responseText, setResponseText] = useState<string>('');

  const presets = [
    {
      label: 'GET /api/v1/me',
      endpoint: '/api/v1/me',
      method: 'GET' as const,
      body: '',
    },
    {
      label: 'GET /api/v1/me/usage',
      endpoint: '/api/v1/me/usage',
      method: 'GET' as const,
      body: '',
    },
    {
      label: 'POST /api/v1/compose',
      endpoint: '/api/v1/compose',
      method: 'POST' as const,
      body: JSON.stringify({
        contact_id: 'example-contact-id',
        goal: 'check_in',
        channel: 'sms',
        variables: { tone: 'casual' },
        include: { persona_notes: true, interactions: true, voice_notes: true },
      }, null, 2),
    },
  ];

  const handleSend = async () => {
    try {
      screenAnalytics.track('api_playground_request_sent', { endpoint, method });
      const res = await apiFetch(endpoint as any, {
        method,
        requireAuth: true,
        body: method === 'POST' ? body : undefined,
      });
      const text = await res.text();
      setResponseText(text);
      screenAnalytics.track('api_playground_response', { endpoint, method, ok: res.ok, status: res.status });
    } catch (e: any) {
      setResponseText(String(e?.message || e));
      Alert.alert('Request failed', String(e?.message || e));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'API Playground', headerShown: true }} />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Presets */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Presets</Text>
        <View style={[styles.row, { flexWrap: 'wrap' as const }]}>
          {presets.map((p) => (
            <TouchableOpacity
              key={p.label}
              onPress={() => {
                setEndpoint(p.endpoint);
                setMethod(p.method);
                setBody(p.body || '');
                screenAnalytics.track('api_playground_preset_clicked', { endpoint: p.endpoint, method: p.method });
              }}
              style={[styles.presetBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.text }]}>Endpoint</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          value={endpoint}
          onChangeText={setEndpoint}
          autoCapitalize="none"
          placeholder="/api/v1/me"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>Method</Text>
        <View style={styles.row}>
          {(['GET', 'POST'] as const).map(m => (
            <TouchableOpacity key={m} style={[styles.chip, { borderColor: theme.colors.border, backgroundColor: method === m ? theme.colors.primary : theme.colors.surface }]} onPress={() => setMethod(m)}>
              <Text style={[styles.chipText, { color: method === m ? theme.colors.surface : theme.colors.text }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {method === 'POST' && (
          <>
            <Text style={[styles.label, { color: theme.colors.text }]}>Body (JSON)</Text>
            <TextInput
              style={[styles.textarea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="{}"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </>
        )}

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleSend}>
          <Text style={[styles.buttonText, { color: theme.colors.surface }]}>Send</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16, color: theme.colors.text }]}>Response</Text>
        <Text style={[styles.response, { color: theme.colors.text }]} selectable>{responseText || '(response will appear here)'}</Text>

        <View style={{ height: 24 }} />
        <TouchableOpacity onPress={() => router.push('/subscription-plans')}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>View Plans</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12 },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, minHeight: 120 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  presetBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  presetText: { fontSize: 12, fontWeight: '600' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  button: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  response: { fontSize: 12, lineHeight: 16 },
});

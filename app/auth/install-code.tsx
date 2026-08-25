import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { savePendingInstallAttributionCode } from '@/lib/installAttributionHandoff';

export default function InstallAttributionCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await savePendingInstallAttributionCode(code);
      router.replace('/auth?isSignUp=true&installCodeSaved=true' as any);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Install recovery code is invalid');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Recover your content journey</Text>
          <Text style={styles.body}>
            Paste the code shown before the App Store opened. It will be verified and
            associated with your account after you sign in. No attribution is inferred.
          </Text>
          <CrossPlatformTextInput
            value={code}
            onChangeText={(value) => {
              setCode(value.toUpperCase());
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ER1-XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void saveCode()}
          >
            {busy
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.primaryText}>Save code and continue</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/auth' as any)}
          >
            <Text style={styles.secondaryText}>Continue without a code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  title: {
    color: '#111827',
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    marginTop: 18,
    paddingVertical: 15,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 13,
  },
  secondaryText: {
    color: '#6D28D9',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});

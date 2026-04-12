/**
 * SunTrace — Sign In Screen
 *
 * Supports:
 * - Email magic link (passwordless)
 * - Apple Sign In (via expo-apple-authentication)
 * - Google OAuth (via Supabase OAuth redirect)
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sun } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type Mode = 'idle' | 'loading' | 'sent';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setMode('loading');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: 'suntrace://auth/callback',
      },
    });

    if (authError) {
      setError(authError.message);
      setMode('idle');
    } else {
      setMode('sent');
    }
  }

  async function handleAppleSignIn() {
    // Apple Sign In requires expo-apple-authentication
    // Implemented via expo-apple-authentication + Supabase signInWithIdToken
    try {
      const { AppleAuthenticationScope, signInAsync } =
        await import('expo-apple-authentication');
      const credential = await signInAsync({
        requestedScopes: [
          AppleAuthenticationScope.FULL_NAME,
          AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token from Apple');
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (authError) throw authError;
      router.replace('/(tabs)/home');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In failed', e?.message ?? 'Unknown error');
      }
    }
  }

  if (mode === 'sent') {
    return (
      <View style={styles.sentContainer}>
        <View style={styles.sentIcon}>
          <Sun size={40} color="#F97316" />
        </View>
        <Text style={styles.sentTitle}>Check your email</Text>
        <Text style={styles.sentBody}>
          We sent a sign-in link to{'\n'}
          <Text style={styles.sentEmail}>{email}</Text>
        </Text>
        <TouchableOpacity onPress={() => setMode('idle')} style={styles.resendButton}>
          <Text style={styles.resendText}>Use a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Sun size={40} color="white" />
          </View>
          <Text style={styles.logoTitle}>SunTrace</Text>
          <Text style={styles.logoSubtitle}>Your personal sun coach</Text>
        </View>

        {/* Email input */}
        <View style={styles.card}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleMagicLink}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleMagicLink}
            disabled={mode === 'loading'}
            activeOpacity={0.85}
          >
            {mode === 'loading' ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Magic Link</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Apple Sign In */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            activeOpacity={0.85}
          >
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.privacyNote}>
          By continuing you agree to our{' '}
          <Text style={styles.link} onPress={() => router.push('/privacy-policy')}>
            Privacy Policy
          </Text>
          {' '}and{' '}
          <Text style={styles.link} onPress={() => router.push('/terms')}>
            Terms of Service
          </Text>
          .
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoTitle: { fontSize: 32, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.5 },
  logoSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorText: { fontSize: 13, color: '#EF4444' },
  primaryButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: 'white' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E293B' },
  dividerText: { fontSize: 13, color: '#475569' },
  appleButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  appleButtonText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  privacyNote: { fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 18 },
  link: { color: '#F97316' },
  // Sent state
  sentContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sentTitle: { fontSize: 24, fontWeight: '800', color: '#F1F5F9', marginBottom: 12 },
  sentBody: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sentEmail: { color: '#F97316', fontWeight: '600' },
  resendButton: { paddingVertical: 8 },
  resendText: { fontSize: 14, color: '#64748B' },
});

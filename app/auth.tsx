import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Pressable, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, Lock, ArrowRight, Check } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useAuth } from '@/providers/AuthProviderV2';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { FLAGS } from '@/constants/flags';

type AuthMode = 'email' | 'password';

export default function Auth() {
  const router = useRouter();
  const { session, loading: authLoading, signInWithApple } = useAuth();
  const { refreshEntitlements } = useSubscription();

  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Animated value for smooth transitions
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  // Track if user manually changed sign-up state to prevent URL params from overriding
  const userChangedSignUp = React.useRef(false);
  
  // Get URL parameters
  const params = useLocalSearchParams();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (session && !authLoading) {
      const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
      if (returnTo) {
        router.replace(returnTo as any);
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, authLoading, params.returnTo]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const handleEmailSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setMode('password');
  };

  const handlePasswordAuth = async (manualEmail?: string, manualPassword?: string) => {
    const targetEmail = manualEmail || email;
    const targetPassword = manualPassword || password;

    if (FLAGS.LOCAL_ONLY) {
      setError('Authentication disabled in local mode');
      return;
    }

    if (!targetPassword.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign up flow
        const { error: signUpError } = await supabase.auth.signUp({
          email: targetEmail.trim(),
          password: targetPassword,
          options: {
            emailRedirectTo: Platform.OS === 'web'
              ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.everreach.app'}/auth/callback`
              : 'everreach://auth/callback',
          },
        });

        if (signUpError) throw signUpError;

        // Show success message
        setError(null);
        setMagicLinkSent(true);
      } else {
        // Sign in flow
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: targetEmail.trim(),
          password: targetPassword,
        });

        if (signInError) {
          throw signInError;
        }

        // Auto-refresh entitlements after successful sign in
        console.log('[Auth] Sign in successful, refreshing entitlements...');
        try {
          await refreshEntitlements();
          console.log('[Auth] ✅ Entitlements refreshed automatically');
        } catch (refreshError) {
          console.warn('[Auth] Failed to auto-refresh entitlements:', refreshError);
          // Don't block login if entitlements refresh fails
        }
      }
    } catch (err: any) {
      console.error('[Auth] Error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-login via deep link params
  useEffect(() => {
    // Don't override if user manually changed sign-up state
    if (userChangedSignUp.current) return;
    
    const { email: pEmail, password: pPassword, autoSubmit, isSignUp: pIsSignUp, returnTo } = params;
    const paramEmail = Array.isArray(pEmail) ? pEmail[0] : pEmail;
    const paramPassword = Array.isArray(pPassword) ? pPassword[0] : pPassword;
    const shouldSubmit = Array.isArray(autoSubmit) ? autoSubmit[0] === 'true' : autoSubmit === 'true';
    const startInSignUp = Array.isArray(pIsSignUp) ? pIsSignUp[0] === 'true' : pIsSignUp === 'true';

    if (paramEmail) {
      setEmail(paramEmail);
      setMode('password'); // Go directly to password mode if email provided
    }
    if (paramPassword) {
      setPassword(paramPassword);
    }
    if (startInSignUp) {
      setIsSignUp(true);
    }

    if (shouldSubmit && paramEmail && paramPassword) {
      // Small delay to ensure hydration/mounting
      setTimeout(() => {
        handlePasswordAuth(paramEmail, paramPassword);
      }, 1000);
    }
  }, [params]);

  const handleMagicLink = async () => {
    if (FLAGS.LOCAL_ONLY) {
      setError('Magic link disabled in local mode');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: Platform.OS === 'web'
            ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.everreach.app'}/auth/callback`
            : 'everreach://auth/callback',
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err: any) {
      console.error('[Auth] Magic link error:', err);
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMode('email');
    setPassword('');
    setError(null);
    setIsSignUp(false);
  };

  const handleForgotPassword = () => {
    console.log('[Auth] Forgot password clicked, email:', email);
    try {
      const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
      const route = `/auth/forgot-password${emailParam}`;
      console.log('[Auth] Navigating to:', route);

      // Use replace instead of push for more reliable navigation
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = route;
      } else {
        router.replace(route as any);
      }
    } catch (err) {
      console.error('[Auth] Navigation error:', err);
    }
  };

  // Success screen after magic link sent
  if (magicLinkSent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.successIcon}>
            <Check size={48} color="#10B981" strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successMessage}>
            We sent {isSignUp ? 'a verification link' : 'a magic sign-in link'} to
          </Text>
          <Text style={styles.emailHighlight}>{email}</Text>
          <Text style={styles.successHint}>
            Click the link in the email to {isSignUp ? 'verify your account' : 'sign in'}.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setMagicLinkSent(false);
              setMode('email');
              setEmail('');
              setPassword('');
            }}
          >
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#F3E8FF', '#E9D5FF', '#DDD6FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoContainer}
              >
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </LinearGradient>
              <Text style={styles.title}>Welcome to EverReach</Text>
              <Text style={styles.subtitle}>
                {isSignUp ? 'Create your account' : 'Sign in to continue'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Apple Sign In (iOS only) */}
              {Platform.OS === 'ios' && (
                <View style={styles.socialAuthContainer}>
                  {appleLoading ? (
                    <View style={[styles.appleButton, styles.appleLoadingContainer]}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={12}
                      style={styles.appleButton}
                      onPress={async () => {
                        setAppleLoading(true);
                        setError(null);
                        
                        // Add timeout to prevent getting stuck
                        const timeoutId = setTimeout(() => {
                          console.warn('[Auth] Apple sign-in timeout - resetting loading state');
                          setAppleLoading(false);
                          setError('Apple sign-in timed out. Please try again.');
                        }, 30000); // 30 second timeout
                        
                        try {
                          await signInWithApple();
                          clearTimeout(timeoutId);
                        } catch (e: any) {
                          clearTimeout(timeoutId);
                          console.log('[Auth] Apple sign-in failed/cancelled', e.message || 'Unknown error');
                          if (e?.code !== 'ERR_REQUEST_CANCELED') {
                            setError('Apple sign-in failed. Please try again.');
                          }
                        } finally {
                          clearTimeout(timeoutId);
                          setAppleLoading(false);
                        }
                      }}
                    />
                  )}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with email</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                  <CrossPlatformTextInput
                    style={styles.input}
                    placeholder="you@company.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                  <CrossPlatformTextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError(null);
                    }}
                    secureTextEntry
                    autoComplete="password"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Primary Action Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={() => handlePasswordAuth()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? 'Create account' : 'Sign in'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Secondary Actions */}
              {!isSignUp && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleForgotPassword}
                  testID="forgot-password-button"
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  userChangedSignUp.current = true;
                  setIsSignUp(!isSignUp);
                  setError(null); // Clear any errors when switching
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
              </TouchableOpacity>

            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.open('/terms', '_blank');
                    } else {
                      router.push('/terms' as any);
                    }
                  }}
                >
                  Terms
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.open('/privacy-policy', '_blank');
                    } else {
                      router.push('/privacy-policy' as any);
                    }
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#7C3AED',
    fontWeight: '600',
  },
  socialAuthContainer: {
    marginBottom: 24,
    gap: 16,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  appleLoadingContainer: {
    backgroundColor: '#000000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C3AED',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  footer: {
    paddingTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  successHint: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});

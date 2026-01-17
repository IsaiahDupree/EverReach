import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard, PanResponder, Image, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useAuth } from '../providers/AuthProvider';
import { AnalyticsService } from '@/services/analytics';

export default function SignIn() {
  const { signInWithGoogle, signInWithApple, signInWithEmailOtp, signInWithPassword, signUp, loading } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (_evt, gestureState) => {
      if (gestureState.dy > 50) {
        Keyboard.dismiss();
      }
    },
  });

  const canSubmit = useMemo<boolean>(() => !!email.trim() && !loading, [email, loading]);

  const primaryScale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.timing(primaryScale, { toValue: 0.98, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  };
  const handlePressOut = () => {
    Animated.timing(primaryScale, { toValue: 1, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  };

  const animatedScaleStyle = useMemo(() => ({
    transform: [{ scale: primaryScale as unknown as number }],
  }), [primaryScale]);

  // Track screen view
  useEffect(() => {
    AnalyticsService.trackScreenViewed({ screenName: 'sign_in' });
  }, []);

  const handleEmailAuth = async () => {
    setError(null);
    if (!email.trim()) return;
    
    try {
      if (isSignUp) {
        if (password.trim()) {
          console.log('[SignIn] signUp with password');
          await signUp(email.trim(), password);
        } else {
          console.log('[SignIn] signUp via magic link');
          await signInWithEmailOtp(email.trim());
        }
        AnalyticsService.trackSignedUp({ method: 'email', source: 'organic', hasReferralCode: false });
      } else {
        if (password.trim()) {
          console.log('[SignIn] signIn with password');
          await signInWithPassword(email.trim(), password);
        } else {
          console.log('[SignIn] signIn via magic link');
          await signInWithEmailOtp(email.trim());
        }
        AnalyticsService.trackSignedIn({ method: 'email' });
      }
    } catch (e: unknown) {
      const message = typeof e === 'string' ? e : (e as { message?: string })?.message ?? 'Something went wrong. Please try again.';
      console.error('[SignIn] auth error', e);
      setError(message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      AnalyticsService.trackSignedIn({ method: 'google' });
    } catch (e: unknown) {
      const message = typeof e === 'string' ? e : (e as { message?: string })?.message ?? 'Google sign in failed';
      console.error('[SignIn] Google auth error', e);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      AnalyticsService.trackSignedIn({ method: 'apple' });
    } catch (e: unknown) {
      const message = typeof e === 'string' ? e : (e as { message?: string })?.message ?? 'Apple sign in failed';
      console.error('[SignIn] Apple auth error', e);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} {...panResponder.panHandlers}>
          <View style={styles.heroWrap}>
            <View style={styles.heroGlow} />
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k06vwypz60k05vjo6ylch' }}
              style={styles.logo}
              accessible
              accessibilityLabel="EverReach logo"
              testID="everreach-logo-signin"
            />
            <Text style={styles.kicker} testID="signin-kicker">Welcome to</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>EverReach</Text>
              <Sparkles color="#7C3AED" size={20} />
            </View>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account to get started' : 'Sign in to continue building relationships'}
            </Text>
          </View>

          <View style={styles.card} testID="signin-card">
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn} disabled={loading} testID="google-button" accessibilityRole="button" accessibilityLabel="Continue with Google">
                <View style={styles.socialInner}>
                  <Image source={{ uri: 'https://static-00.iconduck.com/assets.00/google-icon-2048x2048-czn3g8x8.png' }} style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </View>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={handleAppleSignIn} disabled={loading} testID="apple-button" accessibilityRole="button" accessibilityLabel="Continue with Apple">
                  <View style={styles.socialInner}>
                    <Image source={{ uri: 'https://static-00.iconduck.com/assets.00/apple-logo-icon-512x512-3t7s2g7k.png' }} style={[styles.socialIcon, styles.appleIcon]} />
                    <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continue with Apple</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholderTextColor="#9CA3AF"
                  testID="email-input"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (optional for magic link)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  placeholderTextColor="#9CA3AF"
                  testID="password-input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} testID="toggle-password-visibility">
                  {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorBox} testID="auth-error">
                <ShieldCheck size={18} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Animated.View style={[styles.primaryButtonWrap, animatedScaleStyle]}>
              <TouchableOpacity
                style={[styles.primaryButton, (!canSubmit) && styles.primaryButtonDisabled]}
                onPress={handleEmailAuth}
                disabled={!canSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                accessibilityRole="button"
                accessibilityLabel={password.trim() ? (isSignUp ? 'Sign up' : 'Sign in') : 'Send magic link'}
                testID="primary-auth-button"
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.primaryButtonText, styles.loadingText]}>Working...</Text>
                  </View>
                ) : (
                  <View style={styles.primaryInner}> 
                    <Text style={styles.primaryButtonText}>
                      {password.trim() ? (isSignUp ? 'Sign Up' : 'Sign In') : 'Send Magic Link'}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.switchButton} onPress={() => setIsSignUp(!isSignUp)} testID="switch-auth-mode">
              <Text style={styles.switchButtonText}>
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroWrap: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 16,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    width: 320,
    height: 160,
    borderRadius: 160,
    backgroundColor: '#EDE9FE',
    opacity: 0.8,
    filter: Platform.OS === 'web' ? 'blur(60px)' as unknown as undefined : undefined,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 12,
  },
  kicker: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  socialButtons: {
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  socialInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialIcon: {
    width: 18,
    height: 18,
  },
  appleIcon: {
    tintColor: '#FFFFFF',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9CA3AF',
  },
  inputContainer: {
    gap: 12,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  primaryButtonWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#FFFFFF',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
});

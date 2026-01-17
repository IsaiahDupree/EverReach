/**
 * EXAMPLE: Sign In Page - Fully Themed
 * 
 * This is an example of how sign-in.tsx SHOULD look after theming refactor.
 * Compare this to the current sign-in.tsx to see the difference.
 * 
 * Key changes:
 * 1. No hardcoded colors - all use theme.colors.*
 * 2. Uses createCommonStyles() for reusable components
 * 3. Custom styles memoized with theme dependency
 * 4. Icon colors use getIconColor() helper
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard, PanResponder, Image, Animated, Easing, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { createCommonStyles, getIconColor } from '../constants/themedStyles';
import { AuthProviderButton } from '../components/AuthProviderButton';
import { getOAuthProviders } from '../constants/authProviders';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, X, CheckCircle2 } from 'lucide-react-native';
import InlineToast from '@/components/InlineToast';

export default function SignIn() {
  const router = useRouter();
  const { theme } = useTheme();
  const common = createCommonStyles(theme);
  const styles = useMemo(() => createThemedStyles(theme), [theme]);
  
  const { signInWithGoogle, signInWithApple, signInWithEmail, requestPasswordReset, loading, session } = useAuth();
  const [authProviderLoading, setAuthProviderLoading] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const oauthProviders = getOAuthProviders();
  const [error, setError] = useState<string | null>(null);
  const [showEmailSentModal, setShowEmailSentModal] = useState<boolean>(false);
  const [emailSentMessage, setEmailSentMessage] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('error');
  
  // Icon colors from theme
  const iconColor = getIconColor(theme, 'secondary');
  const iconColorTertiary = getIconColor(theme, 'tertiary');
  
  // Auto-navigate when user signs in
  useEffect(() => {
    if (session && !loading) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, router]);

  const canSubmit = useMemo<boolean>(() => !!email.trim() && !!password.trim() && !loading, [email, password, loading]);

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

  const handleOAuthSignIn = async (providerId: string, handler: () => Promise<void>) => {
    setAuthProviderLoading(providerId);
    setError(null);
    try {
      await handler();
    } catch (error: any) {
      console.error(`[SignIn] ${providerId} auth error:`, error);
      setError(error.message || `Failed to sign in with ${providerId}`);
    } finally {
      setAuthProviderLoading(null);
    }
  };

  const handleEmailAuth = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: unknown) {
      const message = typeof e === 'string' ? e : (e as { message?: string })?.message ?? 'Something went wrong. Please try again.';
      
      if (message.toLowerCase().includes('invalid') && message.toLowerCase().includes('password')) {
        setError('Incorrect password. Please try again or use "Forgot Password?" to reset it.');
      } else if (message.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(message);
      }
    }
  };

  const handleResetPassword = async () => {
    try {
      setError(null);
      const emailToUse = (resetEmail || email).trim();
      if (!emailToUse) {
        setError('Please enter your email address');
        return;
      }
      await requestPasswordReset(emailToUse);
      setShowResetModal(false);
      setEmailSentMessage('We sent you a password reset link. Open it on this device to set a new password.');
      setShowEmailSentModal(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to send reset email. Please try again.');
    }
  };

  return (
    <SafeAreaView style={common.safeContainer}>
      <InlineToast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroWrap}>
            <View style={styles.heroGlow} />
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k06vwypz60k05vjo6ylch' }}
                style={styles.logo}
                defaultSource={require('../assets/images/icon.png')}
              />
            </View>
            <Text style={styles.kicker}>Welcome to</Text>
            <View style={styles.titleRow}>
              <Text style={common.title}>EverReach</Text>
              <Sparkles color={theme.colors.primary} size={20} />
            </View>
            <Text style={[common.body, { textAlign: 'center' }]}>
              {isSignUp ? 'Create your account to get started' : 'Sign in to continue building relationships'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={common.card}>
            {/* OAuth Providers */}
            <View style={styles.socialButtons}>
              {oauthProviders.map((provider) => {
                const handler = provider.id === 'google' ? signInWithGoogle : signInWithApple;
                return (
                  <AuthProviderButton
                    key={provider.id}
                    provider={provider.id}
                    onPress={() => handleOAuthSignIn(provider.id, handler)}
                    loading={authProviderLoading === provider.id}
                    disabled={loading || authProviderLoading !== null}
                  />
                );
              })}
            </View>

            {/* Divider */}
            <View style={common.dividerWithText}>
              <View style={common.dividerLine} />
              <Text style={common.dividerText}>or</Text>
              <View style={common.dividerLine} />
            </View>

            {/* Email/Password Inputs */}
            <View style={styles.inputContainer}>
              <View style={common.inputWrapper}>
                <Mail size={20} color={iconColor} style={common.inputIcon} />
                <TextInput
                  style={common.input}
                  placeholder="Enter your email"
                  placeholderTextColor={iconColorTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <View style={common.inputWrapper}>
                <Lock size={20} color={iconColor} style={common.inputIcon} />
                <TextInput
                  style={common.input}
                  placeholder="Password"
                  placeholderTextColor={iconColorTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  {showPassword ? <EyeOff size={20} color={iconColor} /> : <Eye size={20} color={iconColor} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error State */}
            {error && (
              <View style={common.errorBox}>
                <ShieldCheck size={18} color={theme.colors.error} />
                <Text style={common.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Animated.View style={[{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }, animatedScaleStyle]}>
              <TouchableOpacity
                style={[common.primaryButton, (!canSubmit) && common.disabledButton]}
                onPress={handleEmailAuth}
                disabled={!canSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[common.primaryButtonText, { marginLeft: theme.spacing.sm }]}>Working...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Text style={common.primaryButtonText}>Sign In</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Bottom Links */}
            <View style={styles.bottomLinks}>
              {email.trim() && (
                <TouchableOpacity style={common.textButton} onPress={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}>
                  <Text style={common.textButtonText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={common.textButton} onPress={() => {}}>
                <Text style={[common.caption, { textAlign: 'center' }]}>
                  Don't have an account? Contact us to get started
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={common.caption}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email Sent Modal */}
      <Modal visible={showEmailSentModal} transparent animationType="fade">
        <View style={common.modalOverlay}>
          <View style={common.modalContent}>
            <View style={styles.modalHeader}>
              <CheckCircle2 size={48} color={theme.colors.success} />
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowEmailSentModal(false)}>
                <X size={24} color={iconColor} />
              </TouchableOpacity>
            </View>
            <Text style={common.modalTitle}>Check Your Email</Text>
            <Text style={common.modalMessage}>{emailSentMessage}</Text>
            <TouchableOpacity style={common.primaryButton} onPress={() => setShowEmailSentModal(false)}>
              <Text style={common.primaryButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={common.modalOverlay}>
          <View style={common.modalContent}>
            <View style={styles.modalHeader}>
              <Lock size={48} color={theme.colors.primary} />
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowResetModal(false)}>
                <X size={24} color={iconColor} />
              </TouchableOpacity>
            </View>
            <Text style={common.modalTitle}>Reset Password</Text>
            <Text style={common.modalMessage}>Enter your email address and we'll send you a link to reset your password.</Text>
            
            <View style={[common.inputWrapper, { marginVertical: theme.spacing.md }]}>
              <Mail size={20} color={iconColor} style={common.inputIcon} />
              <TextInput
                style={common.input}
                placeholder="Enter your email"
                placeholderTextColor={iconColorTertiary}
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <TouchableOpacity style={[common.secondaryButton, { flex: 1 }]} onPress={() => setShowResetModal(false)}>
                <Text style={common.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[common.primaryButton, { flex: 1 }]} onPress={handleResetPassword}>
                <Text style={common.primaryButtonText}>Send Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Custom themed styles specific to this screen
const createThemedStyles = (theme: any) => ({
  heroWrap: {
    alignItems: 'center' as const,
    paddingTop: theme.spacing.huge,
    paddingBottom: theme.spacing.lg,
    position: 'relative' as const,
  },
  heroGlow: {
    position: 'absolute' as const,
    top: 0,
    width: 320,
    height: 160,
    borderRadius: 160,
    backgroundColor: theme.isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(124, 58, 237, 0.1)',
    opacity: 0.8,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.xl,
  },
  kicker: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },
  socialButtons: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  eyeIcon: {
    padding: theme.spacing.xs,
  },
  bottomLinks: {
    gap: theme.spacing.xs,
    alignItems: 'center' as const,
  },
  footer: {
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center' as const,
  },
  modalHeader: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.lg,
    position: 'relative' as const,
  },
  modalClose: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    padding: theme.spacing.xs,
  },
});

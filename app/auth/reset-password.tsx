import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, Check, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Validate code exists on mount
  useEffect(() => {
    const code = params?.code;
    
    if (!code) {
      setError('Invalid or missing recovery code. Please request a new password reset link.');
    } else {
      console.log('[ResetPassword] Code detected, ready for password reset');
    }
  }, [params?.code]);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(pwd)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(pwd)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(pwd)) {
      setError('Password must contain at least one number');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    setError(null);

    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 2000);
    } catch (err: any) {
      console.error('[ResetPassword] Update error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.successIcon}>
            <Check size={48} color="#10B981" strokeWidth={3} />
          </View>

          <Text style={styles.successTitle}>Password reset!</Text>
          
          <Text style={styles.successMessage}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.primaryButtonText}>Continue to app</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Error state (invalid/expired link)
  if (error && !password) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>

          <Text style={styles.errorTitle}>Link expired</Text>
          
          <Text style={styles.errorMessage}>
            This password reset link has expired or is invalid. Please request a new one.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.href = '/auth/forgot-password';
              } else {
                router.replace('/auth/forgot-password' as any);
              }
            }}
          >
            <Text style={styles.primaryButtonText}>Request new link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.href = '/auth';
              } else {
                router.replace('/auth' as any);
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Back to sign in</Text>
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
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Lock size={32} color="#7C3AED" strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password to keep your account secure.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* New Password */}
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#6B7280" style={styles.inputIcon} />
              <CrossPlatformTextInput
                style={styles.input}
                placeholder="New password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                autoFocus
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#6B7280" style={styles.inputIcon} />
              <CrossPlatformTextInput
                style={styles.input}
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>Password must have:</Text>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, password.length >= 8 && styles.requirementDotMet]} />
                <Text style={[styles.requirementText, password.length >= 8 && styles.requirementTextMet]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, /[A-Z]/.test(password) && styles.requirementDotMet]} />
                <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementTextMet]}>
                  One uppercase letter
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, /[a-z]/.test(password) && styles.requirementDotMet]} />
                <Text style={[styles.requirementText, /[a-z]/.test(password) && styles.requirementTextMet]}>
                  One lowercase letter
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, /[0-9]/.test(password) && styles.requirementDotMet]} />
                <Text style={[styles.requirementText, /[0-9]/.test(password) && styles.requirementTextMet]}>
                  One number
                </Text>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset password</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
    marginBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  form: {
    flex: 1,
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
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 4,
  },
  requirements: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginRight: 10,
  },
  requirementDotMet: {
    backgroundColor: '#10B981',
  },
  requirementText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  requirementTextMet: {
    color: '#10B981',
    fontWeight: '500',
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
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    marginTop: 60,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    marginTop: 60,
  },
  errorIconText: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
});

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Lightbulb, Bug, Send } from 'lucide-react-native';
import { useAppSettings, type Theme } from '@/providers/AppSettingsProvider';
import { useAuth } from '@/providers/AuthProviderV2';
import { apiFetch } from '@/lib/api';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';

type RequestType = 'feature' | 'feedback' | 'bug';

export default function FeatureRequestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppSettings();
  const { user } = useAuth();
  
  // Analytics tracking
  const screenAnalytics = useAnalytics('FeatureRequest');
  
  const [requestType, setRequestType] = useState<RequestType>('feature');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for your request.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide a description.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Track submission attempt
      screenAnalytics.track('feature_request_submitted', {
        requestType: requestType,
        titleLength: title.trim().length,
        descriptionLength: description.trim().length,
        hasEmail: !!email.trim(),
        isAuthenticated: !!user,
      });
      
      await apiFetch('/api/v1/feature-requests', {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({
          type: requestType,
          title: title.trim(),
          description: description.trim(),
          email: email.trim() || undefined,
          user_id: user?.id,
          metadata: {
            platform: Platform.OS,
            app_version: '1.0.0',
            submitted_at: new Date().toISOString(),
          },
        }),
      });

      // Track successful submission
      screenAnalytics.track('feature_request_success', {
        requestType: requestType,
      });
      
      Alert.alert(
        'Thank You!',
        'Your request has been submitted successfully. We appreciate your feedback!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      setTitle('');
      setDescription('');
    } catch (error: any) {
      console.error('[FeatureRequest] Submit error:', error);
      
      // Track submission failure
      analytics.errors.occurred(error as Error, 'FeatureRequest');
      
      Alert.alert(
        'Submission Failed',
        error?.message || 'Failed to submit your request. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeConfig = (type: RequestType) => {
    switch (type) {
      case 'feature':
        return {
          icon: Lightbulb,
          label: 'Feature Request',
          color: theme.colors.primary,
          placeholder: 'Describe the feature you would like to see...',
        };
      case 'feedback':
        return {
          icon: MessageSquare,
          label: 'General Feedback',
          color: theme.colors.success,
          placeholder: 'Share your thoughts about the app...',
        };
      case 'bug':
        return {
          icon: Bug,
          label: 'Bug Report',
          color: theme.colors.error,
          placeholder: 'Describe the issue you encountered...',
        };
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Feature Request',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>We Would Love to Hear From You</Text>
            <Text style={styles.headerSubtitle}>
              Help us improve EverReach by sharing your ideas, feedback, or reporting issues.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Type</Text>
            <View style={styles.typeSelector}>
              {(['feature', 'feedback', 'bug'] as RequestType[]).map((type) => {
                const config = getTypeConfig(type);
                const Icon = config.icon;
                const isSelected = requestType === type;

                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      isSelected && { backgroundColor: config.color + '15', borderColor: config.color },
                    ]}
                    onPress={() => {
                      screenAnalytics.track('feature_request_type_changed', {
                        requestType: type,
                        previousType: requestType,
                      });
                      setRequestType(type);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Icon
                      size={24}
                      color={isSelected ? config.color : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        isSelected && { color: config.color, fontWeight: '600' },
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title</Text>
            <CrossPlatformTextInput
              style={styles.input}
              placeholder="Brief summary of your request"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              editable={!isSubmitting}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <CrossPlatformTextInput
              style={[styles.input, styles.textArea]}
              placeholder={getTypeConfig(requestType).placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={1000}
              editable={!isSubmitting}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          {!user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email (Optional)</Text>
              <CrossPlatformTextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <Text style={styles.helperText}>
                Provide your email if you would like us to follow up with you.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || !title.trim() || !description.trim()) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            accessibilityRole="button"
            accessibilityLabel="Submit request"
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <>
                <Send size={20} color={theme.colors.surface} />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your feedback helps us build a better product. Thank you for taking the time to share!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    typeSelector: {
      flexDirection: 'row',
      gap: 12,
    },
    typeButton: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    typeLabel: {
      fontSize: 12,
      color: theme.colors.text,
      textAlign: 'center',
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
    },
    textArea: {
      minHeight: 150,
      paddingTop: 16,
    },
    charCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'right',
      marginTop: 4,
    },
    helperText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.surface,
    },
    footer: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

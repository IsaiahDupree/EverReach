/**
 * Privacy Settings Screen
 * 
 * Granular analytics consent management.
 * Users can enable/disable tracking by category.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { createCommonStyles, getIconColor } from '@/constants/themedStyles';
import {
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  Navigation,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import {
  AnalyticsService,
  AnalyticsCategory,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from '@/services/analytics';
import { setAnalyticsEnabled } from '@/lib/posthog';
import { useAnalytics } from '@/hooks/useAnalytics';

interface CategoryConfig {
  key: AnalyticsCategory;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  required: boolean;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: AnalyticsCategory.ESSENTIAL,
    title: 'Essential Analytics',
    description: 'Required for app functionality. Tracks sign-ins, subscriptions, and critical errors.',
    icon: Shield,
    required: true,
  },
  {
    key: AnalyticsCategory.PERFORMANCE,
    title: 'Performance Monitoring',
    description: 'Helps us optimize load times and app responsiveness.',
    icon: Zap,
    required: false,
  },
  {
    key: AnalyticsCategory.FEATURE_USAGE,
    title: 'Feature Usage',
    description: 'Shows which features you use most to guide improvements.',
    icon: Activity,
    required: false,
  },
  {
    key: AnalyticsCategory.ERRORS,
    title: 'Error Tracking',
    description: 'Helps us fix bugs and prevent crashes.',
    icon: AlertTriangle,
    required: false,
  },
  {
    key: AnalyticsCategory.NAVIGATION,
    title: 'Screen Navigation',
    description: 'Tracks which screens you visit to improve user flows.',
    icon: Navigation,
    required: false,
  },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const common = createCommonStyles(theme);
  const iconColor = getIconColor(theme, 'primary');
  const insets = useSafeAreaInsets();
  
  // Analytics tracking
  useAnalytics('PrivacySettings');

  const [consent, setConsent] = useState<AnalyticsConsent>({
    enabled: false,
    categories: {
      [AnalyticsCategory.ESSENTIAL]: true,
      [AnalyticsCategory.PERFORMANCE]: false,
      [AnalyticsCategory.FEATURE_USAGE]: false,
      [AnalyticsCategory.ERRORS]: false,
      [AnalyticsCategory.NAVIGATION]: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConsent();
  }, []);

  const loadConsent = async () => {
    try {
      const current = await getAnalyticsConsent();
      setConsent(current);
    } catch (error) {
      console.error('[PrivacySettings] Failed to load consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAnalytics = async (enabled: boolean) => {
    if (!enabled) {
      Alert.alert(
        'Disable Analytics?',
        'This will stop all analytics tracking. We won\'t be able to improve your experience based on usage data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              setSaving(true);
              const updated = { ...consent, enabled: false };
              setConsent(updated);
              await setAnalyticsConsent(updated);
              await setAnalyticsEnabled(false);
              await AnalyticsService.trackAnalyticsConsentChanged(false);
              setSaving(false);
            },
          },
        ]
      );
    } else {
      setSaving(true);
      const updated = { ...consent, enabled: true };
      setConsent(updated);
      await setAnalyticsConsent(updated);
      await setAnalyticsEnabled(true);
      await AnalyticsService.trackAnalyticsConsentChanged(true);
      setSaving(false);
    }
  };

  const handleToggleCategory = async (category: AnalyticsCategory) => {
    if (!consent.enabled) return;

    const isRequired = CATEGORIES.find((c) => c.key === category)?.required;
    if (isRequired) {
      Alert.alert(
        'Required Category',
        'This category is required for essential app functionality and cannot be disabled.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    const updated = {
      ...consent,
      categories: {
        ...consent.categories,
        [category]: !consent.categories[category],
      },
    };
    setConsent(updated);
    await setAnalyticsConsent(updated);
    await AnalyticsService.trackSettingsChanged(
      `analytics_category_${category}`,
      String(consent.categories[category]),
      String(!consent.categories[category])
    );
    setSaving(false);
  };

  const handleEnableAll = async () => {
    setSaving(true);
    const updated = {
      enabled: true,
      categories: {
        [AnalyticsCategory.ESSENTIAL]: true,
        [AnalyticsCategory.PERFORMANCE]: true,
        [AnalyticsCategory.FEATURE_USAGE]: true,
        [AnalyticsCategory.ERRORS]: true,
        [AnalyticsCategory.NAVIGATION]: true,
      },
    };
    setConsent(updated);
    await setAnalyticsConsent(updated);
    await setAnalyticsEnabled(true);
    await AnalyticsService.trackAnalyticsConsentChanged(true);
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={[common.container, { paddingTop: insets.top }]}>
        <Text style={common.body}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Privacy & Analytics',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Header Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Info size={24} color={theme.colors.primary} />
          <View style={styles.infoText}>
            <Text style={[common.subtitle, { marginBottom: 4 }]}>Your Privacy Matters</Text>
            <Text style={common.caption}>
              Control what data we collect to improve your experience. We never track personal information or message content.
            </Text>
          </View>
        </View>

        {/* Master Toggle */}
        <View style={[common.card, { marginTop: theme.spacing.lg }]}>
          <View style={styles.masterToggle}>
            <View style={styles.toggleLeft}>
              <Shield size={24} color={iconColor} />
              <View style={styles.toggleText}>
                <Text style={common.subtitle}>Analytics Tracking</Text>
                <Text style={common.caption}>
                  {consent.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={consent.enabled}
              onValueChange={handleToggleAnalytics}
              disabled={saving}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
            />
          </View>
        </View>

        {/* Categories */}
        {consent.enabled && (
          <>
            <Text style={[common.caption, { marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }]}>
              TRACKING CATEGORIES
            </Text>

            {CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              const isEnabled = consent.categories[category.key];

              return (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    common.card,
                    styles.categoryCard,
                    { marginBottom: theme.spacing.md },
                  ]}
                  onPress={() => handleToggleCategory(category.key)}
                  disabled={category.required || saving}
                  activeOpacity={category.required ? 1 : 0.7}
                >
                  <View style={styles.categoryLeft}>
                    <IconComponent
                      size={24}
                      color={isEnabled ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <View style={styles.categoryText}>
                      <View style={styles.categoryTitle}>
                        <Text style={common.subtitle}>{category.title}</Text>
                        {category.required && (
                          <View style={[styles.requiredBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Text style={[styles.requiredText, { color: theme.colors.primary }]}>
                              Required
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[common.caption, { marginTop: 4 }]}>
                        {category.description}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={() => handleToggleCategory(category.key)}
                    disabled={category.required || saving}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                  />
                </TouchableOpacity>
              );
            })}

            {/* Quick Actions */}
            <TouchableOpacity
              style={[common.primaryButton, { marginTop: theme.spacing.lg }, saving && common.disabledButton]}
              onPress={handleEnableAll}
              disabled={saving}
            >
              <Text style={common.primaryButtonText}>Enable All Categories</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Learn More */}
        <TouchableOpacity
          style={[styles.learnMoreButton, { borderColor: theme.colors.border }]}
          onPress={() => router.push('/privacy-policy')}
        >
          <Text style={[common.body, { color: theme.colors.primary }]}>
            Learn More About Privacy
          </Text>
          <ChevronRight size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleText: {
    flex: 1,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 24,
  },
});

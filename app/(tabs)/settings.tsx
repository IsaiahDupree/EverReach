import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActionSheetIOS,
  Platform,
  Image,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  Bell, 
  Globe, 
  Shield, 
  HelpCircle,
  ChevronRight,
  LogOut,
  User,
  Users,
  FileText,
  Thermometer,
  FileCheck,
  Lock,
  Palette,
  Wrench,
  Activity,
  CheckCircle2,
  XCircle,
  Play
} from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useAppSettings, type ThemeMode, type Theme } from "@/providers/AppSettingsProvider";
import { usePeople } from "@/providers/PeopleProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import { FLAGS } from '@/constants/flags';
import { supabase } from '@/lib/supabase';
import { exportAllData, getStorageStats } from '@/tools/backup';

import { router } from 'expo-router';

type SettingItemToggle = {
  icon: any;
  label: string;
  type: 'toggle';
  value: boolean;
  onToggle: (val: boolean) => void;
};

type SettingItemLink = {
  icon: any;
  label: string;
  type: 'link';
  onPress: () => void;
};

type SettingSection = {
  title: string;
  items: (SettingItemToggle | SettingItemLink)[];
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, orgId } = useAuth();
  const { cloudModeEnabled, enableCloudMode, disableCloudMode, trialDaysLeft, isPaid, themeMode, setTheme, theme } = useAppSettings();
  const { people, addPerson } = usePeople();
  const { resetOnboarding, completeOnboarding, isCompleted, setOnboardingEnabled } = useOnboarding();
  const [onboardingEnabled, setOnboardingEnabledState] = React.useState<boolean>(!isCompleted);
  const [voiceBackup, setVoiceBackup] = React.useState<boolean>(false);

  const [checkingConn, setCheckingConn] = React.useState<boolean>(false);
  const [connOk, setConnOk] = React.useState<boolean | null>(null);
  const [connErr, setConnErr] = React.useState<string | null>(null);
  
  // Vercel backend health status
  const [checkingVercel, setCheckingVercel] = React.useState<boolean>(false);
  const [vercelStatus, setVercelStatus] = React.useState<any>(null);
  const [vercelError, setVercelError] = React.useState<string | null>(null);

  const checkVercelHealth = React.useCallback(async () => {
    try {
      setCheckingVercel(true);
      setVercelError(null);
      
      // Use the stable alias from env var
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
      const healthUrl = `${baseUrl}/api/health`;
      
      console.log('[Vercel Health] Checking:', healthUrl);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-protection-bypass': 'fesg4t346dgd534g3456rg43t43542gr'
        }
      });
      
      console.log('[Vercel Health] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Vercel Health] Response data:', data);
      setVercelStatus(data);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.error('[Vercel Health] Error:', msg);
      setVercelError(msg);
      setVercelStatus(null);
    } finally {
      setCheckingVercel(false);
    }
  }, []);

  const checkSupabase = React.useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      setConnOk(null);
      setConnErr(null);
      return;
    }
    try {
      setCheckingConn(true);
      setConnErr(null);
      const { data, error } = await supabase
        .from('message_threads')
        .select('id')
        .limit(1);
      if (error) {
        const msg = String(error.message ?? error);
        const isNetwork = /fetch|network|TypeError/i.test(msg);
        setConnOk(!isNetwork);
        setConnErr(isNetwork ? msg : null);
      } else {
        setConnOk(true);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const isNetwork = /fetch|network|TypeError/i.test(msg);
      setConnOk(false);
      setConnErr(isNetwork ? msg : '');
    } finally {
      setCheckingConn(false);
    }
  }, []);

  React.useEffect(() => {
    void checkSupabase();
    void checkVercelHealth();
  }, [checkSupabase, checkVercelHealth]);

  // Update local onboarding enabled state when isCompleted changes
  React.useEffect(() => {
    setOnboardingEnabledState(!isCompleted);
  }, [isCompleted]);

  const handleToggleSync = async (next: boolean) => {
    if (FLAGS.LOCAL_ONLY) {
      Alert.alert('Mode Locked', 'App is running in local-only mode due to environment settings. Cloud mode is disabled.');
      return;
    }

    if (next) {
      await enableCloudMode();
      if (!user) {
        Alert.alert('Cloud Sync', 'Please sign in to enable sync across devices.', [{ text: 'OK' }]);
      }
    } else {
      Alert.alert(
        'Disable Cloud Sync',
        'This will stop syncing to the cloud and sign you out on this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableCloudMode();
              // Sign out will happen automatically when cloud mode is disabled
              // due to the updated auth logic
            },
          },
        ]
      );
    }
  };

  const handleImportFromPhoneContacts = () => {
    router.push('/import-contacts');
  };

  const handleSignOut = () => {
    console.log('[Settings] Sign out button pressed');
    console.log('[Settings] Current user:', !!user, user?.email);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            console.log('[Settings] User confirmed sign out');
            try {
              await signOut();
              console.log('[Settings] Sign out completed successfully');
            } catch (error) {
              console.error('[Settings] Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const result = await exportAllData();
      if (result.success) {
        Alert.alert('Export Successful', `Data exported to ${result.fileName}`);
      } else {
        Alert.alert('Export Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while exporting data');
    }
  };

  const handleShowStorageStats = async () => {
    try {
      const result = await getStorageStats();
      if (result.success) {
        const statsText = Object.entries(result.stats || {})
          .map(([prefix, count]) => `${prefix}: ${count} items`)
          .join('\n');
        Alert.alert('Storage Statistics', statsText);
      } else {
        Alert.alert('Error', result.error || 'Failed to get storage stats');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get storage statistics');
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding flow and show it again on next app launch. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('Success', 'Onboarding has been reset. It will show on next launch.');
          },
        },
      ]
    );
  };

  const handleToggleOnboardingAtLaunch = async (next: boolean) => {
    try {
      setOnboardingEnabledState(next);
      await setOnboardingEnabled(next);
      if (next) {
        Alert.alert('Onboarding Enabled', 'Onboarding will show on next launch.');
      } else {
        Alert.alert('Onboarding Disabled', 'Onboarding will be skipped on launch.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to update onboarding preference.');
      // Revert state on error
      setOnboardingEnabledState(!next);
    }
  };

  const handleThemeChange = () => {
    const options = [
      { text: 'Light', value: 'light' as ThemeMode },
      { text: 'Dark', value: 'dark' as ThemeMode },
      { text: 'System', value: 'system' as ThemeMode },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...options.map(o => o.text)],
          cancelButtonIndex: 0,
          title: 'Choose Theme',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setTheme(options[buttonIndex - 1].value);
          }
        }
      );
    } else {
      Alert.alert(
        'Choose Theme',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          ...options.map(option => ({
            text: option.text,
            onPress: () => setTheme(option.value),
          })),
        ]
      );
    }
  };

  const getThemeDisplayText = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'System';
    }
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Appearance',
      items: [
        {
          icon: Palette,
          label: 'Theme',
          type: 'link',
          onPress: handleThemeChange,
        },
      ],
    },
    {
      title: 'Personal',
      items: [
        {
          icon: FileText,
          label: 'Personal Notes',
          type: 'link',
          onPress: () => router.push('/personal-notes'),
        },
      ],
    },
    {
      title: 'Lead Management',
      items: [
        {
          icon: Thermometer,
          label: 'Warmth Settings',
          type: 'link',
          onPress: () => router.push('/warmth-settings'),
        },
      ],
    },
    {
      title: 'Contacts',
      items: [
        {
          icon: Users,
          label: 'Import from Phone Contacts',
          type: 'link',
          onPress: handleImportFromPhoneContacts,
        },
      ],
    },
    ...(FLAGS.LOCAL_ONLY ? [{
      title: 'Data Management',
      items: [
        {
          icon: Shield,
          label: 'Export Data',
          type: 'link' as const,
          onPress: handleExportData,
        },
        {
          icon: HelpCircle,
          label: 'Storage Statistics',
          type: 'link' as const,
          onPress: handleShowStorageStats,
        },
      ],
    }] : []),
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          type: 'link',
          onPress: () => router.push('/notifications'),
        },
      ],
    },
    ...(!FLAGS.LOCAL_ONLY ? [{
      title: 'Cloud & Privacy',
      items: [
        {
          icon: Globe,
          label: 'Cloud Sync Mode',
          type: 'toggle' as const,
          value: cloudModeEnabled,
          onToggle: handleToggleSync,
        },
        {
          icon: Shield,
          label: 'Voice Note Backup',
          type: 'toggle' as const,
          value: voiceBackup,
          onToggle: setVoiceBackup,
        },
        {
          icon: Wrench,
          label: 'OpenAI Generation Test',
          type: 'link' as const,
          onPress: () => router.push('/openai-test'),
        },
        {
          icon: Activity,
          label: 'API Health Dashboard',
          type: 'link' as const,
          onPress: () => router.push('/health-status'),
        },
      ],
    }] : []),
    {
      title: 'Legal',
      items: [
        {
          icon: FileCheck,
          label: 'Terms & Conditions',
          type: 'link',
          onPress: () => router.push('/terms-of-service'),
        },
        {
          icon: Lock,
          label: 'Privacy Policy',
          type: 'link',
          onPress: () => router.push('/privacy-policy'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help Center',
          type: 'link',
          onPress: () => console.log('Help Center pressed'),
        },
      ],
    },
    {
      title: 'Onboarding',
      items: [
        {
          icon: Play,
          label: 'Show Onboarding at Launch',
          type: 'toggle' as const,
          value: onboardingEnabled,
          onToggle: handleToggleOnboardingAtLaunch,
        },
        {
          icon: Wrench,
          label: 'Reset Onboarding',
          type: 'link' as const,
          onPress: handleResetOnboarding,
        },
      ],
    },
  ];

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k06vwypz60k05vjo6ylch' }}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityLabel="EverReach logo"
            testID="everreach-logo-settings"
          />
          <Text style={styles.brandTitle}>EverReach</Text>
          <Text style={styles.brandSubtitle}>Never drop the ball with people again</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <User size={20} color={theme.colors.text} />
                <View>
                  {user ? (
                    <>
                      <Text style={styles.settingLabel}>Signed in as</Text>
                      <Text style={styles.settingSubtitle}>{user.email}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.settingLabel}>Guest Mode</Text>
                      <Text style={styles.settingSubtitle}>Not signed in</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
            {orgId && user && (
              <View style={[styles.settingItem, styles.settingItemBorder]}>
                <View style={styles.settingLeft}>
                  <Globe size={20} color={theme.colors.text} />
                  <View>
                    <Text style={styles.settingLabel}>Organization</Text>
                    <Text style={styles.settingSubtitle}>{orgId}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* App Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Mode</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.settingItemBorder]}
              onPress={() => router.push('/mode-settings')}
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Shield size={20} color={(FLAGS.LOCAL_ONLY || !cloudModeEnabled) ? theme.colors.success : theme.colors.primary} />
                <View>
                  <Text style={styles.settingLabel}>Mode Settings</Text>
                  <Text style={styles.settingSubtitle}>
                    {FLAGS.LOCAL_ONLY || !cloudModeEnabled
                      ? 'Local-only mode - data stays on device'
                      : 'Cloud sync mode - data syncs with Supabase'
                    }
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {!FLAGS.LOCAL_ONLY && (
              <>
                <View style={[styles.settingItem, styles.settingItemBorder]}>
                  <View style={styles.settingLeft}>
                    {checkingConn ? (
                      <Activity size={20} color={theme.colors.textSecondary} />
                    ) : connOk ? (
                      <CheckCircle2 size={20} color={theme.colors.success} />
                    ) : (
                      <XCircle size={20} color={theme.colors.error} />
                    )}
                    <View>
                      <Text style={styles.settingLabel} testID="supabaseStatusLabel">
                        {checkingConn ? 'Checking Supabase…' : connOk ? 'Connected to Supabase' : 'Not connected'}
                      </Text>
                      <Text style={styles.settingSubtitle} numberOfLines={1} testID="supabaseStatusSub">
                        Key: {process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'set' : 'unset'}{connErr ? ` · ${connErr}` : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={checkSupabase} accessibilityRole="button" testID="refreshSupabaseBtn">
                    <Text style={[styles.settingSubtitle, { color: theme.colors.primary }]}>Refresh</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    {checkingVercel ? (
                      <Activity size={20} color={theme.colors.textSecondary} />
                    ) : vercelStatus ? (
                      <CheckCircle2 size={20} color={theme.colors.success} />
                    ) : (
                      <XCircle size={20} color={theme.colors.error} />
                    )}
                    <View>
                      <Text style={styles.settingLabel} testID="vercelStatusLabel">
                        {checkingVercel ? 'Checking Vercel Backend…' : vercelStatus ? 'Vercel Backend Online' : 'Backend Unavailable'}
                      </Text>
                      <Text style={styles.settingSubtitle} numberOfLines={2} testID="vercelStatusSub">
                        {vercelStatus ? (
                          `Status: ${vercelStatus.status || 'OK'}${vercelStatus.message ? ` · ${vercelStatus.message}` : ''}${vercelStatus.timestamp ? ` · ${new Date(vercelStatus.timestamp).toLocaleTimeString()}` : ''}`
                        ) : vercelError ? (
                          `Error: ${vercelError}`
                        ) : (
                          'No response'
                        )}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={checkVercelHealth} accessibilityRole="button" testID="refreshVercelBtn">
                    <Text style={[styles.settingSubtitle, { color: theme.colors.primary }]}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity
              testID="open-tester-button"
              accessibilityRole="button"
              style={styles.settingItem}
              onPress={() => router.push(FLAGS.LOCAL_ONLY ? '/audio-test' : '/supabase-test')}
            >
              <View style={styles.settingLeft}>
                <Wrench size={20} color={theme.colors.text} />
                <View>
                  <Text style={styles.settingLabel}>{FLAGS.LOCAL_ONLY ? 'Open Local Tester' : 'Open Supabase Tester'}</Text>
                  <Text style={styles.settingSubtitle}>{FLAGS.LOCAL_ONLY ? 'Debug local-only features' : 'Verify backend connectivity'}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            {!FLAGS.LOCAL_ONLY && (
              <>
                <TouchableOpacity
                  testID="contact-import-test-button"
                  accessibilityRole="button"
                  style={styles.settingItem}
                  onPress={() => router.push('/contact-import-test')}
                >
                  <View style={styles.settingLeft}>
                    <Wrench size={20} color={theme.colors.text} />
                    <View>
                      <Text style={styles.settingLabel}>Contact Import Tests</Text>
                      <Text style={styles.settingSubtitle}>Test contact creation API</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  testID="api-test-suite-button"
                  accessibilityRole="button"
                  style={styles.settingItem}
                  onPress={() => router.push('/api-test-suite')}
                >
                  <View style={styles.settingLeft}>
                    <Wrench size={20} color={theme.colors.text} />
                    <View>
                      <Text style={styles.settingLabel}>API Test Suite</Text>
                      <Text style={styles.settingSubtitle}>Full backend API tests (like Node.js suite)</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Subscription Section */}
        {!FLAGS.LOCAL_ONLY && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => router.push('/subscription-plans')}
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Shield size={20} color={theme.colors.text} />
                  <View>
                    <Text style={styles.settingLabel}>Plan</Text>
                    <Text style={styles.settingSubtitle}>
                      {isPaid ? 'Pro (active)' : (trialDaysLeft > 0 ? `Trial (${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left)` : 'Free')}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {settingSections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={`${section.title}-${item.label}-${itemIndex}`}
                  style={[
                    styles.settingItem,
                    itemIndex < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  disabled={item.type === 'toggle'}
                  onPress={item.type === 'link' ? (item as SettingItemLink).onPress : undefined}
                >
                  <View style={styles.settingLeft}>
                    <item.icon size={20} color={theme.colors.text} />
                    <View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.label === 'Theme' && (
                        <Text style={styles.settingSubtitle}>{getThemeDisplayText()}</Text>
                      )}
                    </View>
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={(item as SettingItemToggle).value}
                      onValueChange={(item as SettingItemToggle).onToggle}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                      thumbColor={theme.colors.surface}
                    />
                  ) : (
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {user && (
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleSignOut}
            testID="sign-out-button"
            accessibilityRole="button"
            accessibilityLabel="Sign out of your account"
          >
            <LogOut size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>EverReach · v1.0.0 {(FLAGS.LOCAL_ONLY || !cloudModeEnabled) ? '(Local-Only)' : '(Cloud)'}</Text>
          <Text style={styles.footerText}>Made with love for meaningful connections</Text>
          {FLAGS.LOCAL_ONLY && (
            <Text style={[styles.footerText, { color: theme.colors.success, marginTop: 8 }]}>
              ✓ All data stays on your device
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  settingItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  brandHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  brandSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
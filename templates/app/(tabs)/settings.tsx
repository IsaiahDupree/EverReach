/**
 * SunTrace - Settings Screen
 *
 * Sections:
 * 1. Account — email, subscription badge, manage subscription
 * 2. Notifications — daily UV alerts, best window reminders, session reminders
 * 3. Privacy & Location — location permission toggle, HealthKit toggle
 * 4. Data — Export CSV, Delete account (with confirmation)
 * 5. App — Appearance (dark/light/system), Developer settings (DEV_MODE only)
 * 6. Support — Rate, Contact, Privacy policy, Terms
 *
 * Notification preferences are persisted to sun_profiles via updateProfile().
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  CreditCard,
  Bell,
  BellOff,
  MapPin,
  Heart,
  Download,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Star,
  Mail,
  Shield,
  FileText,
  Code,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getProfile, updateProfile, getAuthUser } from '@/services/api';
import { APP_CONFIG } from '@/constants/config';
import type { Profile } from '@/types/models';

// ============================================
// Constants
// ============================================
const BG = '#0F172A';
const CARD = '#1E293B';
const TEXT = '#F1F5F9';
const MUTED = '#64748B';
const ORANGE = '#F97316';
const BORDER = '#334155';

type AppearanceMode = 'dark' | 'light' | 'system';

// ============================================
// Section wrapper
// ============================================
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.wrapper}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: { marginBottom: 8, paddingHorizontal: 16 },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: 'hidden',
  },
});

// ============================================
// Row variants
// ============================================
function ToggleRow({
  icon,
  label,
  sublabel,
  value,
  onValueChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrap}>{icon}</View>
      <View style={rowStyles.labelWrap}>
        <Text style={rowStyles.label}>{label}</Text>
        {sublabel ? <Text style={rowStyles.sublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: ORANGE, false: BORDER }}
        thumbColor={Platform.OS === 'android' ? (value ? ORANGE : '#94A3B8') : undefined}
        disabled={disabled}
      />
    </View>
  );
}

function NavRow({
  icon,
  label,
  sublabel,
  badge,
  badgeColor,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={rowStyles.iconWrap}>{icon}</View>
      <View style={rowStyles.labelWrap}>
        <Text style={[rowStyles.label, destructive && rowStyles.destructive]}>{label}</Text>
        {sublabel ? <Text style={rowStyles.sublabel}>{sublabel}</Text> : null}
      </View>
      {badge ? (
        <View style={[rowStyles.badge, { backgroundColor: (badgeColor ?? ORANGE) + '22' }]}>
          <Text style={[rowStyles.badgeText, { color: badgeColor ?? ORANGE }]}>{badge}</Text>
        </View>
      ) : (
        <ChevronRight size={16} color={MUTED} />
      )}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={rowStyles.divider} />;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  iconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  labelWrap: { flex: 1 },
  label: { fontSize: 15, color: TEXT, fontWeight: '500' },
  sublabel: { fontSize: 12, color: MUTED, marginTop: 2 },
  destructive: { color: '#EF4444' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 60,
  },
});

// ============================================
// Appearance selector
// ============================================
function AppearanceRow({
  value,
  onChange,
}: {
  value: AppearanceMode;
  onChange: (v: AppearanceMode) => void;
}) {
  const options: { key: AppearanceMode; label: string; icon: React.ReactNode }[] = [
    { key: 'dark', label: 'Dark', icon: <Moon size={14} color={value === 'dark' ? ORANGE : MUTED} /> },
    { key: 'light', label: 'Light', icon: <Sun size={14} color={value === 'light' ? ORANGE : MUTED} /> },
    { key: 'system', label: 'System', icon: <Monitor size={14} color={value === 'system' ? ORANGE : MUTED} /> },
  ];

  return (
    <View style={appearanceStyles.row}>
      <View style={rowStyles.iconWrap}>
        <Moon size={18} color={MUTED} />
      </View>
      <Text style={[rowStyles.label, { marginRight: 8 }]}>Appearance</Text>
      <View style={appearanceStyles.picker}>
        {options.map((opt, idx) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              appearanceStyles.option,
              value === opt.key && appearanceStyles.optionActive,
              idx > 0 && appearanceStyles.optionBorder,
            ]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
          >
            {opt.icon}
            <Text
              style={[
                appearanceStyles.optionText,
                value === opt.key && appearanceStyles.optionTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const appearanceStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: BG,
    borderRadius: 10,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
  },
  optionActive: {
    backgroundColor: ORANGE + '22',
  },
  optionBorder: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  optionText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  optionTextActive: { color: ORANGE },
});

// ============================================
// Main Screen
// ============================================
export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [appearance, setAppearance] = useState<AppearanceMode>('dark');
  const [savingField, setSavingField] = useState<string | null>(null);

  const { data: authUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getAuthUser,
  });

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onSettled: () => setSavingField(null),
  });

  const handleToggle = useCallback(
    (field: string, value: boolean) => {
      setSavingField(field);
      updateProfileMutation.mutate({ [field]: value } as Parameters<typeof updateProfile>[0]);
    },
    [updateProfileMutation]
  );

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your sessions, stats, and badges will be deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { error } = await supabase.functions.invoke('delete-account', {
                        body: {},
                      });
                      if (error) throw error;
                      await supabase.auth.signOut();
                      router.replace('/');
                    } catch {
                      Alert.alert('Error', 'Could not delete account. Contact support@suntrace.app');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('sun_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;

      const headers = 'date,duration_min,uv_index,vitamin_d_iu,burn_risk,location,notes';
      const rows = (sessions ?? []).map((s) =>
        [
          s.started_at?.split('T')[0] ?? '',
          s.duration_minutes ?? '',
          s.uv_index_avg ?? '',
          s.d_earned_iu ?? '',
          s.burn_risk_level ?? '',
          (s.location_name ?? '').replace(/,/g, ' '),
          (s.notes ?? '').replace(/,/g, ' '),
        ].join(',')
      );
      const csv = [headers, ...rows].join('\n');

      // Share / save CSV
      if (Platform.OS !== 'web') {
        const { Share } = await import('react-native');
        await Share.share({ message: csv, title: 'SunTrace Sessions Export' });
      } else {
        Alert.alert('Export ready', 'CSV export is not available in this environment.');
      }
    } catch {
      Alert.alert('Export failed', 'Could not export data. Please try again.');
    }
  };

  const isPro = false; // TODO: wire useSubscription when available in this project
  const tierLabel = isPro ? 'PRO' : 'FREE';
  const tierColor = isPro ? '#22C55E' : ORANGE;

  const email = authUser?.email ?? '';
  const notificationsEnabled = profile?.notifications_enabled ?? false;
  const locationEnabled = profile?.location_enabled ?? false;
  const healthkitEnabled = profile?.healthkit_enabled ?? false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* ── ACCOUNT ────────────────────────────────── */}
      <Section title="Account">
        <NavRow
          icon={<User size={18} color={MUTED} />}
          label={email || 'Account'}
          sublabel={email ? undefined : 'Not signed in'}
          onPress={() => {}}
        />
        <Divider />
        <NavRow
          icon={<CreditCard size={18} color={MUTED} />}
          label="Subscription"
          sublabel={isPro ? 'SunTrace Pro — active' : 'Free tier'}
          badge={tierLabel}
          badgeColor={tierColor}
          onPress={() => router.push('/paywall')}
        />
      </Section>

      {/* ── NOTIFICATIONS ───────────────────────────── */}
      <Section title="Notifications">
        <ToggleRow
          icon={<Bell size={18} color={MUTED} />}
          label="Daily UV Alerts"
          sublabel="Morning UV forecast and window reminder"
          value={notificationsEnabled}
          onValueChange={(v) => handleToggle('notifications_enabled', v)}
          disabled={savingField === 'notifications_enabled'}
        />
        <Divider />
        <ToggleRow
          icon={<Sun size={18} color={MUTED} />}
          label="Best Window Reminders"
          sublabel="Alert when peak UV window opens"
          value={notificationsEnabled}
          onValueChange={(v) => handleToggle('notifications_enabled', v)}
          disabled={savingField === 'notifications_enabled'}
        />
        <Divider />
        <ToggleRow
          icon={<BellOff size={18} color={MUTED} />}
          label="Session Reminders"
          sublabel="Reminder if no session logged by 2 PM"
          value={notificationsEnabled}
          onValueChange={(v) => handleToggle('notifications_enabled', v)}
          disabled={savingField === 'notifications_enabled'}
        />
        {savingField === 'notifications_enabled' && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={ORANGE} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}
      </Section>

      {/* ── PRIVACY & LOCATION ──────────────────────── */}
      <Section title="Privacy & Location">
        <ToggleRow
          icon={<MapPin size={18} color={MUTED} />}
          label="Location Access"
          sublabel="Used for live UV data and session location"
          value={locationEnabled}
          onValueChange={(v) => handleToggle('location_enabled', v)}
          disabled={savingField === 'location_enabled'}
        />
        <Divider />
        <ToggleRow
          icon={<Heart size={18} color={MUTED} />}
          label={Platform.OS === 'ios' ? 'HealthKit Sync' : 'Health Connect Sync'}
          sublabel="Sync Vitamin D data to your health app"
          value={healthkitEnabled}
          onValueChange={(v) => handleToggle('healthkit_enabled', v)}
          disabled={savingField === 'healthkit_enabled'}
        />
      </Section>

      {/* ── DATA ────────────────────────────────────── */}
      <Section title="Data">
        <NavRow
          icon={<Download size={18} color={MUTED} />}
          label="Export Data"
          sublabel="Download all sessions as CSV"
          onPress={handleExportData}
        />
        <Divider />
        <NavRow
          icon={<Trash2 size={18} color="#EF4444" />}
          label="Delete Account"
          sublabel="Permanently delete all data"
          onPress={handleDeleteAccount}
          destructive
        />
      </Section>

      {/* ── APP ─────────────────────────────────────── */}
      <Section title="App">
        <AppearanceRow value={appearance} onChange={setAppearance} />
        {APP_CONFIG.SHOW_DEV_SETTINGS && (
          <>
            <Divider />
            <NavRow
              icon={<Code size={18} color="#A78BFA" />}
              label="Developer Settings"
              sublabel="Debug tools and feature flags"
              onPress={() => router.push('/dev-settings' as never)}
            />
          </>
        )}
      </Section>

      {/* ── SUPPORT ─────────────────────────────────── */}
      <Section title="Support">
        <NavRow
          icon={<Star size={18} color={MUTED} />}
          label="Rate SunTrace"
          sublabel="If you love the app, leave a review!"
          onPress={() => {
            Alert.alert('Thank you!', 'Tap OK to open the App Store review.', [
              { text: 'OK' },
            ]);
          }}
        />
        <Divider />
        <NavRow
          icon={<Mail size={18} color={MUTED} />}
          label="Contact Support"
          sublabel="support@suntrace.app"
          onPress={() => {
            Alert.alert('Contact Support', 'Email us at support@suntrace.app');
          }}
        />
        <Divider />
        <NavRow
          icon={<Shield size={18} color={MUTED} />}
          label="Privacy Policy"
          onPress={() => {
            Alert.alert('Privacy Policy', 'Visit suntrace.app/privacy to read our privacy policy.');
          }}
        />
        <Divider />
        <NavRow
          icon={<FileText size={18} color={MUTED} />}
          label="Terms of Service"
          onPress={() => {
            Alert.alert('Terms of Service', 'Visit suntrace.app/terms to read our terms of service.');
          }}
        />
      </Section>

      {/* Log Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.75}>
        <LogOut size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>
        {APP_CONFIG.APP_NAME} v{APP_CONFIG.APP_VERSION}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 60 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: TEXT },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  savingText: { fontSize: 12, color: MUTED },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#EF444411',
    borderWidth: 1,
    borderColor: '#EF444422',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: MUTED,
    marginTop: 16,
    marginBottom: 8,
  },
});

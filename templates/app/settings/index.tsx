/**
 * SunTrace — Settings Screen
 *
 * App-wide settings:
 * - Notifications toggle
 * - Appearance (system/light/dark)
 * - HealthKit sync toggle
 * - Location permissions
 * - Privacy settings
 * - Subscription / billing
 * - Account management (sign out, delete account)
 * - Support / feedback
 */
import { useState } from 'react';
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
  Bell,
  Heart,
  MapPin,
  Shield,
  CreditCard,
  LogOut,
  Trash2,
  HelpCircle,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { getProfile, updateProfile, signOut } from '@/services/api';
import type { Profile } from '@/types/models';

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: '#F97316', false: '#334155' }}
        thumbColor="white"
      />
    </View>
  );
}

// ── Nav row ───────────────────────────────────────────────────────────────────

function NavRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={16} color="#475569" />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  function toggleNotifications(val: boolean) {
    saveProfile({ notifications_enabled: val });
  }

  function toggleHealthKit(val: boolean) {
    saveProfile({ healthkit_enabled: val });
  }

  function toggleLocation(val: boolean) {
    saveProfile({ location_enabled: val });
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/sign-in');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This permanently deletes all your data including sessions, badges, and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => router.push('/privacy-settings'),
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile summary */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => router.push('/(tabs)/profile')}
        activeOpacity={0.8}
      >
        <View style={styles.avatarCircle}>
          <User size={24} color="#F97316" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile ? `Skin Type ${profile.skin_type}` : 'Set up profile'}
          </Text>
          <Text style={styles.profileSub}>View & edit profile</Text>
        </View>
        <ChevronRight size={16} color="#475569" />
      </TouchableOpacity>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={styles.card}>
        <ToggleRow
          icon={<Bell size={18} color="#F97316" />}
          label="Daily reminders"
          subtitle="Get notified when UV is optimal"
          value={profile?.notifications_enabled ?? false}
          onToggle={toggleNotifications}
        />
      </View>

      {/* Health */}
      <SectionHeader title="Health" />
      <View style={styles.card}>
        {Platform.OS === 'ios' && (
          <ToggleRow
            icon={<Heart size={18} color="#EF4444" />}
            label="Apple HealthKit"
            subtitle="Sync session data to Health app"
            value={profile?.healthkit_enabled ?? false}
            onToggle={toggleHealthKit}
          />
        )}
        <ToggleRow
          icon={<MapPin size={18} color="#22C55E" />}
          label="Location access"
          subtitle="Required for UV data and sun spot map"
          value={profile?.location_enabled ?? false}
          onToggle={toggleLocation}
        />
      </View>

      {/* Subscription */}
      <SectionHeader title="Subscription" />
      <View style={styles.card}>
        <NavRow
          icon={<CreditCard size={18} color="#A855F7" />}
          label="Manage Subscription"
          subtitle="Upgrade to Pro or restore purchases"
          onPress={() => router.push('/paywall')}
        />
      </View>

      {/* Privacy */}
      <SectionHeader title="Privacy & Legal" />
      <View style={styles.card}>
        <NavRow
          icon={<Shield size={18} color="#64748B" />}
          label="Privacy Settings"
          subtitle="Data export & deletion"
          onPress={() => router.push('/privacy-settings')}
        />
        <View style={styles.rowDivider} />
        <NavRow
          icon={<Shield size={18} color="#64748B" />}
          label="Privacy Policy"
          onPress={() => router.push('/privacy-policy')}
        />
      </View>

      {/* Support */}
      <SectionHeader title="Support" />
      <View style={styles.card}>
        <NavRow
          icon={<HelpCircle size={18} color="#64748B" />}
          label="Help & Feedback"
          onPress={() => router.push('/feature-request')}
        />
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={styles.card}>
        <NavRow
          icon={<LogOut size={18} color="#EF4444" />}
          label="Sign Out"
          onPress={handleSignOut}
          destructive
        />
        <View style={styles.rowDivider} />
        <NavRow
          icon={<Trash2 size={18} color="#EF4444" />}
          label="Delete Account"
          subtitle="Permanently delete all your data"
          onPress={handleDeleteAccount}
          destructive
        />
      </View>

      <Text style={styles.version}>SunTrace v1.0.0</Text>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingBottom: 48 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#F1F5F9' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  profileSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#F1F5F9' },
  rowSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  destructive: { color: '#EF4444' },
  rowDivider: { height: 1, backgroundColor: '#0F172A', marginHorizontal: 14 },
  version: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

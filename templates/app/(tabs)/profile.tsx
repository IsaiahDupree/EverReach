/**
 * SunTrace - Profile Screen
 *
 * Features:
 * - User avatar + name
 * - Skin type display (Fitzpatrick I-VI)
 * - Total sessions, total Vitamin D earned
 * - Current streak
 * - Badge grid (earned badges + locked)
 * - Edit profile button
 */
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Flame,
  Sun,
  Zap,
  Award,
  Settings,
  Lock,
  Edit,
} from 'lucide-react-native';
import { getProfile, getUserBadges, getBadges, getStatsHistory, getAuthUser } from '@/services/api';
import type { Profile, Badge, UserBadge, DailyStats } from '@/types/models';

// ============================================
// Skin type metadata
// ============================================
const SKIN_TYPE_INFO: Record<
  number,
  { label: string; description: string; color: string }
> = {
  1: { label: 'Type I', description: 'Very Fair', color: '#FDE8D8' },
  2: { label: 'Type II', description: 'Fair', color: '#FDDBB4' },
  3: { label: 'Type III', description: 'Medium', color: '#E8B897' },
  4: { label: 'Type IV', description: 'Olive', color: '#C68642' },
  5: { label: 'Type V', description: 'Brown', color: '#8D5524' },
  6: { label: 'Type VI', description: 'Dark', color: '#4A2912' },
};

// ============================================
// Avatar component
// ============================================
function Avatar({ name, avatarUrl }: { name?: string; avatarUrl?: string }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <View style={avatarStyles.container}>
      <View style={avatarStyles.circle}>
        <Text style={avatarStyles.initials}>{initials}</Text>
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  initials: { fontSize: 28, fontWeight: '800', color: 'white' },
});

// ============================================
// Badge tile
// ============================================
function BadgeTile({
  badge,
  earned,
}: {
  badge: Badge;
  earned: boolean;
}) {
  return (
    <View style={[badgeStyles.tile, !earned && badgeStyles.tileLocked]}>
      <Text style={badgeStyles.icon}>{earned ? badge.icon : '🔒'}</Text>
      <Text
        style={[badgeStyles.name, !earned && badgeStyles.nameLocked]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  tile: {
    width: '30%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  tileLocked: { opacity: 0.4 },
  icon: { fontSize: 28 },
  name: { fontSize: 11, fontWeight: '600', color: '#F1F5F9', textAlign: 'center' },
  nameLocked: { color: '#475569' },
});

// ============================================
// Stats bar
// ============================================
function StatBar({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={statStyles.item}>
      {icon}
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 12,
  },
  value: { fontSize: 22, fontWeight: '800', color: '#F1F5F9' },
  label: { fontSize: 11, color: '#64748B', textAlign: 'center' },
});

// ============================================
// Main Screen
// ============================================
export default function ProfileScreen() {
  const router = useRouter();

  const { data: authUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getAuthUser,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const { data: allBadges = [] } = useQuery<Badge[]>({
    queryKey: ['badges'],
    queryFn: getBadges,
  });

  const { data: userBadges = [] } = useQuery<UserBadge[]>({
    queryKey: ['user-badges'],
    queryFn: getUserBadges,
  });

  const { data: statsHistory = [] } = useQuery<DailyStats[]>({
    queryKey: ['stats-history-90'],
    queryFn: () => getStatsHistory(90),
  });

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));
  const totalSessions = statsHistory.reduce((sum, s) => sum + s.session_count, 0);
  const totalVitaminD = statsHistory.reduce((sum, s) => sum + s.total_d_earned_iu, 0);
  const streakCount = profile?.streak_count ?? 0;

  const skinInfo = profile ? SKIN_TYPE_INFO[profile.skin_type] : null;

  const displayName = authUser?.user_metadata?.full_name ?? authUser?.email ?? 'Sun Seeker';

  if (profileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Settings size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <Avatar name={displayName} avatarUrl={authUser?.user_metadata?.avatar_url} />
        <Text style={styles.displayName}>{displayName}</Text>
        {authUser?.email && (
          <Text style={styles.email}>{authUser.email}</Text>
        )}

        {/* Skin type */}
        {skinInfo && (
          <View style={styles.skinTypeRow}>
            <View
              style={[
                styles.skinSwatch,
                { backgroundColor: skinInfo.color },
              ]}
            />
            <Text style={styles.skinTypeText}>
              {skinInfo.label} — {skinInfo.description}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push('/onboarding')}
          activeOpacity={0.8}
        >
          <Edit size={14} color="#F97316" />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <StatBar
          icon={<Flame size={22} color="#F97316" />}
          label="Day Streak"
          value={String(streakCount)}
        />
        <View style={styles.statDivider} />
        <StatBar
          icon={<Sun size={22} color="#EAB308" />}
          label="Sessions"
          value={String(totalSessions)}
        />
        <View style={styles.statDivider} />
        <StatBar
          icon={<Zap size={22} color="#22C55E" />}
          label="Vitamin D"
          value={`${(totalVitaminD / 1000).toFixed(1)}k`}
        />
      </View>

      {/* Badges */}
      <View style={styles.sectionHeader}>
        <Award size={16} color="#F97316" />
        <Text style={styles.sectionTitle}>Badges</Text>
        <Text style={styles.sectionCount}>
          {userBadges.length}/{allBadges.length} earned
        </Text>
      </View>

      <View style={styles.badgeGrid}>
        {allBadges.map((badge) => (
          <BadgeTile
            key={badge.id}
            badge={badge}
            earned={earnedBadgeIds.has(badge.id)}
          />
        ))}
        {allBadges.length === 0 && (
          <View style={styles.noBadges}>
            <Award size={32} color="#334155" />
            <Text style={styles.noBadgesText}>
              Complete sessions to earn badges!
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingBottom: 48 },
  loading: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9' },
  settingsBtn: { padding: 8 },
  profileCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  displayName: { fontSize: 20, fontWeight: '700', color: '#F1F5F9', marginTop: 4 },
  email: { fontSize: 13, color: '#64748B' },
  skinTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  skinSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skinTypeText: { fontSize: 13, color: '#94A3B8' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#F97316' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statDivider: { width: 1, backgroundColor: '#0F172A', marginVertical: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', flex: 1 },
  sectionCount: { fontSize: 12, color: '#64748B' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'flex-start',
  },
  noBadges: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  noBadgesText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});

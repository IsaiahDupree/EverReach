import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Award, Flame, Sun, Target, Lock } from 'lucide-react-native';
import { getProfile, getUserBadges, getAllBadges } from '@/services/suntraceApi';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { UserProfile, Badge, UserBadge } from '@/types/suntrace';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  const loadData = useCallback(async () => {
    const [p, ub, ab] = await Promise.all([
      getProfile(),
      getUserBadges(),
      getAllBadges(),
    ]);
    setProfile(p);
    setUserBadges(ub);
    setAllBadges(ab);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const categories = [...new Set(allBadges.map(b => b.category))];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SUNTRACE_COLORS.primary} />}
    >
      <Text style={styles.title}>Profile</Text>

      {/* Stats summary */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Flame size={28} color="#f97316" />
          <View>
            <Text style={styles.bigStat}>{profile?.streak_count ?? 0} day streak</Text>
            <Text style={styles.profileLabel}>Current streak</Text>
          </View>
        </View>
        <View style={styles.profileDivider} />
        <View style={styles.profileRow}>
          <Award size={28} color={SUNTRACE_COLORS.primary} />
          <View>
            <Text style={styles.bigStat}>{userBadges.length} / {allBadges.length}</Text>
            <Text style={styles.profileLabel}>Badges earned</Text>
          </View>
        </View>
        <View style={styles.profileDivider} />
        <View style={styles.profileRow}>
          <Sun size={28} color={SUNTRACE_COLORS.secondary} />
          <View>
            <Text style={styles.bigStat}>Type {profile?.skin_type ?? '—'}</Text>
            <Text style={styles.profileLabel}>Skin type</Text>
          </View>
        </View>
      </View>

      {/* Badges by category */}
      {categories.map(cat => {
        const catBadges = allBadges.filter(b => b.category === cat);
        const earnedCount = catBadges.filter(b => earnedBadgeIds.has(b.id)).length;
        return (
          <View key={cat} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)} Badges{' '}
              <Text style={styles.sectionCount}>({earnedCount}/{catBadges.length})</Text>
            </Text>
            <View style={styles.badgeGrid}>
              {catBadges.map(badge => {
                const earned = earnedBadgeIds.has(badge.id);
                const earnedDate = userBadges.find(ub => ub.badge_id === badge.id)?.earned_at;
                return (
                  <BadgeItem
                    key={badge.id}
                    badge={badge}
                    earned={earned}
                    earnedDate={earnedDate}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function BadgeItem({
  badge,
  earned,
  earnedDate,
}: {
  badge: Badge;
  earned: boolean;
  earnedDate?: string;
}) {
  return (
    <View style={[styles.badgeItem, !earned && styles.badgeLocked]}>
      <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
        {earned ? badge.icon : '🔒'}
      </Text>
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      {earned && earnedDate && (
        <Text style={styles.earnedDate}>
          {new Date(earnedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgDark },
  content: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary, marginBottom: 20 },
  profileCard: { backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 20, padding: 20, marginBottom: 28, gap: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileDivider: { height: 1, backgroundColor: '#334155' },
  bigStat: { fontSize: 20, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary },
  profileLabel: { fontSize: 13, color: SUNTRACE_COLORS.textSecondary, marginTop: 2 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary, marginBottom: 14 },
  sectionCount: { fontSize: 14, color: SUNTRACE_COLORS.textSecondary, fontWeight: '400' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: { width: '30%', backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, aspectRatio: 0.9 },
  badgeLocked: { opacity: 0.4 },
  badgeIcon: { fontSize: 28 },
  badgeIconLocked: { fontSize: 22 },
  badgeName: { fontSize: 11, fontWeight: '600', color: SUNTRACE_COLORS.textPrimary, textAlign: 'center', lineHeight: 14 },
  badgeNameLocked: { color: SUNTRACE_COLORS.textSecondary },
  earnedDate: { fontSize: 9, color: SUNTRACE_COLORS.accent },
});

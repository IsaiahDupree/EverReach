/**
 * SunTrace - Logbook Screen
 *
 * Features:
 * - Total stats summary (sessions, IU earned, best streak)
 * - All sun sessions grouped by month
 * - Each card: date, time, duration, UV, IU, location
 * - Pull to refresh
 * - Delete session (long press + confirmation alert)
 * - Tap session → session-detail modal
 */
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Zap,
  Flame,
  Clock,
  MapPin,
  Trash2,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react-native';
import { getSessions, getProfile, deleteSession } from '@/services/api';
import type { SunSession, Profile } from '@/types/models';

// ============================================
// Constants
// ============================================
const BG = '#0F172A';
const CARD = '#1E293B';
const TEXT = '#F1F5F9';
const MUTED = '#64748B';
const ORANGE = '#F97316';
const BORDER = '#334155';

// ============================================
// Helpers
// ============================================
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function uvLabel(uv?: number): string {
  if (uv === undefined || uv === null) return 'N/A';
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Mod';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'V.High';
  return 'Extreme';
}

function uvChipColor(uv?: number): string {
  if (!uv) return MUTED;
  if (uv <= 2) return '#22C55E';
  if (uv <= 5) return '#EAB308';
  if (uv <= 7) return ORANGE;
  if (uv <= 10) return '#EF4444';
  return '#A855F7';
}

function burnColor(risk?: 'low' | 'moderate' | 'high'): string {
  if (risk === 'low') return '#22C55E';
  if (risk === 'moderate') return '#EAB308';
  if (risk === 'high') return '#EF4444';
  return MUTED;
}

// ============================================
// Stat pill
// ============================================
function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={pillStyles.container}>
      {icon}
      <Text style={pillStyles.value}>{value}</Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  value: { fontSize: 18, fontWeight: '800', color: TEXT },
  label: { fontSize: 10, color: MUTED, textAlign: 'center' },
});

// ============================================
// Session card
// ============================================
function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: SunSession;
  onPress: () => void;
  onDelete: () => void;
}) {
  const uvColor = uvChipColor(session.uv_index_avg);
  const bColor = burnColor(session.burn_risk_level);

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={onPress}
      onLongPress={() =>
        Alert.alert('Delete Session', 'Remove this session from your logbook?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ])
      }
      activeOpacity={0.75}
      delayLongPress={400}
    >
      {/* Left: date + time */}
      <View style={cardStyles.dateCol}>
        <Text style={cardStyles.dateDay}>
          {new Date(session.started_at).getDate()}
        </Text>
        <Text style={cardStyles.dateMonth}>
          {new Date(session.started_at).toLocaleString('en-US', { month: 'short' })}
        </Text>
        <Text style={cardStyles.dateTime}>{formatTime(session.started_at)}</Text>
      </View>

      <View style={cardStyles.divider} />

      {/* Right: details */}
      <View style={cardStyles.details}>
        {/* Row 1: duration + IU */}
        <View style={cardStyles.row}>
          <View style={cardStyles.metric}>
            <Clock size={12} color={MUTED} />
            <Text style={cardStyles.metricText}>
              {session.duration_minutes != null ? `${session.duration_minutes} min` : '--'}
            </Text>
          </View>
          <View style={cardStyles.metric}>
            <Zap size={12} color={ORANGE} />
            <Text style={[cardStyles.metricText, { color: ORANGE }]}>
              {session.d_earned_iu != null ? `${session.d_earned_iu} IU` : '--'}
            </Text>
          </View>
        </View>

        {/* Row 2: UV chip + burn chip */}
        <View style={cardStyles.row}>
          <View style={[cardStyles.chip, { backgroundColor: uvColor + '22' }]}>
            <Sun size={10} color={uvColor} />
            <Text style={[cardStyles.chipText, { color: uvColor }]}>
              UV {session.uv_index_avg?.toFixed(1) ?? '--'} {uvLabel(session.uv_index_avg)}
            </Text>
          </View>
          {session.burn_risk_level ? (
            <View style={[cardStyles.chip, { backgroundColor: bColor + '22' }]}>
              <AlertTriangle size={10} color={bColor} />
              <Text style={[cardStyles.chipText, { color: bColor }]}>
                {session.burn_risk_level.charAt(0).toUpperCase() + session.burn_risk_level.slice(1)} risk
              </Text>
            </View>
          ) : null}
        </View>

        {/* Location */}
        {session.location_name ? (
          <View style={cardStyles.locationRow}>
            <MapPin size={11} color={MUTED} />
            <Text style={cardStyles.locationText} numberOfLines={1}>
              {session.location_name}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Delete icon hint */}
      <Trash2 size={14} color="#334155" style={cardStyles.deleteHint} />
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  dateCol: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#0F172A',
  },
  dateDay: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 26 },
  dateMonth: { fontSize: 11, fontWeight: '600', color: ORANGE, textTransform: 'uppercase' },
  dateTime: { fontSize: 10, color: MUTED, marginTop: 4 },
  divider: { width: 1, backgroundColor: BORDER },
  details: { flex: 1, padding: 12, gap: 6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontSize: 13, fontWeight: '600', color: TEXT },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 11, color: MUTED, flex: 1 },
  deleteHint: { alignSelf: 'center', marginRight: 12, marginLeft: 4 },
});

// ============================================
// Month header
// ============================================
function MonthHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={monthStyles.header}>
      <CalendarDays size={13} color={ORANGE} />
      <Text style={monthStyles.title}>{title}</Text>
      <Text style={monthStyles.count}>{count} {count === 1 ? 'session' : 'sessions'}</Text>
    </View>
  );
}

const monthStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: BG,
  },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: TEXT },
  count: { fontSize: 11, color: MUTED },
});

// ============================================
// Main Screen
// ============================================
export default function LogbookScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sessions = [],
    isLoading,
    refetch,
    error,
  } = useQuery<SunSession[]>({
    queryKey: ['sessions'],
    queryFn: () => getSessions(200),
  });

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    },
    onError: () => {
      Alert.alert('Error', 'Could not delete session. Please try again.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Group sessions by month
  const sections = useMemo(() => {
    const grouped = new Map<string, SunSession[]>();
    for (const s of sessions) {
      const key = monthKey(s.started_at);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(s);
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [sessions]);

  // Summary stats
  const totalSessions = sessions.length;
  const totalIU = sessions.reduce((sum, s) => sum + (s.d_earned_iu ?? 0), 0);
  const streakCount = profile?.streak_count ?? 0;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Logbook</Text>
      </View>

      {/* Stats banner */}
      <View style={styles.statsCard}>
        <StatPill
          icon={<Sun size={18} color="#EAB308" />}
          label="Sessions"
          value={String(totalSessions)}
        />
        <View style={styles.statDivider} />
        <StatPill
          icon={<Zap size={18} color={ORANGE} />}
          label="Total IU"
          value={totalIU >= 1000 ? `${(totalIU / 1000).toFixed(1)}k` : String(totalIU)}
        />
        <View style={styles.statDivider} />
        <StatPill
          icon={<Flame size={18} color={ORANGE} />}
          label="Streak"
          value={`${streakCount}d`}
        />
      </View>

      {error ? (
        <View style={styles.errorState}>
          <AlertTriangle size={32} color="#EF4444" />
          <Text style={styles.errorText}>Could not load sessions. Pull down to retry.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />
          }
          renderSectionHeader={({ section }) => (
            <MonthHeader title={section.title} count={section.data.length} />
          )}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <SessionCard
                session={item}
                onPress={() =>
                  router.push({
                    pathname: '/session-detail',
                    params: { id: item.id },
                  })
                }
                onDelete={() => deleteMutation.mutate(item.id)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sun size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete a sun session and it will appear here.
              </Text>
            </View>
          }
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loading: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: TEXT },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statDivider: { width: 1, backgroundColor: '#0F172A', marginVertical: 12 },
  listContent: { paddingBottom: 32 },
  cardWrapper: { paddingHorizontal: 16 },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySubtitle: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
});

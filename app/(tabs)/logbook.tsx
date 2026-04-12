import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Sun, Clock, Zap, Calendar } from 'lucide-react-native';
import { getSessions, getTodayStats } from '@/services/suntraceApi';
import { getUVCategory } from '@/services/uvCalculations';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { SunSession } from '@/types/suntrace';
import { useRouter } from 'expo-router';

export default function LogbookScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SunSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalD, setTotalD] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const loadSessions = useCallback(async () => {
    const data = await getSessions(50);
    setSessions(data);
    setTotalD(data.reduce((sum, s) => sum + s.d_earned_iu, 0));
    setTotalMinutes(data.reduce((sum, s) => sum + s.duration_minutes, 0));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logbook</Text>
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalD.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total IU</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(totalMinutes)}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={s => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SUNTRACE_COLORS.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SessionCard session={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☀️</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySubtitle}>Start your first sun session to see it here.</Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/session')}>
              <Text style={styles.startBtnText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

function SessionCard({ session }: { session: SunSession }) {
  const cat = getUVCategory(session.uv_index_avg);
  const date = new Date(session.started_at);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardDateRow}>
          <Calendar size={14} color={SUNTRACE_COLORS.textSecondary} />
          <Text style={styles.cardDate}>
            {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: cat.color + '22' }]}>
          <Text style={[styles.riskText, { color: cat.color }]}>
            {session.burn_risk_level.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Clock size={16} color={SUNTRACE_COLORS.textSecondary} />
          <Text style={styles.cardStatText}>{session.duration_minutes.toFixed(0)} min</Text>
        </View>
        <View style={styles.cardStat}>
          <Zap size={16} color={cat.color} />
          <Text style={[styles.cardStatText, { color: cat.color }]}>UV {session.uv_index_avg.toFixed(1)}</Text>
        </View>
        <View style={styles.cardStat}>
          <Sun size={16} color={SUNTRACE_COLORS.primary} />
          <Text style={[styles.cardStatText, { color: SUNTRACE_COLORS.primary }]}>
            +{session.d_earned_iu.toLocaleString()} IU
          </Text>
        </View>
      </View>
      {session.location_name && (
        <Text style={styles.cardLocation}>📍 {session.location_name}</Text>
      )}
      {session.notes && (
        <Text style={styles.cardNotes}>{session.notes}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary },
  statsRow: { flexDirection: 'row', backgroundColor: SUNTRACE_COLORS.bgCard, marginHorizontal: 20, borderRadius: 16, marginBottom: 20, paddingVertical: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#334155' },
  statValue: { fontSize: 24, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary },
  statLabel: { fontSize: 12, color: SUNTRACE_COLORS.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 14, color: SUNTRACE_COLORS.textPrimary, fontWeight: '600' },
  riskBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  riskText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardStats: { flexDirection: 'row', gap: 20 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardStatText: { fontSize: 14, fontWeight: '600', color: SUNTRACE_COLORS.textPrimary },
  cardLocation: { fontSize: 12, color: SUNTRACE_COLORS.textSecondary, marginTop: 8 },
  cardNotes: { fontSize: 13, color: SUNTRACE_COLORS.textSecondary, marginTop: 6, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary },
  emptySubtitle: { fontSize: 14, color: SUNTRACE_COLORS.textSecondary, textAlign: 'center' },
  startBtn: { backgroundColor: SUNTRACE_COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 8 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

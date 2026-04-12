/**
 * SunTrace — Session Detail Screen
 *
 * Shows full details of a completed sun session:
 * - Date, time, duration
 * - UV index, Vitamin D earned
 * - Location (if captured)
 * - Burn risk level
 * - Notes
 * - Delete option
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Clock,
  Zap,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  Trash2,
} from 'lucide-react-native';
import { getSessionById, deleteSession } from '@/services/api';
import type { SunSession } from '@/types/models';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function uvColor(uv: number): string {
  if (uv <= 2) return '#22C55E';
  if (uv <= 5) return '#EAB308';
  if (uv <= 7) return '#F97316';
  if (uv <= 10) return '#EF4444';
  return '#A855F7';
}

function burnRiskLabel(level?: string): string {
  if (!level) return 'Unknown';
  return level.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery<SunSession | null>({
    queryKey: ['session', id],
    queryFn: () => getSessionById(id),
    enabled: !!id,
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      router.back();
    },
  });

  function handleDelete() {
    Alert.alert(
      'Delete Session',
      'This session will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => doDelete(),
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Session not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const uv = session.uv_index_avg ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={20} color="#F97316" />
          <Text style={styles.backText}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <Trash2 size={20} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={[styles.uvCircle, { backgroundColor: uvColor(uv) + '22' }]}>
          <Sun size={32} color={uvColor(uv)} />
        </View>
        <Text style={styles.dateText}>{formatDateTime(session.started_at)}</Text>
        <Text style={styles.timeRange}>
          {formatTime(session.started_at)}
          {session.ended_at ? ` – ${formatTime(session.ended_at)}` : ''}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <DetailRow
          icon={<Clock size={18} color="#64748B" />}
          label="Duration"
          value={`${session.duration_minutes ?? 0} minutes`}
        />
        <View style={styles.rowDivider} />
        <DetailRow
          icon={<Sun size={18} color={uvColor(uv)} />}
          label="UV Index"
          value={uv.toFixed(1)}
          valueColor={uvColor(uv)}
        />
        <View style={styles.rowDivider} />
        <DetailRow
          icon={<Zap size={18} color="#F97316" />}
          label="Vitamin D Earned"
          value={`${session.d_earned_iu ?? 0} IU`}
          valueColor="#F97316"
        />
        {session.burn_risk_level && (
          <>
            <View style={styles.rowDivider} />
            <DetailRow
              icon={<AlertTriangle size={18} color="#EAB308" />}
              label="Burn Risk"
              value={burnRiskLabel(session.burn_risk_level)}
            />
          </>
        )}
        {session.location_name && (
          <>
            <View style={styles.rowDivider} />
            <DetailRow
              icon={<MapPin size={18} color="#64748B" />}
              label="Location"
              value={session.location_name}
            />
          </>
        )}
      </View>

      {/* Notes */}
      {session.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesBody}>{session.notes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', gap: 12 },
  notFoundText: { fontSize: 16, color: '#94A3B8' },
  backLink: { fontSize: 14, color: '#F97316' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16, color: '#F97316', fontWeight: '600' },
  headerCard: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 28,
    marginBottom: 12,
    gap: 8,
  },
  uvCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: { fontSize: 17, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
  timeRange: { fontSize: 13, color: '#64748B' },
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  detailIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '700', color: '#F1F5F9' },
  rowDivider: { height: 1, backgroundColor: '#0F172A', marginHorizontal: 14 },
  notesCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  notesTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 },
  notesBody: { fontSize: 15, color: '#94A3B8', lineHeight: 22 },
});

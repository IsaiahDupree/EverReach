/**
 * SunTrace - Session Detail Modal
 *
 * Pushed from Logbook (router.push('/session-detail?id=...'))
 * Displays full session info + editable notes field.
 * Saves notes to Supabase on blur.
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Clock,
  Sun,
  Zap,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { updateSession } from '@/services/api';
import type { SunSession } from '@/types/models';

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
function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeFull(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function durationLabel(minutes?: number): string {
  if (minutes == null) return '--';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function uvLabel(uv?: number): string {
  if (uv == null) return 'N/A';
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

function uvColor(uv?: number): string {
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

function burnLabel(risk?: 'low' | 'moderate' | 'high'): string {
  if (!risk) return 'Unknown';
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

// ============================================
// Detail row
// ============================================
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
    <View style={detailStyles.row}>
      <View style={detailStyles.iconWrap}>{icon}</View>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconWrap: { width: 36, alignItems: 'center' },
  label: { flex: 1, fontSize: 14, color: MUTED, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '700', color: TEXT },
});

// ============================================
// Burn risk chip
// ============================================
function BurnRiskChip({ risk }: { risk?: 'low' | 'moderate' | 'high' }) {
  const color = burnColor(risk);
  const label = burnLabel(risk);
  const Icon = risk === 'low' ? CheckCircle : AlertTriangle;

  return (
    <View style={[chipStyles.chip, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Icon size={14} color={color} />
      <Text style={[chipStyles.text, { color }]}>{label} Risk</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 13, fontWeight: '700' },
});

// ============================================
// Main Screen
// ============================================
export default function SessionDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<SunSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesText, setNotesText] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  // Load session from Supabase
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sun_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        Alert.alert('Error', 'Could not load session details.');
        router.back();
        return;
      }

      setSession(data as SunSession);
      setNotesText(data.notes ?? '');
      setLoading(false);
    })();
  }, [id]);

  const saveNotesMutation = useMutation({
    mutationFn: ({ sessionId, notes }: { sessionId: string; notes: string }) =>
      updateSession(sessionId, { notes }),
    onSuccess: () => {
      setNotesSaved(true);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setTimeout(() => setNotesSaved(false), 2000);
    },
    onError: () => {
      Alert.alert('Error', 'Could not save notes. Please try again.');
    },
  });

  const handleNotesSave = () => {
    if (!session) return;
    const trimmed = notesText.trim();
    if (trimmed === (session.notes ?? '')) return;
    saveNotesMutation.mutate({ sessionId: session.id, notes: trimmed });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (!session) return null;

  const uv = session.uv_index_avg;
  const uvCol = uvColor(uv);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Session Detail</Text>
          <Text style={styles.subtitle}>{formatDateFull(session.started_at)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero stats */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Clock size={22} color={ORANGE} />
              <Text style={styles.heroValue}>{durationLabel(session.duration_minutes)}</Text>
              <Text style={styles.heroLabel}>Duration</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Sun size={22} color={uvCol} />
              <Text style={[styles.heroValue, { color: uvCol }]}>
                {uv?.toFixed(1) ?? '--'}
              </Text>
              <Text style={styles.heroLabel}>UV Index</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Zap size={22} color={ORANGE} />
              <Text style={styles.heroValue}>
                {session.d_earned_iu != null ? `${session.d_earned_iu}` : '--'}
              </Text>
              <Text style={styles.heroLabel}>IU Earned</Text>
            </View>
          </View>

          {/* Burn risk chip */}
          <View style={styles.chipRow}>
            <BurnRiskChip risk={session.burn_risk_level} />
            {uv != null && (
              <View style={[styles.uvChip, { backgroundColor: uvCol + '22', borderColor: uvCol + '44' }]}>
                <Sun size={12} color={uvCol} />
                <Text style={[styles.uvChipText, { color: uvCol }]}>
                  {uvLabel(uv)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Detail rows */}
        <View style={styles.card}>
          <DetailRow
            icon={<Calendar size={16} color={MUTED} />}
            label="Started"
            value={formatTimeFull(session.started_at)}
          />
          {session.ended_at ? (
            <DetailRow
              icon={<Clock size={16} color={MUTED} />}
              label="Ended"
              value={formatTimeFull(session.ended_at)}
            />
          ) : null}
          {session.location_name ? (
            <DetailRow
              icon={<MapPin size={16} color={MUTED} />}
              label="Location"
              value={session.location_name}
            />
          ) : null}
          {uv != null && (
            <DetailRow
              icon={<Sun size={16} color={uvCol} />}
              label="UV Index"
              value={`${uv.toFixed(1)} — ${uvLabel(uv)}`}
              valueColor={uvCol}
            />
          )}
          <View style={{ ...detailStyles.row, borderBottomWidth: 0 }}>
            <View style={detailStyles.iconWrap}>
              <AlertTriangle size={16} color={burnColor(session.burn_risk_level)} />
            </View>
            <Text style={detailStyles.label}>Burn Risk</Text>
            <Text
              style={[detailStyles.value, { color: burnColor(session.burn_risk_level) }]}
            >
              {burnLabel(session.burn_risk_level)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <View style={styles.notesHeader}>
            <FileText size={14} color={ORANGE} />
            <Text style={styles.notesTitle}>Notes</Text>
            {notesSaved && (
              <View style={styles.savedBadge}>
                <CheckCircle size={12} color="#22C55E" />
                <Text style={styles.savedText}>Saved</Text>
              </View>
            )}
            {saveNotesMutation.isPending && (
              <ActivityIndicator size="small" color={ORANGE} style={{ marginLeft: 8 }} />
            )}
          </View>
          <TextInput
            style={styles.notesInput}
            value={notesText}
            onChangeText={setNotesText}
            onBlur={handleNotesSave}
            placeholder="Add notes about this session..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="done"
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    gap: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  heroStat: { alignItems: 'center', gap: 6, flex: 1 },
  heroValue: { fontSize: 26, fontWeight: '800', color: TEXT },
  heroLabel: { fontSize: 11, color: MUTED },
  heroDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  uvChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  uvChipText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    paddingBottom: 8,
  },
  notesTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },
  notesInput: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: TEXT,
    minHeight: 100,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    lineHeight: 20,
  },
});

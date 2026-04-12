/**
 * SunTrace — Active Session Screen
 *
 * Live session view:
 * - Elapsed time counter (HH:MM:SS)
 * - Vitamin D earned so far (accumulates in real time)
 * - Burn risk bar (green → red countdown)
 * - Current UV index
 * - Sunscreen toggle
 * - Stop session button → saves to Supabase + triggers badge check
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sun, Zap, AlertTriangle, StopCircle, Clock } from 'lucide-react-native';
import { useSunSession } from '@/hooks/useSunSession';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/services/api';
import type { Profile } from '@/types/models';

// ── Helpers ──────────────────────────────────────────────────────────��─────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function burnRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low': return '#22C55E';
    case 'moderate': return '#EAB308';
    case 'high': return '#F97316';
    case 'very_high': return '#EF4444';
    default: return '#22C55E';
  }
}

// ── Burn Risk Bar ──────────────────────────────────────────────────────────────

function BurnRiskBar({
  riskLevel,
  elapsedMinutes,
  burnMinutes,
}: {
  riskLevel: string;
  elapsedMinutes: number;
  burnMinutes: number;
}) {
  const progress = burnMinutes > 0 ? Math.min(1, elapsedMinutes / burnMinutes) : 0;
  const color = burnRiskColor(riskLevel);

  return (
    <View style={burnStyles.container}>
      <View style={burnStyles.header}>
        <AlertTriangle size={14} color={color} />
        <Text style={[burnStyles.label, { color }]}>Burn Risk</Text>
        <Text style={[burnStyles.level, { color }]}>
          {riskLevel.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
      <View style={burnStyles.track}>
        <View
          style={[
            burnStyles.fill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={burnStyles.caption}>
        {burnMinutes > 0
          ? `${Math.max(0, Math.round(burnMinutes - elapsedMinutes))} min remaining`
          : 'UV too low for burn risk'}
      </Text>
    </View>
  );
}

const burnStyles = StyleSheet.create({
  container: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  label: { flex: 1, fontSize: 13, fontWeight: '600' },
  level: { fontSize: 11, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: { height: '100%', borderRadius: 4 },
  caption: { fontSize: 11, color: '#64748B', textAlign: 'right' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ActiveSessionScreen() {
  const router = useRouter();
  const [sunscreenOn, setSunscreenOn] = useState(false);

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const skinType = profile?.skin_type ?? 2;

  const {
    isActive,
    elapsedSeconds,
    vitaminDEarned,
    currentUV,
    burnRiskLevel,
    burnThresholdMinutes,
    startSession,
    stopSession,
    error,
  } = useSunSession({ skinType });

  const elapsedMinutes = elapsedSeconds / 60;

  async function handleStop() {
    Alert.alert('End Session?', 'This will save your session and calculate your final stats.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          const completed = await stopSession({ sunscreen_applied: sunscreenOn });
          if (completed) {
            router.replace(`/session/${completed.id}`);
          } else {
            router.back();
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Active Session</Text>
        {isActive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerCard}>
        <Clock size={20} color="#64748B" />
        <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
        <Text style={styles.timerLabel}>elapsed</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Sun size={24} color="#F97316" />
          <Text style={styles.statValue}>{currentUV.toFixed(1)}</Text>
          <Text style={styles.statLabel}>UV Index</Text>
        </View>
        <View style={styles.statCard}>
          <Zap size={24} color="#EAB308" />
          <Text style={[styles.statValue, { color: '#EAB308' }]}>
            {Math.round(vitaminDEarned)}
          </Text>
          <Text style={styles.statLabel}>IU earned</Text>
        </View>
      </View>

      {/* Burn risk bar */}
      <View style={styles.section}>
        <BurnRiskBar
          riskLevel={burnRiskLevel ?? 'low'}
          elapsedMinutes={elapsedMinutes}
          burnMinutes={burnThresholdMinutes ?? 0}
        />
      </View>

      {/* Sunscreen toggle */}
      <View style={styles.sunscreenRow}>
        <Text style={styles.sunscreenLabel}>Sunscreen applied</Text>
        <Switch
          value={sunscreenOn}
          onValueChange={setSunscreenOn}
          trackColor={{ true: '#F97316', false: '#334155' }}
          thumbColor="white"
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Stop button */}
      {isActive && (
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStop}
          activeOpacity={0.85}
        >
          <StopCircle size={22} color="white" />
          <Text style={styles.stopButtonText}>End Session</Text>
        </TouchableOpacity>
      )}

      {!isActive && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={startSession}
          activeOpacity={0.85}
        >
          <Sun size={22} color="white" />
          <Text style={styles.startButtonText}>Start Session</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.disclaimer}>
        UV data sourced from Open-Meteo. Always protect skin at UV ≥ 6.
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────���─────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#F1F5F9' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF444422',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  timerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 60,
    fontWeight: '800',
    color: '#F1F5F9',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  timerLabel: { fontSize: 13, color: '#64748B' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: '#F97316' },
  statLabel: { fontSize: 11, color: '#64748B' },
  section: { marginBottom: 16 },
  sunscreenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sunscreenLabel: { fontSize: 15, color: '#F1F5F9', fontWeight: '600' },
  errorText: { fontSize: 13, color: '#EF4444', marginBottom: 12 },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  stopButtonText: { fontSize: 17, fontWeight: '700', color: 'white' },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F97316',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  startButtonText: { fontSize: 17, fontWeight: '700', color: 'white' },
  disclaimer: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

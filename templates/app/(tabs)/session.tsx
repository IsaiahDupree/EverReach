/**
 * SunTrace - Session Screen
 *
 * Features:
 * - Live MM:SS session timer
 * - Real-time Vitamin D IU accumulation
 * - Burn risk countdown bar (green → red)
 * - Current UV index + location
 * - Session summary modal on stop → saves to Supabase
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Square,
  MapPin,
  Sun,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { createSession, endSession, fetchCurrentUV, getProfile } from '@/services/api';
import { APP_CONFIG } from '@/constants/config';
import type { Profile, SunSession } from '@/types/models';

// ============================================
// Vitamin D calculation
// ============================================
function calcVitaminD(
  uvIndex: number,
  elapsedSeconds: number,
  skinType: number
): number {
  if (uvIndex < 3) return 0;
  const skinFactor =
    APP_CONFIG.VITAMIN_D.SKIN_TYPE_FACTORS[Math.min(skinType - 1, 5)];
  const minutes = elapsedSeconds / 60;
  return Math.round(uvIndex * skinFactor * APP_CONFIG.VITAMIN_D.BASE_IU_PER_MINUTE * minutes);
}

// Burn time estimate in minutes by UV and skin type
function burnTimeMinutes(uvIndex: number, skinType: number): number {
  if (uvIndex === 0) return Infinity;
  const baseTimes = [10, 15, 20, 30, 45, 60]; // base minutes for each skin type at UV=1
  const base = baseTimes[Math.min(skinType - 1, 5)];
  return Math.round(base / uvIndex);
}

function uvColor(uv: number): string {
  if (uv <= APP_CONFIG.UV.LOW_MAX) return '#22C55E';
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return '#EAB308';
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return '#F97316';
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return '#EF4444';
  return '#A855F7';
}

function padTime(n: number): string {
  return String(n).padStart(2, '0');
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${padTime(m)}:${padTime(s)}`;
}

// ============================================
// Burn Risk Bar
// ============================================
function BurnRiskBar({
  elapsed,
  burnTime,
}: {
  elapsed: number;
  burnTime: number;
}) {
  const progress = burnTime > 0 ? Math.min(elapsed / (burnTime * 60), 1) : 0;
  const barColor =
    progress < 0.4 ? '#22C55E' : progress < 0.7 ? '#EAB308' : progress < 0.9 ? '#F97316' : '#EF4444';
  const riskLabel =
    progress < 0.4 ? 'Safe' : progress < 0.7 ? 'Caution' : progress < 0.9 ? 'High Risk' : 'Danger!';

  return (
    <View style={burnStyles.container}>
      <View style={burnStyles.header}>
        <Text style={burnStyles.label}>Burn Risk</Text>
        <Text style={[burnStyles.status, { color: barColor }]}>{riskLabel}</Text>
      </View>
      <View style={burnStyles.track}>
        <View
          style={[
            burnStyles.fill,
            { width: `${progress * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      {burnTime < Infinity && (
        <Text style={burnStyles.remaining}>
          {Math.max(0, burnTime - Math.floor(elapsed / 60))} min until burn risk
        </Text>
      )}
    </View>
  );
}

const burnStyles = StyleSheet.create({
  container: { marginTop: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, color: '#64748B' },
  status: { fontSize: 13, fontWeight: '700' },
  track: {
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 4,
  },
  remaining: { fontSize: 11, color: '#64748B', marginTop: 4 },
});

// ============================================
// Session Summary Modal
// ============================================
function SessionSummaryModal({
  visible,
  session,
  vitaminD,
  elapsed,
  uvIndex,
  onSave,
  onDiscard,
}: {
  visible: boolean;
  session: SunSession | null;
  vitaminD: number;
  elapsed: number;
  uvIndex: number;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <CheckCircle size={48} color="#22C55E" style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Text style={modalStyles.title}>Session Complete!</Text>

          <View style={modalStyles.statGrid}>
            <StatBox icon={<Sun size={20} color="#EAB308" />} label="Duration" value={formatElapsed(elapsed)} />
            <StatBox icon={<Zap size={20} color="#F97316" />} label="Vitamin D" value={`${vitaminD} IU`} />
            <StatBox icon={<Sun size={20} color="#64748B" />} label="UV Index" value={uvIndex.toFixed(1)} />
          </View>

          <TouchableOpacity style={modalStyles.saveBtn} onPress={onSave}>
            <Text style={modalStyles.saveBtnText}>Save Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.discardBtn} onPress={onDiscard}>
            <Text style={modalStyles.discardBtnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={modalStyles.statBox}>
      {icon}
      <Text style={modalStyles.statValue}>{value}</Text>
      <Text style={modalStyles.statLabel}>{label}</Text>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 28,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', textAlign: 'center', marginBottom: 20 },
  statGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  statBox: { alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
  statLabel: { fontSize: 12, color: '#64748B' },
  saveBtn: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: 'white' },
  discardBtn: { alignItems: 'center', paddingVertical: 8 },
  discardBtnText: { fontSize: 14, color: '#64748B' },
});

// ============================================
// Main Session Screen
// ============================================
export default function SessionScreen() {
  const queryClient = useQueryClient();

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: () => import('@/services/api').then((m) => m.getProfile()),
  });

  const skinType = profile?.skin_type ?? 3;

  const { data: currentUV = 0, refetch: refetchUV } = useQuery<number>({
    queryKey: ['current-uv', coords?.lat, coords?.lng],
    queryFn: () =>
      coords
        ? fetchCurrentUV(coords.lat, coords.lng)
        : Promise.resolve(0),
    enabled: !!coords,
    refetchInterval: running ? 60000 : false,
  });

  const vitaminD = calcVitaminD(currentUV, elapsed, skinType);
  const burnTime = burnTimeMinutes(currentUV, skinType);

  // Get location
  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setCoords({ lat: location.coords.latitude, lng: location.coords.longitude });

    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (place) {
        setLocationName([place.city, place.region].filter(Boolean).join(', '));
      }
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      setActiveSessionId(session.id);
    },
    onError: () => {
      Alert.alert('Error', 'Could not start session. Check your connection.');
      setRunning(false);
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: import('@/types/models').UpdateSessionInput }) =>
      endSession(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const handleStart = async () => {
    await requestLocation();
    setElapsed(0);
    setRunning(true);
    startTimeRef.current = new Date();

    createSessionMutation.mutate({
      started_at: new Date().toISOString(),
      latitude: coords?.lat,
      longitude: coords?.lng,
      location_name: locationName || undefined,
      uv_index_avg: currentUV,
    });

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setShowSummary(true);
  };

  const handleSave = async () => {
    if (!activeSessionId) return;
    setShowSummary(false);

    await endSessionMutation.mutateAsync({
      id: activeSessionId,
      input: {
        ended_at: new Date().toISOString(),
        duration_minutes: Math.round(elapsed / 60),
        uv_index_avg: currentUV,
        d_earned_iu: vitaminD,
        latitude: coords?.lat,
        longitude: coords?.lng,
        location_name: locationName || undefined,
      },
    });

    setElapsed(0);
    setActiveSessionId(null);
  };

  const handleDiscard = () => {
    setShowSummary(false);
    setElapsed(0);
    setActiveSessionId(null);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const uvCol = uvColor(currentUV);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sun Session</Text>
        {locationName ? (
          <View style={styles.locationRow}>
            <MapPin size={12} color="#64748B" />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Timer */}
        <View style={styles.timerCard}>
          <Text style={[styles.timer, running && styles.timerRunning]}>
            {formatElapsed(elapsed)}
          </Text>
          <Text style={styles.timerLabel}>
            {running ? 'Session in progress' : 'Tap to start'}
          </Text>
        </View>

        {/* UV Badge */}
        <View style={styles.uvRow}>
          <View style={[styles.uvBadge, { borderColor: uvCol }]}>
            <Sun size={18} color={uvCol} />
            <Text style={[styles.uvValue, { color: uvCol }]}>
              {currentUV.toFixed(1)}
            </Text>
            <Text style={styles.uvLabel}>UV Index</Text>
          </View>

          <View style={styles.vitaminDCard}>
            <Zap size={18} color="#F97316" />
            <Text style={styles.vitaminDValue}>{vitaminD}</Text>
            <Text style={styles.vitaminDLabel}>IU earned</Text>
          </View>
        </View>

        {/* Burn Risk */}
        <View style={styles.card}>
          <BurnRiskBar elapsed={elapsed} burnTime={burnTime} />
        </View>

        {/* UV warning */}
        {currentUV > APP_CONFIG.UV.HIGH_MAX && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.warningText}>
              High UV — apply SPF 30+ sunscreen
            </Text>
          </View>
        )}

        {/* Start/Stop Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            running ? styles.stopBtn : styles.startBtn,
          ]}
          onPress={running ? handleStop : handleStart}
          activeOpacity={0.85}
        >
          {running ? (
            <>
              <Square size={22} color="white" fill="white" />
              <Text style={styles.actionBtnText}>Stop Session</Text>
            </>
          ) : (
            <>
              <Play size={22} color="white" fill="white" />
              <Text style={styles.actionBtnText}>Start Session</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Summary Modal */}
      <SessionSummaryModal
        visible={showSummary}
        session={null}
        vitaminD={vitaminD}
        elapsed={elapsed}
        uvIndex={currentUV}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: { fontSize: 12, color: '#64748B' },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  timerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  timer: {
    fontSize: 72,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  timerRunning: { color: '#F97316' },
  timerLabel: { fontSize: 14, color: '#64748B', marginTop: 8 },
  uvRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  uvBadge: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
  },
  uvValue: { fontSize: 28, fontWeight: '800' },
  uvLabel: { fontSize: 12, color: '#64748B' },
  vitaminDCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  vitaminDValue: { fontSize: 28, fontWeight: '800', color: '#F97316' },
  vitaminDLabel: { fontSize: 12, color: '#64748B' },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444411',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningText: { fontSize: 13, color: '#EF4444', flex: 1 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtn: {
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
  },
  stopBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  actionBtnText: { fontSize: 17, fontWeight: '700', color: 'white' },
});

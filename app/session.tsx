import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Square, Sun, Thermometer } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { createSession } from '@/services/suntraceApi';
import { getCurrentUVIndex } from '@/services/openMeteo';
import {
  calculateDEarned,
  calculateBurnRiskSeconds,
  getBurnRiskLevel,
  getUVCategory,
} from '@/services/uvCalculations';
import { getProfile } from '@/services/suntraceApi';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { FitzpatrickType } from '@/types/suntrace';

const TIMER_INTERVAL = 1000; // 1 second

export default function SessionScreen() {
  const router = useRouter();
  const [skinType, setSkinType] = useState<FitzpatrickType>(3);
  const [dailyTarget, setDailyTarget] = useState(1500);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [currentUV, setCurrentUV] = useState(5.0);
  const [dAccumulated, setDAccumulated] = useState(0);
  const [burnRiskSeconds, setBurnRiskSeconds] = useState(9999);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uvPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load profile on mount
  useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setSkinType(p.skin_type);
        setDailyTarget(p.daily_d_target_iu);
      }
    });
    // Get location
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocationCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
          // Get UV for location
          const uv = await getCurrentUVIndex(loc.coords.latitude, loc.coords.longitude);
          setCurrentUV(uv);
          // Reverse geocode for location name
          const geo = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo[0]) {
            setLocationName([geo[0].city, geo[0].region].filter(Boolean).join(', '));
          }
        }
      } catch {}
    })();
  }, []);

  // Pulse animation when running
  useEffect(() => {
    if (running) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [running]);

  function startSession() {
    startTimeRef.current = new Date();
    setRunning(true);
    setSessionStarted(true);
    setElapsed(0);
    setDAccumulated(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    timerRef.current = setInterval(() => {
      setElapsed(s => {
        const newElapsed = s + 1;
        const minutes = newElapsed / 60;
        // Recalculate D every tick
        const d = calculateDEarned({ uv_index: currentUV, minutes, skin_type: skinType });
        setDAccumulated(d);
        // Burn risk
        const burnSecs = calculateBurnRiskSeconds(skinType, currentUV, minutes);
        setBurnRiskSeconds(burnSecs);
        return newElapsed;
      });
    }, TIMER_INTERVAL);

    // Poll UV every 5 minutes
    uvPollRef.current = setInterval(async () => {
      if (locationCoords) {
        try {
          const uv = await getCurrentUVIndex(locationCoords.lat, locationCoords.lon);
          setCurrentUV(uv);
        } catch {}
      }
    }, 5 * 60 * 1000);
  }

  async function stopSession() {
    if (!startTimeRef.current || !running) return;

    clearInterval(timerRef.current!);
    clearInterval(uvPollRef.current!);
    setRunning(false);
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const endTime = new Date();
    const durationMinutes = elapsed / 60;
    const burnRiskLevel = getBurnRiskLevel(skinType, currentUV, durationMinutes);

    try {
      await createSession({
        started_at: startTimeRef.current.toISOString(),
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
        uv_index_avg: currentUV,
        d_earned_iu: dAccumulated,
        burn_risk_level: burnRiskLevel,
        latitude: locationCoords?.lat,
        longitude: locationCoords?.lon,
        location_name: locationName ?? undefined,
      });

      // Navigate to summary
      router.replace({
        pathname: '/session-summary',
        params: {
          duration: durationMinutes.toFixed(1),
          uv: currentUV.toFixed(1),
          d_earned: dAccumulated.toString(),
          risk: burnRiskLevel,
        },
      });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save session: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmStop() {
    Alert.alert('End Session?', 'Stop your current sun session and save results?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Session', style: 'destructive', onPress: stopSession },
    ]);
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const uvCat = getUVCategory(currentUV);
  const burnPercent = Math.max(0, Math.min(1, burnRiskSeconds / (30 * 60)));
  const burnColor =
    burnPercent > 0.6
      ? SUNTRACE_COLORS.burnLow
      : burnPercent > 0.3
      ? SUNTRACE_COLORS.burnModerate
      : burnPercent > 0.1
      ? SUNTRACE_COLORS.burnHigh
      : SUNTRACE_COLORS.burnVeryHigh;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sun Session</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* UV Display */}
      <View style={[styles.uvSection, { borderColor: uvCat.color + '44' }]}>
        <Text style={[styles.uvLabel, { color: uvCat.color }]}>UV Index</Text>
        <Text style={[styles.uvValue, { color: uvCat.color }]}>
          {currentUV.toFixed(1)}
        </Text>
        <Text style={[styles.uvCategory, { color: uvCat.color }]}>{uvCat.label}</Text>
      </View>

      {/* Timer */}
      <Animated.View
        style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}
      >
        <View style={[styles.timerCircle, running && { borderColor: SUNTRACE_COLORS.primary }]}>
          <Text style={styles.timerText}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text style={styles.timerSub}>
            {running ? 'Session running' : sessionStarted ? 'Paused' : 'Ready'}
          </Text>
        </View>
      </Animated.View>

      {/* D Accumulated */}
      <View style={styles.dSection}>
        <Sun size={20} color={SUNTRACE_COLORS.primary} />
        <Text style={styles.dValue}>{dAccumulated.toLocaleString()} IU</Text>
        <Text style={styles.dLabel}>Vitamin D earned</Text>
      </View>

      {/* Burn Risk Bar */}
      {running && (
        <View style={styles.burnSection}>
          <View style={styles.burnLabelRow}>
            <Thermometer size={16} color={burnColor} />
            <Text style={[styles.burnLabel, { color: burnColor }]}>
              Burn Risk:{' '}
              {burnRiskSeconds > 60
                ? `${Math.floor(burnRiskSeconds / 60)}m remaining`
                : `${burnRiskSeconds}s remaining`}
            </Text>
          </View>
          <View style={styles.burnTrack}>
            <View
              style={[
                styles.burnFill,
                { width: `${burnPercent * 100}%`, backgroundColor: burnColor },
              ]}
            />
          </View>
        </View>
      )}

      {/* Location */}
      {locationName && (
        <Text style={styles.locationText}>📍 {locationName}</Text>
      )}

      {/* Start/Stop Button */}
      <View style={styles.ctaContainer}>
        {!running && !sessionStarted ? (
          <TouchableOpacity style={styles.startBtn} onPress={startSession}>
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        ) : running ? (
          <TouchableOpacity
            style={[styles.stopBtn, saving && styles.btnDisabled]}
            onPress={confirmStop}
            disabled={saving}
          >
            <Square size={24} color="#fff" fill="#fff" />
            <Text style={styles.stopBtnText}>{saving ? 'Saving...' : 'End Session'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgDark,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  cancelText: {
    color: SUNTRACE_COLORS.textSecondary,
    fontSize: 16,
    width: 60,
  },
  headerTitle: {
    color: SUNTRACE_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  uvSection: {
    alignItems: 'center',
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  uvLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  uvValue: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
  },
  uvCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUNTRACE_COLORS.bgCard,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '800',
    color: SUNTRACE_COLORS.textPrimary,
    letterSpacing: 2,
  },
  timerSub: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 4,
  },
  dSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dValue: {
    fontSize: 24,
    fontWeight: '700',
    color: SUNTRACE_COLORS.primary,
  },
  dLabel: {
    fontSize: 14,
    color: SUNTRACE_COLORS.textSecondary,
  },
  burnSection: {
    marginBottom: 16,
  },
  burnLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  burnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  burnTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  burnFill: {
    height: '100%',
    borderRadius: 4,
  },
  locationText: {
    fontSize: 13,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  startBtn: {
    backgroundColor: SUNTRACE_COLORS.primary,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 20,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

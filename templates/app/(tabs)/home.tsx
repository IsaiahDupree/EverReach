/**
 * SunTrace - Home Screen (UV Dashboard)
 *
 * Features:
 * - UV gauge arc (0-12, color coded by WHO levels)
 * - Daily goal ring (% of Vitamin D target hit today)
 * - Streak flame with count
 * - Best UV window time range
 * - Active session banner
 * - Start Session CTA
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Sun, Flame, Clock, Zap, AlertTriangle, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getTodayStats, fetchCurrentUV, fetchUVForecast, getProfile } from '@/services/api';
import { APP_CONFIG } from '@/constants/config';
import type { DailyStats, Profile, DailyForecast } from '@/types/models';

// ============================================
// UV color helper
// ============================================
function uvColor(uv: number): string {
  if (uv <= APP_CONFIG.UV.LOW_MAX) return '#22C55E';
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return '#EAB308';
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return '#F97316';
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return '#EF4444';
  return '#A855F7';
}

function uvLabel(uv: number): string {
  if (uv <= APP_CONFIG.UV.LOW_MAX) return 'Low';
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return 'Moderate';
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return 'High';
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return 'Very High';
  return 'Extreme';
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '--';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ============================================
// UV Arc Gauge component
// ============================================
function UVGauge({ uvIndex }: { uvIndex: number }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const clampedUV = Math.min(uvIndex, 12);
  const color = uvColor(uvIndex);
  const label = uvLabel(uvIndex);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: clampedUV / 12,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [clampedUV]);

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.trackBackground}>
        <View style={gaugeStyles.trackRow}>
          {Array.from({ length: 12 }, (_, i) => {
            const filled = i < clampedUV;
            const segColor = filled ? uvColor(i + 1) : '#1E293B';
            return (
              <View
                key={i}
                style={[
                  gaugeStyles.segment,
                  { backgroundColor: segColor },
                ]}
              />
            );
          })}
        </View>
      </View>
      <View style={gaugeStyles.centerDisplay}>
        <Text style={[gaugeStyles.uvNumber, { color }]}>{uvIndex.toFixed(1)}</Text>
        <Text style={gaugeStyles.uvLabel}>UV Index</Text>
        <View style={[gaugeStyles.levelBadge, { backgroundColor: color + '22' }]}>
          <Text style={[gaugeStyles.levelText, { color }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  trackBackground: {
    width: '100%',
    paddingHorizontal: 4,
  },
  trackRow: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  segment: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  centerDisplay: {
    alignItems: 'center',
    marginTop: 16,
  },
  uvNumber: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
  },
  uvLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

// ============================================
// Goal Ring component
// ============================================
function GoalRing({ percent }: { percent: number }) {
  const clampedPct = Math.min(percent, 100);
  const color = clampedPct >= 100 ? '#22C55E' : clampedPct >= 50 ? '#F97316' : '#64748B';

  return (
    <View style={ringStyles.container}>
      <View style={ringStyles.ring}>
        <View
          style={[
            ringStyles.fill,
            {
              backgroundColor: color,
              height: `${clampedPct}%`,
            },
          ]}
        />
        <View style={ringStyles.overlay}>
          <Text style={[ringStyles.pct, { color }]}>{Math.round(clampedPct)}%</Text>
          <Text style={ringStyles.label}>Vit D</Text>
        </View>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#1E293B',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#0F172A',
  },
  fill: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderRadius: 37,
    opacity: 0.7,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pct: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: '#64748B', marginTop: 1 },
});

// ============================================
// Main Screen
// ============================================
export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  // Request location permission and get coords
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (place) {
          setLocationName(
            [place.city, place.region].filter(Boolean).join(', ')
          );
        }
      } catch {
        // location name is optional
      }
    })();
  }, []);

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const { data: todayStats, refetch: refetchStats } = useQuery<DailyStats | null>({
    queryKey: ['today-stats'],
    queryFn: getTodayStats,
    refetchInterval: APP_CONFIG.REALTIME.UV_POLL_INTERVAL_MS,
  });

  const { data: currentUV = 0, refetch: refetchUV } = useQuery<number>({
    queryKey: ['current-uv', coords?.lat, coords?.lng],
    queryFn: () =>
      coords ? fetchCurrentUV(coords.lat, coords.lng) : Promise.resolve(0),
    enabled: !!coords,
    refetchInterval: APP_CONFIG.REALTIME.UV_POLL_INTERVAL_MS,
  });

  const { data: forecast } = useQuery<DailyForecast[]>({
    queryKey: ['forecast', coords?.lat, coords?.lng],
    queryFn: () =>
      coords ? fetchUVForecast(coords.lat, coords.lng) : Promise.resolve([]),
    enabled: !!coords,
    staleTime: 1000 * 60 * APP_CONFIG.FORECAST.CACHE_MINUTES,
  });

  const todayForecast = forecast?.[0];
  const vitaminDPct = todayStats
    ? Math.min(
        100,
        (todayStats.total_d_earned_iu / APP_CONFIG.VITAMIN_D.DAILY_TARGET_IU) * 100
      )
    : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchUV()]);
    setRefreshing(false);
  }, [refetchStats, refetchUV]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#F97316"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good{getTimeOfDay()}, sunshine</Text>
          {locationName ? (
            <View style={styles.locationRow}>
              <MapPin size={12} color="#64748B" />
              <Text style={styles.locationText}>{locationName}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.streakContainer}>
          <Flame size={20} color="#F97316" />
          <Text style={styles.streakCount}>{profile?.streak_count ?? 0}</Text>
        </View>
      </View>

      {/* UV Gauge Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current UV Index</Text>
        <UVGauge uvIndex={currentUV} />
        {!coords && (
          <View style={styles.noLocationBanner}>
            <AlertTriangle size={14} color="#EAB308" />
            <Text style={styles.noLocationText}>Enable location for live UV data</Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <GoalRing percent={vitaminDPct} />
          <Text style={styles.statLabel}>Daily Goal</Text>
          <Text style={styles.statValue}>
            {todayStats?.total_d_earned_iu ?? 0} IU
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.bestWindowIcon}>
            <Clock size={28} color="#F97316" />
          </View>
          <Text style={styles.statLabel}>Best Window</Text>
          <Text style={styles.statValue}>
            {todayForecast?.best_window_start
              ? `${formatTime(todayForecast.best_window_start)}–${formatTime(todayForecast.best_window_end)}`
              : '--'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.sessionsIcon}>
            <Sun size={28} color="#EAB308" />
          </View>
          <Text style={styles.statLabel}>Sessions</Text>
          <Text style={styles.statValue}>
            {todayStats?.session_count ?? 0} today
          </Text>
        </View>
      </View>

      {/* Today Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <View style={styles.summaryRow}>
          <SummaryItem
            label="Time Outside"
            value={`${todayStats?.total_minutes ?? 0} min`}
            icon={<Clock size={16} color="#64748B" />}
          />
          <SummaryItem
            label="Vitamin D"
            value={`${todayStats?.total_d_earned_iu ?? 0} IU`}
            icon={<Zap size={16} color="#64748B" />}
          />
          <SummaryItem
            label="Peak UV"
            value={todayStats?.peak_uv_index?.toFixed(1) ?? '--'}
            icon={<Sun size={16} color="#64748B" />}
          />
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/(tabs)/session')}
        activeOpacity={0.85}
      >
        <Sun size={22} color="white" />
        <Text style={styles.ctaText}>Start Sun Session</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.summaryItem}>
      {icon}
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return ' morning';
  if (h < 17) return ' afternoon';
  return ' evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 12, color: '#64748B' },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakCount: { fontSize: 16, fontWeight: '700', color: '#F97316' },
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  noLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#EAB30811',
    padding: 10,
    borderRadius: 8,
  },
  noLocationText: { fontSize: 12, color: '#EAB308' },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  statValue: { fontSize: 12, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
  bestWindowIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9731611',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAB30811',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  summaryLabel: { fontSize: 11, color: '#64748B' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F97316',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: 'white' },
  bottomSpacer: { height: 16 },
});

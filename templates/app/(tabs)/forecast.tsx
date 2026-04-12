/**
 * SunTrace - Forecast Screen
 *
 * Features:
 * - Today's hourly UV bar chart (free tier)
 * - 7-day forecast list (Pro gated)
 * - Each day: max UV, cloud cover %, best window
 * - Pulls from Open-Meteo via fetchUVForecast
 */
import { useState, useEffect } from 'react';
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
import { Cloud, Sun, Lock, ChevronRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import { fetchUVForecast } from '@/services/api';
import { useSubscription } from '@/hooks/useSubscription';
import { APP_CONFIG } from '@/constants/config';
import type { DailyForecast, UVForecast } from '@/types/models';

// ============================================
// Helpers
// ============================================
function uvColor(uv: number): string {
  if (uv <= APP_CONFIG.UV.LOW_MAX) return '#22C55E';
  if (uv <= APP_CONFIG.UV.MODERATE_MAX) return '#EAB308';
  if (uv <= APP_CONFIG.UV.HIGH_MAX) return '#F97316';
  if (uv <= APP_CONFIG.UV.VERY_HIGH_MAX) return '#EF4444';
  return '#A855F7';
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}${ampm}`;
}

function formatWindowTime(timeStr?: string): string {
  if (!timeStr) return '--';
  const [h] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12} ${ampm}`;
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ============================================
// Hourly UV Bar Chart
// ============================================
function HourlyChart({ hours }: { hours: UVForecast[] }) {
  const maxUV = Math.max(...hours.map((h) => h.uv_index), 1);
  const displayHours = hours.filter((h) => h.hour >= 6 && h.hour <= 20);
  const currentHour = new Date().getHours();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={chartStyles.scrollContent}
    >
      {displayHours.map((h) => {
        const barHeight = Math.max(4, (h.uv_index / maxUV) * 100);
        const color = uvColor(h.uv_index);
        const isCurrent = h.hour === currentHour;

        return (
          <View key={h.hour} style={chartStyles.barColumn}>
            <Text style={[chartStyles.uvText, { color }]}>
              {h.uv_index.toFixed(0)}
            </Text>
            <View style={chartStyles.barTrack}>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: barHeight,
                    backgroundColor: color,
                    opacity: isCurrent ? 1 : 0.7,
                  },
                ]}
              />
            </View>
            <Text style={[chartStyles.hourLabel, isCurrent && chartStyles.currentHour]}>
              {formatHour(h.hour)}
            </Text>
            {isCurrent && <View style={chartStyles.currentDot} />}
          </View>
        );
      })}
    </ScrollView>
  );
}

const chartStyles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 4, paddingVertical: 8, gap: 6 },
  barColumn: { alignItems: 'center', width: 44 },
  barTrack: {
    height: 100,
    justifyContent: 'flex-end',
    marginVertical: 4,
  },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  uvText: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  hourLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  currentHour: { color: '#F97316', fontWeight: '700' },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F97316',
    marginTop: 2,
  },
});

// ============================================
// Daily Forecast Row
// ============================================
function DayRow({ day, isPro, onUpgrade }: { day: DailyForecast; isPro: boolean; onUpgrade: () => void }) {
  const uvCol = uvColor(day.max_uv);

  if (!isPro) {
    return (
      <TouchableOpacity style={dayStyles.row} onPress={onUpgrade} activeOpacity={0.8}>
        <View style={dayStyles.dateCol}>
          <Text style={dayStyles.dayLabel}>--</Text>
          <Text style={dayStyles.date}>Upgrade</Text>
        </View>
        <View style={dayStyles.locked}>
          <Lock size={14} color="#64748B" />
          <Text style={dayStyles.lockedText}>Pro</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={dayStyles.row}>
      <View style={dayStyles.dateCol}>
        <Text style={dayStyles.dayLabel}>{dayLabel(day.date)}</Text>
        <Text style={dayStyles.date}>
          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <View style={[dayStyles.uvPill, { backgroundColor: uvCol + '22', borderColor: uvCol }]}>
        <Text style={[dayStyles.uvPillText, { color: uvCol }]}>{day.max_uv.toFixed(1)}</Text>
      </View>

      <View style={dayStyles.cloudRow}>
        <Cloud size={12} color="#64748B" />
        <Text style={dayStyles.cloudText}>{Math.round(day.cloud_cover_pct)}%</Text>
      </View>

      <View style={dayStyles.windowCol}>
        {day.best_window_start ? (
          <Text style={dayStyles.windowText}>
            {formatWindowTime(day.best_window_start)}–{formatWindowTime(day.best_window_end)}
          </Text>
        ) : (
          <Text style={dayStyles.noWindow}>No window</Text>
        )}
      </View>
    </View>
  );
}

const dayStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
    gap: 10,
  },
  dateCol: { width: 90 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },
  date: { fontSize: 11, color: '#64748B', marginTop: 2 },
  uvPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
  },
  uvPillText: { fontSize: 13, fontWeight: '700' },
  cloudRow: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 44 },
  cloudText: { fontSize: 12, color: '#64748B' },
  windowCol: { flex: 1, alignItems: 'flex-end' },
  windowText: { fontSize: 12, color: '#F1F5F9' },
  noWindow: { fontSize: 12, color: '#64748B' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedText: { fontSize: 12, color: '#64748B' },
});

// ============================================
// Main Screen
// ============================================
export default function ForecastScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const { data: forecast, isLoading, isError, refetch } = useQuery<DailyForecast[]>({
    queryKey: ['forecast', coords?.lat, coords?.lng],
    queryFn: () =>
      coords ? fetchUVForecast(coords.lat, coords.lng) : Promise.resolve([]),
    enabled: !!coords,
    staleTime: 1000 * 60 * APP_CONFIG.FORECAST.CACHE_MINUTES,
  });

  const today = forecast?.[0];
  const futureDays = forecast?.slice(1) ?? [];

  const handleUpgrade = () => {
    router.push('/paywall');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>UV Forecast</Text>
        <Text style={styles.subtitle}>
          {coords ? 'Your location' : 'Enable location for local forecast'}
        </Text>
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Fetching forecast...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorState}>
          <Sun size={40} color="#334155" />
          <Text style={styles.errorTitle}>Forecast unavailable</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Today's Hourly Chart */}
          {today && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Today — Hourly UV</Text>
                <Text style={styles.cardSubtitle}>Max {today.max_uv.toFixed(1)}</Text>
              </View>
              <HourlyChart hours={today.forecast_hours} />
            </View>
          )}

          {/* 7-Day Forecast — Pro Gated */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>7-Day Forecast</Text>
              {!isPro && (
                <TouchableOpacity
                  style={styles.proTag}
                  onPress={handleUpgrade}
                >
                  <Lock size={11} color="#F97316" />
                  <Text style={styles.proTagText}>Pro</Text>
                  <ChevronRight size={11} color="#F97316" />
                </TouchableOpacity>
              )}
            </View>

            {/* Column headers */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colHeader, { width: 90 }]}>Day</Text>
              <Text style={[styles.colHeader, { width: 46 }]}>UV</Text>
              <Text style={[styles.colHeader, { width: 44 }]}>Cloud</Text>
              <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Best Window</Text>
            </View>

            {futureDays.slice(0, 6).map((day, i) => (
              <DayRow
                key={day.date}
                day={day}
                isPro={isPro || i === 0}
                onUpgrade={handleUpgrade}
              />
            ))}

            {!isPro && (
              <TouchableOpacity
                style={styles.upgradePrompt}
                onPress={handleUpgrade}
                activeOpacity={0.85}
              >
                <Lock size={16} color="white" />
                <Text style={styles.upgradeText}>Unlock 7-Day Forecast — Go Pro</Text>
                <ChevronRight size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
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
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 3 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748B' },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorTitle: { fontSize: 16, color: '#64748B' },
  retryBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#F97316', fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardSubtitle: { fontSize: 12, color: '#64748B' },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F9731611',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proTagText: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
    gap: 10,
  },
  colHeader: { fontSize: 11, color: '#475569', fontWeight: '600', textTransform: 'uppercase' },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  upgradeText: { fontSize: 14, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },
});

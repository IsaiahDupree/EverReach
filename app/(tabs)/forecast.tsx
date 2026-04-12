import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { Cloud, Sun, Zap, ChevronRight } from 'lucide-react-native';
import { fetchUVForecast } from '@/services/openMeteo';
import { getUVCategory } from '@/services/uvCalculations';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { UVForecast, UVForecastDay, UVForecastHour } from '@/types/suntrace';
import { useSubscription } from '@/hooks/useSubscription';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_MAX_HEIGHT = 80;
const HOURLY_BAR_WIDTH = Math.floor((SCREEN_WIDTH - 64) / 12);

export default function ForecastScreen() {
  const [forecast, setForecast] = useState<UVForecast | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const { isPro } = useSubscription();

  const loadForecast = useCallback(async () => {
    let lat = 40.7128, lon = -74.006;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
    } catch {}
    const fc = await fetchUVForecast(lat, lon, 7);
    setForecast(fc);
  }, []);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadForecast();
    setRefreshing(false);
  }, [loadForecast]);

  const today = forecast?.days[0];
  const selectedDayData = forecast?.days[selectedDay];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SUNTRACE_COLORS.primary} />}
    >
      <Text style={styles.title}>UV Forecast</Text>

      {/* Today's hourly chart */}
      {today && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today — Hourly UV</Text>
          <HourlyChart hours={today.hours} />
        </View>
      )}

      {/* 7-day summary (Pro gated) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>
          {!isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
        {forecast?.days.map((day, i) => (
          <DayRow
            key={day.date}
            day={day}
            index={i}
            selected={selectedDay === i}
            onPress={() => setSelectedDay(i)}
            locked={!isPro && i > 0}
          />
        ))}
      </View>

      {/* Selected day detail */}
      {selectedDayData && (isPro || selectedDay === 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {formatDate(selectedDayData.date)} — Detail
          </Text>
          {selectedDayData.best_window_start && (
            <View style={styles.bestWindow}>
              <Zap size={16} color={SUNTRACE_COLORS.primary} />
              <Text style={styles.bestWindowText}>
                Best window: {formatTime(selectedDayData.best_window_start)} –{' '}
                {formatTime(selectedDayData.best_window_end ?? selectedDayData.best_window_start)}
              </Text>
            </View>
          )}
          <View style={styles.dayDetailRow}>
            <DetailStat label="Peak UV" value={selectedDayData.max_uv_index.toFixed(1)} color={getUVCategory(selectedDayData.max_uv_index).color} />
            <DetailStat label="Cloud Cover" value={`${selectedDayData.avg_cloud_cover}%`} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function HourlyChart({ hours }: { hours: UVForecastHour[] }) {
  // Show business hours (6am-8pm, 15 bars)
  const dayHours = hours.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 6 && hr <= 20;
  });
  const maxUV = Math.max(...dayHours.map(h => h.uv_index), 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.hourlyChart}>
        {dayHours.map(h => {
          const height = Math.max(4, (h.uv_index / maxUV) * BAR_MAX_HEIGHT);
          const cat = getUVCategory(h.uv_index);
          const hour = new Date(h.time).getHours();
          return (
            <View key={h.time} style={styles.hourlyBarCol}>
              <View style={[styles.hourlyBar, { height, backgroundColor: cat.color }]} />
              <Text style={styles.hourlyLabel}>
                {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function DayRow({ day, index, selected, onPress, locked }: {
  day: UVForecastDay; index: number; selected: boolean;
  onPress: () => void; locked: boolean;
}) {
  const cat = getUVCategory(day.max_uv_index);
  return (
    <TouchableOpacity
      style={[styles.dayRow, selected && styles.dayRowSelected, locked && styles.dayRowLocked]}
      onPress={onPress}
      disabled={locked}
    >
      <Text style={[styles.dayName, locked && styles.lockedText]}>
        {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatDate(day.date)}
      </Text>
      <View style={styles.dayMid}>
        <Cloud size={14} color={SUNTRACE_COLORS.textSecondary} />
        <Text style={[styles.cloudPct, locked && styles.lockedText]}>{day.avg_cloud_cover}%</Text>
      </View>
      <View style={[styles.uvPill, { backgroundColor: cat.color + '33' }]}>
        <Text style={[styles.uvPillText, { color: cat.color }]}>
          {locked ? '—' : `UV ${day.max_uv_index.toFixed(1)}`}
        </Text>
      </View>
      {locked && <View style={styles.lockIcon}><Text style={styles.lockText}>🔒</Text></View>}
    </TouchableOpacity>
  );
}

function DetailStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={styles.detailStatLabel}>{label}</Text>
      <Text style={[styles.detailStatValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgDark },
  content: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary, marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary, marginBottom: 12 },
  proBadge: { backgroundColor: SUNTRACE_COLORS.primary, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  proText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  hourlyChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: 8, paddingHorizontal: 4, height: BAR_MAX_HEIGHT + 40 },
  hourlyBarCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  hourlyBar: { width: 24, borderRadius: 4 },
  hourlyLabel: { fontSize: 9, color: SUNTRACE_COLORS.textSecondary },
  dayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  dayRowSelected: { borderWidth: 1, borderColor: SUNTRACE_COLORS.primary },
  dayRowLocked: { opacity: 0.5 },
  dayName: { flex: 1, fontSize: 15, fontWeight: '600', color: SUNTRACE_COLORS.textPrimary },
  dayMid: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cloudPct: { fontSize: 13, color: SUNTRACE_COLORS.textSecondary },
  uvPill: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  uvPillText: { fontSize: 13, fontWeight: '700' },
  lockIcon: { marginLeft: 4 },
  lockText: { fontSize: 14 },
  lockedText: { color: SUNTRACE_COLORS.textSecondary },
  bestWindow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1c1006', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  bestWindowText: { fontSize: 14, color: SUNTRACE_COLORS.primary, fontWeight: '600' },
  dayDetailRow: { flexDirection: 'row', gap: 12 },
  detailStat: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgCard, borderRadius: 12, padding: 16, alignItems: 'center' },
  detailStatLabel: { fontSize: 11, color: SUNTRACE_COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
  detailStatValue: { fontSize: 22, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary },
});

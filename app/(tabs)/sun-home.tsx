import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sun, Flame, Zap, Clock } from 'lucide-react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import { getProfile, getTodayStats, getSessions, getWeekStats } from '@/services/suntraceApi';
import { fetchUVForecast } from '@/services/openMeteo';
import { getUVCategory } from '@/services/uvCalculations';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { UserProfile, DailyStats, UVForecast, SunSession } from '@/types/suntrace';
import { useSunTracker, SimulationMode, ActivityType } from '@/hooks/useSunTracker';
import { useDailyDose } from '@/hooks/useDailyDose';
import { getDoseBand } from '@/utils/doseBand';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RING_SIZE = SCREEN_WIDTH * 0.55;
const RING_STROKE = 18;

// ============================================
// UV Dose Score Ring — hero component
// ============================================
function UVDoseRing({
  doseScore,
  daylightMinutes,
  goalDose = 100,
  size = RING_SIZE,
}: {
  doseScore: number;
  daylightMinutes: number;
  goalDose?: number;
  size?: number;
}) {
  const stroke = RING_STROKE;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(doseScore / Math.max(goalDose, 1), 1);
  const dashOffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);
  const goalReached = progress >= 1;

  const band = getDoseBand(doseScore);
  const arcColor = band.color;

  const doseLabel = Math.round(doseScore * 10) / 10;

  const dayHrs = Math.floor(daylightMinutes / 60);
  const dayMins = Math.round(daylightMinutes % 60);
  const daylightLabel = dayHrs > 0 ? `${dayHrs}h ${dayMins}m` : `${Math.round(daylightMinutes)}m`;

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke="#1E293B"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Filled arc */}
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke={arcColor}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${cx}, ${cx}`}
      />
      {/* Dose score value */}
      <SvgText
        x={cx}
        y={cx - 12}
        textAnchor="middle"
        fill={SUNTRACE_COLORS.textPrimary}
        fontSize="36"
        fontWeight="700"
      >
        {doseLabel}
      </SvgText>
      {/* Label */}
      <SvgText
        x={cx}
        y={cx + 14}
        textAnchor="middle"
        fill={SUNTRACE_COLORS.textSecondary}
        fontSize="13"
      >
        {band.label}
      </SvgText>
      {/* Secondary metric: daylight minutes */}
      <SvgText
        x={cx}
        y={cx + 34}
        textAnchor="middle"
        fill={arcColor}
        fontSize="12"
        fontWeight="600"
      >
        {daylightLabel} outside
      </SvgText>
    </Svg>
  );
}

// ============================================
// 7-Day Sunlight Bar Chart
// ============================================
function WeeklyChart({ weekData }: { weekData: Array<{ label: string; minutes: number; isToday: boolean }> }) {
  const maxMins = Math.max(...weekData.map(d => d.minutes), 30);
  const barWidth = (SCREEN_WIDTH - 64) / 7;
  const chartHeight = 80;

  return (
    <View style={chartStyles.container}>
      <Svg width={SCREEN_WIDTH - 40} height={chartHeight + 28}>
        {weekData.map((day, i) => {
          const barH = Math.max((day.minutes / maxMins) * chartHeight, day.minutes > 0 ? 4 : 0);
          const x = i * barWidth + barWidth / 2 - 10;
          const y = chartHeight - barH;
          const color = day.isToday ? SUNTRACE_COLORS.primary : (day.minutes > 0 ? '#334155' : '#1E293B');

          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={20}
                height={Math.max(barH, 2)}
                rx={6}
                fill={color}
              />
              {day.isToday && day.minutes > 0 && (
                <SvgText
                  x={x + 10}
                  y={y - 5}
                  textAnchor="middle"
                  fill={SUNTRACE_COLORS.primary}
                  fontSize="10"
                  fontWeight="600"
                >
                  {day.minutes}m
                </SvgText>
              )}
              <SvgText
                x={x + 10}
                y={chartHeight + 18}
                textAnchor="middle"
                fill={day.isToday ? SUNTRACE_COLORS.primary : SUNTRACE_COLORS.textSecondary}
                fontSize="11"
                fontWeight={day.isToday ? '700' : '400'}
              >
                {day.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
});

// ============================================
// Passive Tracking Status Indicator
// ============================================
function TrackingStatus({ isOutdoors, status, liveSeconds, currentUV, speed, activityType }: {
  isOutdoors: boolean;
  status: string;
  liveSeconds: number;
  currentUV: number;
  speed: number;
  activityType: ActivityType;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOutdoors) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOutdoors]);

  const dotColor = isOutdoors
    ? SUNTRACE_COLORS.accent
    : activityType === 'in_vehicle' ? '#F59E0B' : '#475569';

  const label = status === 'tracking'
    ? 'Tracking outdoor sunlight'
    : status === 'saving'
    ? 'Saving session…'
    : status === 'in_vehicle'
    ? 'In vehicle — not tracking'
    : status === 'no_uv'
    ? 'No UV detected'
    : 'Low UV — not tracking';

  const liveMins = Math.floor(liveSeconds / 60);
  const liveSecs = liveSeconds % 60;
  const liveLabel = liveSeconds > 0
    ? `+${liveMins > 0 ? `${liveMins}m ` : ''}${liveSecs}s this window`
    : null;

  // Live dose accumulation (DE-029): estimate accumulating dose per second
  const liveDosePerSecond = currentUV * 0.8 * 1.0 * 0.75 * 0.45; // UV × conf × cloud × exposure × protection
  const estimatedLiveDose = (liveSeconds * liveDosePerSecond) / 60; // convert to per-minute basis
  const liveDoseLabel = isOutdoors && liveSeconds > 0
    ? ` (+${Math.round(estimatedLiveDose * 10) / 10} pts)`
    : null;

  const subInfo = activityType === 'in_vehicle'
    ? `Moving at ${speed.toFixed(0)} m/s — car glass blocks UV`
    : activityType === 'indoors'
    ? 'UV 0 — indoors or night'
    : !isOutdoors && currentUV > 0
    ? `UV ${currentUV.toFixed(1)} — below 1.0 threshold`
    : null;

  const labelColor = isOutdoors
    ? SUNTRACE_COLORS.accent
    : activityType === 'in_vehicle' ? '#F59E0B' : '#64748B';

  return (
    <View style={trackStyles.container}>
      <View style={trackStyles.dotWrap}>
        <Animated.View style={[
          trackStyles.dotOuter,
          { backgroundColor: dotColor + '33', transform: [{ scale: pulseAnim }] },
        ]} />
        <View style={[trackStyles.dotInner, { backgroundColor: dotColor }]} />
      </View>
      <View style={trackStyles.textWrap}>
        <Text style={[trackStyles.label, { color: labelColor }]}>
          {label}{liveDoseLabel}
        </Text>
        {liveLabel && <Text style={trackStyles.sublabel}>{liveLabel}</Text>}
        {subInfo && <Text style={trackStyles.sublabel}>{subInfo}</Text>}
      </View>
    </View>
  );
}

// ============================================
// Simulation Scenario Panel
// ============================================
const SCENARIOS: Array<{
  mode: SimulationMode;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
}> = [
  { mode: 'outside',    label: 'Outside',   sublabel: 'UV 4.5 · 0.8 m/s',  icon: '☀️', color: SUNTRACE_COLORS.accent },
  { mode: 'in_vehicle', label: 'In Car',    sublabel: 'UV 2.5 · 15 m/s',   icon: '🚗', color: '#F59E0B' },
  { mode: 'indoors',    label: 'Indoors',   sublabel: 'UV 0 · stationary',  icon: '🏠', color: '#475569' },
];

function SimulationPanel({ current, onSelect }: {
  current: SimulationMode;
  onSelect: (mode: SimulationMode) => void;
}) {
  return (
    <View style={simStyles.wrapper}>
      <Text style={simStyles.header}>Simulate Scenario</Text>
      <View style={simStyles.row}>
        {SCENARIOS.map(s => {
          const active = current === s.mode;
          return (
            <TouchableOpacity
              key={s.mode}
              style={[simStyles.card, active && { borderColor: s.color, backgroundColor: s.color + '18' }]}
              onPress={() => onSelect(active ? 'none' : s.mode)}
              activeOpacity={0.75}
            >
              <Text style={simStyles.icon}>{s.icon}</Text>
              <Text style={[simStyles.cardLabel, { color: active ? s.color : SUNTRACE_COLORS.textPrimary }]}>
                {s.label}
              </Text>
              <Text style={simStyles.cardSub}>{s.sublabel}</Text>
              {active && (
                <View style={[simStyles.activeDot, { backgroundColor: s.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {current !== 'none' && (
        <TouchableOpacity onPress={() => onSelect('none')}>
          <Text style={simStyles.clearBtn}>✕ Clear simulation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const simStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  clearBtn: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
});

const trackStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  dotWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOuter: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 12,
    color: '#64748B',
  },
});

// ============================================
// Main Home Screen
// ============================================
export default function SunHomeScreen() {
  const router = useRouter();
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('none');
  const tracker = useSunTracker(simulationMode);
  const dailyDose = useDailyDose();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [forecast, setForecast] = useState<UVForecast | null>(null);
  const [recentSessions, setRecentSessions] = useState<SunSession[]>([]);
  const [weekStats, setWeekStats] = useState<DailyStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, stats, sessions] = await Promise.all([
        getProfile(),
        getTodayStats(),
        getSessions(5),
      ]);
      setProfile(p);
      setTodayStats(stats);
      setRecentSessions(sessions);

      try {
        const week = await getWeekStats();
        setWeekStats(week);
      } catch {}

      // Best UV window only (currentUV comes from tracker)
      let lat = 40.7128, lon = -74.006;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch {}
      try {
        const fc = await fetchUVForecast(lat, lon, 7);
        setForecast(fc);
      } catch {}
    } catch (err) {
      console.error('Home load error:', err);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), tracker.refreshTodayStats()]);
    setRefreshing(false);
  }, [loadData, tracker.refreshTodayStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live values from passive tracker take priority
  const minutesToday = tracker.todayMinutes;
  const currentUV = tracker.currentUV;
  const goalDose = profile?.daily_d_target_iu ?? 100; // Use as proxy for dose target
  const streak = profile?.streak_count ?? 0;
  const sessionCount = dailyDose.sessionCount;
  const uvCat = getUVCategory(currentUV);
  const bestWindowStart = forecast?.days[0]?.best_window_start;
  const weekChartData = buildWeekChartData(weekStats);

  function formatBestWindow(start: string | null | undefined): string {
    if (!start) return 'Check back for UV window';
    const d = new Date(start);
    return `Best UV window: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={SUNTRACE_COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good{getTimeOfDay()}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.streakBadge}>
          <Flame size={18} color="#f97316" />
          <Text style={styles.streakCount}>{streak}</Text>
        </View>
      </View>

      {/* Hero: UV Dose Score Ring */}
      <View style={styles.heroCard}>
        <View style={styles.ringWrapper}>
          <UVDoseRing
            doseScore={dailyDose.uvDoseScore}
            daylightMinutes={dailyDose.daylightMinutes}
            goalDose={goalDose}
          />
        </View>
        {/* Quick stat pills below ring */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Sun size={14} color={SUNTRACE_COLORS.primary} />
            <Text style={styles.pillText}>{sessionCount} session{sessionCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.pill}>
            <Flame size={14} color="#f97316" />
            <Text style={styles.pillText}>{Math.round(dailyDose.daylightMinutes)}m light</Text>
          </View>
          <View style={styles.pill}>
            <View style={[styles.uvDot, { backgroundColor: uvCat.color }]} />
            <Text style={styles.pillText}>UV {currentUV.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Passive tracking status */}
      <TrackingStatus
        isOutdoors={tracker.isOutdoors}
        status={tracker.status}
        liveSeconds={tracker.liveSeconds}
        currentUV={currentUV}
        speed={tracker.speed}
        activityType={tracker.activityType}
      />

      {/* Simulation panel */}
      <SimulationPanel current={simulationMode} onSelect={setSimulationMode} />

      {/* Best UV window */}
      {bestWindowStart && (
        <View style={[styles.windowBanner, { backgroundColor: uvCat.bgColor + '26' }]}>
          <Zap size={15} color={uvCat.color} />
          <Text style={[styles.windowText, { color: uvCat.color }]}>
            {formatBestWindow(bestWindowStart)}
          </Text>
        </View>
      )}

      {/* Weekly sunlight chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <Text style={styles.sectionSubtitle}>Minutes of outdoor sunlight</Text>
        <WeeklyChart weekData={weekChartData} />
      </View>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/logbook')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.slice(0, 3).map(session => (
            <SessionRow key={session.id} session={session} />
          ))}
        </View>
      )}

      {recentSessions.length === 0 && (
        <View style={styles.emptyState}>
          <Sun size={40} color={SUNTRACE_COLORS.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>Waiting for outdoor sunlight</Text>
          <Text style={styles.emptySubtitle}>SunTrace is passively tracking. Head outside and your time will be recorded automatically.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================
// Session Row
// ============================================
function SessionRow({ session }: { session: SunSession }) {
  const cat = getUVCategory(session.uv_index_avg);
  const date = new Date(session.started_at);
  const hrs = Math.floor(session.duration_minutes / 60);
  const mins = Math.round(session.duration_minutes % 60);
  const durationLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionIconWrap}>
        <Clock size={18} color={SUNTRACE_COLORS.primary} />
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionTopRow}>
          <Text style={styles.sessionDuration}>{durationLabel} outside</Text>
          <View style={[styles.sessionRiskBadge, { backgroundColor: cat.bgColor + '33' }]}>
            <Text style={[styles.sessionRiskText, { color: cat.color }]}>
              {session.burn_risk_level.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.sessionMeta}>
          {date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ·{' '}
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · UV {session.uv_index_avg.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// Helpers
// ============================================
function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return ' morning';
  if (h < 17) return ' afternoon';
  return ' evening';
}

function buildWeekChartData(
  weekStats: DailyStats[]
): Array<{ label: string; minutes: number; isToday: boolean }> {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const stat = weekStats.find(s => s.date === dateStr);
    result.push({
      label: days[d.getDay()],
      minutes: stat?.total_minutes ?? 0,
      isToday: i === 0,
    });
  }

  return result;
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgDark,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
  },
  date: {
    fontSize: 14,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1c1006',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  streakCount: {
    color: '#f97316',
    fontWeight: '700',
    fontSize: 16,
  },
  heroCard: {
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 24,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  ringWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pillText: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    fontWeight: '500',
  },
  uvDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  windowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: SUNTRACE_COLORS.primary,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  sessionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SUNTRACE_COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionDuration: {
    fontSize: 15,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
  },
  sessionMeta: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
  },
  sessionRiskBadge: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  sessionRiskText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

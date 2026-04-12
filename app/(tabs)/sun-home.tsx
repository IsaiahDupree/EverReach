import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sun, Flame, Play, MapPin, TrendingUp, Zap } from 'lucide-react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import { getProfile, getTodayStats, getSessions } from '@/services/suntraceApi';
import { fetchUVForecast } from '@/services/openMeteo';
import { getUVCategory, SKIN_TYPE_DATA } from '@/services/uvCalculations';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { UserProfile, DailyStats, UVForecast, SunSession } from '@/types/suntrace';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_SIZE = SCREEN_WIDTH * 0.65;
const GAUGE_STROKE = 16;

// ============================================
// UV Gauge Arc Component
// ============================================
function UVGauge({ uvIndex, size = GAUGE_SIZE }: { uvIndex: number; size?: number }) {
  const category = getUVCategory(uvIndex);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - GAUGE_STROKE * 2) / 2;
  const startAngle = -210; // degrees
  const endAngle = 30;
  const totalAngle = endAngle - startAngle; // 240 degrees
  const clampedUV = Math.min(Math.max(uvIndex, 0), 12);
  const progress = clampedUV / 12;

  function polarToCartesian(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(startDeg: number, endDeg: number) {
    const start = polarToCartesian(startDeg, r);
    const end = polarToCartesian(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? '1' : '0';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  const trackPath = describeArc(startAngle, endAngle);
  const filledEndAngle = startAngle + totalAngle * progress;
  const fillPath = progress > 0 ? describeArc(startAngle, filledEndAngle) : '';

  return (
    <Svg width={size} height={size}>
      {/* Track */}
      <Path
        d={trackPath}
        stroke="#1E293B"
        strokeWidth={GAUGE_STROKE}
        fill="none"
        strokeLinecap="round"
      />
      {/* Filled arc */}
      {fillPath ? (
        <Path
          d={fillPath}
          stroke={category.color}
          strokeWidth={GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {/* Center text */}
      <SvgText
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill={SUNTRACE_COLORS.textPrimary}
        fontSize="42"
        fontWeight="700"
      >
        {uvIndex.toFixed(1)}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        fill={category.color}
        fontSize="16"
        fontWeight="600"
      >
        {category.label}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 36}
        textAnchor="middle"
        fill={SUNTRACE_COLORS.textSecondary}
        fontSize="12"
      >
        UV Index
      </SvgText>
    </Svg>
  );
}

// ============================================
// Goal Ring Component (circular progress)
// ============================================
function GoalRing({
  earned,
  target,
  size = 80,
}: {
  earned: number;
  target: number;
  size?: number;
}) {
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(earned / Math.max(target, 1), 1);
  const dashOffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);
  const color = progress >= 1 ? SUNTRACE_COLORS.accent : SUNTRACE_COLORS.primary;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke="#1E293B"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${cx}, ${cx}`}
      />
      <SvgText
        x={cx}
        y={cx + 5}
        textAnchor="middle"
        fill={SUNTRACE_COLORS.textPrimary}
        fontSize="14"
        fontWeight="700"
      >
        {pct}%
      </SvgText>
    </Svg>
  );
}

// ============================================
// Main Home Screen
// ============================================
export default function SunHomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [forecast, setForecast] = useState<UVForecast | null>(null);
  const [recentSessions, setRecentSessions] = useState<SunSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSession, setActiveSession] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      // Load profile
      const p = await getProfile();
      setProfile(p);

      // Load today stats
      const stats = await getTodayStats();
      setTodayStats(stats);

      // Load recent sessions
      const sessions = await getSessions(5);
      setRecentSessions(sessions);

      // Fetch UV forecast using device location
      let lat = 40.7128, lon = -74.006; // default: NYC
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
    } catch (err) {
      console.error('Home load error:', err);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentUV = forecast?.current_uv ?? 0;
  const uvCat = getUVCategory(currentUV);
  const dEarned = todayStats?.total_d_earned_iu ?? 0;
  const dTarget = profile?.daily_d_target_iu ?? 1500;
  const streak = profile?.streak_count ?? 0;
  const todayForecast = forecast?.days[0];
  const bestWindowStart = todayForecast?.best_window_start;

  function formatBestWindow(start: string | null | undefined): string {
    if (!start) return 'No UV window today';
    const d = new Date(start);
    return `Best window: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

      {/* UV Gauge */}
      <View style={styles.gaugeContainer}>
        <UVGauge uvIndex={currentUV} />
      </View>

      {/* Best window */}
      <View style={[styles.windowBanner, { backgroundColor: uvCat.bgColor + '33' }]}>
        <Zap size={16} color={uvCat.color} />
        <Text style={[styles.windowText, { color: uvCat.color }]}>
          {formatBestWindow(bestWindowStart)}
        </Text>
      </View>

      {/* Active session banner */}
      {activeSession && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => router.push('/session')}
        >
          <View style={styles.activePulse} />
          <Text style={styles.activeBannerText}>Session in progress — tap to view</Text>
        </TouchableOpacity>
      )}

      {/* Start Session CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/session')}
      >
        <Play size={22} color="#fff" fill="#fff" />
        <Text style={styles.ctaText}>Start Sun Session</Text>
      </TouchableOpacity>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* Daily goal ring */}
        <View style={styles.statCard}>
          <GoalRing earned={dEarned} target={dTarget} size={80} />
          <Text style={styles.statLabel}>Daily D Goal</Text>
          <Text style={styles.statValue}>
            {dEarned.toLocaleString()} / {dTarget.toLocaleString()} IU
          </Text>
        </View>

        {/* Streak */}
        <View style={styles.statCard}>
          <View style={styles.streakLargeIcon}>
            <Flame size={40} color="#f97316" />
          </View>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>{streak} days</Text>
        </View>

        {/* Sessions today */}
        <View style={styles.statCard}>
          <View style={styles.streakLargeIcon}>
            <Sun size={40} color={SUNTRACE_COLORS.primary} />
          </View>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>
            {todayStats?.session_count ?? 0} session{todayStats?.session_count !== 1 ? 's' : ''}
          </Text>
        </View>
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
    </ScrollView>
  );
}

function SessionRow({ session }: { session: SunSession }) {
  const cat = getUVCategory(session.uv_index_avg);
  const date = new Date(session.started_at);
  return (
    <View style={styles.sessionRow}>
      <View style={[styles.sessionUVDot, { backgroundColor: cat.color }]} />
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionDate}>
          {date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ·{' '}
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.sessionStats}>
          {session.duration_minutes.toFixed(0)} min · UV {session.uv_index_avg.toFixed(1)} · {session.d_earned_iu.toLocaleString()} IU
        </Text>
      </View>
      <View style={[styles.sessionRiskBadge, { backgroundColor: cat.bgColor + '33' }]}>
        <Text style={[styles.sessionRiskText, { color: cat.color }]}>
          {session.burn_risk_level.replace('_', ' ')}
        </Text>
      </View>
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
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgDark,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
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
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  windowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  windowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#052e16',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SUNTRACE_COLORS.accent,
  },
  activePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SUNTRACE_COLORS.accent,
  },
  activeBannerText: {
    color: SUNTRACE_COLORS.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: SUNTRACE_COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 24,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 11,
    color: SUNTRACE_COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  streakLargeIcon: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    color: SUNTRACE_COLORS.primary,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  sessionUVDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
  },
  sessionStats: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 2,
  },
  sessionRiskBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sessionRiskText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

/**
 * history.tsx
 *
 * Session history screen for today.
 * Shows daily summary (UV Dose Score, Daylight Minutes, Morning Light Minutes).
 * Lists all sessions with their dose scores, modifiers, and time.
 * Tap session to view dose breakdown.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Clock, MoreVertical, TrendingUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { useDailyDose } from '@/hooks/useDailyDose';
import { getDoseBand } from '@/utils/doseBand';
import { DoseBreakdownModal, DoseBreakdownData } from '@/components/DoseBreakdownModal';
import { SessionModifierSheet } from '@/components/SessionModifierSheet';

interface SessionRecord {
  id: string;
  started_at: string;
  duration_minutes: number;
  uv_index_avg: number;
  latitude: number;
  longitude: number;
  uv_dose_score?: number;
  outdoor_confidence?: number;
  motion_type?: string;
  daylight_minutes_effective?: number;
  session_modifiers?: {
    shade_factor: number;
    exposure_factor: number;
    protection_factor: number;
  };
  session_weather?: {
    cloud_cover: number;
    cloud_factor: number;
    sunrise_time: string;
    sunset_time: string;
  };
}

interface SessionWithDetails extends SessionRecord {
  doseScore: number;
  shadeLabel: string;
  exposureLabel: string;
  protectionLabel: string;
}

const SHADE_LABELS: Record<number, string> = {
  1.0: 'Full Sun',
  0.65: 'Partial Sun',
  0.35: 'Open Shade',
  0.15: 'Deep Shade',
};

const EXPOSURE_LABELS: Record<number, string> = {
  0.25: 'Face & Hands',
  0.4: 'Face & Forearms',
  0.6: 'Arms & Legs',
  0.75: 'Shorts & Tee',
  1.0: 'Swimwear',
};

const PROTECTION_LABELS: Record<number, string> = {
  1.0: 'None',
  0.7: 'SPF 15',
  0.45: 'SPF 30',
  0.25: 'SPF 50+',
  0.1: 'Covered',
};

function getLabel(
  value: number,
  labels: Record<number, string>
): string {
  const rounded = Math.round(value * 100) / 100;
  return labels[rounded] || `${rounded.toFixed(2)}x`;
}

interface SelectedSession {
  session: SessionWithDetails;
  breakdownData: DoseBreakdownData;
}

export default function HistoryScreen() {
  const dailyDose = useDailyDose();
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SelectedSession | null>(null);
  const [showModifiers, setShowModifiers] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.user?.id) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: sessionData, error } = await supabase
        .from('sun_sessions')
        .select(
          `
          *,
          session_modifiers(*),
          session_weather(*)
          `
        )
        .eq('user_id', user.user.id)
        .gte('started_at', `${today}T00:00:00`)
        .lte('started_at', `${today}T23:59:59`)
        .order('started_at', { ascending: false });

      if (error) {
        console.warn('[history] Load error:', error);
        return;
      }

      if (sessionData) {
        const withDetails: SessionWithDetails[] = sessionData.map((s) => ({
          ...s,
          doseScore: s.uv_dose_score ?? 0,
          shadeLabel: getLabel(s.session_modifiers?.shade_factor ?? 1.0, SHADE_LABELS),
          exposureLabel: getLabel(
            s.session_modifiers?.exposure_factor ?? 0.75,
            EXPOSURE_LABELS
          ),
          protectionLabel: getLabel(
            s.session_modifiers?.protection_factor ?? 1.0,
            PROTECTION_LABELS
          ),
        }));
        setSessions(withDetails);
      }
    } catch (error) {
      console.warn('[history] Load catch:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadSessions(), dailyDose.refresh()]);
    setRefreshing(false);
  }, [loadSessions, dailyDose]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const band = getDoseBand(dailyDose.uvDoseScore);

  const handleSessionTap = (session: SessionWithDetails) => {
    const breakdownData: DoseBreakdownData = {
      sessionId: session.id,
      durationMinutes: session.duration_minutes,
      uvIndex: session.uv_index_avg,
      cloudCover: session.session_weather?.cloud_cover ?? 100,
      cloudFactor: session.session_weather?.cloud_factor ?? 0.4,
      cloudCondition: getCloudCondition(session.session_weather?.cloud_cover ?? 100),
      outdoorConfidence: session.outdoor_confidence ?? 0.8,
      motionType: (session.motion_type as any) ?? 'unknown',
      shadeFactor: session.session_modifiers?.shade_factor ?? 1.0,
      shadeLabel: session.shadeLabel,
      exposureFactor: session.session_modifiers?.exposure_factor ?? 0.75,
      exposureLabel: session.exposureLabel,
      protectionFactor: session.session_modifiers?.protection_factor ?? 1.0,
      protectionLabel: session.protectionLabel,
      finalDoseScore: session.doseScore,
      sunriseTime: session.session_weather?.sunrise_time,
      sunsetTime: session.session_weather?.sunset_time,
    };
    setSelectedSession({ session, breakdownData });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
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
          <Text style={styles.title}>Session History</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Daily Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: band.bgColor + '30' }]}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryMetric}>
              <Text style={styles.metricLabel}>UV Dose Score</Text>
              <Text style={[styles.metricValue, { color: band.color }]}>
                {Math.round(dailyDose.uvDoseScore * 10) / 10}
              </Text>
              <Text style={[styles.metricStatus, { color: band.color }]}>{band.label}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryMetric}>
              <Text style={styles.metricLabel}>Daylight Minutes</Text>
              <Text style={styles.metricValue}>
                {Math.round(dailyDose.daylightMinutes)}m
              </Text>
              {dailyDose.morningLightMinutes > 0 && (
                <Text style={styles.metricDesc}>
                  {Math.round(dailyDose.morningLightMinutes)}m morning
                </Text>
              )}
            </View>
          </View>
          <View style={styles.summaryFooter}>
            <Text style={styles.summaryFooterText}>
              {dailyDose.sessionCount} session{dailyDose.sessionCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Sessions List */}
        {sessions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sessions Today</Text>
            {sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => handleSessionTap(session)}
              >
                <View style={styles.sessionTime}>
                  <Clock size={16} color={SUNTRACE_COLORS.primary} />
                  <View>
                    <Text style={styles.sessionTimeText}>
                      {new Date(session.started_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.sessionDuration}>
                      {Math.round(session.duration_minutes)} min
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionMetrics}>
                  <View style={styles.metricBadge}>
                    <Text style={styles.metricLabel}>UV</Text>
                    <Text style={styles.metricBadgeValue}>{session.uv_index_avg.toFixed(1)}</Text>
                  </View>
                  <View style={styles.metricBadge}>
                    <TrendingUp size={14} color={SUNTRACE_COLORS.primary} />
                    <Text style={styles.metricBadgeValue}>{Math.round(session.doseScore)}</Text>
                  </View>
                </View>

                <View style={styles.sessionModifiers}>
                  <View style={[styles.modifierBadge, { backgroundColor: '#334155' }]}>
                    <Text style={styles.modifierText}>{session.shadeLabel}</Text>
                  </View>
                  <View style={[styles.modifierBadge, { backgroundColor: '#334155' }]}>
                    <Text style={styles.modifierText}>{session.exposureLabel}</Text>
                  </View>
                  <View style={[styles.modifierBadge, { backgroundColor: '#334155' }]}>
                    <Text style={styles.modifierText}>{session.protectionLabel}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.moreBtn}>
                  <MoreVertical size={18} color={SUNTRACE_COLORS.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Clock size={40} color={SUNTRACE_COLORS.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No sessions recorded today</Text>
            <Text style={styles.emptySubtitle}>
              Head outside to start tracking. Sessions will appear here automatically.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Dose Breakdown Modal */}
      {selectedSession && (
        <DoseBreakdownModal
          visible={!!selectedSession}
          data={selectedSession.breakdownData}
          onClose={() => setSelectedSession(null)}
          onEdit={() => {
            setShowModifiers(true);
          }}
        />
      )}

      {/* Modifier Sheet */}
      {selectedSession && (
        <SessionModifierSheet
          visible={showModifiers}
          outdoorConfidence={selectedSession.session.outdoor_confidence ?? 0.8}
          defaultModifiers={{
            shadeFactor: (Object.keys(SHADE_LABELS).find(
              (k) => SHADE_LABELS[parseFloat(k)] === selectedSession.session.shadeLabel
            ) ?? '1.0') as any,
            exposureFactor: (Object.keys(EXPOSURE_LABELS).find(
              (k) => EXPOSURE_LABELS[parseFloat(k)] === selectedSession.session.exposureLabel
            ) ?? '0.75') as any,
            protectionFactor: (Object.keys(PROTECTION_LABELS).find(
              (k) => PROTECTION_LABELS[parseFloat(k)] === selectedSession.session.protectionLabel
            ) ?? '1.0') as any,
          }}
          onConfirm={async (modifiers) => {
            setShowModifiers(false);
            // TODO: Call PATCH /api/sessions/{id}/modifiers endpoint
            await loadSessions();
          }}
          onDismiss={() => setShowModifiers(false)}
        />
      )}
    </View>
  );
}

function getCloudCondition(cloudCover: number): string {
  if (cloudCover <= 15) return 'Clear skies';
  if (cloudCover <= 40) return 'Partly cloudy';
  if (cloudCover <= 65) return 'Mostly cloudy';
  return 'Overcast';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUNTRACE_COLORS.bgDark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: SUNTRACE_COLORS.textSecondary,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryContent: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  summaryMetric: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: SUNTRACE_COLORS.textSecondary + '40',
  },
  metricLabel: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 2,
  },
  metricStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricDesc: {
    fontSize: 11,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 2,
  },
  summaryFooter: {
    borderTopWidth: 1,
    borderTopColor: SUNTRACE_COLORS.textSecondary + '20',
    paddingTop: 12,
  },
  summaryFooterText: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sessionTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
  },
  sessionDuration: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 2,
  },
  sessionMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  metricBadgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: SUNTRACE_COLORS.primary,
  },
  sessionModifiers: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  modifierBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modifierText: {
    fontSize: 10,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textSecondary,
  },
  moreBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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

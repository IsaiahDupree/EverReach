/**
 * DoseBreakdownModal.tsx
 *
 * Shows full dose math breakdown for a session.
 * Displays all factors (duration, UV, cloud, confidence, shade, skin, protection).
 * Includes edit button to open modifier sheet.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Edit2 } from 'lucide-react-native';
import { MotionType } from '@/services/sunDoseCalculator';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { getDoseBand } from '@/utils/doseBand';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DoseBreakdownData {
  sessionId: string;
  durationMinutes: number;
  uvIndex: number;
  cloudCover: number;
  cloudFactor: number;
  cloudCondition: string; // e.g., "partly cloudy"
  outdoorConfidence: number;
  motionType: MotionType;
  shadeFactor: number;
  shadeLabel: string;
  exposureFactor: number;
  exposureLabel: string;
  protectionFactor: number;
  protectionLabel: string;
  finalDoseScore: number;
  sunriseTime?: string;
  sunsetTime?: string;
}

export interface DoseBreakdownModalProps {
  visible: boolean;
  data: DoseBreakdownData;
  onClose: () => void;
  onEdit?: () => void;
}

const MOTION_LABELS: Record<MotionType, string> = {
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  automotive: 'In Vehicle',
  stationary: 'Stationary',
  unknown: 'Unknown',
};

export function DoseBreakdownModal({
  visible,
  data,
  onClose,
  onEdit,
}: DoseBreakdownModalProps) {
  const band = getDoseBand(data.finalDoseScore);
  const isDaylight = data.sunriseTime && data.sunsetTime;

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '—';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Dose Breakdown</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={SUNTRACE_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Final Score */}
            <View style={[styles.scoreCard, { backgroundColor: band.bgColor + '30' }]}>
              <Text style={styles.scoreLabel}>UV Dose Score</Text>
              <Text style={[styles.scoreValue, { color: band.color }]}>
                {Math.round(data.finalDoseScore * 10) / 10}
              </Text>
              <Text style={[styles.scoreStatus, { color: band.color }]}>{band.label}</Text>
            </View>

            {/* Session Duration */}
            <View style={styles.section}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Duration</Text>
                <Text style={styles.factorValue}>{Math.round(data.durationMinutes)} min</Text>
              </View>
            </View>

            {/* UV Index */}
            <View style={styles.section}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>UV Index</Text>
                <Text style={styles.factorValue}>{data.uvIndex.toFixed(1)}</Text>
              </View>
              {isDaylight && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Sunrise</Text>
                  <Text style={styles.timeValue}>{formatTime(data.sunriseTime)}</Text>
                  <Text style={styles.timeSeparator}>—</Text>
                  <Text style={styles.timeLabel}>Sunset</Text>
                  <Text style={styles.timeValue}>{formatTime(data.sunsetTime)}</Text>
                </View>
              )}
            </View>

            {/* Cloud Cover */}
            <View style={styles.section}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Cloud Cover</Text>
                <View style={styles.factorDetail}>
                  <Text style={styles.factorValue}>{data.cloudFactor.toFixed(2)}x</Text>
                  <Text style={styles.factorDesc}>({data.cloudCover}% cloud)</Text>
                </View>
              </View>
              <Text style={styles.conditionText}>{data.cloudCondition}</Text>
            </View>

            {/* Outdoor Confidence */}
            <View style={styles.section}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Outdoor Confidence</Text>
                <View style={styles.factorDetail}>
                  <Text style={styles.factorValue}>{data.outdoorConfidence.toFixed(2)}x</Text>
                  <Text style={styles.factorDesc}>({Math.round(data.outdoorConfidence * 100)}%)</Text>
                </View>
              </View>
              <Text style={styles.conditionText}>{MOTION_LABELS[data.motionType]}</Text>
            </View>

            {/* Shade Factor */}
            <View style={styles.section}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Shade</Text>
                <View style={styles.factorDetail}>
                  <Text style={styles.factorValue}>{data.shadeFactor.toFixed(2)}x</Text>
                  <Text style={styles.factorDesc}>{data.shadeLabel}</Text>
                </View>
              </View>
            </View>

            {/* Exposure Factor */}
            <View style={styles.section}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Skin Exposure</Text>
                <View style={styles.factorDetail}>
                  <Text style={styles.factorValue}>{data.exposureFactor.toFixed(2)}x</Text>
                  <Text style={styles.factorDesc}>{data.exposureLabel}</Text>
                </View>
              </View>
            </View>

            {/* Protection Factor */}
            <View style={[styles.section, styles.lastSection]}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Sunscreen</Text>
                <View style={styles.factorDetail}>
                  <Text style={styles.factorValue}>{data.protectionFactor.toFixed(2)}x</Text>
                  <Text style={styles.factorDesc}>{data.protectionLabel}</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Formula */}
            <View style={styles.formulaSection}>
              <Text style={styles.formulaLabel}>Formula</Text>
              <Text style={styles.formulaText}>
                {Math.round(data.durationMinutes)} × {data.uvIndex.toFixed(1)} × {data.outdoorConfidence.toFixed(2)} × {data.cloudFactor.toFixed(2)} × {data.shadeFactor.toFixed(2)} × {data.exposureFactor.toFixed(2)} × {data.protectionFactor.toFixed(2)} = {Math.round(data.finalDoseScore * 10) / 10}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          {onEdit && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEdit}
              >
                <Edit2 size={16} color={SUNTRACE_COLORS.primary} />
                <Text style={styles.editButtonText}>Edit Modifiers</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scoreCard: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  lastSection: {
    marginBottom: 8,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
  },
  factorValue: {
    fontSize: 15,
    fontWeight: '700',
    color: SUNTRACE_COLORS.primary,
  },
  factorDetail: {
    alignItems: 'flex-end',
  },
  factorDesc: {
    fontSize: 11,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 2,
  },
  conditionText: {
    fontSize: 12,
    color: SUNTRACE_COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  timeLabel: {
    fontSize: 11,
    color: SUNTRACE_COLORS.textSecondary,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
  },
  timeSeparator: {
    color: SUNTRACE_COLORS.textSecondary,
    marginHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 16,
  },
  formulaSection: {
    marginBottom: 16,
  },
  formulaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textSecondary,
    marginBottom: 8,
  },
  formulaText: {
    fontSize: 11,
    color: SUNTRACE_COLORS.textSecondary,
    fontFamily: 'Courier',
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUNTRACE_COLORS.primary + '20',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SUNTRACE_COLORS.primary,
  },
});

/**
 * SessionModifierSheet.tsx
 *
 * Bottom sheet that appears after a session is saved.
 * Allows user to set shade, skin exposure, and sunscreen protection modifiers.
 * Shows outdoor confidence level and allows user to confirm/dismiss.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import {
  SHADE_FACTORS,
  EXPOSURE_FACTORS,
  PROTECTION_FACTORS,
  ShadeFactor,
  ExposureFactor,
  ProtectionFactor,
} from '@/services/sunDoseCalculator';
import { SUNTRACE_COLORS } from '@/constants/suntrace';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

export interface SessionModifiers {
  shadeFactor: ShadeFactor;
  exposureFactor: ExposureFactor;
  protectionFactor: ProtectionFactor;
}

export interface SessionModifierSheetProps {
  visible: boolean;
  outdoorConfidence: number;
  onConfirm: (modifiers: SessionModifiers) => void;
  onDismiss: () => void;
  defaultModifiers?: SessionModifiers;
}

const SHADE_OPTIONS: Array<{ key: ShadeFactor; label: string; icon: string }> = [
  { key: 'full_sun', label: 'Full Sun', icon: '☀️' },
  { key: 'partial_sun', label: 'Partial Sun', icon: '⛅' },
  { key: 'open_shade', label: 'Open Shade', icon: '🌳' },
  { key: 'deep_shade', label: 'Deep Shade', icon: '🌲' },
];

const EXPOSURE_OPTIONS: Array<{ key: ExposureFactor; label: string; icon: string }> = [
  { key: 'face_hands', label: 'Face & Hands', icon: '👤' },
  { key: 'face_forearms', label: 'Face & Forearms', icon: '👕' },
  { key: 'arms_legs', label: 'Arms & Legs', icon: '🩳' },
  { key: 'shorts_tshirt', label: 'Shorts & Tee', icon: '👕' },
  { key: 'swimwear', label: 'Swimwear', icon: '🩱' },
];

const PROTECTION_OPTIONS: Array<{ key: ProtectionFactor; label: string; icon: string }> = [
  { key: 'none', label: 'None', icon: '✗' },
  { key: 'spf_15', label: 'SPF 15', icon: '🧴' },
  { key: 'spf_30', label: 'SPF 30', icon: '🧴' },
  { key: 'spf_50', label: 'SPF 50+', icon: '🧴' },
  { key: 'covered', label: 'Covered', icon: '👔' },
];

export function SessionModifierSheet({
  visible,
  outdoorConfidence,
  onConfirm,
  onDismiss,
  defaultModifiers = {
    shadeFactor: 'full_sun',
    exposureFactor: 'shorts_tshirt',
    protectionFactor: 'none',
  },
}: SessionModifierSheetProps) {
  const [shade, setShade] = useState<ShadeFactor>(defaultModifiers.shadeFactor);
  const [exposure, setExposure] = useState<ExposureFactor>(defaultModifiers.exposureFactor);
  const [protection, setProtection] = useState<ProtectionFactor>(defaultModifiers.protectionFactor);

  const handleConfirm = () => {
    onConfirm({ shadeFactor: shade, exposureFactor: exposure, protectionFactor: protection });
  };

  const confidencePct = Math.round(outdoorConfidence * 100);
  const confidenceColor =
    outdoorConfidence >= 0.8 ? '#10b981' : outdoorConfidence >= 0.6 ? '#f59e0b' : '#ef4444';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Session Details</Text>
            <TouchableOpacity onPress={onDismiss}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
            {/* Confidence Bar */}
            <View style={styles.section}>
              <Text style={styles.label}>Outdoor Confidence</Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${confidencePct}%`,
                      backgroundColor: confidenceColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                {confidencePct}% confident you were outside
              </Text>
            </View>

            {/* Shade Factor */}
            <View style={styles.section}>
              <Text style={styles.label}>Shade Level</Text>
              <View style={styles.optionGrid}>
                {SHADE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionButton,
                      shade === opt.key && styles.optionButtonActive,
                    ]}
                    onPress={() => setShade(opt.key)}
                  >
                    <Text style={styles.optionIcon}>{opt.icon}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        shade === opt.key && styles.optionLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionValue,
                        shade === opt.key && styles.optionValueActive,
                      ]}
                    >
                      {SHADE_FACTORS[opt.key].toFixed(2)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Exposure Factor */}
            <View style={styles.section}>
              <Text style={styles.label}>Skin Exposure</Text>
              <View style={styles.optionGrid}>
                {EXPOSURE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionButton,
                      exposure === opt.key && styles.optionButtonActive,
                    ]}
                    onPress={() => setExposure(opt.key)}
                  >
                    <Text style={styles.optionIcon}>{opt.icon}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        exposure === opt.key && styles.optionLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionValue,
                        exposure === opt.key && styles.optionValueActive,
                      ]}
                    >
                      {EXPOSURE_FACTORS[opt.key].toFixed(2)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Protection Factor */}
            <View style={styles.section}>
              <Text style={styles.label}>Sunscreen Protection</Text>
              <View style={styles.optionGrid}>
                {PROTECTION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionButton,
                      protection === opt.key && styles.optionButtonActive,
                    ]}
                    onPress={() => setProtection(opt.key)}
                  >
                    <Text style={styles.optionIcon}>{opt.icon}</Text>
                    <Text
                      style={[
                        styles.optionLabel,
                        protection === opt.key && styles.optionLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionValue,
                        protection === opt.key && styles.optionValueActive,
                      ]}
                    >
                      {PROTECTION_FACTORS[opt.key].toFixed(2)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SUNTRACE_COLORS.textPrimary,
  },
  closeBtn: {
    fontSize: 24,
    color: SUNTRACE_COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textPrimary,
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: SUNTRACE_COLORS.primary + '20',
    borderColor: SUNTRACE_COLORS.primary,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textSecondary,
    textAlign: 'center',
  },
  optionLabelActive: {
    color: SUNTRACE_COLORS.primary,
  },
  optionValue: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  optionValueActive: {
    color: SUNTRACE_COLORS.primary,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: SUNTRACE_COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SUNTRACE_COLORS.primary,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});

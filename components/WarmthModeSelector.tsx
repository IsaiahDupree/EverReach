import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Clock, Zap, Wind, Beaker } from 'lucide-react-native';
import { apiFetch } from '@/lib/api';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useWarmth } from '@/providers/WarmthProvider';
import { SHOW_DEV_SETTINGS } from '@/config/dev';

export type WarmthMode = 'slow' | 'medium' | 'fast' | 'test';

interface WarmthModeSelectorProps {
  contactId: string;
  contactName?: string;
  currentMode?: WarmthMode | null;
  currentScore?: number;
  onModeChange?: (mode: WarmthMode, newScore: number) => void;
}

const ALL_MODES = [
  { 
    value: 'slow' as WarmthMode, 
    label: 'Slow', 
    Icon: Clock, 
    description: '~30 days',
    color: '#60A5FA',
    devOnly: false,
  },
  { 
    value: 'medium' as WarmthMode, 
    label: 'Medium', 
    Icon: Wind, 
    description: '~14 days',
    color: '#F59E0B',
    devOnly: false,
  },
  { 
    value: 'fast' as WarmthMode, 
    label: 'Fast', 
    Icon: Zap, 
    description: '~7 days',
    color: '#EF4444',
    devOnly: false,
  },
  { 
    value: 'test' as WarmthMode, 
    label: 'Test', 
    Icon: Beaker, 
    description: '~12 hours',
    color: '#8B5CF6',
    devOnly: true,
  },
];

export function WarmthModeSelector({
  contactId,
  contactName,
  currentMode,
  currentScore = 0,
  onModeChange,
}: WarmthModeSelectorProps) {
  const { theme, devFeaturesEnabled } = useAppSettings();
  const { setWarmth, refreshSingle } = useWarmth();
  const [selectedMode, setSelectedMode] = useState<WarmthMode | null>(currentMode ?? null);
  const [loading, setLoading] = useState(false);

  // Sync selectedMode with currentMode prop when it changes
  React.useEffect(() => {
    setSelectedMode(currentMode ?? null);
  }, [currentMode]);

  // Filter modes based on dev features setting AND environment variable
  // Test mode only shows when BOTH the env var is true AND dev features are enabled
  const MODES = useMemo(() => {
    return ALL_MODES.filter(mode => !mode.devOnly || (SHOW_DEV_SETTINGS && devFeaturesEnabled));
  }, [devFeaturesEnabled]);

  async function handleModeChange(mode: WarmthMode) {
    // Skip if mode hasn't changed
    if (mode === selectedMode) {
      console.log('[WarmthModeSelector] Mode unchanged, skipping API call');
      return;
    }

    // CRITICAL: Prevent duplicate calls while already updating
    if (loading) {
      console.log('[WarmthModeSelector] Already updating, skipping duplicate call');
      return;
    }

    // For create flow, do not call backend; update local state only
    if (contactId === 'new') {
      setSelectedMode(mode);
      onModeChange?.(mode, currentScore ?? 0);
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch(`/api/v1/contacts/${contactId}/warmth/mode`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update mode');
      }

      const data = await response.json();
      
      setSelectedMode(mode);
      
      // Update WarmthProvider cache immediately
      setWarmth(contactId, data.score_after);
      
      // ✅ NEW: Force refresh warmth after mode change to ensure score reflects new decay rate
      try {
        console.log('[WarmthModeSelector] Force refreshing warmth after mode change');
        await refreshSingle(contactId, { force: true, source: 'warmth-mode-change' });
      } catch (refreshErr) {
        console.error('[WarmthModeSelector] Failed to refresh warmth after mode change:', refreshErr);
        // Non-blocking error, mode change still succeeded
      }
      
      // Notify parent component
      onModeChange?.(mode, data.score_after);

      // Show feedback
      const modeLabel = MODES.find(m => m.value === mode)?.label || mode;
      Alert.alert(
        'Warmth Mode Updated',
        `${contactName || 'Contact'}'s warmth mode is now ${modeLabel}.\nScore changed: ${data.score_before} → ${data.score_after}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('[WarmthModeSelector] Failed to update warmth mode:', error);
      Alert.alert(
        'Update Failed',
        'Could not update warmth mode. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }

  const styles = createStyles(theme.colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Warmth Cadence</Text>
        <Text style={styles.subtitle}>How often should you reach out?</Text>
      </View>

      <View style={styles.modeButtons}>
        {MODES.map((mode) => {
          const isActive = selectedMode === mode.value;
          const Icon = mode.Icon;

          return (
            <TouchableOpacity
              key={mode.value}
              style={[
                styles.modeButton,
                isActive && { ...styles.modeButtonActive, borderColor: mode.color },
              ]}
              onPress={() => handleModeChange(mode.value)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Icon 
                size={24} 
                color={isActive ? mode.color : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.modeLabel,
                isActive && { ...styles.modeLabelActive, color: mode.color },
              ]}>
                {mode.label}
              </Text>
              <Text style={styles.modeDescription}>{mode.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modeLabelActive: {
    fontWeight: '700',
  },
  modeDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

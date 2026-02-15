import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CrossPlatformTextInput from '@/components/CrossPlatformTextInput';
import { Stack, router } from 'expo-router';
import { RotateCcw, Save } from 'lucide-react-native';
import { useWarmthSettings } from '@/providers/WarmthSettingsProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { createCommonStyles } from '@/constants/themedStyles';

export default function WarmthSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const common = createCommonStyles(theme);
  const styles = useMemo(() => createThemedStyles(theme), [theme]);
  const { settings, updateSettings, resetToDefaults } = useWarmthSettings();
  
  const [hotThreshold, setHotThreshold] = useState(settings.hotThreshold.toString());
  const [warmThreshold, setWarmThreshold] = useState(settings.warmThreshold.toString());
  const [coolThreshold, setCoolThreshold] = useState(settings.coolThreshold.toString());
  const [defaultWarmth, setDefaultWarmth] = useState(settings.defaultWarmthForNewLeads.toString());

  const handleSave = async () => {
    const hot = parseInt(hotThreshold);
    const warm = parseInt(warmThreshold);
    const cool = parseInt(coolThreshold);
    const defaultVal = parseInt(defaultWarmth);

    // Validation
    if (isNaN(hot) || isNaN(warm) || isNaN(cool) || isNaN(defaultVal)) {
      console.warn('Invalid Input: Please enter valid numbers for all thresholds.');
      return;
    }

    if (hot <= warm || warm <= cool || cool < 0) {
      console.warn('Invalid Thresholds: Thresholds must be in descending order: Hot > Warm > Cool ≥ 0');
      return;
    }

    if (defaultVal < 0 || defaultVal > 100) {
      console.warn('Invalid Default: Default warmth must be between 0 and 100.');
      return;
    }

    try {
      await updateSettings({
        hotThreshold: hot,
        warmThreshold: warm,
        coolThreshold: cool,
        defaultWarmthForNewLeads: defaultVal,
      });
      
      console.log('Settings Saved: Warmth settings have been updated successfully.');
      router.back();
    } catch {
      console.error('Error: Failed to save settings. Please try again.');
    }
  };

  const handleReset = async () => {
    // Reset to defaults
    await resetToDefaults();
    setHotThreshold('80');
    setWarmThreshold('60');
    setCoolThreshold('20');
    setDefaultWarmth('30');
    console.log('Reset Complete: Settings have been reset to defaults.');
  };

  const getStatusColor = (threshold: number) => {
    if (threshold >= settings.hotThreshold) return '#FF6B6B';
    if (threshold >= settings.warmThreshold) return '#FFB366';
    if (threshold >= settings.coolThreshold) return '#4ECDC4';
    return '#95A5A6';
  };

  return (
    <View style={[common.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Warmth Settings',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Save size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Warmth Thresholds</Text>
          <Text style={styles.sectionDescription}>
            Set the score thresholds that determine when contacts are classified as hot, warm, cool, or cold.
          </Text>
          
          <View style={styles.sectionContent}>
            <View style={styles.thresholdItem}>
              <View style={styles.thresholdLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.thresholdLabel}>Hot Threshold</Text>
              </View>
              <CrossPlatformTextInput
                style={styles.thresholdInput}
                value={hotThreshold}
                onChangeText={setHotThreshold}
                keyboardType="numeric"
                placeholder="60"
              />
            </View>
            
            <View style={[styles.thresholdItem, styles.thresholdItemBorder]}>
              <View style={styles.thresholdLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#FFB366' }]} />
                <Text style={styles.thresholdLabel}>Warm Threshold</Text>
              </View>
              <CrossPlatformTextInput
                style={styles.thresholdInput}
                value={warmThreshold}
                onChangeText={setWarmThreshold}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
            
            <View style={[styles.thresholdItem, styles.thresholdItemBorder]}>
              <View style={styles.thresholdLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#4ECDC4' }]} />
                <Text style={styles.thresholdLabel}>Cool Threshold</Text>
              </View>
              <CrossPlatformTextInput
                style={styles.thresholdInput}
                value={coolThreshold}
                onChangeText={setCoolThreshold}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Lead Settings</Text>
          <Text style={styles.sectionDescription}>
            Set the default warmth score for newly added contacts.
          </Text>
          
          <View style={styles.sectionContent}>
            <View style={styles.thresholdItem}>
              <View style={styles.thresholdLeft}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(parseInt(defaultWarmth) || 30) }]} />
                <Text style={styles.thresholdLabel}>Default Warmth for New Leads</Text>
              </View>
              <CrossPlatformTextInput
                style={styles.thresholdInput}
                value={defaultWarmth}
                onChangeText={setDefaultWarmth}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Warmth Scoring Works</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.helpText}>
              <Text style={styles.boldText}>Time-Based Decay System:</Text>{'\n'}
              Warmth scores automatically decrease over time since your last interaction with each contact. The system uses an exponential decay formula:{'\n\n'}
              
              <Text style={styles.boldText}>Score = 100 × e^(-days_since_contact / cadence_days)</Text>{'\n\n'}
              
              <Text style={styles.boldText}>How it works:</Text>{'\n'}
              • Fresh contacts start at 100 (or your default setting){'\n'}
              • Score decays exponentially based on days since last contact{'\n'}
              • Each contact&apos;s &quot;cadence days&quot; acts as the decay rate{'\n'}
              • Shorter cadence = faster decay (more urgent follow-up){'\n'}
              • Longer cadence = slower decay (less frequent contact needed){'\n\n'}
              
              <Text style={styles.boldText}>Status Classification:</Text>{'\n'}
              • 🔥 Hot: Score ≥ {settings.hotThreshold} (recent/active contacts){'\n'}
              • 🟡 Warm: Score ≥ {settings.warmThreshold} (moderate follow-up needed){'\n'}
              • 🔵 Cool: Score ≥ {settings.coolThreshold} (follow-up overdue){'\n'}
              • ❄️ Cold: Score {'<'} {settings.coolThreshold} (long overdue){'\n\n'}
              
              <Text style={styles.boldText}>Example:</Text>{'\n'}
              A contact with 30-day cadence will drop to ~37 points after 30 days, ~14 points after 60 days, and ~5 points after 90 days without contact.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <RotateCcw size={20} color={theme.colors.error} />
          <Text style={styles.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createThemedStyles = (theme: any) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  saveButton: {
    padding: 4,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase' as const,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden' as const,
  },
  thresholdItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
  },
  thresholdItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
  },
  thresholdLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.md,
  },
  thresholdLabel: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.text,
    flex: 1,
  },
  thresholdInput: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.text,
    textAlign: 'right' as const,
    minWidth: 60,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  helpText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    padding: theme.spacing.lg,
  },
  resetButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xxl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  resetText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.error,
  },
  boldText: {
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text,
  },
});
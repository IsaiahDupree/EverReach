import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,

  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { RotateCcw, Save } from 'lucide-react-native';
import { useWarmthSettings } from '@/providers/WarmthSettingsProvider';

export default function WarmthSettingsScreen() {
  const insets = useSafeAreaInsets();
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
    setHotThreshold('60');
    setWarmThreshold('30');
    setCoolThreshold('10');
    setDefaultWarmth('50');
    console.log('Reset Complete: Settings have been reset to defaults.');
  };

  const getStatusColor = (threshold: number) => {
    if (threshold >= settings.hotThreshold) return '#FF6B6B';
    if (threshold >= settings.warmThreshold) return '#FFB366';
    if (threshold >= settings.coolThreshold) return '#4ECDC4';
    return '#95A5A6';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Warmth Settings',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Save size={20} color="#007AFF" />
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
              <TextInput
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
              <TextInput
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
              <TextInput
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
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(parseInt(defaultWarmth) || 50) }]} />
                <Text style={styles.thresholdLabel}>Default Warmth for New Leads</Text>
              </View>
              <TextInput
                style={styles.thresholdInput}
                value={defaultWarmth}
                onChangeText={setDefaultWarmth}
                keyboardType="numeric"
                placeholder="50"
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
          <RotateCcw size={20} color="#FF6B6B" />
          <Text style={styles.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  saveButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 16,
    marginBottom: 8,
    lineHeight: 20,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thresholdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  thresholdItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
  },
  thresholdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  thresholdLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  thresholdInput: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'right',
    minWidth: 60,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    padding: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  boldText: {
    fontWeight: '600',
    color: '#333333',
  },
});
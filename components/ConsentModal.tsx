/**
 * Consent Modal
 * 
 * Privacy-first consent UI for analytics tracking.
 * Separates ATT (cross-app tracking) from analytics consent.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Shield, BarChart, Bug, Zap } from 'lucide-react-native';
import { useTracking } from '@/providers/TrackingProvider';

interface ConsentModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ConsentModal({ visible, onClose }: ConsentModalProps) {
  const { consent, updateConsent, requestATT } = useTracking();
  
  const [analytics, setAnalytics] = useState(consent?.analytics || false);
  const [crashReporting, setCrashReporting] = useState(consent?.crashReporting || false);
  const [performance, setPerformance] = useState(consent?.performance || false);

  const handleSave = async () => {
    await updateConsent({
      analytics,
      crashReporting,
      performance,
    });
    
    // If user consented to analytics and we're on iOS, optionally ask for ATT
    if (analytics && Platform.OS === 'ios' && consent?.attStatus === 'not-determined') {
      // Show explanation first, then request
      // For now, we'll skip ATT since we don't need IDFA for first-party analytics
    }
    
    onClose();
  };

  const handleAcceptAll = async () => {
    await updateConsent({
      analytics: true,
      crashReporting: true,
      performance: true,
    });
    onClose();
  };

  const handleRejectAll = async () => {
    await updateConsent({
      analytics: false,
      crashReporting: false,
      performance: false,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Shield size={32} color="#3B82F6" />
            <Text style={styles.title}>Your Privacy</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Intro */}
          <Text style={styles.intro}>
            We respect your privacy. Choose what data you're comfortable sharing to help us improve EverReach.
          </Text>

          {/* Privacy Note */}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>🔒 Privacy-First</Text>
            <Text style={styles.noteText}>
              All analytics are first-party only. We never sell your data or track you across other apps.
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {/* Analytics */}
            <View style={styles.option}>
              <View style={styles.optionHeader}>
                <View style={styles.optionIcon}>
                  <BarChart size={20} color="#3B82F6" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Product Analytics</Text>
                  <Text style={styles.optionDescription}>
                    Help us understand how you use EverReach to improve features and fix bugs
                  </Text>
                  <Text style={styles.optionDetails}>
                    • Screen views and navigation
                    • Feature usage and engagement
                    • A/B test participation
                  </Text>
                </View>
                <Switch
                  value={analytics}
                  onValueChange={setAnalytics}
                  trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                  thumbColor={analytics ? '#3B82F6' : '#F3F4F6'}
                />
              </View>
            </View>

            {/* Crash Reporting */}
            <View style={styles.option}>
              <View style={styles.optionHeader}>
                <View style={styles.optionIcon}>
                  <Bug size={20} color="#EF4444" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Crash Reporting</Text>
                  <Text style={styles.optionDescription}>
                    Automatically report crashes so we can fix them quickly
                  </Text>
                  <Text style={styles.optionDetails}>
                    • Error logs and stack traces
                    • Device info (model, OS version)
                    • App version and build number
                  </Text>
                </View>
                <Switch
                  value={crashReporting}
                  onValueChange={setCrashReporting}
                  trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
                  thumbColor={crashReporting ? '#EF4444' : '#F3F4F6'}
                />
              </View>
            </View>

            {/* Performance */}
            <View style={styles.option}>
              <View style={styles.optionHeader}>
                <View style={styles.optionIcon}>
                  <Zap size={20} color="#F59E0B" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Performance Monitoring</Text>
                  <Text style={styles.optionDescription}>
                    Track app speed and responsiveness to optimize performance
                  </Text>
                  <Text style={styles.optionDetails}>
                    • Screen load times
                    • Network request duration
                    • Memory usage patterns
                  </Text>
                </View>
                <Switch
                  value={performance}
                  onValueChange={setPerformance}
                  trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
                  thumbColor={performance ? '#F59E0B' : '#F3F4F6'}
                />
              </View>
            </View>
          </View>

          {/* ATT Info (iOS only) */}
          {Platform.OS === 'ios' && (
            <View style={styles.attBox}>
              <Text style={styles.attTitle}>About "Ask App Not to Track"</Text>
              <Text style={styles.attText}>
                Apple's tracking prompt is separate from our analytics. We don't use IDFA or track you across other apps, so you can safely choose either option.
              </Text>
              <Text style={styles.attText}>
                Current status: <Text style={styles.attStatus}>{consent?.attStatus || 'not-determined'}</Text>
              </Text>
            </View>
          )}

          {/* Privacy Policy Link */}
          <TouchableOpacity style={styles.privacyLink}>
            <Text style={styles.privacyLinkText}>
              Read our full Privacy Policy →
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleRejectAll}
          >
            <Text style={styles.buttonSecondaryText}>Reject All</Text>
          </TouchableOpacity>

          <View style={styles.footerRight}>
            <TouchableOpacity
              style={[styles.button, styles.buttonTertiary]}
              onPress={handleSave}
            >
              <Text style={styles.buttonTertiaryText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleAcceptAll}
            >
              <Text style={styles.buttonPrimaryText}>Accept All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  intro: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  noteBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  optionsList: {
    gap: 16,
    marginBottom: 24,
  },
  option: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  optionDetails: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  attBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  attTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  attText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 8,
  },
  attStatus: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  privacyLink: {
    alignItems: 'center',
    padding: 12,
  },
  privacyLinkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  buttonSecondaryText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTertiary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonTertiaryText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});

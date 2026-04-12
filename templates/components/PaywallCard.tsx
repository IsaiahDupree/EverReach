/**
 * SunTrace — PaywallCard
 *
 * Full paywall UI component used on the /paywall screen.
 *
 * Shows:
 *   - "SunTrace Pro" header with sun icon
 *   - 7-day free trial CTA: "$3.99/mo after"
 *   - Feature list with orange checkmarks
 *   - "Start Free Trial" primary button
 *   - Annual option: "$29.99/yr — 2 months free"
 *   - "Restore Purchase" text button
 *   - Terms & Privacy links
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Sun, Check } from 'lucide-react-native';

// ── Constants ─────────────────────────────────────────────────────────────────

const BG = '#0F172A';
const CARD = '#1E293B';
const TEXT = '#F1F5F9';
const MUTED = '#64748B';
const ORANGE = '#F97316';
const BORDER = '#334155';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaywallCardProps {
  onStartTrial: () => void;
  onRestore: () => void;
  isLoading?: boolean;
}

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES = [
  '7-day UV forecast',
  'AI Sunlight Coach',
  'Trip Sun Planner',
  'Advanced analytics',
  'Ad-free experience',
] as const;

// ── FeatureRow ────────────────────────────────────────────────────────────────

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={featureStyles.row}>
      <View style={featureStyles.checkCircle}>
        <Check size={13} color={ORANGE} strokeWidth={2.5} />
      </View>
      <Text style={featureStyles.label}>{label}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ORANGE + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    color: TEXT,
    fontWeight: '500',
  },
});

// ── PaywallCard ───────────────────────────────────────────────────────────────

export function PaywallCard({ onStartTrial, onRestore, isLoading = false }: PaywallCardProps) {
  const handleTerms = () => {
    Alert.alert('Terms of Service', 'Visit suntrace.app/terms to read our terms.');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy Policy', 'Visit suntrace.app/privacy to read our privacy policy.');
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.sunIconWrap}>
          <Sun size={36} color={ORANGE} />
        </View>
        <Text style={styles.appName}>SunTrace Pro</Text>
        <Text style={styles.tagline}>Your personal UV & Vitamin D coach</Text>
      </View>

      {/* Trial banner */}
      <View style={styles.trialBanner}>
        <Text style={styles.trialTitle}>7 days free</Text>
        <Text style={styles.trialSubtitle}>Then $3.99/month · Cancel anytime</Text>
      </View>

      {/* Features */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Everything in Pro:</Text>
        {FEATURES.map((f) => (
          <FeatureRow key={f} label={f} />
        ))}
      </View>

      {/* Annual option */}
      <TouchableOpacity style={styles.annualRow} activeOpacity={0.75}>
        <View style={styles.annualBadge}>
          <Text style={styles.annualBadgeText}>BEST VALUE</Text>
        </View>
        <View style={styles.annualInfo}>
          <Text style={styles.annualPrice}>$29.99/yr</Text>
          <Text style={styles.annualSavings}>2 months free vs monthly</Text>
        </View>
        <View style={styles.annualCheck} />
      </TouchableOpacity>

      {/* Start Free Trial CTA */}
      <TouchableOpacity
        style={[styles.trialButton, isLoading && styles.trialButtonDisabled]}
        onPress={onStartTrial}
        activeOpacity={0.85}
        disabled={isLoading}
        testID="start-trial-button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.trialButtonText}>Start Free Trial</Text>
            <Text style={styles.trialButtonSub}>No charge for 7 days</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={onRestore}
        activeOpacity={0.7}
        disabled={isLoading}
        testID="restore-button"
      >
        <Text style={styles.restoreText}>Restore Purchase</Text>
      </TouchableOpacity>

      {/* Legal links */}
      <View style={styles.legalRow}>
        <TouchableOpacity onPress={handleTerms} activeOpacity={0.7}>
          <Text style={styles.legalLink}>Terms</Text>
        </TouchableOpacity>
        <Text style={styles.legalSep}>·</Text>
        <TouchableOpacity onPress={handlePrivacy} activeOpacity={0.7}>
          <Text style={styles.legalLink}>Privacy</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.legalNote}>
        Subscription auto-renews at the end of the trial period. Cancel anytime in App Store settings.
      </Text>
    </ScrollView>
  );
}

export default PaywallCard;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 8,
    alignItems: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sunIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ORANGE + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ORANGE + '44',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
  },
  trialBanner: {
    backgroundColor: ORANGE + '15',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ORANGE + '44',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  trialTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ORANGE,
    marginBottom: 4,
  },
  trialSubtitle: {
    fontSize: 14,
    color: MUTED,
  },
  featuresCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  annualRow: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  annualBadge: {
    backgroundColor: ORANGE,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  annualBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  annualInfo: {
    flex: 1,
  },
  annualPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  annualSavings: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  annualCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ORANGE,
  },
  trialButton: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: 'white',
  },
  trialButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  legalLink: {
    fontSize: 12,
    color: MUTED,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 12,
    color: BORDER,
  },
  legalNote: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },
});

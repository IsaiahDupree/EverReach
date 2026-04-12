/**
 * SunTrace — ProGate
 *
 * Renders children when the user has a Pro (or Family) subscription.
 * Shows a paywall nudge card with a semi-transparent overlay when on the free tier.
 *
 * Reads subscription state from useSubscription hook.
 * An optional `tier` prop can override the hook value (useful for previews/tests).
 *
 * Usage:
 *   <ProGate feature="7-day forecast">
 *     <ForecastScreen />
 *   </ProGate>
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useSubscription } from '@/hooks/useSubscription';

// ── Types ──────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'family';

export interface ProGateProps {
  /** Feature name shown in the paywall nudge (e.g. "7-day forecast") */
  feature?: string;
  /** Content to render when user has Pro/Family entitlement */
  children: React.ReactNode;
  /** Optional tier override — bypasses hook (useful for Storybook / tests) */
  tier?: SubscriptionTier;
  /** Optional override for the paywall nudge component */
  paywallNudge?: React.ReactNode;
}

// ── Default paywall nudge ─────────────────────────────────────────────────────

function DefaultPaywallNudge({ feature }: { feature?: string }) {
  const router = useRouter();

  return (
    <View style={styles.overlayContainer} testID="paywall-nudge">
      {/* Semi-transparent backdrop */}
      <View style={styles.backdrop} />

      <View style={styles.nudgeCard}>
        <View style={styles.lockIcon}>
          <Lock size={28} color="#F97316" />
        </View>

        <Text style={styles.nudgeTitle}>
          {feature ? `Unlock ${feature} with Pro` : 'Pro Feature'}
        </Text>

        <Text style={styles.nudgeBody}>
          Upgrade to SunTrace Pro to access{' '}
          {feature ?? 'this feature'} and personalized UV coaching.
        </Text>

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.85}
          testID="upgrade-button"
        >
          <Text style={styles.upgradeText}>Try Pro Free</Text>
        </TouchableOpacity>

        <Text style={styles.trialNote}>7 days free · Cancel anytime</Text>
      </View>
    </View>
  );
}

// ── ProGate ───────────────────────────────────────────────────────────────────

export function ProGate({ feature, children, tier: tierOverride, paywallNudge }: ProGateProps) {
  const { isPro } = useSubscription();

  // Allow a prop override (e.g. for preview screens or tests)
  const hasProAccess = tierOverride
    ? tierOverride === 'pro' || tierOverride === 'family'
    : isPro;

  if (hasProAccess) {
    return <>{children}</>;
  }

  return paywallNudge ? (
    <>{paywallNudge}</>
  ) : (
    <DefaultPaywallNudge feature={feature} />
  );
}

export default ProGate;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  nudgeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
    marginHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  nudgeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 10,
  },
  nudgeBody: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  trialNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
});

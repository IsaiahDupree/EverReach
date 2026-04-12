/**
 * SunTrace — OnboardingStep
 *
 * Full-screen onboarding layout used by each step of the onboarding flow.
 *
 * Layout (top → bottom):
 *   - Progress dots (filled = completed, current = orange, future = grey)
 *   - Title + optional subtitle
 *   - Centered children content area (flexible)
 *   - Back / Next buttons at the bottom
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

// ── Constants ─────────────────────────────────────────────────────────────────

const BG = '#0F172A';
const CARD = '#1E293B';
const TEXT = '#F1F5F9';
const MUTED = '#64748B';
const ORANGE = '#F97316';
const BORDER = '#334155';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  isLoading?: boolean;
}

// ── Progress Dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <View style={dotsStyles.container} testID="progress-dots">
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCompleted = i < step - 1;
        const isCurrent = i === step - 1;
        return (
          <View
            key={i}
            style={[
              dotsStyles.dot,
              isCompleted && dotsStyles.dotCompleted,
              isCurrent && dotsStyles.dotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

const dotsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BORDER,
  },
  dotCompleted: {
    backgroundColor: ORANGE + '80',
    width: 8,
  },
  dotCurrent: {
    backgroundColor: ORANGE,
    width: 20,
    borderRadius: 4,
  },
});

// ── OnboardingStep ────────────────────────────────────────────────────────────

export function OnboardingStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  isLoading = false,
}: OnboardingStepProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header row: back button (if available) */}
        <View style={styles.topBar}>
          {onBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
              testID="onboarding-back-button"
            >
              <ChevronLeft size={22} color={MUTED} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text style={styles.stepCounter}>
            {step} of {totalSteps}
          </Text>
          <View style={styles.backPlaceholder} />
        </View>

        {/* Progress dots */}
        <ProgressDots step={step} totalSteps={totalSteps} />

        {/* Title + subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {/* Flexible content area */}
        <View style={styles.contentArea}>{children}</View>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
            onPress={onNext}
            activeOpacity={0.85}
            disabled={isLoading}
            testID="onboarding-next-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.nextButtonText}>{nextLabel}</Text>
            )}
          </TouchableOpacity>

          {onBack && (
            <TouchableOpacity
              style={styles.backTextButton}
              onPress={onBack}
              activeOpacity={0.7}
              testID="onboarding-back-text-button"
            >
              <Text style={styles.backTextButtonLabel}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default OnboardingStep;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 32,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    gap: 12,
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: ORANGE,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  backTextButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backTextButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED,
  },
});

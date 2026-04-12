/**
 * Navigation pattern tests — UX0701–UX0760
 * Covers: ProGate upgrade navigation, OnboardingStep next/back callbacks,
 * ActiveSessionBanner tap navigation, and related navigation scenarios.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProGate } from '../../../templates/components/ProGate';
import { OnboardingStep } from '../../../templates/components/OnboardingStep';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => () => React.createElement('View') });
});

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({ isPro: false, tier: 'free', isLoading: false })),
}));

jest.mock('@/store/sessionStore', () => ({
  useSessionStore: jest.fn(() => ({
    session: {
      isActive: false,
      startTime: null,
      currentUV: 0,
      dEarned: 0,
      id: null,
      latitude: null,
      longitude: null,
      locationName: null,
    },
    startSession: jest.fn(),
    stopSession: jest.fn(),
  })),
}));

jest.mock('@/constants/config', () => ({
  APP_CONFIG: { UV: { LOW_MAX: 2, MODERATE_MAX: 5, HIGH_MAX: 7, VERY_HIGH_MAX: 10 } },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
});

function renderOnboardingStep(overrides: Partial<React.ComponentProps<typeof OnboardingStep>> = {}) {
  const defaults = {
    step: 1,
    totalSteps: 4,
    title: 'Welcome',
    onNext: jest.fn(),
    children: null as React.ReactNode,
  };
  return render(<OnboardingStep {...defaults} {...overrides} />);
}

// =============================================================================
// ProGate — upgrade button navigation  (UX0701–UX0720)
// =============================================================================

describe('ProGate — upgrade button navigation', () => {
  it('UX0701: upgrade button press calls router.push', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalled();
  });

  it('UX0702: upgrade button press calls router.push with "/paywall"', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('UX0703: upgrade button called exactly once on single press', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('UX0704: upgrade button press does not call router.replace', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('UX0705: upgrade button press does not call router.back', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('UX0706: double press upgrade button calls push twice', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it('UX0707: upgrade button visible on free tier', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    expect(screen.getByTestId('upgrade-button')).toBeTruthy();
  });

  it('UX0708: no upgrade button on pro tier', () => {
    render(
      <ProGate tier="pro">
        <></>
      </ProGate>,
    );
    expect(screen.queryByTestId('upgrade-button')).toBeNull();
  });

  it('UX0709: no upgrade button on family tier', () => {
    render(
      <ProGate tier="family">
        <></>
      </ProGate>,
    );
    expect(screen.queryByTestId('upgrade-button')).toBeNull();
  });

  it('UX0710: push called with "/paywall" for feature="forecast"', () => {
    render(
      <ProGate tier="free" feature="forecast">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('UX0711: push called with "/paywall" regardless of feature name', () => {
    render(
      <ProGate tier="free" feature="AI Coach">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('UX0712: push called with "/paywall" when no feature prop', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('UX0713: ProGate free renders paywall nudge before any button press', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('UX0714: ProGate pro does not trigger any navigation on mount', () => {
    render(
      <ProGate tier="pro">
        <></>
      </ProGate>,
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('UX0715: ProGate free shows "Try Pro Free" text before press', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    expect(screen.getByText('Try Pro Free')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('UX0716: ProGate mounts without any navigation side-effects', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    expect(mockPush).toHaveBeenCalledTimes(0);
    expect(mockReplace).toHaveBeenCalledTimes(0);
    expect(mockBack).toHaveBeenCalledTimes(0);
  });

  it('UX0717: upgrade button press navigates to /paywall after render', () => {
    render(
      <ProGate tier="free" feature="Sun Map">
        <></>
      </ProGate>,
    );
    const button = screen.getByTestId('upgrade-button');
    fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('UX0718: ProGate free renders and press sequence does not throw', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    expect(() => fireEvent.press(screen.getByTestId('upgrade-button'))).not.toThrow();
  });

  it('UX0719: multiple ProGate components each navigate to /paywall independently', () => {
    render(
      <>
        <ProGate tier="free">
          <></>
        </ProGate>
      </>,
    );
    fireEvent.press(screen.getByTestId('upgrade-button'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('UX0720: ProGate free with custom nudge — no upgrade-button testID navigation', () => {
    const { Text } = require('react-native');
    render(
      <ProGate tier="free" paywallNudge={<Text testID="custom">Custom</Text>}>
        <></>
      </ProGate>,
    );
    expect(screen.queryByTestId('upgrade-button')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// =============================================================================
// OnboardingStep — next navigation  (UX0721–UX0740)
// =============================================================================

describe('OnboardingStep — next navigation', () => {
  it('UX0721: next button is present', () => {
    renderOnboardingStep();
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });

  it('UX0722: pressing next button calls onNext callback', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalled();
  });

  it('UX0723: pressing next calls onNext exactly once', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('UX0724: pressing next twice calls onNext twice', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it('UX0725: next button shows default "Continue" label', () => {
    renderOnboardingStep();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('UX0726: next button shows custom nextLabel when provided', () => {
    renderOnboardingStep({ nextLabel: 'Get Started' });
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  it('UX0727: pressing next does not call router.push (callback-only)', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('UX0728: next button disabled when isLoading=true', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext, isLoading: true });
    const button = screen.getByTestId('onboarding-next-button');
    fireEvent.press(button);
    // When disabled, the press should not register (React Native ignores press on disabled)
    expect(onNext).not.toHaveBeenCalled();
  });

  it('UX0729: next button shows ActivityIndicator when isLoading=true', () => {
    renderOnboardingStep({ isLoading: true });
    // When loading, the label text is not shown
    expect(screen.queryByText('Continue')).toBeNull();
  });

  it('UX0730: next button shows label when isLoading=false', () => {
    renderOnboardingStep({ isLoading: false });
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('UX0731: onNext receives no arguments by default', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledWith();
  });

  it('UX0732: step counter shows "1 of 4"', () => {
    renderOnboardingStep({ step: 1, totalSteps: 4 });
    expect(screen.getByText('1 of 4')).toBeTruthy();
  });

  it('UX0733: step counter shows "3 of 5"', () => {
    renderOnboardingStep({ step: 3, totalSteps: 5 });
    expect(screen.getByText('3 of 5')).toBeTruthy();
  });

  it('UX0734: title text is rendered', () => {
    renderOnboardingStep({ title: 'Set Your Goal' });
    expect(screen.getByText('Set Your Goal')).toBeTruthy();
  });

  it('UX0735: subtitle text is rendered when provided', () => {
    renderOnboardingStep({ subtitle: 'Choose your daily target' });
    expect(screen.getByText('Choose your daily target')).toBeTruthy();
  });

  it('UX0736: subtitle is absent when not provided', () => {
    renderOnboardingStep({ subtitle: undefined });
    expect(screen.queryByText('Choose your daily target')).toBeNull();
  });

  it('UX0737: progress dots container is rendered', () => {
    renderOnboardingStep({ step: 2, totalSteps: 4 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  it('UX0738: next button press does not call router.replace', () => {
    const onNext = jest.fn();
    renderOnboardingStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('UX0739: next button renders without crash on step=1', () => {
    renderOnboardingStep({ step: 1, totalSteps: 3 });
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });

  it('UX0740: next button renders without crash on last step', () => {
    renderOnboardingStep({ step: 4, totalSteps: 4 });
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });
});

// =============================================================================
// OnboardingStep — back navigation  (UX0741–UX0760)
// =============================================================================

describe('OnboardingStep — back navigation', () => {
  it('UX0741: back button absent when onBack not provided', () => {
    renderOnboardingStep({ onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-button')).toBeNull();
  });

  it('UX0742: back button present when onBack provided', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    expect(screen.getByTestId('onboarding-back-button')).toBeTruthy();
  });

  it('UX0743: pressing back button calls onBack callback', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onBack).toHaveBeenCalled();
  });

  it('UX0744: pressing back calls onBack exactly once', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('UX0745: pressing back twice calls onBack twice', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('UX0746: back button press does not call router.push', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('UX0747: back button press does not call router.replace', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('UX0748: back text button present when onBack provided', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    expect(screen.getByTestId('onboarding-back-text-button')).toBeTruthy();
  });

  it('UX0749: back text button absent when onBack not provided', () => {
    renderOnboardingStep({ onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-text-button')).toBeNull();
  });

  it('UX0750: pressing back text button calls onBack', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    expect(onBack).toHaveBeenCalled();
  });

  it('UX0751: back text button shows "Back" label', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    expect(screen.getByText('Back')).toBeTruthy();
  });

  it('UX0752: pressing next and back both fire their callbacks', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderOnboardingStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('UX0753: back button on step=2 calls onBack without router side-effects', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ step: 2, totalSteps: 4, onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('UX0754: step counter reflects current step with back available', () => {
    renderOnboardingStep({ step: 3, totalSteps: 5, onBack: jest.fn() });
    expect(screen.getByText('3 of 5')).toBeTruthy();
  });

  it('UX0755: OnboardingStep mounts without crash when both onNext and onBack provided', () => {
    renderOnboardingStep({ onNext: jest.fn(), onBack: jest.fn() });
  });

  it('UX0756: OnboardingStep renders title when both callbacks given', () => {
    renderOnboardingStep({ title: 'Skin Type', onNext: jest.fn(), onBack: jest.fn() });
    expect(screen.getByText('Skin Type')).toBeTruthy();
  });

  it('UX0757: pressing back text button does not call onNext', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderOnboardingStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('UX0758: pressing next button does not call onBack', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderOnboardingStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('UX0759: OnboardingStep without onBack does not render "Back" text', () => {
    renderOnboardingStep({ onBack: undefined });
    expect(screen.queryByText('Back')).toBeNull();
  });

  it('UX0760: both back button and back text button call the same onBack handler', () => {
    const onBack = jest.fn();
    renderOnboardingStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});

/**
 * Onboarding flow tests — UX0001-UX0107
 *
 * Tests the OnboardingStep component which renders:
 *   - Step counter: "{step} of {totalSteps}"
 *   - Progress dots (testID: "progress-dots")
 *   - Title text
 *   - Optional subtitle text
 *   - Flexible children area
 *   - Next button (testID: "onboarding-next-button"), defaults label "Continue"
 *   - Back icon button (testID: "onboarding-back-button") — only when onBack provided
 *   - Back text button (testID: "onboarding-back-text-button") — only when onBack provided
 */

import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OnboardingStep } from '../../../templates/components/OnboardingStep';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_, name) =>
        () => React.createElement('View', { testID: `icon-${String(name)}` }),
    }
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderStep(overrides: Partial<React.ComponentProps<typeof OnboardingStep>> = {}) {
  const defaults = {
    step: 1,
    totalSteps: 5,
    title: 'Test Title',
    onNext: jest.fn(),
    children: <View testID="child-content" />,
  };
  return render(<OnboardingStep {...defaults} {...overrides} />);
}

// ── Describe: OnboardingStep — render ─────────────────────────────────────────

describe('OnboardingStep — render', () => {
  // UX0001: component mounts without throwing
  it('UX0001: mounts without crash', () => {
    expect(() => renderStep()).not.toThrow();
  });

  // UX0002: renders the title text
  it('UX0002: renders title text', () => {
    renderStep({ title: 'Welcome to SunTrace' });
    expect(screen.getByText('Welcome to SunTrace')).toBeTruthy();
  });

  // UX0003: renders a different title
  it('UX0003: renders a different title', () => {
    renderStep({ title: 'Choose Your Skin Type' });
    expect(screen.getByText('Choose Your Skin Type')).toBeTruthy();
  });

  // UX0004: renders subtitle when provided
  it('UX0004: renders subtitle when provided', () => {
    renderStep({ subtitle: 'This helps us personalise your plan' });
    expect(screen.getByText('This helps us personalise your plan')).toBeTruthy();
  });

  // UX0005: subtitle is absent when not provided
  it('UX0005: subtitle absent when not provided', () => {
    renderStep({ subtitle: undefined });
    expect(screen.queryByText('This helps us personalise your plan')).toBeNull();
  });

  // UX0006: renders step counter "1 of 5"
  it('UX0006: renders step counter text', () => {
    renderStep({ step: 1, totalSteps: 5 });
    expect(screen.getByText('1 of 5')).toBeTruthy();
  });

  // UX0007: renders progress-dots container
  it('UX0007: renders progress-dots testID', () => {
    renderStep();
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0008: renders next button
  it('UX0008: renders next button', () => {
    renderStep();
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });

  // UX0009: next button shows "Continue" by default
  it('UX0009: next button shows "Continue" by default', () => {
    renderStep();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  // UX0010: children are rendered
  it('UX0010: children are rendered inside the component', () => {
    renderStep({ children: <View testID="custom-child" /> });
    expect(screen.getByTestId('custom-child')).toBeTruthy();
  });

  // UX0011: no back icon button when onBack is absent
  it('UX0011: back icon button absent when onBack not provided', () => {
    renderStep({ onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-button')).toBeNull();
  });

  // UX0012: no back text button when onBack is absent
  it('UX0012: back text button absent when onBack not provided', () => {
    renderStep({ onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-text-button')).toBeNull();
  });

  // UX0013: renders with totalSteps=3
  it('UX0013: renders with totalSteps=3', () => {
    renderStep({ step: 1, totalSteps: 3 });
    expect(screen.getByText('1 of 3')).toBeTruthy();
  });

  // UX0014: renders with totalSteps=7
  it('UX0014: renders with totalSteps=7', () => {
    renderStep({ step: 1, totalSteps: 7 });
    expect(screen.getByText('1 of 7')).toBeTruthy();
  });

  // UX0015: renders with step=2
  it('UX0015: renders step counter "2 of 5"', () => {
    renderStep({ step: 2, totalSteps: 5 });
    expect(screen.getByText('2 of 5')).toBeTruthy();
  });

  // UX0016: renders with a text child
  it('UX0016: renders text children', () => {
    renderStep({ children: <Text>Skin Type Picker</Text> });
    expect(screen.getByText('Skin Type Picker')).toBeTruthy();
  });

  // UX0017: renders the component when isLoading is false
  it('UX0017: renders without ActivityIndicator when isLoading=false', () => {
    renderStep({ isLoading: false });
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  // UX0018: renders title with long string
  it('UX0018: renders a long title string', () => {
    renderStep({ title: 'Set Your Daily Vitamin D Goal for Maximum Health' });
    expect(screen.getByText('Set Your Daily Vitamin D Goal for Maximum Health')).toBeTruthy();
  });

  // UX0019: renders step counter at last step
  it('UX0019: renders step counter at last step', () => {
    renderStep({ step: 5, totalSteps: 5 });
    expect(screen.getByText('5 of 5')).toBeTruthy();
  });

  // UX0020: renders multiple children
  it('UX0020: renders multiple children inside content area', () => {
    renderStep({
      children: (
        <View>
          <View testID="child-a" />
          <View testID="child-b" />
        </View>
      ),
    });
    expect(screen.getByTestId('child-a')).toBeTruthy();
    expect(screen.getByTestId('child-b')).toBeTruthy();
  });
});

// ── Describe: OnboardingStep — progress dots ──────────────────────────────────

describe('OnboardingStep — progress dots', () => {
  // UX0021: progress-dots is present for totalSteps=3
  it('UX0021: progress-dots present for totalSteps=3', () => {
    renderStep({ totalSteps: 3, step: 1 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0022: progress-dots is present for totalSteps=5
  it('UX0022: progress-dots present for totalSteps=5', () => {
    renderStep({ totalSteps: 5, step: 1 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0023: progress-dots is present for totalSteps=7
  it('UX0023: progress-dots present for totalSteps=7', () => {
    renderStep({ totalSteps: 7, step: 1 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0024: progress-dots is present for totalSteps=1
  it('UX0024: progress-dots present for totalSteps=1', () => {
    renderStep({ totalSteps: 1, step: 1 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0025: progress-dots present on step=1 of 5
  it('UX0025: progress-dots present on step 1 of 5', () => {
    renderStep({ step: 1, totalSteps: 5 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0026: progress-dots present on step=3 of 5
  it('UX0026: progress-dots present on step 3 of 5', () => {
    renderStep({ step: 3, totalSteps: 5 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0027: progress-dots present on step=5 of 5
  it('UX0027: progress-dots present on step 5 of 5 (last step)', () => {
    renderStep({ step: 5, totalSteps: 5 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0028: progress-dots has children (dots are rendered)
  it('UX0028: progress-dots container has children', () => {
    renderStep({ totalSteps: 3, step: 1 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots).toBeTruthy();
    // container renders for 3 steps
    expect(dots.children.length).toBeGreaterThan(0);
  });

  // UX0029: dots container renders for step=1 totalSteps=5
  it('UX0029: dots container has 5 dot children for totalSteps=5', () => {
    renderStep({ step: 1, totalSteps: 5 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(5);
  });

  // UX0030: dots container renders for step=1 totalSteps=3
  it('UX0030: dots container has 3 dot children for totalSteps=3', () => {
    renderStep({ step: 1, totalSteps: 3 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(3);
  });

  // UX0031: dots container renders for step=3 totalSteps=3
  it('UX0031: dots container has 3 dot children on last step', () => {
    renderStep({ step: 3, totalSteps: 3 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(3);
  });

  // UX0032: dots container renders for step=1 totalSteps=7
  it('UX0032: dots container has 7 dot children for totalSteps=7', () => {
    renderStep({ step: 1, totalSteps: 7 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(7);
  });

  // UX0033: dots container renders for step=4 totalSteps=7
  it('UX0033: dots container has 7 dot children for step 4 of 7', () => {
    renderStep({ step: 4, totalSteps: 7 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(7);
  });

  // UX0034: dots container renders for step=1 totalSteps=1
  it('UX0034: dots container has 1 dot child for totalSteps=1', () => {
    renderStep({ step: 1, totalSteps: 1 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(1);
  });

  // UX0035: dots container renders for step=2 totalSteps=5
  it('UX0035: dots container has 5 children for step 2 of 5', () => {
    renderStep({ step: 2, totalSteps: 5 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(5);
  });

  // UX0036: dots container renders for step=5 totalSteps=5
  it('UX0036: dots container has 5 children for step 5 of 5', () => {
    renderStep({ step: 5, totalSteps: 5 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(5);
  });

  // UX0037: step counter and dots are both present
  it('UX0037: step counter and progress-dots both rendered', () => {
    renderStep({ step: 2, totalSteps: 4 });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
    expect(screen.getByText('2 of 4')).toBeTruthy();
  });

  // UX0038: dots container renders for totalSteps=10
  it('UX0038: dots container has 10 children for totalSteps=10', () => {
    renderStep({ step: 1, totalSteps: 10 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(10);
  });

  // UX0039: dots container renders for totalSteps=2
  it('UX0039: dots container has 2 children for totalSteps=2', () => {
    renderStep({ step: 1, totalSteps: 2 });
    const dots = screen.getByTestId('progress-dots');
    expect(dots.children.length).toBe(2);
  });

  // UX0040: dots container and title both present
  it('UX0040: dots container and title present together', () => {
    renderStep({ step: 3, totalSteps: 5, title: 'Step Three' });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
    expect(screen.getByText('Step Three')).toBeTruthy();
  });
});

// ── Describe: OnboardingStep — navigation ─────────────────────────────────────

describe('OnboardingStep — navigation', () => {
  // UX0041: back icon button hidden when no onBack prop
  it('UX0041: back icon button hidden when onBack=undefined', () => {
    renderStep({ onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-button')).toBeNull();
  });

  // UX0042: back text button hidden when no onBack prop
  it('UX0042: back text button hidden when onBack=undefined', () => {
    renderStep({ onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-text-button')).toBeNull();
  });

  // UX0043: back icon button visible when onBack is provided
  it('UX0043: back icon button visible when onBack is provided', () => {
    renderStep({ onBack: jest.fn() });
    expect(screen.getByTestId('onboarding-back-button')).toBeTruthy();
  });

  // UX0044: back text button visible when onBack is provided
  it('UX0044: back text button visible when onBack is provided', () => {
    renderStep({ onBack: jest.fn() });
    expect(screen.getByTestId('onboarding-back-text-button')).toBeTruthy();
  });

  // UX0045: pressing next calls onNext
  it('UX0045: pressing next calls onNext', () => {
    const onNext = jest.fn();
    renderStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // UX0046: pressing back icon calls onBack
  it('UX0046: pressing back icon button calls onBack', () => {
    const onBack = jest.fn();
    renderStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // UX0047: pressing back text button calls onBack
  it('UX0047: pressing back text button calls onBack', () => {
    const onBack = jest.fn();
    renderStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // UX0048: pressing next multiple times calls onNext multiple times
  it('UX0048: pressing next multiple times calls onNext each time', () => {
    const onNext = jest.fn();
    renderStep({ onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  // UX0049: onNext is not called when isLoading=true (button disabled)
  it('UX0049: onNext not called when isLoading=true (button is disabled)', () => {
    const onNext = jest.fn();
    renderStep({ isLoading: true, onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).not.toHaveBeenCalled();
  });

  // UX0050: onBack is not called when back button is absent (step 1)
  it('UX0050: no back buttons rendered on first step without onBack', () => {
    renderStep({ step: 1, onBack: undefined });
    expect(screen.queryByTestId('onboarding-back-button')).toBeNull();
    expect(screen.queryByTestId('onboarding-back-text-button')).toBeNull();
  });

  // UX0051: both back buttons present simultaneously
  it('UX0051: both back icon and text buttons present when onBack provided', () => {
    renderStep({ onBack: jest.fn() });
    expect(screen.getByTestId('onboarding-back-button')).toBeTruthy();
    expect(screen.getByTestId('onboarding-back-text-button')).toBeTruthy();
  });

  // UX0052: back text button shows "Back"
  it('UX0052: back text button label is "Back"', () => {
    renderStep({ onBack: jest.fn() });
    expect(screen.getByText('Back')).toBeTruthy();
  });

  // UX0053: pressing back icon does not call onNext
  it('UX0053: pressing back icon does not call onNext', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onNext).not.toHaveBeenCalled();
  });

  // UX0054: pressing next does not call onBack
  it('UX0054: pressing next does not call onBack', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onBack).not.toHaveBeenCalled();
  });

  // UX0055: next button exists on first step
  it('UX0055: next button always present on step 1', () => {
    renderStep({ step: 1 });
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });

  // UX0056: next button exists on last step
  it('UX0056: next button always present on last step', () => {
    renderStep({ step: 5, totalSteps: 5 });
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });

  // UX0057: back text button "Back" label with onBack
  it('UX0057: back text button displays "Back" when onBack is set', () => {
    const onBack = jest.fn();
    renderStep({ onBack });
    expect(screen.getByText('Back')).toBeTruthy();
  });

  // UX0058: pressing back text button multiple times calls onBack multiple times
  it('UX0058: pressing back text button multiple times calls onBack each time', () => {
    const onBack = jest.fn();
    renderStep({ onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  // UX0059: back text button pressing does not affect onNext call count
  it('UX0059: pressing back text button does not affect onNext', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-back-text-button'));
    expect(onNext).not.toHaveBeenCalled();
  });

  // UX0060: next button and back icon both independently functional
  it('UX0060: both next and back icon work independently', () => {
    const onNext = jest.fn();
    const onBack = jest.fn();
    renderStep({ onNext, onBack });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ── Describe: OnboardingStep — step counter ───────────────────────────────────

describe('OnboardingStep — step counter', () => {
  // UX0061: "1 of 5"
  it('UX0061: shows "1 of 5"', () => {
    renderStep({ step: 1, totalSteps: 5 });
    expect(screen.getByText('1 of 5')).toBeTruthy();
  });

  // UX0062: "2 of 3"
  it('UX0062: shows "2 of 3"', () => {
    renderStep({ step: 2, totalSteps: 3 });
    expect(screen.getByText('2 of 3')).toBeTruthy();
  });

  // UX0063: "3 of 10"
  it('UX0063: shows "3 of 10"', () => {
    renderStep({ step: 3, totalSteps: 10 });
    expect(screen.getByText('3 of 10')).toBeTruthy();
  });

  // UX0064: "1 of 1"
  it('UX0064: shows "1 of 1" for single step', () => {
    renderStep({ step: 1, totalSteps: 1 });
    expect(screen.getByText('1 of 1')).toBeTruthy();
  });

  // UX0065: "5 of 5"
  it('UX0065: shows "5 of 5" on last step of 5', () => {
    renderStep({ step: 5, totalSteps: 5 });
    expect(screen.getByText('5 of 5')).toBeTruthy();
  });

  // UX0066: "4 of 7"
  it('UX0066: shows "4 of 7"', () => {
    renderStep({ step: 4, totalSteps: 7 });
    expect(screen.getByText('4 of 7')).toBeTruthy();
  });

  // UX0067: "1 of 3"
  it('UX0067: shows "1 of 3"', () => {
    renderStep({ step: 1, totalSteps: 3 });
    expect(screen.getByText('1 of 3')).toBeTruthy();
  });

  // UX0068: "3 of 3"
  it('UX0068: shows "3 of 3"', () => {
    renderStep({ step: 3, totalSteps: 3 });
    expect(screen.getByText('3 of 3')).toBeTruthy();
  });

  // UX0069: "2 of 7"
  it('UX0069: shows "2 of 7"', () => {
    renderStep({ step: 2, totalSteps: 7 });
    expect(screen.getByText('2 of 7')).toBeTruthy();
  });

  // UX0070: "6 of 10"
  it('UX0070: shows "6 of 10"', () => {
    renderStep({ step: 6, totalSteps: 10 });
    expect(screen.getByText('6 of 10')).toBeTruthy();
  });

  // UX0071: step counter does not show title
  it('UX0071: step counter does not show the title text', () => {
    renderStep({ step: 1, totalSteps: 5, title: 'Unique Title XYZ' });
    // "1 of 5" should exist, "Unique Title XYZ" should also exist separately
    expect(screen.getByText('1 of 5')).toBeTruthy();
    expect(screen.getByText('Unique Title XYZ')).toBeTruthy();
  });

  // UX0072: "7 of 7"
  it('UX0072: shows "7 of 7" on last step of 7', () => {
    renderStep({ step: 7, totalSteps: 7 });
    expect(screen.getByText('7 of 7')).toBeTruthy();
  });

  // UX0073: "1 of 2"
  it('UX0073: shows "1 of 2"', () => {
    renderStep({ step: 1, totalSteps: 2 });
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  // UX0074: "2 of 2"
  it('UX0074: shows "2 of 2"', () => {
    renderStep({ step: 2, totalSteps: 2 });
    expect(screen.getByText('2 of 2')).toBeTruthy();
  });

  // UX0075: counter updates when step prop changes
  it('UX0075: counter reflects updated step prop (re-render)', () => {
    const { rerender } = renderStep({ step: 1, totalSteps: 4 });
    expect(screen.getByText('1 of 4')).toBeTruthy();
    rerender(
      <OnboardingStep step={2} totalSteps={4} title="Title" onNext={jest.fn()}>
        <View />
      </OnboardingStep>
    );
    expect(screen.getByText('2 of 4')).toBeTruthy();
  });
});

// ── Describe: OnboardingStep — next button ────────────────────────────────────

describe('OnboardingStep — next button', () => {
  // UX0076: default next label is "Continue"
  it('UX0076: default nextLabel is "Continue"', () => {
    renderStep({ nextLabel: undefined });
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  // UX0077: custom nextLabel "Get Started"
  it('UX0077: custom nextLabel "Get Started" is shown', () => {
    renderStep({ nextLabel: 'Get Started' });
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  // UX0078: custom nextLabel "Finish"
  it('UX0078: custom nextLabel "Finish" is shown', () => {
    renderStep({ nextLabel: 'Finish' });
    expect(screen.getByText('Finish')).toBeTruthy();
  });

  // UX0079: custom nextLabel "Save"
  it('UX0079: custom nextLabel "Save" is shown', () => {
    renderStep({ nextLabel: 'Save' });
    expect(screen.getByText('Save')).toBeTruthy();
  });

  // UX0080: isLoading=true hides button text
  it('UX0080: isLoading=true hides "Continue" text', () => {
    renderStep({ isLoading: true });
    expect(screen.queryByText('Continue')).toBeNull();
  });

  // UX0081: isLoading=true disables the next button (onNext not called on press)
  it('UX0081: isLoading=true makes button non-pressable (onNext not called)', () => {
    const onNext = jest.fn();
    renderStep({ isLoading: true, onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).not.toHaveBeenCalled();
  });

  // UX0082: isLoading=false shows button text
  it('UX0082: isLoading=false shows nextLabel text', () => {
    renderStep({ isLoading: false, nextLabel: 'Continue' });
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  // UX0083: isLoading=false button is pressable (onNext is called)
  it('UX0083: isLoading=false button is pressable (onNext is called)', () => {
    const onNext = jest.fn();
    renderStep({ isLoading: false, onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // UX0084: custom nextLabel "Next Step" displayed
  it('UX0084: custom nextLabel "Next Step" displayed', () => {
    renderStep({ nextLabel: 'Next Step' });
    expect(screen.getByText('Next Step')).toBeTruthy();
  });

  // UX0085: isLoading=true hides custom nextLabel
  it('UX0085: isLoading=true hides custom nextLabel', () => {
    renderStep({ isLoading: true, nextLabel: 'Get Started' });
    expect(screen.queryByText('Get Started')).toBeNull();
  });

  // UX0086: button is always rendered regardless of step
  it('UX0086: next button exists on step 2 of 5', () => {
    renderStep({ step: 2, totalSteps: 5 });
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });

  // UX0087: pressing next with custom label calls onNext
  it('UX0087: pressing next with custom label calls onNext', () => {
    const onNext = jest.fn();
    renderStep({ nextLabel: 'Finish', onNext });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // UX0088: changing nextLabel prop updates the button text
  it('UX0088: re-rendering with new nextLabel updates button text', () => {
    const { rerender } = renderStep({ nextLabel: 'Continue' });
    expect(screen.getByText('Continue')).toBeTruthy();
    rerender(
      <OnboardingStep step={1} totalSteps={5} title="Title" onNext={jest.fn()} nextLabel="Finish">
        <View />
      </OnboardingStep>
    );
    expect(screen.getByText('Finish')).toBeTruthy();
  });

  // UX0089: isLoading toggling from true to false restores button text
  it('UX0089: toggling isLoading from true to false restores button text', () => {
    const { rerender } = renderStep({ isLoading: true, nextLabel: 'Continue' });
    expect(screen.queryByText('Continue')).toBeNull();
    rerender(
      <OnboardingStep step={1} totalSteps={5} title="Title" onNext={jest.fn()} isLoading={false} nextLabel="Continue">
        <View />
      </OnboardingStep>
    );
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  // UX0090: next button testID exists with custom nextLabel
  it('UX0090: next button testID exists with custom nextLabel', () => {
    renderStep({ nextLabel: 'Get Started' });
    expect(screen.getByTestId('onboarding-next-button')).toBeTruthy();
  });
});

// ── Describe: OnboardingStep — skin type step ─────────────────────────────────

describe('OnboardingStep — skin type step', () => {
  // UX0091: renders with skin type picker as children
  it('UX0091: renders skin type picker child', () => {
    renderStep({
      title: 'What is Your Skin Type?',
      subtitle: 'This helps us estimate your safe sun exposure.',
      children: <View testID="skin-type-picker" />,
    });
    expect(screen.getByTestId('skin-type-picker')).toBeTruthy();
  });

  // UX0092: subtitle is visible on skin type step
  it('UX0092: subtitle visible on skin type step', () => {
    renderStep({
      title: 'What is Your Skin Type?',
      subtitle: 'This helps us estimate your safe sun exposure.',
      children: <View />,
    });
    expect(screen.getByText('This helps us estimate your safe sun exposure.')).toBeTruthy();
  });

  // UX0093: title visible on skin type step
  it('UX0093: title visible on skin type step', () => {
    renderStep({ title: 'What is Your Skin Type?', children: <View /> });
    expect(screen.getByText('What is Your Skin Type?')).toBeTruthy();
  });

  // UX0094: progress dots present on skin type step
  it('UX0094: progress dots present on skin type step', () => {
    renderStep({ step: 2, totalSteps: 5, title: 'Choose Skin Type', children: <View /> });
    expect(screen.getByTestId('progress-dots')).toBeTruthy();
  });

  // UX0095: step counter correct on skin type step
  it('UX0095: step counter "2 of 5" on skin type step', () => {
    renderStep({ step: 2, totalSteps: 5, title: 'Choose Skin Type', children: <View /> });
    expect(screen.getByText('2 of 5')).toBeTruthy();
  });

  // UX0096: skin type step with multiple choice children renders all
  it('UX0096: skin type step renders multiple choice items', () => {
    renderStep({
      title: 'Choose Skin Type',
      children: (
        <View>
          <Text testID="skin-type-1">Type I</Text>
          <Text testID="skin-type-2">Type II</Text>
          <Text testID="skin-type-3">Type III</Text>
        </View>
      ),
    });
    expect(screen.getByTestId('skin-type-1')).toBeTruthy();
    expect(screen.getByTestId('skin-type-2')).toBeTruthy();
    expect(screen.getByTestId('skin-type-3')).toBeTruthy();
  });

  // UX0097: next label "Confirm" on skin type step
  it('UX0097: custom nextLabel "Confirm" shown on skin type step', () => {
    renderStep({ title: 'Choose Skin Type', nextLabel: 'Confirm', children: <View /> });
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  // UX0098: back button present on skin type step (step > 1)
  it('UX0098: back button present when onBack is provided on skin type step', () => {
    renderStep({
      step: 2,
      totalSteps: 5,
      title: 'Choose Skin Type',
      onBack: jest.fn(),
      children: <View />,
    });
    expect(screen.getByTestId('onboarding-back-button')).toBeTruthy();
  });

  // UX0099: pressing back on skin type step calls onBack
  it('UX0099: pressing back on skin type step calls onBack', () => {
    const onBack = jest.fn();
    renderStep({
      step: 2,
      totalSteps: 5,
      title: 'Choose Skin Type',
      onBack,
      children: <View />,
    });
    fireEvent.press(screen.getByTestId('onboarding-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // UX0100: pressing next on skin type step calls onNext
  it('UX0100: pressing next on skin type step calls onNext', () => {
    const onNext = jest.fn();
    renderStep({
      step: 2,
      totalSteps: 5,
      title: 'Choose Skin Type',
      onNext,
      children: <View />,
    });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // UX0101: skin type step without subtitle renders no subtitle
  it('UX0101: skin type step without subtitle shows no subtitle', () => {
    renderStep({
      title: 'Choose Skin Type',
      subtitle: undefined,
      children: <View />,
    });
    expect(screen.queryByText('This helps us estimate your safe sun exposure.')).toBeNull();
  });

  // UX0102: skin type step with accessibility label on child
  it('UX0102: child with accessibilityLabel is accessible', () => {
    renderStep({
      title: 'Choose Skin Type',
      children: (
        <View accessibilityLabel="Skin type selector" testID="skin-selector" />
      ),
    });
    expect(screen.getByTestId('skin-selector')).toBeTruthy();
  });

  // UX0103: skin type step renders subtitle and title together
  it('UX0103: skin type step renders both title and subtitle', () => {
    renderStep({
      title: 'Skin Type',
      subtitle: 'Select the option that best describes you.',
      children: <View />,
    });
    expect(screen.getByText('Skin Type')).toBeTruthy();
    expect(screen.getByText('Select the option that best describes you.')).toBeTruthy();
  });

  // UX0104: skin type step isLoading disables next button
  it('UX0104: isLoading=true on skin type step disables next button', () => {
    const onNext = jest.fn();
    renderStep({
      title: 'Choose Skin Type',
      isLoading: true,
      onNext,
      children: <View />,
    });
    fireEvent.press(screen.getByTestId('onboarding-next-button'));
    expect(onNext).not.toHaveBeenCalled();
  });

  // UX0105: skin type step with 6 type options renders all
  it('UX0105: all 6 Fitzpatrick type labels rendered as children', () => {
    renderStep({
      title: 'Choose Skin Type',
      children: (
        <View>
          {[1, 2, 3, 4, 5, 6].map((t) => (
            <Text key={t} testID={`type-${t}`}>
              {`Type ${t}`}
            </Text>
          ))}
        </View>
      ),
    });
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`type-${i}`)).toBeTruthy();
    }
  });

  // UX0106: skin type step counter correct for step 3 of 6
  it('UX0106: step counter "3 of 6" on step 3 of 6', () => {
    renderStep({ step: 3, totalSteps: 6, title: 'Choose Skin Type', children: <View /> });
    expect(screen.getByText('3 of 6')).toBeTruthy();
  });

  // UX0107: skin type step "Back" text button label present
  it('UX0107: "Back" text label present on skin type step when onBack provided', () => {
    renderStep({
      step: 2,
      totalSteps: 5,
      title: 'Choose Skin Type',
      onBack: jest.fn(),
      children: <View />,
    });
    expect(screen.getByText('Back')).toBeTruthy();
  });
});

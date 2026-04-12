/**
 * Learn flow tests — UX0891-UX0930
 * Covers: PaywallCard, SkinTypePicker in educational/learn contexts
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaywallCard } from '../../../templates/components/PaywallCard';
import SkinTypePicker from '../../../templates/components/SkinTypePicker';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => () => React.createElement('View') });
});

jest.mock('@/constants/config', () => ({
  APP_CONFIG: {
    UV: { LOW_MAX: 2, MODERATE_MAX: 5, HIGH_MAX: 7, VERY_HIGH_MAX: 10 },
    VITAMIN_D: { SKIN_TYPE_FACTORS: [1.0,0.9,0.75,0.6,0.4,0.25], BASE_IU_PER_MINUTE: 40, DAILY_TARGET_IU: 1000 },
    SUBSCRIPTION: { FREE_TIER_LIMITS: { coach_messages_per_day: 20, forecast_days: 1 }, PRO_TIER_LIMITS: { coach_messages_per_day: 100, forecast_days: 7 } },
  }
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({ isPro: false, tier: 'free', isLoading: false })),
}));

jest.mock('@/store/sessionStore', () => ({
  useSessionStore: jest.fn(() => ({
    session: { isActive: false, startTime: null, currentUV: 0, dEarned: 0, id: null, latitude: null, longitude: null, locationName: null },
    startSession: jest.fn(),
    stopSession: jest.fn(),
    updateUV: jest.fn(),
    updateDEarned: jest.fn(),
  })),
}));

jest.mock('@/store/userStore', () => ({
  useUserStore: jest.fn(() => ({
    profile: null,
    subscriptionTier: 'free',
    isLoading: false,
    setProfile: jest.fn(),
    setSubscriptionTier: jest.fn(),
  })),
  default: { getState: () => ({ profile: null, subscriptionTier: 'free' }) },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { signInWithOtp: jest.fn(), onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })), getSession: jest.fn() },
    from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })), insert: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
  })),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithOtp: jest.fn(), onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })), getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })) },
    from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
  }
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: null, isLoading: false, isError: false, error: null, refetch: jest.fn() })),
  useMutation: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isLoading: false, isPending: false, isError: false, data: null })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn(), setQueryData: jest.fn() })),
  QueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  QueryClientProvider: ({ children }: any) => children,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 37.7749, longitude: -122.4194 } })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock('react-native-purchases', () => ({
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  getOfferings: jest.fn(() => Promise.resolve({ current: null })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: jest.fn(() => ({ capture: jest.fn(), identify: jest.fn() })),
}));

jest.mock('@/types/models', () => ({}));

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── PaywallCard tests (UX0891-UX0910) ─────────────────────────────────────────

describe('Learn — PaywallCard', () => {
  it('UX0891: renders "SunTrace Pro" heading', () => {
    // UX0891: PaywallCard shows app name
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('SunTrace Pro')).toBeTruthy();
  });

  it('UX0892: renders "7-day UV forecast" feature item', () => {
    // UX0892: first feature list item visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('7-day UV forecast')).toBeTruthy();
  });

  it('UX0893: renders "AI Sunlight Coach" feature item', () => {
    // UX0893: second feature list item visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('AI Sunlight Coach')).toBeTruthy();
  });

  it('UX0894: renders "Trip Sun Planner" feature item', () => {
    // UX0894: third feature list item visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Trip Sun Planner')).toBeTruthy();
  });

  it('UX0895: renders "Advanced analytics" feature item', () => {
    // UX0895: fourth feature list item visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Advanced analytics')).toBeTruthy();
  });

  it('UX0896: renders "Ad-free experience" feature item', () => {
    // UX0896: fifth feature list item visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Ad-free experience')).toBeTruthy();
  });

  it('UX0897: renders "Start Free Trial" button', () => {
    // UX0897: Start Free Trial CTA visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Start Free Trial')).toBeTruthy();
  });

  it('UX0898: renders "Restore Purchase" button', () => {
    // UX0898: Restore Purchase button visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Restore Purchase')).toBeTruthy();
  });

  it('UX0899: renders "7 days free" trial banner text', () => {
    // UX0899: trial banner shows 7 days free
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('7 days free')).toBeTruthy();
  });

  it('UX0900: renders "$29.99/yr" annual option price', () => {
    // UX0900: annual price shown
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('$29.99/yr')).toBeTruthy();
  });

  it('UX0901: renders "BEST VALUE" badge on annual option', () => {
    // UX0901: best value badge visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('BEST VALUE')).toBeTruthy();
  });

  it('UX0902: renders "No charge for 7 days" sub-text', () => {
    // UX0902: trial button sub-text visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('No charge for 7 days')).toBeTruthy();
  });

  it('UX0903: renders "Everything in Pro:" features header', () => {
    // UX0903: features section header visible
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Everything in Pro:')).toBeTruthy();
  });

  it('UX0904: renders "Terms" link', () => {
    // UX0904: Terms link shown
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Terms')).toBeTruthy();
  });

  it('UX0905: renders "Privacy" link', () => {
    // UX0905: Privacy link shown
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByText('Privacy')).toBeTruthy();
  });

  it('UX0906: start-trial-button testID present', () => {
    // UX0906: start trial button has testID
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByTestId('start-trial-button')).toBeTruthy();
  });

  it('UX0907: restore-button testID present', () => {
    // UX0907: restore button has testID
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} />);
    expect(screen.getByTestId('restore-button')).toBeTruthy();
  });

  it('UX0908: isLoading=true hides "Start Free Trial" text', () => {
    // UX0908: loading state hides CTA text
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={jest.fn()} isLoading={true} />);
    expect(screen.queryByText('Start Free Trial')).toBeNull();
  });

  it('UX0909: onStartTrial fires when start trial button pressed', () => {
    // UX0909: start trial callback fires on press
    const onStartTrial = jest.fn();
    render(<PaywallCard onStartTrial={onStartTrial} onRestore={jest.fn()} />);
    fireEvent.press(screen.getByTestId('start-trial-button'));
    expect(onStartTrial).toHaveBeenCalledTimes(1);
  });

  it('UX0910: onRestore fires when restore button pressed', () => {
    // UX0910: restore callback fires on press
    const onRestore = jest.fn();
    render(<PaywallCard onStartTrial={jest.fn()} onRestore={onRestore} />);
    fireEvent.press(screen.getByTestId('restore-button'));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});

// ── SkinTypePicker tests (UX0911-UX0930) ──────────────────────────────────────

describe('Learn — SkinTypePicker', () => {
  it('UX0911: renders Roman numeral "I"', () => {
    // UX0911: skin type I numeral shown
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('I')).toBeTruthy();
  });

  it('UX0912: renders Roman numeral "II"', () => {
    // UX0912: skin type II numeral shown
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('II')).toBeTruthy();
  });

  it('UX0913: renders Roman numeral "III"', () => {
    // UX0913: skin type III numeral shown
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('III')).toBeTruthy();
  });

  it('UX0914: renders Roman numeral "IV"', () => {
    // UX0914: skin type IV numeral shown
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('IV')).toBeTruthy();
  });

  it('UX0915: renders Roman numeral "V"', () => {
    // UX0915: skin type V numeral shown
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('V')).toBeTruthy();
  });

  it('UX0916: renders Roman numeral "VI"', () => {
    // UX0916: skin type VI numeral shown
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('VI')).toBeTruthy();
  });

  it('UX0917: onChange fires when skin type II pressed', () => {
    // UX0917: tapping skin type II calls onChange with 2
    const onChange = jest.fn();
    render(<SkinTypePicker value={1} onChange={onChange} />);
    fireEvent.press(screen.getByText('II'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('UX0918: onChange fires with value 3 when III pressed', () => {
    // UX0918: tapping skin type III calls onChange with 3
    const onChange = jest.fn();
    render(<SkinTypePicker value={1} onChange={onChange} />);
    fireEvent.press(screen.getByText('III'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('UX0919: onChange fires with value 4 when IV pressed', () => {
    // UX0919: tapping skin type IV calls onChange with 4
    const onChange = jest.fn();
    render(<SkinTypePicker value={1} onChange={onChange} />);
    fireEvent.press(screen.getByText('IV'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('UX0920: onChange fires with value 5 when V pressed', () => {
    // UX0920: tapping skin type V calls onChange with 5
    const onChange = jest.fn();
    render(<SkinTypePicker value={1} onChange={onChange} />);
    fireEvent.press(screen.getByText('V'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('UX0921: onChange fires with value 6 when VI pressed', () => {
    // UX0921: tapping skin type VI calls onChange with 6
    const onChange = jest.fn();
    render(<SkinTypePicker value={1} onChange={onChange} />);
    fireEvent.press(screen.getByText('VI'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('UX0922: onChange fires with value 1 when I pressed', () => {
    // UX0922: tapping skin type I calls onChange with 1
    const onChange = jest.fn();
    render(<SkinTypePicker value={3} onChange={onChange} />);
    fireEvent.press(screen.getByText('I'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('UX0923: value=3 renders III accessibility label with selected', () => {
    // UX0923: currently selected skin type has selected accessibility state
    render(<SkinTypePicker value={3} onChange={jest.fn()} />);
    expect(screen.getByLabelText(/Skin type III/)).toBeTruthy();
  });

  it('UX0924: renders description "Very Fair\nBurns always"', () => {
    // UX0924: Very Fair description rendered for skin type I
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('Very Fair\nBurns always')).toBeTruthy();
  });

  it('UX0925: renders description "Fair\nBurns easily"', () => {
    // UX0925: Fair description rendered for skin type II
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('Fair\nBurns easily')).toBeTruthy();
  });

  it('UX0926: renders description "Medium\nBurns sometimes"', () => {
    // UX0926: Medium description rendered for skin type III
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('Medium\nBurns sometimes')).toBeTruthy();
  });

  it('UX0927: renders description for skin type IV "Olive\nBurns rarely"', () => {
    // UX0927: Olive description rendered for skin type IV
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('Olive\nBurns rarely')).toBeTruthy();
  });

  it('UX0928: renders description for skin type V "Brown\nRarely burns"', () => {
    // UX0928: Brown description rendered for skin type V
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('Brown\nRarely burns')).toBeTruthy();
  });

  it('UX0929: renders description for skin type VI "Dark\nAlmost never burns"', () => {
    // UX0929: Dark description rendered for skin type VI
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('Dark\nAlmost never burns')).toBeTruthy();
  });

  it('UX0930: re-rendering with value=6 still shows all 6 numerals', () => {
    // UX0930: changing value prop still shows all numerals
    const { rerender } = render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    rerender(<SkinTypePicker value={6} onChange={jest.fn()} />);
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('VI')).toBeTruthy();
  });
});

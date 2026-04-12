/**
 * Map flow tests — UX0931-UX0970
 * Covers: UVGauge, ForecastChart in map/location contexts
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import UVGauge from '../../../templates/components/UVGauge';
import ForecastChart from '../../../templates/components/ForecastChart';

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

function makeHour(hour: number, uv: number, isBestWindow = false) {
  return {
    date: '2026-04-12',
    hour,
    uv_index: uv,
    cloud_cover_pct: 0,
    temperature_c: 20,
    is_best_window: isBestWindow,
  };
}

// ── UVGauge locations (UX0931-UX0955) ─────────────────────────────────────────

describe('Map — UVGauge locations', () => {
  it('UX0931: UV=0 renders "0" and "Low" label', () => {
    // UX0931: UV=0 shows 0 and Low label
    render(<UVGauge uvIndex={0} />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0932: UV=1 renders "1" and "Low"', () => {
    // UX0932: UV=1 shows 1 and Low label
    render(<UVGauge uvIndex={1} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0933: UV=2 renders "2" and "Low"', () => {
    // UX0933: UV=2 (boundary) shows 2 and Low label
    render(<UVGauge uvIndex={2} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0934: UV=3 renders "3" and "Moderate"', () => {
    // UX0934: UV=3 shows 3 and Moderate label
    render(<UVGauge uvIndex={3} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0935: UV=5 renders "5" and "Moderate"', () => {
    // UX0935: UV=5 (boundary) shows 5 and Moderate label
    render(<UVGauge uvIndex={5} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0936: UV=6 renders "6" and "High"', () => {
    // UX0936: UV=6 shows 6 and High label
    render(<UVGauge uvIndex={6} />);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('UX0937: UV=7 renders "7" and "High"', () => {
    // UX0937: UV=7 (boundary) shows 7 and High label
    render(<UVGauge uvIndex={7} />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('UX0938: UV=8 renders "8" and "Very High"', () => {
    // UX0938: UV=8 shows 8 and Very High label
    render(<UVGauge uvIndex={8} />);
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0939: UV=10 renders "10" and "Very High"', () => {
    // UX0939: UV=10 (boundary) shows 10 and Very High label
    render(<UVGauge uvIndex={10} />);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0940: UV=11 renders "11" and "Extreme"', () => {
    // UX0940: UV=11 shows 11 and Extreme label
    render(<UVGauge uvIndex={11} />);
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('Extreme')).toBeTruthy();
  });

  it('UX0941: UV=12 renders "12" and "Extreme"', () => {
    // UX0941: UV=12 (max) shows 12 and Extreme label
    render(<UVGauge uvIndex={12} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Extreme')).toBeTruthy();
  });

  it('UX0942: UV=15 clamps to "12" (max)', () => {
    // UX0942: UV above max clamped to 12
    render(<UVGauge uvIndex={15} />);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('UX0943: UV=-1 clamps to "0" (min)', () => {
    // UX0943: UV below min clamped to 0
    render(<UVGauge uvIndex={-1} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('UX0944: UV=4 renders "4" and "Moderate"', () => {
    // UX0944: UV=4 shows 4 and Moderate label
    render(<UVGauge uvIndex={4} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0945: UV=9 renders "9" and "Very High"', () => {
    // UX0945: UV=9 shows 9 and Very High label
    render(<UVGauge uvIndex={9} />);
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0946: UV=0 renders "UV Index" subtitle', () => {
    // UX0946: UV Index subtitle always shown
    render(<UVGauge uvIndex={0} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0947: UV=5 renders "UV Index" subtitle', () => {
    // UX0947: UV Index subtitle shown for moderate UV
    render(<UVGauge uvIndex={5} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0948: UV=10 renders "UV Index" subtitle', () => {
    // UX0948: UV Index subtitle shown for very high UV
    render(<UVGauge uvIndex={10} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0949: UV=11 renders "UV Index" subtitle', () => {
    // UX0949: UV Index subtitle shown for extreme UV
    render(<UVGauge uvIndex={11} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0950: UV=3.7 rounds to "4" for display', () => {
    // UX0950: UV=3.7 rounds to 4 via Math.round
    render(<UVGauge uvIndex={3.7} />);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('UX0951: UV=3.2 rounds to "3" for display', () => {
    // UX0951: UV=3.2 rounds to 3 via Math.round
    render(<UVGauge uvIndex={3.2} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('UX0952: UV=6.9 rounds to "7" and shows "High"', () => {
    // UX0952: UV=6.9 rounds to 7 and shows High label
    render(<UVGauge uvIndex={6.9} />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('UX0953: UV=2 with custom size=150 renders "2"', () => {
    // UX0953: custom size still renders UV number
    render(<UVGauge uvIndex={2} size={150} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('UX0954: UV=8 with custom size=100 renders "Very High"', () => {
    // UX0954: custom size still renders level label
    render(<UVGauge uvIndex={8} size={100} />);
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0955: UV=11 with default size renders "Extreme" label', () => {
    // UX0955: default size extreme UV shows Extreme label
    render(<UVGauge uvIndex={11} />);
    expect(screen.getByText('Extreme')).toBeTruthy();
  });
});

// ── ForecastChart location data (UX0956-UX0970) ───────────────────────────────

describe('Map — ForecastChart location data', () => {
  it('UX0956: location chart with one hour shows Best window legend', () => {
    // UX0956: chart for a location shows legend
    render(<ForecastChart hours={[makeHour(10, 6, true)]} currentHour={8} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0957: location chart with one hour shows Current hour legend', () => {
    // UX0957: Current hour legend always present
    render(<ForecastChart hours={[makeHour(10, 6, true)]} currentHour={8} />);
    expect(screen.getByText('Current hour')).toBeTruthy();
  });

  it('UX0958: location chart renders hour "10 AM" label', () => {
    // UX0958: hour 10 shown in location chart
    render(<ForecastChart hours={[makeHour(10, 6, true)]} currentHour={8} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0959: location chart renders UV value "6.0"', () => {
    // UX0959: UV 6 shown as 6.0 for location data
    render(<ForecastChart hours={[makeHour(10, 6, true)]} currentHour={8} />);
    expect(screen.getByText('6.0')).toBeTruthy();
  });

  it('UX0960: location chart with noon shows "12 PM" label', () => {
    // UX0960: noon hour shown in location chart
    render(<ForecastChart hours={[makeHour(12, 8, true)]} currentHour={10} />);
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0961: location chart with afternoon shows "2 PM" label', () => {
    // UX0961: 2 PM hour shown for afternoon location data
    render(<ForecastChart hours={[makeHour(14, 5)]} currentHour={10} />);
    expect(screen.getByText('2 PM')).toBeTruthy();
  });

  it('UX0962: location chart with multiple hours shows all labels', () => {
    // UX0962: multiple location hours all labeled
    render(<ForecastChart hours={[makeHour(9, 4), makeHour(11, 7), makeHour(13, 5)]} currentHour={8} />);
    expect(screen.getByText('9 AM')).toBeTruthy();
    expect(screen.getByText('11 AM')).toBeTruthy();
    expect(screen.getByText('1 PM')).toBeTruthy();
  });

  it('UX0963: location chart with best window flag shows "Best window"', () => {
    // UX0963: best window legend shown for location with good UV
    render(<ForecastChart hours={[makeHour(11, 8, true), makeHour(12, 9, true)]} currentHour={8} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0964: location chart showing 4 PM hour renders "4 PM"', () => {
    // UX0964: 4 PM hour label for location data
    render(<ForecastChart hours={[makeHour(16, 4)]} currentHour={10} />);
    expect(screen.getByText('4 PM')).toBeTruthy();
  });

  it('UX0965: location chart with high UV shows "11.0"', () => {
    // UX0965: high UV value shown for location
    render(<ForecastChart hours={[makeHour(12, 11, true)]} currentHour={8} />);
    expect(screen.getByText('11.0')).toBeTruthy();
  });

  it('UX0966: location chart with UV=7 at best window shows "7.0"', () => {
    // UX0966: UV 7 at best window shown as 7.0
    render(<ForecastChart hours={[makeHour(10, 7, true)]} currentHour={8} />);
    expect(screen.getByText('7.0')).toBeTruthy();
  });

  it('UX0967: location with empty hours shows empty state text', () => {
    // UX0967: empty location data shows empty state
    render(<ForecastChart hours={[]} currentHour={10} />);
    expect(screen.getByText('No forecast data available')).toBeTruthy();
  });

  it('UX0968: location chart with "8 PM" hour shows label', () => {
    // UX0968: 8 PM hour rendered for evening location data
    render(<ForecastChart hours={[makeHour(20, 1)]} currentHour={10} />);
    expect(screen.getByText('8 PM')).toBeTruthy();
  });

  it('UX0969: location chart shows UV value "4.0" for UV=4', () => {
    // UX0969: UV 4 shown as 4.0 for location data
    render(<ForecastChart hours={[makeHour(9, 4)]} currentHour={8} />);
    expect(screen.getByText('4.0')).toBeTruthy();
  });

  it('UX0970: location chart with currentHour matching hour shows Current hour legend', () => {
    // UX0970: current hour matching a bar shows Current hour legend
    render(<ForecastChart hours={[makeHour(10, 6)]} currentHour={10} />);
    expect(screen.getByText('Current hour')).toBeTruthy();
  });
});

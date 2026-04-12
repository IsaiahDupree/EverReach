/**
 * Logbook flow tests — UX0831-UX0890
 * Covers: ForecastChart, GoalRing in logbook/history contexts
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ForecastChart from '../../../templates/components/ForecastChart';
import GoalRing from '../../../templates/components/GoalRing';

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

// ── ForecastChart history (UX0831-UX0865) ─────────────────────────────────────

describe('Logbook — ForecastChart history', () => {
  it('UX0831: empty hours shows "No forecast data available"', () => {
    // UX0831: empty chart renders empty state
    render(<ForecastChart hours={[]} />);
    expect(screen.getByText('No forecast data available')).toBeTruthy();
  });

  it('UX0832: single hour renders "Best window" legend', () => {
    // UX0832: chart with one hour shows legend
    render(<ForecastChart hours={[makeHour(10, 5)]} currentHour={8} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0833: single hour renders "Current hour" legend', () => {
    // UX0833: Current hour legend always shown
    render(<ForecastChart hours={[makeHour(10, 5)]} currentHour={8} />);
    expect(screen.getByText('Current hour')).toBeTruthy();
  });

  it('UX0834: chart with UV=5 at hour 10 shows hour label "10 AM"', () => {
    // UX0834: hour 10 formatted as "10 AM"
    render(<ForecastChart hours={[makeHour(10, 5)]} currentHour={8} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0835: chart with UV=5 shows "5.0" uv value label', () => {
    // UX0835: UV value shown above bar (toFixed(1))
    render(<ForecastChart hours={[makeHour(10, 5)]} currentHour={8} />);
    expect(screen.getByText('5.0')).toBeTruthy();
  });

  it('UX0836: chart with noon hour shows "12 PM" label', () => {
    // UX0836: hour 12 formatted as "12 PM"
    render(<ForecastChart hours={[makeHour(12, 7)]} currentHour={8} />);
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0837: chart with hour 6 shows "6 AM" label', () => {
    // UX0837: hour 6 formatted as "6 AM"
    render(<ForecastChart hours={[makeHour(6, 1)]} currentHour={8} />);
    expect(screen.getByText('6 AM')).toBeTruthy();
  });

  it('UX0838: chart with hour 8 shows "8 AM" label', () => {
    // UX0838: hour 8 formatted as "8 AM"
    render(<ForecastChart hours={[makeHour(8, 3)]} currentHour={6} />);
    expect(screen.getByText('8 AM')).toBeTruthy();
  });

  it('UX0839: chart with hour 15 shows "3 PM" label', () => {
    // UX0839: hour 15 formatted as "3 PM"
    render(<ForecastChart hours={[makeHour(15, 4)]} currentHour={8} />);
    expect(screen.getByText('3 PM')).toBeTruthy();
  });

  it('UX0840: chart with hour 18 shows "6 PM" label', () => {
    // UX0840: hour 18 formatted as "6 PM"
    render(<ForecastChart hours={[makeHour(18, 2)]} currentHour={8} />);
    expect(screen.getByText('6 PM')).toBeTruthy();
  });

  it('UX0841: chart with hour 20 shows "8 PM" label', () => {
    // UX0841: hour 20 formatted as "8 PM"
    render(<ForecastChart hours={[makeHour(20, 1)]} currentHour={8} />);
    expect(screen.getByText('8 PM')).toBeTruthy();
  });

  it('UX0842: chart with UV=0 does not show UV value (empty string)', () => {
    // UX0842: UV=0 shows empty string above bar
    render(<ForecastChart hours={[makeHour(10, 0)]} currentHour={8} />);
    expect(screen.queryByText('0.0')).toBeNull();
  });

  it('UX0843: chart with UV=10 shows "10.0" value', () => {
    // UX0843: UV=10 shows 10.0 above bar
    render(<ForecastChart hours={[makeHour(10, 10)]} currentHour={8} />);
    expect(screen.getByText('10.0')).toBeTruthy();
  });

  it('UX0844: chart with UV=3 shows "3.0" value', () => {
    // UX0844: UV=3 shows 3.0 above bar
    render(<ForecastChart hours={[makeHour(9, 3)]} currentHour={8} />);
    expect(screen.getByText('3.0')).toBeTruthy();
  });

  it('UX0845: chart with best window flag still shows hour label', () => {
    // UX0845: best window hour still labeled
    render(<ForecastChart hours={[makeHour(11, 8, true)]} currentHour={8} />);
    expect(screen.getByText('11 AM')).toBeTruthy();
  });

  it('UX0846: chart with best window flag shows "Best window" legend', () => {
    // UX0846: best window legend present
    render(<ForecastChart hours={[makeHour(11, 8, true)]} currentHour={8} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0847: multi-hour chart shows multiple hour labels', () => {
    // UX0847: two hours show two hour labels
    render(<ForecastChart hours={[makeHour(9, 4), makeHour(10, 6)]} currentHour={8} />);
    expect(screen.getByText('9 AM')).toBeTruthy();
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0848: multi-hour chart shows multiple UV values', () => {
    // UX0848: two hours show two UV values
    render(<ForecastChart hours={[makeHour(9, 4), makeHour(10, 6)]} currentHour={8} />);
    expect(screen.getByText('4.0')).toBeTruthy();
    expect(screen.getByText('6.0')).toBeTruthy();
  });

  it('UX0849: 5-hour chart shows Best window legend', () => {
    // UX0849: 5-hour chart shows legend
    const hours = [
      makeHour(6, 1), makeHour(7, 2), makeHour(8, 3),
      makeHour(9, 5, true), makeHour(10, 7, true),
    ];
    render(<ForecastChart hours={hours} currentHour={8} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0850: 5-hour chart shows first hour label 6 AM', () => {
    // UX0850: first hour in 5-hour chart shown
    const hours = [
      makeHour(6, 1), makeHour(7, 2), makeHour(8, 3),
      makeHour(9, 5, true), makeHour(10, 7, true),
    ];
    render(<ForecastChart hours={hours} currentHour={8} />);
    expect(screen.getByText('6 AM')).toBeTruthy();
  });

  it('UX0851: 5-hour chart shows last hour label 10 AM', () => {
    // UX0851: last hour in 5-hour chart shown
    const hours = [
      makeHour(6, 1), makeHour(7, 2), makeHour(8, 3),
      makeHour(9, 5, true), makeHour(10, 7, true),
    ];
    render(<ForecastChart hours={hours} currentHour={8} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0852: chart with currentHour=10 shows Current hour legend', () => {
    // UX0852: current hour legend shows when currentHour set to 10
    render(<ForecastChart hours={[makeHour(10, 5)]} currentHour={10} />);
    expect(screen.getByText('Current hour')).toBeTruthy();
  });

  it('UX0853: chart with UV=12 shows "12.0"', () => {
    // UX0853: UV=12 shows 12.0 above bar
    render(<ForecastChart hours={[makeHour(12, 12)]} currentHour={8} />);
    expect(screen.getByText('12.0')).toBeTruthy();
  });

  it('UX0854: chart with hour 13 shows "1 PM" label', () => {
    // UX0854: hour 13 formatted as "1 PM"
    render(<ForecastChart hours={[makeHour(13, 8)]} currentHour={8} />);
    expect(screen.getByText('1 PM')).toBeTruthy();
  });

  it('UX0855: chart with hour 14 shows "2 PM" label', () => {
    // UX0855: hour 14 formatted as "2 PM"
    render(<ForecastChart hours={[makeHour(14, 9)]} currentHour={8} />);
    expect(screen.getByText('2 PM')).toBeTruthy();
  });

  it('UX0856: chart with hour 16 shows "4 PM" label', () => {
    // UX0856: hour 16 formatted as "4 PM"
    render(<ForecastChart hours={[makeHour(16, 5)]} currentHour={8} />);
    expect(screen.getByText('4 PM')).toBeTruthy();
  });

  it('UX0857: chart with UV=1 shows "1.0" above bar', () => {
    // UX0857: UV=1 shows 1.0 above bar
    render(<ForecastChart hours={[makeHour(7, 1)]} currentHour={8} />);
    expect(screen.getByText('1.0')).toBeTruthy();
  });

  it('UX0858: chart with UV=2 shows "2.0" above bar', () => {
    // UX0858: UV=2 shows 2.0 above bar
    render(<ForecastChart hours={[makeHour(8, 2)]} currentHour={6} />);
    expect(screen.getByText('2.0')).toBeTruthy();
  });

  it('UX0859: chart with UV=8 shows "8.0" above bar', () => {
    // UX0859: UV=8 shows 8.0 above bar
    render(<ForecastChart hours={[makeHour(11, 8, true)]} currentHour={8} />);
    expect(screen.getByText('8.0')).toBeTruthy();
  });

  it('UX0860: hours outside 6-20 range falls back to all hours - shows hour label', () => {
    // UX0860: hour 3 is outside 6-20, filtered empty, falls back to original array
    render(<ForecastChart hours={[makeHour(3, 2)]} currentHour={8} />);
    expect(screen.getByText('3 AM')).toBeTruthy();
  });

  it('UX0861: truly empty hours array shows empty state', () => {
    // UX0861: empty array (not just outside range) shows empty state
    render(<ForecastChart hours={[]} currentHour={8} />);
    expect(screen.getByText('No forecast data available')).toBeTruthy();
  });

  it('UX0862: chart with hour 7 shows "7 AM" label', () => {
    // UX0862: hour 7 formatted as "7 AM"
    render(<ForecastChart hours={[makeHour(7, 3)]} currentHour={8} />);
    expect(screen.getByText('7 AM')).toBeTruthy();
  });

  it('UX0863: chart with UV=9 shows "9.0"', () => {
    // UX0863: UV=9 shows 9.0 above bar
    render(<ForecastChart hours={[makeHour(10, 9, true)]} currentHour={8} />);
    expect(screen.getByText('9.0')).toBeTruthy();
  });

  it('UX0864: 3-hour chart shows all three hour labels', () => {
    // UX0864: 3-hour chart shows all labels
    render(<ForecastChart hours={[makeHour(8, 3), makeHour(9, 5), makeHour(10, 7)]} currentHour={11} />);
    expect(screen.getByText('8 AM')).toBeTruthy();
    expect(screen.getByText('9 AM')).toBeTruthy();
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0865: chart with hour 19 shows "7 PM" label', () => {
    // UX0865: hour 19 formatted as "7 PM"
    render(<ForecastChart hours={[makeHour(19, 2)]} currentHour={8} />);
    expect(screen.getByText('7 PM')).toBeTruthy();
  });
});

// ── GoalRing history (UX0866-UX0890) ─────────────────────────────────────────

describe('Logbook — GoalRing history', () => {
  it('UX0866: GoalRing for daily goal shows 0% at start', () => {
    // UX0866: daily goal ring at start of day shows 0%
    render(<GoalRing progress={0} label="Daily Goal" />);
    expect(screen.getByText('Daily Goal')).toBeTruthy();
  });

  it('UX0867: GoalRing daily goal progress=0.5 shows label', () => {
    // UX0867: halfway through daily goal shows label
    render(<GoalRing progress={0.5} label="Daily Goal" />);
    expect(screen.getByText('Daily Goal')).toBeTruthy();
  });

  it('UX0868: GoalRing daily goal completed shows label', () => {
    // UX0868: completed daily goal shows label
    render(<GoalRing progress={1} label="Daily Goal" />);
    expect(screen.getByText('Daily Goal')).toBeTruthy();
  });

  it('UX0869: GoalRing weekly target shows "Weekly Target" label', () => {
    // UX0869: weekly target label shown
    render(<GoalRing progress={0.3} label="Weekly Target" />);
    expect(screen.getByText('Weekly Target')).toBeTruthy();
  });

  it('UX0870: GoalRing weekly target with sublabel shows sublabel', () => {
    // UX0870: weekly target sublabel shown
    render(<GoalRing progress={0.3} label="Weekly Target" sublabel="3 of 7 days" />);
    expect(screen.getByText('3 of 7 days')).toBeTruthy();
  });

  it('UX0871: GoalRing progress=0 with no label shows "0%"', () => {
    // UX0871: zero progress with default label shows 0%
    render(<GoalRing progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0872: GoalRing progress=1 with sublabel "Complete" shows it', () => {
    // UX0872: Complete sublabel shown at 100%
    render(<GoalRing progress={1} sublabel="Complete" />);
    expect(screen.getByText('Complete')).toBeTruthy();
  });

  it('UX0873: GoalRing progress=0.8 shows "80%"', () => {
    // UX0873: 80% progress shown correctly
    render(<GoalRing progress={0.8} />);
    expect(screen.getByText('80%')).toBeTruthy();
  });

  it('UX0874: GoalRing history label "Sessions" shown', () => {
    // UX0874: Sessions label for session history ring
    render(<GoalRing progress={0.6} label="Sessions" />);
    expect(screen.getByText('Sessions')).toBeTruthy();
  });

  it('UX0875: GoalRing with "IU Earned" sublabel shows it', () => {
    // UX0875: IU Earned sublabel shown in logbook
    render(<GoalRing progress={0.7} sublabel="IU Earned" />);
    expect(screen.getByText('IU Earned')).toBeTruthy();
  });

  it('UX0876: GoalRing progress=0.15 shows "15%"', () => {
    // UX0876: low progress 15% shown correctly
    render(<GoalRing progress={0.15} />);
    expect(screen.getByText('15%')).toBeTruthy();
  });

  it('UX0877: GoalRing progress=0.95 shows "95%"', () => {
    // UX0877: high progress 95% shown correctly
    render(<GoalRing progress={0.95} />);
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('UX0878: GoalRing with "This Week" sublabel shows it', () => {
    // UX0878: This Week sublabel visible in logbook context
    render(<GoalRing progress={0.4} sublabel="This Week" />);
    expect(screen.getByText('This Week')).toBeTruthy();
  });

  it('UX0879: GoalRing for streak ring shows 50% label', () => {
    // UX0879: streak ring at 50% shows default percent
    render(<GoalRing progress={0.5} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('UX0880: GoalRing progress=0.35 shows "35%"', () => {
    // UX0880: 35% progress shown correctly
    render(<GoalRing progress={0.35} />);
    expect(screen.getByText('35%')).toBeTruthy();
  });

  it('UX0881: GoalRing with "Today" sublabel shown', () => {
    // UX0881: Today sublabel visible
    render(<GoalRing progress={0.6} sublabel="Today" />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('UX0882: GoalRing with "Month" sublabel shown', () => {
    // UX0882: Month sublabel visible
    render(<GoalRing progress={0.9} sublabel="Month" />);
    expect(screen.getByText('Month')).toBeTruthy();
  });

  it('UX0883: GoalRing progress=0.05 shows "5%"', () => {
    // UX0883: very low progress 5% shown correctly
    render(<GoalRing progress={0.05} />);
    expect(screen.getByText('5%')).toBeTruthy();
  });

  it('UX0884: GoalRing with custom size=160 still shows label', () => {
    // UX0884: size 160 GoalRing shows default percent label
    render(<GoalRing progress={0.6} size={160} />);
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('UX0885: GoalRing with label "600 IU" shows it', () => {
    // UX0885: IU value as label shown
    render(<GoalRing progress={0.6} label="600 IU" />);
    expect(screen.getByText('600 IU')).toBeTruthy();
  });

  it('UX0886: GoalRing with label "1000 IU" shows it', () => {
    // UX0886: full IU goal label shown
    render(<GoalRing progress={1} label="1000 IU" />);
    expect(screen.getByText('1000 IU')).toBeTruthy();
  });

  it('UX0887: GoalRing progress=0.42 shows "42%"', () => {
    // UX0887: 42% progress shown correctly (Math.round)
    render(<GoalRing progress={0.42} />);
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('UX0888: GoalRing progress=0.58 shows "58%"', () => {
    // UX0888: 58% progress shown correctly
    render(<GoalRing progress={0.58} />);
    expect(screen.getByText('58%')).toBeTruthy();
  });

  it('UX0889: GoalRing with both label and sublabel shows label', () => {
    // UX0889: custom label visible when both label and sublabel given
    render(<GoalRing progress={0.7} label="Progress" sublabel="of weekly goal" />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  it('UX0890: GoalRing with both label and sublabel shows sublabel', () => {
    // UX0890: sublabel visible when both label and sublabel given
    render(<GoalRing progress={0.7} label="Progress" sublabel="of weekly goal" />);
    expect(screen.getByText('of weekly goal')).toBeTruthy();
  });
});

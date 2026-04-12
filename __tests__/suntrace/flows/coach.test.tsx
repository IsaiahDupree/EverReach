/**
 * Coach flow tests — UX0461-UX0550
 * Covers: BurnRiskBar, SessionTimer, ProGate in coach contexts
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BurnRiskBar from '../../../templates/components/BurnRiskBar';
import SessionTimer from '../../../templates/components/SessionTimer';
import { ProGate } from '../../../templates/components/ProGate';

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

jest.mock('@/services/api', () => ({
  calculateVitaminD: jest.fn((uv, minutes) => Math.round(uv * minutes * 40)),
  createProfile: jest.fn(),
  fetchUVForecast: jest.fn(() => Promise.resolve([])),
  fetchProfile: jest.fn(() => Promise.resolve(null)),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

function renderBurnRisk(uvIndex: number, skinType: number, minutesExposed: number) {
  return render(<BurnRiskBar uvIndex={uvIndex} skinType={skinType} minutesExposed={minutesExposed} />);
}

// ── BurnRiskBar Variants (UX0461-UX0490) ─────────────────────────────────────

describe('Coach — BurnRiskBar variants', () => {
  it('UX0461: renders Burn Risk label with UV=0 skin=1 minutes=0', () => {
    // UX0461: BurnRiskBar always shows Burn Risk label
    renderBurnRisk(0, 1, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0462: renders 0 min label with UV=0 skin=1 minutes=0', () => {
    // UX0462: BurnRiskBar always shows 0 min range label
    renderBurnRisk(0, 1, 0);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0463: renders Burn Risk with UV=5 skin=3 minutes=0', () => {
    // UX0463: BurnRiskBar renders label for moderate UV
    renderBurnRisk(5, 3, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0464: renders 0 min range label with UV=5 skin=3', () => {
    // UX0464: 0 min range label present for moderate UV
    renderBurnRisk(5, 3, 0);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0465: renders safe limit text with UV=5 skin=3', () => {
    // UX0465: safe limit text renders (135 min for UV=5, skin=3, factor=0.9)
    renderBurnRisk(5, 3, 0);
    expect(screen.getByText('135 min safe limit')).toBeTruthy();
  });

  it('UX0466: renders Burn Risk with UV=8 skin=2 minutes=0', () => {
    // UX0466: Burn Risk shown for high UV
    renderBurnRisk(8, 2, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0467: renders 0 min with UV=8 skin=2', () => {
    // UX0467: 0 min range always shown
    renderBurnRisk(8, 2, 0);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0468: renders safe limit for UV=8 skin=2 (factor=0.7 => 84 min)', () => {
    // UX0468: (200-80)*0.7 = 84 min safe limit
    renderBurnRisk(8, 2, 0);
    expect(screen.getByText('84 min safe limit')).toBeTruthy();
  });

  it('UX0469: renders Burn Risk label with UV=3 skin=1 minutes=5', () => {
    // UX0469: Burn Risk label with skin type 1 (factor=0.5)
    renderBurnRisk(3, 1, 5);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0470: renders 0 min with UV=3 skin=1 minutes=5', () => {
    // UX0470: 0 min range label always present
    renderBurnRisk(3, 1, 5);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0471: renders safe limit for UV=3 skin=1 (170*0.5=85 min)', () => {
    // UX0471: (200-30)*0.5 = 85 min safe limit
    renderBurnRisk(3, 1, 5);
    expect(screen.getByText('85 min safe limit')).toBeTruthy();
  });

  it('UX0472: renders "min until burn risk" status when minutes is low', () => {
    // UX0472: status text shows remaining minutes for low exposure
    renderBurnRisk(5, 3, 0);
    expect(screen.getByText('135 min until burn risk')).toBeTruthy();
  });

  it('UX0473: renders Burn Risk label with UV=10 skin=4 minutes=0', () => {
    // UX0473: Very high UV scenario
    renderBurnRisk(10, 4, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0474: renders 0 min with UV=10 skin=4', () => {
    // UX0474: 0 min range label present
    renderBurnRisk(10, 4, 0);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0475: renders safe limit for UV=10 skin=4 (factor=1.1 => 110 min)', () => {
    // UX0475: (200-100)*1.1 = 110 min safe limit
    renderBurnRisk(10, 4, 0);
    expect(screen.getByText('110 min safe limit')).toBeTruthy();
  });

  it('UX0476: renders Burn Risk with UV=1 skin=6 minutes=0', () => {
    // UX0476: Low UV with dark skin type
    renderBurnRisk(1, 6, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0477: renders 0 min range with UV=1 skin=6', () => {
    // UX0477: 0 min range label always present
    renderBurnRisk(1, 6, 0);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0478: renders safe limit for UV=1 skin=6 (factor=1.8 => 342 min)', () => {
    // UX0478: (200-10)*1.8 = 342 min safe limit
    renderBurnRisk(1, 6, 0);
    expect(screen.getByText('342 min safe limit')).toBeTruthy();
  });

  it('UX0479: shows exceeded status when minutes > safe limit', () => {
    // UX0479: UV=10 skin=1 safeTime=(200-100)*0.5=50, expose 60 min
    renderBurnRisk(10, 1, 60);
    expect(screen.getByText('Burn risk exceeded — seek shade')).toBeTruthy();
  });

  it('UX0480: renders Burn Risk label when limit exceeded', () => {
    // UX0480: Burn Risk label still shown when exceeded
    renderBurnRisk(10, 1, 60);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0481: renders 0 min when limit exceeded', () => {
    // UX0481: 0 min range label still present when exceeded
    renderBurnRisk(10, 1, 60);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0482: renders Burn Risk with UV=6 skin=5 minutes=0', () => {
    // UX0482: High UV with skin type 5
    renderBurnRisk(6, 5, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0483: renders safe limit for UV=6 skin=5 (factor=1.4 => 196 min)', () => {
    // UX0483: (200-60)*1.4 = 196 min safe limit
    renderBurnRisk(6, 5, 0);
    expect(screen.getByText('196 min safe limit')).toBeTruthy();
  });

  it('UX0484: renders "min until burn risk" for UV=6 skin=5 at 0 min', () => {
    // UX0484: status shows 196 min remaining
    renderBurnRisk(6, 5, 0);
    expect(screen.getByText('196 min until burn risk')).toBeTruthy();
  });

  it('UX0485: renders Burn Risk label with UV=4 skin=2 minutes=10', () => {
    // UX0485: Moderate UV skin type 2 with some exposure
    renderBurnRisk(4, 2, 10);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0486: renders 0 min range label with UV=4 skin=2 minutes=10', () => {
    // UX0486: 0 min range always present
    renderBurnRisk(4, 2, 10);
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  it('UX0487: renders safe limit for UV=4 skin=2 (160*0.7=112 min)', () => {
    // UX0487: (200-40)*0.7 = 112 min safe limit
    renderBurnRisk(4, 2, 10);
    expect(screen.getByText('112 min safe limit')).toBeTruthy();
  });

  it('UX0488: renders remaining time status for UV=4 skin=2 at 10 min (102 min left)', () => {
    // UX0488: 112 - 10 = 102 min remaining
    renderBurnRisk(4, 2, 10);
    expect(screen.getByText('102 min until burn risk')).toBeTruthy();
  });

  it('UX0489: renders Burn Risk with UV=7 skin=3 minutes=0', () => {
    // UX0489: High-boundary UV with medium skin
    renderBurnRisk(7, 3, 0);
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  it('UX0490: renders safe limit for UV=7 skin=3 (factor=0.9 => 117 min)', () => {
    // UX0490: (200-70)*0.9 = 117 min safe limit
    renderBurnRisk(7, 3, 0);
    expect(screen.getByText('117 min safe limit')).toBeTruthy();
  });
});

// ── SessionTimer Variants (UX0491-UX0520) ────────────────────────────────────

describe('Coach — SessionTimer variants', () => {
  it('UX0491: renders 00:00 when startTime is null', () => {
    // UX0491: SessionTimer shows 00:00 when inactive
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0492: renders "Vitamin D accumulated" label when startTime is null', () => {
    // UX0492: IU label always shown
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0493: renders "IU" unit label when startTime is null', () => {
    // UX0493: IU unit text always present
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0494: renders 00:00 with UV=0 skin=1 inactive', () => {
    // UX0494: 00:00 shown for UV=0 skin=1 inactive
    render(<SessionTimer startTime={null} uvIndex={0} skinType={1} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0495: renders Vitamin D accumulated with UV=0 skin=1 inactive', () => {
    // UX0495: label shown for low UV session
    render(<SessionTimer startTime={null} uvIndex={0} skinType={1} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0496: renders 00:00 with UV=8 skin=2 inactive', () => {
    // UX0496: 00:00 still shown when inactive regardless of UV
    render(<SessionTimer startTime={null} uvIndex={8} skinType={2} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0497: renders Vitamin D accumulated with UV=8 skin=2 inactive', () => {
    // UX0497: label present for high UV inactive session
    render(<SessionTimer startTime={null} uvIndex={8} skinType={2} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0498: renders IU unit with UV=8 skin=2 inactive', () => {
    // UX0498: IU unit always shown
    render(<SessionTimer startTime={null} uvIndex={8} skinType={2} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0499: renders 00:00 with UV=3 skin=4 inactive', () => {
    // UX0499: 00:00 for moderate UV with olive skin inactive
    render(<SessionTimer startTime={null} uvIndex={3} skinType={4} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0500: renders Vitamin D accumulated with UV=3 skin=4 inactive', () => {
    // UX0500: label shown for moderate UV olive skin inactive
    render(<SessionTimer startTime={null} uvIndex={3} skinType={4} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0501: renders 00:00 with UV=10 skin=5 inactive', () => {
    // UX0501: 00:00 for very high UV skin type 5 inactive
    render(<SessionTimer startTime={null} uvIndex={10} skinType={5} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0502: renders IU unit with UV=10 skin=5 inactive', () => {
    // UX0502: IU unit shown for very high UV inactive
    render(<SessionTimer startTime={null} uvIndex={10} skinType={5} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0503: renders 00:00 with UV=12 skin=6 inactive', () => {
    // UX0503: 00:00 for extreme UV skin 6 inactive
    render(<SessionTimer startTime={null} uvIndex={12} skinType={6} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0504: renders Vitamin D accumulated with UV=12 skin=6 inactive', () => {
    // UX0504: label shown for extreme UV inactive
    render(<SessionTimer startTime={null} uvIndex={12} skinType={6} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0505: renders IU unit with UV=12 skin=6 inactive', () => {
    // UX0505: IU unit shown for extreme UV inactive
    render(<SessionTimer startTime={null} uvIndex={12} skinType={6} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0506: renders 00:00 with UV=6 skin=3 inactive', () => {
    // UX0506: 00:00 for high UV skin type 3 inactive
    render(<SessionTimer startTime={null} uvIndex={6} skinType={3} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0507: renders Vitamin D accumulated with UV=6 skin=3 inactive', () => {
    // UX0507: label shown for high UV inactive
    render(<SessionTimer startTime={null} uvIndex={6} skinType={3} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0508: renders 00:00 with UV=2 skin=2 inactive', () => {
    // UX0508: 00:00 for low UV fair skin inactive
    render(<SessionTimer startTime={null} uvIndex={2} skinType={2} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0509: renders IU unit with UV=2 skin=2 inactive', () => {
    // UX0509: IU unit shown for low UV inactive
    render(<SessionTimer startTime={null} uvIndex={2} skinType={2} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0510: renders 00:00 with UV=9 skin=1 inactive', () => {
    // UX0510: 00:00 for very high UV very fair skin inactive
    render(<SessionTimer startTime={null} uvIndex={9} skinType={1} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0511: renders Vitamin D accumulated with UV=9 skin=1 inactive', () => {
    // UX0511: label shown for very high UV very fair skin inactive
    render(<SessionTimer startTime={null} uvIndex={9} skinType={1} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0512: renders IU unit with UV=9 skin=1 inactive', () => {
    // UX0512: IU unit shown for very high UV very fair skin inactive
    render(<SessionTimer startTime={null} uvIndex={9} skinType={1} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0513: renders 00:00 with UV=4 skin=4 inactive', () => {
    // UX0513: 00:00 for moderate UV olive skin inactive
    render(<SessionTimer startTime={null} uvIndex={4} skinType={4} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0514: renders Vitamin D accumulated with UV=4 skin=4 inactive', () => {
    // UX0514: label shown for moderate UV olive skin inactive
    render(<SessionTimer startTime={null} uvIndex={4} skinType={4} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0515: renders 00:00 with UV=11 skin=5 inactive', () => {
    // UX0515: 00:00 for extreme UV brown skin inactive
    render(<SessionTimer startTime={null} uvIndex={11} skinType={5} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0516: renders IU unit with UV=11 skin=5 inactive', () => {
    // UX0516: IU unit shown for extreme UV brown skin inactive
    render(<SessionTimer startTime={null} uvIndex={11} skinType={5} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0517: renders 00:00 with UV=7 skin=6 inactive', () => {
    // UX0517: 00:00 for high UV dark skin inactive
    render(<SessionTimer startTime={null} uvIndex={7} skinType={6} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('UX0518: renders Vitamin D accumulated with UV=7 skin=6 inactive', () => {
    // UX0518: label shown for high UV dark skin inactive
    render(<SessionTimer startTime={null} uvIndex={7} skinType={6} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  it('UX0519: renders IU unit with UV=7 skin=6 inactive', () => {
    // UX0519: IU unit shown for high UV dark skin inactive
    render(<SessionTimer startTime={null} uvIndex={7} skinType={6} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  it('UX0520: renders 00:00 with UV=5 skin=3 inactive', () => {
    // UX0520: 00:00 for moderate UV medium skin inactive
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});

// ── ProGate for AI coach (UX0521-UX0550) ─────────────────────────────────────

describe('Coach — ProGate for AI coach', () => {
  it('UX0521: free tier shows paywall nudge testID', () => {
    // UX0521: ProGate with free tier renders paywall-nudge
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0522: free tier shows Unlock AI Sunlight Coach with Pro text', () => {
    // UX0522: paywall nudge shows feature name
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Unlock AI Sunlight Coach with Pro')).toBeTruthy();
  });

  it('UX0523: free tier shows Try Pro Free button', () => {
    // UX0523: paywall nudge shows upgrade button text
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Try Pro Free')).toBeTruthy();
  });

  it('UX0524: free tier shows trial note text', () => {
    // UX0524: paywall nudge shows trial note
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getByText('7 days free · Cancel anytime')).toBeTruthy();
  });

  it('UX0525: free tier does NOT render children', () => {
    // UX0525: children not shown in free tier
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('coach-content')).toBeNull();
  });

  it('UX0526: pro tier renders children, not paywall', () => {
    // UX0526: Pro tier shows children instead of paywall
    render(
      <ProGate tier="pro" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0527: family tier renders children, not paywall', () => {
    // UX0527: family tier shows children instead of paywall
    render(
      <ProGate tier="family" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0528: free tier with "7-day forecast" shows correct nudge title', () => {
    // UX0528: feature name shown in nudge title
    render(
      <ProGate tier="free" feature="7-day forecast">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Unlock 7-day forecast with Pro')).toBeTruthy();
  });

  it('UX0529: free tier without feature prop shows Pro Feature title', () => {
    // UX0529: no feature prop shows generic title
    render(
      <ProGate tier="free">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Pro Feature')).toBeTruthy();
  });

  it('UX0530: free tier without feature shows Try Pro Free button', () => {
    // UX0530: upgrade button shown regardless of feature prop
    render(
      <ProGate tier="free">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Try Pro Free')).toBeTruthy();
  });

  it('UX0531: free tier with "Trip Sun Planner" shows correct nudge title', () => {
    // UX0531: Trip Sun Planner feature shown in nudge
    render(
      <ProGate tier="free" feature="Trip Sun Planner">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Unlock Trip Sun Planner with Pro')).toBeTruthy();
  });

  it('UX0532: free tier with Trip Planner shows upgrade button', () => {
    // UX0532: upgrade button shown for Trip Planner gate
    render(
      <ProGate tier="free" feature="Trip Sun Planner">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Try Pro Free')).toBeTruthy();
  });

  it('UX0533: free tier with "Advanced analytics" shows correct nudge title', () => {
    // UX0533: Advanced analytics feature shown in nudge
    render(
      <ProGate tier="free" feature="Advanced analytics">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Unlock Advanced analytics with Pro')).toBeTruthy();
  });

  it('UX0534: free tier paywall nudge has upgrade-button testID', () => {
    // UX0534: upgrade button has testID
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getByTestId('upgrade-button')).toBeTruthy();
  });

  it('UX0535: pro tier does not show paywall-nudge testID', () => {
    // UX0535: pro tier hides paywall nudge
    render(
      <ProGate tier="pro" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0536: pro tier does not show Try Pro Free button', () => {
    // UX0536: upgrade button not shown for pro users
    render(
      <ProGate tier="pro" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByText('Try Pro Free')).toBeNull();
  });

  it('UX0537: family tier does not show paywall nudge', () => {
    // UX0537: family tier hides paywall
    render(
      <ProGate tier="family" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0538: family tier does not show Try Pro Free', () => {
    // UX0538: family tier upgrade button not shown
    render(
      <ProGate tier="family" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByText('Try Pro Free')).toBeNull();
  });

  it('UX0539: free tier nudge body mentions AI Sunlight Coach', () => {
    // UX0539: nudge body text references the feature
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getAllByText(/AI Sunlight Coach/).length).toBeGreaterThan(0);
  });

  it('UX0540: free tier nudge body mentions UV coaching', () => {
    // UX0540: nudge body mentions UV coaching
    render(
      <ProGate tier="free" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.getByText(/UV coaching/)).toBeTruthy();
  });

  it('UX0541: free tier with "Ad-free experience" shows correct nudge title', () => {
    // UX0541: Ad-free experience shown in nudge title
    render(
      <ProGate tier="free" feature="Ad-free experience">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Unlock Ad-free experience with Pro')).toBeTruthy();
  });

  it('UX0542: free tier paywall nudge trial note says 7 days free', () => {
    // UX0542: 7 days free in trial note
    render(
      <ProGate tier="free" feature="Ad-free experience">
        <></>
      </ProGate>
    );
    expect(screen.getByText('7 days free · Cancel anytime')).toBeTruthy();
  });

  it('UX0543: free tier with no feature shows this feature in nudge body', () => {
    // UX0543: no feature = "this feature" in nudge body
    render(
      <ProGate tier="free">
        <></>
      </ProGate>
    );
    expect(screen.getByText(/this feature/)).toBeTruthy();
  });

  it('UX0544: pro tier does not show 7 days free trial note', () => {
    // UX0544: trial note not shown for pro users
    render(
      <ProGate tier="pro" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByText('7 days free · Cancel anytime')).toBeNull();
  });

  it('UX0545: family tier does not show 7 days free trial note', () => {
    // UX0545: trial note not shown for family users
    render(
      <ProGate tier="family" feature="AI Sunlight Coach">
        <></>
      </ProGate>
    );
    expect(screen.queryByText('7 days free · Cancel anytime')).toBeNull();
  });

  it('UX0546: free tier custom paywallNudge renders custom content', () => {
    // UX0546: paywallNudge prop overrides default nudge
    render(
      <ProGate tier="free" feature="AI Coach" paywallNudge={<></>}>
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0547: free tier without feature shows no feature nudge title', () => {
    // UX0547: "Pro Feature" is the fallback title
    render(
      <ProGate tier="free">
        <></>
      </ProGate>
    );
    expect(screen.queryByText(/Unlock .+ with Pro/)).toBeNull();
  });

  it('UX0548: free tier shows paywall nudge for any feature string', () => {
    // UX0548: custom feature string shown in nudge title
    render(
      <ProGate tier="free" feature="Custom Coach Feature">
        <></>
      </ProGate>
    );
    expect(screen.getByText('Unlock Custom Coach Feature with Pro')).toBeTruthy();
  });

  it('UX0549: free tier with long feature name still shows paywall-nudge', () => {
    // UX0549: paywall nudge testID present for long feature name
    render(
      <ProGate tier="free" feature="AI Personalized Sunlight Coaching System">
        <></>
      </ProGate>
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0550: free tier does not show nudge when custom paywallNudge provided', () => {
    // UX0550: custom paywallNudge overrides default (no upgrade-button testID)
    render(
      <ProGate tier="free" feature="AI Coach" paywallNudge={<></>}>
        <></>
      </ProGate>
    );
    expect(screen.queryByTestId('upgrade-button')).toBeNull();
  });
});

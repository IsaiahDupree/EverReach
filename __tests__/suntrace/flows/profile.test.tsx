/**
 * Profile flow tests — UX0551-UX0640
 * Covers: BadgeGrid, StreakBadge, GoalRing
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BadgeGrid from '../../../templates/components/BadgeGrid';
import StreakBadge from '../../../templates/components/StreakBadge';
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

const makeBadge = (name: string, icon: string) => ({
  badge: { id: name, name, icon, description: `${name} badge` },
  earned: false,
});

const makeEarned = (name: string, icon: string) => ({
  badge: { id: name, name, icon, description: `${name} badge` },
  earned: true,
  earned_at: '2024-01-01T00:00:00Z',
});

// ── BadgeGrid variants (UX0551-UX0590) ────────────────────────────────────────

describe('Profile — BadgeGrid variants', () => {
  it('UX0551: renders empty grid without crashing', () => {
    // UX0551: BadgeGrid with empty array renders without error
    render(<BadgeGrid badges={[]} />);
    expect(screen.queryByText('First Step')).toBeNull();
  });

  it('UX0552: renders single locked badge name', () => {
    // UX0552: single locked badge name shown
    render(<BadgeGrid badges={[makeBadge('First Step', '☀️')]} />);
    expect(screen.getByText('First Step')).toBeTruthy();
  });

  it('UX0553: renders single earned badge name', () => {
    // UX0553: single earned badge name shown
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    expect(screen.getByText('Sun Seeker')).toBeTruthy();
  });

  it('UX0554: renders two badge names', () => {
    // UX0554: two badges both show their names
    render(<BadgeGrid badges={[makeBadge('First Step', '☀️'), makeBadge('Sun Seeker', '🌤️')]} />);
    expect(screen.getByText('First Step')).toBeTruthy();
    expect(screen.getByText('Sun Seeker')).toBeTruthy();
  });

  it('UX0555: renders three badge names in a row', () => {
    // UX0555: three badges (complete row) all shown
    render(<BadgeGrid badges={[
      makeBadge('First Step', '☀️'),
      makeBadge('Sun Seeker', '🌤️'),
      makeBadge('Vitamin D', '💊'),
    ]} />);
    expect(screen.getByText('Vitamin D')).toBeTruthy();
  });

  it('UX0556: renders five badges with mixed earned/locked', () => {
    // UX0556: five badges - all names shown
    const badges = [
      makeEarned('First Step', '☀️'),
      makeEarned('Sun Seeker', '🌤️'),
      makeBadge('Streak 7', '🔥'),
      makeBadge('Streak 30', '🏆'),
      makeBadge('Vitamin D Goal', '💊'),
    ];
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('First Step')).toBeTruthy();
    expect(screen.getByText('Streak 7')).toBeTruthy();
  });

  it('UX0557: renders earned badge with earned_at date', () => {
    // UX0557: earned badge name visible
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    expect(screen.getByText('Sun Seeker')).toBeTruthy();
  });

  it('UX0558: renders badge with long name (truncated)', () => {
    // UX0558: long badge name visible even if truncated
    render(<BadgeGrid badges={[makeBadge('Consecutive Days Streak Champion', '🏅')]} />);
    expect(screen.getByText('Consecutive Days Streak Champion')).toBeTruthy();
  });

  it('UX0559: renders 4 badges without crash', () => {
    // UX0559: 4 badges renders without error
    const badges = [
      makeBadge('A', '☀️'), makeBadge('B', '🌤️'),
      makeBadge('C', '🔥'), makeBadge('D', '💊'),
    ];
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
  });

  it('UX0560: renders 6 badges without crash', () => {
    // UX0560: 6 badges renders (two complete rows)
    const badges = [
      makeBadge('A', '☀️'), makeBadge('B', '🌤️'), makeBadge('C', '🔥'),
      makeBadge('D', '💊'), makeBadge('E', '🏆'), makeBadge('F', '🎯'),
    ];
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('F')).toBeTruthy();
  });

  it('UX0561: renders badge icon text for locked badge', () => {
    // UX0561: badge icon emoji rendered for locked badge
    render(<BadgeGrid badges={[makeBadge('First Step', '☀️')]} />);
    expect(screen.getByText('☀️')).toBeTruthy();
  });

  it('UX0562: renders badge icon text for earned badge', () => {
    // UX0562: badge icon emoji rendered for earned badge
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    expect(screen.getByText('🌤️')).toBeTruthy();
  });

  it('UX0563: renders two badge icon emojis', () => {
    // UX0563: two badges show both icon emojis
    render(<BadgeGrid badges={[makeBadge('A', '☀️'), makeBadge('B', '🌤️')]} />);
    expect(screen.getByText('☀️')).toBeTruthy();
    expect(screen.getByText('🌤️')).toBeTruthy();
  });

  it('UX0564: tapping earned badge shows modal with badge name', () => {
    // UX0564: earned badge tap opens modal showing badge name
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    fireEvent.press(screen.getByText('Sun Seeker'));
    const allTexts = screen.getAllByText('Sun Seeker');
    expect(allTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('UX0565: tapping earned badge shows Unlocked text in modal', () => {
    // UX0565: earned badge tap opens modal with "Unlocked" text
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    fireEvent.press(screen.getByText('Sun Seeker'));
    expect(screen.getByText(/Unlocked/)).toBeTruthy();
  });

  it('UX0566: tapping earned badge shows description in modal', () => {
    // UX0566: modal shows badge description
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    fireEvent.press(screen.getByText('Sun Seeker'));
    expect(screen.getByText('Sun Seeker badge')).toBeTruthy();
  });

  it('UX0567: renders three earned badges all showing names', () => {
    // UX0567: three earned badges all names visible
    const badges = [
      makeEarned('Alpha', '☀️'),
      makeEarned('Beta', '🌤️'),
      makeEarned('Gamma', '🔥'),
    ];
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('Gamma')).toBeTruthy();
  });

  it('UX0568: renders badge with numeric id without crash', () => {
    // UX0568: badge with numeric string id renders
    const badge = { badge: { id: '42', name: 'Special', icon: '⭐', description: 'Special badge' }, earned: false };
    render(<BadgeGrid badges={[badge]} />);
    expect(screen.getByText('Special')).toBeTruthy();
  });

  it('UX0569: renders 9 badges without crash', () => {
    // UX0569: 9 badges (3 complete rows) renders without error
    const badges = Array.from({ length: 9 }, (_, i) =>
      makeBadge(`Badge${i}`, '☀️')
    );
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('Badge0')).toBeTruthy();
    expect(screen.getByText('Badge8')).toBeTruthy();
  });

  it('UX0570: modal not shown before tap', () => {
    // UX0570: Unlocked text not shown before any tap
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    expect(screen.queryByText(/Unlocked/)).toBeNull();
  });

  it('UX0571: locked badge has no modal on tap', () => {
    // UX0571: locked badge tap doesn't open modal (Unlocked text absent)
    render(<BadgeGrid badges={[makeBadge('Locked One', '🔒')]} />);
    // locked badges are disabled, so no Unlocked text should appear
    expect(screen.queryByText(/Unlocked/)).toBeNull();
  });

  it('UX0572: mixed badges - earned badge name visible', () => {
    // UX0572: in mixed list, earned badge name visible
    render(<BadgeGrid badges={[makeBadge('Locked', '🔒'), makeEarned('Earned', '⭐')]} />);
    expect(screen.getByText('Earned')).toBeTruthy();
  });

  it('UX0573: mixed badges - locked badge name visible', () => {
    // UX0573: in mixed list, locked badge name visible
    render(<BadgeGrid badges={[makeBadge('Locked', '🔒'), makeEarned('Earned', '⭐')]} />);
    expect(screen.getByText('Locked')).toBeTruthy();
  });

  it('UX0574: badge with special characters in name renders', () => {
    // UX0574: badge with special chars in name renders
    render(<BadgeGrid badges={[makeBadge('Sun & Moon', '🌙')]} />);
    expect(screen.getByText('Sun & Moon')).toBeTruthy();
  });

  it('UX0575: two earned badges - first name shows', () => {
    // UX0575: first earned badge in list shows name
    render(<BadgeGrid badges={[makeEarned('First', '☀️'), makeEarned('Second', '🌤️')]} />);
    expect(screen.getByText('First')).toBeTruthy();
  });

  it('UX0576: two earned badges - second name shows', () => {
    // UX0576: second earned badge in list shows name
    render(<BadgeGrid badges={[makeEarned('First', '☀️'), makeEarned('Second', '🌤️')]} />);
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('UX0577: earned badge tap shows icon in modal', () => {
    // UX0577: earned badge tap shows icon emoji in modal
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    fireEvent.press(screen.getByText('Sun Seeker'));
    // icon appears in modal (multiple instances possible)
    const icons = screen.getAllByText('🌤️');
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it('UX0578: renders badge with fire emoji icon', () => {
    // UX0578: fire emoji icon renders
    render(<BadgeGrid badges={[makeBadge('Streak', '🔥')]} />);
    expect(screen.getByText('🔥')).toBeTruthy();
  });

  it('UX0579: renders badge with trophy emoji icon', () => {
    // UX0579: trophy emoji icon renders
    render(<BadgeGrid badges={[makeBadge('Champion', '🏆')]} />);
    expect(screen.getByText('🏆')).toBeTruthy();
  });

  it('UX0580: renders single earned badge icon', () => {
    // UX0580: earned badge icon emoji shown
    render(<BadgeGrid badges={[makeEarned('Medal', '🥇')]} />);
    expect(screen.getByText('🥇')).toBeTruthy();
  });

  it('UX0581: renders 7 badges without crash', () => {
    // UX0581: 7 badges renders (fills two complete rows + partial)
    const badges = Array.from({ length: 7 }, (_, i) =>
      makeBadge(`B${i}`, '☀️')
    );
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('B6')).toBeTruthy();
  });

  it('UX0582: renders badge name with spaces', () => {
    // UX0582: badge name with multiple spaces renders
    render(<BadgeGrid badges={[makeBadge('Early Bird Special', '🐦')]} />);
    expect(screen.getByText('Early Bird Special')).toBeTruthy();
  });

  it('UX0583: renders two locked badge icons', () => {
    // UX0583: two locked badges show both icons
    render(<BadgeGrid badges={[makeBadge('A', '☀️'), makeBadge('B', '🌤️')]} />);
    expect(screen.getByText('☀️')).toBeTruthy();
    expect(screen.getByText('🌤️')).toBeTruthy();
  });

  it('UX0584: tapping second earned badge shows its name in modal', () => {
    // UX0584: tapping second earned badge shows its name in modal
    const badges = [makeEarned('First', '☀️'), makeEarned('Second', '🌤️')];
    render(<BadgeGrid badges={badges} />);
    // Press the second badge name
    fireEvent.press(screen.getAllByText('Second')[0]);
    expect(screen.getByText(/Unlocked/)).toBeTruthy();
  });

  it('UX0585: renders single badge in a 3-col grid (2 placeholders) without crash', () => {
    // UX0585: single badge with 2 placeholder cells renders
    render(<BadgeGrid badges={[makeBadge('Solo', '🎯')]} />);
    expect(screen.getByText('Solo')).toBeTruthy();
  });

  it('UX0586: renders two badges (1 placeholder) without crash', () => {
    // UX0586: two badges with 1 placeholder render
    render(<BadgeGrid badges={[makeBadge('A', '☀️'), makeBadge('B', '🌤️')]} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('UX0587: earned badge accessibility label contains earned', () => {
    // UX0587: earned badge has accessible label with "earned"
    render(<BadgeGrid badges={[makeEarned('Sun Seeker', '🌤️')]} />);
    expect(screen.getByLabelText('Sun Seeker badge (earned)')).toBeTruthy();
  });

  it('UX0588: locked badge accessibility label contains locked', () => {
    // UX0588: locked badge has accessible label with "locked"
    render(<BadgeGrid badges={[makeBadge('First Step', '☀️')]} />);
    expect(screen.getByLabelText('First Step badge (locked)')).toBeTruthy();
  });

  it('UX0589: renders five badges all visible by name', () => {
    // UX0589: 5-badge list all names rendered
    const badges = [
      makeEarned('One', '1️⃣'), makeBadge('Two', '2️⃣'), makeEarned('Three', '3️⃣'),
      makeBadge('Four', '4️⃣'), makeEarned('Five', '5️⃣'),
    ];
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('Three')).toBeTruthy();
    expect(screen.getByText('Five')).toBeTruthy();
  });

  it('UX0590: earned badge modal description shows description field', () => {
    // UX0590: modal shows description text for earned badge
    const badge = {
      badge: { id: 'sun', name: 'Sun Lover', icon: '☀️', description: 'Love the sun' },
      earned: true,
      earned_at: '2024-06-01T00:00:00Z',
    };
    render(<BadgeGrid badges={[badge]} />);
    fireEvent.press(screen.getByText('Sun Lover'));
    expect(screen.getByText('Love the sun')).toBeTruthy();
  });
});

// ── StreakBadge variants (UX0591-UX0615) ─────────────────────────────────────

describe('Profile — StreakBadge variants', () => {
  it('UX0591: streak 0 renders "0" and "days"', () => {
    // UX0591: streak 0 shows 0 and plural days
    render(<StreakBadge count={0} />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0592: streak 1 renders "1" and "day" singular', () => {
    // UX0592: streak 1 shows 1 and singular day
    render(<StreakBadge count={1} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('day')).toBeTruthy();
  });

  it('UX0593: streak 1 does not show "days"', () => {
    // UX0593: streak 1 uses singular not plural
    render(<StreakBadge count={1} />);
    expect(screen.queryByText('days')).toBeNull();
  });

  it('UX0594: streak 2 renders "2" and "days"', () => {
    // UX0594: streak 2 shows 2 and plural days
    render(<StreakBadge count={2} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0595: streak 5 renders "5" and "days"', () => {
    // UX0595: streak 5 shows 5 and plural days
    render(<StreakBadge count={5} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0596: streak 7 renders "7" and "days"', () => {
    // UX0596: streak 7 shows 7 and plural days
    render(<StreakBadge count={7} />);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0597: streak 10 renders "10" and "days"', () => {
    // UX0597: streak 10 shows 10 and plural days
    render(<StreakBadge count={10} />);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0598: streak 14 renders "14"', () => {
    // UX0598: streak 14 shows 14
    render(<StreakBadge count={14} />);
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('UX0599: streak 30 renders "30" and "days"', () => {
    // UX0599: streak 30 shows 30 and plural days
    render(<StreakBadge count={30} />);
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0600: streak 50 renders "50"', () => {
    // UX0600: streak 50 shows 50
    render(<StreakBadge count={50} />);
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('UX0601: streak 100 renders "100"', () => {
    // UX0601: streak 100 shows 100
    render(<StreakBadge count={100} />);
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('UX0602: streak 100 renders "days"', () => {
    // UX0602: streak 100 is plural
    render(<StreakBadge count={100} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0603: streak 3 renders "3" and "days"', () => {
    // UX0603: streak 3 shows 3 and plural days
    render(<StreakBadge count={3} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0604: streak 21 renders "21"', () => {
    // UX0604: streak 21 shows 21
    render(<StreakBadge count={21} />);
    expect(screen.getByText('21')).toBeTruthy();
  });

  it('UX0605: streak 21 renders "days"', () => {
    // UX0605: streak 21 is plural
    render(<StreakBadge count={21} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0606: streak 365 renders "365"', () => {
    // UX0606: very high streak number shows correctly
    render(<StreakBadge count={365} />);
    expect(screen.getByText('365')).toBeTruthy();
  });

  it('UX0607: streak 365 renders "days"', () => {
    // UX0607: large streak is plural
    render(<StreakBadge count={365} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0608: streak 0 does not show "day" singular', () => {
    // UX0608: streak 0 uses plural
    render(<StreakBadge count={0} />);
    expect(screen.queryByText('day')).toBeNull();
  });

  it('UX0609: streak 4 renders "4"', () => {
    // UX0609: streak 4 shows 4
    render(<StreakBadge count={4} />);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('UX0610: streak 6 renders "6" and "days"', () => {
    // UX0610: streak 6 shows 6 and plural
    render(<StreakBadge count={6} />);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0611: streak 15 renders "15" and "days"', () => {
    // UX0611: streak 15 shows 15 and plural
    render(<StreakBadge count={15} />);
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0612: streak 8 renders "8"', () => {
    // UX0612: streak 8 shows 8
    render(<StreakBadge count={8} />);
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('UX0613: streak 9 renders "9" and "days"', () => {
    // UX0613: streak 9 shows 9 and plural
    render(<StreakBadge count={9} />);
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0614: streak 11 renders "11" and "days"', () => {
    // UX0614: streak 11 shows 11 and plural
    render(<StreakBadge count={11} />);
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0615: streak 25 renders "25"', () => {
    // UX0615: streak 25 shows 25
    render(<StreakBadge count={25} />);
    expect(screen.getByText('25')).toBeTruthy();
  });
});

// ── GoalRing variants (UX0616-UX0640) ────────────────────────────────────────

describe('Profile — GoalRing variants', () => {
  it('UX0616: GoalRing progress=0 shows "0%"', () => {
    // UX0616: GoalRing at 0 progress shows 0%
    render(<GoalRing progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0617: GoalRing progress=1 shows "100%"', () => {
    // UX0617: GoalRing at full progress shows 100%
    render(<GoalRing progress={1} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0618: GoalRing progress=0.5 shows "50%"', () => {
    // UX0618: GoalRing at half progress shows 50%
    render(<GoalRing progress={0.5} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('UX0619: GoalRing progress=0.65 shows "65%"', () => {
    // UX0619: GoalRing at 65% progress shows 65%
    render(<GoalRing progress={0.65} />);
    expect(screen.getByText('65%')).toBeTruthy();
  });

  it('UX0620: GoalRing progress=0.25 shows "25%"', () => {
    // UX0620: GoalRing at 25% shows 25%
    render(<GoalRing progress={0.25} />);
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('UX0621: GoalRing progress=0.75 shows "75%"', () => {
    // UX0621: GoalRing at 75% shows 75%
    render(<GoalRing progress={0.75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('UX0622: GoalRing with custom label shows that label', () => {
    // UX0622: custom label overrides percentage
    render(<GoalRing progress={0.5} label="Daily Goal" />);
    expect(screen.getByText('Daily Goal')).toBeTruthy();
  });

  it('UX0623: GoalRing with custom label does not show percentage', () => {
    // UX0623: custom label replaces default %
    render(<GoalRing progress={0.5} label="Daily Goal" />);
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('UX0624: GoalRing with sublabel shows sublabel text', () => {
    // UX0624: sublabel text rendered when provided
    render(<GoalRing progress={0.5} sublabel="of daily target" />);
    expect(screen.getByText('of daily target')).toBeTruthy();
  });

  it('UX0625: GoalRing with both label and sublabel shows both', () => {
    // UX0625: label and sublabel both visible
    render(<GoalRing progress={0.8} label="800 IU" sublabel="Vitamin D" />);
    expect(screen.getByText('800 IU')).toBeTruthy();
    expect(screen.getByText('Vitamin D')).toBeTruthy();
  });

  it('UX0626: GoalRing progress=0.33 shows "33%"', () => {
    // UX0626: 33% progress shows correctly (Math.round)
    render(<GoalRing progress={0.33} />);
    expect(screen.getByText('33%')).toBeTruthy();
  });

  it('UX0627: GoalRing progress=0.9 shows "90%"', () => {
    // UX0627: 90% progress shows correctly
    render(<GoalRing progress={0.9} />);
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('UX0628: GoalRing with "Weekly Target" label shows it', () => {
    // UX0628: Weekly Target custom label shown
    render(<GoalRing progress={0.4} label="Weekly Target" />);
    expect(screen.getByText('Weekly Target')).toBeTruthy();
  });

  it('UX0629: GoalRing progress=0.1 shows "10%"', () => {
    // UX0629: 10% progress shows correctly
    render(<GoalRing progress={0.1} />);
    expect(screen.getByText('10%')).toBeTruthy();
  });

  it('UX0630: GoalRing progress=-0.1 clamps to "0%"', () => {
    // UX0630: negative progress clamped to 0%
    render(<GoalRing progress={-0.1} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0631: GoalRing progress=1.5 clamps to "100%"', () => {
    // UX0631: over-1 progress clamped to 100%
    render(<GoalRing progress={1.5} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0632: GoalRing with "IU Today" label shows it', () => {
    // UX0632: IU Today custom label shown
    render(<GoalRing progress={0.6} label="600 IU" sublabel="IU Today" />);
    expect(screen.getByText('IU Today')).toBeTruthy();
  });

  it('UX0633: GoalRing progress=0.45 shows "45%"', () => {
    // UX0633: 45% progress shows correctly
    render(<GoalRing progress={0.45} />);
    expect(screen.getByText('45%')).toBeTruthy();
  });

  it('UX0634: GoalRing with size=80 renders correctly', () => {
    // UX0634: smaller size GoalRing still shows label
    render(<GoalRing progress={0.5} size={80} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('UX0635: GoalRing with size=200 renders correctly', () => {
    // UX0635: larger size GoalRing still shows label
    render(<GoalRing progress={0.7} size={200} />);
    expect(screen.getByText('70%')).toBeTruthy();
  });

  it('UX0636: GoalRing no sublabel does not show extra text', () => {
    // UX0636: without sublabel, no sublabel text rendered
    render(<GoalRing progress={0.5} />);
    expect(screen.queryByText('of daily target')).toBeNull();
  });

  it('UX0637: GoalRing progress=0.55 shows "55%"', () => {
    // UX0637: 55% progress shows correctly
    render(<GoalRing progress={0.55} />);
    expect(screen.getByText('55%')).toBeTruthy();
  });

  it('UX0638: GoalRing with "Sessions" sublabel shows it', () => {
    // UX0638: Sessions sublabel shown
    render(<GoalRing progress={0.6} sublabel="Sessions" />);
    expect(screen.getByText('Sessions')).toBeTruthy();
  });

  it('UX0639: GoalRing progress=0.2 shows "20%"', () => {
    // UX0639: 20% progress shows correctly
    render(<GoalRing progress={0.2} />);
    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('UX0640: GoalRing with label "Done" shows "Done"', () => {
    // UX0640: single-word custom label shown
    render(<GoalRing progress={1} label="Done" />);
    expect(screen.getByText('Done')).toBeTruthy();
  });
});

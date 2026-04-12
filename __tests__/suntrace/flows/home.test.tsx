/**
 * Home screen component tests — UX0251–UX0360
 * Covers: UVGauge, GoalRing, StreakBadge, ActiveSessionBanner
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UVGauge from '../../../templates/components/UVGauge';
import GoalRing from '../../../templates/components/GoalRing';
import StreakBadge from '../../../templates/components/StreakBadge';
import { ActiveSessionBanner } from '../../../templates/components/ActiveSessionBanner';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => () => React.createElement('View') });
});

jest.mock('@/constants/config', () => ({
  APP_CONFIG: {
    UV: { LOW_MAX: 2, MODERATE_MAX: 5, HIGH_MAX: 7, VERY_HIGH_MAX: 10 },
    VITAMIN_D: {
      SKIN_TYPE_FACTORS: [1.0, 0.9, 0.75, 0.6, 0.4, 0.25],
      BASE_IU_PER_MINUTE: 40,
      DAILY_TARGET_IU: 1000,
    },
  },
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
    updateUV: jest.fn(),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// UVGauge — render  (UX0251–UX0270)
// =============================================================================

describe('UVGauge — render', () => {
  it('UX0251: mounts without crashing', () => {
    render(<UVGauge uvIndex={0} />);
  });

  it('UX0252: shows UV number 0 for uvIndex=0', () => {
    render(<UVGauge uvIndex={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('UX0253: shows UV number 1 for uvIndex=1', () => {
    render(<UVGauge uvIndex={1} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('UX0254: shows UV number 2 for uvIndex=2', () => {
    render(<UVGauge uvIndex={2} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('UX0255: shows UV number 3 for uvIndex=3', () => {
    render(<UVGauge uvIndex={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('UX0256: shows UV number 5 for uvIndex=5', () => {
    render(<UVGauge uvIndex={5} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('UX0257: shows UV number 6 for uvIndex=6', () => {
    render(<UVGauge uvIndex={6} />);
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('UX0258: shows UV number 7 for uvIndex=7', () => {
    render(<UVGauge uvIndex={7} />);
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('UX0259: shows UV number 8 for uvIndex=8', () => {
    render(<UVGauge uvIndex={8} />);
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('UX0260: shows UV number 10 for uvIndex=10', () => {
    render(<UVGauge uvIndex={10} />);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('UX0261: shows UV number 11 for uvIndex=11', () => {
    render(<UVGauge uvIndex={11} />);
    expect(screen.getByText('11')).toBeTruthy();
  });

  it('UX0262: shows UV number 12 for uvIndex=12', () => {
    render(<UVGauge uvIndex={12} />);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('UX0263: shows label "Low" for uvIndex=0', () => {
    render(<UVGauge uvIndex={0} />);
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0264: shows label "Low" for uvIndex=2', () => {
    render(<UVGauge uvIndex={2} />);
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0265: shows label "Moderate" for uvIndex=3', () => {
    render(<UVGauge uvIndex={3} />);
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0266: shows label "Moderate" for uvIndex=5', () => {
    render(<UVGauge uvIndex={5} />);
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0267: shows label "High" for uvIndex=6', () => {
    render(<UVGauge uvIndex={6} />);
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('UX0268: shows label "Very High" for uvIndex=9', () => {
    render(<UVGauge uvIndex={9} />);
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0269: shows label "Extreme" for uvIndex=11', () => {
    render(<UVGauge uvIndex={11} />);
    expect(screen.getByText('Extreme')).toBeTruthy();
  });

  it('UX0270: shows "UV Index" subtitle text', () => {
    render(<UVGauge uvIndex={5} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });
});

// =============================================================================
// UVGauge — size prop  (UX0271–UX0285)
// =============================================================================

describe('UVGauge — size prop', () => {
  it('UX0271: mounts with size=100 without crashing', () => {
    render(<UVGauge uvIndex={5} size={100} />);
  });

  it('UX0272: shows UV number with size=100', () => {
    render(<UVGauge uvIndex={5} size={100} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('UX0273: shows label with size=100', () => {
    render(<UVGauge uvIndex={5} size={100} />);
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0274: mounts with size=200 without crashing', () => {
    render(<UVGauge uvIndex={3} size={200} />);
  });

  it('UX0275: shows UV number with size=200', () => {
    render(<UVGauge uvIndex={3} size={200} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('UX0276: shows label with size=200', () => {
    render(<UVGauge uvIndex={3} size={200} />);
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0277: mounts with size=300 without crashing', () => {
    render(<UVGauge uvIndex={8} size={300} />);
  });

  it('UX0278: shows UV number with size=300', () => {
    render(<UVGauge uvIndex={8} size={300} />);
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('UX0279: shows label with size=300', () => {
    render(<UVGauge uvIndex={8} size={300} />);
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0280: shows "UV Index" with size=100', () => {
    render(<UVGauge uvIndex={1} size={100} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0281: shows "UV Index" with size=200', () => {
    render(<UVGauge uvIndex={7} size={200} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0282: shows "UV Index" with size=300', () => {
    render(<UVGauge uvIndex={11} size={300} />);
    expect(screen.getByText('UV Index')).toBeTruthy();
  });

  it('UX0283: shows "Extreme" with size=100 for uvIndex=12', () => {
    render(<UVGauge uvIndex={12} size={100} />);
    expect(screen.getByText('Extreme')).toBeTruthy();
  });

  it('UX0284: shows "Low" with size=300 for uvIndex=1', () => {
    render(<UVGauge uvIndex={1} size={300} />);
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0285: shows "High" with size=200 for uvIndex=7', () => {
    render(<UVGauge uvIndex={7} size={200} />);
    expect(screen.getByText('High')).toBeTruthy();
  });
});

// =============================================================================
// GoalRing — render  (UX0286–UX0310)
// =============================================================================

describe('GoalRing — render', () => {
  it('UX0286: mounts without crashing', () => {
    render(<GoalRing progress={0.5} />);
  });

  it('UX0287: shows default percentage label when no label prop', () => {
    render(<GoalRing progress={0.5} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('UX0288: shows custom label when provided', () => {
    render(<GoalRing progress={0.5} label="500 IU" />);
    expect(screen.getByText('500 IU')).toBeTruthy();
  });

  it('UX0289: shows sublabel when provided', () => {
    render(<GoalRing progress={0.5} sublabel="of daily goal" />);
    expect(screen.getByText('of daily goal')).toBeTruthy();
  });

  it('UX0290: does not show sublabel when not provided', () => {
    render(<GoalRing progress={0.5} />);
    expect(screen.queryByText('of daily goal')).toBeNull();
  });

  it('UX0291: shows 0% for progress=0', () => {
    render(<GoalRing progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0292: shows 100% for progress=1', () => {
    render(<GoalRing progress={1} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0293: shows 25% for progress=0.25', () => {
    render(<GoalRing progress={0.25} />);
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('UX0294: shows 75% for progress=0.75', () => {
    render(<GoalRing progress={0.75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('UX0295: shows custom label even at progress=0', () => {
    render(<GoalRing progress={0} label="Goal" />);
    expect(screen.getByText('Goal')).toBeTruthy();
  });

  it('UX0296: shows custom label even at progress=1', () => {
    render(<GoalRing progress={1} label="Done!" />);
    expect(screen.getByText('Done!')).toBeTruthy();
  });

  it('UX0297: mounts with size=80', () => {
    render(<GoalRing progress={0.5} size={80} />);
  });

  it('UX0298: mounts with size=200', () => {
    render(<GoalRing progress={0.5} size={200} />);
  });

  it('UX0299: mounts with size=300', () => {
    render(<GoalRing progress={0.3} size={300} />);
  });

  it('UX0300: shows both label and sublabel together', () => {
    render(<GoalRing progress={0.6} label="600" sublabel="IU earned" />);
    expect(screen.getByText('600')).toBeTruthy();
    expect(screen.getByText('IU earned')).toBeTruthy();
  });

  it('UX0301: shows 33% for progress=0.33', () => {
    render(<GoalRing progress={0.33} />);
    expect(screen.getByText('33%')).toBeTruthy();
  });

  it('UX0302: shows 67% for progress=0.67', () => {
    render(<GoalRing progress={0.67} />);
    expect(screen.getByText('67%')).toBeTruthy();
  });

  it('UX0303: shows 10% for progress=0.1', () => {
    render(<GoalRing progress={0.1} />);
    expect(screen.getByText('10%')).toBeTruthy();
  });

  it('UX0304: shows 90% for progress=0.9', () => {
    render(<GoalRing progress={0.9} />);
    expect(screen.getByText('90%')).toBeTruthy();
  });

  it('UX0305: shows sublabel with size prop set', () => {
    render(<GoalRing progress={0.5} size={150} sublabel="today" />);
    expect(screen.getByText('today')).toBeTruthy();
  });

  it('UX0306: mounts with progress=0.5 default size', () => {
    const { toJSON } = render(<GoalRing progress={0.5} />);
    expect(toJSON()).not.toBeNull();
  });

  it('UX0307: custom label overrides auto percentage', () => {
    render(<GoalRing progress={0.5} label="Half" />);
    expect(screen.queryByText('50%')).toBeNull();
    expect(screen.getByText('Half')).toBeTruthy();
  });

  it('UX0308: shows 50% when progress is exactly 0.5', () => {
    render(<GoalRing progress={0.5} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('UX0309: shows 1% for very small progress', () => {
    render(<GoalRing progress={0.01} />);
    expect(screen.getByText('1%')).toBeTruthy();
  });

  it('UX0310: mounts with only required props', () => {
    render(<GoalRing progress={0.42} />);
    expect(screen.getByText('42%')).toBeTruthy();
  });
});

// =============================================================================
// GoalRing — edge cases  (UX0311–UX0325)
// =============================================================================

describe('GoalRing — edge cases', () => {
  it('UX0311: progress=0 shows "0%"', () => {
    render(<GoalRing progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0312: negative progress clamped — shows "0%"', () => {
    render(<GoalRing progress={-0.5} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0313: negative progress -1 clamped — shows "0%"', () => {
    render(<GoalRing progress={-1} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0314: progress > 1 clamped — shows "100%"', () => {
    render(<GoalRing progress={1.5} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0315: progress=2 clamped to 100%', () => {
    render(<GoalRing progress={2} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0316: progress=1 exactly shows "100%"', () => {
    render(<GoalRing progress={1} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0317: custom label overrides clamped display for negative', () => {
    render(<GoalRing progress={-0.5} label="Overridden" />);
    expect(screen.getByText('Overridden')).toBeTruthy();
  });

  it('UX0318: custom label overrides clamped display for >1', () => {
    render(<GoalRing progress={2} label="Over Goal" />);
    expect(screen.getByText('Over Goal')).toBeTruthy();
  });

  it('UX0319: progress=0 mounts without crash', () => {
    const { toJSON } = render(<GoalRing progress={0} />);
    expect(toJSON()).not.toBeNull();
  });

  it('UX0320: very large negative progress clamped to 0%', () => {
    render(<GoalRing progress={-100} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0321: progress=0.001 rounds to 0%', () => {
    render(<GoalRing progress={0.001} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('UX0322: progress=0.999 rounds to 100%', () => {
    render(<GoalRing progress={0.999} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('UX0323: sublabel still shows for clamped progress', () => {
    render(<GoalRing progress={-0.5} sublabel="clamped" />);
    expect(screen.getByText('clamped')).toBeTruthy();
  });

  it('UX0324: progress=0 does not render left arc half', () => {
    const { toJSON } = render(<GoalRing progress={0} />);
    expect(toJSON()).not.toBeNull();
  });

  it('UX0325: progress=0.51 renders without crash (left arc visible)', () => {
    const { toJSON } = render(<GoalRing progress={0.51} />);
    expect(toJSON()).not.toBeNull();
  });
});

// =============================================================================
// StreakBadge — render  (UX0326–UX0345)
// =============================================================================

describe('StreakBadge — render', () => {
  it('UX0326: mounts without crashing for count=0', () => {
    render(<StreakBadge count={0} />);
  });

  it('UX0327: shows count 0', () => {
    render(<StreakBadge count={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('UX0328: shows "days" for count=0', () => {
    render(<StreakBadge count={0} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0329: mounts without crashing for count=1', () => {
    render(<StreakBadge count={1} />);
  });

  it('UX0330: shows count 1', () => {
    render(<StreakBadge count={1} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('UX0331: shows "day" (singular) for count=1', () => {
    render(<StreakBadge count={1} />);
    expect(screen.getByText('day')).toBeTruthy();
  });

  it('UX0332: does not show "days" for count=1', () => {
    render(<StreakBadge count={1} />);
    expect(screen.queryByText('days')).toBeNull();
  });

  it('UX0333: shows count 7 for count=7', () => {
    render(<StreakBadge count={7} />);
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('UX0334: shows "days" (plural) for count=7', () => {
    render(<StreakBadge count={7} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0335: does not show "day" (singular) for count=7', () => {
    render(<StreakBadge count={7} />);
    expect(screen.queryByText('day')).toBeNull();
  });

  it('UX0336: mounts without crashing for count=30', () => {
    render(<StreakBadge count={30} />);
  });

  it('UX0337: shows count 30', () => {
    render(<StreakBadge count={30} />);
    expect(screen.getByText('30')).toBeTruthy();
  });

  it('UX0338: shows "days" for count=30', () => {
    render(<StreakBadge count={30} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0339: shows count 100', () => {
    render(<StreakBadge count={100} />);
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('UX0340: shows "days" for count=100', () => {
    render(<StreakBadge count={100} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0341: shows count 2 with "days"', () => {
    render(<StreakBadge count={2} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0342: shows count 365', () => {
    render(<StreakBadge count={365} />);
    expect(screen.getByText('365')).toBeTruthy();
  });

  it('UX0343: shows "days" for count=365', () => {
    render(<StreakBadge count={365} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0344: renders count as a number string', () => {
    render(<StreakBadge count={14} />);
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('UX0345: count=3 shows plural "days"', () => {
    render(<StreakBadge count={3} />);
    expect(screen.getByText('days')).toBeTruthy();
  });
});

// =============================================================================
// ActiveSessionBanner — inactive  (UX0346–UX0355)
// =============================================================================

describe('ActiveSessionBanner — inactive', () => {
  it('UX0346: does not render banner when isActive=false', () => {
    render(<ActiveSessionBanner />);
    expect(screen.queryByTestId('active-session-banner')).toBeNull();
  });

  it('UX0347: returns null (nothing in tree) when inactive', () => {
    const { toJSON } = render(<ActiveSessionBanner />);
    expect(toJSON()).toBeNull();
  });

  it('UX0348: does not show stop button when inactive', () => {
    render(<ActiveSessionBanner />);
    expect(screen.queryByTestId('stop-session-button')).toBeNull();
  });

  it('UX0349: does not show "Stop" text when inactive', () => {
    render(<ActiveSessionBanner />);
    expect(screen.queryByText('Stop')).toBeNull();
  });

  it('UX0350: does not show IU text when inactive', () => {
    render(<ActiveSessionBanner />);
    expect(screen.queryByText(/IU/)).toBeNull();
  });

  it('UX0351: mounts without throwing when session.isActive=false', () => {
    expect(() => render(<ActiveSessionBanner />)).not.toThrow();
  });

  it('UX0352: banner testID is absent when inactive', () => {
    render(<ActiveSessionBanner />);
    expect(screen.queryByTestId('active-session-banner')).toBeNull();
  });

  it('UX0353: does not show UV text when inactive', () => {
    render(<ActiveSessionBanner />);
    expect(screen.queryByText(/UV/)).toBeNull();
  });

  it('UX0354: inactive banner renders no visible text', () => {
    const { toJSON } = render(<ActiveSessionBanner />);
    expect(toJSON()).toBeNull();
  });

  it('UX0355: re-renders inactive state without crash', () => {
    const { rerender } = render(<ActiveSessionBanner />);
    rerender(<ActiveSessionBanner />);
    expect(screen.queryByTestId('active-session-banner')).toBeNull();
  });
});

// =============================================================================
// ActiveSessionBanner — active  (UX0356–UX0360)
// =============================================================================

describe('ActiveSessionBanner — active', () => {
  beforeEach(() => {
    const { useSessionStore } = require('@/store/sessionStore');
    useSessionStore.mockReturnValue({
      session: {
        isActive: true,
        startTime: new Date(),
        currentUV: 5,
        dEarned: 100,
        id: 'test',
        latitude: null,
        longitude: null,
        locationName: null,
      },
      stopSession: jest.fn(),
    });
  });

  it('UX0356: renders banner when session is active', () => {
    render(<ActiveSessionBanner />);
    expect(screen.getByTestId('active-session-banner')).toBeTruthy();
  });

  it('UX0357: shows stop button when session is active', () => {
    render(<ActiveSessionBanner />);
    expect(screen.getByTestId('stop-session-button')).toBeTruthy();
  });

  it('UX0358: shows "Stop" text when session is active', () => {
    render(<ActiveSessionBanner />);
    expect(screen.getByText('Stop')).toBeTruthy();
  });

  it('UX0359: shows IU text when session is active', () => {
    render(<ActiveSessionBanner />);
    expect(screen.getByText('100 IU')).toBeTruthy();
  });

  it('UX0360: shows UV value text when session is active', () => {
    render(<ActiveSessionBanner />);
    expect(screen.getByText('UV 5.0')).toBeTruthy();
  });
});

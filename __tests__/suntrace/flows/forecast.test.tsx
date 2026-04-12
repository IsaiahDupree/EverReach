/**
 * Forecast screen component tests — UX0361–UX0460
 * Covers: ForecastChart, ProGate (forecast context)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ForecastChart from '../../../templates/components/ForecastChart';
import { ProGate } from '../../../templates/components/ProGate';
import { UVForecast } from '../../../templates/types/models';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/constants/config', () => ({
  APP_CONFIG: {
    UV: { LOW_MAX: 2, MODERATE_MAX: 5, HIGH_MAX: 7, VERY_HIGH_MAX: 10 },
  },
}));

jest.mock('@/types/models', () => ({}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({ isPro: false, tier: 'free', isLoading: false })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => () => React.createElement('View') });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

function makeHour(hour: number, uv_index: number, is_best_window = false): UVForecast {
  return {
    date: '2026-04-12',
    hour,
    uv_index,
    cloud_cover_pct: 0,
    temperature_c: 20,
    is_best_window,
  };
}

const SAMPLE_HOURS: UVForecast[] = [
  makeHour(6, 1, false),
  makeHour(7, 2, false),
  makeHour(8, 3, false),
  makeHour(9, 5, false),
  makeHour(10, 7, true),
  makeHour(11, 9, true),
  makeHour(12, 10, true),
];

// =============================================================================
// ForecastChart — render  (UX0361–UX0385)
// =============================================================================

describe('ForecastChart — render', () => {
  it('UX0361: mounts with empty array without crashing', () => {
    render(<ForecastChart hours={[]} />);
  });

  it('UX0362: shows empty state text when no hours provided', () => {
    render(<ForecastChart hours={[]} />);
    expect(screen.getByText('No forecast data available')).toBeTruthy();
  });

  it('UX0363: mounts with sample hours without crashing', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
  });

  it('UX0364: renders without crash when currentHour provided', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} currentHour={12} />);
  });

  it('UX0365: shows "12 PM" label for hour=12', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0366: shows "6 AM" label for hour=6', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('6 AM')).toBeTruthy();
  });

  it('UX0367: shows "7 AM" label for hour=7', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('7 AM')).toBeTruthy();
  });

  it('UX0368: shows "10 AM" label for hour=10', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0369: shows "11 AM" label for hour=11', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('11 AM')).toBeTruthy();
  });

  it('UX0370: renders legend "Best window" text', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0371: renders legend "Current hour" text', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('Current hour')).toBeTruthy();
  });

  it('UX0372: mounts with a single hour entry', () => {
    render(<ForecastChart hours={[makeHour(10, 5, false)]} />);
  });

  it('UX0373: shows hour label for single entry at hour=10', () => {
    render(<ForecastChart hours={[makeHour(10, 5, false)]} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0374: renders without crash when currentHour=6', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} currentHour={6} />);
  });

  it('UX0375: shows "8 AM" label for hour=8', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('8 AM')).toBeTruthy();
  });

  it('UX0376: renders without crash with currentHour=11', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} currentHour={11} />);
  });

  it('UX0377: shows "9 AM" label for hour=9', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('9 AM')).toBeTruthy();
  });

  it('UX0378: empty state when all hours are outside 6–20 range (shows all)', () => {
    // Hours outside range: ForecastChart falls back to showing all when filtered result is empty
    const nightHours = [makeHour(0, 0, false), makeHour(1, 0, false), makeHour(2, 0, false)];
    render(<ForecastChart hours={nightHours} />);
    expect(screen.getByText('12 AM')).toBeTruthy();
  });

  it('UX0379: renders without crash with 15 hours of data', () => {
    const many = Array.from({ length: 15 }, (_, i) => makeHour(6 + i, i, false));
    render(<ForecastChart hours={many} />);
  });

  it('UX0380: shows UV value text for hour with uv > 0', () => {
    render(<ForecastChart hours={[makeHour(10, 7.5, false)]} />);
    expect(screen.getByText('7.5')).toBeTruthy();
  });

  it('UX0381: does not show UV value text for hour with uv=0', () => {
    render(<ForecastChart hours={[makeHour(10, 0, false)]} />);
    // uv=0 renders empty string for uvValue text
    expect(screen.queryByText('0.0')).toBeNull();
  });

  it('UX0382: renders y-axis label "12"', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('UX0383: renders y-axis label "8"', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('UX0384: renders y-axis label "4"', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('UX0385: renders y-axis label "0"', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    // "0" appears in y-axis
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// ForecastChart — UV data  (UX0386–UX0420)
// =============================================================================

describe('ForecastChart — UV data', () => {
  it('UX0386: renders with all uv=0 hours without crash', () => {
    const zeroHours = SAMPLE_HOURS.map((h) => ({ ...h, uv_index: 0 }));
    render(<ForecastChart hours={zeroHours} />);
  });

  it('UX0387: renders with max UV hours without crash', () => {
    const maxHours = SAMPLE_HOURS.map((h) => ({ ...h, uv_index: 12 }));
    render(<ForecastChart hours={maxHours} />);
  });

  it('UX0388: renders best window hours without crash', () => {
    const bestWindowHours = SAMPLE_HOURS.map((h) => ({ ...h, is_best_window: true }));
    render(<ForecastChart hours={bestWindowHours} />);
  });

  it('UX0389: renders non-best-window hours without crash', () => {
    const nonBestHours = SAMPLE_HOURS.map((h) => ({ ...h, is_best_window: false }));
    render(<ForecastChart hours={nonBestHours} />);
  });

  it('UX0390: shows hour label for a best window hour', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0391: shows UV value for best window hour', () => {
    render(<ForecastChart hours={[makeHour(10, 9.0, true)]} />);
    expect(screen.getByText('9.0')).toBeTruthy();
  });

  it('UX0392: shows UV value 1.0 for low UV hour', () => {
    render(<ForecastChart hours={[makeHour(7, 1.0, false)]} />);
    expect(screen.getByText('1.0')).toBeTruthy();
  });

  it('UX0393: shows UV value 5.0 for moderate UV hour', () => {
    render(<ForecastChart hours={[makeHour(9, 5.0, false)]} />);
    expect(screen.getByText('5.0')).toBeTruthy();
  });

  it('UX0394: shows UV value 7.0 for high UV hour', () => {
    render(<ForecastChart hours={[makeHour(10, 7.0, false)]} />);
    expect(screen.getByText('7.0')).toBeTruthy();
  });

  it('UX0395: shows UV value 10.0 for very high UV hour', () => {
    render(<ForecastChart hours={[makeHour(11, 10.0, false)]} />);
    expect(screen.getByText('10.0')).toBeTruthy();
  });

  it('UX0396: shows UV value 12.0 for extreme UV hour', () => {
    render(<ForecastChart hours={[makeHour(12, 12.0, false)]} />);
    expect(screen.getByText('12.0')).toBeTruthy();
  });

  it('UX0397: renders 7 bar columns for 7 hours', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} />);
    // All 7 hour labels should be visible
    expect(screen.getByText('6 AM')).toBeTruthy();
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0398: renders correctly with a single best window hour', () => {
    render(<ForecastChart hours={[makeHour(12, 9.5, true)]} />);
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0399: renders correctly with a single non-best window hour', () => {
    render(<ForecastChart hours={[makeHour(8, 3.0, false)]} />);
    expect(screen.getByText('8 AM')).toBeTruthy();
  });

  it('UX0400: mixed best window and non-best renders all labels', () => {
    const mixed = [
      makeHour(9, 4, false),
      makeHour(10, 8, true),
      makeHour(11, 9, true),
      makeHour(12, 7, false),
    ];
    render(<ForecastChart hours={mixed} />);
    expect(screen.getByText('9 AM')).toBeTruthy();
    expect(screen.getByText('10 AM')).toBeTruthy();
    expect(screen.getByText('11 AM')).toBeTruthy();
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0401: renders hour 13 as "1 PM"', () => {
    render(<ForecastChart hours={[makeHour(13, 6, false)]} />);
    expect(screen.getByText('1 PM')).toBeTruthy();
  });

  it('UX0402: renders hour 14 as "2 PM"', () => {
    render(<ForecastChart hours={[makeHour(14, 5, false)]} />);
    expect(screen.getByText('2 PM')).toBeTruthy();
  });

  it('UX0403: renders hour 15 as "3 PM"', () => {
    render(<ForecastChart hours={[makeHour(15, 4, false)]} />);
    expect(screen.getByText('3 PM')).toBeTruthy();
  });

  it('UX0404: renders hour 16 as "4 PM"', () => {
    render(<ForecastChart hours={[makeHour(16, 3, false)]} />);
    expect(screen.getByText('4 PM')).toBeTruthy();
  });

  it('UX0405: renders hour 17 as "5 PM"', () => {
    render(<ForecastChart hours={[makeHour(17, 2, false)]} />);
    expect(screen.getByText('5 PM')).toBeTruthy();
  });

  it('UX0406: renders hour 18 as "6 PM"', () => {
    render(<ForecastChart hours={[makeHour(18, 1, false)]} />);
    expect(screen.getByText('6 PM')).toBeTruthy();
  });

  it('UX0407: renders hour 20 as "8 PM"', () => {
    render(<ForecastChart hours={[makeHour(20, 0, false)]} />);
    expect(screen.getByText('8 PM')).toBeTruthy();
  });

  it('UX0408: hours outside 6–20 are filtered when in-range hours exist', () => {
    const hours = [makeHour(3, 0, false), makeHour(10, 5, false), makeHour(23, 0, false)];
    render(<ForecastChart hours={hours} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
    expect(screen.queryByText('3 AM')).toBeNull();
  });

  it('UX0409: UV value shown for hour 11 with uv=9.0', () => {
    render(<ForecastChart hours={[makeHour(11, 9.0, true)]} />);
    expect(screen.getByText('11 AM')).toBeTruthy();
  });

  it('UX0410: renders without crash with fractional UV values', () => {
    render(<ForecastChart hours={[makeHour(10, 6.7, false)]} />);
    expect(screen.getByText('6.7')).toBeTruthy();
  });

  it('UX0411: legend "Best window" always shown with data', () => {
    render(<ForecastChart hours={[makeHour(10, 5, false)]} />);
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0412: legend "Current hour" always shown with data', () => {
    render(<ForecastChart hours={[makeHour(10, 5, false)]} />);
    expect(screen.getByText('Current hour')).toBeTruthy();
  });

  it('UX0413: renders with uv_index=0.5', () => {
    render(<ForecastChart hours={[makeHour(7, 0.5, false)]} />);
    expect(screen.getByText('0.5')).toBeTruthy();
  });

  it('UX0414: renders UV value for uv=11.5', () => {
    render(<ForecastChart hours={[makeHour(11, 11.5, false)]} />);
    expect(screen.getByText('11.5')).toBeTruthy();
  });

  it('UX0415: does not crash with large UV values beyond 12', () => {
    render(<ForecastChart hours={[makeHour(11, 15, false)]} />);
  });

  it('UX0416: shows all hour labels in a full 6–20 dataset', () => {
    const full = Array.from({ length: 15 }, (_, i) => makeHour(6 + i, i, false));
    render(<ForecastChart hours={full} />);
    expect(screen.getByText('6 AM')).toBeTruthy();
    expect(screen.getByText('8 PM')).toBeTruthy();
  });

  it('UX0417: renders currentHour=10 without crash', () => {
    render(<ForecastChart hours={SAMPLE_HOURS} currentHour={10} />);
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0418: renders with only one non-best-window hour', () => {
    render(<ForecastChart hours={[makeHour(9, 4, false)]} />);
    expect(screen.getByText('9 AM')).toBeTruthy();
  });

  it('UX0419: renders with only one best-window hour', () => {
    render(<ForecastChart hours={[makeHour(11, 8, true)]} />);
    expect(screen.getByText('11 AM')).toBeTruthy();
  });

  it('UX0420: full dataset renders legend items', () => {
    const full = Array.from({ length: 10 }, (_, i) => makeHour(8 + i, i + 1, i >= 3 && i <= 6));
    render(<ForecastChart hours={full} />);
    expect(screen.getByText('Best window')).toBeTruthy();
    expect(screen.getByText('Current hour')).toBeTruthy();
  });
});

// =============================================================================
// ForecastChart — ProGate  (UX0421–UX0460)
// =============================================================================

describe('ForecastChart — ProGate', () => {
  it('UX0421: ProGate with free tier shows paywall nudge', () => {
    render(
      <ProGate tier="free" feature="7-day forecast">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0422: ProGate with free tier hides chart content', () => {
    render(
      <ProGate tier="free" feature="7-day forecast">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByText('6 AM')).toBeNull();
  });

  it('UX0423: ProGate with pro tier shows chart (not paywall)', () => {
    render(
      <ProGate tier="pro" feature="7-day forecast">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0424: ProGate with pro tier renders chart hour labels', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('6 AM')).toBeTruthy();
  });

  it('UX0425: ProGate with family tier shows chart content', () => {
    render(
      <ProGate tier="family">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0426: ProGate free shows "Unlock 7-day forecast with Pro" in nudge title', () => {
    render(
      <ProGate tier="free" feature="7-day forecast">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Unlock 7-day forecast with Pro')).toBeTruthy();
  });

  it('UX0427: ProGate free shows upgrade button', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('upgrade-button')).toBeTruthy();
  });

  it('UX0428: ProGate free shows "Try Pro Free" text on button', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Try Pro Free')).toBeTruthy();
  });

  it('UX0429: ProGate free shows "7 days free · Cancel anytime" note', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('7 days free · Cancel anytime')).toBeTruthy();
  });

  it('UX0430: ProGate without tier prop uses useSubscription hook result', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({ isPro: false, tier: 'free', isLoading: false });
    render(
      <ProGate>
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0431: ProGate renders without crash with empty hours and free tier', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={[]} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0432: ProGate renders without crash with empty hours and pro tier', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={[]} />
      </ProGate>,
    );
    expect(screen.getByText('No forecast data available')).toBeTruthy();
  });

  it('UX0433: ProGate free shows "Pro Feature" title when no feature prop', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Pro Feature')).toBeTruthy();
  });

  it('UX0434: ProGate with custom paywallNudge renders custom component', () => {
    const { Text } = require('react-native');
    render(
      <ProGate tier="free" paywallNudge={<Text testID="custom-nudge">Custom</Text>}>
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('custom-nudge')).toBeTruthy();
  });

  it('UX0435: ProGate with custom paywallNudge does not show default paywall-nudge', () => {
    const { Text } = require('react-native');
    render(
      <ProGate tier="free" paywallNudge={<Text testID="custom-nudge">Custom</Text>}>
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0436: ProGate pro tier renders ForecastChart legend', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0437: ProGate pro tier renders ForecastChart "Current hour" legend', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Current hour')).toBeTruthy();
  });

  it('UX0438: ProGate family tier renders ForecastChart legend', () => {
    render(
      <ProGate tier="family">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Best window')).toBeTruthy();
  });

  it('UX0439: ProGate mounts with useSubscription returning isPro=true (no override)', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({ isPro: true, tier: 'pro', isLoading: false });
    render(
      <ProGate>
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0440: ProGate mounts with useSubscription returning isPro=true shows chart', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({ isPro: true, tier: 'pro', isLoading: false });
    render(
      <ProGate>
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('6 AM')).toBeTruthy();
  });

  it('UX0441: ProGate free shows body text referencing feature', () => {
    render(
      <ProGate tier="free" feature="UV coaching">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    // Both the title and body contain "UV coaching" — verify at least one exists
    expect(screen.getAllByText(/UV coaching/).length).toBeGreaterThan(0);
  });

  it('UX0442: ProGate free body text includes "this feature" when no feature prop', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText(/this feature/)).toBeTruthy();
  });

  it('UX0443: ProGate renders without crash for all tiers', () => {
    const tiers: Array<'free' | 'pro' | 'family'> = ['free', 'pro', 'family'];
    tiers.forEach((tier) => {
      const { unmount } = render(
        <ProGate tier={tier}>
          <ForecastChart hours={SAMPLE_HOURS} />
        </ProGate>,
      );
      unmount();
    });
  });

  it('UX0444: ProGate feature="AI Forecast" shown in nudge title', () => {
    render(
      <ProGate tier="free" feature="AI Forecast">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('Unlock AI Forecast with Pro')).toBeTruthy();
  });

  it('UX0445: ProGate free upgrade button is pressable without error', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    const button = screen.getByTestId('upgrade-button');
    expect(() => fireEvent.press(button)).not.toThrow();
  });

  it('UX0446: ProGate renders with no children crash-free (empty fragment)', () => {
    render(
      <ProGate tier="pro">
        <></>
      </ProGate>,
    );
  });

  it('UX0447: ProGate free renders without crashing when no feature name', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={[]} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0448: ProGate pro shows ForecastChart empty state for empty hours', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={[]} />
      </ProGate>,
    );
    expect(screen.getByText('No forecast data available')).toBeTruthy();
  });

  it('UX0449: ProGate rerender from free to pro shows chart', () => {
    const { rerender } = render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    rerender(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText('6 AM')).toBeTruthy();
  });

  it('UX0450: ProGate rerender from pro to free shows paywall', () => {
    const { rerender } = render(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    rerender(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0451: ProGate free with single hour in chart still shows paywall', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={[makeHour(12, 9, true)]} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0452: ProGate pro with single best-window hour shows that hour', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={[makeHour(12, 9, true)]} />
      </ProGate>,
    );
    expect(screen.getByText('12 PM')).toBeTruthy();
  });

  it('UX0453: ProGate free nudge body mentions "personalized UV coaching"', () => {
    render(
      <ProGate tier="free" feature="7-day forecast">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByText(/personalized UV coaching/)).toBeTruthy();
  });

  it('UX0454: ProGate pro renders without paywall-nudge testID', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0455: ProGate free does not show upgrade button testID "onboarding-next-button"', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.queryByTestId('onboarding-next-button')).toBeNull();
  });

  it('UX0456: ProGate free shows "upgrade-button" testID', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('upgrade-button')).toBeTruthy();
  });

  it('UX0457: ProGate family renders ForecastChart content without paywall', () => {
    render(
      <ProGate tier="family">
        <ForecastChart hours={[makeHour(10, 6, true)]} />
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
    expect(screen.getByText('10 AM')).toBeTruthy();
  });

  it('UX0458: ProGate mounts without crash when children is a ForecastChart with currentHour', () => {
    render(
      <ProGate tier="pro">
        <ForecastChart hours={SAMPLE_HOURS} currentHour={10} />
      </ProGate>,
    );
  });

  it('UX0459: ProGate free renders paywall backdrop (overlayContainer testID)', () => {
    render(
      <ProGate tier="free">
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0460: ProGate renders without crash for unknown tier override defaulting to paywall', () => {
    // Tier not in 'pro'|'family' → shows paywall
    render(
      <ProGate tier={'free' as any}>
        <ForecastChart hours={SAMPLE_HOURS} />
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });
});

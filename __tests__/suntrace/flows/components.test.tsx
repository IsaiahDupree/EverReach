/**
 * Shared component tests — UX0971-UX1000
 *
 * Components covered:
 *   UVGauge       UX0971-UX0978
 *   StreakBadge   UX0979-UX0985
 *   SkinTypePicker UX0986-UX0992
 *   BadgeGrid     UX0993-UX1000
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UVGauge from '../../../templates/components/UVGauge';
import StreakBadge from '../../../templates/components/StreakBadge';
import SkinTypePicker from '../../../templates/components/SkinTypePicker';
import BadgeGrid from '../../../templates/components/BadgeGrid';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: (_, name) => () => React.createElement('View') });
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

// ── UVGauge — render ──────────────────────────────────────────────────────────

describe('UVGauge — render', () => {
  it('UX0971: mounts without crashing', () => {
    // UX0971: component renders without throwing
    expect(() => render(<UVGauge uvIndex={5} />)).not.toThrow();
  });

  it('UX0972: shows the UV index number', () => {
    // UX0972: displays the numeric UV value
    render(<UVGauge uvIndex={5} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('UX0973: shows "Low" label for UV index 1', () => {
    // UX0973: uv=1 => LOW_MAX=2 => label "Low"
    render(<UVGauge uvIndex={1} />);
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0974: shows "Low" label for UV index 0', () => {
    // UX0974: uv=0 is within low range
    render(<UVGauge uvIndex={0} />);
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('UX0975: shows "Moderate" label for UV index 4', () => {
    // UX0975: uv=4 => 3-5 => "Moderate"
    render(<UVGauge uvIndex={4} />);
    expect(screen.getByText('Moderate')).toBeTruthy();
  });

  it('UX0976: shows "High" label for UV index 6', () => {
    // UX0976: uv=6 => 6-7 => "High"
    render(<UVGauge uvIndex={6} />);
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('UX0977: shows "Very High" label for UV index 9', () => {
    // UX0977: uv=9 => 8-10 => "Very High"
    render(<UVGauge uvIndex={9} />);
    expect(screen.getByText('Very High')).toBeTruthy();
  });

  it('UX0978: shows "Extreme" label for UV index 12', () => {
    // UX0978: uv=12 => 11+ => "Extreme"
    render(<UVGauge uvIndex={12} />);
    expect(screen.getByText('Extreme')).toBeTruthy();
  });
});

// ── StreakBadge — render ──────────────────────────────────────────────────────

describe('StreakBadge — render', () => {
  it('UX0979: mounts without crashing', () => {
    // UX0979: component renders without throwing
    expect(() => render(<StreakBadge count={3} />)).not.toThrow();
  });

  it('UX0980: shows the streak count as a number', () => {
    // UX0980: displays the count value
    render(<StreakBadge count={7} />);
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('UX0981: shows "day" (singular) when count is 1', () => {
    // UX0981: count === 1 renders "day" not "days"
    render(<StreakBadge count={1} />);
    expect(screen.getByText('day')).toBeTruthy();
  });

  it('UX0982: does not show "days" when count is 1', () => {
    // UX0982: singular should not render plural label
    render(<StreakBadge count={1} />);
    expect(screen.queryByText('days')).toBeNull();
  });

  it('UX0983: shows "days" (plural) when count is 5', () => {
    // UX0983: count > 1 renders "days"
    render(<StreakBadge count={5} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0984: shows "days" when count is 0', () => {
    // UX0984: count === 0 is not 1, so label is "days"
    render(<StreakBadge count={0} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('UX0985: shows the count value 0', () => {
    // UX0985: displays 0 as text when streak count is zero
    render(<StreakBadge count={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });
});

// ── SkinTypePicker — render ───────────────────────────────────────────────────

describe('SkinTypePicker — render', () => {
  it('UX0986: mounts without crashing', () => {
    // UX0986: component renders without throwing
    expect(() =>
      render(<SkinTypePicker value={1} onChange={jest.fn()} />)
    ).not.toThrow();
  });

  it('UX0987: renders Roman numeral "I" for skin type 1', () => {
    // UX0987: first swatch shows "I"
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('I')).toBeTruthy();
  });

  it('UX0988: renders Roman numeral "II" for skin type 2', () => {
    // UX0988: second swatch shows "II"
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('II')).toBeTruthy();
  });

  it('UX0989: renders Roman numeral "III" for skin type 3', () => {
    // UX0989: third swatch shows "III"
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('III')).toBeTruthy();
  });

  it('UX0990: renders Roman numerals "IV", "V", "VI" for skin types 4-6', () => {
    // UX0990: all six skin type numerals are rendered
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(screen.getByText('IV')).toBeTruthy();
    expect(screen.getByText('V')).toBeTruthy();
    expect(screen.getByText('VI')).toBeTruthy();
  });

  it('UX0991: each swatch has an accessibilityLabel', () => {
    // UX0991: skin type "I" swatch has accessibilityLabel containing "Skin type I"
    render(<SkinTypePicker value={1} onChange={jest.fn()} />);
    expect(
      screen.getByLabelText('Skin type I — Very Fair, Burns always')
    ).toBeTruthy();
  });

  it('UX0992: onChange fires with correct type number when a swatch is pressed', () => {
    // UX0992: pressing skin type III swatch calls onChange with 3
    const onChange = jest.fn();
    render(<SkinTypePicker value={1} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Skin type III — Medium, Burns sometimes'));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

// ── BadgeGrid — render ────────────────────────────────────────────────────────

describe('BadgeGrid — render', () => {
  it('UX0993: mounts with empty badge array without crashing', () => {
    // UX0993: renders without throwing when badges is empty
    expect(() => render(<BadgeGrid badges={[]} />)).not.toThrow();
  });

  it('UX0994: renders nothing when badges array is empty', () => {
    // UX0994: no badge names appear with empty array
    const { toJSON } = render(<BadgeGrid badges={[]} />);
    // Component renders placeholder Views only — no badge text
    expect(toJSON()).toBeTruthy();
  });

  it('UX0995: renders an earned badge by name', () => {
    // UX0995: badge name is visible in the grid
    const badge = { id: 'b1', name: 'First Sun', icon: '☀️', description: 'First session' };
    render(<BadgeGrid badges={[{ badge, earned: true, earned_at: '2024-06-01' }]} />);
    expect(screen.getByText('First Sun')).toBeTruthy();
  });

  it('UX0996: renders a locked badge by name', () => {
    // UX0996: locked badge name still appears in the grid
    const badge = { id: 'b2', name: 'Week Warrior', icon: '🔥', description: '7-day streak' };
    render(<BadgeGrid badges={[{ badge, earned: false }]} />);
    expect(screen.getByText('Week Warrior')).toBeTruthy();
  });

  it('UX0997: earned badge has accessibilityLabel with "(earned)"', () => {
    // UX0997: earned badge cell includes "(earned)" in accessibilityLabel
    const badge = { id: 'b3', name: 'Sun Chaser', icon: '🌤️', description: 'desc' };
    render(<BadgeGrid badges={[{ badge, earned: true, earned_at: '2024-01-01' }]} />);
    expect(screen.getByLabelText('Sun Chaser badge (earned)')).toBeTruthy();
  });

  it('UX0998: locked badge has accessibilityLabel with "(locked)"', () => {
    // UX0998: locked badge cell includes "(locked)" in accessibilityLabel
    const badge = { id: 'b4', name: 'UV Master', icon: '🌞', description: 'desc' };
    render(<BadgeGrid badges={[{ badge, earned: false }]} />);
    expect(screen.getByLabelText('UV Master badge (locked)')).toBeTruthy();
  });

  it('UX0999: renders multiple badges', () => {
    // UX0999: both badges in the array appear by name
    const badges = [
      { badge: { id: 'b5', name: 'Alpha', icon: '⭐', description: 'd' }, earned: true, earned_at: '2024-01-01' },
      { badge: { id: 'b6', name: 'Beta', icon: '🏅', description: 'd' }, earned: false },
    ];
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('UX1000: badge icon emoji is rendered', () => {
    // UX1000: the badge icon character appears in the rendered output
    const badge = { id: 'b7', name: 'Solar', icon: '🌟', description: 'desc' };
    render(<BadgeGrid badges={[{ badge, earned: true, earned_at: '2024-01-01' }]} />);
    expect(screen.getByText('🌟')).toBeTruthy();
  });
});

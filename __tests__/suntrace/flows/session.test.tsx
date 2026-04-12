/**
 * Session flow tests — UX0108-UX0250
 *
 * Tests:
 *   - BurnRiskBar (default export) — UX0108-UX0155
 *   - SessionTimer (default export) — UX0156-UX0195
 *   - GoalRing    (default export) — UX0196-UX0250
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import BurnRiskBar from '../../../templates/components/BurnRiskBar';
import SessionTimer from '../../../templates/components/SessionTimer';
import GoalRing from '../../../templates/components/GoalRing';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    { get: (_, name) => () => React.createElement('View') }
  );
});

jest.mock('@/services/api', () => ({
  calculateVitaminD: jest.fn(
    (uv: number, minutes: number, _skinType: number) => Math.round(uv * minutes * 40)
  ),
  createProfile: jest.fn(),
}));

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

// ── BurnRiskBar helpers ───────────────────────────────────────────────────────

function renderBurnRisk(overrides: Partial<{ uvIndex: number; skinType: number; minutesExposed: number }> = {}) {
  const defaults = { uvIndex: 5, skinType: 3, minutesExposed: 0 };
  return render(<BurnRiskBar {...defaults} {...overrides} />);
}

// BurnRiskBar safe time formula: safeMinutes = (200 - 10 * uvIndex) * skinTypeFactor
// skinTypeFactor for type 3 = 0.9 → (200 - 50) * 0.9 = 135

// ── Describe: BurnRiskBar — render ───────────────────────────────────────────

describe('BurnRiskBar — render', () => {
  // UX0108: mounts without crash
  it('UX0108: mounts without crash', () => {
    expect(() => renderBurnRisk()).not.toThrow();
  });

  // UX0109: renders "Burn Risk" label
  it('UX0109: renders "Burn Risk" label', () => {
    renderBurnRisk();
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  // UX0110: renders "0 min" range text
  it('UX0110: renders "0 min" range text', () => {
    renderBurnRisk({ minutesExposed: 0 });
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  // UX0111: renders safe limit text containing "min safe limit"
  it('UX0111: renders safe limit text', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3 });
    // safeMinutes = (200 - 50) * 0.9 = 135
    expect(screen.getByText('135 min safe limit')).toBeTruthy();
  });

  // UX0112: renders status for zero exposure (low risk)
  it('UX0112: status shows minutes until burn risk at 0 minutes exposed', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 0 });
    // 135 min remaining
    expect(screen.getByText('135 min until burn risk')).toBeTruthy();
  });

  // UX0113: renders status for high exposure approaching threshold
  it('UX0113: shows approaching threshold status near limit', () => {
    // safeMinutes = 135, minutesExposed = 134.6 → minutesRemaining = round(135 - 134.6) = 0
    // and not isOverLimit → "Approaching burn threshold"
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 134.6 });
    expect(screen.getByText('Approaching burn threshold')).toBeTruthy();
  });

  // UX0114: renders burn exceeded status
  it('UX0114: shows "Burn risk exceeded" when minutesExposed >= safeMinutes', () => {
    // safeMinutes = 135, minutesExposed = 200
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 200 });
    expect(screen.getByText('Burn risk exceeded — seek shade')).toBeTruthy();
  });

  // UX0115: renders "Burn Risk" with UV=0 (infinite safe time)
  it('UX0115: renders with UV=0 (no risk)', () => {
    renderBurnRisk({ uvIndex: 0, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  // UX0116: renders "0 min" label regardless of UV
  it('UX0116: "0 min" range label always present', () => {
    renderBurnRisk({ uvIndex: 10, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('0 min')).toBeTruthy();
  });

  // UX0117: renders safe limit for UV=10 skinType=3
  it('UX0117: correct safe limit for UV=10 skinType=3', () => {
    // safeMinutes = (200 - 100) * 0.9 = 90
    renderBurnRisk({ uvIndex: 10, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('90 min safe limit')).toBeTruthy();
  });

  // UX0118: renders safe limit for UV=2 skinType=1
  it('UX0118: correct safe limit for UV=2 skinType=1', () => {
    // safeMinutes = (200 - 20) * 0.5 = 90
    renderBurnRisk({ uvIndex: 2, skinType: 1, minutesExposed: 0 });
    expect(screen.getByText('90 min safe limit')).toBeTruthy();
  });

  // UX0119: render with UV=5 skinType=6
  it('UX0119: renders with skinType=6 (darkest)', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 6, minutesExposed: 0 });
    // safeMinutes = (200 - 50) * 1.8 = 270
    expect(screen.getByText('270 min safe limit')).toBeTruthy();
  });

  // UX0120: renders component without subtitle element
  it('UX0120: BurnRiskBar renders without subtitle', () => {
    renderBurnRisk();
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  // UX0121: status text for low exposure (1 minute out of 135)
  it('UX0121: correct remaining minutes at 1 min exposed', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 1 });
    // remaining = round(135 - 1) = 134
    expect(screen.getByText('134 min until burn risk')).toBeTruthy();
  });

  // UX0122: burn risk exceeded when minutesExposed equals safeMinutes exactly
  it('UX0122: burn risk exceeded exactly at safe limit', () => {
    // safeMinutes = 135
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 135 });
    expect(screen.getByText('Burn risk exceeded — seek shade')).toBeTruthy();
  });

  // UX0123: "0 min" and safe limit both rendered
  it('UX0123: both "0 min" and safe limit rendered', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('0 min')).toBeTruthy();
    expect(screen.getByText('135 min safe limit')).toBeTruthy();
  });

  // UX0124: "Burn Risk" label and status text both rendered
  it('UX0124: "Burn Risk" label and status text both rendered', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('Burn Risk')).toBeTruthy();
    expect(screen.getByText('135 min until burn risk')).toBeTruthy();
  });

  // UX0125: 50 minutes exposed out of 135 → 85 remaining
  it('UX0125: "85 min until burn risk" at 50 min exposed', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 50 });
    expect(screen.getByText('85 min until burn risk')).toBeTruthy();
  });

  // UX0126: exceeded with very large minutesExposed
  it('UX0126: burn exceeded with very large minutesExposed', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 9999 });
    expect(screen.getByText('Burn risk exceeded — seek shade')).toBeTruthy();
  });

  // UX0127: renders with skinType=1 (fairest)
  it('UX0127: renders with skinType=1 (fairest skin)', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 1, minutesExposed: 0 });
    // safeMinutes = (200 - 50) * 0.5 = 75
    expect(screen.getByText('75 min safe limit')).toBeTruthy();
  });

  // UX0128: renders with skinType=4
  it('UX0128: renders with skinType=4', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 4, minutesExposed: 0 });
    // safeMinutes = (200 - 50) * 1.1 = 165
    expect(screen.getByText('165 min safe limit')).toBeTruthy();
  });

  // UX0129: renders with skinType=5
  it('UX0129: renders with skinType=5', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 5, minutesExposed: 0 });
    // safeMinutes = (200 - 50) * 1.4 = 210
    expect(screen.getByText('210 min safe limit')).toBeTruthy();
  });

  // UX0130: renders all key text elements simultaneously
  it('UX0130: all key text elements rendered together', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('Burn Risk')).toBeTruthy();
    expect(screen.getByText('0 min')).toBeTruthy();
    expect(screen.getByText('135 min safe limit')).toBeTruthy();
  });
});

// ── Describe: BurnRiskBar — UV levels ────────────────────────────────────────

describe('BurnRiskBar — UV levels', () => {
  // UX0131: UV=0 shows 999 safe limit (capped to 999)
  it('UX0131: UV=0 renders 999 min safe limit', () => {
    renderBurnRisk({ uvIndex: 0, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('999 min safe limit')).toBeTruthy();
  });

  // UX0132: UV=2 skinType=3
  it('UX0132: UV=2 skinType=3 safe limit = 162 min', () => {
    // (200 - 20) * 0.9 = 162
    renderBurnRisk({ uvIndex: 2, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('162 min safe limit')).toBeTruthy();
  });

  // UX0133: UV=5 skinType=2
  it('UX0133: UV=5 skinType=2 safe limit = 105 min', () => {
    // (200 - 50) * 0.7 = 105
    renderBurnRisk({ uvIndex: 5, skinType: 2, minutesExposed: 0 });
    expect(screen.getByText('105 min safe limit')).toBeTruthy();
  });

  // UX0134: UV=7 skinType=3
  it('UX0134: UV=7 skinType=3 safe limit = 117 min', () => {
    // (200 - 70) * 0.9 = 117
    renderBurnRisk({ uvIndex: 7, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('117 min safe limit')).toBeTruthy();
  });

  // UX0135: UV=10 skinType=1
  it('UX0135: UV=10 skinType=1 safe limit = 50 min', () => {
    // (200 - 100) * 0.5 = 50
    renderBurnRisk({ uvIndex: 10, skinType: 1, minutesExposed: 0 });
    expect(screen.getByText('50 min safe limit')).toBeTruthy();
  });

  // UX0136: UV=12 skinType=3
  it('UX0136: UV=12 skinType=3 safe limit = 72 min', () => {
    // (200 - 120) * 0.9 = 72
    renderBurnRisk({ uvIndex: 12, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('72 min safe limit')).toBeTruthy();
  });

  // UX0137: UV=12 skinType=6
  it('UX0137: UV=12 skinType=6 safe limit = 144 min', () => {
    // (200 - 120) * 1.8 = 144
    renderBurnRisk({ uvIndex: 12, skinType: 6, minutesExposed: 0 });
    expect(screen.getByText('144 min safe limit')).toBeTruthy();
  });

  // UX0138: UV=5 skinType=1 status with 0 exposed
  it('UX0138: UV=5 skinType=1 status with 0 min', () => {
    // safeMinutes = 75, remaining = 75
    renderBurnRisk({ uvIndex: 5, skinType: 1, minutesExposed: 0 });
    expect(screen.getByText('75 min until burn risk')).toBeTruthy();
  });

  // UX0139: UV=5 skinType=2 status with 0 exposed
  it('UX0139: UV=5 skinType=2 status with 0 min', () => {
    // safeMinutes = 105, remaining = 105
    renderBurnRisk({ uvIndex: 5, skinType: 2, minutesExposed: 0 });
    expect(screen.getByText('105 min until burn risk')).toBeTruthy();
  });

  // UX0140: UV=5 skinType=4 status with 0 exposed
  it('UX0140: UV=5 skinType=4 status with 0 min', () => {
    // safeMinutes = 165, remaining = 165
    renderBurnRisk({ uvIndex: 5, skinType: 4, minutesExposed: 0 });
    expect(screen.getByText('165 min until burn risk')).toBeTruthy();
  });

  // UX0141: UV=5 skinType=5 status with 0 exposed
  it('UX0141: UV=5 skinType=5 status with 0 min', () => {
    // safeMinutes = 210, remaining = 210
    renderBurnRisk({ uvIndex: 5, skinType: 5, minutesExposed: 0 });
    expect(screen.getByText('210 min until burn risk')).toBeTruthy();
  });

  // UX0142: UV=5 skinType=6 status with 0 exposed
  it('UX0142: UV=5 skinType=6 status with 0 min', () => {
    // safeMinutes = 270, remaining = 270
    renderBurnRisk({ uvIndex: 5, skinType: 6, minutesExposed: 0 });
    expect(screen.getByText('270 min until burn risk')).toBeTruthy();
  });

  // UX0143: UV=5 skinType=1 exceeded at 76 min
  it('UX0143: UV=5 skinType=1 burn exceeded at 76 min', () => {
    renderBurnRisk({ uvIndex: 5, skinType: 1, minutesExposed: 76 });
    expect(screen.getByText('Burn risk exceeded — seek shade')).toBeTruthy();
  });

  // UX0144: UV=5 skinType=6 not exceeded at 100 min
  it('UX0144: UV=5 skinType=6 not exceeded at 100 min', () => {
    // safeMinutes = 270, still safe
    renderBurnRisk({ uvIndex: 5, skinType: 6, minutesExposed: 100 });
    expect(screen.getByText('Burn Risk')).toBeTruthy();
    expect(screen.queryByText('Burn risk exceeded — seek shade')).toBeNull();
  });

  // UX0145: UV=10 skinType=6 safe limit = 180 min
  it('UX0145: UV=10 skinType=6 safe limit = 180 min', () => {
    // (200 - 100) * 1.8 = 180
    renderBurnRisk({ uvIndex: 10, skinType: 6, minutesExposed: 0 });
    expect(screen.getByText('180 min safe limit')).toBeTruthy();
  });

  // UX0146: UV=7 skinType=1 safe limit = 65 min
  it('UX0146: UV=7 skinType=1 safe limit = 65 min', () => {
    // (200 - 70) * 0.5 = 65
    renderBurnRisk({ uvIndex: 7, skinType: 1, minutesExposed: 0 });
    expect(screen.getByText('65 min safe limit')).toBeTruthy();
  });

  // UX0147: UV=7 skinType=6 safe limit = 234 min
  it('UX0147: UV=7 skinType=6 safe limit = 234 min', () => {
    // (200 - 70) * 1.8 = 234
    renderBurnRisk({ uvIndex: 7, skinType: 6, minutesExposed: 0 });
    expect(screen.getByText('234 min safe limit')).toBeTruthy();
  });

  // UX0148: UV=2 skinType=1 safe limit = 90 min
  it('UX0148: UV=2 skinType=1 safe limit = 90 min', () => {
    // (200 - 20) * 0.5 = 90
    renderBurnRisk({ uvIndex: 2, skinType: 1, minutesExposed: 0 });
    expect(screen.getByText('90 min safe limit')).toBeTruthy();
  });

  // UX0149: UV=2 skinType=6 safe limit = 324 min
  it('UX0149: UV=2 skinType=6 safe limit = 324 min', () => {
    // (200 - 20) * 1.8 = 324
    renderBurnRisk({ uvIndex: 2, skinType: 6, minutesExposed: 0 });
    expect(screen.getByText('324 min safe limit')).toBeTruthy();
  });

  // UX0150: high UV skinType=1 approaches limit quickly
  it('UX0150: UV=12 skinType=1 safe limit = 40 min', () => {
    // (200 - 120) * 0.5 = 40
    renderBurnRisk({ uvIndex: 12, skinType: 1, minutesExposed: 0 });
    expect(screen.getByText('40 min safe limit')).toBeTruthy();
  });

  // UX0151: UV=12 skinType=1 exceeded at 41 min
  it('UX0151: UV=12 skinType=1 burn exceeded at 41 min', () => {
    renderBurnRisk({ uvIndex: 12, skinType: 1, minutesExposed: 41 });
    expect(screen.getByText('Burn risk exceeded — seek shade')).toBeTruthy();
  });

  // UX0152: "Burn Risk" label always present regardless of UV
  it('UX0152: "Burn Risk" label present at UV=0', () => {
    renderBurnRisk({ uvIndex: 0, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  // UX0153: "Burn Risk" label present at UV=12
  it('UX0153: "Burn Risk" label present at UV=12', () => {
    renderBurnRisk({ uvIndex: 12, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('Burn Risk')).toBeTruthy();
  });

  // UX0154: approaching threshold for skinType=1 at 74 min (safeMinutes=75)
  it('UX0154: approaching threshold at 74.5 min (safeMinutes=75, skinType=1)', () => {
    // remaining = round(75 - 74.5) = 1, not 0 → "1 min until burn risk"
    renderBurnRisk({ uvIndex: 5, skinType: 1, minutesExposed: 74 });
    expect(screen.getByText('1 min until burn risk')).toBeTruthy();
  });

  // UX0155: "0 min" range label always present with high UV
  it('UX0155: "0 min" range label present with UV=12', () => {
    renderBurnRisk({ uvIndex: 12, skinType: 3, minutesExposed: 0 });
    expect(screen.getByText('0 min')).toBeTruthy();
  });
});

// ── Describe: SessionTimer — render ──────────────────────────────────────────

describe('SessionTimer — render', () => {
  // UX0156: mounts without crash with startTime=null
  it('UX0156: mounts without crash when startTime=null', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />)
    ).not.toThrow();
  });

  // UX0157: shows "00:00" when startTime is null
  it('UX0157: shows "00:00" when startTime=null', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  // UX0158: shows "0" IU value when startTime=null
  it('UX0158: shows "0" IU value when startTime=null', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  // UX0159: shows " IU" unit label when startTime=null
  it('UX0159: shows " IU" unit when startTime=null', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });

  // UX0160: renders "Vitamin D accumulated" label
  it('UX0160: renders "Vitamin D accumulated" label', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  // UX0161: mounts without crash with a startTime date
  it('UX0161: mounts without crash with startTime provided', () => {
    jest.useFakeTimers();
    expect(() =>
      render(<SessionTimer startTime={new Date()} uvIndex={5} skinType={3} />)
    ).not.toThrow();
    jest.useRealTimers();
  });

  // UX0162: shows "00:00" at the exact moment startTime is set (elapsed=0)
  it('UX0162: shows a time format string with active startTime', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    // At t=0 elapsed=0 → shows "00:00"
    expect(screen.getByText('00:00')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0163: advances time shows updated timer
  it('UX0163: advances 65 seconds shows "01:05"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(65000); });
    expect(screen.getByText('01:05')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0164: advances time shows updated IU
  it('UX0164: advances 60 seconds with UV=5 shows non-zero IU', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(60000); });
    // vitaminDIU = 5 * (60/60) * 40 = 200
    expect(screen.getByText('200')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0165: "Vitamin D accumulated" present with active timer
  it('UX0165: "Vitamin D accumulated" label present with active timer', () => {
    jest.useFakeTimers();
    render(<SessionTimer startTime={new Date()} uvIndex={5} skinType={3} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0166: transitions from null to active — shows "00:00" immediately
  it('UX0166: null startTime shows "00:00"', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  // UX0167: " IU" unit text present with active timer
  it('UX0167: " IU" unit text present with active timer', () => {
    jest.useFakeTimers();
    render(<SessionTimer startTime={new Date()} uvIndex={5} skinType={3} />);
    expect(screen.getByText(' IU')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0168: elapsed 120 seconds shows "02:00"
  it('UX0168: 120 seconds elapsed shows "02:00"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(120000); });
    expect(screen.getByText('02:00')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0169: elapsed 5 seconds shows "00:05"
  it('UX0169: 5 seconds elapsed shows "00:05"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText('00:05')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0170: elapsed 600 seconds shows "10:00"
  it('UX0170: 600 seconds elapsed shows "10:00"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(600000); });
    expect(screen.getByText('10:00')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0171: UV=0 shows "0" IU when null startTime
  it('UX0171: UV=0 shows "0" IU at startTime=null', () => {
    render(<SessionTimer startTime={null} uvIndex={0} skinType={3} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  // UX0172: null startTime shows "Vitamin D accumulated" label
  it('UX0172: "Vitamin D accumulated" label always present', () => {
    render(<SessionTimer startTime={null} uvIndex={0} skinType={3} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  // UX0173: re-render with null startTime resets to "00:00"
  it('UX0173: re-render with startTime=null resets timer to "00:00"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    const { rerender } = render(
      <SessionTimer startTime={startTime} uvIndex={5} skinType={3} />
    );
    act(() => { jest.advanceTimersByTime(5000); });
    act(() => { rerender(<SessionTimer startTime={null} uvIndex={5} skinType={3} />); });
    expect(screen.getByText('00:00')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0174: re-render with null startTime resets IU to "0"
  it('UX0174: re-render with startTime=null resets IU to "0"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    const { rerender } = render(
      <SessionTimer startTime={startTime} uvIndex={5} skinType={3} />
    );
    act(() => { jest.advanceTimersByTime(60000); });
    act(() => { rerender(<SessionTimer startTime={null} uvIndex={5} skinType={3} />); });
    expect(screen.getByText('0')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0175: " IU" unit label present with null startTime
  it('UX0175: " IU" unit always present at null startTime', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText(' IU')).toBeTruthy();
  });
});

// ── Describe: SessionTimer — props ───────────────────────────────────────────

describe('SessionTimer — props', () => {
  // UX0176: different uvIndex=0 — 60s → 0 IU
  it('UX0176: UV=0 yields 0 IU after 60s', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={0} skinType={3} />);
    jest.advanceTimersByTime(60000);
    // calculateVitaminD mock: 0 * (60/60) * 40 = 0
    expect(screen.getByText('0')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0177: uvIndex=10 — 60s → 400 IU
  it('UX0177: UV=10 yields 400 IU after 60s', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={10} skinType={3} />);
    act(() => { jest.advanceTimersByTime(60000); });
    // mock: 10 * 1 * 40 = 400
    expect(screen.getByText('400')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0178: skinType=1 renders without crash
  it('UX0178: skinType=1 renders without crash', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={5} skinType={1} />)
    ).not.toThrow();
  });

  // UX0179: skinType=6 renders without crash
  it('UX0179: skinType=6 renders without crash', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={5} skinType={6} />)
    ).not.toThrow();
  });

  // UX0180: different uvIndex values render "Vitamin D accumulated"
  it('UX0180: "Vitamin D accumulated" present with UV=1', () => {
    render(<SessionTimer startTime={null} uvIndex={1} skinType={3} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
  });

  // UX0181: UV=3 renders without crash
  it('UX0181: UV=3 renders without crash', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={3} skinType={3} />)
    ).not.toThrow();
  });

  // UX0182: UV=7 renders without crash
  it('UX0182: UV=7 renders without crash', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={7} skinType={3} />)
    ).not.toThrow();
  });

  // UX0183: UV=12 renders without crash
  it('UX0183: UV=12 renders without crash', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={12} skinType={3} />)
    ).not.toThrow();
  });

  // UX0184: skinType=2 renders without crash
  it('UX0184: skinType=2 renders without crash', () => {
    expect(() =>
      render(<SessionTimer startTime={null} uvIndex={5} skinType={2} />)
    ).not.toThrow();
  });

  // UX0185: skinType=3 renders "00:00" at null startTime
  it('UX0185: skinType=3 shows "00:00" at null startTime', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={3} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  // UX0186: skinType=4 shows "00:00" at null startTime
  it('UX0186: skinType=4 shows "00:00" at null startTime', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={4} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  // UX0187: skinType=5 shows "00:00" at null startTime
  it('UX0187: skinType=5 shows "00:00" at null startTime', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={5} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  // UX0188: skinType=6 shows "00:00" at null startTime
  it('UX0188: skinType=6 shows "00:00" at null startTime', () => {
    render(<SessionTimer startTime={null} uvIndex={5} skinType={6} />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  // UX0189: UV=5 with 30s elapsed shows "00:30"
  it('UX0189: UV=5 with 30s elapsed shows "00:30"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(30000); });
    expect(screen.getByText('00:30')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0190: UV=5 with 90s elapsed shows "01:30"
  it('UX0190: UV=5 with 90s elapsed shows "01:30"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(90000); });
    expect(screen.getByText('01:30')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0191: onUpdate callback called on tick
  it('UX0191: onUpdate callback is called after timer tick', () => {
    jest.useFakeTimers();
    const onUpdate = jest.fn();
    const startTime = new Date();
    render(
      <SessionTimer
        startTime={startTime}
        uvIndex={5}
        skinType={3}
        onUpdate={onUpdate}
      />
    );
    act(() => { jest.advanceTimersByTime(1000); });
    expect(onUpdate).toHaveBeenCalled();
    jest.useRealTimers();
  });

  // UX0192: onUpdate not called when startTime=null
  it('UX0192: onUpdate not called when startTime=null', () => {
    const onUpdate = jest.fn();
    render(
      <SessionTimer
        startTime={null}
        uvIndex={5}
        skinType={3}
        onUpdate={onUpdate}
      />
    );
    expect(onUpdate).not.toHaveBeenCalled();
  });

  // UX0193: UV=5 180s elapsed shows "03:00"
  it('UX0193: 180s elapsed shows "03:00"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(180000); });
    expect(screen.getByText('03:00')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0194: "Vitamin D accumulated" always present with active timer
  it('UX0194: "Vitamin D accumulated" present with active timer UV=10', () => {
    jest.useFakeTimers();
    render(<SessionTimer startTime={new Date()} uvIndex={10} skinType={1} />);
    expect(screen.getByText('Vitamin D accumulated')).toBeTruthy();
    jest.useRealTimers();
  });

  // UX0195: UV=5 300s elapsed shows "05:00"
  it('UX0195: 300s elapsed shows "05:00"', () => {
    jest.useFakeTimers();
    const startTime = new Date();
    render(<SessionTimer startTime={startTime} uvIndex={5} skinType={3} />);
    act(() => { jest.advanceTimersByTime(300000); });
    expect(screen.getByText('05:00')).toBeTruthy();
    jest.useRealTimers();
  });
});

// ── Describe: GoalRing — render ───────────────────────────────────────────────

describe('GoalRing — render', () => {
  // UX0196: mounts without crash
  it('UX0196: mounts without crash', () => {
    expect(() => render(<GoalRing progress={0.5} />)).not.toThrow();
  });

  // UX0197: default label shows percentage (progress=0.65 → "65%")
  it('UX0197: default label shows "65%"', () => {
    render(<GoalRing progress={0.65} />);
    expect(screen.getByText('65%')).toBeTruthy();
  });

  // UX0198: custom label overrides default percentage
  it('UX0198: custom label "Daily Goal" shown instead of percentage', () => {
    render(<GoalRing progress={0.5} label="Daily Goal" />);
    expect(screen.getByText('Daily Goal')).toBeTruthy();
  });

  // UX0199: sublabel shown when provided
  it('UX0199: sublabel rendered when provided', () => {
    render(<GoalRing progress={0.5} sublabel="of daily target" />);
    expect(screen.getByText('of daily target')).toBeTruthy();
  });

  // UX0200: sublabel absent when not provided
  it('UX0200: sublabel absent when not provided', () => {
    render(<GoalRing progress={0.5} />);
    expect(screen.queryByText('of daily target')).toBeNull();
  });

  // UX0201: progress=0 shows "0%"
  it('UX0201: progress=0 shows "0%"', () => {
    render(<GoalRing progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // UX0202: progress=1 shows "100%"
  it('UX0202: progress=1 shows "100%"', () => {
    render(<GoalRing progress={1} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0203: progress=0.5 default label shows "50%"
  it('UX0203: progress=0.5 shows "50%"', () => {
    render(<GoalRing progress={0.5} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  // UX0204: progress=0.25 default label shows "25%"
  it('UX0204: progress=0.25 shows "25%"', () => {
    render(<GoalRing progress={0.25} />);
    expect(screen.getByText('25%')).toBeTruthy();
  });

  // UX0205: progress=0.75 default label shows "75%"
  it('UX0205: progress=0.75 shows "75%"', () => {
    render(<GoalRing progress={0.75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  // UX0206: custom label with sublabel both shown
  it('UX0206: custom label and sublabel both shown', () => {
    render(<GoalRing progress={0.5} label="500 IU" sublabel="of 1000 IU" />);
    expect(screen.getByText('500 IU')).toBeTruthy();
    expect(screen.getByText('of 1000 IU')).toBeTruthy();
  });

  // UX0207: custom label does not show percentage
  it('UX0207: custom label does not show auto-percentage', () => {
    render(<GoalRing progress={0.5} label="Halfway" />);
    expect(screen.queryByText('50%')).toBeNull();
    expect(screen.getByText('Halfway')).toBeTruthy();
  });

  // UX0208: renders at default size (no size prop)
  it('UX0208: renders without size prop', () => {
    expect(() => render(<GoalRing progress={0.5} />)).not.toThrow();
  });

  // UX0209: progress=0.1 shows "10%"
  it('UX0209: progress=0.1 shows "10%"', () => {
    render(<GoalRing progress={0.1} />);
    expect(screen.getByText('10%')).toBeTruthy();
  });

  // UX0210: progress=0.9 shows "90%"
  it('UX0210: progress=0.9 shows "90%"', () => {
    render(<GoalRing progress={0.9} />);
    expect(screen.getByText('90%')).toBeTruthy();
  });

  // UX0211: negative progress clamped to "0%"
  it('UX0211: negative progress shows "0%" (clamped)', () => {
    render(<GoalRing progress={-0.5} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // UX0212: progress > 1 clamped to "100%"
  it('UX0212: progress > 1 shows "100%" (clamped)', () => {
    render(<GoalRing progress={1.5} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0213: sublabel text shows correctly
  it('UX0213: sublabel "min today" shows correctly', () => {
    render(<GoalRing progress={0.4} sublabel="min today" />);
    expect(screen.getByText('min today')).toBeTruthy();
  });

  // UX0214: custom label empty string renders without crash
  it('UX0214: empty string custom label renders without crash', () => {
    expect(() => render(<GoalRing progress={0.5} label="" />)).not.toThrow();
  });

  // UX0215: renders with all optional props provided
  it('UX0215: renders with all optional props (size, label, sublabel)', () => {
    render(<GoalRing progress={0.6} size={200} label="60%" sublabel="of goal" />);
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('of goal')).toBeTruthy();
  });
});

// ── Describe: GoalRing — progress values ─────────────────────────────────────

describe('GoalRing — progress values', () => {
  // UX0216: 0% (progress=0)
  it('UX0216: progress=0 renders "0%"', () => {
    render(<GoalRing progress={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // UX0217: 25% (progress=0.25)
  it('UX0217: progress=0.25 renders "25%"', () => {
    render(<GoalRing progress={0.25} />);
    expect(screen.getByText('25%')).toBeTruthy();
  });

  // UX0218: 50% (progress=0.5)
  it('UX0218: progress=0.5 renders "50%"', () => {
    render(<GoalRing progress={0.5} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  // UX0219: 75% (progress=0.75)
  it('UX0219: progress=0.75 renders "75%"', () => {
    render(<GoalRing progress={0.75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  // UX0220: 100% (progress=1)
  it('UX0220: progress=1 renders "100%"', () => {
    render(<GoalRing progress={1} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0221: negative (clamped to 0%)
  it('UX0221: progress=-1 renders "0%" (clamped)', () => {
    render(<GoalRing progress={-1} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // UX0222: > 1 (clamped to 100%)
  it('UX0222: progress=2 renders "100%" (clamped)', () => {
    render(<GoalRing progress={2} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0223: progress=0.33 → "33%"
  it('UX0223: progress=0.33 renders "33%"', () => {
    render(<GoalRing progress={0.33} />);
    expect(screen.getByText('33%')).toBeTruthy();
  });

  // UX0224: progress=0.67 → "67%"
  it('UX0224: progress=0.67 renders "67%"', () => {
    render(<GoalRing progress={0.67} />);
    expect(screen.getByText('67%')).toBeTruthy();
  });

  // UX0225: progress=0.01 → "1%"
  it('UX0225: progress=0.01 renders "1%"', () => {
    render(<GoalRing progress={0.01} />);
    expect(screen.getByText('1%')).toBeTruthy();
  });

  // UX0226: progress=0.99 → "99%"
  it('UX0226: progress=0.99 renders "99%"', () => {
    render(<GoalRing progress={0.99} />);
    expect(screen.getByText('99%')).toBeTruthy();
  });

  // UX0227: progress=0.5 with sublabel
  it('UX0227: progress=0.5 with sublabel both render', () => {
    render(<GoalRing progress={0.5} sublabel="halfway" />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('halfway')).toBeTruthy();
  });

  // UX0228: progress=1 with sublabel
  it('UX0228: progress=1 with sublabel both render', () => {
    render(<GoalRing progress={1} sublabel="complete!" />);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('complete!')).toBeTruthy();
  });

  // UX0229: progress=0 with sublabel
  it('UX0229: progress=0 with sublabel both render', () => {
    render(<GoalRing progress={0} sublabel="not started" />);
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('not started')).toBeTruthy();
  });

  // UX0230: progress=0.4 with custom label overrides percentage
  it('UX0230: progress=0.4 with custom label does not show "40%"', () => {
    render(<GoalRing progress={0.4} label="400 IU" />);
    expect(screen.queryByText('40%')).toBeNull();
    expect(screen.getByText('400 IU')).toBeTruthy();
  });

  // UX0231: negative clamped — no negative percentage shown
  it('UX0231: no negative percentage shown for progress=-0.1', () => {
    render(<GoalRing progress={-0.1} />);
    expect(screen.queryByText('-10%')).toBeNull();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // UX0232: > 1 clamped — no > 100% shown
  it('UX0232: no >100% shown for progress=1.1', () => {
    render(<GoalRing progress={1.1} />);
    expect(screen.queryByText('110%')).toBeNull();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0233: progress=0.8 → "80%"
  it('UX0233: progress=0.8 renders "80%"', () => {
    render(<GoalRing progress={0.8} />);
    expect(screen.getByText('80%')).toBeTruthy();
  });

  // UX0234: progress=0.2 → "20%"
  it('UX0234: progress=0.2 renders "20%"', () => {
    render(<GoalRing progress={0.2} />);
    expect(screen.getByText('20%')).toBeTruthy();
  });

  // UX0235: re-render with new progress updates label
  it('UX0235: re-render with new progress updates label', () => {
    const { rerender } = render(<GoalRing progress={0.25} />);
    expect(screen.getByText('25%')).toBeTruthy();
    rerender(<GoalRing progress={0.75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });
});

// ── Describe: GoalRing — size prop ────────────────────────────────────────────

describe('GoalRing — size prop', () => {
  // UX0236: renders with size=80
  it('UX0236: renders with size=80', () => {
    expect(() => render(<GoalRing progress={0.5} size={80} />)).not.toThrow();
  });

  // UX0237: renders with size=120 (default)
  it('UX0237: renders with size=120', () => {
    expect(() => render(<GoalRing progress={0.5} size={120} />)).not.toThrow();
  });

  // UX0238: renders with size=160
  it('UX0238: renders with size=160', () => {
    expect(() => render(<GoalRing progress={0.5} size={160} />)).not.toThrow();
  });

  // UX0239: renders with size=200
  it('UX0239: renders with size=200', () => {
    expect(() => render(<GoalRing progress={0.5} size={200} />)).not.toThrow();
  });

  // UX0240: size=80 still shows label
  it('UX0240: size=80 still shows default percentage label', () => {
    render(<GoalRing progress={0.5} size={80} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  // UX0241: size=200 still shows label
  it('UX0241: size=200 still shows default percentage label', () => {
    render(<GoalRing progress={0.5} size={200} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  // UX0242: size=50 renders without crash
  it('UX0242: renders with size=50', () => {
    expect(() => render(<GoalRing progress={0.5} size={50} />)).not.toThrow();
  });

  // UX0243: size=300 renders without crash
  it('UX0243: renders with size=300', () => {
    expect(() => render(<GoalRing progress={0.5} size={300} />)).not.toThrow();
  });

  // UX0244: size=100 with custom label
  it('UX0244: size=100 with custom label shows label', () => {
    render(<GoalRing progress={0.6} size={100} label="60 min" />);
    expect(screen.getByText('60 min')).toBeTruthy();
  });

  // UX0245: size=150 with sublabel
  it('UX0245: size=150 with sublabel shows sublabel', () => {
    render(<GoalRing progress={0.4} size={150} sublabel="today" />);
    expect(screen.getByText('today')).toBeTruthy();
  });

  // UX0246: no size prop renders without crash
  it('UX0246: no size prop uses default (120) and renders', () => {
    expect(() => render(<GoalRing progress={0.3} />)).not.toThrow();
  });

  // UX0247: size=80 with sublabel both rendered
  it('UX0247: size=80 with sublabel renders label and sublabel', () => {
    render(<GoalRing progress={0.5} size={80} label="50%" sublabel="done" />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('done')).toBeTruthy();
  });

  // UX0248: size=200 with all props
  it('UX0248: size=200 with label and sublabel both shown', () => {
    render(<GoalRing progress={1} size={200} label="Complete" sublabel="100%" />);
    expect(screen.getByText('Complete')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0249: different sizes do not affect progress clamping
  it('UX0249: size=300 still clamps progress>1 to 100%', () => {
    render(<GoalRing progress={2} size={300} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  // UX0250: different sizes do not affect progress=0 label
  it('UX0250: size=50 still shows "0%" for progress=0', () => {
    render(<GoalRing progress={0} size={50} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });
});

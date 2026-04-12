/**
 * Unit tests for ProGate component.
 * F2065: renders children when subscription tier is 'pro'
 * F2066: renders paywall nudge when tier is 'free'
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProGate } from '../../templates/components/ProGate';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Lock: () => null,
  Zap: () => null,
}));

// ── F2065: Pro tier renders children ─────────────────────────────────────────

describe('ProGate — pro tier', () => {
  it('renders children when subscription tier is "pro"', () => {
    render(
      <ProGate tier="pro" feature="7-day forecast">
        <></>
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('renders children content for pro users', () => {
    const { getByText } = render(
      <ProGate tier="pro">
        <></>
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('renders children when subscription tier is "family"', () => {
    render(
      <ProGate tier="family" feature="AI coach">
        <></>
      </ProGate>,
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });
});

// ── F2066: Free tier shows paywall nudge ──────────────────────────────────────

describe('ProGate — free tier', () => {
  it('renders paywall nudge when tier is "free"', () => {
    render(
      <ProGate tier="free" feature="7-day forecast">
        <></>
      </ProGate>,
    );
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('shows upgrade button in paywall nudge', () => {
    render(
      <ProGate tier="free">
        <></>
      </ProGate>,
    );
    expect(screen.getByTestId('upgrade-button')).toBeTruthy();
  });

  it('shows feature name in paywall nudge', () => {
    render(
      <ProGate tier="free" feature="Sun Spot Map">
        <></>
      </ProGate>,
    );
    expect(screen.getByText('Unlock Sun Spot Map')).toBeTruthy();
  });

  it('renders custom paywallNudge override when provided', () => {
    const CustomNudge = () => <></>;
    render(
      <ProGate
        tier="free"
        paywallNudge={<CustomNudge />}
      >
        <></>
      </ProGate>,
    );
    // Default paywall-nudge testID should not appear
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });
});

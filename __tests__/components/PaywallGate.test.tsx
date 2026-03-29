/**
 * Tests for PaywallGate component
 * Covers: impression tracking, CTA click tracking, access control, graceful error handling
 *
 * Pattern: use plain render() + waitFor() — consistent with PaywallRouter.test.tsx.
 * Do not use act(async) — not supported in this version of testing-library.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaywallGate } from '@/components/PaywallGate';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockTrackPaywallEvent = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/paywallAnalytics', () => ({
  trackPaywallEvent: (...args: any[]) => mockTrackPaywallEvent(...args),
}));

const MockPaywallRouter = jest.fn(() => null);
jest.mock('@/components/paywall/PaywallRouter', () => ({
  PaywallRouter: (...args: any[]) => MockPaywallRouter(...args),
}));

// Inline config to avoid jest.mock hoisting issues with module-level variables
jest.mock('@/providers/PaywallProvider', () => ({
  usePaywall: jest.fn(() => ({
    config: {
      permissions: [
        { feature_area: 'ai_messages', can_access: false, access_level: 'premium_only' },
        { feature_area: 'contacts', can_access: true, access_level: 'all' },
      ],
    },
    userState: { isPremium: false, isTrialExpired: true },
    checkPaywall: jest.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeGate(props: Partial<React.ComponentProps<typeof PaywallGate>> = {}) {
  return (
    <PaywallGate featureArea="ai_messages" showAsModal {...props}>
      <></>
    </PaywallGate>
  );
}

function resetToDefault() {
  const { usePaywall } = require('@/providers/PaywallProvider');
  usePaywall.mockReturnValue({
    config: {
      permissions: [
        { feature_area: 'ai_messages', can_access: false, access_level: 'premium_only' },
        { feature_area: 'contacts', can_access: true, access_level: 'all' },
      ],
    },
    userState: { isPremium: false, isTrialExpired: true },
    checkPaywall: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  MockPaywallRouter.mockClear();
  mockTrackPaywallEvent.mockResolvedValue(undefined);
  resetToDefault();
});

// ── Access control (checked via impression side-effects) ──────────────────

describe('PaywallGate — access control', () => {
  it('does NOT fire impression for premium users — access is granted immediately', async () => {
    const { usePaywall } = require('@/providers/PaywallProvider');
    usePaywall.mockReturnValue({
      config: { permissions: [] },
      userState: { isPremium: true, isTrialExpired: false },
      checkPaywall: jest.fn(),
    });

    render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));

    // Allow effects to run
    await waitFor(() => {
      const impressionCalls = mockTrackPaywallEvent.mock.calls.filter(([e]) => e === 'impression');
      expect(impressionCalls).toHaveLength(0);
    });
  });

  it('shows Unlock Now button when feature is blocked', async () => {
    const { getByText } = render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));
    await waitFor(() => expect(getByText('Unlock Now')).toBeTruthy());
  });

  it('does not show Unlock Now when feature is allowed', async () => {
    // Feature 'contacts' has can_access: true — gate should pass children through
    const { queryByText } = render(makeGate({ featureArea: 'contacts', showAsModal: true }));

    // After effects settle: no locked UI
    await waitFor(() => {
      expect(queryByText('Unlock Now')).toBeNull();
    });
  });
});

// ── Impression tracking ────────────────────────────────────────────────────

describe('PaywallGate — impression tracking', () => {
  it('fires impression when feature is blocked by backend config', async () => {
    render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));

    await waitFor(() => {
      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'impression',
        expect.objectContaining({
          source: 'backend_config',
          feature_area: 'ai_messages',
          trigger: 'permission_denied',
        })
      );
    });
  });

  it('fires impression with access_level in metadata', async () => {
    render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));

    await waitFor(() => {
      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'impression',
        expect.objectContaining({ access_level: 'premium_only' })
      );
    });
  });

  it('fires impression with source=missing_config for unknown feature areas', async () => {
    render(makeGate({ featureArea: 'nonexistent_feature', showAsModal: true }));

    await waitFor(() => {
      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'impression',
        expect.objectContaining({
          source: 'missing_config',
          feature_area: 'nonexistent_feature',
        })
      );
    });
  });

  it('does NOT fire impression when feature is allowed', async () => {
    render(makeGate({ featureArea: 'contacts', showAsModal: true }));

    await waitFor(() => {
      const impressionCalls = mockTrackPaywallEvent.mock.calls.filter(([e]) => e === 'impression');
      expect(impressionCalls).toHaveLength(0);
    });
  });
});

// ── CTA click tracking ─────────────────────────────────────────────────────

describe('PaywallGate — CTA click tracking', () => {
  it('fires cta_click with correct metadata when Unlock Now is pressed', async () => {
    const { getByText } = render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));

    await waitFor(() => expect(getByText('Unlock Now')).toBeTruthy());
    fireEvent.press(getByText('Unlock Now'));

    await waitFor(() => {
      expect(mockTrackPaywallEvent).toHaveBeenCalledWith(
        'cta_click',
        expect.objectContaining({
          source: 'paywall_gate',
          feature_area: 'ai_messages',
          trigger: 'unlock_now_button',
        })
      );
    });
  });

  it('does not fire cta_click before button is pressed', async () => {
    render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));

    // Wait for impression to fire (proving effects settled)
    await waitFor(() => {
      expect(mockTrackPaywallEvent).toHaveBeenCalledWith('impression', expect.anything());
    });

    // But no cta_click yet
    const ctaCalls = mockTrackPaywallEvent.mock.calls.filter(([e]) => e === 'cta_click');
    expect(ctaCalls).toHaveLength(0);
  });

  it('fires impression BEFORE cta_click — correct event order', async () => {
    const { getByText } = render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));

    await waitFor(() => expect(getByText('Unlock Now')).toBeTruthy());
    fireEvent.press(getByText('Unlock Now'));

    await waitFor(() => {
      expect(mockTrackPaywallEvent).toHaveBeenCalledWith('cta_click', expect.anything());
    });

    const calls = mockTrackPaywallEvent.mock.calls.map(([e]) => e);
    expect(calls.indexOf('impression')).toBeLessThan(calls.indexOf('cta_click'));
  });

  it('still opens paywall modal when tracking throws', async () => {
    mockTrackPaywallEvent.mockImplementation((evt: string) => {
      if (evt === 'cta_click') return Promise.reject(new Error('network error'));
      return Promise.resolve();
    });

    const { getByText } = render(makeGate({ featureArea: 'ai_messages', showAsModal: true }));
    await waitFor(() => expect(getByText('Unlock Now')).toBeTruthy());

    // Press should not throw
    fireEvent.press(getByText('Unlock Now'));

    // PaywallRouter should render inside the modal
    await waitFor(() => expect(MockPaywallRouter).toHaveBeenCalled());
  });
});

// ── Inline mode ────────────────────────────────────────────────────────────

describe('PaywallGate — inline mode', () => {
  it('renders PaywallRouter inline when access is denied and showAsModal=false', async () => {
    render(makeGate({ featureArea: 'ai_messages', showAsModal: false }));
    await waitFor(() => expect(MockPaywallRouter).toHaveBeenCalled());
  });

  it('does NOT render PaywallRouter when access is granted inline', async () => {
    render(makeGate({ featureArea: 'contacts', showAsModal: false }));

    await waitFor(() => {
      // Impression never fired = access was granted = no PaywallRouter
      const impressionCalls = mockTrackPaywallEvent.mock.calls.filter(([e]) => e === 'impression');
      expect(impressionCalls).toHaveLength(0);
    });
    expect(MockPaywallRouter).not.toHaveBeenCalled();
  });
});

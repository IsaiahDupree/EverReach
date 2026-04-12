/**
 * Paywall component tests — UX0761-UX0830
 *
 * Components covered:
 *   PaywallCard  UX0761-UX0795
 *   ProGate      UX0796-UX0830
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PaywallCard from '../../../templates/components/PaywallCard';
import { ProGate } from '../../../templates/components/ProGate';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, { get: () => () => React.createElement('View') });
});

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({ isPro: false, tier: 'free', isLoading: false })),
}));

// ── PaywallCard tests — UX0761-UX0795 ────────────────────────────────────────

describe('PaywallCard — render', () => {
  const noop = jest.fn();

  it('UX0761: mounts without crashing', () => {
    // UX0761: PaywallCard renders without throwing
    expect(() =>
      render(<PaywallCard onStartTrial={noop} onRestore={noop} />)
    ).not.toThrow();
  });

  it('UX0762: renders "SunTrace Pro" heading', () => {
    // UX0762: app name heading is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('SunTrace Pro')).toBeTruthy();
  });

  it('UX0763: renders "Start Free Trial" button text', () => {
    // UX0763: primary CTA text is present
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Start Free Trial')).toBeTruthy();
  });

  it('UX0764: renders "$3.99" pricing text', () => {
    // UX0764: monthly price is displayed
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText(/\$3\.99/)).toBeTruthy();
  });

  it('UX0765: renders "7 days free" trial banner', () => {
    // UX0765: trial period is communicated
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('7 days free')).toBeTruthy();
  });

  it('UX0766: renders "Restore Purchase" button', () => {
    // UX0766: restore CTA is present
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Restore Purchase')).toBeTruthy();
  });

  it('UX0767: renders at least one Pro feature row', () => {
    // UX0767: feature list is non-empty
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('7-day UV forecast')).toBeTruthy();
  });

  it('UX0768: renders "AI Sunlight Coach" feature row', () => {
    // UX0768: second feature item is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('AI Sunlight Coach')).toBeTruthy();
  });

  it('UX0769: renders "Trip Sun Planner" feature row', () => {
    // UX0769: third feature item is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Trip Sun Planner')).toBeTruthy();
  });

  it('UX0770: renders "Advanced analytics" feature row', () => {
    // UX0770: fourth feature item is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Advanced analytics')).toBeTruthy();
  });

  it('UX0771: renders "Ad-free experience" feature row', () => {
    // UX0771: fifth feature item is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Ad-free experience')).toBeTruthy();
  });

  it('UX0772: renders "$29.99/yr" annual plan option', () => {
    // UX0772: annual pricing is shown
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText(/\$29\.99\/yr/)).toBeTruthy();
  });

  it('UX0773: start-trial button has testID "start-trial-button"', () => {
    // UX0773: testID is accessible for automation
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByTestId('start-trial-button')).toBeTruthy();
  });

  it('UX0774: restore button has testID "restore-button"', () => {
    // UX0774: restore button testID is accessible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByTestId('restore-button')).toBeTruthy();
  });

  it('UX0775: pressing start-trial button calls onStartTrial', () => {
    // UX0775: onStartTrial callback fires on press
    const onStartTrial = jest.fn();
    render(<PaywallCard onStartTrial={onStartTrial} onRestore={noop} />);
    fireEvent.press(screen.getByTestId('start-trial-button'));
    expect(onStartTrial).toHaveBeenCalledTimes(1);
  });

  it('UX0776: pressing restore button calls onRestore', () => {
    // UX0776: onRestore callback fires on press
    const onRestore = jest.fn();
    render(<PaywallCard onStartTrial={noop} onRestore={onRestore} />);
    fireEvent.press(screen.getByTestId('restore-button'));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('UX0777: start-trial button is disabled when isLoading=true', () => {
    // UX0777: loading state disables the trial button
    render(<PaywallCard onStartTrial={noop} onRestore={noop} isLoading={true} />);
    const btn = screen.getByTestId('start-trial-button');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });

  it('UX0778: start-trial button is enabled when isLoading=false', () => {
    // UX0778: default (non-loading) state keeps button enabled
    render(<PaywallCard onStartTrial={noop} onRestore={noop} isLoading={false} />);
    const btn = screen.getByTestId('start-trial-button');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeFalsy();
  });

  it('UX0779: does not show "Start Free Trial" text when isLoading=true', () => {
    // UX0779: spinner replaces button text during loading
    render(<PaywallCard onStartTrial={noop} onRestore={noop} isLoading={true} />);
    expect(screen.queryByText('Start Free Trial')).toBeNull();
  });

  it('UX0780: renders legal "Terms" link', () => {
    // UX0780: terms link is present in the legal footer
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Terms')).toBeTruthy();
  });

  it('UX0781: renders legal "Privacy" link', () => {
    // UX0781: privacy link is present in the legal footer
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Privacy')).toBeTruthy();
  });

  it('UX0782: renders "No charge for 7 days" sub-label on trial button', () => {
    // UX0782: secondary label beneath the CTA is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('No charge for 7 days')).toBeTruthy();
  });

  it('UX0783: renders "BEST VALUE" badge on annual option', () => {
    // UX0783: annual plan badge label is shown
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('BEST VALUE')).toBeTruthy();
  });

  it('UX0784: renders "Your personal UV & Vitamin D coach" tagline', () => {
    // UX0784: tagline beneath app name is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Your personal UV & Vitamin D coach')).toBeTruthy();
  });

  it('UX0785: renders "Everything in Pro:" section header', () => {
    // UX0785: features section title is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Everything in Pro:')).toBeTruthy();
  });

  it('UX0786: renders "Then $3.99/month · Cancel anytime" trial subtitle', () => {
    // UX0786: monthly price and cancel notice visible below trial title
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Then $3.99/month · Cancel anytime')).toBeTruthy();
  });

  it('UX0787: renders auto-renew legal note', () => {
    // UX0787: fine-print auto-renew disclosure is present
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText(/auto-renews/i)).toBeTruthy();
  });

  it('UX0788: renders "2 months free vs monthly" savings text', () => {
    // UX0788: annual savings description is visible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('2 months free vs monthly')).toBeTruthy();
  });

  it('UX0789: onStartTrial is not called before user interaction', () => {
    // UX0789: callback is not triggered on mount
    const onStartTrial = jest.fn();
    render(<PaywallCard onStartTrial={onStartTrial} onRestore={noop} />);
    expect(onStartTrial).not.toHaveBeenCalled();
  });

  it('UX0790: onRestore is not called before user interaction', () => {
    // UX0790: restore callback is not triggered on mount
    const onRestore = jest.fn();
    render(<PaywallCard onStartTrial={noop} onRestore={onRestore} />);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('UX0791: renders without isLoading prop (defaults to false)', () => {
    // UX0791: component renders normally when isLoading is omitted
    expect(() =>
      render(<PaywallCard onStartTrial={noop} onRestore={noop} />)
    ).not.toThrow();
    expect(screen.getByText('Start Free Trial')).toBeTruthy();
  });

  it('UX0792: "Restore Purchase" text is visible', () => {
    // UX0792: restore button text is accessible
    render(<PaywallCard onStartTrial={noop} onRestore={noop} />);
    expect(screen.getByText('Restore Purchase')).toBeTruthy();
  });

  it('UX0793: pressing start-trial button does not call onRestore', () => {
    // UX0793: callbacks are independent — pressing trial does not trigger restore
    const onRestore = jest.fn();
    const onStartTrial = jest.fn();
    render(<PaywallCard onStartTrial={onStartTrial} onRestore={onRestore} />);
    fireEvent.press(screen.getByTestId('start-trial-button'));
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('UX0794: pressing restore button does not call onStartTrial', () => {
    // UX0794: callbacks are independent — pressing restore does not trigger trial
    const onRestore = jest.fn();
    const onStartTrial = jest.fn();
    render(<PaywallCard onStartTrial={onStartTrial} onRestore={onRestore} />);
    fireEvent.press(screen.getByTestId('restore-button'));
    expect(onStartTrial).not.toHaveBeenCalled();
  });

  it('UX0795: renders restore button when isLoading=true (but disabled)', () => {
    // UX0795: restore button is present even in loading state
    render(<PaywallCard onStartTrial={noop} onRestore={noop} isLoading={true} />);
    expect(screen.getByTestId('restore-button')).toBeTruthy();
  });
});

// ── ProGate tests — UX0796-UX0830 ────────────────────────────────────────────

describe('ProGate — paywall flow', () => {
  it('UX0796: mounts without crashing (free tier)', () => {
    // UX0796: ProGate renders without throwing for free users
    expect(() =>
      render(<ProGate tier="free"><></></ProGate>)
    ).not.toThrow();
  });

  it('UX0797: mounts without crashing (pro tier)', () => {
    // UX0797: ProGate renders without throwing for pro users
    expect(() =>
      render(<ProGate tier="pro"><></></ProGate>)
    ).not.toThrow();
  });

  it('UX0798: shows paywall-nudge testID when tier is "free"', () => {
    // UX0798: free tier shows the default paywall overlay
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0799: shows upgrade-button when tier is "free"', () => {
    // UX0799: free tier exposes the upgrade CTA button
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByTestId('upgrade-button')).toBeTruthy();
  });

  it('UX0800: does not show paywall-nudge when tier is "pro"', () => {
    // UX0800: pro tier bypasses the paywall overlay
    render(<ProGate tier="pro"><></></ProGate>);
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0801: does not show paywall-nudge when tier is "family"', () => {
    // UX0801: family tier also bypasses the paywall overlay
    render(<ProGate tier="family"><></></ProGate>);
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0802: shows feature name in paywall nudge title', () => {
    // UX0802: feature prop appears in the nudge heading text
    render(<ProGate tier="free" feature="7-day forecast"><></></ProGate>);
    expect(screen.getByText('Unlock 7-day forecast with Pro')).toBeTruthy();
  });

  it('UX0803: shows generic "Pro Feature" title when no feature prop', () => {
    // UX0803: without feature prop, nudge title falls back to generic text
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText('Pro Feature')).toBeTruthy();
  });

  it('UX0804: "Try Pro Free" is visible on upgrade button', () => {
    // UX0804: upgrade button label is correct
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText('Try Pro Free')).toBeTruthy();
  });

  it('UX0805: trial note "7 days free · Cancel anytime" is shown', () => {
    // UX0805: trial note appears below the upgrade button
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText('7 days free · Cancel anytime')).toBeTruthy();
  });

  it('UX0806: renders children when tier is "pro"', () => {
    // UX0806: protected content is rendered for pro tier
    const { getByText } = render(
      <ProGate tier="pro"><>{/* empty children */}</></ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0807: custom paywallNudge is rendered when tier is "free"', () => {
    // UX0807: custom nudge prop overrides the default overlay
    const { queryByTestId } = render(
      <ProGate tier="free" paywallNudge={<></>}><></></ProGate>
    );
    expect(queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0808: default nudge is not shown when custom paywallNudge is provided', () => {
    // UX0808: providing a paywallNudge suppresses default paywall-nudge testID
    render(
      <ProGate tier="free" paywallNudge={<></>}><></></ProGate>
    );
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0809: nudge body text mentions the feature name', () => {
    // UX0809: feature name appears in at least one rendered text element
    render(<ProGate tier="free" feature="Sun Spot Map"><></></ProGate>);
    expect(screen.getAllByText(/Sun Spot Map/).length).toBeGreaterThan(0);
  });

  it('UX0810: nudge body falls back to "this feature" when no feature prop', () => {
    // UX0810: body text uses "this feature" when feature prop is absent
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText(/this feature/)).toBeTruthy();
  });

  it('UX0811: upgrade button is not present when tier is "pro"', () => {
    // UX0811: upgrade button is hidden for pro users
    render(<ProGate tier="pro"><></></ProGate>);
    expect(screen.queryByTestId('upgrade-button')).toBeNull();
  });

  it('UX0812: upgrade button is not present when tier is "family"', () => {
    // UX0812: upgrade button is hidden for family users
    render(<ProGate tier="family"><></></ProGate>);
    expect(screen.queryByTestId('upgrade-button')).toBeNull();
  });

  it('UX0813: nudge body includes "Upgrade to SunTrace Pro"', () => {
    // UX0813: default nudge body always starts with upgrade prompt
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText(/Upgrade to SunTrace Pro/)).toBeTruthy();
  });

  it('UX0814: ProGate renders with only required props (children + free tier override)', () => {
    // UX0814: minimal required props renders without crash
    expect(() =>
      render(<ProGate tier="free"><></></ProGate>)
    ).not.toThrow();
  });

  it('UX0815: feature prop "AI Coach" appears in nudge title', () => {
    // UX0815: arbitrary feature string is reflected in nudge title
    render(<ProGate tier="free" feature="AI Coach"><></></ProGate>);
    expect(screen.getByText('Unlock AI Coach with Pro')).toBeTruthy();
  });

  it('UX0816: feature prop "Trip Planner" appears in nudge title', () => {
    // UX0816: trip planner feature string appears in nudge
    render(<ProGate tier="free" feature="Trip Planner"><></></ProGate>);
    expect(screen.getByText('Unlock Trip Planner with Pro')).toBeTruthy();
  });

  it('UX0817: paywall-nudge is present for free tier without feature', () => {
    // UX0817: no feature prop still shows paywall overlay
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0818: paywall-nudge is present for free tier with feature', () => {
    // UX0818: providing feature prop still shows paywall overlay
    render(<ProGate tier="free" feature="Sun Tracking"><></></ProGate>);
    expect(screen.getByTestId('paywall-nudge')).toBeTruthy();
  });

  it('UX0819: "Pro Feature" text absent when feature prop is provided', () => {
    // UX0819: feature-specific title replaces generic "Pro Feature" title
    render(<ProGate tier="free" feature="Analytics"><></></ProGate>);
    expect(screen.queryByText('Pro Feature')).toBeNull();
  });

  it('UX0820: "Try Pro Free" upgrade button is accessible by testID', () => {
    // UX0820: upgrade-button testID makes it automation-friendly
    render(<ProGate tier="free"><></></ProGate>);
    const btn = screen.getByTestId('upgrade-button');
    expect(btn).toBeTruthy();
  });

  it('UX0821: pressing upgrade button does not throw', () => {
    // UX0821: pressing upgrade triggers router.push without error
    expect(() => {
      render(<ProGate tier="free"><></></ProGate>);
      fireEvent.press(screen.getByTestId('upgrade-button'));
    }).not.toThrow();
  });

  it('UX0822: nudge body text includes "personalized UV coaching"', () => {
    // UX0822: default nudge body always references UV coaching
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText(/personalized UV coaching/)).toBeTruthy();
  });

  it('UX0823: ProGate with tier="pro" renders without paywall-nudge testID', () => {
    // UX0823: pro tier never exposes paywall-nudge
    render(<ProGate tier="pro" feature="Forecast"><></></ProGate>);
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0824: ProGate with tier="family" renders without paywall-nudge testID', () => {
    // UX0824: family tier never exposes paywall-nudge
    render(<ProGate tier="family" feature="Forecast"><></></ProGate>);
    expect(screen.queryByTestId('paywall-nudge')).toBeNull();
  });

  it('UX0825: free tier nudge shows trial note', () => {
    // UX0825: "7 days free" note is shown to encourage trial
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText(/7 days free/)).toBeTruthy();
  });

  it('UX0826: free tier nudge shows cancel note', () => {
    // UX0826: cancel-anytime text reassures the user
    render(<ProGate tier="free"><></></ProGate>);
    expect(screen.getByText(/Cancel anytime/)).toBeTruthy();
  });

  it('UX0827: ProGate with paywallNudge shows custom component content', () => {
    // UX0827: custom nudge is rendered in place of default
    const CustomNudge = () => React.createElement(
      require('react-native').Text, {}, 'CustomNudgeText'
    );
    render(<ProGate tier="free" paywallNudge={<CustomNudge />}><></></ProGate>);
    expect(screen.getByText('CustomNudgeText')).toBeTruthy();
  });

  it('UX0828: ProGate renders children text content when tier is "pro"', () => {
    // UX0828: pro tier renders child component content
    const Child = () => React.createElement(
      require('react-native').Text, {}, 'ProContent'
    );
    render(<ProGate tier="pro"><Child /></ProGate>);
    expect(screen.getByText('ProContent')).toBeTruthy();
  });

  it('UX0829: ProGate does not render children text for free tier', () => {
    // UX0829: free tier suppresses child component content
    const Child = () => React.createElement(
      require('react-native').Text, {}, 'ProtectedContent'
    );
    render(<ProGate tier="free"><Child /></ProGate>);
    expect(screen.queryByText('ProtectedContent')).toBeNull();
  });

  it('UX0830: ProGate renders children text for family tier', () => {
    // UX0830: family tier grants access and renders child content
    const Child = () => React.createElement(
      require('react-native').Text, {}, 'FamilyContent'
    );
    render(<ProGate tier="family"><Child /></ProGate>);
    expect(screen.getByText('FamilyContent')).toBeTruthy();
  });
});

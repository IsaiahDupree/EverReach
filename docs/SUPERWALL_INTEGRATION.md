# Superwall Integration (Expo React Native)

This guide explains how to add Superwall to EverReach (Expo SDK 53+), wire the provider, and present a paywall from the Upgrade Onboarding screen.

## What is Superwall
- Hosted paywalls you can change remotely without shipping app updates
- Experiments/A-B tests, analytics, and integrations
- Works with your purchase backend (e.g., RevenueCat)

Official docs:
- Expo Quickstart (Configure): https://superwall.com/docs/expo/quickstart/configure
- Present first paywall: https://superwall.com/docs/expo/quickstart/present-first-paywall

## Requirements
- Expo SDK: 53+ (this app already uses 53.0.4)
- iOS: iOS 14+ (for latest SDK)
- Android: minSdkVersion 26+

## Environment Variables
Add your public keys to `.env` (already used elsewhere in the app):

```
EXPO_PUBLIC_SUPERWALL_IOS_KEY=your_ios_public_api_key
EXPO_PUBLIC_SUPERWALL_ANDROID_KEY=your_android_public_api_key   # optional
```

Commit strategy: do not commit real keys; use your local .env.

## Install the SDK
Using Bun (this repo uses Bun in scripts):

```
bun add expo-superwall
```

Then rebuild native apps so the module is available to iOS/Android:

```
# iOS
npx expo run:ios

# Android
npx expo run:android
```

For web, the provider renders, but paywall presentation is primarily for native.

## Wire the Provider
File: `app/_layout.tsx`
Wrap the app's root navigation with `SuperwallProvider` once the package is installed and keys are set. Example:

```tsx
import { SuperwallProvider } from 'expo-superwall';

// ... inside providers tree where <RootLayoutNav /> is rendered
<SuperwallProvider
  apiKeys={{
    ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '',
    android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY || undefined,
  }}
>
  <RootLayoutNav />
</SuperwallProvider>
```

Tip: If keys are not present, render `<RootLayoutNav />` directly to avoid runtime errors.

## Present a Paywall (Upgrade Onboarding)
File: `app/upgrade-onboarding.tsx`
Use the `usePlacement` hook and call `registerPlacement` where you want to show a paywall. Superwall includes a default placement named `campaign_trigger` for initial testing.

```tsx
import { usePlacement } from 'expo-superwall';

function UpgradeOnboarding() {
  const { registerPlacement } = usePlacement({
    onError: (err) => console.warn('Paywall error', err),
    onPresent: (info) => console.log('Paywall presented', info),
    onDismiss: (info, result) => console.log('Paywall dismissed', info, result),
  });

  const onShowPaywall = async () => {
    await registerPlacement({ placement: 'campaign_trigger' });
  };

  return (
    // Add a CTA button for non-paid users
    <TouchableOpacity onPress={onShowPaywall}>
      <Text>Show Paywall (Superwall)</Text>
    </TouchableOpacity>
  );
}
```

Recommended placement names:
- `upgrade_onboarding_cta`
- `feature_locked_<name>` (e.g., `feature_locked_voice_note`)

Create these placements and campaigns in the Superwall dashboard; then pass the same names into `registerPlacement({ placement })`.

## RevenueCat Integration
This app already uses RevenueCat. You can:
- Let Superwall manage purchases internally, or
- Provide a custom purchase controller (advanced). For initial rollout, let Superwall manage the purchase flow, then reconcile entitlements with RevenueCat on app launch.

Ensure user identity is consistent between Superwall and RevenueCat (same user id/email) so analytics match.

## Analytics & Events
Listen to `onPresent`, `onDismiss`, and `onError` callbacks on the hook to forward events to PostHog or your analytics layer.

## Testing Checklist
- [ ] Keys present in .env and loaded by Expo
- [ ] `expo-superwall` installed and native apps rebuilt
- [ ] Provider wraps root layout (only when keys are set)
- [ ] At least one placement configured in the dashboard (e.g., `campaign_trigger`)
- [ ] Paywall shows for non-paid users and is bypassed for paid users
- [ ] Purchase completes and entitlements update

## Rollout Plan
1. Install SDK and set env keys locally.
2. Wrap provider in `app/_layout.tsx` (behind env guard).
3. Add paywall CTA to Upgrade Onboarding (`usePlacement` → `registerPlacement`).
4. QA on iOS Simulator/Device and Android.
5. Push to TestFlight/Internal App Sharing.
6. Iterate copy/design from Superwall dashboard; A/B test as needed.

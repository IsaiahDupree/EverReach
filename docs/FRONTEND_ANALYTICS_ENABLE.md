# Frontend Analytics Enablement (EverReach)

This guide explains how analytics is wired up in the EverReach mobile app (Expo + expo-router), how to track screens, time-on-screen, and button taps consistently, and how to extend it.

The codebase already has a robust analytics core in `lib/analytics.ts` and a PostHog integration in `lib/posthog.ts`. This guide shows how we enabled global screen tracking and a drop‑in tracked button, and how to use them.

---

## What’s Included

- Global screen view + duration tracking for every route
- Drop‑in `TrackedPressable` component to capture taps with stable IDs
- PostHog enabled (no‑op if key not set)
- Optional backend coverage integration (route manifest + contracts)

---

## Files Added/Updated

- hooks/useScreenTracking.ts
- app/_layout.tsx (wired `ScreenTracker` helper)
- components/TrackedPressable.tsx
- .env.example (PostHog keys + optional backend tracking base)

These layer on top of the existing analytics core at `lib/analytics.ts` and PostHog wrapper at `lib/posthog.ts`.

---

## Installation

1) Install PostHog SDK (already optional, safe to skip without keys)

```bash
npx expo install posthog-react-native
```

2) Set environment variables (see `.env.example`)

```bash
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxx           # Project API key
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # Or EU/self-hosted
# Optional: your backend URL if you add coverage APIs
EXPO_PUBLIC_TRACKING_BASE_URL=https://ever-reach-be.vercel.app
```

3) Rebuild the dev client if needed (native SDK)

---

## Global Screen + Duration Tracking

- Hook: `hooks/useScreenTracking.ts`
- Wired in root layout via a tiny helper component

```tsx
// app/_layout.tsx
import { useScreenTracking } from '@/hooks/useScreenTracking';

function ScreenTracker() {
  useScreenTracking();
  return null;
}

// Inside RootLayoutNav return tree
<>
  <ScreenTracker />
  <Stack screenOptions={{ headerShown: false }}>
    {/* routes ... */}
  </Stack>
</>
```

Behavior:
- Emits `screen_view` on route change
- Emits `screen_duration` for the previous route
- Emits `screen_duration` when the app is backgrounded

Events are sent through `lib/analytics.ts` so they reach both the backend analytics API and PostHog (if configured).

---

## Tracked Buttons (Taps)

Use `TrackedPressable` anywhere you need consistent tap events with stable IDs.

```tsx
import { TrackedPressable } from '@/components/TrackedPressable';

<TrackedPressable
  idHint="cta_start_trial"
  label="Start Free Trial"
  event="cta_tapped"
  eventProps={{ source: 'home' }}
  onPress={() => {/* your action */}}
  style={{ padding: 14, borderRadius: 10, backgroundColor: '#111' }}
>
  <Text style={{ color: 'white', textAlign: 'center' }}>Start Free Trial</Text>
</TrackedPressable>
```

Guidelines:
- Always provide a stable `idHint` (snake_case), e.g. `cta_start_trial`, `copy_ai_reply`
- Prefer concise event names: `cta_tapped`, `ui_press`, `message_copied`
- Avoid PII in props. Use internal IDs (hash if needed).

---

## Identify Users (when authenticated)

Already wired in `app/_layout.tsx`:

```ts
identifyUser(user.id, { plan: isPaid ? 'paid' : 'free', platform: Platform.OS });
```

This hashes the user ID before sending to PostHog (see `lib/posthog.ts`).

---

## Event Naming Rules

- Use snake_case for event names: `screen_view`, `screen_duration`, `cta_tapped`
- Prefer short, descriptive labels
- Include `route`, `element_id`, `screen_name` in props where relevant
- Do not send raw emails/phone numbers

---

## Optional: Coverage (Expected vs. Seen)

If you want an enforceable coverage dashboard (pages and required elements), add:

1) A build-time route manifest generator (Node) that writes `app/assets/route-manifest.json`.
2) Backend endpoints to register the manifest, accept events, and return missing coverage.
3) Optional `Analytics.registerPageContract({ route, requiredElements, requiredEvents })` helper to declare expectations per page.

This is optional and can be added when you’re ready.

---

## Troubleshooting

- No events in PostHog: ensure `EXPO_PUBLIC_POSTHOG_API_KEY` is set and the dev client was rebuilt
- Double events: ensure only one `ScreenTracker` is mounted
- PII concerns: never pass raw emails/phone numbers as event props

---

## Quick Checklist

- [x] Global screen/time tracking enabled
- [x] TrackedPressable available for taps
- [x] PostHog initialized on app start
- [x] Env vars documented in `.env.example`
- [ ] (Optional) Coverage backend + route manifest

---

## References

- `lib/analytics.ts` (core wrapper and constants)
- `lib/posthog.ts` (PostHog client wrapper)
- `hooks/useScreenTracking.ts`
- `components/TrackedPressable.tsx`
- `app/_layout.tsx` (wiring)

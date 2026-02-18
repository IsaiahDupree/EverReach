# iOS App Branch Status

> **Branch:** `origin/qa/test-coverage-v1` (local: `qa/test-coverage-v1`)
> **Last Updated:** Feb 17, 2026
> **App Store:** v1.1.1 (EAS Build #31, id: `0cebef0e`)

## Current State

- **60+ screens** — contacts, warmth, messaging, goals, voice notes, onboarding, settings, billing, import, AI chat
- **112 tests** passing across warmth (5 suites), auth, components, contacts, interactions, subscriptions, meta-pixel
- **EWMA Warmth** — BASE=0, read-only frontend, bands: hot≥80, warm≥60, neutral≥40, cool≥20, cold<20
- **Subscriptions** — RevenueCat + Superwall paywall
- **Analytics** — PostHog + Meta Conversions API (EMQ optimized)
- **Bundle ID:** `com.everreach.app`

## Recent Changes (Feb 2026)

- `e616fb7` — Change EWMA warmth base from 30 to 0
- `a086314` — Bump version to 1.1.1
- `c817009` — Add warmth lifecycle simulation tests (20 tests)
- `9f9b943` — Align warmthColors.ts to EWMA bands
- `9ba36a5` — Show real EWMA warmth delta on message-sent-success
- `5ca8592` — Align all warmth thresholds to EWMA standard
- `5f9eb7f` — Remove paywall from message generation + fix warmth defaults
- `27136ba` — Remove warmth writes from frontend + audit tests

## Key Directories

```
app/                   # 60+ Expo Router screens
components/            # 50+ shared components
features/              # contacts, notes, people feature modules
providers/             # 15 context providers
lib/                   # warmthColors, supabase, metaAppEvents
helpers/               # nativeContactUtils, etc.
repos/                 # SupabaseContactsRepo, InteractionsRepo
backend-vercel/        # Bundled subset of backend (warmth-ewma, recompute)
__tests__/             # 112+ tests
```

## Remaining Work

- [ ] TestFlight review for Build #31
- [ ] Cleanup ~15 debug/test screens
- [ ] Fix pre-existing lint errors
- [ ] Android build support

## How to Push

```bash
cd ios-app
git push origin qa/test-coverage-v1
```

## How to Build

```bash
/Users/isaiahdupree/.bun/bin/eas build --platform ios --profile production
```

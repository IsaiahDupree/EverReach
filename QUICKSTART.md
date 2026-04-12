# SunTrace — Quick Start Guide

## Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- Supabase CLI: `brew install supabase/tap/supabase`

## 15-Minute Setup

### 1. Clone & Install
```bash
cd /Users/isaiahdupree/Documents/Software/SunTrace/templates
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_REVENUECAT_KEY`
- `EXPO_PUBLIC_CLAUDE_API_KEY` (optional — required for AI Coach tab)

### 3. Database Setup
Run migrations in order via Supabase MCP or the Supabase dashboard SQL editor:

1. `templates/supabase/migrations/20260101000001_suntrace_schema.sql`
2. `templates/supabase/migrations/20260101000002_suntrace_seed.sql`
3. `templates/supabase/migrations/20260101000003_auth_trigger.sql`

The third migration installs the `on_auth_user_created` trigger that
auto-provisions a `sun_profiles` row (skin type II, age 30, 1 000 IU target)
for every new sign-up.

### 4. Start Dev Server
```bash
npx expo start
```

### 5. First Run
1. Press `i` to open iOS Simulator.
2. Complete the onboarding flow — choose **Skin Type II** for testing.
3. Tap **Start Session** on the Home tab to verify UV data loads from Open-Meteo.
4. Open the **Coach** tab to test the AI chat (requires `EXPO_PUBLIC_CLAUDE_API_KEY`).

---

## Key Files

| File | Purpose |
|------|---------|
| `templates/app/(tabs)/home.tsx` | UV dashboard — gauge, goal ring, streak |
| `templates/app/(tabs)/session.tsx` | Active session logging |
| `templates/app/learn.tsx` | Education screen (Vitamin D science, UV guide) |
| `templates/app/(tabs)/coach.tsx` | AI Coach chat interface |
| `templates/services/api.ts` | All Supabase operations |
| `templates/constants/config.ts` | App configuration and feature flags |
| `templates/types/models.ts` | TypeScript data models |
| `templates/utils/sunCalculations.ts` | Core UV / Vitamin D calculation utilities |
| `templates/lib/uvTarget.ts` | Daily target & seasonal adjustment logic |

---

## Running Tests
```bash
# From the repo root
npx jest --testPathPattern='__tests__/suntrace'
```

---

## Deploying to TestFlight
```bash
eas build --profile preview --platform ios
eas submit --platform ios
```

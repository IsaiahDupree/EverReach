# EAS Secrets Checklist — Required Environment Variables for Production Build

Before running `eas build --profile production`, ensure all required secrets are configured:

```bash
# Check current secrets
eas secret:list
```

---

## Required (App will not function without these)

| Secret | Source | Used By |
|--------|--------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | `lib/supabase.ts` |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase Dashboard → Settings → API (anon key) | `lib/supabase.ts` |
| `EXPO_PUBLIC_API_URL` | Backend deployment URL | `lib/api.ts`, `lib/trpc.ts`, `lib/notifications.ts` |

## Required for Subscriptions

| Secret | Source | Used By |
|--------|--------|---------|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat Dashboard → Project → API Keys → iOS | `lib/revenuecat.ts` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Dashboard → Project → API Keys → Android | `lib/revenuecat.ts` |

## Required for Analytics

| Secret | Source | Used By |
|--------|--------|---------|
| `EXPO_PUBLIC_POSTHOG_API_KEY` | PostHog → Project Settings → API Key | `lib/posthog.ts` |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog host (default: `https://app.posthog.com`) | `lib/posthog.ts` |

## Required for Meta Pixel / Ad Attribution

| Secret | Source | Used By |
|--------|--------|---------|
| `EXPO_PUBLIC_META_PIXEL_ID` | Meta Events Manager → Pixel ID (`10039038026189444`) | `lib/metaAppEvents.ts` |
| `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` | Meta Events Manager → Settings → Conversions API → Generate Token | `lib/metaAppEvents.ts` |

## Optional / Has Defaults

| Secret | Default | Used By |
|--------|---------|---------|
| `EXPO_PUBLIC_BACKEND_URL` | `https://ever-reach-be.vercel.app` | `lib/api.ts` (fallback) |
| `EXPO_PUBLIC_PROJECT_ID` | From `app.json` extra | `lib/notifications.ts` |
| `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET` | `attachments` | `lib/avatarUpload.ts` |

## Dev-only (NOT needed in production)

These are gated behind `__DEV__` and ignored in production builds:

- `EXPO_PUBLIC_ENABLE_DEV_FEATURES`
- `EXPO_PUBLIC_SHOW_DEBUG_INFO`
- `EXPO_PUBLIC_SHOW_DEV_SETTINGS`
- `EXPO_PUBLIC_ENABLE_DEBUG_LOGGING`
- `EXPO_PUBLIC_SHOW_REFRESH_BUTTONS`
- `EXPO_PUBLIC_ENABLE_EXPERIMENTAL`
- `EXPO_PUBLIC_TEST_TELEMETRY`
- `EXPO_PUBLIC_LOCAL_API_URL`
- `EXPO_PUBLIC_ENABLE_WEB_FEATURES`

---

## How to Set EAS Secrets

```bash
# Set a secret (will be available in all EAS builds)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://utasetfxiqcrnwyfforx.supabase.co" --scope project

# Set from .env file (bulk)
eas secret:push --env-file .env --scope project

# List current secrets
eas secret:list

# Delete a secret
eas secret:delete --name SECRET_NAME
```

## Verification

After setting secrets, verify with a preview build before production:

```bash
eas build --profile preview --platform ios
```

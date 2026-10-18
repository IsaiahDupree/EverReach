# Web Frontend Branch Status

> **Branch:** `origin/web-frontend` (local: `master`)
> **Last Updated:** Feb 17, 2026
> **Deployed:** Not yet deployed

## Current State

- **62 screens** (shared Expo codebase from iOS app)
- **Warmth system** aligned to EWMA BASE=0, bands 80/60/40/20
- **Providers** mirrored from iOS app (Warmth, People, Auth, Subscriptions, etc.)
- Subscription/billing UI present

## Recent Changes (Feb 2026)

- `5c07c99` — Update warmth defaults to EWMA BASE=0 + fix band thresholds
- `3fce3c5` — Align web-frontend warmth system to EWMA standard
- `067325a` — Expand subscription types to match backend schema

## Key Directories

```
app/                   # 62 Expo Router screens (shared with iOS)
components/            # Shared components (ExpandableChatBar, WatchStatusToggle, etc.)
providers/             # 15 context providers
lib/                   # warmthColors, supabase
helpers/               # nativeContactUtils
```

## Remaining Work

- [ ] Dedicated web build configuration (Expo Web or migrate to Next.js)
- [ ] Remove mobile-only screens
- [ ] Web-specific navigation (sidebar vs bottom tabs)
- [ ] Responsive layout audit
- [ ] Deployment pipeline

## How to Push

```bash
cd web-frontend
git push origin master:web-frontend
```

# Backend Branch Status

> **Branch:** `origin/backend` (local: `master`)
> **Last Updated:** Feb 17, 2026
> **Deployed:** `ever-reach-be-xi.vercel.app` (Vercel)

## Current State

- **307 API routes** (v1, admin, cron, etl, webhooks, dashboard)
- **12 active cron jobs** scheduled in `vercel.json`
- **Supabase client standardized** — all 72 files use `getServiceClient()`
- **EWMA Warmth** — BASE=0, daily cron recompute, 112 tests passing
- **Subscriptions** — RevenueCat webhooks + Stripe billing + entitlements v3

## Recent Changes (Feb 2026)

- `76d5d4f` — Align web dashboard warmth bands to EWMA standard (80/60/40/20)
- `cd18915` — Change EWMA warmth base from 30 to 0
- `48cc6e8` — Sanitize error.message leaks in warmth recompute endpoint
- `a553f5e` — Consolidate unscheduled cron routes + sanitize dispatcher errors
- `639584d` — Initialize EWMA warmth fields on contact creation

## Key Directories

```
backend-vercel/
├── app/api/           # 307 API routes
│   ├── v1/            # Main API (contacts, warmth, messages, billing, etc.)
│   ├── cron/          # 26 cron routes (12 scheduled)
│   ├── admin/         # Admin dashboard API
│   ├── webhooks/      # RevenueCat, Stripe, Meta, Clay, Twilio, etc.
│   ├── etl/           # Meta Ads, PostHog, OpenAI usage pipelines
│   ├── dashboard/     # Dashboard metrics API
│   └── billing/       # Stripe checkout/portal
├── lib/               # Shared utilities (warmth-ewma, supabase, etc.)
├── docs/              # Backend workspace docs
└── test/              # Test suites
web/                   # Next.js web dashboard (31 pages, not deployed)
```

## Remaining Work

- [ ] ~30 routes still leak `error.message` in 500 responses
- [ ] 7 unscheduled cron routes to evaluate
- [ ] Deploy web dashboard as separate Vercel project
- [ ] Rate limiting on public endpoints

## How to Push

```bash
cd backend
git push origin master:backend
```

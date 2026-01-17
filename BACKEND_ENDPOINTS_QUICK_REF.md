# Backend Endpoints Quick Reference

**Base URL**: `https://ever-reach-be.vercel.app`

## Core CRM
- `GET/POST /api/contacts` - List/Create contacts
- `GET/PUT/DELETE /api/contacts/[id]` - Contact CRUD
- `GET /api/contacts/search` - Search contacts
- `GET/POST /api/interactions` - List/Log interactions

## AI Agent
- `POST /api/v1/agent/chat` - AI chat
- `POST /api/v1/agent/chat/stream` - Streaming chat (SSE)
- `POST /api/v1/agent/analyze/contact` - Contact analysis
- `POST /api/v1/agent/analyze/screenshot` - Screenshot extraction
- `POST /api/v1/agent/compose/smart` - Generate message
- `GET/POST /api/v1/agent/conversation` - Conversation CRUD

## Campaign Automation (Requires `CRON_SECRET`)
- `GET /api/cron/run-campaigns` - Execute campaigns
- `GET /api/cron/send-email` - Email worker (Resend)
- `GET /api/cron/send-sms` - SMS worker (Twilio)

## Analytics & Tracking
- `POST /api/tracking/events` - Track events (single/batch)
- `POST /api/tracking/identify` - Identify user
- `GET /api/me/impact-summary` - User metrics
- `GET /api/me/usage-summary` - Usage stats
- `GET /api/me/plan-recommendation` - AI plan suggestion
- `GET /api/cron/paywall-rollup` - Analytics aggregation

## Developer Notifications
- `GET /api/admin/dev-notifications` - Activity stats
- `POST /api/admin/dev-notifications` - Create subscription
- `GET /api/cron/dev-activity-digest` - Send digest email

## Recommendations
- `GET /api/recommendations/daily` - Daily recommendations
- `GET /api/cron/daily-recs` - Generate recommendations
- `GET /api/trending/prompts` - Trending prompts

## Monitoring
- `GET /api/health` - Health check
- `GET /api/cron/check-warmth-alerts` - Warmth monitoring
- `GET /api/cron/interaction-metrics` - Metrics calculation
- `GET /api/cron/refresh-monitoring-views` - Refresh views
- `GET /api/cron/score-leads` - Lead scoring

## File Management
- `POST /api/uploads/sign` - Presigned upload URL
- `POST /api/files/commit` - Commit upload

## Billing
- `POST /api/billing/checkout` - Stripe checkout
- `POST /api/billing/portal` - Customer portal

## tRPC
- `ANY /api/trpc/[trpc]` - tRPC router

---

## Environment Variables Required

### Critical
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `EXPO_PUBLIC_API_URL`
- `CRON_SECRET`

### Email (Resend)
- `RESEND_API_KEY`
- `FROM_EMAIL`

### SMS (Twilio)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Optional
- `DEV_NOTIFICATION_EMAIL`
- `DEEP_LINK_BASE`
- `SUPPORT_EMAIL`

---

## Authentication

- **User endpoints**: `Authorization: Bearer <supabase_jwt>`
- **Cron endpoints**: `Authorization: Bearer <CRON_SECRET>`
- **Public endpoints**: No auth required (`/api/health`)

---

## Testing Commands

```bash
# Integration tests
npm run test:integration      # All integration tests
npm run test:env             # Environment validation
npm run test:email           # Email integration
npm run test:sms             # SMS integration

# E2E tests (future)
npm run test:e2e             # All E2E workflows
npm run test:e2e:critical    # Critical workflows only
```

---

**Total Endpoints**: 44+  
**Last Updated**: October 19, 2025

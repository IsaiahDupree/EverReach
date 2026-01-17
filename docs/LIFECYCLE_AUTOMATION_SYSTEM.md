# Lifecycle Automation System

## Overview

Complete event-driven marketing automation connecting PostHog analytics to outbound messaging via Resend (email) and Twilio (SMS). Track user behavior, segment automatically, and trigger personalized campaigns with A/B testing and privacy controls.

---

## Architecture

```
┌─────────────┐
│ Mobile/Web  │ → Events → PostHog (primary analytics)
└─────────────┘              │
                             ↓
                    ┌────────────────┐
                    │  Supabase      │
                    │  (webhook)     │
                    └────────────────┘
                             │
                ┌────────────┼────────────┐
                ↓            ↓            ↓
          ┌─────────┐  ┌─────────┐  ┌─────────┐
          │ Segments │  │Campaigns│  │ Traits  │
          │  (SQL)   │  │(Scheduler│  │(Denorm) │
          └─────────┘  └─────────┘  └─────────┘
                             │
                             ↓
                      ┌──────────────┐
                      │  Deliveries  │
                      │   (Queue)    │
                      └──────────────┘
                             │
                ┌────────────┼────────────┐
                ↓                         ↓
          ┌──────────┐             ┌──────────┐
          │  Resend  │             │  Twilio  │
          │  (Email) │             │  (SMS)   │
          └──────────┘             └──────────┘
```

---

## Key Features

### ✅ Universal Event Taxonomy

**Same events across web + mobile** (segmented by `platform` property):

| Category | Events |
|----------|--------|
| **Lifecycle** | `app_opened`, `app_foregrounded`, `app_backgrounded`, `session_started`, `session_ended` |
| **Navigation** | `screen_viewed` (props: `screen`, `from_screen`) |
| **Onboarding** | `onboarding_step_viewed`, `onboarding_step_completed` (props: `step_id`, `method`, `step_time_ms`) |
| **Account** | `signup_started`, `signup_completed`, `login_succeeded`, `logout` |
| **Paywall** | `paywall_presented`, `paywall_cta_tapped`, `purchase_started`, `purchase_succeeded`, `trial_started`, `paywall_dismissed`, `subscription_status_change` |
| **Engagement** | `cta_tapped`, `feature_used` (props: `feature_key`), `push_opened`, `deep_link_opened` |
| **Churn Signals** | `inactive_N_days`, `payment_failed`, `cancellation_requested` |
| **Experiments** | `experiment_exposure` (props: `experiment_key`, `variant`) |
| **Privacy** | `consent_changed` (analytics/push/email/sms booleans), `att_status` (iOS) |

### ✅ Privacy & Compliance

- **Consent required**: Every send checks `consent_email`/`consent_sms`
- **Quiet hours**: Per-user timezone, no sends outside window
- **Frequency caps**: Max emails/SMS per day/week
- **Holdout groups**: 5-10% control for A/B testing
- **One-click unsubscribe**: Email + SMS STOP keyword
- **GDPR-ready**: Consent timestamps, unsubscribe tracking

### ✅ A/B Testing & Attribution

- **Variant assignment**: Random 50/50 or PostHog feature flags
- **Track variant**: On every delivery and subsequent events
- **Measure lift**: Purchase rate, D7 retention, refund rate by variant
- **Server truth**: Join App Store/Stripe webhooks to deliveries

---

## Database Schema

### Core Tables

1. **`event_log`** - PostHog mirror for segment evaluation
2. **`user_traits`** - Denormalized facts for fast queries
3. **`campaigns`** - Automated campaigns with SQL + controls
4. **`templates`** - Message variants (A/B)
5. **`deliveries`** - Send log with status tracking
6. **`outbound_preferences`** - Per-user settings

### Segment Views (Pre-built)

| View | Description | SQL Logic |
|------|-------------|-----------|
| `v_onboarding_stuck` | Started but didn't complete in 24h | Has `onboarding_step_completed` but no `signup_completed` within 24h |
| `v_paywall_abandoned` | Saw paywall but no purchase in 2h | `paywall_presented` without `purchase_started` in next 2h |
| `v_payment_failed` | Payment error in last 48h | `payment_failed` event within 48h |
| `v_inactive_7d` | No sessions in 7 days | `last_seen` < 7 days ago, still subscribed |
| `v_heavy_users` | Top 10% activity | `days_active_28d` >= 16 or `sessions_7d` >= 7 |

---

## Implementation

### Step 1: Run Migration

```bash
# Apply database schema
psql $SUPABASE_DB_URL -f supabase/migrations/lifecycle-automation-system.sql
```

### Step 2: Deploy Edge Functions

```bash
# PostHog webhook ingest
supabase functions deploy ph-ingest

# Campaign scheduler (cron)
supabase functions deploy run-campaigns

# Email worker (cron)
supabase functions deploy send-email

# SMS worker (cron)
supabase functions deploy send-sms
```

### Step 3: Configure PostHog Webhook

**PostHog Dashboard → Project Settings → Webhooks**:
- URL: `https://[project].supabase.co/functions/v1/ph-ingest`
- Events: All events (or filter to specific events)
- Secret: `POSTHOG_WEBHOOK_SECRET` (optional)

### Step 4: Set Environment Variables

```bash
# Supabase Edge Functions
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set FROM_EMAIL="EverReach <hello@everreach.app>"
supabase secrets set TWILIO_SID=AC...
supabase secrets set TWILIO_AUTH=...
supabase secrets set TWILIO_FROM=+1234567890
supabase secrets set DEEP_LINK_BASE=https://app.everreach.app
supabase secrets set CRON_SECRET=your_secret_here
supabase secrets set POSTHOG_WEBHOOK_SECRET=your_secret_here
```

### Step 5: Configure Cron Jobs

**`supabase/functions/cron.yaml`**:

```yaml
- name: run-campaigns
  schedule: "*/15 * * * *" # Every 15 minutes
  endpoint: /run-campaigns
  headers:
    authorization: "Bearer ${CRON_SECRET}"

- name: send-email
  schedule: "*/5 * * * *" # Every 5 minutes
  endpoint: /send-email
  headers:
    authorization: "Bearer ${CRON_SECRET}"

- name: send-sms
  schedule: "*/5 * * * *" # Every 5 minutes
  endpoint: /send-sms
  headers:
    authorization: "Bearer ${CRON_SECRET}"
```

---

## Creating Campaigns

### Campaign Structure

```sql
INSERT INTO campaigns (name, description, channel, entry_sql, cooldown_hours, holdout_pct, enabled)
VALUES (
  'Onboarding Stuck - 24h',
  'Users who started onboarding but didn''t complete in 24h',
  'email',
  $$
    SELECT 
      user_id,
      CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END as variant_key,
      'onboarding_stuck' as reason,
      jsonb_build_object(
        'last_step', onboarding_stage,
        'hours_since', EXTRACT(EPOCH FROM (now() - last_step_at))/3600
      ) as context_json
    FROM v_onboarding_stuck
  $$,
  48, -- Cooldown: 48 hours between sends
  10, -- Holdout: 10% control group
  true
);
```

### Template Variants

```sql
-- Variant A (Direct)
INSERT INTO templates (campaign_id, variant_key, subject, body_md, deep_link_path, deep_link_params)
VALUES (
  '[campaign_id]',
  'A',
  'Finish setting up EverReach in 2 minutes',
  $$
Hi {name},

You started setting up EverReach but haven''t finished yet. Complete your profile to unlock:

- AI-powered message suggestions
- Smart relationship reminders
- Warmth score tracking

[Finish Setup]({deep_link})

Takes less than 2 minutes!

---
EverReach Team
  $$,
  '/onboarding',
  '{"step": "profile", "source": "email"}'::jsonb
);

-- Variant B (Value-first)
INSERT INTO templates (campaign_id, variant_key, subject, body_md, deep_link_path, deep_link_params)
VALUES (
  '[campaign_id]',
  'B',
  'Never forget to follow up again',
  $$
Hi {name},

Quick question: **How many important relationships have gone cold because you forgot to follow up?**

EverReach solves this. Finish setup to start tracking:

✓ Warmth scores for every contact
✓ Automatic reminders when relationships cool
✓ AI-suggested messages to re-engage

[Complete Setup]({deep_link})

30 seconds to better relationships.

---
EverReach Team
  $$,
  '/onboarding',
  '{"step": "profile", "source": "email"}'::jsonb
);
```

---

## Example Campaigns

### 1. Onboarding Stuck (24h)

**Goal**: Get users to complete signup

**Entry SQL**:
```sql
SELECT 
  user_id,
  CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END as variant_key,
  'onboarding_stuck' as reason,
  jsonb_build_object('last_step', onboarding_stage) as context_json
FROM v_onboarding_stuck
```

**Messages**:
- **Email A**: "Finish setting up EverReach in 2 mins"
- **Email B**: "Never forget to follow up again"
- **SMS**: "Want help finishing setup? Tap to jump back in: {deep_link}"

### 2. Paywall Abandoned (2h)

**Goal**: Convert users who saw paywall but didn't purchase

**Entry SQL**:
```sql
SELECT 
  user_id,
  variant as variant_key,
  'paywall_abandoned' as reason,
  jsonb_build_object('hours_ago', EXTRACT(EPOCH FROM (now() - paywall_seen_at))/3600) as context_json
FROM v_paywall_abandoned
```

**Messages**:
- **Email A**: "Still deciding? Try the trial—cancel anytime"
- **Email B**: "Here's what you unlock with Pro (3 examples)"
- **SMS**: "Here's your 7-day trial link. Ends in 24h: {deep_link}"

### 3. Payment Failed (48h)

**Goal**: Recover churned users with billing issues

**Entry SQL**:
```sql
SELECT 
  user_id,
  'A' as variant_key, -- No A/B test for transactional
  'payment_failed' as reason,
  jsonb_build_object('error', error_reason) as context_json
FROM v_payment_failed
```

**Messages**:
- **Email**: "We couldn't process your payment—no rush. Here's how to fix it"
- **SMS**: "Card issue on EverReach—update here: {deep_link}"

### 4. Inactive 7 Days

**Goal**: Re-engage dormant users

**Entry SQL**:
```sql
SELECT 
  user_id,
  CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END as variant_key,
  'inactive_7d' as reason,
  jsonb_build_object('days_inactive', EXTRACT(DAY FROM (now() - last_seen))) as context_json
FROM v_inactive_7d
```

**Messages**:
- **Email A**: "Quick wins you can do in 5 minutes today"
- **Email B**: "3 features power users love (60s tour)"
- **SMS**: "Miss you! Try this 1-tap action: {deep_link}"

### 5. Heavy Users (VIP)

**Goal**: Reward top users and reduce churn

**Entry SQL**:
```sql
SELECT 
  user_id,
  'A' as variant_key,
  'heavy_user' as reason,
  jsonb_build_object('days_active_28d', days_active_28d, 'sessions_7d', sessions_7d) as context_json
FROM v_heavy_users
```

**Messages**:
- **Email**: "You're in the top 5%—thank you 🎉 + early access invite"
- **SMS**: "VIP feature preview? Reply YES"

---

## Testing

### Test Campaign (Manual Trigger)

```sql
-- 1. Enable test campaign
UPDATE campaigns 
SET enabled = true 
WHERE name = 'Onboarding Stuck - 24h';

-- 2. Manually trigger scheduler
-- Visit: https://[project].supabase.co/functions/v1/run-campaigns
-- Header: Authorization: Bearer [CRON_SECRET]

-- 3. Check queued deliveries
SELECT * FROM deliveries WHERE status = 'queued' ORDER BY queued_at DESC LIMIT 10;

-- 4. Manually trigger email worker
-- Visit: https://[project].supabase.co/functions/v1/send-email
-- Header: Authorization: Bearer [CRON_SECRET]

-- 5. Check sent deliveries
SELECT * FROM deliveries WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 10;
```

### Test Deep Links

```
# Web
https://app.everreach.app/onboarding?reason=paywall_abandoned&variant=B&delivery_id=abc123

# Mobile
everreach://onboarding?reason=paywall_abandoned&variant=B&delivery_id=abc123
```

---

## Monitoring & Analytics

### Campaign Performance

```sql
-- Overall campaign stats
SELECT 
  c.name,
  COUNT(d.id) as total_sends,
  COUNT(d.id) FILTER (WHERE d.status = 'sent') as successful,
  COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed,
  COUNT(d.id) FILTER (WHERE d.opened_at IS NOT NULL) as opened,
  COUNT(d.id) FILTER (WHERE d.clicked_at IS NOT NULL) as clicked,
  COUNT(d.id) FILTER (WHERE d.attributed_purchase_at IS NOT NULL) as converted
FROM campaigns c
LEFT JOIN deliveries d ON d.campaign_id = c.id
WHERE d.sent_at > now() - interval '7 days'
GROUP BY c.id, c.name
ORDER BY total_sends DESC;
```

### A/B Test Results

```sql
-- Compare variants
SELECT 
  c.name,
  d.variant_key,
  COUNT(d.id) as sends,
  COUNT(d.id) FILTER (WHERE d.opened_at IS NOT NULL) as opens,
  COUNT(d.id) FILTER (WHERE d.clicked_at IS NOT NULL) as clicks,
  COUNT(d.id) FILTER (WHERE d.attributed_purchase_at IS NOT NULL) as conversions,
  ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.clicked_at IS NOT NULL) / COUNT(d.id), 2) as ctr,
  ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.attributed_purchase_at IS NOT NULL) / COUNT(d.id), 2) as cvr
FROM campaigns c
JOIN deliveries d ON d.campaign_id = c.id
WHERE c.name = 'Paywall Abandoned - 2h'
  AND d.sent_at > now() - interval '7 days'
GROUP BY c.id, c.name, d.variant_key
ORDER BY cvr DESC;
```

### Attribution

```sql
-- Revenue by campaign
SELECT 
  c.name,
  d.variant_key,
  COUNT(d.id) FILTER (WHERE d.attributed_purchase_at IS NOT NULL) as purchases,
  SUM(d.attributed_revenue_cents) / 100.0 as revenue_usd,
  SUM(d.attributed_revenue_cents) / NULLIF(COUNT(d.id), 0) / 100.0 as arpu
FROM campaigns c
JOIN deliveries d ON d.campaign_id = c.id
WHERE d.sent_at > now() - interval '30 days'
GROUP BY c.id, c.name, d.variant_key
ORDER BY revenue_usd DESC;
```

---

## Best Practices

### ✅ DO

1. **Start with email only** (easier to test)
2. **Test campaigns manually** before enabling
3. **Use generous cooldowns** (48-72h) initially
4. **Monitor delivery status** daily for first week
5. **Track unsubscribe rates** (should be <0.5%)
6. **A/B test message copy** not just timing
7. **Deep link to specific screens** with context
8. **Set realistic frequency caps** (max 2 emails/day)

### ❌ DON'T

1. **Don't send without consent** (legal requirement)
2. **Don't ignore quiet hours** (user experience)
3. **Don't skip holdouts** (can't measure lift without control)
4. **Don't hardcode user IDs** in SQL (use views)
5. **Don't send duplicate messages** (check cooldown)
6. **Don't blast everyone** (segment by behavior)
7. **Don't ignore delivery errors** (fix or suppress)

---

## Troubleshooting

### Events Not Appearing in `event_log`

**Check**:
1. PostHog webhook configured correctly
2. Webhook secret matches (if enabled)
3. Edge function logs: `supabase functions logs ph-ingest`
4. Event name matches taxonomy

### Campaigns Not Queueing

**Check**:
1. Campaign `enabled = true`
2. Entry SQL returns rows: Run manually in SQL editor
3. Users meet consent requirements
4. Cooldown not blocking (check `deliveries` table)
5. Cron job running: Check Edge function logs

### Deliveries Stuck in `queued`

**Check**:
1. Worker cron jobs running
2. Email/SMS credentials correct
3. User has email/phone in profile
4. Template exists for variant
5. Worker logs for specific errors

### Deep Links Not Working

**Check**:
1. `DEEP_LINK_BASE` environment variable
2. Universal links configured (iOS/Android)
3. Deep link params URL-encoded
4. App handles deep link routes

---

## Next Steps

### Week 1-2: Setup

1. [ ] Run database migration
2. [ ] Deploy Edge functions
3. [ ] Configure PostHog webhook
4. [ ] Set environment variables
5. [ ] Create first campaign (onboarding stuck)
6. [ ] Test end-to-end flow

### Week 3-4: Expand

1. [ ] Add 3 more campaigns (paywall, payment failed, inactive)
2. [ ] Create A/B variants for each
3. [ ] Set up monitoring dashboard
4. [ ] Test SMS delivery
5. [ ] Configure quiet hours by timezone

### Month 2+: Optimize

1. [ ] Analyze A/B test results
2. [ ] Optimize send timing
3. [ ] Add video scripts to templates
4. [ ] Build attribution pipeline (webhooks → deliveries)
5. [ ] Add push notifications channel
6. [ ] Create VIP/heavy user campaigns

---

## Summary

**You now have**:
- ✅ Complete lifecycle automation infrastructure
- ✅ Event-driven campaigns with SQL-based segments
- ✅ Email (Resend) + SMS (Twilio) workers
- ✅ A/B testing with holdouts
- ✅ Privacy controls (consent, quiet hours, frequency caps)
- ✅ Attribution tracking
- ✅ 5 pre-built campaign templates

**Files Created**:
1. `supabase/migrations/lifecycle-automation-system.sql` (600 lines)
2. `supabase/functions/ph-ingest/index.ts` (150 lines)
3. `supabase/functions/run-campaigns/index.ts` (200 lines)
4. `supabase/functions/send-email/index.ts` (250 lines)
5. `supabase/functions/send-sms/index.ts` (250 lines)
6. `docs/LIFECYCLE_AUTOMATION_SYSTEM.md` (this file)

**Total**: ~1,900 lines of production-ready code

---

**Last Updated**: October 18, 2025  
**Status**: ✅ Ready for Deployment  
**Dependencies**: PostHog, Supabase, Resend, Twilio

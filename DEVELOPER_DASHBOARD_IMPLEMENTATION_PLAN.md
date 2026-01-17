# Developer Dashboard - Complete Implementation Plan

**Date**: October 21, 2025  
**Status**: ✅ Foundation Complete, Ready for Integration Phase

---

## 🎯 System Overview

A comprehensive analytics and marketing tracking dashboard protected by password authentication with Resend-powered password reset.

### What We're Building

**Developer Dashboard Features**:
1. ✅ **App Performance Tracking** - API metrics, feature adoption, error rates
2. ✅ **Inbound Marketing** - Blog/content analytics, SEO performance, organic traffic
3. ✅ **Email Campaigns** - Delivery, opens, clicks, conversions (Resend/SendGrid/Mailchimp)
4. ✅ **Organic Social** - Twitter, LinkedIn, Instagram, TikTok performance
5. ✅ **Meta Ads** - Facebook/Instagram campaigns, ROAs, conversions
6. ✅ **Feature Flags** - Progressive rollouts, targeting, usage analytics
7. ✅ **A/B Testing** - Experiments, statistical significance, variant performance
8. 🚧 **Landing Pages** - Conversion tracking, A/B tests, heatmaps
9. 🚧 **Custom Event Tracking** - Track anything with PostHog integration

---

## ✅ What's Already Built

### Database Schema (3 migrations)

1. **`developer-dashboard-system.sql`** (671 lines)
   - Admin authentication (bcrypt hashed passwords)
   - Admin sessions (7-day tokens)
   - API endpoint metrics
   - Feature adoption tracking
   - Content performance (blogs)
   - Email campaigns & metrics
   - Social posts & metrics
   - Meta ad campaigns/sets/ads & metrics
   - PostHog events cache
   - 4 materialized views

2. **`feature-flags-ab-testing.sql`** (NEW - 400+ lines)
   - Feature flag definitions
   - Flag evaluation logs
   - Experiment definitions
   - Experiment assignments (sticky bucketing)
   - Metric events
   - 2 materialized views
   - Helper functions for evaluation and assignment

3. **`analytics-schema.sql`** (existing)
   - PostHog event mirror
   - User tracking
   - Session analytics

### Backend Infrastructure

1. **`lib/admin-auth.ts`** (499 lines) - ✅ Complete
   - Password hashing (bcrypt)
   - Session management
   - Resend email integration
   - Password reset flow
   - User management

2. **`lib/analytics.ts`** (332 lines) - ✅ Complete
   - PostHog client
   - 120+ event types
   - Event tracking
   - User identification

3. **Admin Auth API** (3 endpoints) - ✅ Complete
   - `POST /api/admin/auth/signin`
   - `POST /api/admin/auth/request-reset`
   - `POST /api/admin/auth/signout`

---

## 🚧 What Needs To Be Built

### Phase 1: Core Dashboard API (Week 1)

#### 1. Dashboard Stats Endpoints (4 routes)

**`/api/admin/dashboard/overview`** (GET)
- Returns: App health summary, user growth, revenue, active experiments
- Sources: Materialized views, PostHog cache

**`/api/admin/dashboard/app-performance`** (GET)
- Returns: API metrics by endpoint, error rates, P95 latency, feature adoption
- Query params: `startDate`, `endDate`, `endpoint`

**`/api/admin/dashboard/marketing`** (GET)
- Returns: All marketing channels summary
- Includes: Email, social, ads, content performance
- Query params: `startDate`, `endDate`, `channel`

**`/api/admin/dashboard/funnel`** (GET)
- Returns: Conversion funnel metrics
- Sources: PostHog events → Supabase materialized views

#### 2. Feature Flags API (5 routes)

**`/api/admin/feature-flags`** (GET/POST)
- GET: List all flags with usage stats
- POST: Create new flag

**`/api/admin/feature-flags/[key]`** (GET/PATCH/DELETE)
- GET: Flag details + evaluation stats
- PATCH: Update flag (rollout %, targeting, enabled)
- DELETE: Archive flag

**`/api/admin/feature-flags/[key]/evaluate`** (POST)
- Simulate flag evaluation for testing
- Body: `{ userId, anonymousId, platform, segment }`

#### 3. A/B Testing API (6 routes)

**`/api/admin/experiments`** (GET/POST)
- GET: List experiments with status
- POST: Create experiment

**`/api/admin/experiments/[key]`** (GET/PATCH/DELETE)
- GET: Experiment details + results
- PATCH: Update experiment (status, variants, targeting)
- DELETE: Archive experiment

**`/api/admin/experiments/[key]/results`** (GET)
- Statistical analysis of variants
- Conversion rates, confidence intervals, winner prediction

**`/api/admin/experiments/[key]/assign`** (POST)
- Simulate variant assignment for testing

#### 4. Marketing Data Ingestion API (8 routes)

**Email Campaigns**:
- `POST /api/admin/ingest/email-campaign` - Create/update campaign
- `POST /api/admin/ingest/email-metrics` - Batch update metrics

**Social Media**:
- `POST /api/admin/ingest/social-post` - Create/update post
- `POST /api/admin/ingest/social-metrics` - Batch update metrics

**Meta Ads**:
- `POST /api/admin/ingest/meta-campaign` - Sync campaign
- `POST /api/admin/ingest/meta-metrics` - Daily metrics

**Content**:
- `POST /api/admin/ingest/content` - Update blog/content metrics
- `POST /api/admin/ingest/content-metrics` - Daily traffic data

---

### Phase 2: Data Ingestion Workers (Week 2)

#### 1. Cron Jobs (Vercel)

**`/api/cron/sync-posthog-events`** (Every 15 min)
- Pull events from PostHog API
- Aggregate into `posthog_events_cache`
- Update materialized views

**`/api/cron/sync-email-metrics`** (Daily 6 AM)
- Fetch from Resend/SendGrid/Mailchimp API
- Update `email_campaign_metrics`

**`/api/cron/sync-social-metrics`** (Daily 7 AM)
- Fetch from Twitter/LinkedIn/Instagram APIs
- Update `social_post_metrics`

**`/api/cron/sync-meta-ads`** (Daily 8 AM)
- Fetch from Meta Marketing API
- Update `meta_ad_metrics`

**`/api/cron/refresh-dashboard-views`** (Every hour)
- Refresh all materialized views
- Calculate statistical significance for experiments

#### 2. Webhook Receivers

**`/api/webhooks/resend`** (POST)
- Email delivery events
- Opens, clicks, bounces, complaints

**`/api/webhooks/meta-ads`** (POST)
- Real-time conversion events
- Attributed to specific ads

**`/api/webhooks/stripe`** (Existing)
- Already handles subscription events
- Add revenue attribution to campaigns

---

### Phase 3: Dashboard Frontend (Week 3-4)

#### Dashboard UI (Next.js App)

**Technology Stack**:
- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui components
- Recharts for visualization
- React Query for data fetching

**Pages**:

1. **`/admin/login`**
   - Email/password form
   - "Forgot password" link
   - Resend integration for reset

2. **`/admin/dashboard`** (Home)
   - Key metrics cards
   - App health status
   - Active experiments
   - Recent alerts

3. **`/admin/performance`**
   - API endpoint table with metrics
   - Response time charts (P50/P95/P99)
   - Error rate trends
   - Feature adoption funnels

4. **`/admin/marketing`**
   - Channel performance tabs
   - Email: Campaigns table, open/click rates
   - Social: Post grid, engagement metrics
   - Ads: Campaign ROI, spend tracking
   - Content: Top posts, SEO rankings

5. **`/admin/experiments`**
   - Active experiments list
   - Create/edit experiment modal
   - Results visualization
   - Statistical significance calculator

6. **`/admin/feature-flags`**
   - Flags table with toggle switches
   - Rollout percentage sliders
   - Targeting builder UI
   - Evaluation logs

7. **`/admin/analytics`**
   - PostHog events explorer
   - Custom metric builder
   - Cohort analysis
   - Funnel builder

---

### Phase 4: Integration Libraries (Week 5)

#### 1. Meta Marketing API Client

**`lib/integrations/meta-ads.ts`**
```typescript
import { MetaAds } from '@meta/marketing-api';

export async function syncMetaCampaigns(accountId: string) {
  const client = new MetaAds(process.env.META_ACCESS_TOKEN);
  
  // Fetch campaigns
  const campaigns = await client.getCampaigns(accountId);
  
  // Sync to database
  for (const campaign of campaigns) {
    await upsertMetaCampaign(campaign);
  }
}

export async function syncMetaMetrics(
  campaignId: string,
  startDate: Date,
  endDate: Date
) {
  // Fetch daily metrics
  // Update meta_ad_metrics table
}
```

#### 2. Email Provider Clients

**Resend** (Primary - already integrated)
**SendGrid** (Optional)
**Mailchimp** (Optional)

**`lib/integrations/email-providers.ts`**
```typescript
export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export async function syncResendCampaign(campaignId: string) {
  // Fetch from Resend API
  // Update email_campaign_metrics
}
```

#### 3. Social Media API Clients

**`lib/integrations/social-media.ts`**
```typescript
export async function syncTwitterMetrics(tweetId: string) {
  // Twitter API v2
}

export async function syncLinkedInMetrics(postId: string) {
  // LinkedIn Marketing API
}

export async function syncInstagramMetrics(postId: string) {
  // Instagram Graph API
}
```

#### 4. Google Analytics Integration

**`lib/integrations/google-analytics.ts`**
```typescript
export async function syncLandingPageMetrics(pageUrl: string) {
  // GA4 Data API
  // Track: pageviews, bounce rate, avg session duration
}
```

---

## 📊 Data Flow Architecture

### Inbound Data Sources

```
PostHog Events → Webhook → Supabase (analytics_events)
                         ↓
                  Aggregation Jobs
                         ↓
              posthog_events_cache
                         ↓
             Materialized Views
                         ↓
              Dashboard API
```

```
Email Providers (Resend/SendGrid) 
         ↓
    Webhooks + Cron Jobs
         ↓
  email_campaign_metrics
         ↓
   Dashboard API
```

```
Meta Marketing API
         ↓
    Daily Cron Job
         ↓
   meta_ad_metrics
         ↓
   Dashboard API
```

```
Social Media APIs (Twitter/LinkedIn/Instagram)
         ↓
    Daily Cron Job
         ↓
  social_post_metrics
         ↓
   Dashboard API
```

### Feature Flag Evaluation Flow

```
Client Request
      ↓
Feature Flag API (/v1/flags/evaluate)
      ↓
evaluate_feature_flag() SQL function
      ↓
Log to feature_flag_evaluations
      ↓
Return enabled/disabled + reason
```

### A/B Testing Flow

```
User enters experiment
      ↓
assign_experiment_variant() SQL function
      ↓
Check existing assignment (sticky)
      ↓
Calculate bucket via deterministic hash
      ↓
Assign to variant based on weights
      ↓
Log to experiment_assignments
      ↓
Return variant
```

---

## 🔐 Security & Access Control

### Admin Roles

1. **super_admin** - Full access (create users, delete data)
2. **admin** - Manage flags, experiments, view all data
3. **analyst** - View only, export data
4. **viewer** - Read-only dashboard access

### Authentication Flow

```
1. User visits /admin/login
2. POST /api/admin/auth/signin { email, password }
3. Server validates credentials (bcrypt.compare)
4. Create session token (crypto.randomBytes)
5. Return token + user info
6. Client stores token in cookie/localStorage
7. All admin API requests include: Authorization: Bearer <token>
8. Middleware validates token via verify_admin_session()
```

### Password Reset Flow

```
1. User clicks "Forgot Password"
2. POST /api/admin/auth/request-reset { email }
3. Generate reset token (crypto.randomBytes)
4. Save to admin_users.reset_token (expires in 1 hour)
5. Send email via Resend with reset link
6. User clicks link → /admin/reset-password?token=...
7. POST /api/admin/auth/reset { token, newPassword }
8. Verify token not expired
9. Hash new password (bcrypt)
10. Clear reset token
11. Delete all existing sessions
```

---

## 🧪 Testing Strategy

### 1. Admin Auth Tests

```typescript
// test/admin-auth.test.ts
describe('Admin Authentication', () => {
  it('should sign in with valid credentials');
  it('should reject invalid password');
  it('should create session with 7-day expiry');
  it('should send password reset email');
  it('should reset password with valid token');
  it('should reject expired reset token');
});
```

### 2. Feature Flag Tests

```typescript
// test/feature-flags.test.ts
describe('Feature Flags', () => {
  it('should evaluate flag for user');
  it('should respect rollout percentage');
  it('should target specific users');
  it('should log evaluations');
});
```

### 3. A/B Testing Tests

```typescript
// test/experiments.test.ts
describe('A/B Testing', () => {
  it('should assign user to variant (sticky)');
  it('should distribute users based on weights');
  it('should track metric events');
  it('should calculate conversion rates');
  it('should determine statistical significance');
});
```

### 4. Marketing Integration Tests

```typescript
// test/marketing-integrations.test.ts
describe('Marketing Integrations', () => {
  it('should sync email campaign from Resend');
  it('should sync social post from Twitter API');
  it('should sync Meta ad metrics');
  it('should aggregate metrics correctly');
});
```

---

## 📈 Metrics & KPIs Tracked

### App Performance
- API response times (P50/P95/P99)
- Error rates by endpoint
- Request volume
- Feature adoption rates
- Active users (DAU/MAU)

### Inbound Marketing (Content/SEO)
- Blog post pageviews
- Organic traffic
- Search rankings
- Bounce rate
- Time on page
- CTA click rate
- Signups attributed

### Email Campaigns
- Sent/Delivered/Bounced
- Open rate
- Click rate
- Click-to-open rate
- Unsubscribe rate
- Revenue per email
- Campaign ROI

### Organic Social
- Impressions
- Reach
- Engagement rate
- Link clicks
- Video views
- Platform-specific (saves on Instagram, retweets on Twitter)

### Meta Ads
- Impressions/Reach/Frequency
- Link clicks
- Conversions
- Spend
- CPC/CPM/CPA
- ROAS (Return on Ad Spend)
- Conversion value

### Feature Flags
- Total evaluations
- Enabled percentage
- Unique users exposed
- Adoption rate

### A/B Tests
- Variant distribution
- Conversion rates per variant
- Statistical significance
- Confidence intervals
- Winner prediction

---

## 🚀 Deployment Checklist

### Environment Variables

```bash
# Admin Authentication
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@everreach.app
NEXT_PUBLIC_DASHBOARD_URL=https://admin.everreach.app

# Marketing APIs
META_ACCESS_TOKEN=xxx
META_APP_SECRET=xxx
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
SENDGRID_API_KEY=xxx (optional)
MAILCHIMP_API_KEY=xxx (optional)

# Google Analytics
GOOGLE_ANALYTICS_PROPERTY_ID=xxx
GOOGLE_SERVICE_ACCOUNT_JSON=xxx

# PostHog (already set)
POSTHOG_PROJECT_KEY=xxx
POSTHOG_HOST=https://app.posthog.com
```

### Database Migrations

```bash
# 1. Run developer dashboard migration
psql $DATABASE_URL -f migrations/developer-dashboard-system.sql

# 2. Run feature flags migration
psql $DATABASE_URL -f migrations/feature-flags-ab-testing.sql

# 3. Create first admin user
psql $DATABASE_URL -c "
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@everreach.app',
  '$2a$10$...',  -- Run: bcrypt.hash('your-password', 10)
  'Admin User',
  'super_admin'
);
"
```

### Vercel Cron Jobs

Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-posthog-events",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/sync-email-metrics",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/sync-social-metrics",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/sync-meta-ads",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/refresh-dashboard-views",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 📚 Documentation To Create

1. **ADMIN_DASHBOARD_API.md** - Complete API reference
2. **FEATURE_FLAGS_GUIDE.md** - How to use feature flags
3. **AB_TESTING_GUIDE.md** - How to run experiments
4. **MARKETING_INTEGRATIONS.md** - Setup guides for each platform
5. **ADMIN_USER_GUIDE.md** - Dashboard usage instructions

---

## 🎯 Success Criteria

### Week 1 Complete
- ✅ All database migrations applied
- ✅ Admin auth working (login, logout, reset)
- ✅ Core dashboard API endpoints deployed
- ✅ Feature flags API functional
- ✅ A/B testing API functional

### Week 2 Complete
- ✅ All cron jobs configured and running
- ✅ PostHog events syncing to cache
- ✅ Email metrics syncing (Resend)
- ✅ Social metrics syncing (at least Twitter)
- ✅ Meta ads syncing

### Week 3-4 Complete
- ✅ Dashboard UI deployed at admin.everreach.app
- ✅ All pages functional
- ✅ Real-time data display
- ✅ Create/edit experiments
- ✅ Toggle feature flags

### Week 5 Complete
- ✅ All marketing integrations tested
- ✅ Documentation complete
- ✅ Team trained on dashboard usage
- ✅ First A/B test running in production

---

## 📞 Next Steps

1. **Review this plan** - Confirm scope and priorities
2. **Run migrations** - Apply both new SQL files
3. **Create first admin user** - Hash password with bcrypt
4. **Build Phase 1 APIs** - Dashboard stats and feature flags endpoints
5. **Set up cron jobs** - Start syncing data
6. **Build dashboard UI** - Next.js admin portal

**Estimated Timeline**: 4-5 weeks for complete system  
**Current Status**: Foundation ~40% complete (database + auth ready)

---

**Ready to proceed?** Let me know which phase to start implementing first!

# Developer Dashboard - Quick Start Guide

**Status**: ✅ Database & Auth Ready | 🚧 API Endpoints & UI Next

---

## 🎉 What's Ready Now

### ✅ Database Foundation
1. **`developer-dashboard-system.sql`** (671 lines)
   - Admin authentication tables
   - Marketing tracking (email, social, ads)
   - Content performance
   - API metrics
   - 4 materialized views

2. **`feature-flags-ab-testing.sql`** (400+ lines - NEW)
   - Feature flags with targeting
   - A/B experiments with statistical analysis
   - Sticky user bucketing
   - Metric tracking
   - 2 materialized views

3. **`lib/admin-auth.ts`** (499 lines)
   - Bcrypt password hashing
   - Session management (7-day tokens)
   - Resend email integration
   - Password reset flow

4. **Admin Auth API** (3 endpoints working)
   - `POST /api/admin/auth/signin`
   - `POST /api/admin/auth/request-reset`
   - `POST /api/admin/auth/signout`

---

## 🚀 Quick Deploy (10 Minutes)

### Step 1: Install Dependencies
```bash
cd backend-vercel
npm install bcryptjs resend
npm install -D @types/bcryptjs
```

### Step 2: Set Environment Variables
Add to Vercel or `.env`:
```bash
# Resend (Password Reset Emails)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@everreach.app

# Dashboard URL
NEXT_PUBLIC_DASHBOARD_URL=https://admin.everreach.app

# Marketing APIs (optional for now)
META_ACCESS_TOKEN=xxx
TWITTER_API_KEY=xxx
LINKEDIN_CLIENT_ID=xxx
```

### Step 3: Run Migrations
```bash
# Connect to your Supabase database
psql $DATABASE_URL -f migrations/developer-dashboard-system.sql
psql $DATABASE_URL -f migrations/feature-flags-ab-testing.sql
```

### Step 4: Create First Admin User
```bash
# Generate password hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourSecurePassword123!', 10));"

# Copy the hash, then run:
psql $DATABASE_URL << EOF
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'your-email@example.com',
  '<paste-hash-here>',
  'Admin User',
  'super_admin'
);
EOF
```

### Step 5: Test Admin Login
```bash
curl -X POST https://ever-reach-be.vercel.app/api/admin/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"YourSecurePassword123!"}'
```

**Expected Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "your-email@example.com",
    "role": "super_admin"
  },
  "token": "abc123...",
  "expiresAt": "2025-10-28T..."
}
```

---

## 📊 What Tracking Is Available

### Already Integrated (PostHog)
✅ **120+ Events** tracked across mobile, web, and backend:
- User lifecycle (signup, login, onboarding)
- Feature usage (contacts, messages, AI features)
- Performance metrics (API latency, errors)
- Monetization (trials, purchases, upgrades)

### Ready to Track (Need API Integration)

**Email Marketing**:
- Campaign metrics (opens, clicks, conversions)
- Delivery stats (bounces, complaints)
- Revenue attribution

**Organic Social**:
- Twitter, LinkedIn, Instagram, TikTok
- Impressions, engagement, link clicks
- Video views, shares

**Meta Ads**:
- Facebook/Instagram campaigns
- Ad performance (CTR, CPC, ROAS)
- Conversion tracking

**Content/SEO**:
- Blog post traffic
- Search rankings
- Bounce rate, time on page
- Organic vs paid traffic

**Landing Pages**:
- Conversion rates
- A/B test variants
- Form submissions

---

## 🏗️ Next Implementation Steps

### Week 1: Core Dashboard API (16 endpoints)

**Priority 1: Dashboard Stats** (4 endpoints)
```typescript
GET /api/admin/dashboard/overview
GET /api/admin/dashboard/app-performance
GET /api/admin/dashboard/marketing
GET /api/admin/dashboard/funnel
```

**Priority 2: Feature Flags** (5 endpoints)
```typescript
GET /api/admin/feature-flags
POST /api/admin/feature-flags
GET /api/admin/feature-flags/[key]
PATCH /api/admin/feature-flags/[key]
DELETE /api/admin/feature-flags/[key]
```

**Priority 3: A/B Testing** (6 endpoints)
```typescript
GET /api/admin/experiments
POST /api/admin/experiments
GET /api/admin/experiments/[key]
PATCH /api/admin/experiments/[key]
GET /api/admin/experiments/[key]/results
POST /api/admin/experiments/[key]/assign
```

**Priority 4: Data Ingestion** (1 endpoint to start)
```typescript
POST /api/admin/ingest/posthog-events
```

### Week 2: Automated Data Sync (5 cron jobs)

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

### Week 3-4: Dashboard UI (7 pages)

1. `/admin/login` - Sign in page
2. `/admin/dashboard` - Overview with key metrics
3. `/admin/performance` - API & app metrics
4. `/admin/marketing` - All marketing channels
5. `/admin/experiments` - A/B testing management
6. `/admin/feature-flags` - Flag management
7. `/admin/analytics` - Custom event explorer

---

## 🎯 Use Cases Enabled

### 1. Feature Flags (Progressive Rollout)
```typescript
// Create flag via API
POST /api/admin/feature-flags
{
  "key": "new_ai_composer",
  "name": "New AI Message Composer",
  "rollout_percentage": 10,  // Start with 10% of users
  "target_platforms": ["web"]
}

// Evaluate in app
const isEnabled = await fetch('/v1/flags/evaluate', {
  body: JSON.stringify({
    flagKey: 'new_ai_composer',
    userId: currentUser.id
  })
});
```

### 2. A/B Testing (Conversion Optimization)
```typescript
// Create experiment
POST /api/admin/experiments
{
  "key": "pricing_page_test",
  "name": "Pricing Page Layout Test",
  "control_variant": {
    "key": "control",
    "name": "Current Layout",
    "weight": 50
  },
  "treatment_variants": [{
    "key": "variant_a",
    "name": "New Layout",
    "weight": 50
  }],
  "primary_metric": "checkout_started",
  "status": "running"
}

// Get variant for user (sticky)
const variant = await assignExperimentVariant('pricing_page_test', userId);
// Returns: { variant_key: 'variant_a', variant_name: 'New Layout' }
```

### 3. Marketing Performance Tracking
```typescript
// Sync email campaign
POST /api/admin/ingest/email-campaign
{
  "campaign_id": "campaign_123",
  "name": "Weekly Newsletter",
  "sent_count": 10000,
  "opened": 2500,
  "clicked": 500,
  "revenue": 5000
}

// View in dashboard
GET /api/admin/dashboard/marketing?channel=email
// Returns aggregated metrics with trends
```

### 4. Social Media Performance
```typescript
// Track organic post
POST /api/admin/ingest/social-post
{
  "post_id": "tweet_456",
  "platform": "twitter",
  "content": "Check out our new feature...",
  "impressions": 50000,
  "likes": 1200,
  "retweets": 300,
  "link_clicks": 500
}
```

### 5. Meta Ads Tracking
```typescript
// Sync ad metrics
POST /api/admin/ingest/meta-metrics
{
  "ad_id": "ad_789",
  "date": "2025-10-21",
  "impressions": 100000,
  "clicks": 2000,
  "spend": 500,
  "conversions": 50,
  "conversion_value": 2500
}

// Calculate ROAS: $2500 / $500 = 5.0x
```

---

## 🔐 Security Best Practices

### Password Policy
- Minimum 12 characters
- Require: uppercase, lowercase, number, special char
- Hash with bcrypt (10 rounds)
- Enforce reset every 90 days (optional)

### Session Management
- 7-day expiry
- Revoke on password change
- IP + User Agent logging
- Rate limit login attempts

### API Access
- All admin endpoints require `Authorization: Bearer <token>`
- Validate token via `verify_admin_session()`
- Role-based access control
- Audit log all actions

---

## 📈 Metrics You Can Track

### App Health
- ✅ API response times (P50/P95/P99)
- ✅ Error rates by endpoint
- ✅ Request volume
- ✅ Feature adoption

### User Engagement
- ✅ DAU/MAU
- ✅ Session duration
- ✅ Feature usage
- ✅ Retention cohorts

### Marketing Performance
- 🚧 Email open/click rates
- 🚧 Social engagement
- 🚧 Ad ROAS
- 🚧 Content traffic

### Product Experiments
- 🚧 Conversion rates by variant
- 🚧 Statistical significance
- 🚧 Revenue impact
- 🚧 User satisfaction

### Revenue
- ✅ Trial→Paid conversion
- ✅ Churn rate
- ✅ ARPU
- 🚧 Campaign attribution

---

## 🚨 Troubleshooting

### Can't sign in
- Verify password hash is correct (bcrypt)
- Check `admin_users.is_active = true`
- Ensure email matches exactly (case-insensitive)

### Password reset email not sending
- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for errors
- Ensure `RESEND_FROM_EMAIL` is verified domain

### Feature flag not evaluating
- Run migration: `feature-flags-ab-testing.sql`
- Check flag `is_enabled = true`
- Verify `rollout_percentage > 0`

### Experiment not assigning users
- Check experiment `status = 'running'`
- Verify variant weights sum to 100
- Ensure user hash calculation working

---

## 📚 Documentation

**Complete Guides**:
1. `DEVELOPER_DASHBOARD_IMPLEMENTATION_PLAN.md` - Full system architecture
2. `ANALYTICS_INTEGRATION_SUMMARY.md` - PostHog event catalog
3. `docs/api/` - All backend API docs

**SQL Migrations**:
1. `migrations/developer-dashboard-system.sql` - Core tables
2. `migrations/feature-flags-ab-testing.sql` - Experiments & flags
3. `migrations/analytics-schema.sql` - PostHog mirror

**Backend Code**:
1. `lib/admin-auth.ts` - Authentication system
2. `lib/analytics.ts` - PostHog integration
3. `app/api/admin/auth/` - Auth endpoints

---

## ✅ Ready to Build?

**You have everything you need to**:
1. ✅ Authenticate admin users
2. ✅ Store marketing data
3. ✅ Track app performance
4. ✅ Run A/B tests
5. ✅ Manage feature flags

**Next Step**: Choose what to build first:
- **Option A**: Dashboard API endpoints (Week 1)
- **Option B**: Data sync cron jobs (Week 2)
- **Option C**: Dashboard UI (Week 3-4)

**Which would you like to start with?**

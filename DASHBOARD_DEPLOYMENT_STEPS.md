# Developer Dashboard - Deployment Steps

**Time to Deploy**: ~15 minutes  
**Prerequisites**: Supabase database access, Vercel account

---

## Step 1: Install Dependencies (2 min)

```bash
cd backend-vercel
npm install bcryptjs resend
npm install -D @types/bcryptjs
```

---

## Step 2: Set Environment Variables (3 min)

Add to your Vercel project settings or `.env.local`:

```bash
# Admin Authentication (REQUIRED)
RESEND_API_KEY=${SERVICE_API_TOKEN}
RESEND_FROM_EMAIL=noreply@everreach.app
NEXT_PUBLIC_DASHBOARD_URL=https://admin.everreach.app

# Cron Jobs (REQUIRED)
CRON_SECRET=${SERVICE_API_TOKEN}

# PostHog (ALREADY SET)
POSTHOG_PROJECT_KEY=${SERVICE_API_TOKEN}
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PERSONAL_API_KEY=<get_from_posthog_settings>

# Supabase (ALREADY SET)
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

**Get PostHog Personal API Key**:
1. Go to https://us.i.posthog.com/settings/user-api-keys
2. Create new key with "Read" permissions
3. Add to env vars

---

## Step 3: Run Database Migrations (5 min)

```bash
# Connect to Supabase database
psql postgresql://postgres:everreach123!@#@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres

# Run migrations (in order)
\i migrations/developer-dashboard-system.sql
\i migrations/feature-flags-ab-testing.sql
```

**Verify migrations**:
```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('admin_users', 'feature_flags', 'experiments');

-- Should return 3 rows
```

---

## Step 4: Create First Admin User (2 min)

```bash
# Generate password hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('everreach123!@#', 10));"
```

Copy the hash output, then run:

```sql
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@everreach.app',
  '<paste_hash_here>',
  'Admin User',
  'super_admin'
);
```

---

## Step 5: Configure Vercel Cron Jobs (3 min)

Update `vercel.json` to include:

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
      "path": "/api/cron/refresh-dashboard-views",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/check-warmth-alerts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Cron Schedule Explained**:
- `*/15 * * * *` - Every 15 minutes (PostHog events)
- `0 6 * * *` - Daily at 6 AM (Email metrics)
- `0 * * * *` - Every hour (Refresh views)
- `0 9 * * *` - Daily at 9 AM (Warmth alerts)

---

## Step 6: Deploy to Vercel (2 min)

```bash
# Commit changes
git add .
git commit -m "Add developer dashboard system"

# Push to backend branch
git push origin feat/backend-vercel-only-clean
```

**Vercel will auto-deploy** from the `feat/backend-vercel-only-clean` branch.

---

## Step 7: Test Admin Authentication (2 min)

```bash
# Test login
curl -X POST https://ever-reach-be.vercel.app/api/admin/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@everreach.app",
    "password": "everreach123!@#"
  }'
```

**Expected response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@everreach.app",
    "role": "super_admin"
  },
  "token": "abc123...",
  "expiresAt": "2025-10-28T..."
}
```

Save the `token` for testing other endpoints.

---

## Step 8: Test Dashboard Endpoints (3 min)

Replace `<TOKEN>` with the token from Step 7:

```bash
# 1. Dashboard Overview
curl https://ever-reach-be.vercel.app/api/admin/dashboard/overview \
  --oauth2-bearer "$SERVICE_API_TOKEN"

# 2. Feature Flags List
curl https://ever-reach-be.vercel.app/api/admin/feature-flags \
  --oauth2-bearer "$SERVICE_API_TOKEN"

# 3. Experiments List
curl https://ever-reach-be.vercel.app/api/admin/experiments \
  --oauth2-bearer "$SERVICE_API_TOKEN"

# 4. Create Feature Flag
curl -X POST https://ever-reach-be.vercel.app/api/admin/feature-flags \
  --oauth2-bearer "$SERVICE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "test_flag",
    "name": "Test Feature Flag",
    "description": "Testing the dashboard",
    "rollout_percentage": 50,
    "is_enabled": true
  }'
```

---

## Step 9: Test Cron Jobs (2 min)

```bash
# Test PostHog sync
curl -X POST https://ever-reach-be.vercel.app/api/cron/sync-posthog-events \
  --oauth2-bearer "$SERVICE_API_TOKEN"

# Test refresh views
curl -X POST https://ever-reach-be.vercel.app/api/cron/refresh-dashboard-views \
  --oauth2-bearer "$SERVICE_API_TOKEN"
```

**Expected response** (both):
```json
{
  "success": true,
  ...
}
```

---

## Step 10: Verify in Supabase (2 min)

```sql
-- Check PostHog events cache
SELECT * FROM posthog_events_cache ORDER BY date DESC LIMIT 10;

-- Check materialized views refreshed
SELECT * FROM mv_app_health_summary ORDER BY date DESC LIMIT 7;

-- Check feature flag
SELECT * FROM feature_flags WHERE key = 'test_flag';
```

---

## ✅ Deployment Complete!

### What's Working Now:

1. **Admin Authentication** ✅
   - Login with email/password
   - Password reset via Resend
   - Session management (7-day tokens)

2. **Dashboard API** ✅
   - Overview endpoint (app health, user growth, experiments)
   - Feature flags CRUD
   - Experiments CRUD

3. **Cron Jobs** ✅
   - PostHog event sync (every 15 min)
   - Email metrics sync (daily 6 AM)
   - Dashboard views refresh (hourly)
   - Warmth alerts check (daily 9 AM)

4. **Data Ingestion** ✅
   - Email campaign ingestion endpoint

### API Endpoints Available:

**Admin Auth**:
- `POST /api/admin/auth/signin`
- `POST /api/admin/auth/request-reset`
- `POST /api/admin/auth/signout`

**Dashboard**:
- `GET /api/admin/dashboard/overview?days=30`

**Feature Flags**:
- `GET /api/admin/feature-flags?environment=production`
- `POST /api/admin/feature-flags`
- `GET /api/admin/feature-flags/[key]`
- `PATCH /api/admin/feature-flags/[key]`
- `DELETE /api/admin/feature-flags/[key]`

**Experiments**:
- `GET /api/admin/experiments?status=running`
- `POST /api/admin/experiments`
- `GET /api/admin/experiments/[key]`
- `PATCH /api/admin/experiments/[key]`
- `DELETE /api/admin/experiments/[key]`

**Data Ingestion**:
- `POST /api/admin/ingest/email-campaign`

---

## Next Steps

### Phase 2: Additional Data Sources (Week 2)

1. **Social Media Sync** (2-3 hours)
   - Twitter API integration
   - LinkedIn API integration
   - Instagram Graph API integration

2. **Meta Ads Sync** (3-4 hours)
   - Meta Marketing API setup
   - Campaign/ad set/ad sync
   - Daily metrics aggregation

3. **Content/Landing Page Tracking** (2 hours)
   - Google Analytics 4 integration
   - Page performance tracking

### Phase 3: Dashboard UI (Week 3-4)

Build Next.js admin portal at `admin.everreach.app`:
- Login page
- Overview dashboard
- Feature flags management
- Experiments management
- Marketing analytics

---

## Troubleshooting

### Can't login
- Verify password hash is correct (bcrypt)
- Check `admin_users.is_active = true`
- Ensure email matches exactly (lowercase)

### Cron jobs not running
- Verify `CRON_SECRET` env var is set
- Check Vercel cron logs
- Test manually with curl commands above

### PostHog sync not working
- Get Personal API Key from PostHog settings
- Add `POSTHOG_PERSONAL_API_KEY` to env vars
- Check PostHog project ID matches

### Dashboard shows no data
- Run: `SELECT refresh_dashboard_views();`
- Check that events exist in `posthog_events_cache`
- Verify materialized views exist

---

## Security Checklist

- ✅ Admin passwords hashed with bcrypt (10 rounds)
- ✅ Sessions expire after 7 days
- ✅ Cron jobs protected with secret token
- ✅ All admin endpoints require authentication
- ✅ Role-based access control (super_admin, admin, analyst, viewer)
- ✅ Password reset tokens expire after 1 hour
- ✅ Email sent via Resend (verified domain)

---

**Total Deployment Time**: ~15 minutes  
**Files Created**: 11 (API routes, migrations, docs)  
**Endpoints Live**: 12  
**Cron Jobs**: 4  
**Database Tables**: 16  

**Ready for**: Marketing tracking, A/B testing, feature flags! 🚀

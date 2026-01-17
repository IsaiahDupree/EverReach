# 🔧 Dashboard Adapter Fix - Quick Guide

## 📊 Your Dashboard Setup

**Dashboard URL**: 
- Local: `http://localhost:3001/dashboard/health`
- Production: `https://reports.everreach.app`

**Backend API**: `https://ever-reach-be.vercel.app`  
**Workspace ID**: `b948da70-72f7-427b-9f68-0ee55dadb37c`

The dashboard reads health data from Supabase `service_status` table, which is populated by the backend health check cron job.

---

## ✅ What's Working

Your dashboard page at `dashboard-app/src/app/(main)/dashboard/health/page.tsx` is:
- ✅ Correctly querying `service_status` table
- ✅ Displaying service status cards
- ✅ Showing metrics from `metrics_timeseries`
- ✅ Deployed to Vercel

---

## ❌ What Needs Fixing

The backend adapters need correct API keys and the health check cron needs to run:

1. **RevenueCat** - Needs V2 API key update
2. **Database** - Needs updated `integration_accounts` configuration
3. **Health Check Cron** - Needs to run to populate `service_status`

---

## 🚀 Fix Instructions

### **Step 1: Update Database Configuration**

Run this in **Supabase SQL Editor**:

```sql
-- Update RevenueCat to V2 API
UPDATE integration_accounts
SET 
  auth_json = jsonb_build_object(
    'api_key', 'sk_RhNrMwSsvsgTRCujwTYSyimcmndWp',
    'project_id', 'projf143188e',
    'sdk_key_app_store', 'appl_vFMuKNRSMlJOSINeBHtjivpcZNs',
    'sdk_key_test', 'test_KsnKaXlsDwOXbyRyCrQZjHcQDhv',
    'sdk_key_web', 'rcb_ElSyxfqivpMlrxCyzywWaeOsylYh',
    'app_id_ios', 'app3063e75cd7',
    'app_id_web', 'appa73f908128'
  ),
  is_active = true,
  updated_at = now()
WHERE service = 'revenuecat'
  AND workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c';

-- Verify update
SELECT 
  service,
  is_active,
  auth_json->>'api_key' as api_key_prefix,
  auth_json->>'project_id' as project_id
FROM integration_accounts
WHERE workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c'
  AND service = 'revenuecat';
```

### **Step 2: Deploy Updated Backend**

The RevenueCat adapter has been updated to use V2 API. Deploy changes:

```bash
cd backend-vercel

# Stage changes
git add lib/dashboard/adapters/revenuecat-adapter.ts
git add migrations/fix-health-check-errors.sql

# Commit
git commit -m "fix: Update RevenueCat adapter to V2 API"

# Push to deployment branch
git push origin feat/backend-vercel-only-clean
```

### **Step 3: Manually Trigger Health Check**

Once deployed, trigger the health check cron job:

```bash
curl -X GET "https://ever-reach-be.vercel.app/api/cron/health-check" \
  -H "Authorization: Bearer F1Oyw5XaGAdemqtRoZ8IczKlHQMsn9Uk"
```

Or use the integrations health API:

```bash
curl -X GET "https://ever-reach-be.vercel.app/api/integrations/health" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### **Step 4: Verify Dashboard**

1. Open `https://reports.everreach.app`
2. Navigate to `/dashboard/health`
3. Check that services show correct status:
   - **RevenueCat** should show **UP** (green)
   - Other services should reflect their actual status

---

## 📊 Expected Results

After running the fixes, your dashboard should show:

### **Service Status Cards**

| Service | Expected Status | Notes |
|---------|----------------|-------|
| **RevenueCat** | 🟢 UP | V2 API working |
| **Stripe** | 🟢 UP | Payment processing |
| **Supabase** | 🟢 UP | Database |
| **OpenAI** | 🟢 UP | AI features |
| **Resend** | 🟢 UP | Email |
| **Twilio** | 🟢 UP | SMS |
| **PostHog** | 🟡 DEGRADED | Project ID needs fix |
| **Meta** | 🟢 UP | Ads |
| **Superwall** | 🟡 DEGRADED | App ID verification needed |
| **Apple** | ⚪ UNKNOWN | Not configured |
| **Google** | ⚪ UNKNOWN | Not configured |
| **EverReach** | 🟢 UP | Mobile app |

---

## 🔍 Troubleshooting

### **Services Still Show UNKNOWN**

**Problem**: Services not in `service_status` table  
**Solution**: Run health check cron manually (Step 3 above)

### **RevenueCat Still Shows DOWN**

**Problem**: V2 API key not in database or adapter not deployed  
**Solutions**:
1. Verify SQL update ran successfully (check Step 1 verification query)
2. Verify backend deployment completed
3. Check adapter file was deployed: `lib/dashboard/adapters/revenuecat-adapter.ts`

### **Dashboard Shows Old Data**

**Problem**: Browser cache or stale SSR data  
**Solutions**:
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Wait for Next.js revalidation (dashboard uses server components with automatic revalidation)

### **Health Check Cron Not Running**

**Problem**: Vercel cron not configured  
**Solution**: Check `vercel.json` in backend-vercel:

```json
{
  "crons": [{
    "path": "/api/cron/health-check",
    "schedule": "*/5 * * * *"
  }]
}
```

---

## 📁 Files Modified

### **Backend (backend-vercel/)**
1. ✅ `lib/dashboard/adapters/revenuecat-adapter.ts` - Updated to V2 API
2. ✅ `migrations/fix-health-check-errors.sql` - Updated RevenueCat config

### **Dashboard (dashboard-app/)** 
No changes needed! Dashboard is already perfect and working.

---

## 🎯 Integration Test Verification

After deploying, verify with integration tests:

```bash
cd backend-vercel

# Test RevenueCat integration
npm run test:services:revenuecat

# Should show:
# ✅ PASS - Configuration
# ✅ PASS - RevenueCat Auth
# ✅ PASS - Project Access (Optional)
# ✅ PASS - Apps Config
# ✅ PASS - Products
# ✅ PASS - Entitlements
# ✅ PASS - Adapter Health
# ✅ PASS - Webhook Config
# Success Rate: 100.0%
```

---

## 🔄 Automated Health Checks

Once fixed, health checks will run automatically:

- **Frequency**: Every 5 minutes (Vercel cron)
- **Endpoint**: `/api/cron/health-check`
- **Updates**: `service_status` table
- **Dashboard**: Auto-refreshes on page load (server component)

The dashboard will always show fresh data from the last health check (within 5 minutes).

---

## 📈 Dashboard Features Already Working

Your existing dashboard shows:

✅ **Service Status Cards** - 12 services with live status  
✅ **Email Metrics** - Resend delivery rates, open rates, click rates  
✅ **SMS Metrics** - Twilio delivery rates  
✅ **AI Cost Tracking** - OpenAI spend over 7 days  
✅ **Revenue Tracking** - Stripe revenue  
✅ **RevenueCat Metrics** - Active subs, trial conversions, cancellations  
✅ **Superwall Metrics** - Paywall views and conversion rates  
✅ **App Usage** - EverReach active users, sessions, crash rate  
✅ **Feature Usage** - Top 5 features used  

---

## ✅ Summary

**What to do:**
1. Run SQL migration (Step 1) ← **DO THIS FIRST**
2. Deploy backend (Step 2)
3. Trigger health check (Step 3)
4. Verify dashboard (Step 4)

**Time required:** ~10 minutes

**Result:** All services showing correct status in your dashboard!

---

**Created**: November 10, 2025  
**Dashboard**: `https://reports.everreach.app`  
**Status**: Ready to fix 🚀

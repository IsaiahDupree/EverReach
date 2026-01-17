# Local Paywall Strategy Testing Guide

## 🎯 Goal
Test the paywall strategy system locally **without switching git branches** or deploying to Vercel.

---

## 📋 Prerequisites

1. **Database Migration Applied**
   ```bash
   # Run in Supabase Dashboard SQL Editor
   # File: backend-vercel/supabase/migrations/20251112_paywall_strategy_system.sql
   ```

2. **Environment Variables Set**
   ```bash
   # backend-vercel/.env.local
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

3. **Dependencies Installed**
   ```bash
   cd backend-vercel
   npm install
   ```

---

## 🚀 Step 1: Start Local Backend Server

```bash
cd backend-vercel
npm run dev
```

Server should start at: `http://localhost:3000`

Verify it's running:
```bash
curl http://localhost:3000/api/health
```

---

## 🧪 Step 2: Run Automated Test Suite

### Option A: Full Automated Test
```bash
cd backend-vercel
node test-paywall-strategy.mjs
```

This will:
- ✅ Get initial config
- ✅ Switch to SOFT_AFTER_7D
- ✅ Verify config changed
- ✅ Check feature access (contact_detail, settings)
- ✅ Switch to HARD_AFTER_30D
- ✅ Update usage tracking
- ✅ Switch to usage-based trial
- ✅ Get config with usage stats

**Expected Output:**
```
🚀 Paywall Strategy Testing Suite

Testing locally at: http://localhost:3000
Auth Token: test-token-123...

============================================================
Test 1: Get Current Config (Platform: mobile)
============================================================

✅ Config fetched successfully

Current Strategy: Soft: 7-Day Trial
Presentation: Video Onboarding Flow
Trial Type: 7-Day Trial
Trial Ended: false
Can Show Review: false

Permissions:
  login_auth: ✅ (full)
  onboarding: ✅ (full)
  contacts_list: ✅ (view_only)
```

---

## 🔧 Step 3: Manual Testing with curl

### Test 1: Get Current Config

```bash
# Mobile config
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=mobile" | jq

# Web config
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=web" | jq

# With user trial status
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=mobile&user_id=USER_ID" | jq
```

### Test 2: Switch to Different Strategy

```bash
# Switch mobile to SOFT_AFTER_7D
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "mobile",
    "strategy_id": "SOFT_AFTER_7D",
    "presentation_id": "PAYWALL_ONBOARDING_VIDEO",
    "trial_type_id": "TRIAL_7_DAYS"
  }' | jq

# Switch mobile to HARD_AFTER_30D
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "mobile",
    "strategy_id": "HARD_AFTER_30D",
    "presentation_id": "PAYWALL_STATIC",
    "trial_type_id": "TRIAL_30_DAYS"
  }' | jq

# Switch to Hard-Hard mode (nuclear option)
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "mobile",
    "strategy_id": "HH_LOGIN_LOCKED",
    "presentation_id": "PAYWALL_STATIC",
    "trial_type_id": "NO_TRIAL_LOCKED"
  }' | jq

# Switch to usage-based trial
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "mobile",
    "strategy_id": "HARD_AFTER_USAGE",
    "presentation_id": "PAYWALL_STATIC",
    "trial_type_id": "TRIAL_USAGE_10H",
    "usage_cap_hours": 10
  }' | jq
```

### Test 3: Check Feature Access

```bash
# Check if user can access contact detail view
curl -X POST "http://localhost:3000/api/v1/paywall/check-access" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "feature_area": "contact_detail",
    "platform": "mobile"
  }' | jq

# Check access to pro features
curl -X POST "http://localhost:3000/api/v1/paywall/check-access" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "feature_area": "pro_features",
    "platform": "mobile"
  }' | jq

# Check access to settings (should always be allowed)
curl -X POST "http://localhost:3000/api/v1/paywall/check-access" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "feature_area": "settings",
    "platform": "mobile"
  }' | jq
```

### Test 4: Update Usage Tracking

```bash
# Add 30 minutes of usage and increment session count
curl -X POST "http://localhost:3000/api/v1/paywall/update-usage" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "session_minutes": 30,
    "increment_sessions": true
  }' | jq

# Add more usage to trigger trial end (for 10-hour trial)
curl -X POST "http://localhost:3000/api/v1/paywall/update-usage" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "session_minutes": 600,
    "increment_sessions": false
  }' | jq
```

### Test 5: Track Review Prompt

```bash
# Log that review prompt was shown and user reviewed
curl -X POST "http://localhost:3000/api/v1/paywall/track-review-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "mobile_ios",
    "prompt_type": "after_purchase",
    "action_taken": "reviewed"
  }' | jq

# Log that user dismissed prompt
curl -X POST "http://localhost:3000/api/v1/paywall/track-review-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "mobile_ios",
    "prompt_type": "after_usage",
    "action_taken": "dismissed"
  }' | jq
```

---

## 🧩 Step 4: Test Different Scenarios

### Scenario 1: Test Soft Paywall (Can Skip)
```bash
# 1. Switch to soft strategy
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "mobile", "strategy_id": "SOFT_AFTER_7D", "presentation_id": "PAYWALL_STATIC", "trial_type_id": "TRIAL_7_DAYS"}' | jq

# 2. Check access (trial ended)
curl -X POST "http://localhost:3000/api/v1/paywall/check-access" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"feature_area": "contact_detail"}' | jq

# Expected: can_skip_paywall: true
```

### Scenario 2: Test Hard Paywall (Cannot Skip)
```bash
# 1. Switch to hard strategy
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "mobile", "strategy_id": "HARD_AFTER_7D", "presentation_id": "PAYWALL_STATIC", "trial_type_id": "TRIAL_7_DAYS"}' | jq

# 2. Check access
curl -X POST "http://localhost:3000/api/v1/paywall/check-access" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"feature_area": "contact_detail"}' | jq

# Expected: can_skip_paywall: false
```

### Scenario 3: Test Usage-Based Trial
```bash
# 1. Switch to usage-based trial (10 hours)
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "mobile", "strategy_id": "HARD_AFTER_USAGE", "presentation_id": "PAYWALL_STATIC", "trial_type_id": "TRIAL_USAGE_10H"}' | jq

# 2. Get config with usage stats
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=mobile&user_id=YOUR_USER_ID" | jq

# Expected: usage_stats.hours_remaining should show

# 3. Add 5 hours of usage
curl -X POST "http://localhost:3000/api/v1/paywall/update-usage" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"session_minutes": 300}' | jq

# 4. Check again - hours should decrease
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=mobile&user_id=YOUR_USER_ID" | jq
```

### Scenario 4: Test Platform-Specific Configs
```bash
# Set different configs for mobile vs web
curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "mobile", "strategy_id": "SOFT_AFTER_7D", "presentation_id": "PAYWALL_ONBOARDING_VIDEO", "trial_type_id": "TRIAL_7_DAYS"}' | jq

curl -X POST "http://localhost:3000/api/v1/config/paywall-strategy" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "web", "strategy_id": "HARD_AFTER_30D", "presentation_id": "PAYWALL_STATIC", "trial_type_id": "TRIAL_30_DAYS"}' | jq

# Verify they're different
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=mobile" | jq '.strategy.id'
curl "http://localhost:3000/api/v1/config/paywall-strategy?platform=web" | jq '.strategy.id'
```

---

## 🎯 Quick Test Checklist

- [ ] Backend running locally at localhost:3000
- [ ] Database migration applied
- [ ] Can fetch current config
- [ ] Can switch strategies (SOFT → HARD → USAGE)
- [ ] Can switch presentations (STATIC → VIDEO → APPSTORE)
- [ ] Can switch trial types (7D → 30D → USAGE → NONE)
- [ ] Access check returns correct permissions
- [ ] Soft paywall allows skipping (can_skip: true)
- [ ] Hard paywall blocks skipping (can_skip: false)
- [ ] Usage tracking increments correctly
- [ ] Usage-based trial shows hours remaining
- [ ] Mobile and web configs can be different

---

## 📊 Verify Database Changes

After switching configs, check the database:

```sql
-- See active configs for each platform
SELECT platform, strategy_id, presentation_id, trial_type_id
FROM active_paywall_config
ORDER BY platform;

-- See all available strategies
SELECT id, name, mode, trigger_type, can_skip
FROM paywall_strategies;

-- Check user usage tracking
SELECT user_id, total_active_minutes, total_sessions
FROM user_usage_tracking
WHERE user_id = 'YOUR_USER_ID';

-- See review prompt history
SELECT user_id, platform, prompt_type, action_taken, shown_at
FROM review_prompt_history
WHERE user_id = 'YOUR_USER_ID'
ORDER BY shown_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch config"
**Solution:** Verify database migration ran successfully
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('paywall_strategies', 'active_paywall_config');
```

### Issue: "Unauthorized" errors
**Solution:** Set a valid auth token
```bash
# Get a real token from Supabase
export TEST_AUTH_TOKEN="your_real_token_here"
export TEST_USER_ID="your_real_user_id_here"

# Run tests
node test-paywall-strategy.mjs
```

### Issue: "Strategy not found"
**Solution:** Check strategy exists in database
```sql
SELECT id FROM paywall_strategies WHERE id = 'SOFT_AFTER_7D';
```

---

## ✅ Success Criteria

You should see:

1. **Config switches instantly** when you POST to `/config/paywall-strategy`
2. **GET requests show updated config** immediately after
3. **Access checks reflect current strategy** (soft = can skip, hard = cannot)
4. **Usage tracking works** for usage-based trials
5. **Platform-specific configs work** (mobile ≠ web)
6. **Trial status calculates correctly** (days/hours remaining)

---

## 🎉 Next Steps

Once local testing is successful:

1. **Deploy to production**
   ```bash
   git push origin feat/event-tracking-hotfix
   ```

2. **Build admin dashboard UI** to control these configs visually

3. **Integrate into mobile/web apps** using the tested API endpoints

---

**Status:** Local testing fully configured ✅

**No git branch switching needed** - all testing happens on current branch with local dev server!

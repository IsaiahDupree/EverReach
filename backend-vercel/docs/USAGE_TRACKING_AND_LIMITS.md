# Usage Tracking & Limits - Current State

## Overview

Your database has **partial** usage tracking infrastructure. Here's what exists and what's missing:

---

## ✅ **Fully Implemented**

### 1. **Screenshots Per Month** ✅
**Status:** Fully tracked and enforced

**Table:** `usage_periods`
- `screenshot_count` - Current usage this period
- `screenshot_limit` - Limit based on tier
- `period_start` / `period_end` - Monthly period boundaries

**Tier Limits:**
- **Core (Free):** 100/month
- **Pro:** 300/month  
- **Enterprise:** Unlimited (-1)

**Enforcement:**
- Database function: `can_use_screenshot_analysis(user_id)`
- Code: `lib/usage-limits.ts` → `canUseScreenshots()`
- Returns 429 error when limit reached

**Example Query:**
```sql
SELECT screenshot_count, screenshot_limit, period_start, period_end
FROM usage_periods
WHERE user_id = '...' 
  AND period_start <= NOW() 
  AND period_end >= NOW();
```

---

## ⚠️ **Tracked But Not Enforced**

### 2. **Message Generations Per Month** ⚠️
**Status:** Tracked in cache, but no active limits enforced

**Table:** `paywall_insights_cache`
- `compose_runs_used` - Count of message generations
- `messages_drafted` - Drafts created
- `messages_sent` - Messages actually sent

**Current State:**
- ✅ Usage is **tracked** in `paywall_insights_cache`
- ❌ No **limits** are enforced
- ❌ No **database functions** to check limits
- ❌ No **error responses** when limit reached

**Code Reference:**
- `/api/me/usage-summary` returns `compose_runs_used`
- Hardcoded limit suggestion: `50` (in route, not enforced)

**What's Missing:**
1. Add `compose_runs_limit` column to `usage_periods` table
2. Create `can_use_compose()` database function
3. Add enforcement in message generation routes
4. Update `lib/usage-limits.ts` to actually check limits (currently returns unlimited)

---

### 3. **Transcription Minutes Per Month** ⚠️
**Status:** Tracked in cache, but no active limits enforced

**Table:** `paywall_insights_cache`
- `voice_minutes_used` - Minutes of transcription used
- `storage_used_mb` - Storage for voice files

**Current State:**
- ✅ Usage is **tracked** in `paywall_insights_cache`
- ❌ No **limits** are enforced
- ❌ No **database functions** to check limits
- ❌ No **error responses** when limit reached

**Code Reference:**
- `/api/me/usage-summary` returns `voice_minutes_used`
- Hardcoded limit suggestion: `30` minutes (in route, not enforced)

**What's Missing:**
1. Add `voice_minutes_used` and `voice_minutes_limit` to `usage_periods` table
2. Track transcription duration when processing voice notes
3. Create `can_use_voice_transcription()` database function
4. Add enforcement in voice note processing routes

---

## 📊 **Current Database Tables**

### `usage_periods` (Active)
```sql
CREATE TABLE usage_periods (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  screenshot_count INT DEFAULT 0,
  screenshot_limit INT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**What it tracks:** ✅ Screenshots only

---

### `paywall_insights_cache` (Analytics Only)
```sql
CREATE TABLE paywall_insights_cache (
  user_id UUID,
  window TEXT, -- '30d' or '90d'
  compose_runs_used INT,        -- ⚠️ Tracked but not limited
  voice_minutes_used NUMERIC,   -- ⚠️ Tracked but not limited
  messages_drafted INT,
  messages_sent INT,
  storage_used_mb NUMERIC,
  -- ... other analytics fields
);
```

**What it tracks:** Analytics/metrics for paywall display, not enforcement

---

### `user_usage_limits` (Defined in Migration, NOT in Database)
**Status:** ❌ Table does not exist in database

**Migration File:** `subscription-tiers-and-usage-limits.sql`

**Intended Schema:**
```sql
CREATE TABLE user_usage_limits (
  screenshots_used INT,
  screenshots_limit INT,
  voice_notes_used INT,           -- Planned but not created
  voice_notes_limit INT,          -- Planned but not created
  chat_messages_used INT,         -- Planned but not created
  chat_messages_limit INT,        -- Planned but not created
  compose_generations_used INT,   -- Planned but not created
  compose_generations_limit INT,  -- Planned but not created
  -- ...
);
```

**Why it's missing:** Migration was written but never applied to production database.

---

## 🎯 **Recommendations**

### Option 1: Extend `usage_periods` Table (Recommended)
Add columns to existing `usage_periods` table:

```sql
ALTER TABLE usage_periods
  ADD COLUMN IF NOT EXISTS compose_runs_used INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compose_runs_limit INT DEFAULT -1, -- -1 = unlimited
  ADD COLUMN IF NOT EXISTS voice_minutes_used NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_minutes_limit NUMERIC DEFAULT -1; -- -1 = unlimited
```

**Pros:**
- Uses existing table structure
- Consistent with screenshot tracking
- Monthly period boundaries already in place

---

### Option 2: Create `user_usage_limits` Table
Apply the migration that was already written:

```sql
-- From: migrations/subscription-tiers-and-usage-limits.sql
CREATE TABLE user_usage_limits (
  -- ... full schema from migration
);
```

**Pros:**
- More comprehensive schema
- Already has database functions defined
- Matches code in `lib/usage-limits.ts`

**Cons:**
- Would need to migrate data from `usage_periods`
- More complex migration

---

## 📝 **Current Tier Limits (Code)**

From `lib/usage-limits.ts`:

| Feature | Core | Pro | Enterprise |
|---------|------|-----|------------|
| Screenshots | 100/month | 300/month | Unlimited |
| Voice Notes | Unlimited | Unlimited | Unlimited |
| Chat Messages | Unlimited | Unlimited | Unlimited |
| Compose Generations | Unlimited | Unlimited | Unlimited |

**Note:** Only screenshots are actually enforced. Others are "unlimited" in code but could be limited if you add enforcement.

---

## 🔍 **How to Check Current Usage**

### Screenshots (Enforced):
```sql
SELECT screenshot_count, screenshot_limit, period_end
FROM usage_periods
WHERE user_id = 'USER_ID'
  AND period_start <= NOW()
  AND period_end >= NOW();
```

### Message Generations (Tracked Only):
```sql
SELECT compose_runs_used, messages_drafted, messages_sent
FROM paywall_insights_cache
WHERE user_id = 'USER_ID'
  AND window = '30d';
```

### Voice Minutes (Tracked Only):
```sql
SELECT voice_minutes_used, storage_used_mb
FROM paywall_insights_cache
WHERE user_id = 'USER_ID'
  AND window = '30d';
```

---

## 🚀 **Next Steps to Enable Full Enforcement**

1. **Add columns to `usage_periods`** for compose_runs and voice_minutes
2. **Create database functions** to check and increment usage
3. **Update routes** to check limits before processing:
   - `/api/v1/messages/generate` - Check compose limit
   - `/api/v1/voice/transcribe` - Check voice minutes limit
4. **Update `lib/usage-limits.ts`** to actually query database instead of returning unlimited
5. **Add tier-based limits** to code (e.g., Core: 50 compose/month, Pro: 200/month)

---

## 📚 **Related Files**

- `backend/backend-vercel/lib/usage-limits.ts` - Usage checking logic
- `backend/backend-vercel/migrations/subscription-tiers-and-usage-limits.sql` - Planned schema
- `backend/backend-vercel/app/api/me/usage-summary/route.ts` - Usage summary endpoint
- `backend/TIER_LIMITS_DOCUMENTATION.md` - Tier documentation





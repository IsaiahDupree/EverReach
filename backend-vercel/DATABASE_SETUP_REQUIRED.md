# Database Setup Required for Usage Tracking

**Status:** ⚠️ Requires Database Migration  
**Impact:** Usage metrics will show 0 until migration is applied

---

## ✅ What's Needed

Your code is ready, but the database needs the `usage_periods` table with the following columns:

### Required Columns:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `screenshot_count` | INT | 0 | Track screenshot analysis usage |
| `screenshots_limit` | INT | 100 | Monthly screenshot limit |
| `voice_minutes_used` | NUMERIC(10,2) | 0 | Track voice transcription minutes |
| `voice_minutes_limit` | NUMERIC(10,2) | 30 | Monthly voice minutes limit |
| `compose_runs_used` | INT | 0 | Track AI compose usage (not displayed but tracked) |
| `compose_runs_limit` | INT | 50 | Monthly compose limit |

---

## 🚀 How to Apply

### Option 1: Run Migration File (Recommended)

**File:** `/backend/backend-vercel/migrations/add_compose_and_voice_usage_limits.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire migration file
3. Click "Run"

**What it does:**
- ✅ Adds usage tracking columns to `usage_periods` table
- ✅ Creates/updates `get_or_create_usage_period()` function
- ✅ Creates `can_use_compose()` function
- ✅ Creates `increment_compose_usage()` function
- ✅ Creates `can_use_voice_transcription()` function
- ✅ Creates `increment_voice_transcription_usage()` function
- ✅ Sets tier-based limits (Core: 50/30/100, Pro: 200/120/300)

---

### Option 2: Quick SQL (Manual Setup)

If you just need the columns added:

```sql
-- Add missing columns to usage_periods
ALTER TABLE usage_periods
  ADD COLUMN IF NOT EXISTS screenshot_count INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS screenshots_limit INT DEFAULT 100 NOT NULL,
  ADD COLUMN IF NOT EXISTS compose_runs_used INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS compose_runs_limit INT DEFAULT 50 NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_minutes_used NUMERIC(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_minutes_limit NUMERIC(10,2) DEFAULT 30 NOT NULL;
```

⚠️ **Note:** This only adds columns. You won't have the database functions for enforcement.

---

## 🔍 Check if Already Applied

Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'usage_periods'
  AND column_name IN (
    'screenshot_count',
    'screenshots_limit', 
    'voice_minutes_used',
    'voice_minutes_limit',
    'compose_runs_used',
    'compose_runs_limit'
  )
ORDER BY column_name;
```

**Expected Result:** Should return 6 rows

If it returns **0 rows** → Migration needed  
If it returns **6 rows** → Already applied ✅

---

## 📊 After Migration

Once applied, the usage tracking will work:

1. **API Response** (`/api/me/usage-summary`)
   ```json
   {
     "usage": {
       "voice_minutes_used": 0,
       "screenshot_count": 0,
       "messages_sent": 0
     },
     "limits": {
       "voice_minutes": 30,
       "screenshots": 100,
       "messages": 200
     }
   }
   ```

2. **Subscription Page**
   - Will display actual values from database
   - Currently shows 0/30, 0/100, 0/200

3. **Usage Periods Table**
   - Creates a new row each month per user
   - Tracks usage across the period
   - Resets automatically at month boundary

---

## 🎯 Default Limits by Tier

After migration, limits will be set based on subscription tier:

| Tier | Screenshots | Voice Minutes | Compose Runs |
|------|-------------|---------------|--------------|
| **Core** (Free) | 100/month | 30/month | 50/month |
| **Pro** | 300/month | 120/month | 200/month |
| **Enterprise** | Unlimited | Unlimited | Unlimited |

---

## ⏳ Next Steps (Phase 2)

After database is set up, to actually enforce limits:

1. Add usage checks to routes
2. Increment counters after operations
3. Return 429 errors when limits hit

**See:** `docs/USAGE_ENFORCEMENT_IMPLEMENTATION.md`

---

## 🔧 Troubleshooting

### "Column already exists" error
✅ This is OK - migration uses `IF NOT EXISTS`

### "Function doesn't exist" when calling API
❌ Migration not applied - run full migration file

### Usage shows 0 but I've used features
❌ Routes aren't incrementing counters yet (Phase 2)

### Table 'usage_periods' doesn't exist
❌ Run COMPLETE_SCREENSHOT_FIX.sql first, then add_compose_and_voice_usage_limits.sql

---

## 📁 Migration Files Available

1. **`COMPLETE_SCREENSHOT_FIX.sql`** - Creates `usage_periods` table + screenshot tracking
2. **`add_compose_and_voice_usage_limits.sql`** - Adds voice & compose tracking (run after #1)
3. **`APPLY_THIS_NEXT.sql`** - Alternative fix (use if others don't work)
4. **`FINAL_FIX.sql`** - Simplified version

**Recommended Order:**
1. Run `COMPLETE_SCREENSHOT_FIX.sql` (creates table)
2. Run `add_compose_and_voice_usage_limits.sql` (adds columns)

---

## ✅ Summary

**Before Migration:**
- ❌ Database missing required columns
- ❌ Usage shows 0 for everything
- ❌ No tracking or limits enforced

**After Migration:**
- ✅ Database has all required columns
- ✅ Usage periods tracked per user per month
- ✅ Tier-based limits configured
- ✅ Ready for Phase 2 enforcement

**Action Required:**
→ Run migration in Supabase SQL Editor
→ Verify with check query above
→ Test API endpoint returns proper structure

---

**Last Updated:** November 23, 2025

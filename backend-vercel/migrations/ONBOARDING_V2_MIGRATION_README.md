# Onboarding V2 Database Migration

**Date:** November 23, 2025

---

## 🗄️ Migration Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **`create_onboarding_v2_table.sql`** | Creates complete table from scratch | New installations |
| **`add_onboarding_v2_phase6_columns.sql`** | Adds Q21-Q24 columns only | Existing installations with Q1-Q20 |

---

## 🚀 Quick Start

### Option 1: New Installation

**If the table doesn't exist yet:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `create_onboarding_v2_table.sql`
3. Click "Run"

### Option 2: Existing Installation

**If you already have `onboarding_responses_v2` with Q1-Q20:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `add_onboarding_v2_phase6_columns.sql`
3. Click "Run"

---

## 📊 Table Schema

### Complete Schema (24 Questions)

```sql
CREATE TABLE onboarding_responses_v2 (
  -- Metadata
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  version INT DEFAULT 2,
  path TEXT, -- 'paid' or 'free'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  -- Phase 1: Q1-Q5 (Easy Warmup)
  profile_first_name TEXT,
  feeling_lose_touch TEXT,
  persona_type TEXT,
  desired_contacts_size TEXT,
  last_reachout_window TEXT,
  
  -- Phase 2: Q6-Q10 (What You Need Help With)
  friction_primary TEXT,
  focus_segment TEXT,
  goal_30_days TEXT,
  existing_system TEXT,
  daily_help_pref TEXT,
  
  -- Phase 3: Q11-Q14 (How EverReach Should Feel)
  message_style TEXT,
  today_list_size TEXT,
  channel_primary TEXT,
  assistance_level TEXT,
  
  -- Phase 4: Q15-Q18 (Privacy & Safety)
  contacts_comfort TEXT,
  privacy_mode TEXT,
  analytics_consent TEXT,
  import_start_method TEXT,
  
  -- Phase 5: Q19-Q20 (First Win / Aha Moment)
  first_person_flag TEXT,
  first_person_name TEXT,
  
  -- Phase 6: Q21-Q24 (Expectation Setting & Emotional Anchoring)
  first_week_win TEXT,
  worst_to_forget TEXT,
  celebrate_wins TEXT,
  why_matters TEXT
);
```

---

## 🆕 New Columns (Phase 6)

| Column | Question | Values | Purpose |
|--------|----------|--------|---------|
| **`first_week_win`** | Q21: First week win | `reconnect`, `on_top`, `lead` | Sets expectation + progress emails |
| **`worst_to_forget`** | Q22: Worst to forget | `personal`, `work`, `both` | Highlights pain point |
| **`celebrate_wins`** | Q23: Celebrate wins | `yes`, `low_key`, `unsure` | Enables gamification |
| **`why_matters`** | Q24: Why it matters | `relationships`, `work`, `both` | Emotional anchor |

---

## 🔍 Verification Queries

### Check if Table Exists

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'onboarding_responses_v2'
);
```

**Expected:** `true` or `false`

---

### Check All Columns

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'onboarding_responses_v2'
ORDER BY ordinal_position;
```

**Expected:** 28 columns (3 metadata + 1 per question field)

---

### Check Phase 6 Columns Only

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_responses_v2'
  AND column_name IN (
    'first_week_win', 
    'worst_to_forget', 
    'celebrate_wins', 
    'why_matters'
  );
```

**Expected:** 4 rows

---

### View Sample Data

```sql
SELECT 
  user_id,
  path,
  completed_at,
  first_week_win,
  worst_to_forget,
  celebrate_wins,
  why_matters
FROM onboarding_responses_v2
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔐 Security

### Row Level Security (RLS)

The table has RLS enabled with these policies:

1. **SELECT:** Users can view their own responses
2. **INSERT:** Users can create their own responses
3. **UPDATE:** Users can update their own responses

### Permissions

- `authenticated` role: SELECT, INSERT, UPDATE
- `service_role` role: Full access

---

## 📝 Usage Examples

### Insert New Response

```sql
INSERT INTO onboarding_responses_v2 (
  user_id,
  version,
  path,
  profile_first_name,
  first_week_win,
  worst_to_forget,
  celebrate_wins,
  why_matters,
  completed_at
) VALUES (
  'user-uuid-here',
  2,
  'paid',
  'Isaiah',
  'reconnect',
  'both',
  'yes',
  'both',
  NOW()
);
```

---

### Query User's Latest Response

```sql
SELECT *
FROM onboarding_responses_v2
WHERE user_id = 'user-uuid-here'
ORDER BY completed_at DESC
LIMIT 1;
```

---

### Count Responses by Path

```sql
SELECT 
  path,
  COUNT(*) as count
FROM onboarding_responses_v2
WHERE completed_at IS NOT NULL
GROUP BY path;
```

**Expected Output:**
```
path  | count
------|------
paid  | 123
free  | 456
```

---

### Analyze Q21 Responses

```sql
SELECT 
  first_week_win,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM onboarding_responses_v2
WHERE first_week_win IS NOT NULL
GROUP BY first_week_win
ORDER BY count DESC;
```

---

## 🧪 Testing

### Test Data Script

```sql
-- Insert test response
INSERT INTO onboarding_responses_v2 (
  user_id,
  version,
  path,
  profile_first_name,
  feeling_lose_touch,
  persona_type,
  desired_contacts_size,
  last_reachout_window,
  friction_primary,
  focus_segment,
  goal_30_days,
  existing_system,
  daily_help_pref,
  message_style,
  today_list_size,
  channel_primary,
  assistance_level,
  contacts_comfort,
  privacy_mode,
  analytics_consent,
  import_start_method,
  first_person_flag,
  first_person_name,
  first_week_win,
  worst_to_forget,
  celebrate_wins,
  why_matters,
  completed_at
) VALUES (
  auth.uid(), -- Your user ID
  2,
  'free',
  'Test User',
  'often',
  'founder',
  'lt25',
  'few_months',
  'both_other',
  'both',
  'reconnect',
  'messy',
  'both',
  'mixed',
  '3_4',
  'mixed',
  'mix',
  'ok',
  'cloud',
  'yes',
  'import_contacts',
  'yes',
  'Mom',
  'reconnect',
  'both',
  'yes',
  'both',
  NOW()
);
```

---

## 🔄 Rollback

### Drop Phase 6 Columns

```sql
ALTER TABLE onboarding_responses_v2
  DROP COLUMN IF EXISTS first_week_win,
  DROP COLUMN IF EXISTS worst_to_forget,
  DROP COLUMN IF EXISTS celebrate_wins,
  DROP COLUMN IF EXISTS why_matters;
```

### Drop Entire Table

```sql
DROP TABLE IF EXISTS onboarding_responses_v2 CASCADE;
```

⚠️ **Warning:** This will delete all onboarding data!

---

## 📊 Analytics Queries

### Completion Rate by Path

```sql
SELECT 
  path,
  COUNT(*) as total_started,
  COUNT(completed_at) as total_completed,
  ROUND(COUNT(completed_at) * 100.0 / COUNT(*), 2) as completion_rate
FROM onboarding_responses_v2
GROUP BY path;
```

---

### Average Time to Complete

```sql
SELECT 
  path,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) as avg_minutes
FROM onboarding_responses_v2
WHERE completed_at IS NOT NULL
GROUP BY path;
```

---

### Most Common First Week Win

```sql
SELECT 
  first_week_win,
  COUNT(*) as count
FROM onboarding_responses_v2
WHERE first_week_win IS NOT NULL
GROUP BY first_week_win
ORDER BY count DESC;
```

---

## 🆘 Troubleshooting

### Issue: "relation does not exist"

**Solution:** Run `create_onboarding_v2_table.sql`

---

### Issue: "column already exists"

**Solution:** Columns are already added, no action needed

---

### Issue: "permission denied"

**Solution:** Make sure you're logged in as a user with proper permissions

---

### Issue: RLS blocking queries

**Solution:** Check user authentication or use service_role for admin queries

---

## ✅ Migration Checklist

- [ ] Backup existing data (if any)
- [ ] Run appropriate migration SQL
- [ ] Verify columns exist (verification query)
- [ ] Check RLS policies are active
- [ ] Test insert with sample data
- [ ] Test query from frontend
- [ ] Verify in Supabase dashboard
- [ ] Update API documentation

---

## 📚 Additional Resources

- **Full Spec:** `/ONBOARDING_V2_SPEC.md`
- **Implementation:** `/ONBOARDING_V2_UPDATE.md`
- **Questions:** `/mobileapp/constants/onboarding-v2-questions.ts`

---

**Last Updated:** November 23, 2025

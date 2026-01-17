# Database Setup Guide - Run Migrations in Order

## 🎯 Goal
Set up your Supabase database with all necessary tables and policies for the backend.

## ⚠️ Important: Run Migrations in This Order!

### Step 1: Run Base Schema (FIRST - Required)

**File:** `../supabase-future-schema.sql` (in project root)

This creates the core tables:
- ✅ organizations
- ✅ users
- ✅ organization_memberships
- ✅ people (contacts)
- ✅ interactions
- ✅ voice_notes
- ✅ relationship_scores
- ✅ And more...

**How to run:**

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
   ```

2. Open the file:
   ```
   c:\Users\Isaia\Documents\Coding\PersonalCRM\supabase-future-schema.sql
   ```

3. Copy the entire contents and paste into SQL Editor

4. Click **Run** (or Ctrl+Enter)

5. ✅ You should see success messages

---

### Step 2: Run Public API Migration (SECOND)

**File:** `migrations/public-api-system.sql`

This adds:
- ✅ api_keys table
- ✅ api_rate_limits table
- ✅ api_audit_logs table
- ✅ webhooks table
- ✅ webhook_deliveries table
- ✅ automation_rules table
- ✅ outbox table (message queue)
- ✅ segments table

**How to run:**

1. Open the file:
   ```
   backend-vercel/migrations/public-api-system.sql
   ```

2. Copy contents and paste into Supabase SQL Editor

3. Click **Run**

---

### Step 3: Run E2E Test Policies (THIRD - Optional)

**File:** `migrations/enable-e2e-test-data.sql`

This adds RLS policies to allow E2E tests to create test data.

**How to run:**

1. Open the file:
   ```
   backend-vercel/migrations/enable-e2e-test-data.sql
   ```

2. Copy contents and paste into Supabase SQL Editor

3. Click **Run**

4. ✅ You should see: `E2E test data policies created successfully!`

---

### Step 4: (Optional) Run Additional Feature Migrations

If you want specific features, run these migrations:

**Agent System:**
```
backend-vercel/db/agent-schema.sql
```
- Adds: agent_conversations, user_agent_context, contact_analysis

**Warmth Alerts:**
```
backend-vercel/migrations/warmth-alerts.sql
```
- Adds: warmth_alerts, user_push_tokens

**Custom Fields:**
```
backend-vercel/migrations/custom-fields-system.sql
```
- Adds: field_definitions, field_audit_log

**Analytics:**
```
backend-vercel/migrations/analytics-schema.sql
```
- Adds: analytics_events, aggregated_metrics

---

## ✅ Verify Database Setup

After running migrations, verify tables exist:

```sql
-- Check core tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- ✅ organizations
- ✅ users
- ✅ organization_memberships
- ✅ people
- ✅ interactions
- ✅ api_keys
- ✅ And more...

---

## 🔍 Troubleshooting

### Error: "relation already exists"

**Solution:** Table already created. This is safe to ignore, or add `IF NOT EXISTS` to CREATE TABLE statements.

### Error: "relation does not exist"

**Solution:** You skipped Step 1. Run the base schema first (`supabase-future-schema.sql`).

### Error: "permission denied"

**Solution:** Make sure you're logged into the correct Supabase project.

---

## 🎉 After Setup

Once migrations are complete:

1. **Update `.env`:**
   ```bash
   TEST_SKIP_E2E=false  # Enable E2E tests
   ```

2. **Run E2E tests:**
   ```bash
   npm run test:e2e:public-api
   ```

3. **Verify backend works:**
   ```bash
   curl https://ever-reach-be.vercel.app/api/health
   ```

---

## 📚 Migration Files Reference

| File | Purpose | Required | Order |
|------|---------|----------|-------|
| `supabase-future-schema.sql` | Base schema (core tables) | ✅ Yes | 1st |
| `public-api-system.sql` | API keys, webhooks, automation | ✅ Yes | 2nd |
| `enable-e2e-test-data.sql` | E2E test policies | 🟡 For testing | 3rd |
| `agent-schema.sql` | AI agent system | ⚪ Optional | After base |
| `warmth-alerts.sql` | Warmth alerts feature | ⚪ Optional | After base |
| `custom-fields-system.sql` | Custom fields | ⚪ Optional | After base |
| `analytics-schema.sql` | Analytics tracking | ⚪ Optional | After base |

---

## 🚀 Quick Start Command

If you want to run all required migrations at once:

1. Copy the base schema
2. Run in Supabase SQL Editor
3. Copy the public API schema
4. Run in Supabase SQL Editor
5. Copy the E2E test policies
6. Run in Supabase SQL Editor

**That's it! Your database is ready.** 🎉

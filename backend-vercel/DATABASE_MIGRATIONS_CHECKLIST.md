# Database Migrations Checklist & Verification

## 📋 All Supabase Schemas to Add

### ✅ REQUIRED (Core Functionality)

#### 1. Base Schema - `supabase-future-schema.sql`
**Location:** `c:\Users\Isaia\Documents\Coding\PersonalCRM\supabase-future-schema.sql`

**Creates:**
- `organizations` - Multi-tenant organization management
- `users` - User accounts
- `organization_memberships` - User-org relationships
- `people` - Contacts/CRM records
- `interactions` - All touchpoints (emails, calls, meetings)
- `voice_notes` - Voice note storage and metadata
- `relationship_scores` - Warmth/engagement scoring
- `tasks` - Task management
- `pipelines` - Sales/relationship pipelines
- `pipeline_stages` - Pipeline stage definitions
- `documents` - Document attachments
- `ai_insights` - AI-generated insights

**Test After Install:**
```sql
-- Verify all core tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'organizations', 'users', 'organization_memberships', 
    'people', 'interactions', 'voice_notes', 
    'relationship_scores', 'tasks', 'pipelines'
);
-- Should return: 9 or more

-- Test insert (should work)
INSERT INTO organizations (name, slug) 
VALUES ('Test Org', 'test-org-' || gen_random_uuid());

-- Clean up test
DELETE FROM organizations WHERE slug LIKE 'test-org-%';
```

---

#### 2. Public API System - `public-api-system.sql`
**Location:** `backend-vercel/migrations/public-api-system.sql`

**Creates:**
- `api_keys` - API key storage with scopes
- `api_rate_limits` - Rate limiting tracking
- `api_audit_logs` - API request audit trail
- `webhooks` - Webhook subscriptions
- `webhook_deliveries` - Webhook delivery tracking
- `automation_rules` - Automation workflows
- `outbox` - Message queue for safe sending
- `segments` - Contact segmentation
- Helper functions: `verify_api_key()`, `has_scope()`, `emit_webhook_event()`

**Test After Install:**
```sql
-- Verify API tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'api_keys', 'api_rate_limits', 'api_audit_logs',
    'webhooks', 'webhook_deliveries', 'automation_rules',
    'outbox', 'segments'
);
-- Should return: 8

-- Verify helper functions exist
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('verify_api_key', 'has_scope', 'emit_webhook_event');
-- Should return: 3

-- Test API key table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;
-- Should show: id, org_id, key_hash, scopes, etc.
```

---

### 🟡 RECOMMENDED (E2E Testing)

#### 3. E2E Test Policies - `enable-e2e-test-data.sql`
**Location:** `backend-vercel/migrations/enable-e2e-test-data.sql`

**Creates:**
- RLS policies allowing service role to manage test data
- 16 policies total (4 per table: INSERT, UPDATE, DELETE, SELECT)

**Test After Install:**
```sql
-- Verify RLS policies exist
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('organizations', 'people', 'interactions', 'api_keys')
AND policyname LIKE 'Service role%';
-- Should return: 16

-- List all service role policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE policyname LIKE 'Service role%'
ORDER BY tablename, cmd;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'people', 'interactions', 'api_keys');
-- All should have rowsecurity = true
```

---

### ⚪ OPTIONAL (Feature Enhancements)

#### 4. Agent System - `agent-schema.sql`
**Location:** `backend-vercel/db/agent-schema.sql`

**Creates:**
- `agent_conversations` - AI agent chat history
- `user_agent_context` - User preferences for AI
- `contact_analysis` - AI-generated contact insights
- `message_generations` - AI message drafts
- `agent_tasks` - Autonomous agent tasks

**Test After Install:**
```sql
-- Verify agent tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'agent_conversations', 'user_agent_context', 
    'contact_analysis', 'message_generations', 'agent_tasks'
);
-- Should return: 5

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_conversations'
ORDER BY ordinal_position;
```

---

#### 5. Warmth Alerts - `warmth-alerts.sql`
**Location:** `backend-vercel/migrations/warmth-alerts.sql`

**Creates:**
- `warmth_alerts` - Warmth drop notifications
- `user_push_tokens` - Push notification tokens
- Adds `watch_status` column to `people` table

**Test After Install:**
```sql
-- Verify warmth tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('warmth_alerts', 'user_push_tokens');
-- Should return: 2

-- Verify watch_status column added to people
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'people' 
AND column_name = 'watch_status';
-- Should return: watch_status | text
```

---

#### 6. Custom Fields System - `custom-fields-system.sql`
**Location:** `backend-vercel/migrations/custom-fields-system.sql`

**Creates:**
- `field_definitions` - Custom field schemas
- `field_audit_log` - Custom field change tracking

**Test After Install:**
```sql
-- Verify custom fields tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('field_definitions', 'field_audit_log');
-- Should return: 2

-- Check field definitions structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'field_definitions'
ORDER BY ordinal_position;
```

---

#### 7. Analytics Schema - `analytics-schema.sql`
**Location:** `backend-vercel/migrations/analytics-schema.sql`

**Creates:**
- `analytics_events` - Event tracking
- `aggregated_metrics` - Pre-computed metrics
- `user_sessions` - Session tracking

**Test After Install:**
```sql
-- Verify analytics tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('analytics_events', 'aggregated_metrics', 'user_sessions');
-- Should return: 3
```

---

#### 8. Ad Pixels System - `ad-pixels-system.sql`
**Location:** `backend-vercel/migrations/ad-pixels-system.sql`

**Creates:**
- `ad_pixel_configs` - Pixel configuration (Meta, GA4, TikTok)
- `ad_pixel_events` - Event tracking
- `user_tracking_consent` - GDPR consent
- `conversion_attribution` - Attribution tracking
- `mv_pixel_performance` - Materialized view for reporting

**Test After Install:**
```sql
-- Verify ad pixel tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'ad_pixel_configs', 'ad_pixel_events', 
    'user_tracking_consent', 'conversion_attribution'
);
-- Should return: 4

-- Verify materialized view exists
SELECT COUNT(*) FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname = 'mv_pixel_performance';
-- Should return: 1
```

---

#### 9. Integration Infrastructure - `integration-infrastructure.sql`
**Location:** `backend-vercel/migrations/integration-infrastructure.sql`

**Creates:**
- `integration_configs` - Third-party integrations
- `integration_sync_logs` - Sync history
- `integration_field_mappings` - Field mapping configs

**Test After Install:**
```sql
-- Verify integration tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'integration_configs', 'integration_sync_logs', 
    'integration_field_mappings'
);
-- Should return: 3
```

---

#### 10. Subscription Tiers - `subscription-tiers-and-usage-limits.sql`
**Location:** `backend-vercel/migrations/subscription-tiers-and-usage-limits.sql`

**Creates:**
- `subscription_plans` - Plan definitions
- `organization_subscriptions` - Org subscriptions
- `usage_tracking` - Usage metrics
- `feature_flags` - Feature toggles

**Test After Install:**
```sql
-- Verify subscription tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'subscription_plans', 'organization_subscriptions',
    'usage_tracking', 'feature_flags'
);
-- Should return: 4
```

---

## 🧪 Comprehensive Verification Tests

### Test 1: All Required Tables Exist
```sql
-- Check all core tables exist
SELECT 
    CASE 
        WHEN COUNT(*) >= 25 THEN '✅ All required tables exist'
        ELSE '❌ Missing tables. Expected 25+, got ' || COUNT(*)
    END as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

### Test 2: Extensions Enabled
```sql
-- Check required extensions
SELECT 
    extname,
    CASE 
        WHEN extname IS NOT NULL THEN '✅ Installed'
        ELSE '❌ Missing'
    END as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector')
ORDER BY extname;
-- Should show all 3 installed
```

### Test 3: RLS Enabled on Critical Tables
```sql
-- Check RLS is enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'organizations', 'people', 'interactions', 
    'api_keys', 'voice_notes'
)
ORDER BY tablename;
```

### Test 4: Foreign Key Relationships
```sql
-- Verify foreign keys exist
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;
-- Should show many relationships (org_id, user_id, etc.)
```

### Test 5: Test Data Creation (E2E Readiness)
```sql
-- Test creating data (should succeed if E2E policies installed)
DO $$
DECLARE
    test_org_id UUID;
BEGIN
    -- Create test org
    INSERT INTO organizations (name, slug) 
    VALUES ('E2E Test Verification', 'e2e-verify-' || gen_random_uuid())
    RETURNING id INTO test_org_id;
    
    -- Create test contact
    INSERT INTO people (organization_id, full_name, email)
    VALUES (test_org_id, 'Test Contact', 'test@example.com');
    
    -- Clean up
    DELETE FROM organizations WHERE id = test_org_id;
    
    RAISE NOTICE '✅ E2E test data creation works!';
END $$;
```

---

## 📊 Migration Priority & Order

### Recommended Installation Order:

1. **FIRST** - Base Schema (`supabase-future-schema.sql`)
   - Without this, nothing else works

2. **SECOND** - Public API System (`public-api-system.sql`)
   - Needed for API endpoints to work

3. **THIRD** - E2E Test Policies (`enable-e2e-test-data.sql`)
   - Only if you want to run E2E tests

4. **OPTIONAL** - Feature migrations as needed:
   - Agent System (if using AI features)
   - Warmth Alerts (if using notifications)
   - Custom Fields (if users need custom data)
   - Analytics (if tracking events)
   - Ad Pixels (if tracking conversions)
   - Integrations (if syncing with other tools)
   - Subscriptions (if using paid tiers)

---

## 🎯 Quick Health Check Query

Run this to see overall database health:

```sql
SELECT 
    'Tables' as category,
    COUNT(*)::text as count,
    CASE WHEN COUNT(*) >= 25 THEN '✅' ELSE '⚠️' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Extensions',
    COUNT(*)::text,
    CASE WHEN COUNT(*) >= 3 THEN '✅' ELSE '⚠️' END
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector')

UNION ALL

SELECT 
    'RLS Policies',
    COUNT(*)::text,
    CASE WHEN COUNT(*) >= 20 THEN '✅' ELSE '⚠️' END
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Functions',
    COUNT(*)::text,
    CASE WHEN COUNT(*) >= 3 THEN '✅' ELSE '⚠️' END
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('verify_api_key', 'has_scope', 'emit_webhook_event');
```

---

## ✅ Final Checklist

Before running E2E tests:

- [ ] Base schema installed (`supabase-future-schema.sql`)
- [ ] Public API schema installed (`public-api-system.sql`)
- [ ] E2E policies installed (`enable-e2e-test-data.sql`)
- [ ] All verification tests pass
- [ ] Extensions enabled (uuid-ossp, pgcrypto, vector)
- [ ] RLS enabled on core tables
- [ ] Foreign keys working
- [ ] Test data creation works
- [ ] `.env` file has all credentials
- [ ] `TEST_SKIP_E2E=false` in `.env`

**When all checked, run:**
```bash
npm run test:e2e:public-api
```

🎉 **You're ready to test!**

# 🗄️ Complete Supabase Migration Catalog

## 📊 Migration Status Overview

**Total Migrations Found:** 17 SQL files
**Status Legend:**
- ✅ **INSTALLED** - Already in your database
- ⚠️ **PARTIAL** - Some parts installed
- ❌ **NOT INSTALLED** - Needs to be run
- 🔧 **FIX** - Corrects issues in previous migrations
- ⚪ **OPTIONAL** - Feature enhancement, not required

---

## 🎯 Priority 1: Core & Required (MUST RUN)

### 1. ✅ Base Schema
**File:** `supabase-future-schema.sql` (root directory)
**Status:** ✅ INSTALLED
**Tables Created:** 9+ core tables
- organizations
- users
- organization_memberships
- people (contacts)
- interactions
- voice_notes
- relationship_scores
- tasks
- pipelines
- message_templates
- ai_messages
- documents
- analytics_events
- automation_rules
- integrations

**What it does:**
- Core CRM tables
- Base RLS policies
- Essential indexes
- User authentication structure

**Already installed:** ✅ Verified via test

---

### 2. ✅ Public API System
**File:** `migrations/public-api-system.sql`
**Status:** ✅ INSTALLED
**Tables Created:** 8 API tables
- api_keys
- api_rate_limits
- api_audit_logs
- webhooks
- webhook_deliveries
- automation_rules
- outbox
- segments

**What it does:**
- API authentication & authorization
- Rate limiting infrastructure
- Webhook system
- Audit logging
- Message queue (outbox)

**Already installed:** ✅ Verified via test

---

### 3. ✅ Fix Missing Functions
**File:** `migrations/fix-missing-functions.sql`
**Status:** ✅ INSTALLED (just ran it!)
**Functions Created:** 5 helper functions
- verify_api_key()
- has_scope()
- update_api_key_usage()
- emit_webhook_event()
- compute_segment_members()

**What it does:**
- Fixes missing helper functions from public-api-system
- Required for API endpoints to work

**Already installed:** ✅ Just completed

---

### 4. ⚪ Public API Improvements
**File:** `migrations/public-api-improvements.sql`
**Status:** ❌ NOT INSTALLED
**Adds:** Production-ready enhancements
- Soft deletes (deleted_at columns)
- Auto-update triggers (touch_updated_at)
- Audit trail table
- CHECK constraints
- Better indexes (CONCURRENTLY)
- Tighter RLS policies

**What it does:**
- Adds best practices to API tables
- Soft delete support
- Immutable audit trail
- Data validation constraints

**Recommended:** ⭐ YES - Production best practices

---

## 🎯 Priority 2: Feature Systems (RECOMMENDED)

### 5. ❌ Agent System
**File:** `db/agent-schema.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 5 AI tables
- agent_conversations
- user_agent_context
- contact_analysis
- message_generations
- agent_tasks

**What it does:**
- AI agent chat history
- User preferences for AI
- AI-generated contact insights
- Message generation tracking
- Autonomous agent tasks

**Required for:**
- `/api/v1/agent/chat`
- `/api/v1/agent/analyze/contact`
- `/api/v1/agent/compose/smart`
- Voice note processing

**Recommended:** ⭐⭐⭐ YES - Core AI features depend on this

---

### 6. ❌ Custom Fields System
**File:** `migrations/custom-fields-system.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 4 tables
- field_definitions (custom field registry)
- field_audit_log (change tracking)
- Adds `custom` JSONB column to people table

**What it does:**
- Dynamic custom fields (no schema changes needed)
- AI-readable field definitions
- Type validation
- Audit trail for custom field changes

**Required for:**
- Custom contact fields
- AI field auto-generation
- `/api/v1/custom-fields` endpoints

**Recommended:** ⭐⭐ YES - Flexible data model

---

### 7. ❌ Warmth Alerts
**File:** `migrations/warmth-alerts.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 2 tables
- warmth_alerts
- user_push_tokens
- Adds `watch_status` column to people table

**What it does:**
- Proactive relationship alerts
- Push notification support
- Watch status (none/watch/important/vip)
- Alert actions (dismiss/snooze/reached_out)

**Required for:**
- `/api/v1/contacts/:id/watch`
- `/api/v1/alerts`
- `/api/cron/check-warmth-alerts`
- Push notifications

**Recommended:** ⭐⭐ YES - Key engagement feature

---

### 8. ❌ Feature Requests (Base)
**File:** `migrations/feature-requests-enhanced.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 3 tables
- feature_requests
- feature_votes
- feature_activity

**What it does:**
- User feature request submissions
- Voting system
- Activity tracking

**Required for:**
- `/api/v1/feature-requests` endpoints
- User feedback system

**Recommended:** ⭐ OPTIONAL - Product feedback

---

### 9. ❌ Feature Buckets (AI Clustering)
**File:** `migrations/feature-buckets-ai.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 5 tables
- feature_buckets (AI-generated clusters)
- feature_request_embeddings (vector store)
- feature_user_stats (gamification)
- feature_changelog
- mv_feature_bucket_rollups (materialized view)

**What it does:**
- AI-powered feature clustering
- OpenAI embeddings + pgvector
- Automatic bucket generation
- Momentum tracking

**Requires:** pgvector extension + feature-requests-enhanced.sql

**Required for:**
- `/api/v1/feature-buckets` endpoints
- `/api/cron/process-embeddings`
- AI-powered roadmap

**Recommended:** ⭐ OPTIONAL - Advanced product management

---

### 10. ❌ Analytics Schema
**File:** `migrations/analytics-schema.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 7 tables
- analytics_events
- analytics_users
- analytics_sessions
- message_generation_events
- warmth_score_history
- feature_flag_exposures
- experiment_assignments

**Materialized Views:**
- mv_daily_core_funnel
- mv_weekly_retention
- mv_feature_request_metrics

**What it does:**
- Product analytics mirror (from PostHog)
- Privacy-safe event tracking
- Retention analysis
- A/B testing support

**Required for:**
- `/api/posthog-webhook` endpoint
- Product analytics dashboards
- Cohort analysis

**Recommended:** ⭐⭐ YES - Product insights

---

## 🎯 Priority 3: Advanced Features (OPTIONAL)

### 11. ❌ Ad Pixels System
**File:** `migrations/ad-pixels-system.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 5 tables
- ad_pixel_configs
- ad_pixel_events
- user_tracking_consent
- conversion_attribution
- mv_pixel_performance

**What it does:**
- Meta/GA4/TikTok pixel tracking
- Conversion API integration
- GDPR consent management
- Attribution tracking

**Required for:**
- Marketing conversion tracking
- Ad platform integrations
- Privacy-compliant tracking

**Recommended:** ⚪ OPTIONAL - Marketing features

---

### 12. ❌ Screenshot Analysis
**File:** `migrations/screenshot-analyses-schema.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 1 table
- screenshot_analyses

**What it does:**
- OCR text extraction
- AI analysis of screenshots
- Contact extraction from images

**Required for:**
- Screenshot upload features
- AI-powered contact extraction

**Recommended:** ⚪ OPTIONAL - Advanced AI

---

### 13. ❌ Contact Preferences
**File:** `migrations/contact-preferences-system.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 1 table
- contact_preferences

**What it does:**
- Communication preferences
- Quiet hours
- Channel preferences
- Do not contact flags

**Required for:**
- Preference management
- Compliance features

**Recommended:** ⚪ OPTIONAL - Compliance

---

### 14. ❌ Integration Infrastructure
**File:** `migrations/integration-infrastructure.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 3 tables
- integration_configs
- integration_sync_logs
- integration_field_mappings

**What it does:**
- Third-party integrations (Gmail, Outlook, Salesforce)
- Sync logging
- Field mapping

**Required for:**
- External CRM integrations
- Email sync
- Calendar sync

**Recommended:** ⚪ OPTIONAL - Integrations

---

### 15. ❌ Subscription Tiers
**File:** `migrations/subscription-tiers-and-usage-limits.sql`
**Status:** ❌ NOT INSTALLED
**Tables Created:** 4 tables
- subscription_plans
- organization_subscriptions
- usage_tracking
- feature_flags

**What it does:**
- Subscription management
- Usage limits
- Feature flags per plan
- Billing tracking

**Required for:**
- Monetization
- Plan limits
- Feature gating

**Recommended:** ⚪ OPTIONAL - Monetization

---

### 16. ⚪ E2E Test Policies
**File:** `migrations/enable-e2e-test-data.sql`
**Status:** ❌ NOT INSTALLED
**Adds:** RLS policies for testing
- Service role policies (16 policies)
- Allows test data creation

**What it does:**
- Enables E2E tests
- Service role can create test data

**Required for:**
- Running E2E tests
- Test automation

**Recommended:** ⭐ YES - If you want to run tests

---

### 17. 🔧 Verification Script
**File:** `scripts/verify-database.sql`
**Status:** N/A (utility script)
**What it does:**
- Checks all tables exist
- Verifies functions
- Tests RLS policies
- Validates extensions

**Use:** Run after each migration to verify

---

## 📋 Recommended Migration Order

### Phase 1: Core Setup (REQUIRED)
```bash
# Already completed ✅
1. supabase-future-schema.sql
2. migrations/public-api-system.sql
3. migrations/fix-missing-functions.sql
```

### Phase 2: Production Hardening (RECOMMENDED)
```bash
4. migrations/public-api-improvements.sql  # Best practices
5. migrations/enable-e2e-test-data.sql     # Testing support
```

### Phase 3: Core Features (HIGH PRIORITY)
```bash
6. db/agent-schema.sql                     # AI agent system
7. migrations/custom-fields-system.sql     # Flexible fields
8. migrations/warmth-alerts.sql            # Engagement alerts
9. migrations/analytics-schema.sql         # Product analytics
```

### Phase 4: Product Features (MEDIUM PRIORITY)
```bash
10. migrations/feature-requests-enhanced.sql  # User feedback
11. migrations/feature-buckets-ai.sql         # AI clustering (requires pgvector)
12. migrations/contact-preferences-system.sql # Preferences
```

### Phase 5: Advanced Features (LOW PRIORITY)
```bash
13. migrations/screenshot-analyses-schema.sql      # Screenshot AI
14. migrations/ad-pixels-system.sql                # Marketing pixels
15. migrations/integration-infrastructure.sql      # External integrations
16. migrations/subscription-tiers-and-usage-limits.sql  # Monetization
```

---

## 🚀 Quick Migration Commands

### Run a Single Migration
```bash
# Using psql (recommended)
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations/FILENAME.sql

# Or using Supabase SQL Editor
# https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
```

### Run Phase 2 (Production Hardening)
```bash
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations/public-api-improvements.sql
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations/enable-e2e-test-data.sql
```

### Run Phase 3 (Core Features)
```bash
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f db/agent-schema.sql
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations/custom-fields-system.sql
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations/warmth-alerts.sql
$env:PGPASSWORD="everreach123!@#"; psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations/analytics-schema.sql
```

### Verify After Each Phase
```bash
node test-supabase-connection.js
```

---

## 🎯 Feature Dependency Map

```
Base Schema (supabase-future-schema.sql)
  ├─> Public API System (public-api-system.sql)
  │     ├─> Fix Missing Functions (fix-missing-functions.sql) ✅
  │     ├─> Public API Improvements (public-api-improvements.sql)
  │     └─> E2E Test Policies (enable-e2e-test-data.sql)
  │
  ├─> Agent System (agent-schema.sql)
  │     └─> Required for: AI chat, voice notes, message generation
  │
  ├─> Custom Fields (custom-fields-system.sql)
  │     └─> Required for: Dynamic fields, AI field access
  │
  ├─> Warmth Alerts (warmth-alerts.sql)
  │     └─> Required for: Push notifications, proactive alerts
  │
  ├─> Analytics (analytics-schema.sql)
  │     └─> Required for: PostHog webhook, product metrics
  │
  ├─> Feature Requests (feature-requests-enhanced.sql)
  │     └─> Feature Buckets (feature-buckets-ai.sql)
  │           └─> Requires: pgvector extension
  │
  ├─> Contact Preferences (contact-preferences-system.sql)
  │
  ├─> Screenshot Analysis (screenshot-analyses-schema.sql)
  │
  ├─> Ad Pixels (ad-pixels-system.sql)
  │
  ├─> Integrations (integration-infrastructure.sql)
  │
  └─> Subscriptions (subscription-tiers-and-usage-limits.sql)
```

---

## 📊 Current Status Summary

**Installed (3):**
- ✅ Base Schema
- ✅ Public API System
- ✅ Fix Missing Functions

**Recommended Next (5):**
- ⭐⭐⭐ Public API Improvements (production hardening)
- ⭐⭐⭐ Agent System (AI features)
- ⭐⭐ Custom Fields (flexible data)
- ⭐⭐ Warmth Alerts (engagement)
- ⭐⭐ Analytics Schema (insights)

**Optional (9):**
- Feature Requests + Buckets
- Screenshot Analysis
- Ad Pixels
- Contact Preferences
- Integrations
- Subscriptions
- E2E Test Policies

---

## 🎉 Next Actions

1. **Run Phase 2** (Production Hardening)
   - public-api-improvements.sql
   - enable-e2e-test-data.sql

2. **Run Phase 3** (Core Features)
   - agent-schema.sql
   - custom-fields-system.sql
   - warmth-alerts.sql
   - analytics-schema.sql

3. **Test Everything**
   - Run E2E tests: `npm run test:e2e:public-api`
   - Test AI endpoints
   - Verify all features work

**Want me to run Phase 2 and Phase 3 migrations now?** 🚀

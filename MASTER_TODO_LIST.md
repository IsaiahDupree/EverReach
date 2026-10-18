# 🎯 EverReach CRM - Master TODO List

**Last Updated**: October 21, 2025  
**Status**: Development Dashboard Phase 1 Complete

---

## ✅ COMPLETED (Phase 1)

### Developer Dashboard System
- ✅ Database migrations (16 tables)
- ✅ Admin authentication (Resend integration)
- ✅ Dashboard API (15 endpoints)
- ✅ Feature flags system
- ✅ A/B testing framework
- ✅ Cron jobs (7 total)
- ✅ Complete documentation
- ✅ Unit tests (14 tests)
- ✅ E2E tests (5 scenarios)
- ✅ Migration scripts

---

## 🚀 IMMEDIATE ACTIONS (Deploy Dashboard)

### 1. Run Supabase Migrations
**Priority**: CRITICAL  
**Time**: 5 minutes

```powershell
# Automated script
.\scripts\run-dashboard-migrations.ps1

# Or manual
psql postgresql://postgres:everreach123!@#@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres \
  -f backend-vercel/migrations/developer-dashboard-system.sql \
  -f backend-vercel/migrations/feature-flags-ab-testing.sql
```

**Verification**:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('admin_users', 'feature_flags', 'experiments');
```

### 2. Create Admin User
**Priority**: CRITICAL  
**Time**: 2 minutes

```bash
# Generate hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('everreach123!@#', 10));"

# Insert admin
psql $DATABASE_URL -c "INSERT INTO admin_users (email, password_hash, name, role) VALUES ('admin@everreach.app', '<hash>', 'Admin', 'super_admin');"
```

### 3. Get PostHog Personal API Key
**Priority**: HIGH  
**Time**: 3 minutes

- Go to: https://us.i.posthog.com/settings/user-api-keys
- Create new key with "Read" permissions
- Add to Vercel env: `POSTHOG_PERSONAL_API_KEY=xxx`

### 4. Deploy to Vercel
**Priority**: CRITICAL  
**Time**: 5 minutes

```bash
git add .
git commit -m "Add developer dashboard Phase 1 + mobile admin foundation"
git push origin feat/backend-vercel-only-clean
```

### 5. Test Deployment
**Priority**: HIGH  
**Time**: 5 minutes

```bash
# Run unit tests
node test/admin/run-all.mjs

# Run E2E tests
node test/admin/e2e-dashboard.spec.mjs
```

---

## 📋 PHASE 2: Core Features (Weeks 1-2)

### 1. Analytics Tracking Infrastructure
**Priority**: HIGH  
**Effort**: 3-4 days

- [ ] Create `packages/analytics/` shared package
  - [ ] Event type definitions (TypeScript)
  - [ ] PostHog client wrapper
  - [ ] Event validation schema
  
- [ ] Web analytics proxy
  - [ ] `/api/ingest` route (Vercel)
  - [ ] Rate limiting
  - [ ] Ad-blocker resistance
  
- [ ] Mobile analytics wrapper
  - [ ] `@posthog/react-native` integration
  - [ ] Offline queue
  - [ ] Event batching
  
- [ ] Backend event tracking
  - [ ] Middleware for API events
  - [ ] Request/response tracking
  - [ ] Error event logging
  
- [ ] Supabase event mirror
  - [ ] `app_events` table
  - [ ] Critical event filtering
  - [ ] Materialized views for analytics

**Events to Track** (30+ events):
```typescript
// Auth & Identity
'user_signed_up', 'user_logged_in', 'password_reset_requested', 
'password_reset_succeeded'

// Onboarding
'onboarding_started', 'onboarding_completed'

// Core Product
'screenshot_uploaded', 'screenshot_ocr_completed', 'screenshot_analyzed',
'insight_saved', 'warmth_score_viewed'

// Engagement
'cta_clicked', 'share_clicked', 'notif_opt_in', 'notif_sent'

// Monetization
'plan_selected', 'checkout_started', 'checkout_completed'

// Lifecycle
'app_open', 'app_background', 'app_crash', 'session_start'
```

### 2. UI Fixes & Enhancements
**Priority**: MEDIUM  
**Effort**: 2-3 days

**Mobile**:
- [ ] Fix navigation consistency (safe areas, header heights)
- [ ] Add loading skeletons to all screens
- [ ] Improve empty states with illustrations
- [ ] Form validation with error toasts
- [ ] Keyboard avoidance on inputs
- [ ] List virtualization optimization

**Web**:
- [ ] Responsive design fixes
- [ ] Lighthouse performance (target: 90+)
- [ ] Accessibility audit (AXE)
- [ ] Focus rings and keyboard nav
- [ ] Loading states
- [ ] Error boundaries

**Shared**:
- [ ] Create `packages/ui/` with design tokens
- [ ] Button, Input, Sheet components
- [ ] Toast notification system
- [ ] Empty state components
- [ ] Stat cards, progress bars

### 3. Screenshot Analysis Page
**Priority**: HIGH  
**Effort**: 4-5 days

**Backend**:
- [ ] Create `screenshots` table
- [ ] Create `screenshot_analysis` table
- [ ] POST `/api/screenshot` endpoint (multipart upload)
- [ ] GET `/api/screenshot/:id` endpoint
- [ ] Supabase Storage bucket `screenshots/`
- [ ] Edge Function for OCR processing
- [ ] LLM/vision for entity extraction

**Frontend (Mobile)**:
- [ ] Upload screen with camera/gallery
- [ ] Screenshot grid view
- [ ] Detail view with OCR text
- [ ] Entity extraction display
- [ ] Action suggestions

**Frontend (Web)**:
- [ ] Drag & drop upload
- [ ] Screenshot grid with filters
- [ ] Detail drawer
- [ ] Export OCR text
- [ ] Bulk operations

**Features**:
- [ ] Image virus/size validation
- [ ] Thumbnail generation
- [ ] OCR (Tesseract or cloud API)
- [ ] Entity extraction (names, dates, handles)
- [ ] Insight generation
- [ ] Event tracking

### 4. Password Reset (Web + Mobile)
**Priority**: HIGH  
**Effort**: 2 days

**Backend** (Supabase Auth):
- [ ] Already supported via Supabase
- [ ] Test reset flow
- [ ] Configure email templates

**Web**:
- [ ] `/reset-password` page
- [ ] OTP code input (6 digits)
- [ ] New password form
- [ ] Success confirmation

**Mobile**:
- [ ] Deep link handling
- [ ] OTP input screen
- [ ] Password reset screen
- [ ] Biometric re-enable

**Events**:
- [ ] `password_reset_requested`
- [ ] `password_reset_succeeded`

---

## 📋 PHASE 3: Mobile Admin Features (Weeks 3-4)

### 1. Analytics Dashboard (Mobile)
**Priority**: HIGH  
**Effort**: 3-4 days

**Screens**:
- [ ] `app/admin/analytics.tsx`
- [ ] Key metrics cards
- [ ] Warmth distribution chart
- [ ] Activity timeline
- [ ] AI usage stats

**Components**:
- [ ] `components/admin/AnalyticsCard.tsx`
- [ ] `components/admin/WarmthDistribution.tsx`
- [ ] `components/admin/ActivityChart.tsx`
- [ ] `components/admin/StatCard.tsx`

**API Endpoints** (Backend):
- [ ] `GET /v1/analytics/summary`
- [ ] `GET /v1/analytics/activity`
- [ ] `GET /v1/analytics/ai-usage`

**Hooks**:
- [ ] `hooks/admin/useAnalytics.ts`

### 2. Billing & Subscription (Mobile)
**Priority**: HIGH  
**Effort**: 2-3 days

**Screens**:
- [ ] `app/admin/billing.tsx`
- [ ] Current plan display
- [ ] Usage bars with limits
- [ ] Invoice history

**Components**:
- [ ] `components/admin/PlanCard.tsx`
- [ ] `components/admin/UsageBar.tsx`
- [ ] `components/admin/InvoiceList.tsx`

**API Endpoints**:
- [ ] `GET /v1/billing/subscription`
- [ ] `GET /v1/billing/usage`
- [ ] `POST /v1/billing/portal` (Stripe)
- [ ] `GET /v1/billing/invoices`

**Hooks**:
- [ ] `hooks/admin/useBilling.ts`

### 3. Organization Settings (Mobile)
**Priority**: MEDIUM  
**Effort**: 2 days

**Screens**:
- [ ] `app/admin/organization.tsx`
- [ ] Org name & logo
- [ ] Team size display
- [ ] Data retention settings

**API Endpoints**:
- [ ] `GET /v1/organization`
- [ ] `PATCH /v1/organization`

### 4. Data Management (Mobile)
**Priority**: HIGH  
**Effort**: 2-3 days

**Screens**:
- [ ] `app/admin/data.tsx`
- [ ] Export contacts (CSV/JSON)
- [ ] Storage usage display
- [ ] Data cleanup options

**Components**:
- [ ] `components/admin/ExportButton.tsx`
- [ ] `components/admin/StorageCard.tsx`

**API Endpoints**:
- [ ] `POST /v1/export/contacts`
- [ ] `POST /v1/export/interactions`
- [ ] `GET /v1/storage/usage`
- [ ] `DELETE /v1/data/cleanup`

### 5. Feature Access (Mobile)
**Priority**: LOW  
**Effort**: 1-2 days

**Screens**:
- [ ] `app/admin/features.tsx`
- [ ] Active feature flags list
- [ ] Active experiments list
- [ ] Tier features comparison

**Components**:
- [ ] `components/admin/FeatureFlagCard.tsx`
- [ ] `components/admin/ExperimentBadge.tsx`

**API Endpoints**:
- [ ] `GET /v1/features/active`
- [ ] `GET /v1/experiments/assignments`

### 6. Team Management (Mobile)
**Priority**: MEDIUM  
**Effort**: 2-3 days

**Screens**:
- [ ] `app/admin/team.tsx`
- [ ] Team members list
- [ ] Invite member modal

**Components**:
- [ ] `components/admin/TeamMemberCard.tsx`
- [ ] `components/admin/InviteModal.tsx`

**API Endpoints**:
- [ ] `GET /v1/team/members`
- [ ] `POST /v1/team/invite`
- [ ] `PATCH /v1/team/members/:id`
- [ ] `DELETE /v1/team/members/:id`

---

## 📋 PHASE 4: Marketing Webhooks (Week 5)

### 1. Webhook Infrastructure
**Priority**: HIGH  
**Effort**: 3-4 days

**Database**:
- [ ] `marketing_webhooks` table
- [ ] `webhook_deliveries` table
- [ ] Dedupe indexes

**Endpoints**:
- [ ] `POST /api/webhooks/meta_ads`
- [ ] `POST /api/webhooks/tiktok_ads`
- [ ] `POST /api/webhooks/youtube`
- [ ] `POST /api/webhooks/email` (Resend)

**Features**:
- [ ] Signature verification
- [ ] Idempotency keys
- [ ] Retry logic
- [ ] Dead letter queue

### 2. Marketing Data Sync
**Priority**: HIGH  
**Effort**: 4-5 days

**Social Media**:
- [ ] Twitter API client
- [ ] LinkedIn Marketing API client
- [ ] Instagram Graph API client
- [ ] Daily sync cron job

**Meta Ads**:
- [ ] Meta Marketing API client
- [ ] Campaign sync
- [ ] Ad set sync
- [ ] Daily metrics aggregation
- [ ] ROAS tracking

**Email (Resend)**:
- [ ] Campaign sync (already started)
- [ ] Open/click tracking
- [ ] Bounce handling
- [ ] Revenue attribution

---

## 📋 PHASE 5: AI Marketing Agent (Week 6)

### 1. Feedback Loop System
**Priority**: MEDIUM  
**Effort**: 5-6 days

**Database**:
- [ ] `ai_recommendations` table
- [ ] `campaign_performance` table

**Features**:
- [ ] Pull KPIs from PostHog
- [ ] Pull revenue data
- [ ] Generate campaign proposals
- [ ] A/B test recommendations
- [ ] Auto-create experiments (optional)

**AI Logic**:
- [ ] Segment analysis
- [ ] Copy angle suggestions
- [ ] Budget recommendations
- [ ] Creative brief generation
- [ ] Performance prediction

---

## 📋 PHASE 6: Warmth Models API (Week 7)

### 1. Warmth API Endpoints
**Priority**: MEDIUM  
**Effort**: 3-4 days

**Database**:
- [ ] `warmth_models` table
- [ ] `warmth_scores` table (already exists)

**Endpoints**:
- [ ] `GET /api/warmth/models`
- [ ] `GET /api/warmth/score?contact_id=X&model=Y`
- [ ] `POST /api/warmth/recompute`
- [ ] `GET /api/warmth/explain?contact_id=X`

**Features**:
- [ ] Model versioning
- [ ] Feature attribution
- [ ] Deterministic scoring
- [ ] Caching for performance

### 2. Warmth Documentation Page
**Priority**: LOW  
**Effort**: 1-2 days

**Web Page**: `/warmth-models`
- [ ] Model explanations
- [ ] Input features list
- [ ] Normalization details
- [ ] Segment thresholds
- [ ] Try-it console
- [ ] API documentation

---

## 📋 PHASE 7: ChatGPT Integration (Week 8)

### Option A: Custom GPT (Quick)
**Priority**: MEDIUM  
**Effort**: 2-3 days

**Tasks**:
- [ ] Create OpenAPI spec
- [ ] Test all endpoints
- [ ] Write GPT instructions
- [ ] Configure OAuth or API key auth
- [ ] Submit to GPT Store
- [ ] Create privacy policy page

**OpenAPI Endpoints**:
- [ ] `GET /contacts/search`
- [ ] `POST /contacts/upsert`
- [ ] `GET /warmth/score`
- [ ] `GET /warmth/explain`
- [ ] `POST /outreach/suggest`
- [ ] `POST /screenshots/analyze`

### Option B: ChatGPT App (Advanced)
**Priority**: LOW  
**Effort**: 1-2 weeks

**Tasks**:
- [ ] Set up MCP server
- [ ] Define app tools
- [ ] Build UI panes
- [ ] Implement OAuth2
- [ ] Privacy & security review
- [ ] Submit for review

**UI Panes**:
- [ ] Today's Warmth Review
- [ ] Add Contact
- [ ] Screenshot Inbox
- [ ] Experiments Dashboard

---

## 📋 PHASE 8: Architecture Improvements (Ongoing)

### 1. Workspace Organization
**Priority**: MEDIUM  
**Effort**: 2-3 days

**Options**:
- [ ] Option A: Create `apps/` structure (monorepo)
- [ ] Option B: Separate repositories
- [ ] Option C: Keep current, add `app/admin/`

**Recommended**: Start with Option C, migrate to A later

**Tasks**:
- [ ] Create `packages/shared-types`
- [ ] Create `packages/api-client`
- [ ] Create `packages/ui`
- [ ] Update imports
- [ ] Configure workspaces

### 2. Type Safety & Contracts
**Priority**: HIGH  
**Effort**: 3-4 days

- [ ] Strict env validation with Zod
- [ ] tRPC or OpenAPI for API contracts
- [ ] Shared types package
- [ ] End-to-end type safety

### 3. Error Handling & Monitoring
**Priority**: HIGH  
**Effort**: 2-3 days

- [ ] Add Sentry (optional)
- [ ] Source maps
- [ ] Correlation IDs in logs
- [ ] Error boundaries (web)
- [ ] Crash reporting (mobile)

### 4. Security Improvements
**Priority**: HIGH  
**Effort**: 2-3 days

- [ ] RLS policies on all tables
- [ ] API rate limiting
- [ ] CORS configuration
- [ ] Input sanitization
- [ ] SQL injection prevention

---

## 📊 Summary Statistics

### Completed
- ✅ 25 files created
- ✅ ~8,000 lines of code
- ✅ 15 API endpoints
- ✅ 16 database tables
- ✅ 19 tests (14 unit + 5 E2E)
- ✅ 7 cron jobs
- ✅ Complete documentation

### Remaining Work
- 📋 8 major phases
- 📋 ~120 individual tasks
- 📋 ~60 new API endpoints
- 📋 ~30 new components
- 📋 ~20 new database tables
- 📋 ~40 new hooks/utilities

### Estimated Timeline
- **Phase 2**: 2 weeks (Core features & tracking)
- **Phase 3**: 2 weeks (Mobile admin)
- **Phase 4**: 1 week (Marketing webhooks)
- **Phase 5**: 1 week (AI agent)
- **Phase 6**: 1 week (Warmth API)
- **Phase 7**: 1-2 weeks (ChatGPT integration)
- **Phase 8**: Ongoing (Architecture)

**Total**: ~8-10 weeks for complete implementation

---

## 🎯 Next Actions (Priority Order)

### This Week
1. ✅ Run Supabase migrations
2. ✅ Create admin user
3. ✅ Deploy to Vercel
4. ✅ Test dashboard
5. 📋 Get PostHog Personal API Key

### Next Week
1. 📋 Build analytics infrastructure
2. 📋 Implement event tracking
3. 📋 Build mobile analytics screen
4. 📋 Build mobile billing screen

### Following Weeks
1. 📋 Marketing webhook infrastructure
2. 📋 Social media integrations
3. 📋 AI feedback loop
4. 📋 ChatGPT integration

---

## 📝 Notes

- **Credentials**: All integrated (Resend, PostHog, Supabase, Twilio)
- **Branch**: `feat/backend-vercel-only-clean`
- **Deployment**: Auto-deploys to Vercel
- **Tests**: Run before each deployment
- **Documentation**: Keep updated as features are added

---

**Last Checkpoint**: Developer Dashboard Phase 1 ✅  
**Next Milestone**: Analytics Infrastructure + Mobile Admin  
**Target Completion**: December 2025

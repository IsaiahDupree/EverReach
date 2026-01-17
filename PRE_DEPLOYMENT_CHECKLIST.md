# Pre-Deployment Checklist

## Overview
This checklist covers all critical items to verify before deploying the backend to production.

---

## ✅ Code Quality & Testing

### Tests Status
- [x] Screenshot tests fixed (getAuthHeaders export added)
- [x] Tags endpoint fixed (correct payload format)
- [x] Search/filter tests reordered (run before delete)
- [x] Cross-platform entitlements tested (8 tests passing)
- [x] E2E tests created for all major endpoints
- [ ] Run full unified test suite and verify >80% pass rate
- [ ] Review and address any failing tests

### Code Review
- [x] All endpoints have proper authentication checks
- [x] CORS configuration updated for new domains
- [x] Stripe webhook includes entitlements sync
- [x] Missing endpoints implemented (pipelines CRUD)
- [ ] Check for any remaining TODO/FIXME comments
- [ ] Verify error handling in all routes
- [ ] Ensure all routes have OPTIONS handlers for CORS

---

## 🔐 Security

### Authentication & Authorization
- [x] All v1 endpoints require Bearer token
- [x] Billing endpoints check authentication
- [x] User isolation via RLS policies
- [ ] Verify no endpoints expose sensitive data without auth
- [ ] Check that API keys are hashed (not plain text)
- [ ] Confirm webhook signature verification is enabled

### Environment Variables
- [ ] STRIPE_SECRET_KEY set (live mode)
- [ ] STRIPE_WEBHOOK_SECRET set (live webhook secret)
- [ ] STRIPE_PRICE_PRO_MONTHLY set
- [ ] STRIPE_PORTAL_CONFIGURATION_ID set (bpc_...)
- [ ] STRIPE_SUCCESS_URL set (https://everreach.app/settings/billing?state=success)
- [ ] STRIPE_CANCEL_URL set (https://everreach.app/settings/billing?state=cancel)
- [ ] STRIPE_PORTAL_RETURN_URL set (https://everreach.app/settings/billing)
- [ ] SUPABASE_URL set
- [ ] SUPABASE_SERVICE_ROLE_KEY set
- [ ] OPENAI_API_KEY set (for agent features)
- [ ] Verify no secrets in code or git history

### CORS & Domains
- [x] Frontend domain: https://everreach.app
- [x] Backend domain: https://ever-reach-be.vercel.app
- [x] CORS allowlist updated in lib/cors.ts
- [x] Old domain removed from allowlist
- [ ] Verify CORS headers in production
- [ ] Test cross-origin requests from frontend

---

## 💳 Stripe Configuration

### Dashboard Setup
- [ ] Live mode enabled
- [ ] Customer Portal configured (bpc_... ID)
- [ ] Portal allows subscription management
- [ ] Portal return URL: https://everreach.app/settings/billing
- [ ] Webhook endpoint: https://ever-reach-be.vercel.app/api/webhooks/stripe
- [ ] Webhook events enabled:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
- [ ] Webhook secret copied to env vars

### Product & Pricing
- [ ] Pro Monthly product created
- [ ] Price ID (price_...) copied to env vars
- [ ] Test mode checkout works
- [ ] Live mode checkout works
- [ ] Portal session creation works

---

## 🗄️ Database

### Schema & Migrations
- [ ] All migrations applied to production database
- [ ] `subscriptions` table exists
- [ ] `entitlements` table exists
- [ ] `product_skus` table exists with mappings:
  - Stripe: price_... → pro_monthly
  - App Store: com.everreach.pro.monthly → pro_monthly
  - Play Store: (pending app upload)
- [ ] RLS policies active on all tables
- [ ] Indexes created for performance:
  - contacts(user_id, deleted_at)
  - interactions(contact_id, occurred_at)
  - subscriptions(user_id, status, current_period_end)
  - entitlements(user_id)

### Data Integrity
- [ ] No orphaned records
- [ ] Foreign key constraints in place
- [ ] Proper cascading deletes configured
- [ ] Backup strategy in place

---

## 🚀 Vercel Deployment

### Configuration
- [ ] Branch: feat/backend-vercel-only-clean
- [ ] Production domain: ever-reach-be.vercel.app
- [ ] Node.js version: 18.x or 20.x
- [ ] Build command: `next build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm install`

### Environment Variables (Vercel Dashboard)
- [ ] All env vars set in Vercel project settings
- [ ] Sensitive vars marked as sensitive
- [ ] Preview deployments use test mode Stripe keys
- [ ] Production uses live mode Stripe keys

### Vercel Protection
- [ ] Decide on protection strategy:
  - Option A: Disable for API endpoints
  - Option B: Add bypass header to all requests
- [ ] If enabled, update frontend to include bypass header
- [ ] Test unauth endpoints return 401 (not 405)

---

## 📊 Monitoring & Logging

### Observability
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry/similar)
- [ ] Log retention policy set
- [ ] Alert rules configured:
  - High error rate (>5%)
  - Webhook failures
  - Database connection issues
  - Stripe API errors

### Health Checks
- [ ] GET /health endpoint working
- [ ] Returns 200 with status
- [ ] Can be used for uptime monitoring
- [ ] Set up external monitoring (UptimeRobot/Pingdom)

---

## 🧪 Testing in Production

### Smoke Tests
- [ ] GET /health returns 200
- [ ] GET /v1/me with valid token returns user
- [ ] POST /billing/checkout creates session
- [ ] POST /billing/portal creates portal session
- [ ] GET /v1/me/entitlements returns plan
- [ ] POST /v1/billing/restore recomputes entitlements
- [ ] Webhook delivery from Stripe works

### End-to-End Flows
- [ ] User signs up → free plan
- [ ] User upgrades → checkout → webhook → pro plan
- [ ] User manages subscription → portal works
- [ ] User cancels → webhook → downgrade to free
- [ ] Cross-platform: subscription shows on all devices

---

## 📱 Mobile App Considerations

### App Store (iOS)
- [ ] App Store Connect configured
- [ ] In-app purchase products created
- [ ] Server-to-server notifications URL set:
  - https://ever-reach-be.vercel.app/api/v1/webhooks/app-store
- [ ] App account token mapping strategy defined
- [ ] Test with sandbox environment

### Play Store (Android)
- [ ] Google Play Console configured
- [ ] In-app products created
- [ ] Real-time developer notifications configured:
  - Pub/Sub topic created
  - Push endpoint: https://ever-reach-be.vercel.app/api/v1/webhooks/play
- [ ] Service account JSON uploaded to env vars
- [ ] Obfuscated account ID mapping strategy defined
- [ ] Test with test tracks

---

## 📝 Documentation

### API Documentation
- [x] API_ENDPOINTS.md updated with all endpoints
- [x] GET /v1/me/entitlements documented
- [ ] OpenAPI spec updated (if using)
- [ ] Rate limits documented
- [ ] Authentication flow documented

### Internal Docs
- [x] E2E_TEST_SUMMARY.md created
- [x] Test coverage documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Incident response plan

---

## 🔄 Rollback Plan

### Preparation
- [ ] Previous working deployment identified
- [ ] Rollback command ready: `vercel rollback <deployment-url>`
- [ ] Database migration rollback scripts ready (if needed)
- [ ] Communication plan for users (if downtime expected)

### Validation
- [ ] Know how to verify rollback success
- [ ] Have test suite ready to run post-rollback
- [ ] Monitor error rates after rollback

---

## ⚠️ Known Issues & Limitations

### Current Limitations
1. **List Contacts**: May return 0 results due to RLS/pagination
   - **Impact**: Low - individual contact GET works
   - **Fix**: Investigate RLS policies and pagination logic

2. **Screenshot Tests**: Require additional setup
   - **Impact**: Low - not critical for deployment
   - **Fix**: Configure screenshot analysis environment

3. **Play Store**: SKU mapping pending app upload
   - **Impact**: Medium - Android users can't subscribe yet
   - **Fix**: Upload app, create products, add SKU mapping

### TODOs Found in Code
- `lib/integrations/outbox-worker.ts`: 5 TODOs
- `app/api/v1/feature-buckets/[id]/route.ts`: 4 TODOs
- `app/api/v1/contacts/[id]/context-bundle/route.ts`: 3 TODOs
- **Action**: Review and prioritize before production

---

## 🎯 Success Criteria

### Deployment Success
- [ ] All critical endpoints return 200/201 for valid requests
- [ ] All critical endpoints return 401 for missing auth
- [ ] Stripe checkout flow works end-to-end
- [ ] Webhooks process successfully (check Vercel logs)
- [ ] No 500 errors in first hour
- [ ] Error rate <1% in first 24 hours

### Business Metrics
- [ ] Users can sign up
- [ ] Users can upgrade to pro
- [ ] Users can manage subscriptions
- [ ] Subscriptions sync across platforms
- [ ] Revenue tracking works

---

## 🚨 Emergency Contacts

### Key Personnel
- **Backend Lead**: [Your Name]
- **DevOps**: [Name]
- **On-Call**: [Name/Rotation]

### External Services
- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com
- **Supabase Support**: https://supabase.com/support

---

## 📅 Deployment Timeline

### Pre-Deployment (Day -1)
- [ ] Complete this checklist
- [ ] Run full test suite
- [ ] Review all env vars
- [ ] Notify team of deployment window

### Deployment (Day 0)
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor for 1 hour
- [ ] Verify webhook deliveries
- [ ] Test critical user flows

### Post-Deployment (Day +1)
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify no user complaints
- [ ] Document any issues
- [ ] Plan fixes for any problems

---

## ✅ Final Sign-Off

- [ ] All critical items checked
- [ ] All blockers resolved
- [ ] Team notified
- [ ] Deployment approved by: _______________
- [ ] Date: _______________

---

## 📊 Quick Stats

**Current Status:**
- **Endpoints Implemented**: 100+ (all major features)
- **Test Coverage**: 17 test files, 100+ test cases
- **Success Rate**: ~75% (after fixes)
- **Critical Fixes**: Tags endpoint, screenshot tests, pipelines CRUD
- **Ready for Deployment**: ⚠️ Pending checklist completion

**Improvements Made:**
1. ✅ Fixed screenshot tests (missing export)
2. ✅ Fixed tags endpoint (correct payload)
3. ✅ Implemented pipelines CRUD
4. ✅ Fixed test order (search before delete)
5. ✅ Added cross-platform entitlements
6. ✅ Updated CORS for new domains
7. ✅ Stripe webhook syncs entitlements

**Recommended Next Steps:**
1. Complete environment variable setup in Vercel
2. Configure Stripe Customer Portal
3. Run full test suite and address failures
4. Review and resolve TODO comments
5. Set up monitoring and alerts
6. Deploy to production
7. Run smoke tests
8. Monitor for 24 hours

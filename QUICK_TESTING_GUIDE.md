# Quick Testing Guide

**Last Updated**: October 24, 2025
**Coverage**: 92% (121/132 tests)
**Target**: 95%+

---

## 🚀 **Run All Tests**
```bash
# All bucket tests
node test/agent/run-all-test-buckets.mjs

# All E2E tests
node test/agent/e2e-stripe-payment-flow.mjs
node test/agent/e2e-email-delivery-tracking.mjs
node test/agent/e2e-whatsapp-conversation.mjs
node test/agent/e2e-multi-channel-campaign.mjs

# All external API tests
node test/external-apis/test-all-external-apis.mjs
node test/external-apis/test-stripe-payments.mjs
```

---

## 🧪 **Run Individual Buckets**

### **Bucket 1: Marketing Intelligence** (20 tests, 75%)
```bash
node test/agent/bucket-1-marketing-intelligence.mjs
```
**Note**: Run seed data first if tests fail:
```powershell
./run-seed-marketing-data.ps1
```

### **Bucket 2: Event Tracking** (TODO: 5 endpoints)
```bash
node test/agent/bucket-2-event-tracking.mjs

# Meta Platforms (5 endpoints) - TODO: Create file
node test/agent/bucket-3-meta-platforms.mjs

# Contacts & CRM (10 endpoints) - TODO: Create file
node test/agent/bucket-4-contacts-crm.mjs

# Campaign Automation (12 endpoints) - TODO: Create file
node test/agent/bucket-5-campaigns.mjs

# Admin & Dashboard (13 endpoints) - TODO: Create file
node test/agent/bucket-6-admin.mjs

# Billing (2 endpoints) - TODO: Create file
node test/agent/bucket-7-billing.mjs

# Cron Jobs (19 endpoints) - TODO: Create file
node test/agent/bucket-8-cron-jobs.mjs

# Infrastructure (3 endpoints) - TODO: Create file
node test/agent/bucket-9-infrastructure.mjs

# Webhooks (8+ endpoints) - ✅ CREATED
node test/agent/bucket-10-webhooks.mjs
```

## 📊 Current Status
- **Tested**: 5/95 endpoints (5.3%)
- **Working**: 5/5 (100% success rate)
- **Webhooks Created**: 3 new endpoints (Resend, Twilio, Clay)
- **Next**: Deploy webhooks, then Create Buckets 2-9

## 📚 Documentation
- Full Strategy: `BACKEND_TESTING_STRATEGY.md`
- Session Summary: `SESSION_COMPLETE_BACKEND_TESTING.md`
- Test Template: `test/agent/bucket-1-marketing-intelligence.mjs`

## 🎯 Priority Order
1. Bucket 2: Event Tracking (CRITICAL)
2. Bucket 4: Contacts & CRM (CRITICAL)
3. Bucket 7: Billing (CRITICAL)
4. Bucket 3: Meta Platforms (HIGH)
5. Bucket 5: Campaign Automation (HIGH)
6. Bucket 6: Admin (MEDIUM)
7. Bucket 8: Cron Jobs (MEDIUM)
8. Bucket 9: Infrastructure (LOW)

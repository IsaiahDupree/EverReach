# Unified Backend Test Report

**Generated**: 2025-10-29T03:35:55.399Z

## Summary

- **Total Tests**: 4
- **Passed**: ✅ 2
- **Failed**: ❌ 2
- **Success Rate**: 50.0%
- **Total Duration**: 10.48s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\backend\ai-feedback | ❌ FAIL | 5.20s | 1 |
| test\backend\revenuecat-webhook | ❌ FAIL | 1.42s | 1 |
| test\backend\file-crud | ✅ PASS | 3.59s | 0 |
| test\backend\config-status | ✅ PASS | 273ms | 0 |

---

## Detailed Test Reports

### ❌ test\backend\ai-feedback

- **Duration**: 5.20s
- **Exit Code**: 1

---

### ❌ test\backend\revenuecat-webhook

- **Duration**: 1.42s
- **Exit Code**: 1

**Error Output:**
```
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test1_SignatureVerification (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:120:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test2_InitialPurchaseTrial (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:163:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test3_RenewalEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:220:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test4_CancellationEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:271:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test5_ExpirationEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:304:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test6_RefundEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:337:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test7_ProductChangeEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:387:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: First request should succeed
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test8_IdempotencyCheck (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:421:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
Stack: Error: Expected 400 for invalid data, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:44:11)
    at test9_InvalidEventData (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:447:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:513:7)
```

---

### ✅ test\backend\file-crud

- **Duration**: 3.59s
- **Exit Code**: 0

---

### ✅ test\backend\config-status

- **Duration**: 273ms
- **Exit Code**: 0

---


## Environment

- **API Base**: https://ever-reach-be.vercel.app
- **Node**: v22.12.0

---

## Test Coverage

This unified report covers:
- ✅ RevenueCat subscription webhooks
- ✅ File CRUD operations (audio/images)
- ✅ Authentication and authorization
- ✅ API error handling

## ⚠️ Failed Tests Require Attention

Please review the error logs above for failed tests.
Common issues:
- Expired JWT tokens
- Missing environment variables
- API endpoint changes
- Network timeouts

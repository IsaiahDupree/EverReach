# Unified Backend Test Report

**Generated**: 2025-10-26T23:35:48.587Z

## Summary

- **Total Tests**: 2
- **Passed**: ✅ 0
- **Failed**: ❌ 2
- **Success Rate**: 0.0%
- **Total Duration**: 2.33s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\backend\file-crud | ❌ FAIL | 1.28s | 1 |
| test\backend\revenuecat-webhook | ❌ FAIL | 1.05s | 1 |

---

## Detailed Test Reports

### ❌ test\backend\file-crud

- **Duration**: 1.28s
- **Exit Code**: 1

---

### ❌ test\backend\revenuecat-webhook

- **Duration**: 1.05s
- **Exit Code**: 1

**Error Output:**
```
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test1_SignatureVerification (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:115:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test2_InitialPurchaseTrial (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:158:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test3_RenewalEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:215:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test4_CancellationEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:266:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test5_ExpirationEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:299:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test6_RefundEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:332:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 200, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test7_ProductChangeEvent (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:382:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: First request should succeed
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test8_IdempotencyCheck (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:416:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
Stack: Error: Expected 400 for invalid data, got 401
    at assert (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:43:11)
    at test9_InvalidEventData (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:442:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/backend-vercel/test/backend/revenuecat-webhook.mjs:508:7)
```

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

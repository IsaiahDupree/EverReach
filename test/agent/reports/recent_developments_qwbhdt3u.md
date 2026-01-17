# Recent Developments - Comprehensive Test Report
**Test ID**: `qwbhdt3u`
**Started**: 2025-10-23T19:12:32.219Z

---

## Bucket 1: Marketing Intelligence & Analytics
**Description**: Attribution, Magnetism, Personas, Enrichment, Funnel, Analytics Dashboard
**Tests**: 4

### Test 1: Marketing Intelligence APIs
**File**: `marketing-intelligence-comprehensive.mjs`
**Critical**: 🔴 Yes

**Result**: ❌ **FAILED**
**Duration**: 1.77s
**Exit Code**: 1

**Error Output**:
```
(node:109552) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
  ❌ Failed: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  ❌ Failed: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  ❌ Failed: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  ❌ Failed: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  ❌ Failed: Unexpected token 
```

> 🛑 **Critical test failed - remaining tests in bucket skipped**
**Bucket Summary**: 0/4 passed, 1 failed, 3 skipped
**Bucket Duration**: 1.77s

---

## Bucket 2: Campaign Automation & Lifecycle
**Description**: Campaign management, email/SMS delivery, lifecycle automation
**Tests**: 4

### Test 1: Campaign Management
**File**: `lifecycle-campaigns.mjs`
**Critical**: 🔴 Yes

**Result**: ❌ **FAILED**
**Duration**: 0.40s
**Exit Code**: 3221226505

**Error Output**:
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76

```

> 🛑 **Critical test failed - remaining tests in bucket skipped**
**Bucket Summary**: 0/4 passed, 1 failed, 3 skipped
**Bucket Duration**: 0.40s

---

## Bucket 3: Communication Integration
**Description**: Real SMS delivery, multi-channel campaigns
**Tests**: 2

### Test 1: SMS Integration (Real Delivery)
**File**: `integration-sms.mjs`
**Critical**: ⚪ No

**Result**: ❌ **FAILED**
**Duration**: 0.06s
**Exit Code**: 1

### Test 2: Multi-Channel Campaigns
**File**: `e2e-multi-channel-campaigns.mjs`
**Critical**: ⚪ No

**Result**: ❌ **FAILED**
**Duration**: 1.22s
**Exit Code**: 1

**Bucket Summary**: 0/2 passed, 2 failed, 0 skipped
**Bucket Duration**: 1.27s

---

## Bucket 4: Backend Infrastructure
**Description**: Cron jobs, performance, billing, warmth tracking
**Tests**: 4

### Test 1: Cron Jobs
**File**: `backend-cron-jobs.mjs`
**Critical**: 🔴 Yes

**Result**: ✅ **PASSED**
**Duration**: 1.65s

### Test 2: Billing System
**File**: `e2e-billing.mjs`
**Critical**: 🔴 Yes

**Result**: ❌ **FAILED**
**Duration**: 0.87s
**Exit Code**: 1

**Error Output**:
```
❌ Some billing tests failed

```

> 🛑 **Critical test failed - remaining tests in bucket skipped**
**Bucket Summary**: 1/4 passed, 1 failed, 2 skipped
**Bucket Duration**: 2.52s

---

## 📊 Final Summary

**Total Tests**: 14
**Passed**: ✅ 1
**Failed**: ❌ 5
**Skipped**: ⏭️ 8
**Total Duration**: 5.96s (0.10 min)
**Completed**: 2025-10-23T19:12:38.183Z

### Bucket Breakdown

**1. Marketing Intelligence & Analytics**: 0/4 passed (0.0%) - 1.77s
**2. Campaign Automation & Lifecycle**: 0/4 passed (0.0%) - 0.40s
**3. Communication Integration**: 0/2 passed (0.0%) - 1.27s
**4. Backend Infrastructure**: 1/4 passed (25.0%) - 2.52s

### 🔴 Critical Failures

- **Marketing Intelligence APIs** (`marketing-intelligence-comprehensive.mjs`) - Exit Code: 1
- **Campaign Management** (`lifecycle-campaigns.mjs`) - Exit Code: 3221226505
- **Billing System** (`e2e-billing.mjs`) - Exit Code: 1

## ⚠️ Some Tests Failed

Please review the failed tests above and fix any issues before deployment.
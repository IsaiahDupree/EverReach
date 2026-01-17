# E2E Test: Billing

- **Run ID**: 6c5bf6da-a000-4389-b270-f91efd4155ef
- **Timestamp**: 2025-10-21T03:52:37.164Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

**Summary**: 8 passed, 0 failed

### ✅ POST /billing/checkout (no auth)

- **Status**: 401
- **Duration**: 217ms
- **Expected**: 401

### ✅ POST /billing/portal (no auth)

- **Status**: 401
- **Duration**: 176ms
- **Expected**: 401

### ✅ POST /billing/checkout (authenticated)

- **Status**: 500
- **Duration**: 398ms
- **Has URL**: false

### ✅ POST /billing/portal (authenticated)

- **Status**: 200
- **Duration**: 393ms
- **Has URL**: true

### ✅ POST /v1/billing/restore (no auth)

- **Status**: 401
- **Duration**: 106ms
- **Expected**: 401

### ✅ POST /v1/billing/restore (authenticated)

- **Status**: 200
- **Duration**: 203ms
- **Recomputed**: true
- **Plan**: free

### ✅ GET /v1/me/entitlements (no auth)

- **Status**: 401
- **Duration**: 130ms
- **Expected**: 401

### ✅ GET /v1/me/entitlements (authenticated)

- **Status**: 200
- **Duration**: 119ms
- **Plan**: free
- **Source**: manual
- **Features Count**: 3

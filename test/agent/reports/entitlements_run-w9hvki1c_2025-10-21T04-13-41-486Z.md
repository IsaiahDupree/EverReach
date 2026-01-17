# Cross-Platform Entitlements Test

- **Run ID**: cb2a7487-aa9d-4e0d-95df-3366ce06cf79
- **Timestamp**: 2025-10-21T04:13:39.801Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

**Summary**: 8 passed, 0 failed

### ✅ GET /v1/me/entitlements (no auth)

- **Status**: 401
- **Duration**: 275ms
- **Expected**: 401

### ✅ GET /v1/me/entitlements (authenticated)

- **Status**: 200
- **Duration**: 188ms
- **Plan**: free
- **Source**: manual
- **Features Count**: 3

### ✅ Entitlements structure validation

- **Status**: 200
- **Duration**: 102ms
- **Plan**: free
- **Compose Runs**: 50
- **Voice Minutes**: 30
- **Messages**: 200

### ✅ POST /v1/billing/restore (no auth)

- **Status**: 401
- **Duration**: 64ms
- **Expected**: 401

### ✅ POST /v1/billing/restore (authenticated)

- **Status**: 200
- **Duration**: 173ms
- **Recomputed**: true
- **Entitlements Plan**: free
- **Entitlements Source**: manual

### ✅ Restore returns complete entitlements

- **Status**: 200
- **Duration**: 187ms
- **Has Plan**: true
- **Has Source**: true
- **Has Valid Until**: true

### ✅ Entitlements consistency after restore

- **Status**: 200
- **Duration**: 99ms
- **Plan**: free
- **Source**: manual

### ✅ Entitlements source validation

- **Status**: 200
- **Duration**: 116ms
- **Source**: manual
- **Valid Sources**: stripe, app_store, play, manual

---

## Cross-Platform Support

This test validates that:
- Users can check their entitlements from any platform (web, iOS, Android)
- The restore endpoint recomputes entitlements from all subscription sources
- Stripe, App Store, and Play Store subscriptions are unified
- The system returns consistent plan/feature data

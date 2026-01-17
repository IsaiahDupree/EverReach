# Cross-Platform Entitlements Test

- **Run ID**: c21166a3-9ce1-4122-b21b-d2b9a5534a8f
- **Timestamp**: 2025-10-21T03:52:55.550Z
- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app

## Test Results

**Summary**: 8 passed, 0 failed

### ✅ GET /v1/me/entitlements (no auth)

- **Status**: 401
- **Duration**: 150ms
- **Expected**: 401

### ✅ GET /v1/me/entitlements (authenticated)

- **Status**: 200
- **Duration**: 187ms
- **Plan**: free
- **Source**: manual
- **Features Count**: 3

### ✅ Entitlements structure validation

- **Status**: 200
- **Duration**: 97ms
- **Plan**: free
- **Compose Runs**: 50
- **Voice Minutes**: 30
- **Messages**: 200

### ✅ POST /v1/billing/restore (no auth)

- **Status**: 401
- **Duration**: 67ms
- **Expected**: 401

### ✅ POST /v1/billing/restore (authenticated)

- **Status**: 200
- **Duration**: 207ms
- **Recomputed**: true
- **Entitlements Plan**: free
- **Entitlements Source**: manual

### ✅ Restore returns complete entitlements

- **Status**: 200
- **Duration**: 223ms
- **Has Plan**: true
- **Has Source**: true
- **Has Valid Until**: true

### ✅ Entitlements consistency after restore

- **Status**: 200
- **Duration**: 125ms
- **Plan**: free
- **Source**: manual

### ✅ Entitlements source validation

- **Status**: 200
- **Duration**: 101ms
- **Source**: manual
- **Valid Sources**: stripe, app_store, play, manual

---

## Cross-Platform Support

This test validates that:
- Users can check their entitlements from any platform (web, iOS, Android)
- The restore endpoint recomputes entitlements from all subscription sources
- Stripe, App Store, and Play Store subscriptions are unified
- The system returns consistent plan/feature data

# Changelog - December 31, 2024

## Summary

Major fixes for subscription date display and EAS build issues. Successfully built and submitted version 1.0.0 (build 24) to the App Store.

---

## 🎯 Main Objective

Fix the "Subscribed Since" date displaying incorrectly (showing Dec 31, 2025 instead of actual subscription date Dec 1, 2025).

---

## ✅ Changes Made

### 1. Backend API Fix (`backend-vercel/app/api/v1/me/entitlements/route.ts`)

**Problem:** The `/api/v1/me/entitlements` endpoint was not returning `subscription_started_at`, causing the frontend to fall back to stale local storage values.

**Solution:** Added `subscription_started_at` field to the API response, sourced from:
- `subscriptions.started_at` for RevenueCat/App Store subscriptions
- `user_subscriptions.subscribed_at` for Stripe subscriptions (with fallback)
- `subscriptions.started_at` for legacy subscriptions

**Commit:** `dada1b51`

```typescript
// Added to response
return ok({
  // ... existing fields
  subscription_started_at: subscriptionStartedAt
}, req);
```

### 2. Frontend Provider Fix (`providers/SubscriptionProvider.tsx`)

**Problem:** Frontend was prioritizing local storage over backend data, preserving stale dates.

**Solution:** Changed logic to prefer backend `subscription_started_at` when available:

**Commit:** `27a45882`

```typescript
// NEW: Backend is source of truth
if (backendSubscriptionStart) {
  subscriptionStart = backendSubscriptionStart;
  if (storedSubscriptionStart !== backendSubscriptionStart) {
    await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, backendSubscriptionStart);
  }
} else if (storedSubscriptionStart) {
  subscriptionStart = storedSubscriptionStart;
} else {
  subscriptionStart = new Date().toISOString();
  await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, subscriptionStart);
}
```

### 3. Subscription Plans UI Update (`app/subscription-plans.tsx`)

**Problem:** UI only showed "Subscribed Since" date.

**Solution:** Enhanced display to show:
- **Renews:** date (from `valid_until`)
- **Member Since:** date (from `subscription_started_at`)
- **Trial Started:** date (for free users)

**Commit:** `961e6df1`

```tsx
{/* Show renewal date for paid users */}
{isPaid && entitlements?.valid_until && (
  <View style={styles.statusRow}>
    <Text style={styles.statusLabel}>Renews:</Text>
    <Text style={styles.statusValue}>
      {new Date(entitlements.valid_until).toLocaleDateString(...)}
    </Text>
  </View>
)}

{/* Show member since date for paid users */}
{isPaid && (entitlements?.subscription_started_at || subscriptionStartDate) && (
  <View style={styles.statusRow}>
    <Text style={[styles.statusLabel, { color: '#888' }]}>Member Since:</Text>
    <Text style={[styles.statusValue, { color: '#888', fontSize: 13 }]}>
      {new Date(entitlements?.subscription_started_at || subscriptionStartDate!).toLocaleDateString(...)}
    </Text>
  </View>
)}
```

---

## 🔧 Build Fixes

### 4. Package Lock Fix

**Problem:** EAS build failed with `npm ci` error - `yaml@2.8.2` missing from lock file.

**Solution:** Regenerated `package-lock.json`:

```bash
rm -rf node_modules && rm package-lock.json && npm install
```

**Commit:** `9ba13f12`

### 5. Pod Version Conflict Fix

**Problem:** EAS build failed with CocoaPods error - `PurchasesHybridCommon` version mismatch (17.21.0 vs 17.25.0).

**Solution:** Updated Podfile.lock:

```bash
cd ios && pod update PurchasesHybridCommon --repo-update
```

**Packages Updated:**
- PurchasesHybridCommon: 17.21.0 → 17.25.0
- RevenueCat: 5.49.0 → 5.51.1
- RNPurchases: 9.6.8 → 9.6.12

**Commit:** `3b79394d`

---

## 📱 App Store Submission

**Build Details:**
- **Version:** 1.0.0
- **Build Number:** 24
- **Build ID:** `a76e0bb5-9e52-43b2-9307-23c570205d9c`
- **Commit:** `3b79394d`
- **Profile:** production
- **SDK:** Expo 54.0.0

**Submitted via:** `eas submit --platform ios`

---

## 📊 Database Reference

All subscription start dates stored correctly:

| Email | User ID | Subscription Start | Status |
|-------|---------|-------------------|--------|
| isaiahdupree33@gmal.com | 5f5a695c... | Dec 17, 2025 | Active |
| ar_user343@icloud.com | ed9c1cc5... | Dec 10, 2025 | Active |
| soursides@protonmail.com | e695f84f... | Dec 1, 2025 | Active |
| lcreator34@gmail.com | 33888a02... | Nov 24, 2025 | Active |
| smillyface95@gmail.com | 107de33f... | Nov 3, 2025 | Active |
| isaiahdupree33@gmail.com | e5eaa347... | Nov 1, 2025 | Active |

---

## 🔗 Commits (Chronological)

| Commit | Description |
|--------|-------------|
| `dada1b51` | feat: Add subscription_started_at to entitlements API + docs |
| `27a45882` | fix: Prefer backend subscription_started_at over local storage |
| `961e6df1` | feat: Update subscription date display |
| `9ba13f12` | fix: Regenerate package-lock.json to fix yaml version conflict |
| `3b79394d` | fix: Update Podfile.lock for PurchasesHybridCommon 17.25.0 |

---

## 📁 Files Modified

### Backend
- `backend-vercel/app/api/v1/me/entitlements/route.ts`

### Frontend
- `providers/SubscriptionProvider.tsx`
- `app/subscription-plans.tsx`
- `repos/SubscriptionRepo.ts`

### Build Configuration
- `package-lock.json`
- `ios/Podfile.lock`

### Documentation
- `docs/FRONTEND-SUBSCRIPTION-FIXES-2024-12-31.md`
- `docs/SUBSCRIPTION-START-DATE-FIX.md`
- `docs/CHANGELOG-2024-12-31.md` (this file)

---

## ⚠️ Pending

- **Deploy backend to Vercel** - Required for `subscription_started_at` to be returned in production API

```bash
cd backend-vercel && vercel --prod
```

---

## 🧪 Verification Steps

1. Deploy backend to Vercel
2. Clear app local storage or reinstall app
3. Login and navigate to Subscription Plans
4. Verify "Member Since" shows correct date from database
5. Verify "Renews" shows correct renewal date

---

## Branch

All changes on: `e2e-ios`

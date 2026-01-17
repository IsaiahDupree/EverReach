# Settings & Subscription Pages Improvements

**Branch:** `feat/e2e-test-infra`  
**Date:** November 1, 2025  
**Summary:** Major cleanup and enhancement of settings and subscription management pages

---

## 🎯 Overview

This document outlines significant improvements to the settings and subscription management system, including:
- Dev/testing settings control via environment variables
- Settings page organization and cleanup
- Subscription page consolidation and improvements
- New backend endpoints for subscription management
- Auto-refresh functionality for subscription data

---

## 📋 Table of Contents

1. [Environment Variable Controls](#environment-variable-controls)
2. [Settings Page Improvements](#settings-page-improvements)
3. [Subscription Page Enhancements](#subscription-page-enhancements)
4. [Backend API Endpoints](#backend-api-endpoints)
5. [Personal Profile Integration](#personal-profile-integration)
6. [Notifications Page Updates](#notifications-page-updates)
7. [Testing Guide](#testing-guide)

---

## 🔐 Environment Variable Controls

### New Environment Variable: `EXPO_PUBLIC_SHOW_DEV_SETTINGS`

Controls visibility of development and testing features in the settings page.

**Location:** `.env` or `.env.local`

```bash
# Show dev/testing sections (development)
EXPO_PUBLIC_SHOW_DEV_SETTINGS=true

# Hide dev/testing sections (production)
EXPO_PUBLIC_SHOW_DEV_SETTINGS=false
```

**Default:** `false` (hidden in production)

### Sections Controlled by This Variable

When `EXPO_PUBLIC_SHOW_DEV_SETTINGS=true`, the following sections are visible:

1. **Payments (Dev)** - RevenueCat testing tools
   - RC Show App User ID
   - RC Log Out/Log In
   - RC Fetch Offerings
   - RC Purchase Monthly
   - RC Restore Purchases
   - Backend Recompute Entitlements
   - Show Subscription Plans (Paywall)
   - Show Upgrade Onboarding
   - Expire Trial (Test Paywall Gate)
   - Reset Payment Platform

2. **Debug (QA)** - Warmth testing tools
   - Test Warmth Decay
   - Bulk Recompute All Contacts
   - Increase/Decrease Offset

3. **Testing & Development** - All test suites
   - Supabase Tester
   - Warmth Alerts Tests
   - Contact Import Tests
   - API Test Suite
   - Payment Events Monitor
   - Notes API Tests
   - Contact Save Test
   - Contacts Load Test
   - Contact History
   - OpenAI Generation Test
   - API Health Dashboard

4. **Appearance** - Theme settings
   - Theme selector (Light/Dark/System)

5. **App Mode** (Dev Settings Section)
   - Mode Settings
   - Supabase Connection Status
   - Vercel Backend Status

---

## ⚙️ Settings Page Improvements

### Changes Made

#### 1. **Personal Profile Moved to Top**
- **Before:** Personal Profile was in the middle of settings
- **After:** Personal Profile is now the first item in "Account" section
- **Navigation:** Links to `/personal-profile` page

#### 2. **Removed Sections/Items**
- ❌ Avatar Upload Test (from Contacts)
- ❌ Entire "Onboarding" section (Show Onboarding at Launch, Reset Onboarding)
- ❌ Duplicate "Account & Billing" link (redundant with "View Plans")

#### 3. **Production-Ready Structure**

**Production Mode** (`EXPO_PUBLIC_SHOW_DEV_SETTINGS=false`):
```
Settings
├── Account
│   └── Personal Profile
├── Contacts
│   └── Import from Phone Contacts
├── Personal
│   └── Personal Notes
├── Messages
│   └── Default Tone
├── Lead Management
│   └── Warmth Settings
├── Notifications
│   └── Enable Notifications
├── Legal
│   ├── Terms of Service
│   └── Privacy Policy
└── Support
    ├── Help Center
    └── Feature Request & Feedback
```

**Dev Mode** (`EXPO_PUBLIC_SHOW_DEV_SETTINGS=true`):
```
(Same as production, plus...)
├── Payments (Dev)
├── Debug (QA)
├── Appearance
├── Testing & Development
└── App Mode
```

---

## 💳 Subscription Page Enhancements

### File: `app/subscription-plans.tsx`

#### 1. **Page Consolidation**
- Merged functionality from `account-billing.tsx` and `subscription-plans.tsx`
- `account-billing.tsx` now redirects to `subscription-plans.tsx`
- Single source of truth for all subscription management

#### 2. **Improved Layout**

**New Structure:**
```
┌─ Current Subscription ────────────────────┐
│ Status: Active / Free Trial               │
│ Plan: EverReach Core / Free Trial         │
│ Trial Days Remaining: 7 days ← PROMINENT  │
│ Account: email@example.com                │
│ Payment Method: Apple Pay / Google / Stripe│
│ Subscribed Since: Nov 1, 2025             │
│ Usage Stats (last 30 days)                │
└───────────────────────────────────────────┘

┌─ Upgrade or Switch Plans ─────────────────┐
│ [Available subscription offers shown]      │
│ - EverReach Core ($15/month)              │
│ - EverReach Pro ($35/month)               │
└───────────────────────────────────────────┘

[Manage Billing] [Restore Purchases]
```

#### 3. **Key Features**

**Trial Days Prominently Displayed:**
- Shows immediately after plan name
- Bold, larger text for visibility
- Only visible when user is on free trial

**Always Show Available Offers:**
- Before: Only shown to non-paid users
- After: Always visible (even for paid users)
- Allows paid users to see upgrade/switch options

**Auto-Refresh on Focus:**
```typescript
useFocusEffect(
  useCallback(() => {
    void loadAccountData();
    if (Platform.OS !== 'web') {
      import('@/lib/revenuecat').then(({ fetchOfferings }) => {
        return fetchOfferings().catch(console.error);
      });
    }
  }, [])
);
```
- Automatically reloads subscription data when returning to page
- Ensures fresh data after resetting payment platform in settings

---

## 🔌 Backend API Endpoints

### New File: `backend-vercel/app/api/v1/me/subscription/route.ts`

#### 1. **DELETE /api/v1/me/subscription**

Cancels user's subscription and resets to free tier.

**Request:**
```bash
DELETE /api/v1/me/subscription
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Subscription cancelled successfully",
  "plan": "free",
  "cancelled_at": "2025-11-02T01:30:00.000Z"
}
```

**Implementation:**
- Resets `entitlements` table to `plan: 'free'`
- Clears `valid_until` date
- Sets `source: 'manual'`
- Updates `updated_at` timestamp

---

#### 2. **POST /api/v1/me/subscription**

Dev/testing endpoint to manipulate subscription state.

**Reset to Free:**
```bash
POST /api/v1/me/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "reset_to_free"
}
```

**Set to Pro (Testing):**
```bash
POST /api/v1/me/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "set_pro",
  "source": "manual"  // or "app_store", "play", "stripe"
}
```

**Response:**
```json
{
  "message": "Subscription set to pro tier",
  "plan": "pro"
}
```

---

## 👤 Personal Profile Integration

### File: `app/personal-profile.tsx`

#### Account Information Section

Added account details to Personal Profile page:

```tsx
{/* Account Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Account</Text>
  
  <View style={styles.accountInfo}>
    <View style={styles.accountItem}>
      <Mail size={20} color={theme.colors.textSecondary} />
      <View style={styles.accountItemText}>
        <Text style={styles.accountLabel}>Signed in as</Text>
        <Text style={styles.accountValue}>{user?.email}</Text>
      </View>
    </View>
    
    {orgId && (
      <View style={styles.accountItem}>
        <Globe size={20} color={theme.colors.textSecondary} />
        <View style={styles.accountItemText}>
          <Text style={styles.accountLabel}>Organization</Text>
          <Text style={styles.accountValue}>{orgId}</Text>
        </View>
      </View>
    )}
  </View>
</View>
```

**New Structure:**
```
Personal Profile
├── Profile Picture (with upload)
├── Account ← NEW
│   ├── Signed in as: email@example.com
│   └── Organization: org-id
├── Name (First & Last)
├── About Me
└── Personal Notes (link)
```

---

## 🔔 Notifications Page Updates

### File: `app/notifications.tsx`

#### Removed: Goals & Streaks Section

**Before:**
```
Notifications
├── General
├── Reminders
└── Goals & Streaks ← REMOVED
    ├── Weekly Goal
    └── Gold Streak Goal
```

**After:**
```
Notifications
├── General
│   ├── Push Notifications
│   └── Cold Contact Alerts
└── Reminders
    ├── Frequency
    ├── Quiet Hours
    ├── Sound
    └── Vibration
```

**Removed Elements:**
- Weekly Goal setting
- Gold Streak Goal setting
- Goal explanation text
- `handleGoalChange` function
- State variables: `weeklyGoal`, `goldGoal`
- Unused imports: `Calendar`, `Alert`, `Platform`
- Unused styles: `goalExplanation`, `goalExplanationText`

---

## 🧪 Testing Guide

### 1. Enable Dev Settings

**Step 1:** Update `.env` file:
```bash
EXPO_PUBLIC_SHOW_DEV_SETTINGS=true
```

**Step 2:** Restart Expo dev server

**Step 3:** Navigate to Settings → verify dev sections are visible

---

### 2. Test Subscription Flow

#### A. Expire Trial & Trigger Upgrade Onboarding

1. Go to **Settings → Payments (Dev)**
2. Tap **"🧪 Expire Trial (Test Paywall Gate)"**
3. Verify upgrade onboarding screen appears
4. Test swipeable 5-page onboarding flow

#### B. Reset Subscription State

1. Go to **Settings → Payments (Dev)**
2. Tap **"🔄 Reset Payment Platform"**
3. Navigate back to **View Plans**
4. Verify page auto-refreshes with updated data
5. Confirm trial days and status are reset

#### C. Test Backend Endpoints

**Reset to Free:**
```bash
curl -X POST https://ever-reach-be.vercel.app/api/v1/me/subscription \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset_to_free"}'
```

**Set to Pro:**
```bash
curl -X POST https://ever-reach-be.vercel.app/api/v1/me/subscription \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"set_pro","source":"manual"}'
```

**Cancel Subscription:**
```bash
curl -X DELETE https://ever-reach-be.vercel.app/api/v1/me/subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Test Personal Profile

1. Go to **Settings → Account → Personal Profile**
2. Verify account section shows:
   - Email address
   - Organization ID
3. Test profile picture upload
4. Update name and bio
5. Verify changes persist

---

### 4. Verify Production Mode

**Step 1:** Update `.env`:
```bash
EXPO_PUBLIC_SHOW_DEV_SETTINGS=false
```

**Step 2:** Restart app

**Step 3:** Navigate to Settings

**Step 4:** Verify dev sections are hidden:
- ❌ Payments (Dev)
- ❌ Debug (QA)
- ❌ Testing & Development
- ❌ Appearance
- ❌ App Mode

---

## 📝 Summary of Changes

### Files Modified

#### Frontend
- `app/(tabs)/settings.tsx` - Settings page reorganization
- `app/subscription-plans.tsx` - Subscription page improvements
- `app/account-billing.tsx` - Redirect to subscription-plans
- `app/personal-profile.tsx` - Account info integration
- `app/notifications.tsx` - Goals & streaks removal
- `.env.example` - New environment variable docs

#### Backend
- `backend-vercel/app/api/v1/me/subscription/route.ts` - NEW subscription endpoints

### Environment Variables
- `EXPO_PUBLIC_SHOW_DEV_SETTINGS` - Control dev features visibility

### Key Benefits

✅ **Production-Ready Settings** - Clean UI without dev clutter  
✅ **Centralized Subscription Management** - One page for all billing  
✅ **Prominent Trial Display** - Users clearly see days remaining  
✅ **Auto-Refresh** - Always shows current subscription status  
✅ **Backend API Support** - Full subscription management via API  
✅ **Developer-Friendly** - Easy testing with dev mode toggle  
✅ **Account Consolidation** - All account info in Personal Profile  

---

## 🚀 Deployment Checklist

- [ ] Set `EXPO_PUBLIC_SHOW_DEV_SETTINGS=false` in production `.env`
- [ ] Deploy backend with new subscription endpoints
- [ ] Test subscription flow in staging environment
- [ ] Verify auto-refresh works after payment platform reset
- [ ] Confirm Personal Profile shows account information correctly
- [ ] Test on iOS and Android for payment platform detection
- [ ] Update user documentation if needed

---

## 🔗 Related Files

- Settings: `app/(tabs)/settings.tsx`
- Subscription Plans: `app/subscription-plans.tsx`
- Personal Profile: `app/personal-profile.tsx`
- Notifications: `app/notifications.tsx`
- Backend API: `backend-vercel/app/api/v1/me/subscription/route.ts`
- Environment Config: `.env.example`

---

**End of Documentation**

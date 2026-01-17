# Payment Events Testing Guide

**Last Updated**: November 1, 2025

## Overview

This guide explains how to use the Payment Events Monitor to track and debug all RevenueCat and Superwall events in real-time during testing.

---

## 🎯 What's New

### Event Monitoring System
We've added a comprehensive event tracking system that captures all payment-related events:

**Components**:
1. **Event Logger** (`lib/paymentEventLogger.ts`): Central logging utility
2. **Event Monitor Screen** (`app/payment-events-test.tsx`): Real-time visualization
3. **Integration Points**: Events logged from RevenueCat and Superwall flows

**Captured Events**:
- RevenueCat: `purchase_attempt`, `purchase_success`, `purchase_cancelled`, `purchase_error`, `restore_attempt`, `restore_success`, `restore_error`
- Superwall: `paywall_trigger_attempt`, `paywall_present`, `paywall_dismiss`, `paywall_error`, `paywall_skip`, `paywall_register_error`

---

## 📱 How to Access

### From Settings
1. Open app → Navigate to **Settings** tab
2. Scroll down to **Testing & Development** section
3. Tap **Payment Events Monitor**

### Direct Navigation
```typescript
router.push('/payment-events-test');
```

---

## 🧪 Testing Workflow

### Step 1: Open Event Monitor
- Settings → Payment Events Monitor
- Screen shows real-time event feed
- Auto-refreshes by default (can toggle off)

### Step 2: Trigger Events

**Option A: Navigate to Subscription Screens**
- Tap **"View Plans"** button → opens subscription-plans screen
- Tap **"Upgrade Screen"** button → opens upgrade-onboarding screen
- Perform actions on those screens
- Events appear in monitor automatically

**Option B: Test from Subscription Plans Screen**
1. Navigate: Settings → View Plans
2. Actions that generate events:
   - Tap "Subscribe" button → `purchase_attempt`
   - Complete purchase → `purchase_success`
   - Cancel purchase → `purchase_cancelled`
   - Tap "Restore Purchases" → `restore_attempt`, `restore_success/error`

**Option C: Test from Upgrade Onboarding**
1. Let trial expire OR manually navigate to `/upgrade-onboarding`
2. Actions that generate events:
   - Tap "Show Paywall (Superwall)" → `paywall_trigger_attempt`, `paywall_present`
   - Dismiss paywall → `paywall_dismiss`
   - Purchase from paywall → `purchase_*` events

**Option D: Manual Test Events**
- Tap "Test RC Event" → creates test RevenueCat event
- Tap "Test SW Event" → creates test Superwall event
- Useful for testing the monitoring system itself

### Step 3: Review Events

**Event Card Details**:
- **Badge**: RC (RevenueCat) or SW (Superwall) - color-coded
- **Type**: Event name (e.g., `purchase_success`)
- **Timestamp**: How long ago event occurred
- **Tap to expand**: View full event data and metadata

**Summary Header**:
- Total Events count
- RevenueCat events count (green)
- Superwall events count (blue)
- Subscription status

### Step 4: Export or Clear

**Export Events**:
- Tap "Export" button
- Mobile: Share JSON via native share sheet
- Web: Copies to console and shows alert
- Useful for debugging with team or support

**Clear Events**:
- Tap "Clear" button → confirmation alert
- Removes all events from memory
- Start fresh for new test session

---

## 📊 Event Types Reference

### RevenueCat Events

| Event Type | When It Fires | Data Included |
|------------|---------------|---------------|
| `purchase_attempt` | User taps Subscribe button | `plan_id`, `package_id` |
| `purchase_success` | Purchase completes successfully | `plan_id`, `customer_info` |
| `purchase_cancelled` | User cancels payment sheet | `plan_id` |
| `purchase_error` | Purchase fails | `plan_id`, `error` message |
| `restore_attempt` | User taps Restore Purchases | - |
| `restore_success` | Purchases restored successfully | `customer_info` |
| `restore_error` | Restore fails | `error` message |

### Superwall Events

| Event Type | When It Fires | Data Included |
|------------|---------------|---------------|
| `paywall_trigger_attempt` | Attempting to show paywall | `placement` name |
| `paywall_present` | Paywall displays successfully | Paywall info, placement |
| `paywall_dismiss` | Paywall closed/dismissed | Dismiss reason, result state |
| `paywall_error` | Paywall fails to load | `error` message |
| `paywall_skip` | Paywall skipped (already paid, etc.) | Skip reason |
| `paywall_register_error` | Failed to register placement | `error` message |

---

## 🔍 Testing Scenarios

### Scenario 1: Complete Purchase Flow

**Goal**: Verify all events fire correctly during a purchase

**Steps**:
1. Open Payment Events Monitor
2. Clear existing events
3. Navigate to Subscription Plans
4. Tap Subscribe on Monthly plan
5. Complete purchase in payment sheet
6. Return to Event Monitor

**Expected Events** (in order):
1. `purchase_attempt` - Button tapped
2. `purchase_success` - Payment completed
3. (Customer info and entitlements updated)

**Verify**:
- ✅ Both events appear
- ✅ `customer_info` in success event contains entitlements
- ✅ No error events

### Scenario 2: Cancelled Purchase

**Goal**: Verify cancellation is tracked

**Steps**:
1. Clear events
2. Navigate to Subscription Plans
3. Tap Subscribe
4. Cancel payment sheet
5. Check Event Monitor

**Expected Events**:
1. `purchase_attempt`
2. `purchase_cancelled`

### Scenario 3: Restore Purchases

**Goal**: Verify restore flow works

**Steps**:
1. Clear events
2. Navigate to Subscription Plans
3. Tap "Restore Purchases"
4. Check Event Monitor

**Expected Events** (if subscription exists):
1. `restore_attempt`
2. `restore_success`

**Expected Events** (if no subscription):
1. `restore_attempt`
2. `restore_error` OR alert showing no purchases

### Scenario 4: Superwall Paywall

**Goal**: Verify remote paywall events

**Prerequisites**: Superwall keys configured in `.env`

**Steps**:
1. Clear events
2. Navigate to Upgrade Onboarding
3. Tap "Show Paywall (Superwall)"
4. Interact with paywall
5. Check Event Monitor

**Expected Events**:
1. `paywall_trigger_attempt`
2. `paywall_present` (if paywall loads)
3. `paywall_dismiss` (if user closes)
   OR `purchase_*` events (if user purchases)

### Scenario 5: Error Handling

**Goal**: Verify errors are captured

**Steps** (Simulate Error):
1. Disable internet connection
2. Attempt to purchase
3. Check Event Monitor

**Expected Events**:
1. `purchase_attempt`
2. `purchase_error` with network error message

---

## 🐛 Debugging Tips

### Events Not Appearing?

**Check**:
1. Auto-refresh is ON (toggle at bottom of screen)
2. Manually tap "Refresh" button
3. Check console logs - events also logged there
4. Verify you're performing actions that trigger events

### No Purchase Events on Native?

**Check**:
1. RevenueCat keys are in `.env`
2. App is a dev build (not Expo Go)
3. Xcode StoreKit config is enabled
4. Console shows RevenueCat initialized

### No Superwall Events?

**Check**:
1. Superwall keys are in `.env` (real keys, not placeholders)
2. At least one placement is configured in Superwall dashboard
3. Placement name matches: `campaign_trigger`
4. App was restarted after adding keys

### Events Missing Data?

**Normal**: Some events may have minimal data (e.g., `restore_attempt` has no parameters)

**Issue**: If `customer_info` is missing from success events:
- Check RevenueCat configuration
- Verify purchase actually completed
- Check backend entitlements API

---

## 💡 Advanced Usage

### Console Logging

All events are also logged to console with prefix:
```
[RevenueCat Event] purchase_success: { plan_id: "core", customer_info: {...} }
[Superwall Event] paywall_present: { placement: "campaign_trigger", ... }
```

Filter console by `[RevenueCat Event]` or `[Superwall Event]` for quick debugging.

### Export for Analysis

1. Complete a full test session
2. Tap "Export" to get JSON
3. Share with team or save to file
4. Analyze event sequence and timing

**Example Export**:
```json
[
  {
    "id": "rc_1730432345678_xyz123",
    "timestamp": 1730432345678,
    "source": "revenuecat",
    "type": "purchase_attempt",
    "data": { "plan_id": "core", "package_id": "$rc_monthly" },
    "metadata": {}
  },
  {
    "id": "rc_1730432350123_abc456",
    "timestamp": 1730432350123,
    "source": "revenuecat",
    "type": "purchase_success",
    "data": { "plan_id": "core", "customer_info": {...} },
    "metadata": {}
  }
]
```

### Programmatic Access

Access the logger directly in code:
```typescript
import { paymentEventLogger, logRevenueCatEvent, logSuperwallEvent } from '@/lib/paymentEventLogger';

// Get all events
const events = paymentEventLogger.getEvents();

// Get summary
const summary = paymentEventLogger.getSummary();

// Subscribe to new events
const unsubscribe = paymentEventLogger.subscribe((event) => {
  console.log('New event:', event);
});

// Clean up
unsubscribe();
```

---

## 📋 QA Checklist

### Before Submitting for Review

- [ ] Test complete purchase flow - all events fire
- [ ] Test cancellation - `purchase_cancelled` appears
- [ ] Test restore - works for existing subscriptions
- [ ] Test Superwall paywall (if keys configured) - displays and tracks
- [ ] Test error scenario - errors are captured
- [ ] Export events - JSON is valid
- [ ] Clear events - memory is freed
- [ ] Auto-refresh toggle - works correctly
- [ ] Events persist across screen navigation
- [ ] Timestamps are accurate

### Integration Testing

- [ ] Events reach PostHog/analytics
- [ ] RevenueCat webhooks fire (check dashboard)
- [ ] Entitlements update after purchase
- [ ] Subscription status reflects in app
- [ ] Backend receives purchase events

---

## 🔗 Related Documentation

- **RevenueCat Testing**: `docs/REVENUECAT_TESTING_GUIDE.md`
- **Superwall Integration**: `docs/SUPERWALL_INTEGRATION.md`
- **Payment Integration Status**: `docs/PAYMENT_INTEGRATION_STATUS.md`
- **Main Testing Guide**: This document

---

## 🚀 Quick Reference Commands

### View Event Monitor
```typescript
// From anywhere in app
router.push('/payment-events-test');
```

### Log Custom Event
```typescript
import { logRevenueCatEvent, logSuperwallEvent } from '@/lib/paymentEventLogger';

logRevenueCatEvent('custom_event', { key: 'value' });
logSuperwallEvent('custom_event', { key: 'value' }, { metadata: 'optional' });
```

### Check Event Count
```typescript
import { paymentEventLogger } from '@/lib/paymentEventLogger';

const summary = paymentEventLogger.getSummary();
console.log(`Total events: ${summary.total}`);
console.log(`RevenueCat: ${summary.revenueCat}`);
console.log(`Superwall: ${summary.superwall}`);
```

---

## 📞 Support

**Issues with Events Not Logging?**
1. Check console for error messages
2. Verify imports are correct
3. Ensure event logger is initialized (it auto-initializes)

**Need Help?**
- Check related docs listed above
- Review console logs for detailed error messages
- Export events and share with team for analysis

**Feature Requests?**
- Event filtering by type/source
- Event search functionality
- Event playback/replay
- Time-series visualization

# RevenueCat Configuration for EverReach

## Environment Variables Setup

Add these to your environment files:

### Frontend (.env)

```bash
# RevenueCat Public SDK Keys
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_vFMuKNRSMlJOSINeBHtjivpcZNs
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_XXXXX  # TODO: Need Android key from RevenueCat dashboard

# Test Mode Key (for testing)
EXPO_PUBLIC_REVENUECAT_TEST_KEY=test_KsnKaXlsDwOXbyRyCrQZjHcQDhv
```

### Backend (.env or Vercel Environment Variables)

```bash
# RevenueCat Secret Key (Server-side only)
REVENUECAT_SECRET_KEY=sk_RhNrMwSsvsgTRCujwTYSyimcmndWp

# RevenueCat Webhook Secret (For signature verification)
REVENUECAT_WEBHOOK_SECRET=rcb_ElSyxfqivpMlrxCyzywWaeOsylYh
```

---

## RevenueCat Dashboard Configuration

### 1. Webhook Setup

**URL to Configure in RevenueCat:**
```
https://ever-reach-be.vercel.app/api/v1/webhooks/app-store
```

**Events to Subscribe:**
- [x] INITIAL_PURCHASE
- [x] RENEWAL  
- [x] CANCELLATION
- [x] BILLING_ISSUE
- [x] PRODUCT_CHANGE
- [x] EXPIRATION
- [x] NON_RENEWING_PURCHASE
- [x] SUBSCRIPTION_PAUSED

**Webhook Secret:**
```
rcb_ElSyxfqivpMlrxCyzywWaeOsylYh
```

---

### 2. Product IDs to Create

#### iOS App Store Products:
- `everreach_premium_monthly` - Monthly subscription ($9.99/month)
- `everreach_premium_annual` - Annual subscription ($99.99/year)

#### Android Google Play Products:
- `everreach_premium_monthly` - Monthly subscription
- `everreach_premium_annual` - Annual subscription

---

### 3. Entitlement Configuration

**Primary Entitlement ID:** `pro`

**Products linked to "pro" entitlement:**
- everreach_premium_monthly
- everreach_premium_annual

---

### 4. App Configuration

**iOS Bundle ID:** `com.everreach.app`  
**Android Package Name:** `com.everreach.crm`

**Support Email:** `info@everreach.app`

---

## Integration Status Checklist

### ✅ Completed
- [x] RevenueCat account created
- [x] API keys obtained
- [x] iOS app configured
- [x] Webhook URL configured

### 🔜 To Do
- [ ] Add Android API key to RevenueCat dashboard
- [ ] Create product IDs in App Store Connect
  - [ ] `everreach_premium_monthly`
  - [ ] `everreach_premium_annual`
- [ ] Create matching product IDs in Google Play Console
- [ ] Link products to "pro" entitlement in RevenueCat
- [ ] Test webhook delivery to backend
- [ ] Test purchase flow in sandbox

---

## Backend Webhook Handler

The webhook handler is configured at:
```
https://ever-reach-be.vercel.app/api/v1/webhooks/app-store
```

**Expected Payload:**
```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "app_user_id": "user_123",
    "product_id": "everreach_premium_monthly",
    "period_type": "NORMAL",
    "purchased_at_ms": 1699564800000,
    "expiration_at_ms": 1702243200000,
    "store": "APP_STORE",
    "entitlement_ids": ["pro"]
  }
}
```

**Verification:**
The webhook secret `rcb_ElSyxfqivpMlrxCyzywWaeOsylYh` will be used to verify incoming webhook signatures.

---

## Testing

### 1. Test Purchase Flow (Sandbox)

```typescript
import Purchases from 'react-native-purchases';

// Configure RevenueCat
Purchases.configure({
  apiKey: Platform.OS === 'ios' 
    ? 'appl_vFMuKNRSMlJOSINeBHtjivpcZNs'
    : 'goog_XXXXX',  // Add Android key when available
  appUserID: user.id
});

// Test purchase
const offerings = await Purchases.getOfferings();
const pkg = offerings.current.availablePackages[0];
const { customerInfo } = await Purchases.purchasePackage(pkg);

// Check entitlement
const hasProAccess = customerInfo.entitlements.active['pro'] !== undefined;
```

### 2. Test Webhook Delivery

Use RevenueCat dashboard "Send Test Event" feature to test webhook delivery to:
```
https://ever-reach-be.vercel.app/api/v1/webhooks/app-store
```

### 3. Verify Backend Integration

Check backend logs to ensure:
1. Webhook signature verification passes
2. User entitlements are updated in database
3. App receives updated subscription status

---

## Important Notes

### Missing Information Needed:
1. **Android API Key** - Need to generate in RevenueCat dashboard for Android
2. **Product Creation** - Products must be created in both App Store Connect and Google Play Console before they can be used

### Security Best Practices:
- ✅ Secret key stored securely in backend only
- ✅ Public keys safe to use in mobile app
- ✅ Webhook signature verification enabled
- ✅ User ID from Supabase used as RevenueCat app_user_id

### Next Steps:
1. Generate Android API key in RevenueCat dashboard
2. Create products in App Store Connect
3. Create products in Google Play Console  
4. Test purchase flow in sandbox environment
5. Verify webhook delivery to backend
6. Test entitlement verification in app

---

## Support Contacts

**RevenueCat Support:** support@revenuecat.com  
**App Support Email:** info@everreach.app

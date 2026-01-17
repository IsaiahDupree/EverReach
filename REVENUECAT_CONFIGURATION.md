# RevenueCat Configuration & Test Data

## Project Information
- **Project ID**: `projf143188e`
- **Project Name**: EverReach

---

## API Keys

### Secret API Key (Production)
```
sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX
```

### SDK API Keys

**App Store (EverReach)**
```
app1_vFMuKNRSMlJOSINeBHtjivpcZNs
```

**Test Store**
```
test_KsnKaXlsDwOXbyRyCrQZjHcQDhv
```

**Web Billing (EverReach)**
```
rcb_ElSyxfqivpMlrxCyzywWaeOsylYh
```

**Sandbox**
```
rcb_sb_gKGRFCryyvnqkLjRCXp4xcPB
```

---

## App IDs

### App Configuration (iOS)
```
app3063e75cd7
```

### Web Configuration
```
appa73f908128
```

---

## Webhook Configuration

### Webhook URL
```
https://ever-reach-be.vercel.app/api/v1/billing/revenuecat/webhook
```

### Webhook Name
```
everreach_webhook
```

### Environment
- Production and Sandbox

### Events
- All events enabled

---

## Test Event Data

### Sample Webhook Event - RENEWAL
**Event ID**: `07eb5772-9653-4cb8-a543-e2cbfc8bc918`
**Timestamp**: 2025-11-02 at 09:32 PM UTC
**Attempts**: 6 out of 6

```json
{
  "api_version": "1.0",
  "event": {
    "aliases": [
      "e5eaa347-9c72-4190-bace-ec7a2063f69a",
      "$RCAnonymousID:6ffbde4f9afb4aa99a0dadbd469336e2"
    ],
    "app_id": "app1684cd36ac",
    "app_user_id": "e5eaa347-9c72-4190-bace-ec7a2063f69a",
    "commission_percentage": 0,
    "country_code": "US",
    "currency": "USD",
    "entitlement_id": null,
    "entitlement_ids": [
      "EverReach Core"
    ],
    "environment": "SANDBOX",
    "event_timestamp_ms": 1762115463798,
    "expiration_at_ms": 1762115761579,
    "id": "07EB5772-9653-4CB8-A543-E2CBFC8BC918",
    "is_family_share": false,
    "is_trial_conversion": false,
    "metadata": null,
    "offer_code": null,
    "original_app_user_id": "e5eaa347-9c72-4190-bace-ec7a2063f69a",
    "original_transaction_id": "test_1762114261323_85DFFF8B-905D-4A8B-9600-FB6868DE8405",
    "period_type": "NORMAL",
    "presented_offering_id": null,
    "price": 15,
    "price_in_purchased_currency": 15,
    "product_id": "Test_EverReach_Core",
    "purchased_at_ms": 1762115461579,
    "renewal_number": 5,
    "store": "TEST_STORE",
    "subscriber_attributes": {
      "$attConsentStatus": {
        "updated_at_ms": 1762039863323,
        "value": "notDetermined"
      }
    },
    "takehome_percentage": 1,
    "tax_percentage": 0,
    "transaction_id": "test_1762114261323_85DFFF8B-905D-4A8B-9600-FB6868DE8405..3",
    "type": "RENEWAL"
  }
}
```

---

## Event Types Received

Based on the webhook configuration:
- `RENEWAL` - Subscription renewal (sample above)
- `INITIAL_PURCHASE` - First purchase
- `NON_RENEWING_PURCHASE` - One-time purchase
- `CANCELLATION` - Subscription canceled
- `EXPIRATION` - Subscription expired
- `BILLING_ISSUE` - Payment failed
- `PRODUCT_CHANGE` - Plan upgrade/downgrade

---

## Entitlements

### EverReach Core
- **Product ID (Test)**: `Test_EverReach_Core`
- **Price**: $15.00 USD
- **Type**: Subscription

---

## Integration Status

✅ **Project ID**: Configured (`projf143188e`)
✅ **API Keys**: All keys documented
✅ **Webhook URL**: Configured and receiving events
✅ **Test Events**: Successfully delivered (6/6 attempts)
⚠️ **Sandbox Access**: Set to "Anybody" (consider restricting for production)

---

## Next Steps

1. ✅ Configure database with project_id
2. ✅ Test webhook endpoint
3. [ ] Implement webhook handler logic
4. [ ] Set up subscription sync
5. [ ] Test with real purchases

---

## Webhook Handler Location

```
backend-vercel/app/api/v1/billing/revenuecat/webhook/route.ts
```

---

**Last Updated**: November 10, 2025
**Configuration Status**: Complete

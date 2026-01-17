# Product IDs Fix - App Store Product Integration

## Problem
The restore route (`/api/v1/billing/restore`) was trying to insert subscriptions with product IDs like `com.everreach.core.monthly`, but these didn't exist in the `products` table. This caused foreign key constraint violations when trying to upsert subscriptions.

## Solution
Added the App Store product IDs directly to the `products` table so they can be used as foreign keys in the `subscriptions` table.

## Migration Applied
**Migration Name:** `add_app_store_product_ids`

**Products Added:**
- `com.everreach.core.monthly` - Core Monthly subscription
- `com.everreach.core.yearly` - Core Yearly subscription

## Current Products Table
The `products` table now contains:
- `pro_monthly` - Internal monthly product ID
- `pro_yearly` - Internal yearly product ID  
- `com.everreach.core.monthly` - App Store monthly product ID ✅ **NEW**
- `com.everreach.core.yearly` - App Store yearly product ID ✅ **NEW**

## How the Restore Route Works

### Flow:
1. **RevenueCat API Query** - Fetches active entitlements from RevenueCat V2 API
2. **Subscription Detection** - Finds active entitlements that haven't expired
3. **Product ID Mapping** - Uses `com.everreach.core.monthly` as default (line 61)
4. **Subscription Upsert** - Inserts/updates subscription in `subscriptions` table with:
   - `product_id`: `com.everreach.core.monthly` (or yearly if detected)
   - `store`: `'app_store'`
   - `status`: `'active'`
   - `current_period_end`: Expiration date from RevenueCat
5. **Entitlement Recompute** - Calls `recomputeEntitlementsForUser()` which:
   - Queries `subscriptions` table for active subscriptions
   - Sets user's `entitlements.plan` to `'pro'` if active subscription found
   - Sets `valid_until` to subscription's `current_period_end`

### Expected Log Output After Fix:
```
[Restore] ✅ Subscription upserted to database
[recomputeEntitlements] 📋 Found 1 subscription(s)
[recomputeEntitlements] ✅ Active subscription found!
  - Setting plan to: PRO
```

## Future Improvements

### 1. Detect Product Type from RevenueCat
Currently, the route defaults to `com.everreach.core.monthly`. To properly detect monthly vs yearly:

```typescript
// In restore route, after finding activeEntitlement:
// Try to extract product_id from RevenueCat response
let productId = 'com.everreach.core.monthly'; // default

// Check if we can determine from RevenueCat data
if (rcData.subscriptions?.items) {
  const activeSub = rcData.subscriptions.items.find((s: any) => 
    s.product_identifier === 'com.everreach.core.monthly' || 
    s.product_identifier === 'com.everreach.core.yearly'
  );
  if (activeSub) {
    productId = activeSub.product_identifier;
  }
}
```

### 2. Use product_skus Table for Mapping
Alternatively, you could use the `product_skus` table to map App Store SKUs to internal product IDs:

```sql
-- Map App Store product IDs to internal product IDs
INSERT INTO product_skus (product_id, store, sku)
VALUES 
  ('pro_monthly', 'app_store', 'com.everreach.core.monthly'),
  ('pro_yearly', 'app_store', 'com.everreach.core.yearly')
ON CONFLICT (product_id, store) DO UPDATE
SET sku = EXCLUDED.sku;
```

Then update the route to use `getProductIdForStoreSku()` function that already exists in `lib/entitlements.ts`.

## Testing
After applying the migration:
1. Click "Refresh Entitlements" in the app
2. Check logs for successful subscription upsert
3. Verify `entitlements` table shows `plan = 'pro'` for the user
4. Verify `subscriptions` table has an entry with `product_id = 'com.everreach.core.monthly'`

## Related Files
- `/backend/backend-vercel/app/api/v1/billing/restore/route.ts` - Restore endpoint
- `/backend/backend-vercel/lib/entitlements.ts` - Entitlement recomputation logic
- `/backend/backend-vercel/migrations/add_app_store_product_ids.sql` - Migration SQL





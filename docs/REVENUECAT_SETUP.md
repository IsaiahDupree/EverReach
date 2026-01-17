# RevenueCat Integration Plan (EverReach)

This document captures what we will implement and the configuration you provided, with environment variables to keep secrets out of the repo.


## Work items (mobile + backend)

- Add RevenueCat SDK and config in app.json
- Initialize Purchases on native startup and fetch offerings
- Purchase + Restore flows update entitlements via `GET /api/v1/me/entitlements`
- Implement `POST /api/v1/billing/revenuecat/webhook` to mirror RevenueCat events into our entitlements


## Configuration provided (masked where sensitive)

- Secret API Key (server): `sk_********************` (keep private; do not commit)
- SDK Public API Keys (ok in client but we’ll keep in env):
  - iOS: `appl_vFMuKNRSMlJOSINeBHtjivpcZNs`
  - Android: (pending from dashboard)
- Entitlement(s):
  - Identifier: `EverReach Core` (unlocks premium features)
- Offerings:
  - `default` (The standard set of packages)
  - Includes: 2 packages (monthly, yearly)
- Products (created in App Store; mirror in Google Play):
  - Core Monthly: `com.everreach.core.monthly`
  - Core Annual:  `com.everreach.core.yearly`


## Environment variables

Create/update your local `.env` (do not commit secrets) based on `.env.example`:

- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`=appl_vFMuKNRSMlJOSINeBHtjivpcZNs
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`=<your_android_public_sdk_key>
- `REVENUECAT_SECRET_KEY`=sk_... (server only)
- `REVENUECAT_WEBHOOK_SECRET`=<optional_if_enabled_in_RC>

Optional for clarity:
- `EXPO_PUBLIC_IAP_ENTITLEMENT_ID`=core (or a normalized id for code)
- `EXPO_PUBLIC_IAP_OFFERING_ID`=default
- `EXPO_PUBLIC_IAP_PRODUCTS`=com.everreach.core.monthly,com.everreach.core.yearly


## Expo app configuration

Add the RevenueCat config plugin and pass env keys via `app.json`:

```jsonc
{
  "expo": {
    "plugins": [
      [
        "react-native-purchases",
        {
          "ios": {
            "publicSdkKey": "${EXPO_PUBLIC_REVENUECAT_IOS_KEY}"
          },
          "android": {
            "publicSdkKey": "${EXPO_PUBLIC_REVENUECAT_ANDROID_KEY}"
          }
        }
      ]
    ]
  }
}
```

Notes:
- This requires a Dev Build to test IAP (Expo Go won’t include native purchase modules).
- The plugin handles iOS/Android billing capabilities and SKAdNetwork entries.


## Client initialization (high level)

- At app startup (native):
  - Configure Purchases with platform key
  - Set `appUserID` to your authenticated user id if desired
  - Fetch offerings (`default`) and render paywall
- On purchase success:
  - Refresh `GET /api/v1/me/entitlements`
  - Unlock features immediately
- Restore purchases:
  - Call RevenueCat restore → refresh entitlements


## Backend webhook

- Implement `POST /api/v1/billing/revenuecat/webhook`:
  - Verify signature if enabled
  - Handle events: initial_purchase, renewal, expiration, refund, cancellation
  - Upsert `user_subscriptions` and compute current entitlements
  - Optionally notify the client via SSE/WS or rely on the client to poll `GET /api/v1/me/entitlements`


## Review checklist (stores)

- Native paywall uses RevenueCat purchases on iOS/Android (no external payment links)
- Restore Purchases available
- Privacy/Terms accessible; account deletion flow present
- Products exist in both stores and match IDs above; trials configured (e.g., 7 days)


## Next required inputs from you

- Android Public SDK Key from RevenueCat
- Confirm Google Play products mirroring the App Store products
- (Optional) Webhook signature secret if you enable signed webhooks in RC

# iOS Build & RevenueCat Production Setup

## Quick Links

### Apple Developer Portal
- **Certificates**: https://developer.apple.com/account/resources/certificates/list
- **Identifiers (Bundle IDs)**: https://developer.apple.com/account/resources/identifiers/list
- **Profiles**: https://developer.apple.com/account/resources/profiles/list
- **Devices**: https://developer.apple.com/account/resources/devices/list

### App Store Connect
- **My Apps**: https://appstoreconnect.apple.com/apps
- **EverReach App**: https://appstoreconnect.apple.com/apps/6738666193
- **In-App Purchases**: https://appstoreconnect.apple.com/apps/6738666193/appstore/addons
- **TestFlight**: https://appstoreconnect.apple.com/apps/6738666193/testflight

### RevenueCat Dashboard
- **Dashboard**: https://app.revenuecat.com/
- **Projects**: https://app.revenuecat.com/projects
- **API Keys**: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/api-keys
- **Products**: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/products
- **Offerings**: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/offerings
- **Entitlements**: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/entitlements

### Expo/EAS
- **Expo Dashboard**: https://expo.dev/
- **EverReach Project**: https://expo.dev/accounts/isaiahdupree/projects/ai-enhanced-personal-crm
- **EAS Builds**: https://expo.dev/accounts/isaiahdupree/projects/ai-enhanced-personal-crm/builds
- **Credentials**: https://expo.dev/accounts/isaiahdupree/projects/ai-enhanced-personal-crm/credentials

---

## Part 1: iOS Credentials Setup (EAS Build)

### Step 1: Run EAS Build Interactively

```bash
cd /Users/isaiahdupree/Documents/Software/everreach_dev/mobileapp
EXPO_TOKEN="878UsddKhAT8UDH0GOgSfg1R0v1jkJKOmaXAJuBD" npx eas-cli build --platform ios --profile production
```

### Step 2: When Prompted for Apple Credentials

You'll see prompts like:

```
? How would you like to upload your credentials?
❯ Let Expo handle it (recommended)
  I want to upload my own file
```

**Choose "Let Expo handle it"** - EAS will:
1. Ask for your Apple ID: `isaiahdupree33@gmail.com`
2. Ask for your Apple ID password or App-Specific Password
3. May ask for 2FA verification code
4. Automatically create/select Distribution Certificate
5. Automatically create/select Provisioning Profile

### Step 3: App-Specific Password (If Needed)

If using 2FA (recommended), create an App-Specific Password:
1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Name it "EAS CLI" and save the generated password

### Step 4: Distribution Certificate

EAS will ask:
```
? What type of distribution certificate do you want to use?
❯ Apple Distribution (recommended for App Store)
  iOS Distribution (legacy)
```

**Choose "Apple Distribution"**

### Step 5: Provisioning Profile

EAS will automatically:
- Create a new provisioning profile for `com.everreach.app`
- Link it to your Distribution Certificate
- Download and configure it for the build

---

## Part 2: RevenueCat Production Setup

### Current Configuration

| Item | Value | Status |
|------|-------|--------|
| iOS API Key | `appl_vFMuKNRSMlJOSINeBHtjivpcZNs` | ✅ Production |
| Android API Key | Not set | ❌ Needs setup |
| Bundle ID | `com.everreach.app` | ✅ Configured |

### Step 1: Verify App Store Connect Products

Go to: https://appstoreconnect.apple.com/apps/6738666193/appstore/addons

Required Products:
| Product ID | Type | Price | Status |
|------------|------|-------|--------|
| `com.everreach.core.monthly` | Auto-Renewable | $9.99/mo | ⬜ Verify |
| `com.everreach.core.yearly` | Auto-Renewable | $79.99/yr | ⬜ Verify |

### Step 2: Verify RevenueCat Products

Go to: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/products

Ensure products are:
1. Created in RevenueCat
2. Linked to App Store Connect products
3. Associated with correct entitlements

### Step 3: Verify RevenueCat Entitlements

Go to: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/entitlements

Required Entitlements:
| Entitlement ID | Products |
|----------------|----------|
| `core` | com.everreach.core.monthly, com.everreach.core.yearly |
| `pro` | com.everreach.pro.monthly, com.everreach.pro.yearly |

### Step 4: Verify RevenueCat Offerings

Go to: https://app.revenuecat.com/projects/YOUR_PROJECT_ID/offerings

Required:
- **Default Offering** with packages:
  - `$rc_monthly` → com.everreach.core.monthly
  - `$rc_annual` → com.everreach.core.yearly

### Step 5: App Store Connect Shared Secret

1. Go to App Store Connect → My Apps → EverReach
2. Go to **App Information** → **App-Specific Shared Secret**
3. Generate or view the shared secret
4. Add to RevenueCat: **Project Settings** → **Apple App Store** → **Shared Secret**

---

## Part 3: Environment Variables

### Mobile App (.env)

```bash
# RevenueCat Public SDK Keys (Client-side)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_vFMuKNRSMlJOSINeBHtjivpcZNs
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_YOUR_ANDROID_KEY

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key

# API
EXPO_PUBLIC_API_BASE_URL=https://ever-reach-be.vercel.app
```

### Backend (Vercel)

```bash
# RevenueCat Server-Side Key
REVENUECAT_API_KEY=sk_YOUR_SECRET_KEY
REVENUECAT_V2_API_KEY=sk_YOUR_V2_SECRET_KEY

# Supabase
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Part 4: Testing Checklist

### Before App Store Submission

- [ ] iOS Distribution Certificate created
- [ ] Provisioning Profile created for `com.everreach.app`
- [ ] EAS Build completes successfully
- [ ] App installs via TestFlight
- [ ] RevenueCat products visible in app
- [ ] Test purchase works (sandbox)
- [ ] Restore purchases works
- [ ] Entitlements sync correctly

### RevenueCat Dashboard Verification

- [ ] Products show in RevenueCat
- [ ] Entitlements configured
- [ ] Offerings have packages
- [ ] Shared secret configured
- [ ] Webhook URL configured (optional)

---

## Commands Reference

### Build iOS Production

```bash
cd /Users/isaiahdupree/Documents/Software/everreach_dev/mobileapp
EXPO_TOKEN="878UsddKhAT8UDH0GOgSfg1R0v1jkJKOmaXAJuBD" npx eas-cli build --platform ios --profile production
```

### Submit to App Store

```bash
EXPO_TOKEN="878UsddKhAT8UDH0GOgSfg1R0v1jkJKOmaXAJuBD" npx eas-cli submit --platform ios
```

### Check Build Status

```bash
EXPO_TOKEN="878UsddKhAT8UDH0GOgSfg1R0v1jkJKOmaXAJuBD" npx eas-cli build:list
```

### Manage Credentials

```bash
EXPO_TOKEN="878UsddKhAT8UDH0GOgSfg1R0v1jkJKOmaXAJuBD" npx eas-cli credentials
```

---

## Troubleshooting

### "No offerings available"
1. Check RevenueCat dashboard → Offerings → Default
2. Ensure products are linked to packages
3. Verify entitlements exist

### "Purchase failed"
1. Check App Store Connect product status (Ready to Submit)
2. Verify sandbox test account is properly configured
3. Check RevenueCat logs for errors

### Build fails with credential error
1. Run `eas credentials` to manage/recreate
2. Ensure Apple Developer membership is active
3. Check certificate isn't expired

---

*Last Updated: December 1, 2025*


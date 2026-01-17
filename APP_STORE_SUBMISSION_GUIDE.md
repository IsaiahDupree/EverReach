# App Store Connect - Subscription Submission Guide

## Date: November 23, 2025

This document contains all the information needed to submit the EverReach Core Monthly subscription to App Store Connect.

---

## 📱 Subscription Configuration

### Basic Information

| Field | Value |
|-------|-------|
| **Reference Name** | Core Monthly |
| **Apple ID** | 6753191233 |
| **Product ID** | `com.everreach.core.monthly` |
| **Subscription Duration** | 1 month |
| **Group Reference Name** | EverReach Core |
| **Status** | Ready to Submit |

### Availability
- **All countries or regions** selected
- **Do NOT** remove from sale

### Family Sharing
- **OFF** - Individual subscriptions only (as configured in StoreKit)

---

## 💰 Pricing

### Current Pricing for New Subscribers

| Country/Region | Price | Currency |
|----------------|-------|----------|
| United States | $14.99 | USD |
| Canada | $19.99 | CAD |
| United Kingdom | £14.99 | GBP |
| European Union | €14.99 | EUR |
| Australia | $19.99 | AUD |
| Japan | ¥1,800 | JPY |

**Pricing Strategy**: Premium positioning targeting professionals ($14.99/month)

---

## 📝 Localization

### English (U.S.) - PRIMARY

**Display Name** (Required - Max 30 characters):
```
Core Monthly
```

**Subscription Description** (Required - 45 characters recommended):
```
Includes voice notes, message goals, warmth score.
```

**Extended Description** (For marketing/promotional use):
```
Get full access to EverReach's professional relationship management tools:

✓ Voice Notes - Record and transcribe conversations
✓ Message Goals - AI-powered message composition
✓ Warmth Score - Track relationship health
✓ Unlimited Contacts - Manage all your connections
✓ Advanced Analytics - Relationship insights
✓ Priority Support - Get help when you need it

Perfect for consultants, sales professionals, and networkers who want to maintain meaningful relationships at scale.
```

### Status
- **Prepare for Submission** ✅

---

## 🖼️ Subscription Image (1024x1024)

### Image Requirements

**Specifications**:
- Dimensions: 1024 x 1024 pixels
- Format: PNG or JPG
- Color space: RGB
- Maximum file size: 2 MB
- No transparency (opaque background)

### Image Location
```
/marketing/subscription-images/core-monthly-1024x1024.png
```

### Image Design Guidelines

**Elements to Include**:
1. **EverReach Logo** - Top center
2. **"Core Monthly" text** - Bold, prominent
3. **Key Features Icons**:
   - 🎤 Voice Notes
   - 💬 Message Goals  
   - 🔥 Warmth Score
4. **$14.99/month** - Clear pricing
5. **Brand colors** - Primary blue (#2563EB)

**Design Template**:
```
┌────────────────────────┐
│                        │
│    [EverReach Logo]    │
│                        │
│    Core Monthly        │
│    Subscription        │
│                        │
│  🎤  💬  🔥           │
│                        │
│  Voice  Messages       │
│  Notes  Goals  Warmth  │
│                        │
│    $14.99/month        │
│                        │
└────────────────────────┘
```

### Image Creation Tools
- **Figma**: Use provided template
- **Canva**: Pro subscription required
- **Photoshop**: PSD template available
- **Online**: Use /marketing/templates/subscription-image-template.psd

### Important Notes
⚠️ **Do NOT include**:
- Screenshots of the app
- Actual UI elements
- Time-limited offers
- "Free" claims
- Competitor comparisons

✅ **DO include**:
- Clear subscription name
- Key value propositions
- Consistent branding
- Professional design

---

## 📸 App Store Promotion

### Settings
✅ **Promote on the App Store** - ENABLED

**Why**: 
- Increases visibility on product page
- May appear in search results
- Can be featured by editorial team
- Drives subscription conversions

### Requirements
✅ App supports required StoreKit APIs
✅ Subscription image uploaded (1024x1024)
✅ Localization complete

### Promotion Limits
- Maximum: 20 in-app purchases or subscriptions promoted
- Current: 1 subscription (Core Monthly)
- Available slots: 19

---

## 🏷️ Tax Category

### Configuration
- **Category**: Match to parent app
- **Parent App Category**: Professional Services / Productivity

### Tax Responsibility
⚠️ **Important**: You are responsible for:
- Selecting accurate tax categories
- Maintaining all applicable attributes
- Ensuring compliance with local tax laws
- Updating categories as needed

### Changes
- Changing tax category only affects **future sales**
- Does not retroactively change past transactions
- Independent of app's tax category

---

## 📱 Review Information

### Screenshot (Required)

**Purpose**: Shows the subscription page in-app for App Review team

**Requirements**:
- Shows actual subscription UI in the app
- Displays pricing clearly
- Shows all subscription benefits
- In-app screenshot (not marketing image)
- Dimensions: Match device resolution

**Screenshot Location**:
```
/marketing/subscription-screenshot-iphone-17-pro-max.png
```
Or in full set:
```
/marketing/app-store-screenshots/07-subscription.png
```

**Screenshot Details**:
- **File**: subscription-screenshot-iphone-17-pro-max.png
- **Size**: 370 KB
- **Device**: iPhone 17 Pro Max
- **Dimensions**: 1320x2868 pixels
- **Format**: PNG

### Review Notes (Optional - Max 4000 characters)

**Suggested Review Notes**:
```
SUBSCRIPTION TESTING INSTRUCTIONS

Thank you for reviewing EverReach's Core Monthly subscription.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO ACCESS SUBSCRIPTION SCREEN:

1. Launch EverReach app
2. Tap "Settings" tab (bottom right)
3. Tap "Subscription" row
4. View available subscription plans

OR

1. Try to access a premium feature (e.g., Voice Notes)
2. Paywall will automatically appear
3. Shows subscription options

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST ACCOUNT (Optional):

Email: review-test@everreach.app
Password: ReviewTest123!

Note: Test account has free trial active, but you can
still view subscription plans.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBSCRIPTION FEATURES:

The Core Monthly subscription ($14.99/month) includes:

✓ Voice Notes - Record and transcribe conversations
✓ Message Goals - AI-powered message composition  
✓ Warmth Score - Relationship health tracking
✓ Unlimited Contacts - No contact limits
✓ Advanced Analytics - Relationship insights
✓ Priority Support - Email support within 24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STOREKIT INTEGRATION:

- We use Superwall SDK for paywall presentation
- RevenueCat for subscription management
- StoreKit 2 for transaction processing
- All required APIs implemented and tested

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FREE TRIAL:

- 7-day free trial included
- Users can cancel anytime
- No charge until trial ends
- Clear cancellation instructions in app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CANCELLATION POLICY:

Users can cancel subscription at any time through:
1. App Settings → Subscription → Manage
2. iOS Settings → Apple ID → Subscriptions
3. App Store app → Profile → Subscriptions

Cancellation takes effect at end of billing period.
No refunds for partial months.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIVACY & DATA:

- Privacy Policy: https://everreach.app/privacy
- Terms of Service: https://everreach.app/terms
- GDPR compliant
- CCPA compliant
- No data sold to third parties

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTACT:

For review questions:
Email: review@everreach.app
Response time: Within 24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your time reviewing our submission!
```

**Character Count**: ~1,850 characters (well under 4,000 limit)

---

## ✅ Pre-Submission Checklist

### Required Items

- [x] **Reference Name** set: "Core Monthly"
- [x] **Product ID** set: `com.everreach.core.monthly`
- [x] **Duration** set: 1 month
- [x] **Group** assigned: EverReach Core
- [x] **Pricing** configured: $14.99/month (+ international)
- [x] **Localization** complete: English (U.S.)
- [x] **Display Name**: "Core Monthly"
- [x] **Description**: "Includes voice notes, message goals, warmth score."
- [ ] **Subscription Image** uploaded: 1024x1024 PNG ⚠️ **ACTION NEEDED**
- [x] **App Store Promotion** enabled: Yes
- [x] **Tax Category** set: Match parent app
- [x] **Screenshot** uploaded: 07-subscription.png
- [x] **Review Notes** added: Testing instructions
- [x] **Family Sharing**: OFF (individual subscriptions)
- [x] **Availability** set: All countries/regions

### App Version Requirements

⚠️ **CRITICAL**: 
> Your first subscription must be submitted with a new app version. Create your subscription, then select it from the app's In-App Purchases and Subscriptions section on the version page before submitting the version to App Review.

**Action Items**:
1. ✅ Create subscription in App Store Connect
2. ⏸️ Build new app version with subscription support
3. ⏸️ Upload binary to App Store Connect
4. ⏸️ Select subscription in version's IAP section
5. ⏸️ Submit version AND subscription together

---

## 🚀 Submission Process

### Step 1: Complete Subscription Setup

1. Navigate to: App Store Connect → EverReach → Subscriptions
2. Click "Core Monthly" subscription
3. Fill in all required fields (see sections above)
4. Upload 1024x1024 subscription image
5. Upload in-app screenshot
6. Add review notes
7. Click "Save"

### Step 2: Prepare App Version

1. Navigate to: EverReach → Distribution → TestFlight
2. Create new version (e.g., 1.1.0)
3. Build and upload binary with subscription support
4. Wait for processing to complete

### Step 3: Link Subscription to Version

1. Navigate to: Version page (e.g., 1.1.0)
2. Scroll to: "In-App Purchases and Subscriptions"
3. Click: "Add"
4. Select: "Core Monthly"
5. Save changes

### Step 4: Submit for Review

1. Complete all version information
2. Add screenshots for version
3. Add release notes
4. Select: "Manually release this version"
5. Click: "Submit for Review"

**Timeline**:
- Review typically takes: 1-3 business days
- You'll receive email notifications
- Can track status in App Store Connect

---

## 📊 Post-Submission

### After Approval

**Immediate Actions**:
1. ✅ Verify subscription appears in App Store
2. ✅ Test purchase flow end-to-end
3. ✅ Verify RevenueCat webhook receiving events
4. ✅ Confirm backend creating subscription records
5. ✅ Verify subscription restoration (no family sharing)
6. ✅ Verify subscription restoration

**Monitoring**:
- Check: App Store Connect → Sales and Trends
- Monitor: RevenueCat dashboard for conversions
- Track: Backend analytics for subscription status
- Watch: Support emails for subscription issues

### Marketing Launch

**Once Live**:
1. Update website with subscription info
2. Send launch email to waitlist
3. Update social media
4. Create launch announcement
5. Run paid ads highlighting subscription

---

## 🔄 Future Subscriptions

**After First Submission**:

Once your initial subscription is approved with the app version, you can submit additional subscriptions without app updates:

1. Create new subscription in Subscriptions section
2. Configure all settings
3. Submit directly for review
4. No app version update required

**Possible Future Subscriptions**:
- Core Annual (yearly billing)
- Core+ Monthly (premium tier)
- Team Plan (multi-user)
- Enterprise (custom pricing)

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Subscription must be submitted with new version"
**Solution**: Create new app version, link subscription, submit together

**Issue**: "Screenshot doesn't show subscription"
**Solution**: Use actual in-app screenshot showing subscription page

**Issue**: "Missing required localization"
**Solution**: Add at least English (U.S.) localization with display name and description

**Issue**: "Image dimensions incorrect"
**Solution**: Ensure image is exactly 1024x1024 pixels

**Issue**: "Tax category error"
**Solution**: Select "Match to parent app" or choose specific category

**Issue**: "StoreKit APIs not detected"
**Solution**: Ensure app implements required StoreKit methods:
- `presentCodeRedemptionSheet()`
- `SKPaymentQueue` observation
- `StoreKit.Product` loading

### Rejection Reasons

**Common Reasons for Rejection**:
1. Misleading subscription description
2. Subscription functionality not working
3. Prices not clearly displayed
4. Cancellation not easy to find
5. Free trial terms unclear

**Prevention**:
- Be accurate in descriptions
- Test thoroughly before submission
- Display pricing prominently in-app
- Make cancellation obvious
- Clearly state trial terms

---

## 📞 Support

### Apple Support

**App Store Connect Help**:
- Phone: 1-800-633-2152 (US)
- Email: Via App Store Connect
- Hours: 24/7 for urgent issues

**Developer Forums**:
- https://developer.apple.com/forums/

### Internal Support

**Technical Issues**:
- Backend: Check RevenueCat dashboard
- Mobile: Review Xcode logs
- Database: Query subscriptions table

**Review Questions**:
- Email: review@everreach.app
- Slack: #app-store-review channel

---

## 📚 Additional Resources

### Apple Documentation
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [Subscription Best Practices](https://developer.apple.com/app-store/subscriptions/)

### Internal Documentation
- `/BUILD_FIX_DOCUMENTATION.md` - iOS build guide
- `/PAYWALL_SYSTEMATIC_REFACTOR.md` - Subscription architecture
- `/marketing/screenshots/` - App Store screenshots

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Next Review**: After first subscription approval
**Status**: Ready for submission ✅

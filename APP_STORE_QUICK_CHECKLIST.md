# App Store Submission - Quick Checklist

## ✅ Core Monthly Subscription

### 📋 Basic Setup
- [x] Reference Name: "Core Monthly"
- [x] Product ID: `com.everreach.core.monthly`
- [x] Duration: 1 month
- [x] Group: "EverReach Core"
- [x] Apple ID: 6753191233

### 💰 Pricing
- [x] US: $14.99/month
- [x] International pricing configured
- [x] All countries selected

### 📝 Content
- [x] Display Name: "Core Monthly" (30 chars max)
- [x] Description: "Includes voice notes, message goals, warmth score." (45 chars)
- [ ] **1024x1024 image uploaded** ⚠️ ACTION NEEDED
- [x] Screenshot: `07-subscription.png` ready
- [x] Review notes prepared

### ⚙️ Settings
- [x] Family Sharing: OFF (individual subscriptions)
- [x] App Store Promotion: ON
- [x] Tax Category: Match parent app
- [x] Availability: All regions

---

## 🎯 Action Items

### 1. CREATE SUBSCRIPTION IMAGE (30 min)
**Priority**: HIGH
**Status**: ⏸️ NOT STARTED

**Task**:
- Open: `/marketing/SUBSCRIPTION_IMAGE_GUIDE.md`
- Use Figma template or Canva
- Create 1024x1024 PNG
- Include: Logo, "Core Monthly", icons, pricing
- Save to: `/marketing/subscription-images/core-monthly-1024x1024.png`

**Resources**:
- Guide: `/marketing/SUBSCRIPTION_IMAGE_GUIDE.md`
- Template: Figma link in guide
- Brand colors: `/marketing/BRAND_GUIDELINES.md`

---

### 2. UPLOAD TO APP STORE CONNECT (10 min)
**Priority**: HIGH
**Status**: ⏸️ WAITING FOR IMAGE

**Steps**:
1. Go to App Store Connect
2. Navigate to: EverReach → Subscriptions → Core Monthly
3. Scroll to: "Image (Optional)"
4. Upload: `core-monthly-1024x1024.png`
5. Upload screenshot: `07-subscription.png`
6. Add review notes (copy from guide)
7. Click "Save"

**Screenshot Location**:
```
/marketing/subscription-screenshot-iphone-17-pro-max.png
```
Or:
```
/marketing/app-store-screenshots/07-subscription.png
```

---

### 3. CREATE NEW APP VERSION (45 min)
**Priority**: HIGH
**Status**: ⏸️ PENDING

**Steps**:
1. Ensure iOS build is working
2. Increment version number (e.g., 1.1.0)
3. Build release binary
4. Upload to App Store Connect via Xcode
5. Wait for processing (10-30 min)

**Build Command**:
```bash
npx expo run:ios --configuration Release
# Then: Archive in Xcode → Upload to App Store
```

---

### 4. LINK SUBSCRIPTION TO VERSION (5 min)
**Priority**: HIGH
**Status**: ⏸️ AFTER VERSION UPLOAD

**Steps**:
1. Navigate to: Version 1.1.0 page
2. Scroll to: "In-App Purchases and Subscriptions"
3. Click: "+ Add"
4. Select: "Core Monthly"
5. Save

---

### 5. SUBMIT FOR REVIEW (15 min)
**Priority**: HIGH
**Status**: ⏸️ FINAL STEP

**Steps**:
1. Complete all version metadata
2. Add release notes
3. Review subscription settings one last time
4. Click: "Submit for Review"
5. Select: "Manually release this version"
6. Confirm submission

**Expected Timeline**:
- Review: 1-3 business days
- Notification: Email from Apple
- Status tracking: App Store Connect

---

## 📁 Quick Links

### Documentation
- **Main Guide**: `/marketing/APP_STORE_SUBMISSION_GUIDE.md`
- **Image Guide**: `/marketing/SUBSCRIPTION_IMAGE_GUIDE.md`
- **Build Guide**: `/BUILD_FIX_DOCUMENTATION.md`

### Screenshots
- **Subscription**: `/marketing/screenshots/appstore-2025-11-22-1709/iPhone-17-Pro-Max/07-subscription.png`
- **All Screenshots**: `/marketing/screenshots/appstore-2025-11-22-1709/`

### Marketing Materials
- **Brand Guidelines**: `/marketing/BRAND_GUIDELINES.md`
- **Landing Page Copy**: `/marketing/LANDING_PAGE_COPY.md`
- **Marketing Plan**: `/marketing/MARKETING_PLAN.md`

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This
1. ❌ Submit subscription without linking to app version
2. ❌ Use app screenshots in 1024x1024 image
3. ❌ Forget to enable App Store Promotion
4. ❌ Skip review notes
5. ❌ Use wrong image dimensions
6. ❌ Configure wrong settings
7. ❌ Submit without testing in-app first

### ✅ Do This Instead
1. ✅ Always link subscription to new app version
2. ✅ Create custom promotional image (not screenshot)
3. ✅ Enable promotion for visibility
4. ✅ Provide clear testing instructions
5. ✅ Double-check: exactly 1024x1024 pixels
6. ✅ Verify all settings match StoreKit config
7. ✅ Test entire flow before submitting

---

## 🎯 Success Criteria

### Before Submission
- [ ] Subscription image uploaded and looks professional
- [ ] Screenshot shows in-app subscription page clearly
- [ ] Review notes provide clear testing instructions
- [ ] All fields filled in App Store Connect
- [ ] New app version uploaded and processed
- [ ] Subscription linked to app version
- [ ] Tested purchase flow works end-to-end

### After Approval
- [ ] Subscription appears in App Store
- [ ] Purchase flow works for real users
- [ ] RevenueCat receiving webhook events
- [ ] Backend creating subscription records
- [ ] Settings verified correct
- [ ] Subscription restoration working

---

## ⏱️ Time Estimate

### Total Time to Launch
**Optimistic**: 2-3 hours + 1-3 day review
**Realistic**: 4-6 hours + 1-3 day review
**Conservative**: 8-10 hours + 3-5 day review

### Breakdown
1. Create image: 30-60 min
2. Upload to App Store Connect: 10-15 min
3. Build new version: 30-60 min
4. Upload binary: 15-30 min
5. Link subscription: 5-10 min
6. Final review: 15-30 min
7. Submit: 5-10 min
8. **Apple Review**: 1-3 business days

---

## 📞 Help & Support

### Stuck on Something?

**Image Creation**:
- Read: `/marketing/SUBSCRIPTION_IMAGE_GUIDE.md`
- Use: Canva Pro or Figma
- Need help: #design-team

**App Store Connect**:
- Read: `/marketing/APP_STORE_SUBMISSION_GUIDE.md`
- Apple Support: 1-800-633-2152
- Documentation: developer.apple.com

**Technical Build**:
- Read: `/BUILD_FIX_DOCUMENTATION.md`
- Check: Xcode logs
- Ask: #mobile-team

---

## 🎉 Next Steps After Approval

### Week 1
- [ ] Monitor first purchases
- [ ] Check RevenueCat dashboard
- [ ] Verify backend data
- [ ] Watch for support tickets
- [ ] Collect user feedback

### Week 2-4
- [ ] Analyze conversion rates
- [ ] A/B test subscription image
- [ ] Optimize paywall copy
- [ ] Add testimonials
- [ ] Plan annual subscription

---

**Last Updated**: November 23, 2025
**Status**: Ready to proceed
**Next Action**: Create 1024x1024 subscription image 🎨

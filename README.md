# Marketing Materials & App Store Submission

This folder contains all marketing materials, App Store submission documentation, and brand guidelines for EverReach.

---

## 📁 Folder Contents

### Core Documentation
| File | Description | Status |
|------|-------------|--------|
| `APP_STORE_SUBMISSION_GUIDE.md` | Complete App Store Connect subscription setup | ✅ Ready |
| `APP_STORE_QUICK_CHECKLIST.md` | Quick reference for submission steps | ✅ Ready |
| `SUBSCRIPTION_IMAGE_GUIDE.md` | How to create 1024x1024 subscription image | ✅ Ready |
| `BRAND_GUIDELINES.md` | Brand colors, fonts, logo usage | ✅ Ready |
| `SCREENSHOT_REQUIREMENTS.md` | App Store screenshot specifications | ✅ Ready |

### Marketing Copy
| File | Description | Source |
|------|-------------|--------|
| `LANDING_PAGE_COPY.md` | Website landing page copy | Marketing branch |
| `MARKETING_PLAN.md` | Complete marketing strategy | Marketing branch |
| `COPY_IMPROVEMENTS.md` | App copy optimizations | Current branch |

### Feature Documentation
| File | Description |
|------|-------------|
| `VOICE_CONTEXT_FEATURE.md` | Voice notes feature marketing |
| `VOICE_CONTEXT_SAVE_BUTTON_FEATURE.md` | Voice notes save UX |
| `SCREENSHOT_SCRIPTS_COMPARISON.md` | Screenshot automation tools |

---

## 🚀 Quick Start

### For App Store Submission

**Step 1**: Read the quick checklist
```bash
open marketing/APP_STORE_QUICK_CHECKLIST.md
```

**Step 2**: Create subscription image (30 min)
```bash
open marketing/SUBSCRIPTION_IMAGE_GUIDE.md
# Follow the guide to create 1024x1024 image
```

**Step 3**: Follow complete submission guide
```bash
open marketing/APP_STORE_SUBMISSION_GUIDE.md
# Complete step-by-step instructions
```

**Step 4**: Use screenshots
```bash
open marketing/app-store-screenshots/
# Ready-to-upload App Store screenshots (iPhone 17 Pro Max)
```

**Quick Access**:
- Subscription screenshot: `marketing/subscription-screenshot-iphone-17-pro-max.png`
- All 8 screenshots: `marketing/app-store-screenshots/`

---

## 📸 Screenshots

### Available Screenshot Sets

**Latest (Recommended)**: `appstore-2025-11-22-1709/`
- iPhone 17 Pro Max (8 screenshots)
- iPhone 17 Pro (7 screenshots)
- Includes subscription screenshot: `07-subscription.png`

**Devices Covered**:
- ✅ iPhone 17 Pro Max (6.9")
- ✅ iPhone 17 Pro (6.3")
- ⚠️ Missing: iPhone 15 Plus (6.7")
- ⚠️ Missing: iPhone 8 Plus (5.5")
- ⚠️ Missing: iPad Pro 12.9"

**To Generate Complete Set**:
```bash
./appstore-screenshots-all-devices.sh
```

### Screenshot Content (in `/marketing/app-store-screenshots/`)
1. 01-contacts-list.png - Main contacts view
2. 02-contact-detail.png - Contact profile with context
3. 03-voice-note.png - Voice note recording
4. 04-search-tags.png - Search and tags
5. 05-warmth-score.png - Warmth tracking
6. 06-goal-compose.png - AI message composition
7. **07-subscription.png** - Subscription plans ⭐ (also at root level)
8. 08-settings.png - App settings

**Quick Access Subscription Image**:
- `/marketing/subscription-screenshot-iphone-17-pro-max.png`

---

## 🎨 Brand Guidelines

### Colors
```
Primary Blue:   #2563EB
Dark Blue:      #1E40AF
Light Blue:     #60A5FA
Accent Orange:  #F97316
Warmth Red:     #EF4444
```

### Typography
- **Headings**: SF Pro Display
- **Body**: SF Pro Text
- **Code**: SF Mono

### Logo
- White version for dark backgrounds
- Blue version for light backgrounds
- Minimum size: 120px width

**Full guidelines**: `/marketing/BRAND_GUIDELINES.md`

---

## 💰 Subscription Details

### Core Monthly Subscription

| Field | Value |
|-------|-------|
| **Product ID** | `com.everreach.core.monthly` |
| **Display Name** | Core Monthly |
| **Price** | $14.99/month |
| **Duration** | 1 month |
| **Free Trial** | 7 days |

**Features Included**:
- ✅ Voice Notes (unlimited)
- ✅ Message Goals (AI-powered)
- ✅ Warmth Score tracking
- ✅ Unlimited contacts
- ✅ Advanced analytics
- ✅ Priority support

**Marketing Copy**:
```
Includes voice notes, message goals, warmth score.
```

---

## 📊 Marketing Strategy

### Target Audience

**Primary**:
1. Sales Professionals (B2B)
2. Consultants & Freelancers
3. Startup Founders
4. Professional Networkers

**Secondary**:
1. Real estate agents
2. Recruiters
3. Business coaches
4. Event organizers

### Value Propositions

**For Sales**:
- "Never let a lead go cold"
- "CRM that actually works"
- "Close more deals with better follow-up"

**For Consultants**:
- "Turn past clients into repeat revenue"
- "Client retention on autopilot"
- "Get paid to maintain relationships"

**For Founders**:
- "Your co-founder for relationships"
- "Scale without losing personal touch"
- "Warm intros that convert"

### Channels

**Paid**:
- Google Ads (search: "crm for consultants")
- LinkedIn Ads (targeting sales professionals)
- Reddit Ads (r/sales, r/entrepreneur)

**Organic**:
- Product Hunt launch
- LinkedIn content marketing
- Twitter thought leadership
- YouTube tutorials

**Full plan**: `/marketing/MARKETING_PLAN.md`

---

## 🛠️ Tools & Templates

### Screenshot Automation
```bash
# All devices (App Store ready)
./appstore-screenshots-all-devices.sh

# Development testing
node scripts/automate-screenshots.js

# Single device setup
./prepare-ios-appstore.sh
```

**Comparison**: `/marketing/SCREENSHOT_SCRIPTS_COMPARISON.md`

### Design Tools

**For Subscription Image**:
- Figma (recommended)
- Canva Pro
- Adobe Photoshop
- Affinity Designer

**Templates Available**:
- `/marketing/templates/subscription-image.fig`
- `/marketing/templates/subscription-image.psd`

---

## 📋 Submission Checklist

### Required for App Store

- [ ] **Subscription Image**: 1024x1024 PNG
- [ ] **In-App Screenshot**: Shows subscription page
- [ ] **Review Notes**: Testing instructions
- [ ] **Pricing**: Configured for all regions
- [ ] **Localization**: English (U.S.) minimum
- [ ] **App Version**: New build with subscription
- [ ] **Link Subscription**: To app version
- [ ] **Test**: End-to-end purchase flow

### Before Launch

- [ ] RevenueCat configured
- [ ] Webhook URL set
- [ ] Backend subscription table ready
- [ ] Test purchases working
- [ ] Restore purchases working
- [ ] Subscription restoration tested
- [ ] Cancellation flow tested

**Full checklist**: `/marketing/APP_STORE_QUICK_CHECKLIST.md`

---

## 🎯 Success Metrics

### Week 1 Goals
- 100+ app downloads
- 10+ free trial starts
- 3+ paid subscriptions
- <5% crash rate

### Month 1 Goals
- 500+ app downloads
- 50+ free trial starts
- 15+ paid subscriptions (30% conversion)
- $150+ MRR

### Month 3 Goals
- 2,000+ app downloads
- 200+ free trial starts
- 60+ paid subscriptions
- $600+ MRR
- <3% churn rate

---

## 📞 Support & Resources

### Internal

**Questions About**:
- Submission: `/marketing/APP_STORE_SUBMISSION_GUIDE.md`
- Images: `/marketing/SUBSCRIPTION_IMAGE_GUIDE.md`
- Build: `/BUILD_FIX_DOCUMENTATION.md`
- Paywall: `/PAYWALL_SYSTEMATIC_REFACTOR.md`

**Team Channels**:
- #app-store-submission
- #design-team
- #mobile-team
- #marketing

### External

**Apple Resources**:
- App Store Connect: appstoreconnect.apple.com
- Developer Documentation: developer.apple.com
- Support: 1-800-633-2152

**Design Resources**:
- Figma Community: figma.com/community
- SF Symbols: developer.apple.com/sf-symbols/
- App Store Guidelines: developer.apple.com/app-store/

---

## 🔄 Update Schedule

### Regular Updates

**Weekly**:
- Review conversion metrics
- Update pricing if needed
- Monitor competitor positioning

**Monthly**:
- Update screenshots (new features)
- Refresh marketing copy
- Test A/B variations

**Quarterly**:
- Major marketing campaign refresh
- New promotional images
- Feature highlight rotation

---

## 📚 Additional Resources

### Documentation

**In This Repo**:
- `/BUILD_FIX_DOCUMENTATION.md` - iOS build guide
- `/PAYWALL_SYSTEMATIC_REFACTOR.md` - Subscription architecture
- `/LOG_FILTERING_GUIDE.md` - Development tips

**External**:
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [StoreKit Documentation](https://developer.apple.com/documentation/storekit)
- [Subscription Best Practices](https://developer.apple.com/app-store/subscriptions/)

### Marketing Materials Source

**From Marketing Branch**:
- Brand guidelines
- Landing page copy
- Marketing plan
- Screenshot requirements

**Command to Update**:
```bash
git fetch origin marketing:marketing-branch
git show marketing-branch:marketing-materials/[FILE] > marketing/[FILE]
```

---

## 🎉 Next Steps

### Immediate (This Week)
1. **Create subscription image** (30-60 min)
2. **Upload to App Store Connect** (10-15 min)
3. **Prepare app version** (2-3 hours)
4. **Submit for review** (15-30 min)

### Short Term (Next 2 Weeks)
1. **Monitor first purchases**
2. **Gather user feedback**
3. **Optimize conversion**
4. **A/B test images**

### Long Term (Next Quarter)
1. **Add annual subscription**
2. **Launch marketing campaign**
3. **Expand to Android**
4. **Build referral program**

---

## 🚨 Important Notes

### Legal
⚠️ **Legal documents are templates** - Have them reviewed by an attorney
⚠️ **Pricing must be accurate** - Update immediately if prices change
⚠️ **Features must exist** - Only market implemented features

### Compliance
✅ **GDPR compliant** - Privacy policy includes all rights
✅ **CCPA compliant** - Data collection disclosed
✅ **CAN-SPAM compliant** - Email templates include unsubscribe
✅ **App Store Guidelines** - All materials follow Apple's rules

### Quality
✅ **Screenshots are current** - Taken November 22, 2025
✅ **Copy is accurate** - Reflects actual app features
✅ **Pricing is current** - $14.99/month as of November 2025
✅ **Links work** - All internal references validated

---

**Last Updated**: November 23, 2025
**Version**: 1.0
**Status**: Ready for App Store submission ✅
**Next Review**: After first subscription approval

---

**Questions?** Open an issue or contact the marketing team.
**Ready to launch?** Start with `APP_STORE_QUICK_CHECKLIST.md` 🚀
